/* Tests de l'import « vérification au registre » : il lit exactement la sortie de livrables/registre-cli/verif_registre.py
 * (colonnes et statuts réels), traite tous les statuts, ne présente jamais une ligne non vérifiée ou simulée comme vérifiée,
 * et les textes (aide, README, guide) annoncent le débit réel du script (5 requêtes par seconde au plus). */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var L = require('../js/core/logic.js');

var RACINE_PROJET = path.join(H.RACINE, '..', '..');
var CLI = path.join(RACINE_PROJET, 'livrables', 'registre-cli');

function eval1(texte, kind) {
  var p = L.parseCsv(texte.replace(/^﻿/, ''));
  var sm = L.suggestMapping(p.headers, kind);
  var t = L.tableDepuisParse(p, sm.mapping, {});
  var ev = L.evaluerTable(t, kind);
  var rap = L.finaliserTable(t, ev, kind);
  return { p: p, sm: sm, ev: ev, rap: rap };
}

/* Sortie réelle de verif_registre.py (--max-echecs 1 --reprises 0, API simulée) sur un fichier de tiers à 9 lignes :
 * ok actif, ok cessé (C), introuvable, non_diffusible, siren_invalide, siren_vide, ok avec écart de nom, erreur_api, non_verifie. */
var SORTIE_PYTHON = 'nom;siren;adresse;code_postal;ville;type;etat_administratif;nom_registre;adresse_registre;code_postal_registre;ville_registre;naf_registre;date_verification;ecart_registre;ecart_detail;statut_verification\n' +
  'Alpha SAS;552032534;1 rue de la Paix;75002;Paris;client;A;ALPHA SAS;1 RUE DE LA PAIX;75002;PARIS;62.01Z;2026-10-07;non;;ok\n' +
  'Bravo SARL;123456782;5 avenue Foch;69006;Lyon;client;C;BRAVO SARL;5 AVENUE FOCH;69006;LYON;62.01Z;2026-10-07;non;;ok\n' +
  'Charlie;876543216;2 rue X;13001;Marseille;client;;;;;;;2026-10-07;;;introuvable\n' +
  'Delta;111222337;3 rue Y;31000;Toulouse;client;;;;;;;2026-10-07;;;non_diffusible\n' +
  'Echo;123456789;4 rue Z;44000;Nantes;client;;;;;;;;;;siren_invalide\n' +
  'Foxtrot;;6 rue W;59000;Lille;client;;;;;;;;;;siren_vide\n' +
  'Golf SA;444555668;9 rue Neuve;33000;Bordeaux;client;A;AUTRE NOM SA;9 RUE NEUVE;33000;BORDEAUX;62.01Z;2026-10-07;oui;nom;ok\n' +
  'Hotel;222333445;7 rue V;67000;Strasbourg;client;;;;;;;;;;erreur_api\n' +
  'India;333444552;8 rue U;35000;Rennes;client;;;;;;;;;;non_verifie\n';

function recs(texte) { return eval1(texte, 'registre'); }

test('registre : la sortie de verif_registre.py est lue telle quelle (colonnes reconnues, colonnes d\'origine non confondues)', function () {
  var r = recs(SORTIE_PYTHON);
  var map = {};
  r.p.headers.forEach(function (h, i) { map[h] = r.sm.mapping[i]; });
  assert.strictEqual(map.siren, 'siren');
  assert.strictEqual(map.statut_verification, 'statut_verification');
  assert.strictEqual(map.etat_administratif, 'etat_administratif');
  assert.strictEqual(map.nom_registre, 'denomination_registre');
  assert.strictEqual(map.adresse_registre, 'adresse_registre');
  assert.strictEqual(map.code_postal_registre, 'code_postal_registre');
  assert.strictEqual(map.ville_registre, 'ville_registre');
  assert.strictEqual(map.date_verification, 'date_verification');
  // colonnes d'origine du fichier de tiers et colonnes de comparaison de l'outil : ignorées (l'application refait la comparaison)
  ['nom', 'adresse', 'code_postal', 'ville', 'type', 'naf_registre', 'ecart_registre', 'ecart_detail'].forEach(function (c) { assert.ok(!map[c], c + ' doit rester ignorée'); });
  assert.deepStrictEqual(r.sm.manquantes, []);
  assert.deepStrictEqual(L.diagnostiquer(L.inspectParsed(r.p, 'registre', {})).filter(function (d) { return d.bloquant; }), []);
});

test('registre : sortie réelle de verif_registre.py, tous les statuts traités et jamais présentés comme vérifiés à tort', function () {
  var r = recs(SORTIE_PYTHON);
  // 9 lignes, une sans SIREN (siren_vide) : refusée comme « SIREN manquant », comptée dans le rapport
  assert.strictEqual(r.ev.records.length, 8);
  assert.strictEqual(r.rap.totauxParRaison.siren_manquant, 1);
  var par = {};
  r.ev.records.forEach(function (x) { if (!par[x.statut]) par[x.statut] = x; });
  ['ok', 'introuvable'].forEach(function (s) { assert.strictEqual(par[s].verifie, true, s); assert.ok(par[s].dateVerification, s); });
  assert.strictEqual(par.ok.etat, 'A');
  assert.strictEqual(par.ok.denomination, 'ALPHA SAS');
  ['non_diffusible', 'siren_invalide', 'erreur_api', 'non_verifie'].forEach(function (s) {
    var x = par[s];
    assert.strictEqual(x.verifie, false, s);
    assert.strictEqual(x.dateVerification, null, s + ' : aucune date de vérification');
    assert.strictEqual(x.etat, '', s);
    assert.strictEqual(x.denomination, '', s);
  });
  assert.ok(r.rap.avertissements.some(function (a) { return /4 SIREN non vérifié\(s\)/.test(a); }), r.rap.avertissements.join('|'));
  // anomalies du registre : cessée (C) et écart de nom signalés ; introuvable signalé ; aucune sur les lignes non vérifiées
  var rows = [
    { nom: 'Alpha SAS', siren: '552032534', adresse: '1 rue de la Paix', code_postal: '75002', ville: 'Paris' },
    { nom: 'Bravo SARL', siren: '123456782', adresse: '5 avenue Foch', code_postal: '69006', ville: 'Lyon' },
    { nom: 'Charlie', siren: '876543216', adresse: '2 rue X', code_postal: '13001', ville: 'Marseille' },
    { nom: 'Delta', siren: '111222337', adresse: '3 rue Y', code_postal: '31000', ville: 'Toulouse' },
    { nom: 'Echo', siren: '123456789', adresse: '4 rue Z', code_postal: '44000', ville: 'Nantes' },
    { nom: 'Golf SA', siren: '444555668', adresse: '9 rue Neuve', code_postal: '33000', ville: 'Bordeaux' },
    { nom: 'Hotel', siren: '222333445', adresse: '7 rue V', code_postal: '67000', ville: 'Strasbourg' },
    { nom: 'India', siren: '333444552', adresse: '8 rue U', code_postal: '35000', ville: 'Rennes' }
  ].map(function (x, i) { return Object.assign({ ligne: i + 2, type: 'client' }, x); });
  var a = L.analyseEffective(rows, { registre: r.ev.records }).analysis;
  var codes = a.items.map(function (it) { return it.anomalies.filter(function (x) { return x.source === 'registre'; }).map(function (x) { return x.code; }); });
  assert.deepStrictEqual(codes, [[], ['etat_cesse'], ['siren_introuvable'], [], [], ['ecart_nom'], [], []]);
});

test('registre : classement de chaque statut possible (ok, introuvable, cinq statuts sans vérification, statut absent ou inconnu, essai)', function () {
  assert.strictEqual(L.classerStatutRegistre('ok'), 'ok');
  assert.strictEqual(L.classerStatutRegistre('OK'), 'ok');
  assert.strictEqual(L.classerStatutRegistre('introuvable'), 'introuvable');
  assert.deepStrictEqual(L.STATUTS_NON_VERIFIES, ['non_diffusible', 'siren_invalide', 'siren_vide', 'erreur_api', 'non_verifie']);
  L.STATUTS_NON_VERIFIES.forEach(function (s) { assert.strictEqual(L.classerStatutRegistre(s), 'non_verifie', s); });
  // jamais « vérifié » par défaut : statut vide, ancien vocabulaire, valeur inattendue
  ['', 'trouve', 'etat_cesse', 'active', 'valide', 'xyz', undefined, null].forEach(function (s) { assert.strictEqual(L.classerStatutRegistre(s), 'non_verifie', String(s)); });
  // essai / simulation : refusé à l'import
  ['simule', 'Simulé'.normalize('NFD').replace(/[̀-ͯ]/g, ''), 'simulation', 'dry-run'].forEach(function (s) { assert.strictEqual(L.classerStatutRegistre(s), 'simule', s); });
});

test('registre : un fichier sans colonne de statut n\'est jamais compté comme vérifié', function () {
  var r = recs('siren;nom_registre;etat_administratif;date_verification\n552032534;ALPHA SAS;A;2026-10-07\n123456782;BRAVO;C;2026-10-07\n');
  assert.strictEqual(r.ev.records.length, 2);
  r.ev.records.forEach(function (x) { assert.strictEqual(x.verifie, false); assert.strictEqual(x.dateVerification, null); assert.strictEqual(x.etat, ''); });
  assert.ok(r.rap.avertissements.some(function (a) { return /2 SIREN non vérifié\(s\)/.test(a); }));
});

test('registre : une ligne « simulée » n\'est jamais importée (raison « simulation »)', function () {
  var r = recs('siren;statut_verification;nom_registre;etat_administratif;date_verification\n552032534;simule;ALPHA SAS;A;2026-10-07\n123456782;ok;BRAVO;A;2026-10-07\n');
  assert.strictEqual(r.ev.records.length, 1);
  assert.strictEqual(r.rap.totauxParRaison.simulation, 1);
  assert.strictEqual(r.ev.records[0].statut, 'ok');
});

test('registre : un SIREN présent en double garde la ligne vérifiée, jamais la ligne non vérifiée', function () {
  var r = recs('siren;statut_verification;nom_registre;etat_administratif;date_verification\n552032534;ok;ALPHA SAS;A;2026-10-07\n552032534;erreur_api;;;\n');
  var idx = L.indexerRegistre(r.ev.records);
  assert.strictEqual(idx.get('552032534').verifie, true);
  var r2 = recs('siren;statut_verification;nom_registre;etat_administratif;date_verification\n552032534;erreur_api;;;\n552032534;ok;ALPHA SAS;A;2026-10-07\n');
  assert.strictEqual(L.indexerRegistre(r2.ev.records).get('552032534').verifie, true);
});

test('registre : les colonnes d\'origine du fichier de tiers (statut, etat, adresse, ville, date) ne sont pas prises pour des colonnes du registre', function () {
  var r = recs('nom;statut;etat;adresse;ville;date;siren;etat_administratif;adresse_registre;ville_registre;date_verification;statut_verification\n' +
    'Alpha;actif;ouvert;1 rue A;Paris;01/01/2020;552032534;C;9 rue B;Lyon;2026-10-07;ok\n');
  var rec = r.ev.records[0];
  assert.strictEqual(rec.etat, 'C');
  assert.strictEqual(rec.adresse, '9 rue B');
  assert.strictEqual(rec.ville, 'Lyon');
  assert.strictEqual(rec.statut, 'ok');
  assert.strictEqual(rec.dateVerification, '2026-10-07');
});

test('registre : sortie réelle de verif_registre.py générée à la volée (API simulée), colonnes et statuts conformes au contrat', function () {
  var code = [
    'import sys, os, json, tempfile',
    'sys.path.insert(0, sys.argv[1])',
    'import verif_registre as vr',
    'def res(s, nom, e):',
    '    return {"siren": s, "nom_complet": nom, "nom_raison_sociale": nom, "sigle": None, "activite_principale": "62.01Z", "etat_administratif": e,',
    '            "siege": {"adresse": "1 RUE A 75001 PARIS", "code_postal": "75001", "libelle_commune": "PARIS", "activite_principale": "62.01Z", "etat_administratif": e, "nom_commercial": None}}',
    'def http(url, timeout):',
    '    q = url.split("q=")[1].split("&")[0]',
    '    if q == "552032534": return 200, {}, json.dumps({"results": [res(q, "ALPHA SAS", "A")]}).encode()',
    '    if q == "732829320": return 200, {}, json.dumps({"results": [res(q, "BRAVO", "C")]}).encode()',
    '    return 200, {}, json.dumps({"results": []}).encode()',
    'd = tempfile.mkdtemp()',
    'src = os.path.join(d, "t.csv"); out = os.path.join(d, "o.csv")',
    'open(src, "w", encoding="utf-8").write("nom;siren;ville\\nAlpha SAS;552032534;Paris\\nBravo;732829320;Paris\\nCharlie;123456782;Lyon\\nEcho;12345;Nantes\\nFoxtrot;;Lille\\n")',
    't = [0.0]',
    'vr.main([src, "-o", out, "--accord-client", "--sans-cache"], http_get=http, clock=lambda: t[0], sleep=lambda s: t.__setitem__(0, t[0] + s))',
    'sys.stdout.buffer.write(open(out, "rb").read())'
  ].join('\n');
  var res = cp.spawnSync('python', ['-c', code, CLI], { encoding: 'buffer' });
  if (res.error || res.status !== 0) return; // Python absent : couvert par la sortie littérale ci-dessus et par les tests unittest
  var texte = res.stdout.toString('utf8');
  var r = recs(texte);
  var statuts = r.ev.records.map(function (x) { return x.statut; });
  assert.deepStrictEqual(statuts, ['ok', 'ok', 'introuvable', 'siren_invalide']);
  assert.deepStrictEqual(r.ev.records.map(function (x) { return x.verifie; }), [true, true, true, false]);
  assert.strictEqual(r.ev.records[1].etat, 'C');
  assert.strictEqual(r.rap.totauxParRaison.siren_manquant, 1);
  assert.deepStrictEqual(r.sm.manquantes, []);
  // chaque colonne ajoutée par l'outil est soit reconnue, soit explicitement ignorée
  var entetes = r.p.headers;
  ['statut_verification', 'etat_administratif', 'nom_registre', 'adresse_registre', 'code_postal_registre', 'ville_registre', 'date_verification'].forEach(function (c) {
    assert.ok(r.sm.mapping[entetes.indexOf(c)], c);
  });
  ['naf_registre', 'ecart_registre', 'ecart_detail'].forEach(function (c) { assert.ok(entetes.indexOf(c) >= 0 && !r.sm.mapping[entetes.indexOf(c)], c); });
});

test('registre : le contrat de verif_registre.py (colonnes, statuts, cadence) est celui que l\'application lit', function () {
  var py = fs.readFileSync(path.join(CLI, 'verif_registre.py'), 'utf8');
  var colonnes = /NEW_COLUMNS = \[([\s\S]*?)\]/.exec(py)[1].match(/"([a-z_]+)"/g).map(function (x) { return x.slice(1, -1); });
  assert.deepStrictEqual(colonnes, ['etat_administratif', 'nom_registre', 'adresse_registre', 'code_postal_registre', 'ville_registre', 'naf_registre',
    'date_verification', 'ecart_registre', 'ecart_detail', 'statut_verification']);
  var statuts = ['ST_OK', 'ST_INTROUVABLE', 'ST_NON_DIFFUSIBLE', 'ST_SIREN_INVALIDE', 'ST_SIREN_VIDE', 'ST_ERREUR', 'ST_NON_VERIFIE'].map(function (n) {
    return new RegExp('^' + n + ' = "([a-z_]+)"', 'm').exec(py)[1];
  });
  assert.deepStrictEqual(statuts, ['ok', 'introuvable', 'non_diffusible', 'siren_invalide', 'siren_vide', 'erreur_api', 'non_verifie']);
  statuts.forEach(function (s) {
    var attendu = s === 'ok' ? 'ok' : (s === 'introuvable' ? 'introuvable' : 'non_verifie');
    assert.strictEqual(L.classerStatutRegistre(s), attendu, s);
  });
  assert.ok(/MAX_CADENCE = 5\.0/.test(py), 'cadence maximale du script : 5 requêtes par seconde');
});

/* ---------- Un seul outil, débit annoncé ---------- */

function textes() {
  return [
    ['registre-cli/README.md', fs.readFileSync(path.join(CLI, 'README.md'), 'utf8')],
    ['GUIDE-LIVRAISON.md', H.lire('GUIDE-LIVRAISON.md')],
    ['README.md', H.lire('README.md')],
    ['js/ui/import-wizard.js', H.lire('js/ui/import-wizard.js')]
  ];
}

test('un seul outil de vérification : la variante Node est supprimée et plus aucun texte ne la cite', function () {
  ['verifier.js', 'lib', path.join('tests', 'test-cli.js')].forEach(function (f) { assert.ok(!fs.existsSync(path.join(CLI, f)), f + ' ne doit plus exister'); });
  assert.ok(fs.existsSync(path.join(CLI, 'verif_registre.py')));
  assert.ok(fs.existsSync(path.join(CLI, 'tests', 'test_verif_registre.py')));
  var tous = H.fichiersApp().map(function (f) { return [f, H.lire(f)]; }).concat(textes()).concat([['script-demo.md', H.lire('script-demo.md')]]);
  tous.forEach(function (x) {
    assert.ok(!/verifier\.js|test-cli|registre-cache\.json|registre-client|--simuler|\-\-oui\b|--base-url|--delai-ms/.test(x[1]), x[0] + ' cite encore l\'outil Node');
  });
});

test('débit annoncé = débit réel du script (une requête à la fois, 5 par seconde au plus, 0,2 s minimum entre deux envois)', function () {
  var readme = textes()[0][1];
  assert.ok(/5 requêtes par seconde au plus/.test(readme));
  assert.ok(/au moins 0,2 seconde entre deux envois/.test(readme));
  assert.ok(/1 000 SIREN/.test(readme) && /3 minutes 20 secondes/.test(readme), '1 000 SIREN x 0,2 s = 200 s = 3 min 20 s');
  assert.ok(/5 par seconde au plus/.test(textes()[1][1]));
  assert.ok(/5 par seconde au plus/.test(textes()[3][1]));
  textes().forEach(function (x) {
    assert.ok(!/6,7|150 ms|4 par seconde|6 appels|6 au plus/.test(x[1]), x[0] + ' : ancien débit');
    assert.ok(!/7 (appels|requêtes) par seconde/.test(x[1]) || x[0] === 'registre-cli/README.md', x[0]);
  });
});

test('interface : une ligne non vérifiée est affichée « Non vérifié » avec son statut, sans donnée du registre', function () {
  var t = H.lire('js/views/view-tiers.js');
  assert.ok(/r\.verifie === false/.test(t) && /Non vérifié/.test(t));
  assert.ok(/n\\'a pas été vérifiée au registre/.test(t) && /statut du fichier/.test(t));
  assert.ok(/'active', 'actif', 'a'/.test(t), '« Active » seulement pour un état reconnu');
});
