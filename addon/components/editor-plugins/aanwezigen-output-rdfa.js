import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-output-rdfa';
import { sort } from '@ember/object/computed';
import { A } from '@ember/array';
import { tracked } from '@glimmer/tracking';

export default class AanwezigenOutput extends Component {

  @tracked propertyToUse;
  get aanwezigenBijAgendapunt() {
    return this.propertyToUse == 'besluit:heeftAanwezigeBijStart';
  }

  constructor() {
    super(...arguments)
    this.layout = layout;
    this.sortedPersonenAanwezigen = sort('overigePersonenAanwezigen', 'sortPersoon');
    this.sortedPersonenAfwezigen = sort('overigePersonenAfwezigen', 'sortPersoon');
    this.sortedMandatarissenAanwezigen = sort('overigeMandatarissenAanwezigen', 'sortMandataris');
    this.sortedMandatarissenAfwezigen = sort('overigeMandatarissenAfwezigen', 'sortMandataris');
  }

  init() {
    super(...arguments);
    this.set('sortMandataris', ['isBestuurlijkeAliasVan.achternaam']);
    this.set('sortPersoon', ['achternaam']);
    this.set('overigePersonenAanwezigen', A());
    this.set('overigePersonenAfwezigen', A());
    this.set('overigeMandatarissenAanwezigen', A());
    this.set('overigeMandatarissenAfwezigen', A());
  }
}
