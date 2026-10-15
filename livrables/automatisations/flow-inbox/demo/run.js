'use strict';
const assert = require('node:assert/strict');
const { Simulation } = require('../src/simulation.js');
const { scenarios } = require('./fixtures.js');
const simulation = new Simulation();
console.log('FLOW INBOX — DÉMONSTRATION LOCALE, EXTRACTIONS ET FOURNISSEURS SIMULÉS');
console.log('Aucune connexion, consommation API ou création Gmail. État conservé en mémoire seulement.\n');
for (const scenario of scenarios()) {
  const item = scenario.sample;
  const result = simulation.ingest(item.message, item.extraction, item.fault);
  console.log(scenario.title + ' → ' + result.kind + (result.code ? ' (' + result.code + ')' : ''));
}
const item = scenarios().find(scenario => scenario.id === 'complete').sample;
const first = simulation.ingest(item.message, item.extraction);
assert.equal(first.kind, 'duplicate');
const key = first.record.idempotency_key;
const initial = simulation.draft(key);
simulation.editDraft(key, 'Bonjour, voici notre retouche humaine fictive. Aucun envoi.');
simulation.observe(key);
assert.equal(simulation.draft(key).id, initial.id);
assert.notEqual(simulation.draft(key).message_id, initial.message_id);
simulation.removeDraft(key);
simulation.observe(key);
assert.equal(simulation.get(key).answered_at, null);
assert.equal(simulation.ingest(item.message, item.extraction).kind, 'duplicate');
console.log('\nRejeu, retouche et disparition vérifiés dans le simulateur : aucun envoi déduit.');
const uncertain = simulation.list().find(record => record.draft_status === 'uncertain');
const count = simulation.calls.simulated_draft_creates;
simulation.observe(uncertain.idempotency_key);
assert.equal(simulation.calls.simulated_draft_creates, count);
console.log('Création incertaine réconciliée grâce à la corrélation du faux fournisseur, sans recréation.\n');
console.table(simulation.list().map(record => ({
  demande: record.request_id, traitement: record.processing_state,
  brouillon: record.draft_status, suivi: record.followup_status,
  informations_manquantes: record.missing_fields.join(', ')
})));
console.log('Brouillons locaux créés : ' + simulation.calls.simulated_draft_creates);
console.log('Cette exécution ne valide ni Gmail, ni Google Sheets, ni n8n.');
