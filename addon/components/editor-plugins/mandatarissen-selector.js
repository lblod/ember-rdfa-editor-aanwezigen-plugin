import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/mandatarissen-selector';
import { inject as service } from '@ember/service';
import { task, timeout } from 'ember-concurrency';
import { reads } from '@ember/object/computed';

export default Component.extend({
  layout,
  store: service(),
  rdfaEditorAanwezigenPlugin: service(),
  bestuursorgaanUri: reads('rdfaEditorAanwezigenPlugin.bestuursorgaanUri'),

  searchByName: task(function* (searchData) {
    yield timeout(300);
    let queryParams = {
      'filter[bekleedt][bevat-in][:uri:]': this.bestuursorgaanUri,
      'filter[is-bestuurlijke-alias-van][achternaam]': searchData,
      page: { size: 100 },
      sort: 'is-bestuurlijke-alias-van.achternaam'
    };
    return yield this.store.query('mandataris', queryParams);
  }),

  actions: {
    async select(mandataris){
      this.onSelect(mandataris);
    }
}

});
