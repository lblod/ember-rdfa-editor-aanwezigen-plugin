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
      this.mergeAanwezigeStatus(this.overigeMandatarissenAanwezigen || [], this._aanwezigen);
      this.set('_aanwezigen' , this._aanwezigen.sort(this.sortBuildAanwezige));
      return this._aanwezigen;
    },

    set(k, v){
      this.set('_aanwezigen', v);
      this.mergeAanwezigeStatus(this.overigeMandatarissenAanwezigen || [], this._aanwezigen);
      this.set('_aanwezigen' , this._aanwezigen.sort(this.sortBuildAanwezige));
      return this._aanwezigen;
    }
  }),

  loadData: task(function *(){
    let mandatarissen = this.cachedMandatarissen;
    let aanwezigen = A( mandatarissen.map( mandataris => {return {'aanwezig': false, mandataris };}) );
    if(this.overigeMandatarissenAanwezigen.length == 0){
      aanwezigen.forEach(a => a.aanwezig = true);
      this.overigeMandatarissenAanwezigen.setObjects(aanwezigen.map(a =>  a.mandataris));
    }
    if(aanwezigen.length == 0) {
      this.set('geenMandatarissen', true);
    } else {
      this.set('geenMandatarissen', false);
    }
    this.set('aanwezigenToSelect', aanwezigen);
  }),

  didReceiveAttrs(){
    this._super(...arguments);
    this.set('_aanwezigen', A());
    if(this.overigeMandatarissenAanwezigen)
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

    async selectAanwezige(mandataris){
      this.set('newAanwezige', mandataris);
      this.set('newAanwezigeFunctie', await mandataris.get('bekleedt').get('bestuursfunctie').get('label'));
    },

    addAanwezige(){
      if(!this.newAanwezige)
        return;
      this.aanwezigenToSelect.pushObject({ 'aanwezig': true, mandataris: this.newAanwezige });
      this.overigeMandatarissenAanwezigen.pushObject(this.newAanwezige);

      this.set('newAanwezige', null);
      this.set('addAanwezigeMode', false);
    },

    addAanwezigeCancel(){
      this.set('newAanwezige', null);
      this.set('addAanwezigeMode', false);
    },

    toggleAanwezigheid(status, mandataris){
      if(!status){
        //todo: rethink this: mandataris is a proxy here.
        let p = this.overigeMandatarissenAanwezigen.find(p => p.get('uri')  == mandataris.get('uri'));
        this.overigeMandatarissenAanwezigen.removeObject(p);
      }
      else
        this.overigeMandatarissenAanwezigen.pushObject(mandataris);
    }
  }

});
