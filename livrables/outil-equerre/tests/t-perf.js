/* Tests de charge : 10 000 tiers et 50 000 lignes de factures (fixtures générées de façon déterministe, rien de versionné). */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var L = require('../js/core/logic.js');
var MF = require('./make-fixtures.js');

function octets(texte) {
  var b = Buffer.from(texte, 'utf8');
  return new Uint8Array(b.buffer, b.byteOffset, b.length);
}

function factures(n) {
  var out = [];
  for (var i = 0; i < n; i++) {
    out.push({ ligne: i + 2, numero: 'F-' + i, client: 'Tiers Fictif ' + ((i * 7) % n + 1) + ' SAS', sirenClient: '', dateEmission: '2026-03-01', dateEcheance: '2026-03-31', ht: 100, ttc: 120, paid: false, datePaiement: null });
  }
  return out;
}

function importer(texte, kind) {
  var dec = L.decodeBytes(octets(texte));
  var p = L.parseCsv(dec.texte);
  var table = L.tableDepuisParse(p, L.suggestMapping(p.headers, kind).mapping, { nomFichier: 'x.csv', encodage: dec.encodage });
  return { table: table, ev: L.evaluerTable(table, kind) };
}

function pipeline(entree) {
  var t0 = Date.now();
  var tiers = importer(entree.tiers, 'tiers');
  var analyse = L.analyzeThirdParties(tiers.ev.records, { columns: tiers.ev.colonnes });
  var rap = L.rapportImport(tiers.table, tiers.ev, 'tiers');
  var lignes = entree.lignes ? importer(entree.lignes, 'lignes') : null;
  var rapprochement = L.rapprocherFacturesTiers(entree.factures, tiers.ev.records);
  return { ms: Date.now() - t0, tiers: tiers, analyse: analyse, rap: rap, lignes: lignes, rapprochement: rapprochement };
}

test('charge : 10 000 tiers et 50 000 lignes de factures parsés, analysés et rapprochés en moins de 3 s', function () {
  var entree = { tiers: MF.genererTiers(10000), lignes: MF.genererLignes(50000), factures: factures(10000) };
  var r = pipeline(entree);
  assert.strictEqual(r.tiers.ev.records.length, 10000);
  assert.strictEqual(r.lignes.ev.records.length, 50000);
  assert.strictEqual(r.analyse.total, 10000);
  assert.ok(r.analyse.counts.siren_manquant > 500);
  assert.ok(r.analyse.counts.doublon > 100);
  assert.strictEqual(r.rapprochement.length, 10000);
  var nb = { rapproche: 0, homonyme: 0, non_rapproche: 0 };
  r.rapprochement.forEach(function (x) { nb[x.statut]++; });
  assert.ok(nb.rapproche >= 7000 && nb.homonyme > 0 && nb.non_rapproche > 0, JSON.stringify(nb));
  console.log('  (charge : ' + r.ms + ' ms)');
  assert.ok(r.ms < 3000, r.ms + ' ms');
});

test('charge : aucune fonction du parseur n\'est quadratique (20 000 tiers < 3 fois 10 000 tiers)', function () {
  function mesurer(n) {
    var entree = { tiers: MF.genererTiers(n), factures: factures(n) };
    var meilleur = Infinity;
    for (var k = 0; k < 3; k++) meilleur = Math.min(meilleur, pipeline(entree).ms);
    return meilleur;
  }
  var t10 = mesurer(10000);
  var t20 = mesurer(20000);
  console.log('  (10 000 tiers : ' + t10 + ' ms ; 20 000 tiers : ' + t20 + ' ms)');
  assert.ok(t20 < 3 * t10 + 40, t10 + ' ms puis ' + t20 + ' ms');
});

test('charge : analyseur CSV incrémental sur 6 Mo par tranches de 256 Ko, mêmes lignes que l\'analyse complète', function () {
  var texte = MF.genererLignes(50000);
  var complet = L.parseCsv(texte);
  var p = L.createCsvParser(complet.separator);
  for (var i = 0; i < texte.length; i += 256 * 1024) p.feed(texte.slice(i, i + 256 * 1024));
  var r = L.finaliser(p.fin());
  assert.strictEqual(r.rows.length, 50000);
  assert.strictEqual(r.lines[49999], 50001);
  assert.deepStrictEqual(r.rows[31337], complet.rows[31337]);
});
