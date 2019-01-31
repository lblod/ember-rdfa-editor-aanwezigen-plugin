import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/overige-mandatarissen-aanwezigen-row';

export default Component.extend({
  layout,
  tagName: 'tr',

  async didReceiveAttrs(){
    this._super(...arguments);
    this.set('aanwezig', this.aanwezige.aanwezig || false);
    this.set('mandataris', this.aanwezige.mandataris);
    //console.log(this.mandataris.id);
    //console.log(await this.mandataris.bekleedt);

    // const test = await this.mandataris.get('bekleedt');
    // console.log(test);

    // this.set('functie', await this.mandataris.get('bekleedt').get('bestuursfunctie').get('label'));
    // console.log(this.functie);

    //Comment felix: I am sooo sorry. The selecteer bestuursorgaan I hinted to use, did not contain any mandatarissen (for now)
    //So best to select to select orgaan: burgemeester 2019 or gemeenteraad 2012-2019
    this.set('persoon', await this.mandataris.get('isBestuurlijkeAliasVan'));
    console.log(this.persoon.achternaam);
  },

  actions: {
    toggle(){
      this.toggleProperty('aanwezig');
      this.onToggleAanwezig(this.aanwezig, this.mandataris);
    }
  }
});
