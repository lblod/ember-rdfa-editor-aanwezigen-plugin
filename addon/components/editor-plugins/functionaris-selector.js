import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/functionaris-selector';
import { inject as service } from '@ember/service';
import { task, timeout } from 'ember-concurrency';
import { reads } from '@ember/object/computed';

export default Component.extend({
  layout,
  store: service(),
  bestuurseenheidUri: reads('bestuurseenheid.uri'),

  searchByName: task(function* (searchData) {
    yield timeout(300);
    let queryParams = {
      sort: 'is-bestuurlijke-alias-van.achternaam',
      'filter[bekleedt][bevat-in][is-tijdsspecialisatie-van][bestuurseenheid][:uri:]': this.bestuurseenheidUri,
      'filter[is-bestuurlijke-alias-van][achternaam]': searchData,
      page: { size: 100 }
    };
    return yield this.store.query('functionaris', queryParams);
  }),

  actions: {
    select(functionaris){
      this.onSelect(functionaris);
    }
}

});
