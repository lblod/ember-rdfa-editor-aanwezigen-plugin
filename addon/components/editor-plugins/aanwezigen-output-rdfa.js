import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-output-rdfa';
import { computed } from '@ember/object';
import { sort } from '@ember/object/computed';
import { A } from '@ember/array';

export default Component.extend({
  layout,

  init() {
    this._super(...arguments);
    this.set('sort', ['achternaam']);
    this.set('overigeAanwezigen', A());
  },
  aanwezigenBijAgendapunt: computed('propertyToUse', function(){
    return this.propertyToUse == 'besluit:heeftAanwezigeBijStart';
  }),

  sortedAanwezigen: sort('overigeAanwezigen', 'sort')

});
