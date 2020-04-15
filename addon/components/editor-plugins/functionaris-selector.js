import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/functionaris-selector';
import { inject as service } from '@ember/service';
import { task, timeout } from 'ember-concurrency-decorators';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { reads } from '@ember/object/computed';

export default class FunctionarisSelector extends Component {

  @service store

  constructor() {
    super(...arguments);
    this.layout = layout;
    this.bestuurseenheidUri = reads('bestuurseenheid.uri');
  }

  @task
  *searchByName(searchData) {
    yield timeout(300);
    let queryParams = {
      sort: 'is-bestuurlijke-alias-van.achternaam',
      'filter[bekleedt][bevat-in][is-tijdsspecialisatie-van][bestuurseenheid][:uri:]': this.bestuurseenheidUri,
      'filter[is-bestuurlijke-alias-van][achternaam]': searchData,
      page: { size: 100 }
    };
    return yield this.store.query('functionaris', queryParams);
  }

  @action
  select(functionaris){
    this.onSelect(functionaris);
  }
}
