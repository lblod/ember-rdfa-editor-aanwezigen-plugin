import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-modal';
import { A } from '@ember/array';
import RdfaContextScanner from '@lblod/ember-rdfa-editor/utils/rdfa-context-scanner';
import { task } from 'ember-concurrency';
import { inject as service } from '@ember/service';


export default Component.extend({
  layout,
  store: service(),

  serializeTableToTriples(table){
    const contextScanner = RdfaContextScanner.create({});
    const contexts = contextScanner.analyse(table).map((c) => c.context);
    return Array.concat(...contexts);
  },

  async setVoorzitter(triples){
    let triple = triples.find(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftVoorzitter');
    if(!triple)
      return;
    let persoon = (await this.store.query('persoon', { 'filter[:uri:]': triple.object })).firstObject;
    this.set('voorzitter', persoon);
  },

  async setSecretaris(triples){
    let triple = triples.find(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftSecretaris');
    if(!triple)
      return;
    let persoon = (await this.store.query('persoon', { 'filter[:uri:]': triple.object })).firstObject;
    this.set('secretaris', persoon);
  },

  async setOverigeAanwezigen(triples){
    let subset = triples.filter(t => t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftAanwezige'
                                || t.predicate == 'http://data.vlaanderen.be/ns/besluit#heeftAanwezigeBijStart');
    for(let triple of subset){
      let persoon = (await this.store.query('persoon', { 'filter[:uri:]': triple.object })).firstObject;
      this.overigeAanwezigen.pushObject(persoon);
    }
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
    yield this.setVoorzitter(triples);
    yield this.setSecretaris(triples);
    yield this.setOverigeAanwezigen(triples);
  }),

  didReceiveAttrs(){
    this._super(...arguments);
    this.set('overigeAanwezigen', A());
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
