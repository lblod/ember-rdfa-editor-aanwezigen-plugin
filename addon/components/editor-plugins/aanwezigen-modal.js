import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-modal';

export default Component.extend({
  layout,
  actions: {
    selectVoorzitter(persoon){
      this.set('voorzitter', persoon);
    },

    selectSecretaris(persoon){
      this.set('secretaris', persoon);
    }
  }
});
