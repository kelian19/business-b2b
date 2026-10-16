/* Fixe le calcul vérifié du critère 16 : à 3 jours ouvrés convenus, les relances passent de 6 à 5 (et non 4). */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var D = require('../js/data.js');
var Dem = require('../js/core/demandes.js');

var REF = D.dateReference;

test('délai de 3 jours ouvrés : 5 relances (m38 et m39 reçus le lundi 19 octobre : 4 jours ouvrés au vendredi 23 octobre 17 h 30)', function () {
  assert.strictEqual(Dem.anciennete(D.parId('m38'), REF), 4);
  assert.strictEqual(Dem.anciennete(D.parId('m39'), REF), 4);
  assert.strictEqual(Dem.anciennete(D.parId('m40'), REF), 3, 'reçu le mardi 20 octobre');
  var r2 = Dem.relances(D.emails, REF, 2);
  var r3 = Dem.relances(D.emails, REF, 3);
  assert.strictEqual(r2.enRetard.length, 6);
  assert.strictEqual(r3.enRetard.length, 5);
  assert.strictEqual(r3.aSurveiller.length, 7);
  var sortie = r2.enRetard.filter(function (i) { return r3.enRetard.every(function (j) { return j.fil !== i.fil; }); });
  assert.strictEqual(sortie.length, 1);
  assert.strictEqual(sortie[0].cible.id, 'm40', 'seule la demande reçue le mardi (3 jours ouvrés) repasse « à surveiller »');
  assert.deepStrictEqual(r3.enRetard.map(function (i) { return i.cible.id; }).sort(), ['m19', 'm27', 'm34', 'm38', 'm39']);
});

test('délai rétabli à 2 jours ouvrés : retour à 6 relances', function () {
  assert.strictEqual(Dem.relances(D.emails, REF, 3).enRetard.length, 5);
  assert.strictEqual(Dem.relances(D.emails, REF, 2).enRetard.length, 6);
});
