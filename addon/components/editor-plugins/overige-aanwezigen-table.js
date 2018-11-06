import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/overige-aanwezigen-table';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import { A } from '@ember/array';
import { computed } from '@ember/object';

export default Component.extend({
  layout,
  verkozenGevolgUri: 'http://data.vlaanderen.be/id/concept/VerkiezingsresultaatGevolgCode/89498d89-6c68-4273-9609-b9c097727a0f',
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
    let personen = yield this.store.query('persoon',
                     {
                       filter: {
                         'is-kandidaat-voor': {
                           'rechtstreekse-verkiezing': {
                             'stelt-samen': {
                               ':uri:': this.bestuursorgaan.uri
                             }
                           }
                         },
                         'verkiezingsresultaten': {
                           'gevolg': {
                             ':uri:': this.verkozenGevolgUri
                           },
                           'is-resultaat-voor': {
                             'rechtstreekse-verkiezing': {
                               'stelt-samen': {
                                 ':uri:': this.bestuursorgaan.uri
                               }
                             }
                           }
                         }
                       },
                       include: 'verkiezingsresultaten,is-kandidaat-voor,geboorte',
                       page: { size: 1000 },
                       sort:'gebruikte-voornaam'
                     });

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
      let bAanwezige = buildAanwezigen.find(b => persoon.uri == b.persoon.uri);
      if(bAanwezige)
        bAanwezige['aanwezig'] = true;
      else
        buildAanwezigen.pushObject({ 'aanwezig': true, persoon });
    }

    return buildAanwezigen;
  },

  sortBuildAanwezige(a,b){
    if(a.persoon.gebruikteVoornaam < b.persoon.gebruikteVoornaam)
      return -1;
    if (a.persoon.gebruikteVoornaam > b.persoon.gebruikteVoornaam)
      return 1;
    return 0;
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
      if(!status)
        this.overigeAanwezigen.removeObject(persoon);
      else
        this.overigeAanwezigen.pushObject(persoon);
    }
  }

});
