import Service from '@ember/service';
import EmberObject from '@ember/object';
import { task } from 'ember-concurrency-decorators';
import { A } from '@ember/array';

/**
 * Service responsible for correct insertion and management in notulen
 * ---------------------------------------------------
 * CODE REVIEW NOTES
 * ---------------------------------------------------
 *
 *  INTERACTION PATTERNS
 *  --------------------
 *  For all incoming contexts, first looks whether there is an rdfa instructive to manage aanwezigen.
 *  If encountered, a hint is set on the content of the instructive, the DOM node is passed to the card.
 *  Once loaded, the management occurs in a modal. On insert the dom node is updated/replaced.
 *
 *  This plugin uses the document as a datastore (along with the normal backend):
 *   - on edit, to keep track of which aanwezigen have already been inserted
 *   - on create to copy data from a previous agendapunt, so the user avoids inserting the same info twice
 *   - on create, to set proper filter on bestuurorgaan (only a subset of mandatarissen should be availible in notulen)
 *
 *  POTENTIAL ISSUES/TODO
 *  ---------------------
 *  - The domNode is passed to the card. At insertion time, the domNode may be detached from tree, which results in broken plugin.
 *
 *   - Performance: A scan on RDFA content is slow once we have a lot of aanwezigen
 *    Furthermore, it might be in future we'll have to scan the whole document to keep track of which mandatarissen may have been fired
 *      and which have been appointed as the new ones.
 *
 *  - Due to the several scenarios it has to support (aanwezige personen/mandatarissen, creation of personen) this plugin has grown in complexity
 *     and needs maintenance.
 *
 *  OTHER INFO
 *  ----------
 *  - uses metamodel plugin utils to:
 *    deserialize triples to ember object
 * ---------------------------------------------------
 * END CODE REVIEW NOTES
 * ---------------------------------------------------
 *
 * @module editor-aanwezigen-plugin
 * @class RdfaEditorAanwezigenPlugin
 * @constructor
 * @extends EmberService
 */
class RdfaEditorAanwezigenPlugin extends Service {
  constructor() {
    super(...arguments);
    this.insertAanwezigenText = 'http://mu.semte.ch/vocabularies/ext/insertAanwezigenText';
    this.aanwezigenTable = 'http://mu.semte.ch/vocabularies/ext/aanwezigenTable';
  }

  /**
   * Restartable task to handle the incoming events from the editor dispatcher
   *
   * @method execute
   *
   * @param {string} hrId Unique identifier of the event in the hintsRegistry
   * @param {Array} contexts RDFa contexts of the text snippets the event applies on
   * @param {Object} hintsRegistry Registry of hints in the editor
   * @param {Object} editor The RDFa editor instance
   *
   * @public
   */
  
  @task
  // eslint-disable-next-line require-yield
  *execute(hrId, contexts, hintsRegistry, editor) {
    if (contexts.length === 0) return [];

    const hints = [];
    for(let context of contexts){
      this.setBestuursorgaanIfSet(context.context);
      let contextResult = this.detectRelevantContext(context);
      if(!contextResult) continue;
      const {semanticNode, predicate} = contextResult;

      let propertyToUse = this.returnPropertyToUse(context);

      if(predicate == this.insertAanwezigenText) {
        hintsRegistry.removeHintsInRegion(context.region, hrId, this.who);
        hints.pushObjects(this.generateHintsForContext(context, predicate, semanticNode, editor, { propertyToUse }));
      }
      let domNodeRegion = [ semanticNode.start, semanticNode.end ];
      if(predicate == this.aanwezigenTable && ! hints.find(h => h.location[0] == domNodeRegion[0] && h.location[1] == domNodeRegion[1])){
        hintsRegistry.removeHintsInRegion(domNodeRegion, hrId, this.who);
        hints.pushObjects(this.generateHintsForContext(context, predicate, semanticNode, editor, { propertyToUse }));
      }
    }

    const cards = hints.map( (hint) => this.generateCard(hrId, hintsRegistry, editor, hint, this.who));
    if(cards.length > 0){
      hintsRegistry.addHints(hrId, this.who, cards);
    }
  }

  /**
   * Given context object, tries to detect a context the plugin can work on
   *
   * @method detectRelevantContext
   *
   * @param {Object} context Text snippet at a specific location with an RDFa context
   *
   * @return {String} URI of context if found, else empty string.
   *
   * @private
   */
  detectRelevantContext({ semanticNode }) {
    if (semanticNode.rdfaAttributes && semanticNode.rdfaAttributes.properties) {
      const properties = semanticNode.rdfaAttributes.properties || A();
      if (properties.includes(this.insertAanwezigenText)) {
        return {semanticNode, predicate: this.insertAanwezigenText};
      }
      if (properties.includes(this.aanwezigenTable)) {
        return {semanticNode, predicate: this.aanwezigenTable};
      }
    }
  }

  returnPropertyToUse(context){
    let triples = context.context.slice().reverse();
    for(let triple of triples){
      if(triple.predicate == 'a' && triple.object == 'http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt') {
        return 'besluit:heeftAanwezige';
      }
    }
    return 'besluit:heeftAanwezigeBijStart';
  }

  /**
   * Generates a card given a hint
   *
   * @method generateCard
   *
   * @param {string} hrId Unique identifier of the event in the hintsRegistry
   * @param {Object} hintsRegistry Registry of hints in the editor
   * @param {Object} editor The RDFa editor instance
   * @param {Object} hint containing the hinted string and the location of this string
   *
   * @return {Object} The card to hint for a given template
   *
   * @private
   */
  generateCard(hrId, hintsRegistry, editor, hint, cardName){
    return EmberObject.create({
      info: {
        label: 'Voeg tabel van fracties toe',
        plainValue: hint.text,
        location: hint.location,
        semanticNodeToUpdate: hint.semanticNode,
        predicate: hint.predicate,
        editMode: hint.options.editMode,
        propertyToUse: hint.options.propertyToUse,
        hrId, hintsRegistry, editor
      },
      location: hint.location,
      options: hint.options,
      card: cardName
    });
  }

  /**
   * Generates a hint, given a context
   *
   * @method generateHintsForContext
   *
   * @param {Object} context Text snippet at a specific location with an RDFa context
   *
   * @return {Object} [{dateString, location}]
   *
   * @private
   */
  generateHintsForContext(context, predicate, semanticNode, editor, options = {}){
    const hints = [];
    const text = context.text || '';
    let location = context.region;
    if(predicate == this.aanwezigenTable){
      location = [ semanticNode.start, semanticNode.end ];
      options.noHighlight = true;
      options.editMode = true;
    }
    hints.push({text, location, semanticNode, predicate, options});
    return hints;
  }

  setBestuursorgaanIfSet(triples) {
    const zitting = triples.find((triple) => triple.object === 'http://data.vlaanderen.be/ns/besluit#Zitting');
    if (zitting) {
      const bestuursorgaan = triples.find((triple) => triple.subject === zitting.subject && triple.predicate === 'http://data.vlaanderen.be/ns/besluit#isGehoudenDoor');
      if (bestuursorgaan){
        this.set('bestuursorgaanUri', bestuursorgaan.object);
      }
    }
  }

}

RdfaEditorAanwezigenPlugin.reopen({
  who: 'editor-plugins/aanwezigen-card'
});
export default RdfaEditorAanwezigenPlugin;
