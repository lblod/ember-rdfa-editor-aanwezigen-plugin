import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-modal';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class AanwezigenModal extends Component {
  @service store;
  constructor() {
    super(...arguments)
    this.layout = layout;
    this.verkozenGevolgUri = 'http://data.vlaanderen.be/id/concept/VerkiezingsresultaatGevolgCode/89498d89-6c68-4273-9609-b9c097727a0f';
    this.viewMode = 'default'
  }

  @action
  selectVoorzitter(mandataris){
    this.set('voorzitter', mandataris);
  }

  @action
  selectSecretaris(functionaris){
    this.set('secretaris', functionaris);
  }

  @action
  createPerson(){
    this.set('viewMode', 'createPerson');
  }

  @action
  goHome(){
    this.set('viewMode', 'default');
  }

  @action
  cancelCreatePerson(){
    this.set('viewMode', 'default');
  }

  @action
  finishCreatePerson(){
    this.set('viewMode', 'default');
  }
}
