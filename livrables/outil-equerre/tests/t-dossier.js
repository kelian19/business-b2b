/* Tests du dossier : création, validation, migration, aller-retour JSON, somme d'intégrité, plafonds, versions. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var L = require('../js/core/logic.js');
var D = require('../js/data.js');

var T0 = '2026-10-06T09:00:00.000Z';

function dossierAvecImport() {
  var d = L.creerDossier({ nom: 'Société Test SAS', secteur: 'Industrie', taille: '50-99' }, { maintenant: T0, id: 'dtest' });
  var texte = 'nom;siren;cp\r\nAtelier A;123456782;69003\r\n"B; ""fictif""\r\nsuite";732829320;33000\r\nC;;\r\n';
  var p = L.parseCsv(texte);
  var table = L.tableDepuisParse(p, L.suggestMapping(p.headers, 'tiers').mapping, { nomFichier: 'x.csv', encodage: 'UTF-8', maintenant: T0 });
  var ev = L.evaluerTable(table, 'tiers');
  L.finaliserTable(table, ev, 'tiers');
  d.donnees.tiers = table;
  return d;
}

test('création : dossier client, nom borné à 80 caractères, taille inconnue ramenée à « autre »', function () {
  var d = L.creerDossier({ nom: '  ' + new Array(120).join('x') + '  ', secteur: 'Commerce', taille: '999' }, { maintenant: T0 });
  assert.strictEqual(d.format, 'equerre-dossier');
  assert.strictEqual(d.schemaVersion, 1);
  assert.strictEqual(d.mode, 'client');
  assert.strictEqual(d.entreprise.nom.length, 80);
  assert.strictEqual(d.entreprise.taille, 'autre');
  assert.strictEqual(d.entreprise.logo, null);
  assert.deepStrictEqual(d.donnees, { tiers: null, factures: null, lignes: null, registre: null });
  assert.strictEqual(d.creeLe, T0);
  assert.ok(/^[A-Za-z0-9_-]{1,64}$/.test(d.id));
  assert.deepStrictEqual(d.organisation.cibles, { plateforme: null, responsable: null, logiciel: null, procedure: null, test: null });
});

test('validation : un dossier créé est accepté, sans erreur', function () {
  var r = L.validateDossier(JSON.parse(L.serialiserDossier(L.creerDossier({ nom: 'A' }, { maintenant: T0 }))));
  assert.strictEqual(r.ok, true, r.erreurs.join(' | '));
  assert.strictEqual(r.erreurs.length, 0);
  assert.strictEqual(r.integriteOk, true);
});

test('validation : rejet de « __proto__ » et de « constructor » (à la racine et imbriqués)', function () {
  var base = L.serialiserDossier(L.creerDossier({ nom: 'A' }, { maintenant: T0 }));
  var a = JSON.parse(base.replace(/^\{/, '{"__proto__":{"admin":true},'));
  assert.strictEqual(Object.keys(a).indexOf('__proto__') >= 0, true);
  var r1 = L.validateDossier(a);
  assert.strictEqual(r1.ok, false);
  assert.ok(/clé refusée/.test(r1.erreurs[0]));
  var b = JSON.parse(base);
  b.plan = { constructor: { statut: 'fait' } };
  assert.strictEqual(L.validateDossier(b).ok, false);
  var c = JSON.parse(base);
  c.entreprise.nom = '__proto__';   // une valeur n'est pas une clé : acceptée comme texte
  assert.strictEqual(L.validateDossier(c).ok, true);
  assert.strictEqual(({}).admin, undefined);
});

test('validation : schemaVersion supérieur refusé avec un message, format inconnu, JSON non objet', function () {
  var d = JSON.parse(L.serialiserDossier(L.creerDossier({ nom: 'A' }, { maintenant: T0 })));
  d.schemaVersion = 2;
  var r = L.validateDossier(d);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.schemaTropRecent, true);
  assert.ok(/version plus récente/.test(r.erreurs[0]));
  d.schemaVersion = 1; d.format = 'autre';
  assert.strictEqual(L.validateDossier(d).ok, false);
  [null, 3, 'x', [], undefined].forEach(function (v) { assert.strictEqual(L.validateDossier(v).ok, false); });
});

test('validation : types stricts et longueurs maximales', function () {
  var base = JSON.parse(L.serialiserDossier(L.creerDossier({ nom: 'A' }, { maintenant: T0 })));
  var a = JSON.parse(JSON.stringify(base)); a.entreprise.nom = 42;
  assert.strictEqual(L.validateDossier(a).ok, false);
  var b = JSON.parse(JSON.stringify(base)); b.entreprise.nom = new Array(100).join('x');
  assert.strictEqual(L.validateDossier(b).ok, false);
  var c = JSON.parse(JSON.stringify(base)); c.mode = 'pirate';
  assert.strictEqual(L.validateDossier(c).ok, false);
  var e = JSON.parse(JSON.stringify(base)); e.hypotheses.nbFactures12m = 2.5;
  assert.strictEqual(L.validateDossier(e).ok, false);
  var f = JSON.parse(JSON.stringify(base)); f.hypotheses.nbFactures12m = 100001;
  assert.strictEqual(L.validateDossier(f).ok, false);
  var g = JSON.parse(JSON.stringify(base)); g.plan = { t1: { responsable: new Array(70).join('r'), statut: 'fait', echeance: null } };
  assert.strictEqual(L.validateDossier(g).ok, false);
  var h = JSON.parse(JSON.stringify(base)); h.modeles = [1, 2, 3, 4, 5, 6].map(function (i) { return { id: 'm' + i, nom: 'M', controles: {} }; });
  assert.strictEqual(L.validateDossier(h).ok, false);
});

test('validation : champs inconnus ignorés, le dossier validé n\'en contient pas', function () {
  var d = JSON.parse(L.serialiserDossier(L.creerDossier({ nom: 'A' }, { maintenant: T0 })));
  d.surprise = { a: 1 };
  d.entreprise.autre = 'x';
  var r = L.validateDossier(d);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.dossier.surprise, undefined);
  assert.strictEqual(r.dossier.entreprise.autre, undefined);
});

test('migration : un dossier de schéma 0 est migré vers le schéma 1 avec les domaines par défaut', function () {
  var d = JSON.parse(L.serialiserDossier(L.creerDossier({ nom: 'A' }, { maintenant: T0 })));
  d.schemaVersion = 0;
  delete d.journal; delete d.versions; delete d.hypotheses; delete d.plan; delete d.corrections; delete d.organisation; delete d.modeles;
  var m = L.migrate(d);
  assert.strictEqual(m.schemaVersion, 1);
  assert.deepStrictEqual(m.journal, []);
  var r = L.validateDossier(d);
  assert.strictEqual(r.ok, true, r.erreurs.join('|'));
  assert.strictEqual(r.dossier.schemaVersion, 1);
  assert.strictEqual(r.dossier.organisation.plateforme, 'nsp');
  assert.strictEqual(d.schemaVersion, 0, 'l\'objet reçu n\'est pas modifié');
});

test('aller-retour JSON : sérialiser, valider, resérialiser donne exactement le même texte', function () {
  var d = dossierAvecImport();
  d.corrections['2|siren'] = { ligne: 2, champ: 'siren', avant: '', propose: null, apres: '', decision: 'refusee', certitude: 'a_verifier', code: 'siren_manquant', note: 'à vérifier', decideLe: T0 };
  d.plan.t1 = { responsable: 'Direction financière', statut: 'en_cours', echeance: '2026-11-15' };
  d.organisation.plateforme = 'oui';
  L.ajouterVersion(d, { libelle: 'Avant correction', note: 'n', maintenant: T0, resume: L.resumeDossier(d, '2026-10-06') });
  var s1 = L.serialiserDossier(d);
  var r = L.validateDossier(JSON.parse(s1));
  assert.strictEqual(r.ok, true, r.erreurs.join('|'));
  assert.strictEqual(r.integriteOk, true, r.avertissements.join('|'));
  assert.strictEqual(L.serialiserDossier(r.dossier), s1);
  var demo = L.dossierDemo(D, { maintenant: T0 });
  var s2 = L.serialiserDossier(demo);
  var r2 = L.validateDossier(JSON.parse(s2));
  assert.strictEqual(r2.ok, true, r2.erreurs.join('|'));
  assert.strictEqual(L.serialiserDossier(r2.dossier), s2);
  assert.strictEqual(r2.dossier.mode, 'demo');
});

test('somme d\'intégrité : une modification est signalée par un avertissement, sans blocage', function () {
  var s = L.serialiserDossier(dossierAvecImport());
  var obj = JSON.parse(s);
  assert.ok(/^[0-9a-f]{8}$/.test(obj.integrite.somme));
  obj.donnees.tiers.lignes[0][0] = 'Atelier modifié';
  var r = L.validateDossier(obj);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.integriteOk, false);
  assert.ok(r.avertissements.some(function (a) { return /intégrité/.test(a); }));
  delete obj.integrite;
  assert.strictEqual(L.validateDossier(obj).integriteOk, false);
  assert.strictEqual(L.sommeIntegrite({ a: 1, b: [1, 2] }), L.sommeIntegrite({ b: [1, 2], a: 1 }));
});

test('table importée : matrice brute conservée (colonnes non reconnues incluses), numéros de ligne physiques', function () {
  var d = dossierAvecImport();
  var t = d.donnees.tiers;
  assert.deepStrictEqual(t.entetes, ['nom', 'siren', 'cp']);
  assert.deepStrictEqual(t.mapping, ['nom', 'siren', 'code_postal']);
  assert.deepStrictEqual(t.numerosLigne, [2, 3, 5]);
  assert.strictEqual(t.lignes[1][0], 'B; "fictif"\r\nsuite');
  assert.strictEqual(t.source.nbLues, 3);
  assert.strictEqual(t.source.nbRetenues, 3);
  assert.strictEqual(t.vides, undefined);
});

test('journal : ajout seulement, plafonné à 5 000 entrées (le plus ancien supprimé)', function () {
  var d = L.creerDossier({ nom: 'A' }, { maintenant: T0 });
  for (var i = 0; i < 5000; i++) L.ajouterJournal(d, { t: T0, action: 'accepter', cle: 'c' + i, avant: '', apres: '' });
  assert.strictEqual(d.journal.length, 5000);
  var r = L.ajouterJournal(d, { t: T0, action: 'refuser', cle: 'dernier', avant: '', apres: '' });
  assert.strictEqual(r.supprimees, 1);
  assert.strictEqual(d.journal.length, 5000);
  assert.strictEqual(d.journal[0].cle, 'c1');
  assert.strictEqual(d.journal[4999].cle, 'dernier');
  var obj = JSON.parse(L.serialiserDossier(d));
  for (var k = 0; k < 10; k++) obj.journal.push({ t: T0, action: 'modifier', cle: 'x' + k, avant: '', apres: '' });
  var v = L.validateDossier(obj);
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.dossier.journal.length, 5000);
  assert.ok(v.avertissements.some(function (a) { return /journal/.test(a); }));
});

test('versions : numérotées, plafonnées à 20 (la plus ancienne supprimée), résumé seulement', function () {
  var d = dossierAvecImport();
  var resume = L.resumeDossier(d, '2026-10-06');
  var derniere = null;
  for (var i = 1; i <= 21; i++) derniere = L.ajouterVersion(d, { libelle: 'Version ' + i, note: '', maintenant: T0, resume: resume });
  assert.strictEqual(d.versions.length, 20);
  assert.strictEqual(derniere.supprimee.numero, 1);
  assert.strictEqual(d.versions[0].numero, 2);
  assert.strictEqual(d.versions[19].numero, 21);
  assert.strictEqual(d.versions[19].resume.lignes, undefined, 'un résumé ne contient pas les lignes du fichier');
  assert.throws(function () { L.ajouterVersion(d, { libelle: '   ', maintenant: T0, resume: resume }); });
  var r = L.validateDossier(JSON.parse(L.serialiserDossier(d)));
  assert.strictEqual(r.ok, true, r.erreurs.join('|'));
  assert.strictEqual(r.integriteOk, true);
});

test('résumé de version : clés stables (SIREN valide sinon nom + code postal), mentions et organisation', function () {
  var d = L.dossierDemo(D, { maintenant: T0 });
  var res = L.resumeDossier(d, D.referenceDate);
  assert.strictEqual(res.nbTiers, 40);
  assert.strictEqual(res.composantes[0].valeur, 50);
  assert.deepStrictEqual(res.mentions, { ok: 6, total: 10 });
  assert.strictEqual(res.organisation.logiciel, 'oui');
  assert.strictEqual(res.nbAnomalies.siren_manquant, 4);
  assert.ok(res.anomalies.some(function (a) { return /^nom:MECANIQUE FICTIVE GOLF\|38000\|siren_manquant$/.test(a); }), 'clé par nom et code postal');
  assert.ok(res.anomalies.some(function (a) { return /^siren:\d{9}\|tva_incoherente$/.test(a); }));
  assert.strictEqual(L.cleTiers({ siren: '123 456 782', nom: 'x' }), 'siren:123456782');
});

test('dossier de démonstration : généré depuis EquerreData, mode « demo », modèles préremplis', function () {
  var d = L.dossierDemo(D, { maintenant: T0 });
  assert.strictEqual(d.mode, 'demo');
  assert.strictEqual(d.entreprise.nom, D.entreprise);
  assert.strictEqual(d.refDate, '2026-10-06');
  assert.strictEqual(d.donnees.tiers.lignes.length, 40);
  assert.strictEqual(d.donnees.factures.lignes.length, 150);
  assert.strictEqual(d.donnees.lignes, null);
  assert.strictEqual(d.modeles.length, 3);
  var ev = L.evaluerTable(d.donnees.tiers, 'tiers');
  assert.strictEqual(L.analyzeThirdParties(ev.records, { columns: ev.colonnes }).score, 50);
  assert.strictEqual(L.evaluerTable(d.donnees.factures, 'factures').records.length, 150);
});

test('enregistrement sans les lignes de factures : la table lignes est omise, le fichier reste valide', function () {
  var d = dossierAvecImport();
  d.donnees.lignes = d.donnees.tiers;   // contenu quelconque pour le test
  var s = L.serialiserDossier(d, { sansLignes: true });
  var o = JSON.parse(s);
  assert.strictEqual(o.donnees.lignes, null);
  var r = L.validateDossier(o);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.integriteOk, true);
});

test('validation : table mal formée (cellule non texte, mapping inconnu) refusée', function () {
  var o = JSON.parse(L.serialiserDossier(dossierAvecImport()));
  var a = JSON.parse(JSON.stringify(o)); a.donnees.tiers.lignes[0][0] = 5;
  assert.strictEqual(L.validateDossier(a).ok, false);
  var b = JSON.parse(JSON.stringify(o)); b.donnees.tiers.mapping[0] = 'inconnu';
  assert.strictEqual(L.validateDossier(b).ok, false);
  var c = JSON.parse(JSON.stringify(o)); c.donnees.tiers.numerosLigne.pop();
  assert.strictEqual(L.validateDossier(c).ok, false);
});

test('validation : logo non PNG ignoré avec avertissement', function () {
  var o = JSON.parse(L.serialiserDossier(L.creerDossier({ nom: 'A' }, { maintenant: T0 })));
  o.entreprise.logo = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
  var r = L.validateDossier(o);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.dossier.entreprise.logo, null);
  assert.ok(r.avertissements.length >= 1);
  o.entreprise.logo = 'data:image/png;base64,iVBORw0KGgo=';
  assert.strictEqual(L.validateDossier(o).dossier.entreprise.logo, 'data:image/png;base64,iVBORw0KGgo=');
});
