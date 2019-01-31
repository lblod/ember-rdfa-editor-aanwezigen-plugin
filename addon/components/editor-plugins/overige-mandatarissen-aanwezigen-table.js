import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/overige-mandatarissen-aanwezigen-table';
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
    let mandatarissen = this.cachedMandatarissen;
    let aanwezigen = A( mandatarissen.map( mandataris => {return {'aanwezig': false, mandataris };}) );
    if(this.overigeAanwezigen.length == 0){
      aanwezigen.forEach(a => a.aanwezig = true);
      this.overigeAanwezigen.setObjects(aanwezigen.map(a =>  a.mandataris));
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
    for(let mandataris of recievedAanwezigen){
      let bAanwezige = buildAanwezigen.find(b => mandataris.get('uri') == b.mandataris.get('uri'));
      if(bAanwezige)
        bAanwezige['aanwezig'] = true;
      else
        buildAanwezigen.pushObject({ 'aanwezig': true, mandataris });
    }

    return buildAanwezigen;
  },

  async sortBuildAanwezige(a,b){
    const persoonA = await a.mandataris.get('isBestuurlijkeAliasVan');
    const persoonB = await b.mandataris.get('isBestuurlijkeAliasVan');
    
    return await persoonA.get('achternaam').trim().localeCompare( await persoonB.get('achternaam').trim());
  },

  actions:{

    add(){
      this.set('addAanwezigeMode', true);
    },

    selectAanwezige(mandataris){
      this.set('newAanwezige', mandataris);
    },

    addAanwezige(){
      if(!this.newAanwezige)
        return;
      this.aanwezigenToSelect.pushObject({ 'aanwezig': true, mandataris: this.newAanwezige });
      this.overigeAanwezigen.pushObject(this.newAanwezige);

      this.set('newAanwezige', null);
      this.set('addAanwezigeMode', false);
    },

    addAanwezigeCancel(){
      this.set('newAanwezige', null);
      this.set('addAanwezigeMode', false);
    },

    toggleAanwezigheid(status, mandataris){
      if(!status){
        //todo: rethink this: persoon is a proxy here.
        let p = this.overigeAanwezigen.find(p => p.get('uri')  == mandataris.get('uri'));
        this.overigeAanwezigen.removeObject(p);
      }
      else
        this.overigeAanwezigen.pushObject(mandataris);
    }
  }

});
