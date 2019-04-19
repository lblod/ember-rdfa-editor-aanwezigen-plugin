import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/overige-mandatarissen-aanwezigen-row';
import { alias } from '@ember/object/computed';
export default Component.extend({
  layout,
  tagName: 'tr',
  mandataris: alias('aanwezige.mandataris'),
  persoon: alias('aanwezige.mandataris.isBestuurlijkeAliasVan'),
  functie: alias('aanwezige.mandataris.bekleedt.bestuursfunctie.label'),
  aanwezig: alias('aanwezige.aanwezig'),
  actions: {
    toggle(){
      this.toggleProperty('aanwezig');
      this.onToggleAanwezig(this.aanwezig, this.mandataris);
    }
  }
});
