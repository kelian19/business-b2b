/* Tests du reporting mensuel (P3) : indicateurs, filtres période et client, comparaison avec la période précédente, export CSV. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var near = H.near;
var L = require('../js/core/logic.js');
var D = require('../js/data.js');

var REF = '2026-10-06';
var INV = L.normalizeInvoices(D.exportFacturation).invoices;
var REP = L.computeReporting(INV, REF);

function inv(client, emission, ht, extra) {
  return Object.assign({ client: client, dateEmission: emission, dateEcheance: null, ht: ht, ttc: ht * 1.2, paid: false, datePaiement: null }, extra || {});
}

test('reporting : valeurs de base inchangées sans filtre (454 219 €, 150 factures, 10 clients, encours 56 306 €)', function () {
  assert.strictEqual(Math.round(REP.caHT), 454219);
  assert.strictEqual(REP.nbFactures, 150);
  assert.strictEqual(REP.nbClients, 10);
  assert.strictEqual(Math.round(REP.encours), 56306);
  assert.strictEqual(REP.periode.filtre, false);
  assert.strictEqual(REP.comparaison, null);
});

test('reporting : moyenne mensuelle 37 852 €, mois le plus haut et le plus bas', function () {
  assert.strictEqual(REP.parMois.length, 12);
  assert.strictEqual(Math.round(REP.moyenneMensuelle), 37852);
  near(REP.moyenneMensuelle * 12, REP.caHT, 0.06);
  assert.strictEqual(REP.moisMax.mois, '2025-10');
  assert.strictEqual(Math.round(REP.moisMax.ht), 47877);
  assert.ok(REP.moisMin.ht < REP.moyenneMensuelle);
  assert.ok(REP.parMois.every(function (m) { return m.ht <= REP.moisMax.ht && m.ht >= REP.moisMin.ht; }));
});

test('reporting : cinq premiers clients, part du premier 26,8 % et du cinquième 7,0 %', function () {
  assert.strictEqual(REP.topClients.length, 5);
  assert.strictEqual(Math.round(REP.topClients[0].part * 1000) / 10, 26.8);
  assert.strictEqual(Math.round(REP.topClients[4].part * 1000) / 10, 7);
  assert.strictEqual(Math.round(REP.topPart * 100), 80);
});

test('reporting : liste vide, aucun indicateur ne produit NaN ni division par zéro', function () {
  var r = L.computeReporting([], REF);
  assert.strictEqual(r.caHT, 0);
  assert.strictEqual(r.nbFactures, 0);
  assert.strictEqual(r.moyenneMensuelle, null);
  assert.strictEqual(r.moisMax, null);
  assert.strictEqual(r.topPart, 0);
  assert.strictEqual(r.delaiMoyenPaiement, null);
  assert.strictEqual(r.comparaison, null);
  var f = L.computeReporting([], REF, { du: '2026-01-01', au: '2026-01-31' });
  assert.strictEqual(f.comparaison.videActuel, true);
  assert.strictEqual(f.comparaison.videPrecedent, true);
  assert.strictEqual(f.comparaison.caHT.ecartPct, null);
});

test('filtre client : seules les factures du client comptent dans tous les indicateurs', function () {
  var r = L.computeReporting(INV, REF, { client: 'Distribution Fictive Delta SA' });
  assert.strictEqual(r.nbClients, 1);
  assert.strictEqual(r.periode.filtre, true);
  assert.strictEqual(r.periode.client, 'Distribution Fictive Delta SA');
  assert.strictEqual(Math.round(r.encours * 100) / 100, 18851.4);
  assert.strictEqual(r.nbFactures, INV.filter(function (i) { return i.client === 'Distribution Fictive Delta SA'; }).length);
  assert.strictEqual(Math.round(r.topPart * 100), 100);
});

test('filtre période : bornes incluses, KPI et mois recalculés', function () {
  var r = L.computeReporting(INV, REF, { du: '2026-01-01', au: '2026-06-30' });
  var attendu = INV.filter(function (i) { return i.dateEmission >= '2026-01-01' && i.dateEmission <= '2026-06-30'; });
  assert.strictEqual(r.nbFactures, attendu.length);
  near(r.caHT, attendu.reduce(function (t, i) { return t + i.ht; }, 0), 0.01);
  assert.strictEqual(r.parMois.length, 6);
  assert.strictEqual(r.parMois[0].mois, '2026-01');
  var jour = L.computeReporting([inv('A', '2026-03-01', 10), inv('A', '2026-03-31', 20), inv('A', '2026-04-01', 40)], REF, { du: '2026-03-01', au: '2026-03-31' });
  assert.strictEqual(jour.caHT, 30);
});

test('filtre client et période combinés', function () {
  var r = L.computeReporting(INV, REF, { client: 'Distribution Fictive Delta SA', du: '2026-01-01', au: '2026-06-30' });
  var attendu = INV.filter(function (i) { return i.client === 'Distribution Fictive Delta SA' && i.dateEmission >= '2026-01-01' && i.dateEmission <= '2026-06-30'; });
  assert.strictEqual(r.nbFactures, attendu.length);
});

test('comparaison : période précédente de même durée, écarts en valeur et en pourcentage', function () {
  var r = L.computeReporting(INV, REF, { du: '2026-01-01', au: '2026-06-30' });
  var c = r.comparaison;
  assert.strictEqual(c.periode.nbJours, 181);
  assert.strictEqual(c.precedente.du, '2025-07-04');
  assert.strictEqual(c.precedente.au, '2025-12-31');
  var prec = INV.filter(function (i) { return i.dateEmission >= '2025-07-04' && i.dateEmission <= '2025-12-31'; });
  var caPrec = prec.reduce(function (t, i) { return t + i.ht; }, 0);
  near(c.caHT.precedent, caPrec, 0.01);
  near(c.caHT.ecart, r.caHT - caPrec, 0.01);
  near(c.caHT.ecartPct, (r.caHT - caPrec) / caPrec, 1e-9);
  assert.strictEqual(c.nbFactures.precedent, prec.length);
  assert.strictEqual(c.nbFactures.ecart, r.nbFactures - prec.length);
  assert.strictEqual(c.videPrecedent, false);
});

test('comparaison : période précédente vide, écart en pourcentage non calculé', function () {
  var r = L.computeReporting(INV, REF, { du: '2025-10-01', au: '2025-12-31' });
  assert.strictEqual(r.comparaison.videPrecedent, true);
  assert.strictEqual(r.comparaison.caHT.precedent, 0);
  assert.strictEqual(r.comparaison.caHT.ecartPct, null);
  assert.ok(r.comparaison.caHT.ecart > 0);
});

test('comparaison : une seule borne choisie, l\'autre vient des données ; aucune période, aucune comparaison', function () {
  var r = L.computeReporting(INV, REF, { du: '2026-04-01' });
  assert.strictEqual(r.comparaison.periode.au, INV.map(function (i) { return i.dateEmission; }).sort().pop());
  assert.ok(r.comparaison.precedente.au === '2026-03-31');
  assert.strictEqual(L.computeReporting(INV, REF, { client: 'Distribution Fictive Delta SA' }).comparaison, null);
});

test('periodePrecedente et addDays : jours calendaires, mois et années traversés', function () {
  assert.deepStrictEqual(L.periodePrecedente('2026-03-01', '2026-03-31'), { du: '2026-01-29', au: '2026-02-28', nbJours: 31 });
  assert.strictEqual(L.periodePrecedente('2026-03-31', '2026-03-01'), null);
  assert.strictEqual(L.periodePrecedente(null, '2026-03-01'), null);
  assert.strictEqual(L.addDays('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(L.addDays('2028-03-01', -1), '2028-02-29');
});

test('comparaison : le délai moyen n\'est comparé que si les deux périodes en ont un', function () {
  var a = [inv('A', '2026-02-01', 10, { paid: true, datePaiement: '2026-02-11' })];
  var b = [inv('A', '2026-01-01', 10)];
  var r = L.computeReporting(a.concat(b), REF, { du: '2026-02-01', au: '2026-02-28' });
  assert.strictEqual(r.comparaison.delaiMoyenPaiement.actuel, 10);
  assert.strictEqual(r.comparaison.delaiMoyenPaiement.precedent, null);
  assert.strictEqual(r.comparaison.delaiMoyenPaiement.ecart, null);
});

test('listeClients : noms distincts triés', function () {
  var l = L.listeClients(INV);
  assert.strictEqual(l.length, 10);
  assert.deepStrictEqual(l.slice().sort(), l);
  assert.deepStrictEqual(L.listeClients([]), []);
});

test('reportingToCsv : filtres, indicateurs, mois, clients, ancienneté et comparaison', function () {
  var r = L.computeReporting(INV, REF, { du: '2026-01-01', au: '2026-06-30' });
  var csv = L.reportingToCsv(r);
  var lignes = csv.split('\r\n');
  assert.strictEqual(lignes[0], 'section;libelle;valeur;complement');
  assert.ok(/Période;01\/01\/2026 au 30\/06\/2026/.test(csv));
  assert.ok(/Indicateur;Chiffre d'affaires HT;231461,79/.test(csv));
  assert.strictEqual(lignes.filter(function (l) { return /^CA mensuel;/.test(l); }).length, 6);
  assert.ok(/^Comparaison;Période précédente;04\/07\/2025 au 31\/12\/2025/m.test(csv));
  assert.ok(/Comparaison;Chiffre d'affaires HT;231461,79;"précédente : 114542,56/.test(csv));
  var plein = L.reportingToCsv(REP);
  assert.ok(/Période;Toutes les factures/.test(plein));
  assert.ok(!/^Comparaison;/m.test(plein));
  assert.strictEqual(plein.split('\r\n').filter(function (l) { return /^CA mensuel;/.test(l); }).length, 12);
});

test('reportingToCsv : un nom de client commençant par une formule est neutralisé', function () {
  var r = L.computeReporting([inv('=CMD()', '2026-05-05', 100)], REF);
  var csv = L.reportingToCsv(r);
  assert.ok(csv.indexOf('\'=CMD()') > 0);
  assert.ok(!/;=CMD/.test(csv) && !/^=CMD/m.test(csv));
});

test('CSV : neutralisation commune (= + @ tabulation, - non numérique) et option de guillemets partout', function () {
  assert.strictEqual(L.neutraliser('=1+1'), '\'=1+1');
  assert.strictEqual(L.neutraliser('-12,5'), '-12,5');
  assert.strictEqual(L.neutraliser('-abc'), '\'-abc');
  assert.strictEqual(L.csvCell('x', ';', true), '"x"');
  assert.strictEqual(L.csvCell('a;b', ';'), '"a;b"');
  assert.strictEqual(L.toCsv(['a'], [['1']], ';', true), '"a"\r\n"1"\r\n');
});
