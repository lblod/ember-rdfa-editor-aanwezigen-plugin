import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/overige-aanwezigen-table';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import { A } from '@ember/array';
import { computed } from '@ember/object';

export default Component.extend({
  layout,
  store: service(),

  aanwezigenToSelect: computed('personenAanwezigen.[]', 'personenAfwezigen.[]', function(){
    const listForTable = this.mergeAanwezigeStatus(this.personenAanwezigen || [], this.personenAfwezigen || [], []);
    return listForTable.sort(this.sortAanwezige);
  }),

  mergeAanwezigeStatus(receivedAanwezigen, receivedAfwezigen, buildAanwezigen){
    for(let persoon of receivedAanwezigen){
      let bAanwezige = buildAanwezigen.find(b => persoon.get('uri') == b.persoon.get('uri'));
      if(bAanwezige)
        bAanwezige['aanwezig'] = true;
      else
        buildAanwezigen.pushObject({ 'aanwezig': true, persoon });
    }
    for(let persoon of receivedAfwezigen){
      let bAfwezige = buildAanwezigen.find(b => persoon.get('uri') == b.persoon.get('uri'));
      if(bAfwezige)
        bAfwezige['aanwezig'] = false;
      else
        buildAanwezigen.pushObject({ 'aanwezig': false, persoon });
    }
    return buildAanwezigen;
  },

  sortAanwezige(a,b){
    let naamA = a.persoon.get('achternaam') || '';
    let naamB = b.persoon.get('achternaam') || '';
    return naamA.trim().localeCompare(naamB.trim());
  },

  actions:{

    add(){
      this.set('addAanwezigeMode', true);
    },

    selectAanwezige(persoon){
      this.set('newAanwezige', persoon);
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

    toggleAanwezigheid(status, persoon){
      if(!status){
        this.onRemoveAanwezige(persoon);
      }
      else {
        this.onAddAanwezige(persoon);
      }
    }
  }

});
