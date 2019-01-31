import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/overige-mandatarissen-aanwezigen-row';

export default Component.extend({
  layout,
  tagName: 'tr',

  async didReceiveAttrs(){
    this._super(...arguments);
    this.set('aanwezig', this.aanwezige.aanwezig || false);
    this.set('mandataris', this.aanwezige.mandataris);
    console.log(this.mandataris.id);
    console.log(await this.mandataris.bekleedt);

    // const test = await this.mandataris.get('bekleedt');
    // console.log(test);

    // this.set('functie', await this.mandataris.get('bekleedt').get('bestuursfunctie').get('label'));
    // console.log(this.functie);
    this.set('persoon', await this.mandataris.get('isBestuurlijkeAliasVan'));
  },

  actions: {
    toggle(){
      this.toggleProperty('aanwezig');
      this.onToggleAanwezig(this.aanwezig, this.mandataris);
    }
  }
});
