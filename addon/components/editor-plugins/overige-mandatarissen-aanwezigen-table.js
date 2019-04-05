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
      this.mergeAanwezigeStatus(this.overigeMandatarissenAanwezigen || [], this.overigeMandatarissenAfwezigen || [],this._aanwezigen);
      this.set('_aanwezigen' , this._aanwezigen.sort(this.sortBuildAanwezige));
      return this._aanwezigen;
    },

    set(k, v){
      this.set('_aanwezigen', v);
      this.mergeAanwezigeStatus(this.overigeMandatarissenAanwezigen || [], this.overigeMandatarissenAfwezigen || [],this._aanwezigen);
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
    this.set('aanwezigenToSelect', aanwezigen);
  }),

  didReceiveAttrs(){
    this._super(...arguments);
    this.set('_aanwezigen', A());
    if(this.overigeMandatarissenAanwezigen)
      this.loadData.perform();
  },

  mergeAanwezigeStatus(receivedAanwezigen, receivedAfwezigen, buildAanwezigen){
    for(let mandataris of receivedAanwezigen){
      let bAanwezige = buildAanwezigen.find(b => mandataris.get('uri') == b.mandataris.get('uri'));
      if(bAanwezige)
        bAanwezige['aanwezig'] = true;
      else
        buildAanwezigen.pushObject({ 'aanwezig': true, mandataris });
    }
    for(let mandataris of receivedAfwezigen){
      let bAfwezige = buildAanwezigen.find(b => mandataris.get('uri') == b.mandataris.get('uri'));
      if(bAfwezige)
        bAfwezige['aanwezig'] = false;
      else
        buildAanwezigen.pushObject({ 'aanwezig': false, mandataris });
    }
    return buildAanwezigen;
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
      //todo: rethink this: mandataris is a proxy here.
      if(!status){
        let p = this.overigeMandatarissenAanwezigen.find(p => p.get('uri')  == mandataris.get('uri'));
        this.overigeMandatarissenAanwezigen.removeObject(p);

        this.overigeMandatarissenAfwezigen.pushObject(mandataris);
      }
      else {
        this.overigeMandatarissenAanwezigen.pushObject(mandataris);

        let p = this.overigeMandatarissenAfwezigen.find(p => p.get('uri')  == mandataris.get('uri'));
        this.overigeMandatarissenAfwezigen.removeObject(p);
      }
    }
  }
});
