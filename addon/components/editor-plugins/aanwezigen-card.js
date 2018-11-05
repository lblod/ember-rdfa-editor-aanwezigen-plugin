import { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-card';
import RdfaContextScanner from '@lblod/ember-rdfa-editor/utils/rdfa-context-scanner';
import { task } from 'ember-concurrency';
import { A } from '@ember/array';
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

  bestuursorgaanUri: reads('rdfaEditorAanwezigenPlugin.bestuursorgaanUri'),

  async setProperties() {
    let bestuurseenheid = ( await this.store.query('bestuurseenheid',
                                           { 'filter[bestuursorganen][heeft-tijdsspecialisaties][:uri:]': this.bestuursorgaanUri }
                                                 )).firstObject;
    this.set('bestuurseenheid', bestuurseenheid);

    let bestuursorgaan = (await this.store.query('bestuursorgaan',
                                                  { 'filter[:uri:]': this.bestuursorgaanUri }
                                                )).firstObject;
    this.set('bestuursorgaan', bestuursorgaan);
  },

  createWrappingHTML(innerHTML){
    return `<div property="ext:aanwezigenTable">${innerHTML}</div>`;
  },

  loadData: task(function *(){
    yield this.setProperties();
  }),

  didReceiveAttrs() {
    this._super(...arguments);
    if(this.bestuursorgaanUri)
      this.loadData.perform();
  },

  actions: {
    insert(){
      const html = this.createWrappingHTML(document.getElementById(this.outputId).innerHTML);
      this.hintsRegistry.removeHintsAtLocation(this.location, this.hrId, this.info.who);
      this.get('editor').replaceNodeWithHTML(this.info.domNodeToUpdate, html);
    },
    togglePopup(){
       this.toggleProperty('popup');
    }
  }
});
