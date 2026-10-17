'use strict';
// Compilation et simulation des blocs JS exportés ; ce fichier n'exécute pas n8n.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let compiled = 0;
for (const file of ['01-preparation.json', '02-bilan-quotidien.json']) {
  const flow = JSON.parse(fs.readFileSync(path.join(root, 'n8n', file), 'utf8'));
  assert.equal(flow.active, false);
  function visit(value) {
    if (typeof value === 'string' && value.startsWith('={{') && value.endsWith('}}')) {
      new Function('$input', '$json', '$', 'return (' + value.slice(3, -2) + ');');
      compiled++;
    } else if (value && typeof value === 'object') {
      for (const child of Object.values(value)) visit(child);
    }
  }
  for (const node of flow.nodes) {
    if (node.type.endsWith('.code')) {
      new Function('$input', '$json', '$', node.parameters.jsCode);
      compiled++;
    }
    visit(node.parameters);
  }
}
const preparation = JSON.parse(fs.readFileSync(path.join(root, 'n8n/01-preparation.json'), 'utf8'));
const find = name => preparation.nodes.find(node => node.name === name);
const invoke = (name, input, selector) => new Function('$input', '$json', '$', find(name).parameters.jsCode)(
  {all: () => input, first: () => input[0]}, input[0]?.json, selector);
const config = invoke('Configuration préparation', []);
assert.equal(config[0].json.mode, 'demo');
assert.equal(config[0].json.limit, 5);
const jobs = [{job_id: 'job-fictif', mode: 'demo', fact: 'Des formations sont proposées aux entreprises.'}];
const split = invoke('Répartir les tâches', [{json: {jobs}}]);
assert.equal(split.length, 1);
assert.deepEqual(split[0].pairedItem, {item: 0});
const simulated = invoke('Claude simulé — aucun appel', split);
const text = simulated[0].json.response.content[0].text;
assert.equal(JSON.parse(text).fact_quote, jobs[0].fact);
assert.equal(simulated[0].json.job_id, jobs[0].job_id);
const empty = invoke('Répartir les tâches', [{json: {jobs: []}}]);
assert.deepEqual(empty, []);
const response = {stop_reason: 'end_turn', content: [{type: 'text', text}]};
const wrapped = invoke('Rattacher la réponse au job', [{json: response}], () => ({item: {json: jobs[0]}}));
assert.equal(wrapped.json.job_id, jobs[0].job_id);
assert.deepEqual(wrapped.json.response, response);
const final = invoke('Relecture humaine — aucun envoi', [{json: {status: 'prepared'}}]);
assert.ok(final[0].json.next_step.includes('Aucun brouillon Gmail'));
console.log(`${compiled} blocs/expressions JS compilés ; configuration demo, lot, simulation Claude, lot vide et rattachement de réponse vérifiés. Aucune exécution n8n.`);
