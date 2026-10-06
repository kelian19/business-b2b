/* Génère, de façon déterministe, les CSV d'essai sous tests/fixtures/ (pour les tests Node et pour browser_file_upload).
 * Aucun fichier volumineux n'est versionné : les gros fichiers (10 000 tiers, 50 000 lignes) sont créés à la demande
 *   node livrables/outil-equerre/tests/make-fixtures.js --gros
 * Toutes les données sont fictives. */
'use strict';

var fs = require('fs');
var path = require('path');
var L = require('../js/core/logic.js');
var D = require('../js/data.js');

var DIR = path.join(__dirname, 'fixtures');

function luhnSiren(base8) {
  for (var d = 0; d < 10; d++) { if (L.luhnValid(base8 + d)) return base8 + d; }
  return null;
}

function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** n tiers fictifs (texte CSV, séparateur « ; »). Un tiers sur 9 sans SIREN, sur 13 avec SIREN invalide, sur 40 en doublon. */
function genererTiers(n, seed) {
  var r = rng(seed || 4242);
  var lignes = [L.TIERS_HEADERS.join(';')];
  var precedent = null;
  for (var i = 0; i < n; i++) {
    var siren = luhnSiren(String(10000000 + Math.floor(r() * 89999999)));
    var nom = 'Tiers Fictif ' + (i + 1) + ' SAS';
    if (i % 40 === 37 && precedent) { siren = precedent.siren; nom = 'Tiers Fictif ' + i + ' SARL'; }
    var cp = String(10000 + Math.floor(r() * 85000));
    var row = {
      type: i % 4 === 3 ? 'fournisseur' : 'client', nom: nom, siren: siren, siret: '', tva: L.expectedTva(siren),
      adresse: (1 + (i % 90)) + ' rue de l\'Essai', code_postal: cp, ville: 'Ville ' + (i % 300), pays: 'FR',
      livraison_adresse: '', livraison_code_postal: '', livraison_ville: ''
    };
    if (i % 9 === 8) { row.siren = ''; row.tva = ''; }
    else if (i % 13 === 12) row.siren = row.siren.slice(0, 8) + ((+row.siren[8] + 1) % 10);
    if (i % 17 === 16) row.code_postal = '';
    precedent = { siren: siren };
    lignes.push(L.TIERS_HEADERS.map(function (h) { return row[h]; }).join(';'));
  }
  return lignes.join('\r\n') + '\r\n';
}

/** n lignes de factures fictives (5 lignes environ par facture). */
function genererLignes(n, seed) {
  var r = rng(seed || 777);
  var entetes = IK_ENTETES_LIGNES();
  var out = [entetes.join(';')];
  for (var i = 0; i < n; i++) {
    var facture = 1 + Math.floor(i / 5);
    var client = 'Client Fictif ' + (facture % 2500);
    var liv = facture % 7 === 0;
    out.push([
      'F-' + facture, client, '', liv ? (1 + (facture % 50)) + ' avenue du Fret' : '', liv ? '13016' : '', liv ? 'Marseille' : '', liv ? 'oui' : 'non',
      facture % 11 === 0 ? '' : 'Livraison de biens', facture % 5 === 0 ? '' : 'Option pour le paiement de la TVA d\'après les débits : oui',
      'Article ' + (i % 400), String(1 + Math.floor(r() * 9)), (10 + Math.floor(r() * 900)) + ',50', '20'
    ].join(';'));
  }
  return out.join('\r\n') + '\r\n';
}

function IK_ENTETES_LIGNES() { return L.KINDS.lignes.entetes; }

/** Factures fictives (export de ventes) : n factures. */
function genererFactures(n, seed) {
  var r = rng(seed || 99);
  var out = [L.FACTURES_HEADERS.join(';')];
  for (var i = 0; i < n; i++) {
    var jour = 1 + (i % 28);
    var mois = 1 + (i % 12);
    var ht = (50 + Math.floor(r() * 5000)) + ',00';
    var payee = i % 3 !== 0;
    out.push([
      'F-' + (i + 1), 'Client Fictif ' + (i % 2500), '2026-' + L.pad(mois, 2) + '-' + L.pad(jour, 2), '2026-' + L.pad(mois, 2) + '-' + L.pad(Math.min(28, jour + 0), 2),
      ht, '', payee ? 'payée' : 'non payée', payee ? '2026-' + L.pad(mois, 2) + '-' + L.pad(Math.min(28, jour), 2) : ''
    ].join(';'));
  }
  return out.join('\r\n') + '\r\n';
}

function ecrire(nom, contenu) {
  fs.writeFileSync(path.join(DIR, nom), contenu);
}

function bufUtf16(texte, bom) {
  var buf = Buffer.alloc((texte.length + (bom ? 1 : 0)) * 2);
  var k = 0;
  if (bom) { buf.writeUInt16LE(0xFEFF, 0); k = 2; }
  for (var i = 0; i < texte.length; i++) { buf.writeUInt16LE(texte.charCodeAt(i), k + 2 * i); }
  return buf;
}

/** Dossier client fictif (tiers et factures importés) pour les essais du mode cabinet. Données entièrement inventées. */
function dossierCabinet(nom, id, tiersTexte, facturesTexte, org) {
  var T0 = '2026-10-06T08:00:00.000Z';
  var d = L.creerDossier({ nom: nom, secteur: 'Services aux entreprises (exemple fictif)', taille: '20-49' }, { maintenant: T0, id: id });
  function table(texte, kind) {
    var p = L.parseCsv(texte);
    var t = L.tableDepuisParse(p, L.suggestMapping(p.headers, kind).mapping, { nomFichier: kind + '.csv', encodage: 'UTF-8', maintenant: T0 });
    L.finaliserTable(t, L.evaluerTable(t, kind), kind);
    return t;
  }
  if (tiersTexte) d.donnees.tiers = table(tiersTexte, 'tiers');
  if (facturesTexte) d.donnees.factures = table(facturesTexte, 'factures');
  d.refDate = '2026-10-06';
  Object.keys(org || {}).forEach(function (k) { d.organisation[k] = org[k]; });
  return d;
}

function genererDossiersCabinet() {
  var T0 = '2026-10-06T08:00:00.000Z';
  var tiersA = 'nom;siren;ville;code_postal;adresse\r\nAtelier Fictif Un SAS;123456782;Lyon;69003;1 rue Exemple\r\nBureau Fictif Deux SARL;732829320;Lille;59000;2 rue Exemple\r\nCommerce Fictif Trois SAS;;Nantes;44000;3 rue Exemple\r\n';
  var factA = 'numero;client;date_emission;date_echeance;montant_ht;montant_ttc;statut;date_paiement\r\nF-A1;Atelier Fictif Un SAS;2026-09-02;2026-10-02;1000;1200;non payée;\r\nF-A2;Commerce Fictif Trois SAS;2026-08-12;2026-09-11;500;600;non payée;\r\nF-A3;Bureau Fictif Deux SARL;2026-07-01;2026-07-31;300;360;payée;2026-07-20\r\n';
  var tiersB = 'nom;siren;ville;code_postal;adresse\r\nGarage Fictif Alpha SARL;123456782;Lyon;69003;1 rue Exemple\r\nGarage Fictif Beta SARL;732829320;Lille;59000;2 rue Exemple\r\n';
  var factB = 'numero;client;date_emission;date_echeance;montant_ht;montant_ttc;statut;date_paiement\r\nF-B1;Garage Fictif Alpha SARL;2026-09-02;2026-10-02;800;960;non payée;\r\nF-B2;Garage Fictif Beta SARL;2026-09-10;2026-10-10;200;240;non payée;\r\n';
  var a = dossierCabinet('Cabinet Fictif Client A SAS', 'cab-a', tiersA, factA, { plateforme: 'oui', responsable: 'oui', logiciel: 'nsp', procedure: 'non' });
  var b = dossierCabinet('=1+1 Client Fictif B SARL', 'cab-b', tiersB, factB, { plateforme: 'non', responsable: 'non', logiciel: 'oui', procedure: 'oui' });
  a.plan.siren = { responsable: 'Comptabilité', statut: 'en_cours', echeance: null };
  ecrire('cabinet-demo.equerre.json', L.serialiserDossier(L.dossierDemo(D, { maintenant: T0 })));
  ecrire('cabinet-client-a.equerre.json', L.serialiserDossier(a));
  ecrire('cabinet-client-b.equerre.json', L.serialiserDossier(b));
  ecrire('cabinet-invalide.equerre.json', '{"format":"autre-chose","schemaVersion":1}');
  ecrire('cabinet-pas-json.equerre.json', 'ceci n\'est pas du JSON');
  return { a: a, b: b };
}

function generer(opts) {
  fs.mkdirSync(DIR, { recursive: true });
  var tiers3 = 'nom;siren;ville\r\nAtelier Fictif Un SAS;123456782;Lyon\r\nBureau Fictif Deux SARL;732829320;Lille\r\n';
  ecrire('vide.csv', '');
  ecrire('entete-seul.csv', 'nom;siren;ville\r\n');
  ecrire('point-virgule.csv', tiers3);
  ecrire('virgule.csv', tiers3.replace(/;/g, ','));
  ecrire('tabulation.csv', tiers3.replace(/;/g, '\t'));
  ecrire('bom.csv', Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(tiers3, 'utf8')]));
  // Windows-1252 : « é » = 0xE9, « € » = 0x80
  ecrire('windows-1252.csv', Buffer.from([
    0x6E, 0x6F, 0x6D, 0x3B, 0x73, 0x69, 0x72, 0x65, 0x6E, 0x3B, 0x76, 0x69, 0x6C, 0x6C, 0x65, 0x0D, 0x0A,       // nom;siren;ville
    0x43, 0x61, 0x66, 0xE9, 0x20, 0x80, 0x20, 0x53, 0x41, 0x53, 0x3B, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x32, 0x3B, 0x4E, 0xEE, 0x6D, 0x65, 0x73, 0x0D, 0x0A  // Café € SAS;123456782;Nîmes
  ]));
  ecrire('utf16.csv', bufUtf16(tiers3, true));
  ecrire('guillemets-multilignes.csv', Buffer.from('nom;siren;ville\r\n"Société ""Fictive""; Un\r\nsecond ligne";123456782;Lyon\r\nAutre SAS;732829320;Lille\r\n', 'utf8'));
  ecrire('colonne-manquante.csv', 'nom;ville\r\nAtelier Fictif Un SAS;Lyon\r\n');
  ecrire('separateur-inconnu.csv', 'nom|siren|ville\r\nAtelier Fictif Un SAS|123456782|Lyon\r\n');
  ecrire('faux-xlsx.xlsx', Buffer.concat([Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]), Buffer.from('contenu binaire fictif', 'utf8')]));
  ecrire('accents-mal-encodes.csv', Buffer.from('nom;siren;ville\r\nSoci�t� Fictive SAS;123456782;N�mes\r\n', 'utf8'));
  ecrire('tiers-fictif.csv', Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(L.toCsv(L.TIERS_HEADERS, D.tiers), 'utf8')]));
  ecrire('factures-fictif.csv', Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(L.toCsv(L.FACTURES_HEADERS, D.exportFacturation), 'utf8')]));
  var lignesRows = [];
  D.factures.forEach(function (f) {
    f.lignes.forEach(function (l) {
      lignesRows.push([f.numero, f.client.nom, f.client.siren, f.livraisonDifferente ? f.adresseLivraison : '', '', '', f.livraisonDifferente ? 'oui' : 'non',
        f.natureOperation, f.optionDebits, l.designation, l.quantite, String(l.prixUnitaireHT).replace('.', ','), l.tauxTVA]);
    });
  });
  ecrire('lignes-fictif.csv', Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(L.toCsv(L.KINDS.lignes.entetes, lignesRows), 'utf8')]));
  var reg = [];
  D.tiers.slice(0, 8).forEach(function (t, i) {
    if (!L.cleanId(t.siren)) return;
    // ligne 3 : entreprise cessée ; ligne 4 : dénomination différente au registre (écart de nom à vérifier)
    reg.push([L.cleanId(t.siren), i === 3 ? 'etat_cesse' : 'trouve', i === 4 ? 'Ébénisterie Echo et Fils' : t.nom, i === 3 ? 'cessée' : 'active', t.adresse, t.code_postal, t.ville, '2026-10-05']);
  });
  ecrire('registre-fictif.csv', Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(L.toCsv(L.KINDS.registre.entetes, reg), 'utf8')]));
  // Date « série » de tableur (nombre pur) dans un export de factures
  ecrire('factures-date-serie.csv', 'numero;client;date_emission;date_echeance;montant_ht;montant_ttc;statut;date_paiement\r\nF-1;Client Fictif A;45000;2026-02-01;100;120;non payée;\r\nF-2;Client Fictif B;2026-01-10;2026-02-09;200;240;non payée;\r\n;;;;;;;\r\nF-4;;2026-01-10;2026-02-09;5;6;payée;2026-01-20\r\nF-5;Client Fictif C;n/a;2026-02-09;5;6;payée;2026-01-20\r\n');
  genererDossiersCabinet();
  if (opts && opts.gros) {
    fs.mkdirSync(path.join(DIR, 'gros'), { recursive: true });
    fs.writeFileSync(path.join(DIR, 'gros', 'tiers-10000.csv'), genererTiers(10000));
    fs.writeFileSync(path.join(DIR, 'gros', 'lignes-50000.csv'), genererLignes(50000));
    fs.writeFileSync(path.join(DIR, 'gros', 'factures-10000.csv'), genererFactures(10000));
  }
  return DIR;
}

module.exports = { dossierCabinet: dossierCabinet, genererDossiersCabinet: genererDossiersCabinet, generer: generer, genererTiers: genererTiers, genererLignes: genererLignes, genererFactures: genererFactures, DIR: DIR };

if (require.main === module) {
  var d = generer({ gros: process.argv.indexOf('--gros') >= 0 });
  console.log('Fixtures écrites dans ' + d);
}
