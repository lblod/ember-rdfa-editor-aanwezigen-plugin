import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-modal';
import { inject as service } from '@ember/service';

export default Component.extend({
  layout,
  verkozenGevolgUri: 'http://data.vlaanderen.be/id/concept/VerkiezingsresultaatGevolgCode/89498d89-6c68-4273-9609-b9c097727a0f',
  store: service(),
  viewMode: 'default',

  actions: {
    selectVoorzitter(mandataris){
      this.set('voorzitter', mandataris);
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
