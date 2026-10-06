/* Tests des correctifs du tour 1 de contre-vérification : analyseur CSV, fichier registre, factures sans statut,
 * reconnaissance étendue des colonnes, dates à deux chiffres, effacement de la session. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var L = require('../js/core/logic.js');

function eval1(texte, kind) {
  var p = L.parseCsv(texte);
  var sm = L.suggestMapping(p.headers, kind);
  var t = L.tableDepuisParse(p, sm.mapping, {});
  var ev = L.evaluerTable(t, kind);
  var rap = L.finaliserTable(t, ev, kind);
  return { p: p, sm: sm, ev: ev, rap: rap };
}

/* ---------- CSV : guillemet isolé ---------- */

test('CSV : un guillemet au milieu d\'un champ non guillemeté reste un caractère (les lignes suivantes sont conservées)', function () {
  var p = L.parseCsv('nom;siren;ville\nTube 5" acier;552120222;Paris\nA;123456782;Lyon\nB;732829320;Nice\n');
  assert.strictEqual(p.rows.length, 3);
  assert.strictEqual(p.rows[0][0], 'Tube 5" acier');
  assert.deepStrictEqual(p.avertissements, []);
});

test('CSV : un guillemet ouvert en début de champ et jamais refermé est signalé avec sa ligne', function () {
  var p = L.parseCsv('nom;siren\nA;1\n"B;2\nC;3\n');
  assert.strictEqual(p.avertissements.length, 1);
  assert.strictEqual(p.avertissements[0].code, 'guillemet_non_ferme');
  assert.strictEqual(p.avertissements[0].ligne, 3);
  var insp = L.inspectParsed(p, 'tiers', {});
  var diag = L.diagnostiquer(insp).filter(function (d) { return d.code === 'guillemet'; });
  assert.strictEqual(diag.length, 1);
  assert.ok(/ligne 3/.test(diag[0].message));
});

test('CSV : un champ entre guillemets sur plus de 50 lignes est signalé, les champs guillemetés normaux ne le sont pas', function () {
  var long = '"' + new Array(60).join('x\n') + '"';
  var p = L.parseCsv('nom;siren\n' + long + ';1\n');
  assert.ok(p.avertissements.some(function (a) { return a.code === 'champ_tres_long'; }));
  var ok = L.parseCsv('nom;siren\n"A\r\nB";1\n"C ""D""";2\n');
  assert.deepStrictEqual(ok.avertissements, []);
  assert.strictEqual(ok.rows.length, 2);
});

test('CSV : le rapport d\'import reprend l\'avertissement de guillemet non fermé', function () {
  var r = eval1('nom;siren\nA;123456782\n"B;732829320\n', 'tiers');
  assert.ok(r.rap.avertissements.some(function (a) { return /guillemet/.test(a); }));
});

/* ---------- Registre ---------- */

test('registre : les lignes simulées sont refusées à l\'import (raison « simulation »)', function () {
  var r = eval1('siren;statut_verification;denomination_registre;etat_administratif;date_verification\n844083246;simule;Alpha SAS;active;2026-10-07\n172408825;simule;Bravo;active;2026-10-07\n', 'registre');
  assert.strictEqual(r.ev.records.length, 0);
  assert.strictEqual(r.rap.totauxParRaison.simulation, 2);
  assert.ok(L.RAISONS.simulation);
});

test('registre : statuts non vérifiés (erreur, non diffusible, siren invalide) conservés mais sans date ni état, et comptés', function () {
  var r = eval1('siren;statut_verification;denomination_registre;etat_administratif;date_verification\n' +
    '844083246;non_verifie;;;2026-10-07\n172408825;erreur_api;;;2026-10-07\n600217426;non_diffusible;;;2026-10-07\n' +
    '732829320;siren_invalide;;;2026-10-07\n552120222;ok;Delta;A;2026-10-07\n', 'registre');
  assert.strictEqual(r.ev.records.length, 5);
  var nv = r.ev.records.filter(function (x) { return x.verifie === false; });
  assert.strictEqual(nv.length, 4);
  nv.forEach(function (x) { assert.strictEqual(x.dateVerification, null); assert.strictEqual(x.etat, ''); });
  assert.strictEqual(r.ev.records[4].verifie, true);
  assert.ok(r.rap.avertissements.some(function (a) { return /4 SIREN non vérifié\(s\)/.test(a); }));
  // aucune anomalie du registre sur une ligne non vérifiée
  var row = { nom: 'X', siren: '844083246', code_postal: '75001', ville: 'Paris', adresse: '1 rue A' };
  assert.deepStrictEqual(L.analyseEffective([Object.assign({ ligne: 2, type: 'client' }, row)], { registre: [nv[0]] }).analysis.items[0].anomalies.filter(function (a) { return a.source === 'registre'; }), []);
});

test('registre : classement des statuts', function () {
  assert.strictEqual(L.classerStatutRegistre('simule'), 'simule');
  assert.strictEqual(L.classerStatutRegistre('Simulé'.toLowerCase().replace('é', 'e')), 'simule');
  assert.strictEqual(L.classerStatutRegistre('introuvable'), 'introuvable');
  assert.strictEqual(L.classerStatutRegistre('ok'), 'ok');
  assert.strictEqual(L.classerStatutRegistre('trouve'), 'non_verifie');
  assert.strictEqual(L.classerStatutRegistre(''), 'non_verifie');
  ['non_verifie', 'erreur_api', 'non_diffusible', 'siren_invalide', 'siren_vide'].forEach(function (s) { assert.strictEqual(L.classerStatutRegistre(s), 'non_verifie', s); });
});

/* ---------- Factures : solde, échéance facultative, alias ---------- */

test('factures : sans colonne d\'échéance ni de statut, un solde suffit (payée si solde nul) et l\'import n\'est pas bloqué', function () {
  var r = eval1('Client;Date;HT;Reste à payer\nA;05/01/26;100,00;0\nB;2026-02-01;200;50\n', 'factures');
  assert.deepStrictEqual(r.sm.manquantes, []);
  assert.strictEqual(r.ev.records.length, 2);
  assert.strictEqual(r.ev.records[0].paid, true);
  assert.strictEqual(r.ev.records[1].paid, false);
  assert.strictEqual(r.ev.records[0].dateEmission, '2026-01-05');
  assert.strictEqual(r.ev.contexte.sansEcheance, 2);
  assert.ok(r.rap.avertissements.some(function (a) { return /non évaluable/.test(a); }));
});

test('factures : sans statut ni solde, le statut reste obligatoire', function () {
  var p = L.parseCsv('Client;Date;HT\nA;2026-01-05;100\n');
  assert.deepStrictEqual(L.suggestMapping(p.headers, 'factures').manquantes, ['statut']);
});

test('factures : paiement antérieur à l\'émission signalé et écarté du délai moyen ; montant ambigu signalé', function () {
  var r = eval1('Client;Date émission;HT;Statut;Date de paiement\nA;2026-01-10;1.234;payée;2026-01-05\nB;2026-01-10;100;payée;2026-01-20\n', 'factures');
  assert.ok(r.rap.avertissements.some(function (a) { return /antérieure à la date d'émission/.test(a); }));
  assert.ok(r.rap.avertissements.some(function (a) { return /1\.234/.test(a); }));
  var rep = L.computeReporting(r.ev.records, '2026-02-01');
  assert.strictEqual(rep.delaiMoyenPaiement, 10);
  assert.strictEqual(rep.nbPaiementsAnterieurs, 1);
});

test('factures : une facture postérieure à la date de référence est comptée dans le reporting', function () {
  var r = eval1('Client;Date;HT;Statut\nA;2026-03-01;100;non\n', 'factures');
  assert.strictEqual(L.computeReporting(r.ev.records, '2026-02-01').nbApresReference, 1);
});

test('colonnes : libellés d\'affichage et synonymes courants reconnus', function () {
  assert.deepStrictEqual(L.suggestMapping(['Nom du client', 'Adresse de facturation', 'Code postal de facturation', 'Ville de livraison'], 'tiers').mapping,
    ['nom', 'adresse', 'code_postal', 'livraison_ville']);
  assert.deepStrictEqual(L.suggestMapping(['Intitulé', 'SIREN'], 'tiers').mapping, ['nom', 'siren']);
  assert.deepStrictEqual(L.suggestMapping(['N° pièce', 'Date pièce', 'Date limite', 'Nom du client', 'Montant HT', 'Statut'], 'factures').mapping,
    ['numero', 'date_emission', 'date_echeance', 'client', 'montant_ht', 'statut']);
  // tous les libellés d'affichage de chaque type se reconnaissent eux-mêmes
  ['tiers', 'factures', 'lignes', 'registre'].forEach(function (k) {
    var kind = L.KINDS[k];
    var libs = kind.entetes.map(function (c) { return kind.libelles[c]; });
    assert.deepStrictEqual(L.suggestMapping(libs, k).mapping, kind.entetes, k);
  });
});

test('colonnes : une colonne ignorée qui ressemble à une colonne attendue est signalée', function () {
  var p = L.parseCsv('Nom;SIREN;Adresse postale;Divers\nA;123456782;1 rue A;x\n');
  var diag = L.diagnostiquer(L.inspectParsed(p, 'tiers', {}));
  assert.ok(diag.some(function (d) { return d.code === 'ressemblance' && /Adresse postale/.test(d.message) && d.bloquant === false; }) ||
    L.suggestMapping(p.headers, 'tiers').mapping[2] === 'adresse');
});

test('type de tiers : c, 411, clients, f, 401, fournisseurs normalisés ; valeur inconnue signalée', function () {
  assert.strictEqual(L.typeTiers('F'), 'fournisseur');
  assert.strictEqual(L.typeTiers('Fournisseurs'), 'fournisseur');
  assert.strictEqual(L.typeTiers('401'), 'fournisseur');
  assert.strictEqual(L.typeTiers('411000'), 'client');
  assert.strictEqual(L.typeTiers('C'), 'client');
  assert.strictEqual(L.typeTiers(''), '');
  assert.strictEqual(L.typeTiers('divers'), null);
  var r = eval1('type;nom;siren\nF;Alpha;123456782\nclient;Beta;732829320\ndivers;Gamma;552120222\n', 'tiers');
  assert.strictEqual(r.ev.records[0].type, 'fournisseur');
  assert.ok(r.rap.avertissements.some(function (a) { return /type n'est ni/.test(a); }));
});

test('dates : année sur 2 chiffres (00 à 69 en 20xx, 70 à 99 en 19xx), jour impossible refusé', function () {
  assert.strictEqual(L.parseDate('05/01/26'), '2026-01-05');
  assert.strictEqual(L.parseDate('05.01.69'), '2069-01-05');
  assert.strictEqual(L.parseDate('05-01-70'), '1970-01-05');
  assert.strictEqual(L.parseDate('31/02/26'), null);
});

/* ---------- Fenêtre « 12 mois » : même période pour le texte, le nombre de factures et le CA ---------- */

test('fenêtre de 12 mois : du 1er jour du mois situé 12 mois avant la date de référence à cette date, identique pour le nombre de factures et le CA', function () {
  var D = require('../js/data.js');
  var w = L.fenetre12Mois('2026-10-06');
  assert.deepStrictEqual(w, { debut: '2025-10-01', fin: '2026-10-06' });
  assert.deepStrictEqual(L.fenetre12Mois('2026-03-31'), { debut: '2025-03-01', fin: '2026-03-31' });
  // bornes : le 30/09/2025 est hors fenêtre, le 01/10/2025 et la date de référence sont dedans, le lendemain est hors fenêtre
  var fac = ['2025-09-30', '2025-10-01', '2026-10-06', '2026-10-07'].map(function (d) { return { dateEmission: d }; });
  assert.strictEqual(L.nbFactures12Mois(fac, '2026-10-06'), 2);
  // la démonstration : même nombre de factures que celles retenues pour le CA par fiche
  var inv = L.normalizeInvoices(D.exportFacturation).invoices;
  var attendu = inv.filter(function (i) { return i.dateEmission >= w.debut && i.dateEmission <= w.fin; }).length;
  assert.strictEqual(L.nbFactures12Mois(inv, '2026-10-06'), attendu);
  // le texte affiché reprend cette même fenêtre et dit que le premier mois est pris en entier
  var der = H.lire('js/ui/derived.js');
  assert.ok(/L\.fenetre12Mois\(refDate\(\)\)/.test(der) && /le premier mois est pris en entier/.test(der));
  ['js/ui/aide.js'].forEach(function (f) { assert.ok(/du premier jour du mois situé 12 mois avant la date de référence/.test(H.lire(f)), f); });
});

/* ---------- Effacement de la session ---------- */

test('effacement : chaque vue à état expose reinitialiser() et le gestionnaire les appelle toutes', function () {
  ['upgrade', 'tiers', 'reporting', 'mentions', 'dashboard', 'home', 'report', 'cabinet'].forEach(function (v) {
    var t = H.lire('js/views/view-' + v + '.js');
    assert.ok(/reinitialiser:\s*reinitialiser/.test(t), 'view-' + v + ' : reinitialiser exportée');
  });
  var app = H.lire('js/app.js');
  assert.ok(/S\.on\(\['effacement'\][\s\S]*reinitialiser[\s\S]*U\.clear\(c\)/.test(app), 'app.js : réinitialise les vues et vide les conteneurs');
  var up = H.lire('js/views/view-upgrade.js');
  assert.ok(/etat\.fichiers = \[\];[^}]*etat\.avant = null/.test(up));
});
