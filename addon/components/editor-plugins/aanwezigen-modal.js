import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-modal';
import { A } from '@ember/array';
import RdfaContextScanner from '@lblod/ember-rdfa-editor/utils/rdfa-context-scanner';
import { task } from 'ember-concurrency';
import { inject as service } from '@ember/service';
import Persoon from '../../models/persoon';

export default Component.extend({
  layout,
  verkozenGevolgUri: 'http://data.vlaanderen.be/id/concept/VerkiezingsresultaatGevolgCode/89498d89-6c68-4273-9609-b9c097727a0f',
  store: service(),

  async setCachedPersonen(){
    //a subset of peronen of interest
    let personen = await this.store.query('persoon',
                     {
                       filter: {
                         'is-kandidaat-voor': {
                           'rechtstreekse-verkiezing': {
                             'stelt-samen': {
                               ':uri:': this.bestuursorgaan.uri
                             }
                           }
                         },
                         'verkiezingsresultaten': {
                           'gevolg': {
                             ':uri:': this.verkozenGevolgUri
                           },
                           'is-resultaat-voor': {
                             'rechtstreekse-verkiezing': {
                               'stelt-samen': {
                                 ':uri:': this.bestuursorgaan.uri
                               }
                             }
                           }
                         }
                       },
                       include: 'geboorte',
                       page: { size: 1000 },
                       sort:'gebruikte-voornaam'
                     });
    this.set('cachedPersonen', personen.toArray() || A());
  },

  async smartFetchPersoon(subjectUri){
    let persoon = this.cachedPersonen.find(p => p.uri == subjectUri);
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
    let persoon = await this.smartFetchPersoon(triple.object);
    this.set('voorzitter', persoon);
  },

  async setSecretaris(triples){
    let triple = triples.find(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftSecretaris');
    if(!triple)
      return;
    let persoon = await this.smartFetchPersoon(triple.object);
    this.set('secretaris', persoon);
  },

  async setOverigeAanwezigen(triples){
    let overigeAanwezigen = A();
    let subset = triples.filter(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftAanwezige'
                                || t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftAanwezigeBijStart')
          .map(t =>  t.object);
    subset = Array.from(new Set(subset));
    for(let uri of subset){
      let persoon = await this.smartFetchPersoon(uri);
      if(persoon)
        overigeAanwezigen.pushObject(persoon);
    }
     this.set('overigeAanwezigen', overigeAanwezigen);
  },

  fetchDataFromPrevious(){
    let previousTables = document.querySelectorAll("[property='ext:aanwezigenTable']");
    if(previousTables.length > 0)
      return previousTables[0];
    return null;
  },

  loadData: task(function* (){
    let domData = this.fetchDataFromPrevious();
    if(this.editTable)
      domData = this.domTable;
    let triples = this.serializeTableToTriples(domData);
    yield this.setCachedPersonen();
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
    }
  }
});
