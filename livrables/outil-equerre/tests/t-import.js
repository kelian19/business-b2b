/* Tests de l'import assisté : décodage, analyseur CSV incrémental, reconnaissance des colonnes, messages, rapport. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var fs = H.fs;
var path = H.path;
var L = require('../js/core/logic.js');
var D = require('../js/data.js');
var MF = require('./make-fixtures.js');

function fx(nom) { return fs.readFileSync(path.join(MF.DIR, nom)); }
function bytes(nom) { var b = fx(nom); return new Uint8Array(b.buffer, b.byteOffset, b.length); }
function texteFx(nom) { return L.decodeBytes(bytes(nom)).texte; }

/* ---------- inspectCsv (I1) ---------- */

test('inspectCsv : texte vide ou espaces → vide=true', function () {
  assert.strictEqual(L.inspectCsv('').vide, true);
  assert.strictEqual(L.inspectCsv('  \r\n \n').vide, true);
  assert.strictEqual(L.inspectCsv('nom;siren\r\nA;123456782').vide, false);
});

test('inspectCsv : en-tête seul → enteteSeul=true et nbLignes=0', function () {
  var r = L.inspectCsv(texteFx('entete-seul.csv'));
  assert.strictEqual(r.enteteSeul, true);
  assert.strictEqual(r.nbLignes, 0);
  assert.strictEqual(r.vide, false);
});

test('inspectCsv : BOM détecté, première colonne reconnue comme « nom »', function () {
  var r = L.inspectCsv('﻿nom;siren\r\nA;123456782');
  assert.strictEqual(r.bom, true);
  assert.strictEqual(r.colonnes[0].canonique, 'nom');
  assert.strictEqual(r.colonnes[0].statut, 'reconnue');
});

test('inspectCsv : séparateur tabulation reconnu', function () {
  var r = L.inspectCsv(texteFx('tabulation.csv'));
  assert.strictEqual(r.separateur, '\t');
  assert.strictEqual(r.separateurIncertain, false);
  assert.deepStrictEqual(r.colonnes.map(function (c) { return c.canonique; }), ['nom', 'siren', 'ville']);
});

test('inspectCsv : « cp » → code_postal (statut synonyme) ; colonne inconnue ignorée', function () {
  var r = L.inspectCsv('nom;siren;cp;Divers\r\nA;123456782;69003;x');
  assert.strictEqual(r.colonnes[2].canonique, 'code_postal');
  assert.strictEqual(r.colonnes[2].statut, 'synonyme');
  assert.strictEqual(r.colonnes[3].canonique, null);
  assert.strictEqual(r.colonnes[3].statut, 'ignoree');
});

test('inspectCsv : sans « siren » → obligatoire manquante', function () {
  var r = L.inspectCsv(texteFx('colonne-manquante.csv'));
  assert.deepStrictEqual(r.manquantes, ['siren']);
  var cible = r.cibles.filter(function (c) { return c.canonique === 'siren'; })[0];
  assert.strictEqual(cible.statut, 'obligatoire_manquante');
  assert.strictEqual(cible.colonne, -1);
});

test('inspectCsv : caractère de remplacement et contenu binaire', function () {
  assert.ok(L.inspectCsv('nom;siren\r\nSoci�t�;1').caracteresRemplaces === 2);
  assert.strictEqual(L.inspectCsv('nom;siren\u0000\r\nA;1').suspectBinaire, true);
  assert.strictEqual(L.inspectCsv('PK\u0003\u0004abc').suspectBinaire, true);
  assert.strictEqual(L.inspectCsv('nom;siren\r\nA;1').suspectBinaire, false);
});

test('inspectCsv : aperçu limité à 5 lignes, nbLignes exact', function () {
  var csv = 'nom;siren\r\n' + [1, 2, 3, 4, 5, 6, 7].map(function (i) { return 'N' + i + ';123456782'; }).join('\r\n');
  var r = L.inspectCsv(csv);
  assert.strictEqual(r.apercu.length, 5);
  assert.strictEqual(r.nbLignes, 7);
});

/* ---------- Décodage ---------- */

test('decodeBytes : UTF-8 avec BOM, sans BOM, UTF-16 avec BOM', function () {
  var a = L.decodeBytes(bytes('bom.csv'));
  assert.strictEqual(a.bom, true);
  assert.strictEqual(a.encodage, 'UTF-8');
  assert.ok(a.texte.indexOf('Atelier Fictif Un SAS') >= 0 && a.texte.charCodeAt(0) !== 0xFEFF);
  var b = L.decodeBytes(Uint8Array.from(Buffer.from('café;€', 'utf8')));
  assert.strictEqual(b.texte, 'café;€');
  assert.strictEqual(b.bom, false);
  var c = L.decodeBytes(bytes('utf16.csv'));
  assert.strictEqual(c.encodage, 'UTF-16 LE');
  assert.strictEqual(c.bom, true);
  assert.strictEqual(c.texte, fx('point-virgule.csv').toString('utf8'));
});

test('decodeBytes : fixture Windows-1252 décodée correctement (é, €, î)', function () {
  var r = L.decodeBytes(bytes('windows-1252.csv'));
  assert.strictEqual(r.encodage, 'Windows-1252');
  assert.ok(r.texte.indexOf('Café € SAS') >= 0, r.texte);
  assert.ok(r.texte.indexOf('Nîmes') >= 0);
  assert.strictEqual(r.caracteresRemplaces, 0);
  assert.strictEqual(L.inspectCsv(r.texte).colonnes[1].canonique, 'siren');
});

test('decodeBytes : faux xlsx (signature PK), PDF, OLE et octet NUL → suspectBinaire', function () {
  assert.strictEqual(L.decodeBytes(bytes('faux-xlsx.xlsx')).suspectBinaire, true);
  assert.strictEqual(L.decodeBytes(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2D])).suspectBinaire, true);
  assert.strictEqual(L.decodeBytes(Uint8Array.from([0xD0, 0xCF, 0x11, 0xE0, 0x00])).suspectBinaire, true);
  assert.strictEqual(L.decodeBytes(Uint8Array.from([0x61, 0x00, 0x62])).suspectBinaire, true);
  assert.strictEqual(L.decodeBytes(bytes('point-virgule.csv')).suspectBinaire, false);
});

test('decodeBytes : accents mal encodés (U+FFFD dans le fichier) comptés', function () {
  var r = L.decodeBytes(bytes('accents-mal-encodes.csv'));
  assert.strictEqual(r.encodage, 'UTF-8');
  assert.strictEqual(r.caracteresRemplaces, 3);
});

/* ---------- Analyseur incrémental ---------- */

test('analyseur : champ entre guillemets avec « ; », guillemets doublés et retour à la ligne relu à l\'identique', function () {
  var p = L.parseCsv(texteFx('guillemets-multilignes.csv'));
  assert.strictEqual(p.rows.length, 2);
  assert.strictEqual(p.rows[0][0], 'Société "Fictive"; Un\r\nsecond ligne');
  assert.strictEqual(p.rows[0][1], '123456782');
  assert.strictEqual(p.rows[1][0], 'Autre SAS');
  // aller-retour par toCsv
  var re = L.parseCsv(L.toCsv(p.headers, p.rows));
  assert.deepStrictEqual(re.rows, p.rows);
});

test('analyseur : numéros de ligne physique (champ sur plusieurs lignes, lignes vides)', function () {
  var p = L.parseCsv('nom;siren\r\n"A\r\nB";1\r\n\r\nC;2\r\nD;3');
  assert.deepStrictEqual(p.lines, [2, 5, 6]);
  assert.deepStrictEqual(p.blanks, [4]);
  assert.strictEqual(p.headerLine, 1);
  var q = L.parseCsv('nom;siren\n\n\nA;1\n');
  assert.deepStrictEqual(q.lines, [4]);
  assert.deepStrictEqual(q.blanks, [2, 3]);
});

test('analyseur : CRLF coupé entre deux tranches, guillemet doublé coupé', function () {
  var p = L.createCsvParser(';');
  p.feed('nom;siren\r');
  p.feed('\nA;"x"');
  p.feed('"y";2\r');
  p.feed('\n"B');
  p.feed('"');
  p.feed(';3');
  var r = L.finaliser(p.fin());
  assert.deepStrictEqual(r.rows, [['A', 'x"y', '2'], ['B', '3']]);
  assert.deepStrictEqual(r.lines, [2, 3]);
});

test('analyseur : 20 découpages aléatoires donnent le même résultat que l\'analyse complète', function () {
  var texte = '﻿nom;siren;note\r\n"A;1";123\r\n"B ""q""\r\nligne 2";456;"x"\r\n\r\nC;789;fin\rD;1;2\nE;"";\r\n"F";9;"fin sans retour"';
  var complet = L.parseCsv(texte);
  var graine = 12345;
  function alea() { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff; }
  for (var essai = 0; essai < 20; essai++) {
    var p = L.createCsvParser(complet.separator);
    var i = 0;
    while (i < texte.length) {
      var n = 1 + Math.floor(alea() * 7);
      p.feed(texte.slice(i, i + n));
      i += n;
    }
    var r = L.finaliser(p.fin());
    assert.deepStrictEqual(r.rows, complet.rows, 'essai ' + essai);
    assert.deepStrictEqual(r.lines, complet.lines, 'lignes essai ' + essai);
    assert.deepStrictEqual(r.headers, complet.headers);
    assert.deepStrictEqual(r.blanks, complet.blanks);
  }
});

test('analyseur : même résultat que l\'ancien analyseur de la démonstration sur des entrées variées', function () {
  var ancien = path.join(H.RACINE, '..', 'demo-appel', 'logic.js');
  if (!fs.existsSync(ancien)) return;
  var Old = require(ancien);
  var entrees = [
    'nom;siren\r\nA;1\r\n', 'nom,siren\nA,1\nB,2', '"a;b";c\r\n"x ""y""";z\r\n\r\n', 'a\tb\n1\t2\n',
    texteFx('guillemets-multilignes.csv'), texteFx('tiers-fictif.csv'), texteFx('factures-fictif.csv'), '', '\n\n', 'seul', 'a;b\r\n"non fermé;1'
  ];
  entrees.forEach(function (t, k) {
    var a = Old.parseCsv(t);
    var b = L.parseCsv(t);
    assert.strictEqual(b.separator, a.separator, 'séparateur ' + k);
    assert.deepStrictEqual(b.headers, a.headers, 'en-têtes ' + k);
    assert.deepStrictEqual(b.rows, a.rows, 'lignes ' + k);
  });
});

/* ---------- Reconnaissance des colonnes ---------- */

test('suggestMapping : synonymes étendus et jeton contenu (« N° SIREN client » → siren)', function () {
  var m = L.suggestMapping(['Raison sociale', 'N° SIREN client', 'Code postal', 'Localité', 'N° TVA intracommunautaire', 'Commentaire'], 'tiers');
  assert.deepStrictEqual(m.mapping, ['nom', 'siren', 'code_postal', 'ville', 'tva', null]);
  assert.strictEqual(m.colonnes[1].statut, 'synonyme');
  assert.strictEqual(m.colonnes[0].statut, 'synonyme');
  assert.strictEqual(m.colonnes[5].statut, 'ignoree');
  var f = L.suggestMapping(['N° facture', 'Nom du client', 'N° SIREN client', 'Date d\'émission', 'Date d\'échéance', 'Total HT', 'Total TTC', 'Réglée le'], 'factures');
  assert.deepStrictEqual(f.mapping, ['numero', 'client', 'siren_client', 'date_emission', 'date_echeance', 'montant_ht', 'montant_ttc', 'date_paiement']);
});

test('suggestMapping : une cible n\'est prise que par une colonne, conflit signalé', function () {
  var m = L.suggestMapping(['nom', 'Raison sociale', 'siren'], 'tiers');
  assert.deepStrictEqual(m.mapping, ['nom', null, 'siren']);
  assert.strictEqual(m.conflits.length, 1);
  assert.strictEqual(m.conflits[0].colonne, 'Raison sociale');
});

test('suggestMapping : choix manuel d\'une colonne inconnue vers « siren » comble l\'obligatoire manquante', function () {
  var avant = L.suggestMapping(['nom', 'Identifiant fiscal'], 'tiers');
  assert.deepStrictEqual(avant.manquantes, ['siren']);
  var apres = L.suggestMapping(['nom', 'Identifiant fiscal'], 'tiers', [undefined, 'siren']);
  assert.deepStrictEqual(apres.manquantes, []);
  assert.strictEqual(apres.colonnes[1].statut, 'choisie');
  assert.strictEqual(apres.mapping[1], 'siren');
  // ignorer explicitement une colonne reconnue
  var ign = L.suggestMapping(['nom', 'siren'], 'tiers', [undefined, '']);
  assert.strictEqual(ign.mapping[1], null);
  // le choix manuel prend la cible à une colonne reconnue automatiquement
  var vol = L.suggestMapping(['nom', 'siren', 'Autre'], 'tiers', [undefined, undefined, 'siren']);
  assert.deepStrictEqual(vol.mapping, ['nom', null, 'siren']);
});

test('suggestMapping : les 4 types de fichiers ont leurs en-têtes et colonnes obligatoires', function () {
  assert.deepStrictEqual(L.ORDRE_KINDS, ['tiers', 'factures', 'lignes', 'registre']);
  assert.strictEqual(L.KINDS.tiers.entetes.length, 12);
  assert.deepStrictEqual(L.KINDS.registre.entetes.slice(0, 2), ['siren', 'statut_verification']);
  assert.ok(L.KINDS.factures.entetes.indexOf('siren_client') >= 0);
  assert.ok(L.KINDS.lignes.entetes.indexOf('option_tva_debits') >= 0);
  assert.deepStrictEqual(L.suggestMapping(L.KINDS.registre.entetes, 'registre').manquantes, []);
  assert.deepStrictEqual(L.suggestMapping(L.KINDS.lignes.entetes, 'lignes').manquantes, []);
});

/* ---------- Messages et rapport ---------- */

test('diagnostiquer : un message exact et distinct pour chacun des 6 cas', function () {
  function codes(texte) { return L.diagnostiquer(L.inspectCsv(texte)).map(function (p) { return p.code + ':' + p.message; }); }
  var vide = codes('');
  assert.deepStrictEqual(vide, ['vide:Le fichier est vide. Vérifiez que vous avez enregistré le bon fichier.']);
  assert.deepStrictEqual(codes(texteFx('entete-seul.csv')), ['entete_seul:Le fichier contient les en-têtes mais aucune ligne de données.']);
  assert.deepStrictEqual(codes(texteFx('separateur-inconnu.csv')),
    ['separateur:Le séparateur n\'a pas été reconnu. Enregistrez le fichier en CSV avec des points-virgules ou des virgules.']);
  var col = codes(texteFx('colonne-manquante.csv'));
  assert.strictEqual(col.length, 1);
  assert.ok(col[0].indexOf('colonnes:Colonnes obligatoires introuvables : siren. Colonnes trouvées : nom, ville.') === 0);
  assert.ok(/Téléchargez le modèle CSV pour voir les en-têtes attendus\.$/.test(col[0]));
  var acc = codes(texteFx('accents-mal-encodes.csv'));
  assert.deepStrictEqual(acc, ['accents:Les accents semblent mal encodés : le fichier est lu en Windows (ANSI). Si les noms sont encore illisibles, enregistrez-le en UTF-8.']);
  var bin = L.diagnostiquer(L.inspectParsed({ separator: ';', headers: [], rows: [] }, 'tiers', { suspectBinaire: true }));
  assert.deepStrictEqual(bin.map(function (p) { return p.message; }), ['Ce fichier n\'est pas un CSV texte. Dans votre tableur : Enregistrer sous > CSV.']);
  var tous = [vide[0], 'x', col[0], acc[0], bin[0].message];
  assert.strictEqual(new Set(tous).size, tous.length);
  assert.strictEqual(L.diagnostiquer(L.inspectCsv(texteFx('point-virgule.csv'))).length, 0);
});

test('extensionNonCsv : xlsx, xls, pdf, zip refusés par l\'extension', function () {
  ['a.xlsx', 'B.XLS', 'c.pdf', 'd.zip'].forEach(function (n) { assert.strictEqual(L.extensionNonCsv(n), true, n); });
  ['a.csv', 'b.txt', 'xlsx'].forEach(function (n) { assert.strictEqual(L.extensionNonCsv(n), false, n); });
});

test('rapport d\'import : raisons et numéros de ligne physique du fichier', function () {
  var p = L.parseCsv(texteFx('factures-date-serie.csv'));
  var sm = L.suggestMapping(p.headers, 'factures');
  var table = L.tableDepuisParse(p, sm.mapping, { nomFichier: 'factures-date-serie.csv', encodage: 'UTF-8', maintenant: '2026-10-06T10:00:00.000Z' });
  var ev = L.evaluerTable(table, 'factures');
  var rap = L.rapportImport(table, ev, 'factures');
  assert.strictEqual(rap.lues, 5);
  assert.strictEqual(rap.retenues, 1);
  var parLigne = {};
  rap.ignorees.forEach(function (x) { parLigne[x.ligne] = x.raison; });
  assert.deepStrictEqual(parLigne, { 2: 'date_serie_tableur', 4: 'ligne_vide', 5: 'client_manquant', 6: 'date_illisible' });
  assert.deepStrictEqual(rap.totauxParRaison, { ligne_vide: 1, date_serie_tableur: 1, client_manquant: 1, date_illisible: 1 });
  assert.strictEqual(rap.fichier, 'factures-date-serie.csv');
  assert.strictEqual(rap.type, 'factures');
  assert.strictEqual(rap.separateur, ';');
  assert.ok(L.RAISONS.date_serie_tableur.length > 10);
  var fin = L.finaliserTable(table, ev, 'factures');
  assert.strictEqual(table.source.nbRetenues, 1);
  assert.strictEqual(fin.ignorees.length, 4);
});

test('rapport d\'import : lignes à colonnes en trop ignorées, plafond de 200 lignes listées avec totaux', function () {
  var lignes = ['nom;siren'];
  for (var i = 0; i < 300; i++) lignes.push(i % 2 ? ';123456782' : 'N' + i + ';123456782;un;deux');
  var p = L.parseCsv(lignes.join('\r\n'));
  var table = L.tableDepuisParse(p, L.suggestMapping(p.headers, 'tiers').mapping, { nomFichier: 'x.csv' });
  var ev = L.evaluerTable(table, 'tiers');
  var rap = L.rapportImport(table, ev, 'tiers');
  assert.strictEqual(rap.ignorees.length, 200);
  assert.strictEqual(rap.totauxParRaison.nom_manquant, 150);
  assert.strictEqual(rap.totauxParRaison.colonnes_incoherentes, 150);
  assert.strictEqual(rap.retenues, 0);
});

test('import des 4 types à partir des fixtures fictives : tiers, factures, lignes, registre', function () {
  var attendu = { 'tiers-fictif.csv': ['tiers', 40], 'factures-fictif.csv': ['factures', 150], 'lignes-fictif.csv': ['lignes', 5], 'registre-fictif.csv': ['registre', 7] };
  Object.keys(attendu).forEach(function (nom) {
    var dec = L.decodeBytes(bytes(nom));
    var p = L.parseCsv(dec.texte);
    var kind = attendu[nom][0];
    var sm = L.suggestMapping(p.headers, kind);
    assert.deepStrictEqual(sm.manquantes, [], nom);
    var table = L.tableDepuisParse(p, sm.mapping, { nomFichier: nom, encodage: dec.encodage });
    var ev = L.evaluerTable(table, kind);
    assert.strictEqual(ev.records.length, attendu[nom][1], nom);
    assert.strictEqual(ev.nbIgnorees, 0, nom);
  });
  var dec2 = L.decodeBytes(bytes('tiers-fictif.csv'));
  var p2 = L.parseCsv(dec2.texte);
  var ev2 = L.evaluerTable(L.tableDepuisParse(p2, L.suggestMapping(p2.headers, 'tiers').mapping, {}), 'tiers');
  var an = L.analyzeThirdParties(ev2.records, { columns: ev2.colonnes });
  assert.strictEqual(an.score, 50);
  assert.strictEqual(an.clean, 20);
});

test('modèles CSV : la première ligne est la liste des en-têtes de chacun des 4 types', function () {
  L.ORDRE_KINDS.forEach(function (k) {
    var csv = L.modeleCsv(k);
    assert.strictEqual(csv.split('\r\n')[0], L.KINDS[k].entetes.join(';'), k);
    assert.strictEqual(L.parseCsv(csv).rows.length, 0);
  });
});

test('formule injectée : une cellule « =… » importée reste du texte et est neutralisée à l\'export', function () {
  var p = L.parseCsv('nom;siren\r\n"=HYPERLINK(""http://x"")";12\r\n+cmd;1\r\n-A;2\r\n');
  assert.strictEqual(p.rows[0][0], '=HYPERLINK("http://x")');
  var table = L.tableDepuisParse(p, L.suggestMapping(p.headers, 'tiers').mapping, {});
  var ev = L.evaluerTable(table, 'tiers');
  assert.strictEqual(ev.records[0].nom, '=HYPERLINK("http://x")');
  var csv = L.anomaliesToCsv(L.analyzeThirdParties(ev.records, { columns: ev.colonnes }));
  var lignes = L.parseCsv(csv);
  lignes.rows.forEach(function (r) { assert.ok(!/^[=+@\t]/.test(r[2]), r[2]); });
  assert.ok(csv.indexOf('\'=HYPERLINK') >= 0);
  assert.strictEqual(L.toCsv(['a'], [['-5'], ['-A'], ['@x']]), 'a\r\n-5\r\n\'-A\r\n\'@x\r\n');
});

test('canonicalizeCsv (ancienne interface) s\'appuie sur la reconnaissance étendue sans changer les résultats', function () {
  var c = L.canonicalizeCsv(L.parseCsv('Raison sociale;N° SIREN;CP;Commune;Divers\nAlpha;123456782;69003;Lyon;x\n'), 'tiers');
  assert.deepStrictEqual(c.columns, ['nom', 'siren', 'code_postal', 'ville']);
  assert.deepStrictEqual(c.ignored, ['Divers']);
  assert.strictEqual(L.templateCsv('factures'), L.FACTURES_HEADERS.join(';') + '\r\n');
});
