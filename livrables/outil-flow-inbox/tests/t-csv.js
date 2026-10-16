/* Tests de l'export CSV (échappement, neutralisation des formules) et du tableau de suivi. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var D = require('../js/data.js');
var Csv = require('../js/core/csv.js');
var Ctx = require('../js/core/contexte.js');
var Suivi = require('../js/core/suivi.js');

function opts(extra) {
  var o = { ref: D.dateReference, delai: 2 };
  Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
  return o;
}

test('csv : échappement des séparateurs, guillemets et retours à la ligne', function () {
  assert.strictEqual(Csv.cellule('simple'), 'simple');
  assert.strictEqual(Csv.cellule('a;b'), '"a;b"');
  assert.strictEqual(Csv.cellule('dit "oui"'), '"dit ""oui"""');
  assert.strictEqual(Csv.cellule('ligne1\nligne2'), '"ligne1\nligne2"');
  assert.strictEqual(Csv.cellule('virgule, ok'), 'virgule, ok');
  assert.strictEqual(Csv.cellule(null), '');
  assert.strictEqual(Csv.cellule(12), '12');
  assert.strictEqual(Csv.ligne(['a', 'b;c', 'd']), 'a;"b;c";d');
  var out = Csv.versCsv(['Un', 'Deux'], [['x', 'y;z']]);
  assert.strictEqual(out, '﻿Un;Deux\r\nx;"y;z"\r\n');
  assert.strictEqual(Csv.versCsv(['A'], [], { bom: false }), 'A\r\n');
});

test('csv : les cellules commençant par =, +, - ou @ sont neutralisées', function () {
  ['=SOMME(A1:A9)', '+33 1 23', '-2+3', '@alias', '=HYPERLINK("http://x.example";"clic")', '\t=1', '  =1+1'].forEach(function (f) {
    assert.strictEqual(Csv.neutraliser(f).charAt(0), '\'', f);
    assert.ok(Csv.cellule(f).replace(/^"/, '').charAt(0) === '\'', f);
  });
  ['texte', '12', '2026-10-23', 'a=b', 'Boulangerie - Dupré', ''].forEach(function (f) {
    assert.strictEqual(Csv.neutraliser(f), f, f);
  });
  // La neutralisation et l'échappement se combinent : le guillemet est doublé après le préfixe.
  assert.strictEqual(Csv.cellule('=A1;"x"'), '"\'=A1;""x"""');
});

test('suivi : une ligne par demande (fil), hors doublons ; les messages classés seulement à la demande', function () {
  var c = Ctx.creer(D);
  var defaut = Suivi.lignes(D.emails, c, opts());
  var tous = Suivi.lignes(D.emails, c, opts({ inclureClasses: true }));
  assert.strictEqual(tous.length, 42, '43 fils moins le doublon');
  assert.strictEqual(defaut.length, 36, 'moins les 6 messages classés sans suite');
  assert.strictEqual(new Set(tous.map(function (r) { return r.fil; })).size, tous.length, 'une ligne par fil');
  assert.ok(!tous.some(function (r) { return r.statutId === 'doublon'; }));
  assert.ok(tous.some(function (r) { return r.ids.length > 1; }), 'un fil de plusieurs messages tient en une ligne');
  // Une ligne en revue est incluse.
  assert.ok(defaut.some(function (r) { return r.statutId === 'en_revue'; }));
  assert.strictEqual(Suivi.COLONNES.length, 10);
});

test('suivi : budget déclaré avec son type, délai vague sans date, relance due calculée', function () {
  var c = Ctx.creer(D);
  var rows = Suivi.lignes(D.emails, c, opts());
  var parId = function (id) { return rows.filter(function (r) { return r.ids.indexOf(id) >= 0; })[0]; };
  assert.ok(/fourchette/.test(Suivi.lignes(D.emails, c, opts()).filter(function (r) { return r.id === 'm30'; })[0].budget));
  assert.strictEqual(parId('m02').budget, 'Non indiqué');
  assert.ok(/vague/.test(parId('m04').delai) && !/\/\d{4}/.test(parId('m04').delai));
  assert.strictEqual(rows.filter(function (r) { return r.relanceEtat === 'retard'; }).length, 6);
  assert.strictEqual(rows.filter(function (r) { return r.relanceEtat === 'surveiller'; }).length, 6);
  assert.ok(/^Oui, depuis le 12\/10\/2026/.test(parId('m19').relance));
  assert.ok(/^Pas encore : à partir du 28\/10\/2026/.test(parId('m47').relance));
  assert.strictEqual(parId('m01').relance, 'Sans objet');
  // Le délai de relance change les lignes de retard.
  var r3 = Suivi.lignes(D.emails, c, opts({ delai: 3 }));
  assert.strictEqual(r3.filter(function (r) { return r.relanceEtat === 'retard'; }).length, 5);
});

test('suivi : tri et filtres (statut, service, responsable, texte)', function () {
  var c = Ctx.creer(D);
  var rows = Suivi.lignes(D.emails, c, opts());
  var parDate = Suivi.trier(rows, 'recu', 'asc', D.statutsTraitement);
  for (var i = 1; i < parDate.length; i++) assert.ok(parDate[i - 1].recu <= parDate[i].recu);
  var parEnt = Suivi.trier(rows, 'entreprise', 'desc', D.statutsTraitement);
  assert.strictEqual(parEnt.length, rows.length);
  // Valeurs vides en dernier dans les deux sens.
  var b1 = Suivi.trier(rows, 'budget', 'asc', D.statutsTraitement), b2 = Suivi.trier(rows, 'budget', 'desc', D.statutsTraitement);
  assert.strictEqual(b1[b1.length - 1].budgetTri, null);
  assert.strictEqual(b2[b2.length - 1].budgetTri, null);
  var vals = b1.filter(function (r) { return r.budgetTri !== null; }).map(function (r) { return r.budgetTri; });
  for (var j = 1; j < vals.length; j++) assert.ok(vals[j - 1] <= vals[j]);
  Suivi.COLONNES.forEach(function (col) { assert.strictEqual(Suivi.trier(rows, col.id, 'asc', D.statutsTraitement).length, rows.length, col.id); });

  assert.ok(Suivi.filtrer(rows, { statut: 'en_revue' }).every(function (r) { return r.statutId === 'en_revue'; }));
  assert.ok(Suivi.filtrer(rows, { statut: 'en_revue' }).length === 1);
  assert.ok(Suivi.filtrer(rows, { service: 'web' }).every(function (r) { return r.serviceId === 'web'; }));
  assert.ok(Suivi.filtrer(rows, { responsable: 'aucun' }).every(function (r) { return !r.responsableId; }));
  assert.ok(Suivi.filtrer(rows, { texte: 'glycines' }).length === 1);
  assert.strictEqual(Suivi.filtrer(rows, {}).length, rows.length);
  assert.strictEqual(Suivi.filtrer(rows, { statut: 'en_revue', texte: 'glycines' }).length, 0);
});

test('suivi : l\'export CSV contient l\'en-tête, une ligne par demande et neutralise les formules', function () {
  var c = Ctx.creer(D);
  var rows = Suivi.lignes(D.emails, c, opts());
  var out = Suivi.versCsv(rows, D.statutsTraitement);
  var lignes = out.replace(/^﻿/, '').split('\r\n');
  assert.strictEqual(lignes[lignes.length - 1], '');
  assert.strictEqual(lignes[0], Suivi.COLONNES.map(function (x) { return x.libelle; }).join(';'));
  assert.strictEqual(lignes.length - 2 >= rows.length, true, 'une ligne par demande (les retours à la ligne éventuels sont entre guillemets)');
  // Une entreprise malveillante est neutralisée dans le fichier.
  var piege = rows.slice(0, 1).map(function (r) { var x = {}; Object.keys(r).forEach(function (k) { x[k] = r[k]; }); x.entreprise = '=CMD|calc'; x.contact = '@somme'; x.budget = '-10'; return x; });
  var csv = Suivi.versCsv(piege, D.statutsTraitement).split('\r\n')[1];
  assert.ok(csv.indexOf(';\'=CMD|calc;') >= 0, csv);
  assert.ok(csv.indexOf('\'@somme') >= 0 && csv.indexOf(';\'-10;') >= 0, csv);
  // Aperçu du tableau Google Sheets : mêmes cellules neutralisées, lettres de A à J.
  var a = Suivi.apercuSheets(piege, D.statutsTraitement, 5);
  assert.deepStrictEqual(a.lettres, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
  assert.strictEqual(a.lignes[0][1], '\'=CMD|calc');
  assert.strictEqual(Suivi.apercuSheets(rows, D.statutsTraitement, 5).restantes, rows.length - 5);
  // Aucune cellule exportée, hors préfixe, ne commence par une formule.
  rows.forEach(function (r) {
    Suivi.cellulesTexte(r, D.statutsTraitement).map(Csv.neutraliser).forEach(function (cell) {
      assert.ok(!/^\s*[=+\-@]/.test(cell), 'cellule non neutralisée : ' + cell);
    });
  });
});
