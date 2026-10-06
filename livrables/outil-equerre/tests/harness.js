/* Équerre : petit harnais de tests commun (test, near, compteur, code de sortie). */
'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var RACINE = path.join(__dirname, '..');
var etat = { reussis: 0, echecs: 0, noms: [] };

function test(name, fn) {
  try {
    fn();
    etat.reussis++;
    etat.noms.push(name);
  } catch (e) {
    etat.echecs++;
    console.error('ÉCHEC : ' + name + '\n  ' + (e && e.message ? e.message.split('\n')[0] : e));
  }
}

function near(a, b, eps) { assert.ok(Math.abs(a - b) <= (eps || 0.005), a + ' != ' + b); }

function lire(rel) { return fs.readFileSync(path.join(RACINE, rel), 'utf8'); }

/** Fichiers de l'application (HTML, JS, CSS) hors tests, chemins relatifs avec « / ». */
function fichiersApp() {
  var out = [];
  (function parcourir(dir, rel) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
      if (d.name === 'tests' || d.name === 'node_modules' || d.name.charAt(0) === '.') return;
      var p = path.join(dir, d.name);
      var r = rel ? rel + '/' + d.name : d.name;
      if (d.isDirectory()) parcourir(p, r);
      else if (/\.(html|js|css)$/.test(d.name)) out.push(r);
    });
  })(RACINE, '');
  return out;
}

function bilan() {
  console.log(etat.reussis + ' test' + (etat.reussis > 1 ? 's' : '') + ' réussi' + (etat.reussis > 1 ? 's' : '') +
    (etat.echecs ? ', ' + etat.echecs + ' échec' + (etat.echecs > 1 ? 's' : '') : ''));
  return etat.echecs ? 1 : 0;
}

module.exports = { test: test, near: near, assert: assert, lire: lire, fichiersApp: fichiersApp, bilan: bilan, etat: etat, RACINE: RACINE, path: path, fs: fs };
