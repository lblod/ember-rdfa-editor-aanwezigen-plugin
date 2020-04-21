import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-output-rdfa';
import { computed } from '@ember/object';
import { sort } from '@ember/object/computed';
import { A } from '@ember/array';

export default Component.extend({
  layout,

  init() {
    this._super(...arguments);
    this.set('sortMandataris', ['isBestuurlijkeAliasVan.achternaam']);
    this.set('sortPersoon', ['achternaam']);
    this.set('personenAanwezigen', A());
    this.set('personenAfwezigen', A());
    this.set('mandatarissenAanwezigen', A());
    this.set('mandatarissenAfwezigen', A());
  },

  aanwezigenBijAgendapunt: computed('propertyToUse', function(){
    return this.propertyToUse == 'besluit:heeftAanwezigeBijStart';
  }),

  sortedPersonenAanwezigen: sort('personenAanwezigen', 'sortPersoon'),
  sortedPersonenAfwezigen: sort('personenAfwezigen', 'sortPersoon'),
  sortedMandatarissenAanwezigen: sort('mandatarissenAanwezigen', 'sortMandataris'),
  sortedMandatarissenAfwezigen: sort('mandatarissenAfwezigen', 'sortMandataris'),

});
