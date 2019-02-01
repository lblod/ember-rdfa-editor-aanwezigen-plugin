import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/overige-mandatarissen-aanwezigen-row';

export default Component.extend({
  layout,
  tagName: 'tr',

  async didReceiveAttrs(){
    this._super(...arguments);
    this.set('aanwezig', this.aanwezige.aanwezig || false);
    this.set('mandataris', this.aanwezige.mandataris);
    this.set('persoon', await this.mandataris.isBestuurlijkeAliasVan);
    this.set('functie', await this.mandataris.bekleedt.get('bestuursfunctie').get('label'));
  },

  actions: {
    toggle(){
      this.toggleProperty('aanwezig');
      this.onToggleAanwezig(this.aanwezig, this.mandataris);
    }
  }
});
