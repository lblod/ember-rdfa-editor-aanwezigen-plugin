import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-modal';
import { A } from '@ember/array';
import RdfaContextScanner from '@lblod/ember-rdfa-editor/utils/rdfa-context-scanner';
import { task } from 'ember-concurrency';
import { inject as service } from '@ember/service';

export default Component.extend({
  layout,
  verkozenGevolgUri: 'http://data.vlaanderen.be/id/concept/VerkiezingsresultaatGevolgCode/89498d89-6c68-4273-9609-b9c097727a0f',
  store: service(),
  viewMode: 'default',

  async setCachedPersonen(){
    //a subset of personen of interest
    let resultaten = await this.store.query('verkiezingsresultaat',
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
                     });

    this.set('cachedPersonen', resultaten.map((res) => res.isResultaatVan) || A());
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

  async setCachedMandatarissen(){
    //a subset of mandatarissen of interest
    let queryParams = {
      include:'is-bestuurlijke-alias-van,bekleedt,bekleedt.bestuursfunctie',
      'filter[bekleedt][bevat-in][:uri:]': this.bestuursorgaan.uri,
      page: { size: 10000 }
    };

    let mandatarissenInPeriode = await this.store.query('mandataris', queryParams);
    this.set('cachedMandatarissen', mandatarissenInPeriode);
  },

  async smartFetchMandataris(subjectUri){
    let mandataris = this.cachedMandatarissen.find(p => p.get('uri') == subjectUri);
    if(mandataris)
      return mandataris;
    //if not existant try to create it on based on information in triples

    mandataris = (await this.store.query('mandataris', { 'filter[:uri:]': subjectUri })).firstObject;
    if(!mandataris)
      return null;

   //set cache so it may be found later
   this.cachedMandatarissen.pushObject(mandataris);

   return mandataris;
  },

  serializeTableToTriples(table){
    const contextScanner = RdfaContextScanner.create({});
    const contexts = contextScanner.analyse(table).map((c) => c.context);
    if(contexts.length == 0)
      return [];
    return Array.concat(...contexts);
  },

  async setVoorzitter(triples){
    let triple = triples.find(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftVoorzitter');
    if(!triple)
      return;
    if(this.cachedPersonen.length == 0) {
      let mandataris = await this.smartFetchMandataris(triple.object);
      this.set('voorzitter', mandataris);
    } else {
      let persoon = await this.smartFetchPersoon(triple.object);
      this.set('voorzitter', persoon);
    }
  },

  async setSecretaris(triples){
    // This is temporarily disabled, since we don't have the data yet

    // let triple = triples.find(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftSecretaris');
    // if(!triple)
    //   return;
    // if(this.cachedPersonen.length == 0) {
    //   let mandataris = await this.smartFetchMandataris(triple.object);
    //   this.set('voorzitter', mandataris);
    // } else {
    //   let persoon = await this.smartFetchPersoon(triple.object);
    //   this.set('voorzitter', persoon);
    // }

    //for now it is just free text field
    let triple = triples.find(t => t.predicate == 'http://mu.semte.ch/vocabularies/ext/secretarisTemporaryAsText');
    if(!triple)
      return;

    this.set('secretaris', triple.object.trim());
  },

  async setOverigeAanwezigen(triples){
    let overigePersonenAanwezigen = A();
    let overigeMandatarissenAanwezigen = A();
    let subset = triples.filter(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftAanwezige'
                                || t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftAanwezigeBijStart')
          .map(t =>  t.object);
    subset = Array.from(new Set(subset));
    for(let uri of subset){
      let mandataris = await this.smartFetchMandataris(uri);
      if(mandataris)
        overigeMandatarissenAanwezigen.pushObject(mandataris);

      let persoon = await this.smartFetchPersoon(uri);
      if(persoon)
        overigePersonenAanwezigen.pushObject(persoon);
    }

    this.set('overigePersonenAanwezigen', overigePersonenAanwezigen);
    this.set('overigeMandatarissenAanwezigen', overigeMandatarissenAanwezigen);
  },

  fetchDataFromPrevious(){
    let previousTables = document.querySelectorAll("[property='ext:aanwezigenTable']");
    if(previousTables.length > 0)
      // if you decide to change the node to parse for triples, be aware of potential performance consequences,
      // if you still use the abused ContextScanner #metoo
      return previousTables[0];
    return null;
  },

  loadData: task(function* (){
    let domData = this.fetchDataFromPrevious();
    if(this.editTable)
      domData = this.domTable;
    let triples = this.serializeTableToTriples(domData);
    yield this.setCachedMandatarissen();
    if(this.cachedMandatarissen.length == 0) {
      yield this.setCachedPersonen();
    }
    yield this.setVoorzitter(triples);
    yield this.setSecretaris(triples);
    yield this.setOverigeAanwezigen(triples);
    this.set('tableDataReady', true);
  }),

  didReceiveAttrs(){
    this._super(...arguments);
    this.loadData.perform();
  },

  actions: {
    selectVoorzitter(persoon){
      this.set('voorzitter', persoon);
    },

    selectSecretaris(persoon){
      this.set('secretaris', persoon);
    },

    createPerson(){
      this.set('viewMode', 'createPerson');
    },

    goHome(){
      this.set('viewMode', 'default');
    },

    cancelCreatePerson(){
      this.set('viewMode', 'default');
    },

    finishCreatePerson(){
      this.set('viewMode', 'default');
    }
  }
});
