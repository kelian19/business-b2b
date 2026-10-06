/* Tests de la mise à niveau (P3) : résumé de version complet, comparaison de deux résumés, export CSV. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var L = require('../js/core/logic.js');
var D = require('../js/data.js');

var REF = '2026-10-06';
var T0 = '2026-10-06T08:00:00.000Z';
var ROWS = L.rowsToThirdParties(D.tiers);
var TRANCHE = L.trancheVersLignes(D.tiersParClient, ROWS);

function demo() { return L.dossierDemo(D, { maintenant: T0 }); }
function resume(d) { return L.resumeDossier(d, REF, { tranche: TRANCHE }); }

/** Applique les corrections « calculées » (clés de TVA, normalisations) du fichier tiers du dossier : retourne le nombre appliqué. */
function accepterCalculees(d, max) {
  var ev = L.evaluerTable(d.donnees.tiers, 'tiers');
  var a = L.analyzeThirdParties(ev.records, { columns: ev.colonnes });
  var liste = L.proposerToutes(a).liste;
  var n = 0;
  liste.forEach(function (p) {
    if (n >= max || !p.comptee || !p.appliquable || p.certitude !== 'calculee') return;
    var row = ev.records.filter(function (r) { return r.ligne === p.ligne; })[0];
    var r = L.enregistrerDecision(d, { proposition: p, decision: 'acceptee', row: row }, T0);
    if (r.ok) n++;
  });
  return n;
}

test('résumé : indice 46, composantes 50 / 60 / 25, partiel faux, mentions 6 sur 10', function () {
  var r = resume(demo());
  assert.strictEqual(r.indice, 46);
  assert.strictEqual(r.partiel, false);
  assert.deepStrictEqual(r.composantes.map(function (c) { return c.id + ':' + c.valeur; }), ['fichier:50', 'modeles:60', 'organisation:25']);
  assert.deepStrictEqual(r.mentions, { ok: 6, total: 10 });
  assert.strictEqual(r.nbTiers, 40);
  assert.strictEqual(r.refDate, REF);
});

test('résumé : part du CA à risque, actions du plan avec leurs titres', function () {
  var r = resume(demo());
  assert.strictEqual(Math.round(r.partCaARisque.bloquant.part * 1000) / 10, 11.2);
  assert.strictEqual(Object.keys(r.actions).length, 10);
  assert.strictEqual(r.actions.siren, 'a_faire');
  assert.strictEqual(r.titresActions.siren, 'Corriger 6 SIREN (4 manquants, 2 invalides)');
});

test('résumé : le statut des actions du dossier est repris, l\'indice n\'en dépend pas', function () {
  var d = demo();
  d.plan.siren = { responsable: '', statut: 'fait', echeance: null };
  var r = resume(d);
  assert.strictEqual(r.actions.siren, 'fait');
  assert.strictEqual(r.indice, 46);
});

test('résumé : un dossier client sans fichier donne un indice partiel sans erreur', function () {
  var d = L.creerDossier({ nom: 'Client', secteur: '', taille: 'autre' }, { maintenant: T0, id: 'c1' });
  var r = L.resumeDossier(d, REF);
  assert.strictEqual(r.partiel, true);
  assert.strictEqual(r.indice, 0);
  assert.strictEqual(r.partCaARisque, null);
  assert.strictEqual(r.mentions, null);
  assert.deepStrictEqual(r.anomalies, []);
});

test('résumé : valide par le validateur de dossier, aller-retour .json stable', function () {
  var d = demo();
  L.ajouterVersion(d, { libelle: 'Avant', note: '', maintenant: T0, resume: resume(d) });
  var texte = L.serialiserDossier(d);
  var v = L.validateDossier(JSON.parse(texte));
  assert.strictEqual(v.ok, true, v.erreurs.join('|'));
  assert.strictEqual(v.integriteOk, true);
  assert.strictEqual(v.dossier.versions[0].resume.indice, 46);
  assert.strictEqual(L.serialiserDossier(v.dossier), texte);
});

test('comparerResumes : deux résumés identiques ne donnent aucun écart', function () {
  var r = resume(demo());
  var c = L.comparerResumes(r, r);
  assert.strictEqual(c.indice.delta, 0);
  assert.strictEqual(c.anomaliesResolues.length, 0);
  assert.strictEqual(c.anomaliesNouvelles.length, 0);
  assert.strictEqual(c.actionsFaites.length, 0);
  assert.strictEqual(c.indice.comparable, true);
});

test('comparerResumes : delta d\'indice égal à la différence calculée, par composante', function () {
  var avant = demo();
  var apres = demo();
  apres.organisation.plateforme = 'oui';
  apres.organisation.responsable = 'oui';
  var a = resume(avant);
  var b = resume(apres);
  var c = L.comparerResumes(a, b);
  assert.strictEqual(c.indice.avant, 46);
  assert.strictEqual(c.indice.apres, 61);
  assert.strictEqual(c.indice.delta, 61 - 46);
  var org = c.composantes.filter(function (x) { return x.id === 'organisation'; })[0];
  assert.deepStrictEqual([org.avant, org.apres, org.delta], [25, 75, 50]);
  assert.strictEqual(c.composantes.filter(function (x) { return x.id === 'fichier'; })[0].delta, 0);
});

test('comparerResumes : corrections acceptées, anomalies résolues exactement listées, aucune nouvelle', function () {
  var avant = demo();
  var apres = demo();
  var n = accepterCalculees(apres, 3);
  assert.strictEqual(n, 3);
  var a = resume(avant);
  var b = resume(apres);
  var c = L.comparerResumes(a, b);
  var attendu = a.anomalies.filter(function (x) { return b.anomalies.indexOf(x) < 0; }).filter(function (x, i, t) { return t.indexOf(x) === i; });
  assert.deepStrictEqual(c.anomaliesResolues, attendu);
  assert.ok(c.anomaliesResolues.length >= 1);
  assert.strictEqual(c.anomaliesNouvelles.length, 0);
  assert.ok(b.composantes[0].valeur > a.composantes[0].valeur);
  assert.strictEqual(c.indice.delta, b.indice - a.indice);
  assert.ok(c.parCode.length >= 1);
});

test('comparerResumes : actions passées à « fait », rouvertes, sans objet et nouvelles', function () {
  var avant = demo();
  var apres = demo();
  apres.plan.siren = { responsable: 'Comptabilité', statut: 'fait', echeance: null };
  apres.plan.tva = { responsable: '', statut: 'en_cours', echeance: null };
  apres.organisation.plateforme = 'oui';
  avant.plan.test = { responsable: '', statut: 'fait', echeance: null };
  var c = L.comparerResumes(resume(avant), resume(apres));
  assert.deepStrictEqual(c.actionsFaites.map(function (x) { return x.id; }), ['siren']);
  assert.deepStrictEqual(c.actionsRouvertes.map(function (x) { return x.id; }), ['test']);
  assert.deepStrictEqual(c.actionsSansObjet.map(function (x) { return x.id; }), ['plateforme']);
  assert.strictEqual(c.actionsFaites[0].titre, 'Corriger 6 SIREN (4 manquants, 2 invalides)');
});

test('comparerResumes : nouvelles anomalies quand le fichier se dégrade', function () {
  var bon = resume(demo());
  var mauvais = JSON.parse(JSON.stringify(bon));
  mauvais.anomalies.push('siren:123456782|tva_incoherente');
  var c = L.comparerResumes(bon, mauvais);
  assert.deepStrictEqual(c.anomaliesNouvelles, ['siren:123456782|tva_incoherente']);
  assert.strictEqual(c.anomaliesResolues.length, 0);
  var inverse = L.comparerResumes(mauvais, bon);
  assert.deepStrictEqual(inverse.anomaliesResolues, ['siren:123456782|tva_incoherente']);
});

test('comparerResumes : indice partiel d\'un côté seulement, comparaison signalée comme prudente', function () {
  var complet = resume(demo());
  var partiel = L.resumeDossier(L.creerDossier({ nom: 'C', secteur: '', taille: 'autre' }, { maintenant: T0, id: 'c' }), REF);
  var c = L.comparerResumes(partiel, complet);
  assert.strictEqual(c.indice.comparable, false);
  assert.strictEqual(c.indice.partielAvant, true);
  assert.strictEqual(c.indice.partielApres, false);
  assert.strictEqual(c.composantes.filter(function (x) { return x.id === 'fichier'; })[0].avant, null);
  assert.strictEqual(c.composantes.filter(function (x) { return x.id === 'fichier'; })[0].delta, null);
});

test('comparerResumes : entrées vides ou absentes sans erreur', function () {
  var c = L.comparerResumes({}, null);
  assert.strictEqual(c.indice.delta, null);
  assert.deepStrictEqual(c.anomaliesResolues, []);
  assert.deepStrictEqual(c.composantes, []);
});

test('comparerResumes : deux fichiers .json ouverts séparément se comparent par leurs résumés', function () {
  var avant = demo();
  var apres = demo();
  accepterCalculees(apres, 2);
  var f1 = L.validateDossier(JSON.parse(L.serialiserDossier(avant)));
  var f2 = L.validateDossier(JSON.parse(L.serialiserDossier(apres)));
  assert.ok(f1.ok && f2.ok);
  var c = L.comparerResumes(L.resumeDossier(f1.dossier, REF, { tranche: TRANCHE }), L.resumeDossier(f2.dossier, REF, { tranche: TRANCHE }));
  assert.ok(c.anomaliesResolues.length >= 1);
  assert.ok(c.indice.delta >= 1);
});

test('decrireAnomalie : SIREN, nom et code postal, libellé du code', function () {
  var a = L.decrireAnomalie('siren:123456782|tva_incoherente');
  assert.strictEqual(a.identifiant, 'SIREN 123 456 782');
  assert.strictEqual(a.libelle, 'TVA incohérente');
  var b = L.decrireAnomalie('nom:MECANIQUE FICTIVE GOLF|38000|siren_manquant');
  assert.strictEqual(b.identifiant, 'MECANIQUE FICTIVE GOLF (code postal 38000)');
  assert.strictEqual(b.code, 'siren_manquant');
  assert.strictEqual(L.decrireAnomalie('nom:X||doublon').identifiant, 'X (sans code postal)');
  assert.strictEqual(L.decrireAnomalie('siren:123456782|etat_cesse').libelle, 'Entreprise cessée au registre');
});

test('comparaisonToCsv : indice, composantes, anomalies résolues et actions faites', function () {
  var avant = demo();
  var apres = demo();
  accepterCalculees(apres, 3);
  apres.plan.siren = { responsable: '', statut: 'fait', echeance: null };
  var c = L.comparerResumes(resume(avant), resume(apres));
  var csv = L.comparaisonToCsv(c);
  var l = csv.split('\r\n');
  assert.strictEqual(l[0], 'element;libelle;avant;apres;ecart');
  assert.ok(/^indice;Indice de préparation \(estimation\);46;/.test(l[1]));
  assert.strictEqual(l.filter(function (x) { return /^composante;/.test(x); }).length, 3);
  assert.strictEqual(l.filter(function (x) { return /^anomalie résolue;/.test(x); }).length, c.anomaliesResolues.length);
  assert.ok(/^action passée à fait;Corriger 6 SIREN/m.test(csv));
});

test('mise à niveau : aucun texte de résultat promis dans la logique de comparaison', function () {
  var src = H.lire('js/core/versions.js');
  assert.ok(!/garanti|promet|assur[ée]/i.test(src.replace(/ne promet[^.]*\./g, '')), 'promesse dans versions.js');
  var vue = H.lire('js/views/view-upgrade.js');
  assert.ok(/estimations/.test(vue));
  assert.ok(/ne promet aucun résultat/.test(vue));
});

test('ajouterVersion : le résumé créé automatiquement contient l\'indice et les actions', function () {
  var d = demo();
  var v = L.ajouterVersion(d, { libelle: 'Avant correction', note: 'n', maintenant: T0, resume: resume(d) });
  assert.strictEqual(v.version.resume.indice, 46);
  assert.strictEqual(Object.keys(v.version.resume.actions).length, 10);
});
