import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/overige-aanwezigen-row';

export default Component.extend({
  layout,
  tagName: 'tr',
  
  didReceiveAttrs(){
    this._super(...arguments);
    this.set('aanwezig', this.aanwezige.aanwezig || false);
    this.set('persoon', this.aanwezige.persoon);
  },

  actions: {
    toggle(){
      this.toggleProperty('aanwezig');
      this.onToggleAanwezig(this.aanwezig, this.persoon);
    }
  }
});
