import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/overige-aanwezigen-table';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import { A } from '@ember/array';

export default Component.extend({
  layout,
  verkozenGevolgUri: 'http://data.vlaanderen.be/id/concept/VerkiezingsresultaatGevolgCode/89498d89-6c68-4273-9609-b9c097727a0f',
  store: service(),
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

    //TODO: sort
    let aanwezigen = A( personen.map( persoon => {return {'aanwezig': false, persoon };}) );
    aanwezigen = this.mergeAanwezigeStatus(this.aanwezigen, aanwezigen);

    this.set('_aanwezigen' , aanwezigen);
  }),
  didReceiveAttrs(){
    this._super(...arguments);
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

  actions:{

    add(){
      this.set('addAanwezigeMode', true);
    },

    selectAanwezige(persoon){
      this.set('newAanwezige', persoon);
    },

    addAanwezige(){
      this._aanwezigen.pushObject({ 'aanwezig': true, persoon: this.newAanwezige });
      this.aanwezigen.pushObject(this.newAanwezige);

      this.set('newAanwezige', null);
      this.set('addAanwezigeMode', false);
    },

    addAanwezigeCancel(){
      this.set('newAanwezige', null);
      this.set('addAanwezigeMode', false);
    },

    toggleAanwezigheid(status, persoon){
      if(status)
        this.aanwezigen.removeObject(persoon);
      this.aanwezigen.pushObject(persoon);

      this.mergeAnwezigeStatus(this.aanwezigen || A(), this._aanwezigen);
    }
  }

});
