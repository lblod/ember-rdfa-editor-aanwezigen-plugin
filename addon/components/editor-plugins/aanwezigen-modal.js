import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-modal';
import { A } from '@ember/array';
import RdfaContextScanner from '@lblod/ember-rdfa-editor/utils/rdfa/rdfa-context-scanner';
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

  async smartFetchMandataris(subjectUri){
    let mandataris = this.cachedMandatarissen.find(p => p.get('uri') == subjectUri);
    if(mandataris) {
      return mandataris;
    }
    //if not existant try to create it on based on information in triples
    mandataris = (await this.store.query('mandataris', { 'filter[:uri:]': subjectUri,
                                                         include:'is-bestuurlijke-alias-van,is-bestuurlijke-alias-van.geboorte,bekleedt,bekleedt.bestuursfunctie'
                                                       })).firstObject;
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
    return [].concat.apply([], contexts);;
  },

  async setVoorzitter(triples){
    let triple = triples.find(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftVoorzitter');
    if(!triple)
      return;
    let persoon = await this.smartFetchPersoon(triple.object);
    this.set('voorzitter', persoon);
  },

  async setSecretaris(triples){
    let triple = triples.find(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftSecretaris');
    if(!triple)
      return;
    let functionaris = (await this.store.query('functionaris', { 'filter[:uri:]': triple.object } )).firstObject;
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
    let subset = triples.filter(t => t.predicate == 'http://mu.semte.ch/vocabularies/ext/heeftAfwezigeBijAgendapunt'
                                  || t.predicate == 'http://mu.semte.ch/vocabularies/ext/heeftAfwezigeBijStart')
          .map(t =>  t.object);
    subset = Array.from(new Set(subset));
    for(let uri of subset){
      if(this.cachedMandatarissen.length > 0) {
        let mandataris = await this.smartFetchMandataris(uri);
        if(mandataris)
          overigeMandatarissenAfwezigen.pushObject(mandataris);
      }

      if(this.cachedPersonen.length > 0) {
        let persoon = await this.smartFetchPersoon(uri);
        if(persoon)
          overigePersonenAfwezigen.pushObject(persoon);
      }
    }

    this.set('overigePersonenAfwezigen', overigePersonenAfwezigen);
    this.set('overigeMandatarissenAfwezigen', overigeMandatarissenAfwezigen);
  },

  fetchDataFromPrevious(){
    let previousTables = document.querySelectorAll("[property='ext:aanwezigenTable']");
    if(previousTables.length > 0)
      return previousTables[previousTables.length - 1];
    return null;
  },

  loadData: task(function* (){
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

  didReceiveAttrs(){
    this._super(...arguments);
    this.loadData.perform();
  },

  actions: {
    selectVoorzitter(persoon){
      this.set('voorzitter', persoon);
    },

    selectSecretaris(functionaris){
      this.set('secretaris', functionaris);
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
