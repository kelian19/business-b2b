/* Tests des données fictives (D1) et des constantes métier (D2, valeurs seulement). */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var L = require('../js/core/logic.js');
var D = require('../js/data.js');

var NOMS_CLIENTS_EXPORT = (function () {
  var vus = {};
  D.exportFacturation.forEach(function (f) { vus[f.client] = true; });
  return Object.keys(vus);
})();

test('D1 : chaque client de l\'export est rapproché d\'exactement une fiche (homonyme Alpha tranché)', function () {
  assert.strictEqual(NOMS_CLIENTS_EXPORT.length, 10);
  NOMS_CLIENTS_EXPORT.forEach(function (nom) {
    var idx = D.tiersParClient[nom];
    assert.ok(typeof idx === 'number' && idx >= 0, nom);
    assert.strictEqual(D.tiers[idx].type, 'client');
    assert.strictEqual(D.tiers[idx].nom, nom);
    var memeNom = D.tiers.filter(function (t) { return t.type === 'client' && L.normalizeName(t.nom) === L.normalizeName(nom); });
    assert.ok(memeNom.length >= 1, nom);
  });
  assert.strictEqual(D.tiersParClient['Négoce Démo Alpha SAS'], 0, 'fiche de Lyon');
  assert.strictEqual(D.tiers[0].ville, 'Lyon');
  // rapprochement linéaire : 10 clients rapprochés, 0 homonyme non tranché grâce à tiersParClient
  var inv = L.normalizeInvoices(D.exportFacturation).invoices;
  var res = L.rapprocherFacturesTiers(inv, D.tiers, D.tiersParClient);
  assert.strictEqual(res.length, 10);
  res.forEach(function (r) { assert.strictEqual(r.statut, 'rapproche', r.client); });
  var sansIndex = L.rapprocherFacturesTiers(inv, D.tiers);
  assert.deepStrictEqual(sansIndex.filter(function (r) { return r.statut === 'homonyme'; }).map(function (r) { return r.client; }), ['Négoce Démo Alpha SAS']);
});

test('D1 : analyse du fichier tiers inchangée (score 50, 20 propres sur 40, 7 compteurs)', function () {
  var a = L.analyzeThirdParties(D.tiers.map(function (t, i) { var r = Object.assign({ ligne: i + 2 }, t); return r; }));
  assert.strictEqual(D.tiers.length, 40);
  assert.strictEqual(a.score, 50);
  assert.strictEqual(a.clean, 20);
  assert.deepStrictEqual(a.counts, { siren_manquant: 4, siren_invalide: 2, siret_incoherent: 2, tva_incoherente: 3, doublon: 6, adresse_incomplete: 4, livraison_differente: 4 });
  assert.deepStrictEqual([a.counts.siren_manquant, a.counts.siren_invalide, a.counts.siret_incoherent, a.counts.tva_incoherente, a.counts.doublon, a.counts.adresse_incomplete, a.counts.livraison_differente], [4, 2, 2, 3, 6, 4, 4]);
  assert.deepStrictEqual(a.doublons, { groupes: 3, lignes: 6, plafonnes: 0 });
});

test('D1 : les clients de l\'export à anomalie sont exactement Golf, Hotel, India, Juliett', function () {
  var a = L.analyzeThirdParties(L.rowsToThirdParties(D.tiers));
  var attendu = {
    'Mécanique Fictive Golf SARL': 'siren_manquant',
    'Plasturgie Démo Hotel SAS': 'siren_invalide',
    'Emballages Exemple India SAS': 'tva_incoherente',
    'Matériaux Fictifs Juliett SARL': 'adresse_incomplete'
  };
  var relevants = L.CONST.CODES_BLOQUANTS.concat(L.CONST.CODES_A_CORRIGER);
  var trouves = {};
  NOMS_CLIENTS_EXPORT.forEach(function (nom) {
    var codes = a.items[D.tiersParClient[nom]].anomalies.map(function (x) { return x.code; }).filter(function (c) { return relevants.indexOf(c) >= 0; });
    if (codes.length) trouves[nom] = codes;
  });
  assert.deepStrictEqual(Object.keys(trouves).sort(), Object.keys(attendu).sort());
  Object.keys(attendu).forEach(function (nom) { assert.deepStrictEqual(trouves[nom], [attendu[nom]], nom); });
});

test('D1 : entreprise fictive, organisation par défaut et rôles (jamais de noms de personnes ni d\'employeur)', function () {
  assert.strictEqual(D.entreprise, 'Société Exemple Fictive SAS');
  assert.deepStrictEqual(D.organisationDefaut, { plateforme: 'non', responsable: 'non', logiciel: 'oui', procedure: 'non' });
  Object.keys(D.organisationDefaut).forEach(function (k) { assert.ok(['oui', 'non', 'nsp'].indexOf(D.organisationDefaut[k]) >= 0); });
  assert.deepStrictEqual(D.rolesProposes, ['Direction financière', 'Comptabilité', 'Expert-comptable', 'Informatique', 'À désigner']);
  var interdit = /stage|employeur|actuar|cyber|k[eé]lian|mizen/i;
  assert.ok(!interdit.test(D.entreprise + ' ' + D.rolesProposes.join(' ')));
  assert.ok(/Fictive|Exemple|Démo/.test(D.entreprise));
});

test('D1 : le dossier de démonstration contient les mêmes données que EquerreData', function () {
  var d = L.dossierDemo(D, { maintenant: '2026-10-06T00:00:00.000Z' });
  assert.deepStrictEqual(d.organisation.plateforme, D.organisationDefaut.plateforme);
  assert.strictEqual(d.donnees.tiers.lignes[0][1], 'Négoce Démo Alpha SAS');
});

test('CONST : dates et montants réglementaires (les seuls faits retenus)', function () {
  var C = L.CONST;
  assert.strictEqual(C.DATE_RECEPTION, '2026-09-01');
  assert.strictEqual(C.DATE_EMISSION, '2027-09-01');
  assert.strictEqual(C.AMENDE_UNITAIRE, 50);
  assert.strictEqual(C.AMENDE_PLAFOND, 15000);
  assert.strictEqual(L.daysBetween('2026-10-06', C.DATE_EMISSION), 330);
  assert.strictEqual(L.daysBetween(C.DATE_RECEPTION, '2026-10-06'), 35);
  assert.strictEqual(C.AMENDE_PLAFOND / C.AMENDE_UNITAIRE, 300);
});

test('CONST : poids de l\'indice, codes, seuil, coefficients et efforts (hypothèses)', function () {
  var C = L.CONST;
  assert.deepStrictEqual(C.POIDS_INDICE, { fichier: 0.4, modeles: 0.3, organisation: 0.3 });
  near(C.POIDS_INDICE.fichier + C.POIDS_INDICE.modeles + C.POIDS_INDICE.organisation, 1, 1e-9);
  assert.deepStrictEqual(C.CODES_BLOQUANTS, ['siren_manquant', 'siren_invalide']);
  assert.deepStrictEqual(C.CODES_A_CORRIGER, ['siret_incoherent', 'tva_incoherente', 'doublon', 'adresse_incomplete']);
  assert.strictEqual(C.SEUIL_CONCENTRATION, 0.6);
  assert.deepStrictEqual(C.COEF_IMPACT, { bloquant: 1, aCorriger: 0.5 });
  ['siren', 'mentions', 'tva', 'doublon', 'adresse', 'siret', 'plateforme', 'responsable', 'logiciel', 'procedure', 'test'].forEach(function (k) {
    assert.ok(C.EFFORTS[k] > 0, k);
  });
  // chaque code d'anomalie classé existe dans les types d'anomalie
  var codes = L.ANOMALY_TYPES.map(function (t) { return t.code; });
  C.CODES_BLOQUANTS.concat(C.CODES_A_CORRIGER).forEach(function (c) { assert.ok(codes.indexOf(c) >= 0, c); });
  assert.ok(Object.isFrozen(C) && Object.isFrozen(C.POIDS_INDICE), 'constantes figées');
});

test('CONST : limites d\'import et de dossier', function () {
  var C = L.CONST;
  assert.strictEqual(C.MAX_FICHIER_OCTETS, 25 * 1024 * 1024);
  assert.strictEqual(C.MAX_DOSSIER_OCTETS, 60 * 1024 * 1024);
  assert.strictEqual(C.MAX_VERSIONS, 20);
  assert.strictEqual(C.MAX_JOURNAL, 5000);
  assert.strictEqual(C.MAX_NOM, 80);
  assert.strictEqual(C.MAX_GROUPE_DOUBLONS, 50);
  assert.strictEqual(C.MAX_IGNOREES_RAPPORT, 200);
  assert.strictEqual(C.LIGNES_PAR_PAGE, 100);
  assert.strictEqual(C.APERCU_LIGNES, 5);
  assert.strictEqual(C.TRANCHE_CARACTERES, 256 * 1024);
  assert.strictEqual(C.BUDGET_TRANCHE_MS, 12);
  assert.strictEqual(C.LOGO_MAX_PX, 256);
});

function near(a, b, eps) { H.near(a, b, eps); }

test('doublons : groupes de plus de 50 lignes plafonnés avec mention, composantes connexes comptées', function () {
  var rows = [];
  for (var i = 0; i < 120; i++) rows.push({ type: 'client', nom: 'Groupe ' + i, siren: '123456782', code_postal: '69000' });
  rows.push({ type: 'client', nom: 'Seul', siren: '732829320', code_postal: '33000' });
  var idx = L.buildDuplicateIndex(rows);
  assert.strictEqual(idx.plafonnes, 1);
  assert.strictEqual(idx.groupes.length, 1);
  assert.strictEqual(idx.groupes[0].length, 120);
  idx.result.slice(0, 120).forEach(function (r) { assert.strictEqual(r.length, 50); });
  assert.strictEqual(idx.result[120].length, 0);
  assert.ok(idx.result.every(function (r, i) { return r.every(function (d) { return d.index !== i; }); }), 'jamais soi-même');
});
