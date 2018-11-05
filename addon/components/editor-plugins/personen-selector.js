import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/personen-selector';
import { inject as service } from '@ember/service';
import { task, timeout } from 'ember-concurrency';

export default Component.extend({
  layout,
  store: service(),

  didReceiveAttrs(){
    this._super(...arguments);
    this.set('_persoon', this.persoon);
  },

  searchByName: task(function* (searchData) {
    yield timeout(300);
    let queryParams = {
      sort:'achternaam',
      filter: searchData,
      page: { size: 100 },
      include: 'geboorte'
    };
    let personen = yield this.store.query('persoon', queryParams);
    return personen;
  }),

  actions: {
    select(persoon){
      this.set('_persoon', persoon);
      this.onSelect(persoon);
    }
}

});
