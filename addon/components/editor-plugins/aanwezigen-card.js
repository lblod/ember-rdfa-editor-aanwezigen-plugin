import { warn } from '@ember/debug';
import { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-card';
import { task } from 'ember-concurrency';
import { inject as service } from '@ember/service';

/**
* Card displaying a hint of the Date plugin
*
* @module editor-aanwezigen-plugin
* @class AanwezigenCard
* @extends Ember.Component
*/
export default Component.extend({
  layout,
  expandedExt: 'http://mu.semte.ch/vocabularies/ext/',
  outputId: computed('id', function() {
    return `output-fractie-tabel-${this.elementId}`;
  }),
  store: service(),
  rdfaEditorAanwezigenPlugin: service(),
  /**
   * Region on which the card applies
   * @property location
   * @type [number,number]
   * @private
  */
  location: reads('info.location'),

  /**
   * Unique identifier of the event in the hints registry
   * @property hrId
   * @type Object
   * @private
  */
  hrId: reads('info.hrId'),

  /**
   * The RDFa editor instance
   * @property editor
   * @type RdfaEditor
   * @private
  */
  editor: reads('info.editor'),

  /**
   * Hints registry storing the cards
   * @property hintsRegistry
   * @type HintsRegistry
   * @private
  */
  hintsRegistry: reads('info.hintsRegistry'),

  /**
   * Query for a record in the store and yield the first item
   */
  async queryFirst( kind, filter ) {
    return (await this.store.query( kind, filter )).firstObject;
  },

  async setProperties() {
    this.set("bestuursorgaanUri", this.findBestuursorgaanUri());

    if( !this.bestuursorgaanUri ){
      warn( "Could not find bestuursorgaan URI", {id: 'aanwezigen-plugin.bestuursorgaanUri'} );
    } else {
      this.set('bestuurseenheid',
               await this.queryFirst('bestuurseenheid', {
                 'filter[bestuursorganen][heeft-tijdsspecialisaties][:uri:]': this.bestuursorgaanUri
               }));

      this.set('bestuursorgaan',
               await this.queryFirst('bestuursorgaan', {
                 'filter[:uri:]': this.bestuursorgaanUri
               }));
    }
  },

  findBestuursorgaanUri() {
    const rdfaBlocks = this.editor.getContexts();

    // Copied from service
    for(let block of rdfaBlocks){
      let context = block.context;
      const zitting = context.find((triple) => triple.object === 'http://data.vlaanderen.be/ns/besluit#Zitting');
      if (zitting) {
        const foundBestuursorgaan = context.find((triple) => triple.subject === zitting.subject && triple.predicate === 'http://data.vlaanderen.be/ns/besluit#isGehoudenDoor');
        if (foundBestuursorgaan){
          return foundBestuursorgaan.object;
        }
      }
    }
    return null;
  },

  createWrappingHTML(innerHTML){
    //workaround for triggering updates
    return `<div property="ext:aanwezigenTable">
                    <span class="u-hidden">${new Date().toISOString()}</span>
                    ${innerHTML}
                    <span class="u-hidden">${new Date().toISOString() + '1'}</span>
            </div>`;
  },

  loadData: task(function *(){
    yield this.setProperties();
  }),

  didReceiveAttrs() {
    this._super(...arguments);
    if(this.editor)
      this.loadData.perform();
  },

  actions: {
    insert(){
      const html = this.createWrappingHTML(document.getElementById(this.outputId).innerHTML);
      this.hintsRegistry.removeHintsAtLocation(this.location, this.hrId, this.info.who);
      const selections = this.editor.selectHighlight(this.location)
      this.get('editor').update(selections, {set: {innerHTML: html}})
    },
    togglePopup(){
      this.toggleProperty('popup');
    }
  }
});
