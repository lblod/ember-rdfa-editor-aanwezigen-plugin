import { warn } from '@ember/debug';
import { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-card';
import { A } from '@ember/array';
import RdfaContextScanner from '@lblod/ember-rdfa-editor/utils/rdfa/rdfa-context-scanner';
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
  popup: false,

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

  loadDataForPopup: task(function* (){
    const domData = this.editTable ? this.domTable: this.fetchDataFromPrevious();
    let triples = this.serializeTableToTriples(domData);
    yield this.setCachedMandatarissen();
    if(this.cachedMandatarissen.length == 0) {
      yield this.setCachedPersonen();
    } else {
      this.set('cachedPersonen', A());
    }
    yield this.setVoorzitter(triples);
    yield this.setSecretaris(triples);
    yield this.setOverigeAanwezigen(triples);
    yield this.setOverigeAfwezigen(triples);
    this.set('tableDataReady', true);
  }),

  fetchDataFromPrevious(){
    let previousTables = document.querySelectorAll("[property='ext:aanwezigenTable']");
    if(previousTables.length > 0)
      return previousTables[previousTables.length - 1];
    return null;
  },

  serializeTableToTriples(table){
    const contextScanner = RdfaContextScanner.create({});
    const contexts = contextScanner.analyse(table).map((c) => c.context);
    if(contexts.length == 0)
      return [];
    return [].concat.apply([], contexts);
  },

  async setCachedMandatarissen(){
    const bestuursorgaanIsTijdsspecialisatieVan = await this.bestuursorgaan.get('isTijdsspecialisatieVan');
    const classificatieCode = await bestuursorgaanIsTijdsspecialisatieVan.get('classificatie');
    const defaultTypes =  await classificatieCode.get('standaardType');
    const stringifiedDefaultTypeIds = defaultTypes.map(t => t.id).join(',');

    //a subset of mandatarissen of interest
    let queryParams = {
      include:'is-bestuurlijke-alias-van,is-bestuurlijke-alias-van.geboorte,bekleedt,bekleedt.bestuursfunctie',
      'filter[bekleedt][bevat-in][:uri:]': this.bestuursorgaan.uri,
      'filter[bekleedt][bestuursfunctie][:id:]': stringifiedDefaultTypeIds,
      page: { size: 10000 }
    };

    let mandatarissenInPeriode = await this.store.query('mandataris', queryParams);
    this.set('cachedMandatarissen', mandatarissenInPeriode.toArray() || A());
  },

  async setCachedPersonen(){
    //a subset of personen of interest
    let resultaten = await this.store.query(
      'verkiezingsresultaat',
      {
        filter: {
          'is-resultaat-voor' : {
            'rechtstreekse-verkiezing': {
              'stelt-samen': {
                ':uri:': this.bestuursorgaan.uri
              }
            }
          },
          'gevolg': {
            ':uri:': this.verkozenGevolgUri
          }
        },
        include: 'is-resultaat-van.geboorte',
        page: { size: 1000 },
        sort:'is-resultaat-van.gebruikte-voornaam'
      }
    );

    this.set('cachedPersonen', resultaten.map((res) => res.isResultaatVan) || A());
  },

  async setVoorzitter(triples){
    let triple = triples.find(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftVoorzitter');
    if(!triple)
      return;
    let mandataris = (await this.store.query('mandataris', { 'filter[:uri:]': triple.object.trim() } )).firstObject;
    this.set('voorzitter', mandataris);
  },

  async setSecretaris(triples){
    let triple = triples.find(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftSecretaris');
    if(!triple)
      return;
    let functionaris = (await this.store.query('functionaris', { 'filter[:uri:]': triple.object.trim() } )).firstObject;
    this.set('secretaris', functionaris);
  },

  async setOverigeAanwezigen(triples){
    let overigePersonenAanwezigen = A();
    let overigeMandatarissenAanwezigen = A();
    let subset = triples.filter(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftAanwezige'
                                || t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftAanwezigeBijStart')
          .map(t =>  t.object);
    subset = Array.from(new Set(subset));
    for(let uri of subset){
      if(this.cachedMandatarissen.length > 0) {
        const mandataris = await this.smartFetchMandataris(uri);
        if(mandataris)
          overigeMandatarissenAanwezigen.pushObject(mandataris);
        else {
          const persoon = await this.smartFetchPersoon(uri);
          if(persoon)
            overigePersonenAanwezigen.pushObject(persoon);
        }
      }

      if((this.cachedPersonen.length > 0) && (overigeMandatarissenAanwezigen.length > 0)) {
        const persoon = await this.smartFetchPersoon(uri);
        if(persoon)
          overigePersonenAanwezigen.pushObject(persoon);
      }
    }

    this.set('overigePersonenAanwezigen', overigePersonenAanwezigen);
    this.set('overigeMandatarissenAanwezigen', overigeMandatarissenAanwezigen);
  },

  async setOverigeAfwezigen(triples){
    let overigePersonenAfwezigen = A();
    let overigeMandatarissenAfwezigen = A();
    let subset = triples.filter(t => 
      t.predicate == 'http://mu.semte.ch/vocabularies/ext/heeftAfwezigeBijAgendapunt'|| 
      t.predicate == 'http://mu.semte.ch/vocabularies/ext/heeftAfwezigeBijStart'
    ).map(t =>  t.object);
    subset = Array.from(new Set(subset));
    for(let uri of subset){
      if(this.cachedMandatarissen.length > 0) {
        let mandataris = await this.smartFetchMandataris(uri);
        if(mandataris)
          overigeMandatarissenAfwezigen.pushObject(mandataris);
      }

      if(this.cachedPersonen.length > 0) {
        let persoon = await this.smartFetchPersoon(uri);
        if(persoon) {
          overigePersonenAfwezigen.pushObject(persoon);
        }
      }
    }

    this.set('overigePersonenAfwezigen', overigePersonenAfwezigen);
    this.set('overigeMandatarissenAfwezigen', overigeMandatarissenAfwezigen);
  },

  async smartFetchMandataris(subjectUri){
    let mandataris = this.cachedMandatarissen.find(p => p.get('uri') == subjectUri);
    if(mandataris) {
      return mandataris;
    }
    //if not existant try to create it on based on information in triples
    mandataris = (await this.store.query(
      'mandataris', 
      { 
        'filter[:uri:]': subjectUri,
        include:'is-bestuurlijke-alias-van,is-bestuurlijke-alias-van.geboorte,bekleedt,bekleedt.bestuursfunctie'
      }
    )).firstObject;
    if(!mandataris)
      return null;

    //set cache so it may be found later
    this.cachedMandatarissen.pushObject(mandataris);

    return mandataris;
  },

  async smartFetchPersoon(subjectUri){
    let persoon = null;
    if(this.cachedPersonen) (persoon = this.cachedPersonen.find(p => p.get('uri') == subjectUri));

    if(persoon)
      return persoon;
    //if not existant try to create it on based on information in triples
    persoon = (await this.store.query('persoon', { 'filter[:uri:]': subjectUri })).firstObject;
    if(!persoon)
      return null;

    //set cache so it may be found later
    this.cachedPersonen.pushObject(persoon);

    return persoon;
  },

  didReceiveAttrs() {
    this._super(...arguments);
    if(this.editor)
      this.loadData.perform();
  },

  actions: {
    insert(){
      const html = this.createWrappingHTML(document.getElementById(this.outputId).innerHTML);
      this.hintsRegistry.removeHintsAtLocation(this.location, this.hrId, this.info.who);
      this.location = this.hintsRegistry.updateLocationToCurrentIndex(this.hrId, this.location)
      const selections = this.editor.selectHighlight(this.location);
      this.get('editor').update(selections, {set: {innerHTML: html}});
    },
    togglePopup(){
      this.loadDataForPopup.perform();
      this.toggleProperty('popup');
    }
  }
});
