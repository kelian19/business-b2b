/* Tests du rapport de livraison (module H) : textes, pied de page selon le mode, version du dossier, annexe A plafonnée. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var L = require('../js/core/logic.js');
var D = require('../js/data.js');

var REF = '2026-10-06';
var T0 = '2026-10-06T08:00:00.000Z';

function contexteDemo() {
  var d = L.dossierDemo(D, { maintenant: T0 });
  var ev = L.evaluerTable(d.donnees.tiers, 'tiers');
  var a = L.analyzeThirdParties(ev.records, { columns: ev.colonnes });
  var tranche = L.trancheVersLignes(D.tiersParClient, ev.records);
  var fe = L.evaluerTable(d.donnees.factures, 'factures');
  return { d: d, a: a, p: L.proposerToutes(a), ca: L.caParTiers(fe.records, ev.records, REF, tranche) };
}

test('rapport : titre et textes imposés', function () {
  assert.strictEqual(L.TEXTES_RAPPORT.titre, 'Rapport de préparation à la facture électronique');
  assert.strictEqual(L.TEXTES_RAPPORT.demo, 'Données fictives de démonstration');
  assert.ok(/ne constitue pas un conseil fiscal ni juridique/.test(L.TEXTES_RAPPORT.estimations));
  assert.ok(/estimations/.test(L.TEXTES_RAPPORT.estimations));
});

test('rapport : pied de page de la démonstration', function () {
  var p = L.piedDePage('demo', L.dossierDemo(D, { maintenant: T0 }));
  assert.strictEqual(p.texte, 'Données fictives de démonstration · Équerre · ne constitue pas un conseil fiscal');
  assert.strictEqual(p.version, 'Version courante');
});

test('rapport : pied de page du dossier client, avec la version', function () {
  var d = L.creerDossier({ nom: 'Client' }, { maintenant: T0, id: 'c' });
  d.versions.push({ id: 'v1', numero: 1, libelle: 'Avant correction', creeLe: T0, note: '', resume: {} });
  d.versions.push({ id: 'v2', numero: 2, libelle: 'Après correction', creeLe: T0, note: '', resume: {} });
  var p = L.piedDePage('client', d);
  assert.strictEqual(p.texte, 'Dossier client : données confidentielles · Équerre · ne constitue pas un conseil fiscal');
  assert.strictEqual(p.version, 'Version 2');
  assert.ok(/Version 2$/.test(p.complet));
  assert.ok(!/fictives/.test(p.texte));
});

test('rapport : version du dossier (dernière version nommée, sinon version courante)', function () {
  var d = L.creerDossier({ nom: 'Client' }, { maintenant: T0, id: 'c' });
  assert.strictEqual(L.versionDossier(d).numero, null);
  assert.strictEqual(L.versionDossier(d).court, 'Version courante');
  d.versions.push({ id: 'v1', numero: 3, libelle: 'Livraison', creeLe: T0, note: '', resume: {} });
  assert.strictEqual(L.versionDossier(d).long, 'Version 3 : Livraison');
});

test('rapport : nom d\'entreprise, repli « Votre entreprise »', function () {
  assert.strictEqual(L.nomAffiche('  '), 'Votre entreprise');
  assert.strictEqual(L.nomAffiche(''), 'Votre entreprise');
  assert.strictEqual(L.nomAffiche(null), 'Votre entreprise');
  assert.strictEqual(L.nomAffiche('<b>test</b>'), '<b>test</b>');
});

test('rapport : annexe A, 21 anomalies sur la démonstration, classées par impact (Hotel, Golf, Juliett, India en tête)', function () {
  var c = contexteDemo();
  var r = L.anomaliesImpactantes(c.a, c.p, c.ca, c.d.corrections, 200);
  assert.strictEqual(r.total, 21);
  assert.strictEqual(r.tronque, false);
  assert.deepStrictEqual(r.lignes.slice(0, 4).map(function (x) { return x.nom; }),
    ['Plasturgie Démo Hotel SAS', 'Mécanique Fictive Golf SARL', 'Matériaux Fictifs Juliett SARL', 'Emballages Exemple India SAS']);
  assert.strictEqual(Math.round(r.lignes[0].ca), 27111);
  assert.strictEqual(r.lignes[0].gravite, 'bloquant');
});

test('rapport : annexe A plafonnée, renvoi au CSV fiabilisé (tronque = vrai)', function () {
  var c = contexteDemo();
  var r = L.anomaliesImpactantes(c.a, c.p, c.ca, c.d.corrections, 5);
  assert.strictEqual(r.lignes.length, 5);
  assert.strictEqual(r.total, 21);
  assert.strictEqual(r.tronque, true);
  assert.strictEqual(r.max, 5);
  assert.strictEqual(L.CONST.MAX_ANNEXE_ANOMALIES, 200);
});

test('rapport : la correction de la TVA est calculée ; un SIREN invalide n\'a jamais de valeur proposée', function () {
  var c = contexteDemo();
  var r = L.anomaliesImpactantes(c.a, c.p, c.ca, c.d.corrections, 200);
  var india = r.lignes.filter(function (x) { return /India/.test(x.nom); })[0];
  assert.strictEqual(india.certitude, 'calculee');
  assert.ok(/^FR\d{11}$/.test(india.correction));
  var hotel = r.lignes.filter(function (x) { return /Hotel/.test(x.nom); })[0];
  assert.ok(/à vérifier au registre/.test(hotel.correction));
  assert.ok(!/\d{9}/.test(hotel.correction));
});

test('rapport : la décision de l\'utilisateur est reprise dans l\'annexe A', function () {
  var c = contexteDemo();
  var india = c.a.items.filter(function (it) { return /India/.test(it.row.nom); })[0];
  var prop = c.p.parLigne.get(india.ligne).filter(function (p) { return p.code === 'tva_incoherente'; })[0];
  var corr = {};
  corr[prop.cle] = { ligne: india.ligne, champ: prop.champ, decision: 'acceptee', apres: prop.valeurProposee };
  var r = L.anomaliesImpactantes(c.a, c.p, c.ca, corr, 200);
  assert.strictEqual(r.lignes.filter(function (x) { return /India/.test(x.nom); })[0].decision, 'Acceptée');
});

test('rapport : sans analyse, annexe A vide sans erreur', function () {
  var r = L.anomaliesImpactantes(null, null, null, null, 200);
  assert.deepStrictEqual(r, { lignes: [], total: 0, tronque: false, max: 200 });
});
