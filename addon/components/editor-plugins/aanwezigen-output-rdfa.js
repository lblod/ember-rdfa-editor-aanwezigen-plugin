import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-output-rdfa';
import { computed } from '@ember/object';

export default Component.extend({
  layout,

  sortedAanwezigen: computed('overigeAanwezigen', function(){
    return this.overigeAanwezigen.sort(this.sortPersoon);
  }),

  sortPersoon(a,b){
    if(a.gebruikteVoornaam < b.gebruikteVoornaam)
      return -1;
    if (a.gebruikteVoornaam > b.gebruikteVoornaam)
      return 1;
    return 0;
  }
});
