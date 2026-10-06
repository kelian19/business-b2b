/* Tests historiques de la démonstration (53 + 1) : assertions inchangées, seuls les chemins ont changé. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var path = H.path;
var fs = H.fs;
var test = H.test;
var near = H.near;
var L = require('../js/core/logic.js');
var D = require('../js/data.js');

/* ---------- Identifiants ---------- */

test('cleanId retire espaces, points, tirets, espaces insécables', function () {
  assert.strictEqual(L.cleanId(' 123 456.782-'), '123456782');
  assert.strictEqual(L.cleanId('fr 12 345'), 'FR12345');
  assert.strictEqual(L.cleanId(null), '');
  assert.strictEqual(L.cleanId(undefined), '');
});

test('luhnValid : cas connus', function () {
  assert.strictEqual(L.luhnValid('79927398713'), true);   // exemple classique de Luhn
  assert.strictEqual(L.luhnValid('79927398710'), false);
  assert.strictEqual(L.luhnValid('12a'), false);
});

test('isValidSiren : SIREN valides, formats nettoyés', function () {
  assert.strictEqual(L.isValidSiren('123456782'), true);
  assert.strictEqual(L.isValidSiren('123 456 782'), true);
  assert.strictEqual(L.isValidSiren('123.456.782'), true);
  assert.strictEqual(L.isValidSiren('123-456-782'), true);
});

test('isValidSiren : refuse clé fausse, longueur, lettres, vide, zéros', function () {
  assert.strictEqual(L.isValidSiren('123456783'), false);
  assert.strictEqual(L.isValidSiren('12345678'), false);
  assert.strictEqual(L.isValidSiren('1234567820'), false);
  assert.strictEqual(L.isValidSiren('12345678A'), false);
  assert.strictEqual(L.isValidSiren(''), false);
  assert.strictEqual(L.isValidSiren('000000000'), false);
});

test('checkSiren renvoie le motif du refus', function () {
  assert.strictEqual(L.checkSiren('').code, 'vide');
  assert.strictEqual(L.checkSiren('12345678').code, 'longueur');
  assert.strictEqual(L.checkSiren('12345678A').code, 'caracteres');
  assert.strictEqual(L.checkSiren('123456783').code, 'cle');
  assert.strictEqual(L.checkSiren('123456782').code, 'ok');
});

test('isValidSiret / checkSiret : Luhn à 14 chiffres', function () {
  // 123456782 + 0001 + clé : on calcule la clé par Luhn
  var base = '123456782' + '0001';
  var valid = null;
  for (var d = 0; d < 10; d++) if (L.luhnValid(base + d)) valid = base + d;
  assert.ok(valid);
  assert.strictEqual(L.isValidSiret(valid), true);
  assert.strictEqual(L.isValidSiret(valid.slice(0, 13) + ((+valid[13] + 1) % 10)), false);
  assert.strictEqual(L.isValidSiret(valid.slice(0, 13)), false);
  assert.strictEqual(L.isValidSiret(valid.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4')), true);
});

test('checkSiret : cohérence avec le SIREN', function () {
  var base = '123456782' + '0001';
  var valid = null;
  for (var d = 0; d < 10; d++) if (L.luhnValid(base + d)) valid = base + d;
  assert.strictEqual(L.checkSiret(valid, '123456782').ok, true);
  var r = L.checkSiret(valid, '732829320');
  assert.strictEqual(r.ok, L.isValidSiren('732829320') ? false : true);
  var other = D.tiers.filter(function (t) { return t.nom.indexOf('Verrerie') === 0; })[0];
  var res = L.checkSiret(other.siret, other.siren);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.code, 'siren_different');
  assert.strictEqual(L.checkSiret('', '123456782').code, 'vide');
  assert.strictEqual(L.checkSiret('1234', '').code, 'format');
});

test('tvaKey : formule (12 + 3 × (SIREN mod 97)) mod 97, sur deux chiffres', function () {
  var s = '123456782';
  var expected = (12 + 3 * (parseInt(s, 10) % 97)) % 97;
  assert.strictEqual(L.tvaKey(s), (expected < 10 ? '0' : '') + expected);
  assert.strictEqual(L.tvaKey('abc'), null);
  assert.strictEqual(L.tvaKey('12345678'), null);
  // la clé est toujours sur 2 caractères
  for (var i = 0; i < 300; i++) {
    var k = L.tvaKey(String(100000000 + i * 7919));
    assert.ok(/^\d{2}$/.test(k), 'clé ' + k);
  }
});

test('expectedTva et checkTva : FR + clé + SIREN', function () {
  var s = '123456782';
  var tva = 'FR' + L.tvaKey(s) + s;
  assert.strictEqual(L.expectedTva(s), tva);
  assert.strictEqual(L.checkTva(tva, s).ok, true);
  assert.strictEqual(L.checkTva(tva.replace(/^FR(\d{2})/, 'FR '), s).ok, false);
  assert.strictEqual(L.checkTva('fr ' + tva.slice(2, 4) + ' ' + s, s).ok, true);   // espaces et casse tolérés
});

test('checkTva : clé fausse, mauvais SIREN, format, vide', function () {
  var s = '123456782';
  var badKey = 'FR' + ('0' + ((+L.tvaKey(s) + 1) % 97)).slice(-2) + s;
  assert.strictEqual(L.checkTva(badKey, s).code, 'cle');
  var otherSiren = '732829320';
  var otherTva = 'FR' + L.tvaKey(otherSiren) + otherSiren;
  assert.strictEqual(L.checkTva(otherTva, s).code, 'siren_different');
  assert.strictEqual(L.checkTva('FR12 ABC', s).code, 'format');
  assert.strictEqual(L.checkTva('', s).code, 'vide');
  assert.strictEqual(L.checkTva('FRK7' + s, s).ok, true);   // clé alphanumérique : clé non contrôlée
  // SIREN de la ligne manquant : seule la cohérence interne est vérifiée
  assert.strictEqual(L.checkTva(otherTva, '').ok, true);
});

/* ---------- Adresses, noms, doublons ---------- */

test('checkAddress : complète, champs manquants, code postal à 5 chiffres', function () {
  assert.strictEqual(L.checkAddress({ adresse: '1 rue A', code_postal: '69003', ville: 'Lyon' }).ok, true);
  var p = L.checkAddress({ adresse: '', code_postal: '69003', ville: 'Lyon' }).problems;
  assert.deepStrictEqual(p, [{ champ: 'adresse', code: 'manquant' }]);
  assert.strictEqual(L.checkAddress({ adresse: 'x', code_postal: '6903', ville: 'Lyon' }).problems[0].code, 'format');
  assert.strictEqual(L.checkAddress({ adresse: 'x', code_postal: '', ville: '' }).problems.length, 2);
  // étranger : code postal simplement renseigné
  assert.strictEqual(L.checkAddress({ adresse: 'x', code_postal: '1000', ville: 'Bruxelles', pays: 'BE' }).ok, true);
});

test('normalizeName : majuscules, accents, ponctuation, forme juridique', function () {
  assert.strictEqual(L.normalizeName('Société Dupont & Fils, S.A.R.L.'), 'SOCIETE DUPONT FILS');
  assert.strictEqual(L.normalizeName('SARL Charpente Fictive Sierra'), L.normalizeName('Charpente Fictive Sierra SARL'));
  assert.strictEqual(L.normalizeName('AGRO DEMO QUÉBEC SASU'), L.normalizeName('agro démo quebec eurl'));
  assert.strictEqual(L.normalizeName('Cœur d\'Or SNC'), 'COEUR D OR');
  assert.strictEqual(L.normalizeName(''), '');
});

test('findDuplicates : même SIREN, ou même nom normalisé et même code postal', function () {
  var rows = [
    { type: 'client', nom: 'Alpha SAS', siren: '123456782', code_postal: '69000' },
    { type: 'client', nom: 'ALPHA SARL', siren: '123 456 782', code_postal: '75000' },   // même SIREN
    { type: 'client', nom: 'Beta SAS', siren: '', code_postal: '33000' },
    { type: 'client', nom: 'Béta', siren: '', code_postal: '33000' },                    // même nom normalisé et même CP
    { type: 'client', nom: 'Beta', siren: '', code_postal: '44000' },                    // même nom, autre CP : pas un doublon
    { type: 'fournisseur', nom: 'Alpha SAS', siren: '123456782', code_postal: '69000' }  // autre type : pas un doublon
  ];
  var d = L.findDuplicates(rows);
  assert.deepStrictEqual(d[0].map(function (x) { return x.index; }), [1]);
  assert.strictEqual(d[0][0].raison, 'siren');
  assert.deepStrictEqual(d[2].map(function (x) { return x.index; }), [3]);
  assert.strictEqual(d[2][0].raison, 'nom');
  assert.strictEqual(d[4].length, 0);
  assert.strictEqual(d[5].length, 0);
});

test('deliveryDiffers : adresse de livraison différente', function () {
  var base = { adresse: '1 rue A', code_postal: '69003', ville: 'Lyon' };
  assert.strictEqual(L.deliveryDiffers(base), false);
  assert.strictEqual(L.deliveryDiffers(Object.assign({ livraison_adresse: '1 RUE A.', livraison_code_postal: '69003', livraison_ville: 'lyon' }, base)), false);
  assert.strictEqual(L.deliveryDiffers(Object.assign({ livraison_adresse: '5 rue B', livraison_code_postal: '69003', livraison_ville: 'Lyon' }, base)), true);
});

/* ---------- Analyse du fichier de tiers (données fictives) ---------- */

var rows = L.rowsToThirdParties(D.tiers);
var analysis = L.analyzeThirdParties(rows);

test('data.js : environ 40 tiers, SIREN générés valides sauf anomalies injectées', function () {
  assert.strictEqual(D.tiers.length, 40);
  var okSirens = D.tiers.filter(function (t) { return L.isValidSiren(t.siren); }).length;
  assert.ok(okSirens >= 28, 'SIREN valides : ' + okSirens);
});

test('analyse des tiers : comptage de chaque type d\'anomalie', function () {
  assert.deepStrictEqual(analysis.counts, {
    siren_manquant: 4, siren_invalide: 2, siret_incoherent: 2, tva_incoherente: 3,
    doublon: 6, adresse_incomplete: 4, livraison_differente: 4
  });
});

test('analyse des tiers : score de préparation = part des lignes sans anomalie', function () {
  assert.strictEqual(analysis.total, 40);
  assert.strictEqual(analysis.clean, 20);
  assert.strictEqual(analysis.withAnomaly, 20);
  assert.strictEqual(analysis.score, 50);
  assert.strictEqual(L.readinessScore(0, 0), null);
  assert.strictEqual(L.readinessScore(3, 2), 67);
});

test('analyse des tiers : SIREN saisis avec espaces ou points sont acceptés', function () {
  var foxtrot = analysis.items.filter(function (i) { return i.row.nom.indexOf('Foxtrot') >= 0; })[0];
  var mike = analysis.items.filter(function (i) { return i.row.nom.indexOf('Mike') >= 0; })[0];
  assert.ok(/ /.test(foxtrot.row.siren));
  assert.ok(/\./.test(mike.row.siren));
  assert.strictEqual(foxtrot.anomalies.length, 0);
  assert.strictEqual(mike.anomalies.length, 0);
});

test('analyse des tiers : tiers étrangers sans anomalie française', function () {
  var foreign = analysis.items.filter(function (i) { return i.row.pays !== 'FR'; });
  assert.strictEqual(foreign.length, 2);
  foreign.forEach(function (i) { assert.strictEqual(i.anomalies.length, 0); });
});

test('analyse des tiers : même nom mais autre code postal et autre SIREN n\'est pas un doublon', function () {
  var alphas = analysis.items.filter(function (i) { return i.row.nom === 'Négoce Démo Alpha SAS'; });
  assert.strictEqual(alphas.length, 2);
  alphas.forEach(function (i) {
    assert.ok(!i.anomalies.some(function (a) { return a.code === 'doublon'; }));
  });
});

test('analyse des tiers : doublon par nom + CP, avec SIREN manquant sur la seconde ligne', function () {
  var second = analysis.items.filter(function (i) { return i.row.nom === 'SARL Charpente Fictive Sierra'; })[0];
  var codes = second.anomalies.map(function (a) { return a.code; }).sort();
  assert.deepStrictEqual(codes, ['doublon', 'siren_manquant']);
  assert.ok(/même nom et même code postal/.test(second.anomalies.filter(function (a) { return a.code === 'doublon'; })[0].detail));
});

test('analyse des tiers : les détails sont en français et mentionnent une action', function () {
  analysis.items.forEach(function (i) {
    i.anomalies.forEach(function (a) {
      assert.ok(a.detail.length > 20, a.code);
      assert.ok(a.action.length > 10, a.code);
    });
  });
});

test('analyse : colonnes absentes → contrôles correspondants ignorés', function () {
  var r = L.analyzeThirdParties([{ type: 'client', nom: 'X', siren: '123456782' }], { columns: ['type', 'nom', 'siren'] });
  assert.strictEqual(r.items[0].anomalies.length, 0);
  var r2 = L.analyzeThirdParties([{ type: 'client', nom: 'X', siren: '123456782' }]);
  assert.ok(r2.items[0].anomalies.some(function (a) { return a.code === 'adresse_incomplete'; }));
});

/* ---------- CSV ---------- */

test('parseCsv : point-virgule, virgule, guillemets, BOM, lignes vides', function () {
  var p = L.parseCsv('﻿nom;siren\r\n"Dupont; fils";123456782\r\n\r\n"A ""B""";\r\n');
  assert.strictEqual(p.separator, ';');
  assert.deepStrictEqual(p.headers, ['nom', 'siren']);
  assert.strictEqual(p.rows.length, 2);
  assert.strictEqual(p.rows[0][0], 'Dupont; fils');
  assert.strictEqual(p.rows[1][0], 'A "B"');
  var q = L.parseCsv('nom,siren\nAlpha,123456782\n');
  assert.strictEqual(q.separator, ',');
  assert.strictEqual(q.rows[0][1], '123456782');
});

test('canonicalizeCsv : alias d\'en-têtes, colonnes manquantes et ignorées', function () {
  var c = L.canonicalizeCsv(L.parseCsv('Raison sociale;N° SIREN;CP;Commune;Divers\nAlpha;123456782;69003;Lyon;x\n'), 'tiers');
  assert.deepStrictEqual(c.columns, ['nom', 'siren', 'code_postal', 'ville']);
  assert.deepStrictEqual(c.ignored, ['Divers']);
  assert.deepStrictEqual(c.missing, []);
  assert.strictEqual(c.records[0].nom, 'Alpha');
  var m = L.canonicalizeCsv(L.parseCsv('nom;ville\nA;B\n'), 'tiers');
  assert.deepStrictEqual(m.missing, ['siren']);
  var f = L.canonicalizeCsv(L.parseCsv('Client;Date;Échéance;HT;Statut\nA;2026-01-01;2026-01-31;100;payée\n'), 'factures');
  assert.deepStrictEqual(f.missing, []);
  assert.strictEqual(f.records[0].montant_ht, '100');
});

test('toCsv / anomaliesToCsv / templateCsv', function () {
  var t = L.toCsv(['a', 'b'], [['x;y', 'z"q'], ['=SOMME(A1)', '-5'], ['-cmd', 'ok']]);
  assert.strictEqual(t, 'a;b\r\n"x;y";"z""q"\r\n\'=SOMME(A1);-5\r\n\'-cmd;ok\r\n');
  assert.strictEqual(L.templateCsv('tiers'), L.TIERS_HEADERS.join(';') + '\r\n');
  assert.strictEqual(L.templateCsv('factures'), L.FACTURES_HEADERS.join(';') + '\r\n');
  var csv = L.anomaliesToCsv(analysis);
  var parsed = L.parseCsv(csv);
  var nb = analysis.items.reduce(function (s, i) { return s + i.anomalies.length; }, 0);
  assert.strictEqual(parsed.rows.length, nb);
  assert.strictEqual(parsed.headers[0], 'ligne');
});

test('aller-retour CSV : les tiers de démonstration redonnent la même analyse', function () {
  var csv = L.toCsv(L.TIERS_HEADERS, D.tiers);
  var c = L.canonicalizeCsv(L.parseCsv(csv), 'tiers');
  var a2 = L.analyzeThirdParties(L.rowsToThirdParties(c.records), { columns: c.columns });
  assert.deepStrictEqual(a2.counts, analysis.counts);
  assert.strictEqual(a2.score, analysis.score);
});

/* ---------- Dates et montants ---------- */

test('parseDate : formats acceptés et dates impossibles', function () {
  assert.strictEqual(L.parseDate('2026-09-30'), '2026-09-30');
  assert.strictEqual(L.parseDate('30/09/2026'), '2026-09-30');
  assert.strictEqual(L.parseDate('1.2.2026'), '2026-02-01');
  assert.strictEqual(L.parseDate('2026-02-30'), null);
  assert.strictEqual(L.parseDate('31/04/2026'), null);
  assert.strictEqual(L.parseDate(''), null);
  assert.strictEqual(L.parseDate('hier'), null);
});

test('daysBetween : écarts de dates, années bissextiles', function () {
  assert.strictEqual(L.daysBetween('2026-01-01', '2026-01-31'), 30);
  assert.strictEqual(L.daysBetween('2028-02-28', '2028-03-01'), 2);
  assert.strictEqual(L.daysBetween('2026-03-01', '2026-02-01'), -28);
});

test('parseAmount : formats français et anglais', function () {
  assert.strictEqual(L.parseAmount('1 234,56'), 1234.56);
  assert.strictEqual(L.parseAmount('1234.56'), 1234.56);
  assert.strictEqual(L.parseAmount('1.234,56 €'), 1234.56);
  assert.strictEqual(L.parseAmount('1,234.56'), 1234.56);
  assert.strictEqual(L.parseAmount('12'), 12);
  assert.ok(isNaN(L.parseAmount('abc')));
  assert.strictEqual(L.parseAmount('1.234.567'), 1234567);
  assert.strictEqual(L.parseAmount('1,234,567'), 1234567);
  assert.strictEqual(L.parseAmount('12,50EUR'), 12.5);
  assert.strictEqual(L.parseAmount('(45,10)'), -45.1);
  assert.strictEqual(L.parseAmount('−5,00'), -5);
  assert.ok(isNaN(L.parseAmount('')));
});

test('isPaidStatus : variantes de statut', function () {
  ['payée', 'Payee', 'PAYÉ', 'oui', 'réglée', 'paid'].forEach(function (s) { assert.strictEqual(L.isPaidStatus(s), true, s); });
  ['non payée', 'impayée', 'en attente', ''].forEach(function (s) { assert.strictEqual(L.isPaidStatus(s), false, s); });
});

/* ---------- Reporting : exemple calculé à la main ---------- */

var mini = L.normalizeInvoices([
  { numero: '1', client: 'A', date_emission: '2026-01-10', date_echeance: '2026-02-09', montant_ht: '1000', montant_ttc: '1200', statut: 'payée', date_paiement: '2026-02-04' },
  { numero: '2', client: 'A', date_emission: '2026-01-20', date_echeance: '2026-02-19', montant_ht: '500', montant_ttc: '600', statut: 'payée', date_paiement: '2026-03-01' },
  { numero: '3', client: 'B', date_emission: '2026-03-05', date_echeance: '2026-04-04', montant_ht: '2000', montant_ttc: '2400', statut: 'non payée', date_paiement: '' },
  { numero: '4', client: 'C', date_emission: '2026-03-20', date_echeance: '2026-05-19', montant_ht: '300', montant_ttc: '360', statut: 'non payée', date_paiement: '' },
  { numero: '5', client: 'D', date_emission: '2026-04-02', date_echeance: '2026-05-02', montant_ht: '700', montant_ttc: '840', statut: 'non payée', date_paiement: '' },
  { numero: '6', client: 'E', date_emission: '2026-04-15', date_echeance: '2026-07-14', montant_ht: '100', montant_ttc: '120', statut: 'non payée', date_paiement: '' },
  { numero: '7', client: 'F', date_emission: '2026-04-20', date_echeance: '2026-05-20', montant_ht: '50', montant_ttc: '60', statut: 'non payée', date_paiement: '' },
  { numero: '8', client: 'G', date_emission: '2026-04-21', date_echeance: '2026-05-21', montant_ht: '10', montant_ttc: '12', statut: 'non payée', date_paiement: '' }
]);
var miniRef = '2026-06-01';
var mr = L.computeReporting(mini.invoices, miniRef);

test('reporting : CA HT total et nombre de factures', function () {
  assert.strictEqual(mini.invoices.length, 8);
  near(mr.caHT, 4660);
  assert.strictEqual(mr.nbFactures, 8);
});

test('reporting : CA HT par mois, mois sans facture à zéro', function () {
  assert.deepStrictEqual(mr.parMois.map(function (m) { return m.mois; }), ['2026-01', '2026-02', '2026-03', '2026-04']);
  near(mr.parMois[0].ht, 1500);
  near(mr.parMois[1].ht, 0);
  near(mr.parMois[2].ht, 2300);
  near(mr.parMois[3].ht, 860);
});

test('reporting : 5 premiers clients et part du CA', function () {
  assert.strictEqual(mr.topClients.length, 5);
  assert.deepStrictEqual(mr.topClients.map(function (c) { return c.client; }), ['B', 'A', 'D', 'C', 'E']);
  near(mr.topClients[0].part, 2000 / 4660, 1e-9);
  near(mr.topClients[1].ht, 1500);
  near(mr.topPart + mr.autresPart, 1, 1e-9);
  near(mr.autresHT, 60);
});

test('reporting : encours non payé (TTC)', function () {
  near(mr.encours, 2400 + 360 + 840 + 120 + 60 + 12);
  assert.strictEqual(mr.nbImpayees, 6);
  near(mr.encoursHT, 2000 + 300 + 700 + 100 + 50 + 10);
});

test('reporting : factures échues par ancienneté à la date de référence', function () {
  // Au 2026-06-01 : n°3 échue le 04/04 = 58 j ; n°4 échéance 19/05 = 13 j ; n°5 le 02/05 = 30 j ;
  // n°7 le 20/05 = 12 j ; n°8 le 21/05 = 11 j ; n°6 échéance 14/07 : pas encore échue.
  var t = mr.echues.tranches;
  assert.strictEqual(t[0].id, '1-30');
  assert.strictEqual(t[0].nb, 4);           // n°4, 5, 7, 8
  near(t[0].total, 360 + 840 + 60 + 12);
  assert.strictEqual(t[1].nb, 1);           // n°3 (58 jours)
  near(t[1].total, 2400);
  assert.strictEqual(t[2].nb, 0);
  assert.strictEqual(mr.echues.nb, 5);
  assert.strictEqual(mr.aEchoir.nb, 1);
  near(mr.aEchoir.total, 120);
  near(mr.echues.total + mr.aEchoir.total, mr.encours);
});

test('reporting : bornes des tranches (30, 31, 60, 61 jours)', function () {
  function inv(due) { return { client: 'X', dateEmission: '2026-01-01', dateEcheance: due, ht: 100, ttc: null, paid: false, datePaiement: null }; }
  var ref = '2026-06-30';
  var r = L.computeReporting([inv('2026-05-31'), inv('2026-05-30'), inv('2026-05-01'), inv('2026-04-30'), inv('2026-06-30'), inv('2026-07-01')], ref);
  assert.strictEqual(r.echues.tranches[0].nb, 1);   // 30 jours
  assert.strictEqual(r.echues.tranches[1].nb, 2);   // 31 et 60 jours
  assert.strictEqual(r.echues.tranches[2].nb, 1);   // 61 jours
  assert.strictEqual(r.aEchoir.nb, 2);              // échéance aujourd'hui ou demain : pas échue
});

test('reporting : délai moyen de paiement et part payée en retard', function () {
  // n°1 : 10/01 → 04/02 = 25 j (dans les temps) ; n°2 : 20/01 → 01/03 = 40 j (en retard : échéance 19/02)
  assert.strictEqual(mr.nbPayeesDatees, 2);
  near(mr.delaiMoyenPaiement, 32.5, 1e-9);
  assert.strictEqual(mr.nbPayeesEnRetard, 1);
  near(mr.partPayeesEnRetard, 0.5, 1e-9);
});

test('reporting : aucune facture payée → délai et part non définis', function () {
  var r = L.computeReporting([{ client: 'X', dateEmission: '2026-01-01', dateEcheance: '2026-02-01', ht: 10, ttc: 12, paid: false, datePaiement: null }], '2026-03-01');
  assert.strictEqual(r.delaiMoyenPaiement, null);
  assert.strictEqual(r.partPayeesEnRetard, null);
  var empty = L.computeReporting([], '2026-03-01');
  assert.strictEqual(empty.caHT, 0);
  assert.deepStrictEqual(empty.parMois, []);
});

test('normalizeInvoices : lignes illisibles ignorées, avertissements comptés', function () {
  var n = L.normalizeInvoices([
    { client: 'A', date_emission: '2026-01-10', date_echeance: '', montant_ht: '10', statut: 'payée', date_paiement: '' },
    { client: 'B', date_emission: 'n/a', date_echeance: '2026-01-10', montant_ht: '10', statut: 'payée' },
    { client: 'C', date_emission: '10/01/2026', date_echeance: '10/02/2026', montant_ht: '1 000,50', statut: 'non payée' }
  ]);
  assert.strictEqual(n.invoices.length, 2);
  assert.strictEqual(n.warnings.ignorees, 1);
  assert.strictEqual(n.warnings.sansEcheance, 1);
  assert.strictEqual(n.warnings.payeesSansDate, 1);
  assert.strictEqual(n.warnings.sansTTC, 2);
  assert.strictEqual(n.invoices[1].ht, 1000.5);
  assert.strictEqual(n.invoices[1].dateEcheance, '2026-02-10');
});

/* ---------- Indicateurs sur l'export fictif ---------- */

var exportN = L.normalizeInvoices(D.exportFacturation);
var rep = L.computeReporting(exportN.invoices, D.referenceDate);

test('data.js : export d\'environ 150 factures, 10 clients, 12 mois, statuts cohérents', function () {
  assert.strictEqual(D.exportFacturation.length, 150);
  assert.strictEqual(exportN.invoices.length, 150);
  assert.strictEqual(exportN.warnings.ignorees, 0);
  assert.strictEqual(rep.nbClients, 10);
  assert.strictEqual(rep.parMois.length, 12);
  assert.strictEqual(rep.parMois[0].mois, '2025-10');
  assert.strictEqual(rep.parMois[11].mois, '2026-09');
  D.exportFacturation.forEach(function (f) {
    assert.ok(/^F-\d{4}$/.test(f.numero));
    assert.ok(f.date_echeance > f.date_emission);
    if (f.statut === 'payée') assert.ok(f.date_paiement && f.date_paiement >= f.date_emission && f.date_paiement <= D.referenceDate);
    else assert.strictEqual(f.date_paiement, '');
  });
});

test('data.js : déterministe (deux chargements identiques)', function () {
  delete require.cache[require.resolve('../js/data.js')];
  var D2 = require('../js/data.js');
  assert.deepStrictEqual(D2.exportFacturation, D.exportFacturation);
  assert.deepStrictEqual(D2.tiers, D.tiers);
});

test('indicateurs sur l\'export fictif : cohérence interne', function () {
  near(rep.parMois.reduce(function (s, m) { return s + m.ht; }, 0), rep.caHT, 0.011);
  near(rep.topClients.reduce(function (s, c) { return s + c.ht; }, 0) + rep.autresHT, rep.caHT, 0.011);
  near(rep.topPart + rep.autresPart, 1, 1e-9);
  near(rep.echues.total + rep.aEchoir.total, rep.encours, 0.011);
  assert.strictEqual(rep.echues.tranches.reduce(function (s, t) { return s + t.nb; }, 0), rep.echues.nb);
  assert.strictEqual(rep.echues.nb + rep.aEchoir.nb, rep.nbImpayees);
  assert.strictEqual(rep.nbImpayees + rep.nbPayeesDatees, 150);
  for (var i = 1; i < rep.topClients.length; i++) assert.ok(rep.topClients[i - 1].ht >= rep.topClients[i].ht);
});

test('indicateurs sur l\'export fictif : recalcul indépendant du CA, de l\'encours et des retards', function () {
  var ht = 0, enc = 0, late = 0, paid = 0, delay = 0;
  D.exportFacturation.forEach(function (f) {
    ht += Math.round(parseFloat(f.montant_ht) * 100);
    if (f.statut !== 'payée') enc += Math.round(parseFloat(f.montant_ttc) * 100);
    else {
      paid++;
      delay += (Date.parse(f.date_paiement) - Date.parse(f.date_emission)) / 86400000;
      if (f.date_paiement > f.date_echeance) late++;
    }
  });
  near(rep.caHT, ht / 100, 0.011);
  near(rep.encours, enc / 100, 0.011);
  assert.strictEqual(rep.nbPayeesEnRetard, late);
  assert.strictEqual(rep.nbPayeesDatees, paid);
  near(rep.delaiMoyenPaiement, delay / paid, 0.051);
  assert.ok(rep.caHT > 0 && rep.nbImpayees > 0 && rep.echues.nb > 0);
  // Les trois tranches de retard existent dans les données fictives
  rep.echues.tranches.forEach(function (t) { assert.ok(t.nb > 0, t.id); });
});

/* ---------- Mentions des factures ---------- */

function byId(res, id) { return res.items.filter(function (x) { return x.id === id; })[0]; }

test('data.js : 3 factures fictives', function () {
  assert.strictEqual(D.factures.length, 3);
});

test('mentions : facture 1, aucune mention absente parmi celles contrôlées', function () {
  var r = L.checkInvoiceMentions(D.factures[0]);
  assert.strictEqual(r.aucunPoint, true);
  assert.strictEqual(r.nouvelles.total, 3);           // l'adresse de livraison est sans objet
  assert.strictEqual(r.nouvelles.ok, 3);
  assert.strictEqual(byId(r, 'adresse_livraison').statut, 'na');
  assert.strictEqual(r.classiques.ok, r.classiques.total);
  assert.strictEqual(r.items.filter(function (x) { return x.groupe === 'nouvelle'; }).length, 4);
});

test('mentions : facture 2, SIREN client et nature de l\'opération manquants', function () {
  var r = L.checkInvoiceMentions(D.factures[1]);
  assert.strictEqual(byId(r, 'siren_client').statut, 'manquant');
  assert.strictEqual(byId(r, 'nature_operation').statut, 'manquant');
  assert.strictEqual(byId(r, 'option_debits').statut, 'ok');
  assert.strictEqual(r.aucunPoint, false);
  assert.strictEqual(r.nouvelles.ok, 1);
});

test('mentions : facture 3, adresse de livraison et option débits manquantes', function () {
  var r = L.checkInvoiceMentions(D.factures[2]);
  assert.strictEqual(byId(r, 'adresse_livraison').statut, 'manquant');
  assert.strictEqual(byId(r, 'option_debits').statut, 'a_verifier');
  assert.strictEqual(byId(r, 'siren_client').statut, 'ok');
  assert.strictEqual(byId(r, 'nature_operation').statut, 'ok');
  assert.strictEqual(r.nouvelles.total, 4);
  assert.strictEqual(r.nouvelles.ok, 2);
});

test('mentions : liste courante marquée non exhaustive, mentions attendues présentes', function () {
  var r = L.checkInvoiceMentions(D.factures[0]);
  assert.ok(/non exhaustive/i.test(r.noteClassiques));
  ['numero', 'date_emission', 'vendeur_identite', 'vendeur_siren', 'vendeur_tva', 'designation', 'quantite',
    'pu_ht', 'taux_tva', 'montant_tva', 'total_ttc', 'date_echeance'].forEach(function (id) {
    assert.ok(byId(r, id), id);
    assert.strictEqual(byId(r, id).groupe, 'classique');
  });
});

test('mentions : SIREN client invalide → à vérifier ; TVA vendeur incohérente → à vérifier', function () {
  var inv = JSON.parse(JSON.stringify(D.factures[0]));
  inv.client.siren = '123456783';
  inv.vendeur.tva = 'FR00' + inv.vendeur.siren;
  var r = L.checkInvoiceMentions(inv);
  assert.strictEqual(byId(r, 'siren_client').statut, 'a_verifier');
  assert.strictEqual(byId(r, 'vendeur_tva').statut, 'a_verifier');
  inv.lignes[0].designation = '';
  inv.numero = '';
  var r2 = L.checkInvoiceMentions(inv);
  assert.strictEqual(byId(r2, 'designation').statut, 'manquant');
  assert.strictEqual(byId(r2, 'numero').statut, 'manquant');
});

/* ---------- Fichiers de la démo : contraintes de contenu ---------- */

function readAll(file) { return H.lire(file); }
function toutLeCode() { return H.fichiersApp().map(readAll).join(String.fromCharCode(10)); }

test('hors ligne : aucun appel réseau ni ressource distante dans les fichiers de l\'outil', function () {
  H.fichiersApp().forEach(function (f) {
    var t = readAll(f);
    assert.ok(!/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|import\s*\(/.test(t), f + ' : appel réseau');
    assert.ok(!/(src|href)\s*=\s*["']https?:/i.test(t), f + ' : ressource distante');
    assert.ok(!/@import|url\(\s*["']?https?:/i.test(t), f + ' : CSS distant');
  });
  assert.ok(!/type\s*=\s*["']module["']/.test(readAll('index.html')), 'modules ES');
});

test('contenu : aucune mention interdite dans les fichiers de l\'outil', function () {
  var forbidden = /actuar|cyber|stage|employeur|garantie de conformit|100 ?% conforme/i;
  H.fichiersApp().concat(['README.md', 'script-demo.md', 'GUIDE-LIVRAISON.md']).forEach(function (f) {
    if (!fs.existsSync(path.join(__dirname, '..', f))) return;
    var m = forbidden.exec(readAll(f));
    assert.ok(!m, f + ' contient : ' + (m && m[0]));
  });
});

test('contenu : bandeau fictif, avertissement fiscal et limite du registre présents', function () {
  var html = toutLeCode();
  assert.ok(/Données fictives de démonstration/.test(html));
  assert.ok(/ne constitue pas un conseil fiscal/.test(html));
  assert.ok(/registre/.test(html));
  assert.ok(/Charger votre propre fichier \(CSV\)/.test(html));
  assert.ok(/rien n'est envoyé/.test(html));
});

test('isFrance : FR, FRA, France, vide acceptés ; BE refusé', function () {
  ['', 'FR', 'fra', 'France'].forEach(function (p) { assert.strictEqual(L.isFrance(p), true, p); });
  assert.strictEqual(L.isFrance('BE'), false);
});

