import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/overige-aanwezigen-table';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import { A } from '@ember/array';
import { computed } from '@ember/object';

export default Component.extend({
  layout,
  store: service(),

  aanwezigenToSelect: computed('aanwezigenToSelect.[]', {
    get(){
      this.mergeAanwezigeStatus(this.overigeAanwezigen || [], this._aanwezigen);
      this.set('_aanwezigen' , this._aanwezigen.sort(this.sortBuildAanwezige));
      return this._aanwezigen;
    },

    set(k, v){
      this.set('_aanwezigen', v);
      this.mergeAanwezigeStatus(this.overigeAanwezigen || [], this._aanwezigen);
      this.set('_aanwezigen' , this._aanwezigen.sort(this.sortBuildAanwezige));
      return this._aanwezigen;
    }
  }),

  loadData: task(function *(){
    let personen = this.cachedPersonen;
    let aanwezigen = A( personen.map( persoon => {return {'aanwezig': false, persoon };}) );
    if(this.overigeAanwezigen.length == 0){
      aanwezigen.forEach(a => a.aanwezig = true);
      this.overigeAanwezigen.setObjects(aanwezigen.map(a =>  a.persoon));
    }
 
    this.set('aanwezigenToSelect', aanwezigen);
  }),

  didReceiveAttrs(){
    this._super(...arguments);
    this.set('_aanwezigen', A());
    if(this.overigeAanwezigen)
      this.loadData.perform();
  },

  mergeAanwezigeStatus(recievedAanwezigen, buildAanwezigen){
    for(let persoon of recievedAanwezigen){
      let bAanwezige = buildAanwezigen.find(b => persoon.get('uri') == b.persoon.get('uri'));
      if(bAanwezige)
        bAanwezige['aanwezig'] = true;
      else
        buildAanwezigen.pushObject({ 'aanwezig': true, persoon });
    }

    return buildAanwezigen;
  },

  sortBuildAanwezige(a,b){
    return a.persoon.get('achternaam').trim().localeCompare(b.persoon.get('achternaam').trim());
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
      this.aanwezigenToSelect.pushObject({ 'aanwezig': true, persoon: this.newAanwezige });
      this.overigeAanwezigen.pushObject(this.newAanwezige);

      this.set('newAanwezige', null);
      this.set('addAanwezigeMode', false);
    },

    addAanwezigeCancel(){
      this.set('newAanwezige', null);
      this.set('addAanwezigeMode', false);
    },

    toggleAanwezigheid(status, persoon){
      if(!status){
        //todo: rethink this: persoon is a proxy here. 
        let p = this.overigeAanwezigen.find(p => p.get('uri')  == persoon.get('uri'));
        this.overigeAanwezigen.removeObject(p);
      }
      else
        this.overigeAanwezigen.pushObject(persoon);
    }
  }

});
