import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-modal';
import { A } from '@ember/array';

export default Component.extend({
  layout,

  didReceiveAttrs(){
    this._super(...arguments);
    this.set('overigeAanwezigen', A());
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
