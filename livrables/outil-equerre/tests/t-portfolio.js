/* Tests du mode cabinet (module J) : lignes du portefeuille, tri, filtre, plafonds, export CSV, cohérence avec les résumés. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var fs = require('fs');
var path = require('path');
var L = require('../js/core/logic.js');
var D = require('../js/data.js');
var MF = require('./make-fixtures.js');

var REF = '2026-10-06';
var T0 = '2026-10-06T08:00:00.000Z';
MF.genererDossiersCabinet();

function charger(nom) {
  var texte = fs.readFileSync(path.join(MF.DIR, 'cabinet-' + nom + '.equerre.json'), 'utf8');
  var v = L.validateDossier(JSON.parse(texte));
  assert.ok(v.ok, v.erreurs.join(' '));
  return { dossier: v.dossier, octets: Buffer.byteLength(texte) };
}

function ligneDe(nom) {
  var c = charger(nom);
  var tranche = c.dossier.mode === 'demo' ? L.trancheVersLignes(D.tiersParClient, L.rowsToThirdParties(D.tiers)) : undefined;
  var l = L.ligneCabinet(c.dossier, c.dossier.refDate || REF, { tranche: tranche });
  l.octets = c.octets;
  return l;
}

test('cabinet : ligne du dossier de démonstration (indice 46, 11,2 % du CA à risque, 10 actions ouvertes, 6 anomalies bloquantes)', function () {
  var l = ligneDe('demo');
  assert.strictEqual(l.indice, 46);
  assert.strictEqual(l.partiel, false);
  assert.strictEqual(Math.round(l.partCa * 1000) / 10, 11.2);
  assert.strictEqual(Math.round(l.caARisque), 50676);
  assert.strictEqual(l.actionsOuvertes, 10);
  assert.strictEqual(l.anomaliesBloquantes, 6);
  assert.strictEqual(l.mode, 'demo');
  assert.strictEqual(l.date, REF);
});

test('cabinet : un client sans SIREN sur trois a 27,8 % du CA à risque', function () {
  var l = ligneDe('client-a');
  assert.strictEqual(Math.round(l.partCa * 1000) / 10, 27.8);
  assert.strictEqual(l.anomaliesBloquantes, 1);
  assert.strictEqual(l.partiel, true);
  assert.strictEqual(l.mode, 'client');
});

test('cabinet : les actions « fait » ne sont pas ouvertes et ne changent jamais l\'indice', function () {
  var c = charger('client-a');
  var avant = L.ligneCabinet(c.dossier, REF);
  var ids = Object.keys(avant.resume.actions);
  c.dossier.plan[ids[0]] = { responsable: '', statut: 'fait', echeance: null };
  var apres = L.ligneCabinet(c.dossier, REF);
  assert.strictEqual(apres.actionsOuvertes, avant.actionsOuvertes - 1);
  assert.strictEqual(apres.indice, avant.indice);
});

test('cabinet : un dossier sans fichier donne un indice partiel et une part du CA non calculable (null)', function () {
  var d = L.creerDossier({ nom: 'Vide fictif' }, { maintenant: T0, id: 'vide' });
  var l = L.ligneCabinet(d, REF);
  assert.strictEqual(l.partCa, null);
  assert.strictEqual(l.partiel, true);
  assert.strictEqual(l.anomaliesBloquantes, 0);
});

test('cabinet : la ligne est égale au résumé calculé par le noyau (indice, actions)', function () {
  var c = charger('client-b');
  var l = L.ligneCabinet(c.dossier, REF);
  var r = L.resumeDossier(c.dossier, REF);
  assert.strictEqual(l.indice, r.indice);
  assert.deepStrictEqual(l.resume.actions, r.actions);
  assert.strictEqual(l.actionsOuvertes, L.actionsOuvertes(r.actions));
});

test('cabinet : date de situation = date de référence du dossier, sinon la date fournie', function () {
  assert.strictEqual(L.refPour({ refDate: '2026-01-02' }, REF), '2026-01-02');
  assert.strictEqual(L.refPour({ refDate: null }, REF), REF);
});

test('cabinet : tri par indice croissant et décroissant, valeurs absentes en fin de liste', function () {
  var lignes = [ligneDe('demo'), ligneDe('client-a'), ligneDe('client-b')];
  var asc = L.trierPortefeuille(lignes, 'indice', 'asc').map(function (l) { return l.indice; });
  assert.deepStrictEqual(asc, [46, 60, 79]);
  var desc = L.trierPortefeuille(lignes, 'indice', 'desc').map(function (l) { return l.indice; });
  assert.deepStrictEqual(desc, [79, 60, 46]);
  var vide = L.ligneCabinet(L.creerDossier({ nom: 'Vide' }, { maintenant: T0, id: 'v' }), REF);
  var part = L.trierPortefeuille(lignes.concat([vide]), 'partCa', 'asc');
  assert.strictEqual(part[part.length - 1].nom, 'Vide');
  assert.strictEqual(lignes[0].indice, 46);
});

test('cabinet : tri par nom sans tenir compte des accents ni de la casse', function () {
  var l = [{ nom: 'zèbre', secteur: '' }, { nom: 'Abeille', secteur: '' }, { nom: 'école', secteur: '' }];
  assert.deepStrictEqual(L.trierPortefeuille(l, 'nom', 'asc').map(function (x) { return x.nom; }), ['Abeille', 'école', 'zèbre']);
});

test('cabinet : filtre sur le nom ou le secteur, sans accents', function () {
  var lignes = [ligneDe('demo'), ligneDe('client-a'), ligneDe('client-b')];
  assert.strictEqual(L.filtrerPortefeuille(lignes, 'societe exemple').length, 1);
  assert.strictEqual(L.filtrerPortefeuille(lignes, 'services aux entreprises').length, 2);
  assert.strictEqual(L.filtrerPortefeuille(lignes, '').length, 3);
  assert.strictEqual(L.filtrerPortefeuille(lignes, 'zzz').length, 0);
});

test('cabinet : plafond de 30 dossiers, le 31e est refusé avec un message', function () {
  var pf = [];
  for (var i = 0; i < 30; i++) {
    var r = L.ajouterAuPortefeuille(pf, { dossierId: 'd' + i, nom: 'D' + i }, 1000);
    assert.ok(r.ok);
  }
  var r31 = L.ajouterAuPortefeuille(pf, { dossierId: 'd30', nom: 'D30' }, 1000);
  assert.strictEqual(r31.ok, false);
  assert.ok(/30 dossiers/.test(r31.message));
  assert.strictEqual(pf.length, 30);
});

test('cabinet : plafond de 150 Mo cumulés', function () {
  var pf = [];
  assert.ok(L.ajouterAuPortefeuille(pf, { dossierId: 'a', nom: 'A' }, 100 * 1048576).ok);
  var r = L.ajouterAuPortefeuille(pf, { dossierId: 'b', nom: 'B' }, 60 * 1048576);
  assert.strictEqual(r.ok, false);
  assert.ok(/150 Mo/.test(r.message));
  assert.ok(L.ajouterAuPortefeuille(pf, { dossierId: 'b', nom: 'B' }, 50 * 1048576).ok);
  assert.strictEqual(L.octetsTotal(pf), 150 * 1048576);
});

test('cabinet : un dossier déjà présent est remplacé, pas dupliqué ; retrait d\'un dossier', function () {
  var pf = [];
  L.ajouterAuPortefeuille(pf, { dossierId: 'a', nom: 'A1' }, 10);
  var r = L.ajouterAuPortefeuille(pf, { dossierId: 'a', nom: 'A2' }, 20);
  assert.ok(r.ok && r.remplace);
  assert.strictEqual(pf.length, 1);
  assert.strictEqual(pf[0].nom, 'A2');
  assert.strictEqual(L.retirerDuPortefeuille(pf, 'a'), true);
  assert.strictEqual(L.retirerDuPortefeuille(pf, 'a'), false);
  assert.strictEqual(pf.length, 0);
});

test('cabinet : export CSV avec en-têtes, virgule décimale et neutralisation de « =1+1 » dans un nom de dossier', function () {
  var lignes = [ligneDe('demo'), ligneDe('client-b')];
  var csv = L.portefeuilleToCsv(lignes);
  var rows = csv.split('\r\n');
  assert.strictEqual(rows[0].split(';')[0], 'dossier');
  assert.ok(/indice_estimation/.test(rows[0]));
  assert.ok(csv.indexOf('\'=1+1 Client Fictif B SARL') >= 0);
  assert.ok(!/(^|;)=1\+1/.test(csv));
  assert.ok(/;11,2;/.test(csv));
  assert.strictEqual(rows.filter(Boolean).length, 3);
});

test('cabinet : constantes du mode cabinet et message de confidentialité', function () {
  assert.strictEqual(L.CONST.MAX_DOSSIERS_CABINET, 30);
  assert.strictEqual(L.CONST.MAX_OCTETS_CABINET, 150 * 1048576);
  assert.ok(/Effacer toutes les données de cette session/.test(L.MESSAGE_CONFIDENTIALITE));
});

test('cabinet : le portefeuille n\'est jamais écrit dans le fichier d\'un dossier', function () {
  var c = charger('demo');
  var texte = L.serialiserDossier(c.dossier);
  assert.ok(!/portefeuille/i.test(texte));
});
