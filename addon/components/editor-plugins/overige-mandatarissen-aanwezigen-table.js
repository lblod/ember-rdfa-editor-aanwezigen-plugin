import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/overige-mandatarissen-aanwezigen-table';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import { A } from '@ember/array';
import { computed } from '@ember/object';

export default Component.extend({
  layout,
  store: service(),

  /** list of mandatarissen that are present **/
  overigeMandatarissenAanwezigen: null,
  /** list of mandatarissen that are not present **/
  overigeMandatarissenAfwezigen: null,
  /** list of mandatarissen that were fetched previously, includes at least those that are expected to be present **/
  cachedMandatarissen: null,

  aanwezigenToSelect: computed('overigeMandatarissenAanwezigen.[]', 'overigeMandatarissenAfwezigen.[]', function(){
    const listForTable = this.mergeAanwezigeStatus(this.overigeMandatarissenAanwezigen || [], this.overigeMandatarissenAfwezigen || [], []);
    return listForTable.sort(this.sortBuildAanwezige);
  }),

  mergeAanwezigeStatus(receivedAanwezigen, receivedAfwezigen, listForTable){
    for(let mandataris of receivedAanwezigen){
      let bAanwezige = listForTable.find(b => mandataris.get('uri') == b.mandataris.get('uri'));
      if(bAanwezige)
        bAanwezige['aanwezig'] = true;
      else
        listForTable.pushObject({ 'aanwezig': true, mandataris });
    }
    for(let mandataris of receivedAfwezigen){
      let bAfwezige = listForTable.find(b => mandataris.get('uri') == b.mandataris.get('uri'));
      if(bAfwezige)
        bAfwezige['aanwezig'] = false;
      else
        listForTable.pushObject({ 'aanwezig': false, mandataris });
    }
    return listForTable;
  },

  sortBuildAanwezige(a,b){
    const mandatarisANaam = a.mandataris.isBestuurlijkeAliasVan.get('achternaam') || '';
    const mandatarisBNaam = b.mandataris.isBestuurlijkeAliasVan.get('achternaam') || '';

    return mandatarisANaam.trim().localeCompare( mandatarisBNaam.trim());
  },

  actions:{

    add(){
      this.set('addAanwezigeMode', true);
    },

    async selectAanwezige(mandataris){
      this.set('newAanwezige', mandataris);
      this.set('newAanwezigeFunctie', await mandataris.get('bekleedt').get('bestuursfunctie').get('label'));
    },

    addAanwezige(){
      if(!this.newAanwezige)
        return;
      this.onAddAanwezige(this.newAanwezige);

      this.set('newAanwezige', null);
      this.set('addAanwezigeMode', false);
    },

    addAanwezigeCancel(){
      this.set('newAanwezige', null);
      this.set('addAanwezigeMode', false);
    },

    toggleAanwezigheid(status, mandataris){
      if(!status){
        this.onRemoveAanwezige(mandataris);
      }
      else {
        this.onAddAanwezige(mandataris);
      }
    }
  }
});
