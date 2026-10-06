/* Lanceur : charge les tests historiques puis tous les t-*.js. Code de sortie 0 si tout passe, 1 sinon.
 * Lancer : node livrables/outil-equerre/tests/run-tests.js */
'use strict';

var fs = require('fs');
var path = require('path');
var H = require('./harness');

// Les tests ne modifient pas le dossier tests/fixtures : les fichiers ne sont (re)générés que s'ils manquent
// ou sur demande explicite (EQUERRE_FIXTURES=1 node tests/run-tests.js).
var fixturesPresentes = ['tiers-fictif.csv', 'factures-fictif.csv', 'lignes-fictif.csv', 'registre-fictif.csv'].every(function (f) {
  return fs.existsSync(path.join(__dirname, 'fixtures', f));
});
if (process.env.EQUERRE_FIXTURES === '1' || !fixturesPresentes) {
  try { require('./make-fixtures.js').generer(); } catch (e) { /* les fixtures sont recréées si le module existe */ }
}

['t-legacy.js'].concat(fs.readdirSync(__dirname).filter(function (f) { return /^t-.*\.js$/.test(f) && f !== 't-legacy.js'; }).sort())
  .forEach(function (f) { require(path.join(__dirname, f)); });

process.exit(H.bilan());
