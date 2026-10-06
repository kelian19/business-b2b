/* Tests du module D (modèles de factures guidés, contrôle automatique des lignes de factures) et du module E (organisation). */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var fs = H.fs;
var path = H.path;
var L = require('../js/core/logic.js');
var D = require('../js/data.js');

function demo() { return L.dossierDemo(D, { maintenant: '2026-10-06T10:00:00.000Z' }); }
function neuf() { return L.creerDossier({ nom: 'Client essai', taille: '50-99' }, { maintenant: '2026-10-06T10:00:00.000Z', id: 'dtest' }); }
function modeleAvec(statuts) {
  var m = L.modeleVide('g1', 'Modèle');
  Object.keys(statuts).forEach(function (id) { L.majControle(m, id, { statut: statuts[id] }); });
  return m;
}

/* ---------- Liste de mentions ---------- */

test('mentions : 4 nouvelles mentions puis 12 mentions courantes, liste non exhaustive', function () {
  assert.deepStrictEqual(L.LISTE_NOUVELLES.map(function (m) { return m.id; }), ['siren_client', 'adresse_livraison', 'nature_operation', 'option_debits']);
  assert.strictEqual(L.LISTE_COURANTES.length, 12);
  assert.strictEqual(L.LISTE_MODELE.length, 16);
  assert.ok(/non exhaustive/.test(L.NOTE_NON_EXHAUSTIVE));
  assert.ok(/pas un avis de conformité/.test(L.NOTE_NON_EXHAUSTIVE));
});

test('mentions : la liste du modèle guidé reprend exactement les identifiants et libellés du contrôle de facture', function () {
  var items = L.checkInvoiceMentions(D.factures[0]).items;
  assert.deepStrictEqual(items.map(function (x) { return x.id + ':' + x.label; }), L.LISTE_MODELE.map(function (x) { return x.id + ':' + x.label; }));
  assert.deepStrictEqual(items.map(function (x) { return x.groupe; }), L.LISTE_MODELE.map(function (x) { return x.groupe; }));
});

test('mentions : le contrôle de présence existant est conservé (3 sur 3, 1 sur 3, 2 sur 4)', function () {
  var r = D.factures.map(function (f) { var c = L.checkInvoiceMentions(f).nouvelles; return c.ok + '/' + c.total; });
  assert.deepStrictEqual(r, ['3/3', '1/3', '2/4']);
});

test('mentions : cinq statuts et libellés', function () {
  assert.deepStrictEqual(L.STATUTS_CONTROLE, ['present', 'absent', 'a_verifier', 'sans_objet', 'non_controle']);
  assert.strictEqual(L.STATUT_LIBELLES.absent, 'Manquant');
  assert.strictEqual(L.STATUT_LIBELLES.non_controle, 'Non contrôlé');
  assert.strictEqual(L.mentionDe('siren_client').label, 'SIREN du client');
  assert.strictEqual(L.mentionDe('inconnue'), null);
});

/* ---------- Comptes par modèle et cumulés ---------- */

test('comptes : dossier démo, 3 modèles à 3/3, 1/3 et 2/4 et cumul 6 sur 10', function () {
  var c = L.compterModeles(demo().modeles);
  assert.deepStrictEqual(c.parModele.map(function (m) { return m.nouvelles.ok + '/' + m.nouvelles.total; }), ['3/3', '1/3', '2/4']);
  assert.deepStrictEqual(c.cumule.nouvelles, { ok: 6, total: 10 });
  assert.deepStrictEqual(c.cumule.courantes, { ok: 36, total: 36 });
  assert.deepStrictEqual(c.parModele.map(function (m) { return m.id; }), ['m1', 'm2', 'm3']);
});

test('comptes : 6 sur 10 donnent 60 % (valeur utilisée par l\'indice)', function () {
  var n = L.compterModeles(demo().modeles).cumule.nouvelles;
  assert.strictEqual(100 * n.ok / n.total, 60);
});

test('comptes : un modèle neuf est non contrôlé (0 sur 0), sans division', function () {
  var c = L.compterModele(neuf().modeles[0]);
  assert.deepStrictEqual(c.nouvelles, { ok: 0, total: 0 });
  assert.deepStrictEqual(c.courantes, { ok: 0, total: 0 });
});

test('comptes : manquant et à vérifier comptent dans le total, sans objet et non contrôlé sont écartés', function () {
  var m = modeleAvec({ siren_client: 'present', adresse_livraison: 'sans_objet', nature_operation: 'absent', option_debits: 'a_verifier' });
  assert.deepStrictEqual(L.compterModele(m).nouvelles, { ok: 1, total: 3 });
  var n = modeleAvec({ siren_client: 'present', nature_operation: 'non_controle' });
  assert.deepStrictEqual(L.compterModele(n).nouvelles, { ok: 1, total: 1 });
});

test('comptes : les mentions courantes sont comptées à part des 4 nouvelles', function () {
  var m = modeleAvec({ numero: 'present', date_emission: 'absent', siren_client: 'present' });
  var c = L.compterModele(m);
  assert.deepStrictEqual(c.nouvelles, { ok: 1, total: 1 });
  assert.deepStrictEqual(c.courantes, { ok: 1, total: 2 });
});

test('comptes : cumul de plusieurs modèles guidés', function () {
  var a = modeleAvec({ siren_client: 'present', nature_operation: 'present' });
  var b = modeleAvec({ siren_client: 'absent', nature_operation: 'present', option_debits: 'present' });
  var c = L.compterModeles([a, b]);
  assert.deepStrictEqual(c.cumule.nouvelles, { ok: 4, total: 5 });
  assert.strictEqual(L.compterModeles([]).cumule.nouvelles.total, 0);
});

/* ---------- Modèles : ajout, suppression, limites ---------- */

test('modèles : 1 à 5 modèles, ajout jusqu\'à 5 puis refus avec message', function () {
  var d = neuf();
  for (var i = 0; i < 4; i++) assert.strictEqual(L.ajouterModele(d.modeles, null).ok, true);
  assert.strictEqual(d.modeles.length, 5);
  var r = L.ajouterModele(d.modeles, 'de trop');
  assert.strictEqual(r.ok, false);
  assert.ok(/Cinq modèles au maximum/.test(r.message));
  assert.strictEqual(d.modeles.length, 5);
  assert.strictEqual(L.CONST.MAX_MODELES, 5);
});

test('modèles : identifiants uniques, réutilisables après suppression, noms par défaut', function () {
  var d = neuf();
  var a = L.ajouterModele(d.modeles).modele;
  var b = L.ajouterModele(d.modeles).modele;
  assert.deepStrictEqual([a.id, b.id], ['g1', 'g2']);
  assert.strictEqual(a.nom, 'Modèle 2');
  L.supprimerModele(d.modeles, 'g1');
  assert.strictEqual(L.ajouterModele(d.modeles).modele.id, 'g1');
  assert.strictEqual(new Set(d.modeles.map(function (m) { return m.id; })).size, d.modeles.length);
});

test('modèles : on supprime jusqu\'à un seul modèle, jamais zéro', function () {
  var d = neuf();
  L.ajouterModele(d.modeles);
  assert.strictEqual(L.supprimerModele(d.modeles, 'g1').ok, true);
  assert.strictEqual(d.modeles.length, 1);
  var r = L.supprimerModele(d.modeles, 'm1');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(d.modeles.length, 1);
  assert.strictEqual(L.supprimerModele(d.modeles, 'zzz').ok, false);
});

test('modèles : renommer (nom vide refusé, longueur limitée à 60)', function () {
  var d = neuf();
  assert.strictEqual(L.renommerModele(d.modeles, 'm1', '   ').ok, false);
  assert.strictEqual(L.renommerModele(d.modeles, 'm1', 'Facture Pro').ok, true);
  assert.strictEqual(d.modeles[0].nom, 'Facture Pro');
  L.renommerModele(d.modeles, 'm1', new Array(80).join('a'));
  assert.strictEqual(d.modeles[0].nom.length, 60);
  assert.strictEqual(L.renommerModele(d.modeles, 'x', 'a').ok, false);
});

test('modèles : le dossier démo contient 3 modèles issus des 3 factures, avec leurs 16 contrôles', function () {
  var d = demo();
  assert.strictEqual(d.modeles.length, 3);
  d.modeles.forEach(function (m) { assert.strictEqual(Object.keys(m.controles).length, 16); });
  assert.strictEqual(d.modeles[1].controles.siren_client.statut, 'absent');
  assert.strictEqual(d.modeles[0].controles.adresse_livraison.statut, 'sans_objet');
});

/* ---------- Saisie des contrôles : statut, preuve, note ---------- */

test('contrôle : saisie d\'une preuve et d\'une note, statut inchangé', function () {
  var m = L.modeleVide('g1', 'M');
  assert.strictEqual(L.majControle(m, 'siren_client', { preuve: 'page 1', note: 'à confirmer' }).ok, true);
  assert.deepStrictEqual(m.controles.siren_client, { statut: 'non_controle', preuve: 'page 1', note: 'à confirmer' });
  L.majControle(m, 'siren_client', { statut: 'present' });
  assert.deepStrictEqual(m.controles.siren_client, { statut: 'present', preuve: 'page 1', note: 'à confirmer' });
});

test('contrôle : statut inconnu, mention inconnue, preuve de plus de 200 caractères et note de plus de 300 refusées', function () {
  var m = L.modeleVide('g1', 'M');
  assert.strictEqual(L.majControle(m, 'siren_client', { statut: 'ok' }).ok, false);
  assert.strictEqual(L.majControle(m, 'inconnue', { statut: 'present' }).ok, false);
  assert.strictEqual(L.majControle(m, 'siren_client', { preuve: new Array(202).join('a') }).ok, false);
  assert.strictEqual(L.majControle(m, 'siren_client', { preuve: new Array(201).join('a') }).ok, true);
  assert.strictEqual(L.majControle(m, 'siren_client', { note: new Array(303).join('a') }).ok, false);
  assert.strictEqual(L.majControle(m, 'siren_client', { note: new Array(301).join('a') }).ok, true);
});

test('contrôle : un refus ne modifie pas le modèle', function () {
  var m = L.modeleVide('g1', 'M');
  L.majControle(m, 'nature_operation', { statut: 'present', preuve: 'a' });
  var avant = JSON.stringify(m);
  L.majControle(m, 'nature_operation', { statut: 'nimporte', preuve: 'b' });
  assert.strictEqual(JSON.stringify(m), avant);
});

test('contrôle : la saisie ne se transforme jamais en HTML (texte brut conservé tel quel)', function () {
  var m = L.modeleVide('g1', 'M');
  L.majControle(m, 'siren_client', { note: '<img src=x onerror=alert(1)>' });
  assert.strictEqual(m.controles.siren_client.note, '<img src=x onerror=alert(1)>');
});

test('dossier : modèles, preuves et notes survivent à l\'enregistrement et à la réouverture du .json', function () {
  var d = neuf();
  L.ajouterModele(d.modeles, 'Facture export');
  L.majControle(d.modeles[1], 'siren_client', { statut: 'present', preuve: 'capture 3', note: 'ok' });
  var v = L.validateDossier(JSON.parse(L.serialiserDossier(d)));
  assert.strictEqual(v.ok, true, v.erreurs.join(' | '));
  assert.deepStrictEqual(v.dossier.modeles, d.modeles);
});

test('dossier : six modèles, statut inconnu ou preuve trop longue refusés à l\'ouverture', function () {
  var d = neuf();
  for (var i = 0; i < 4; i++) L.ajouterModele(d.modeles);
  var json = JSON.parse(L.serialiserDossier(d));
  json.modeles.push({ id: 'g9', nom: 'sixième', controles: {} });
  assert.strictEqual(L.validateDossier(json).ok, false);
  var j2 = JSON.parse(L.serialiserDossier(neuf()));
  j2.modeles[0].controles = { siren_client: { statut: 'bof', preuve: '', note: '' } };
  assert.strictEqual(L.validateDossier(j2).ok, false);
  var j3 = JSON.parse(L.serialiserDossier(neuf()));
  j3.modeles[0].controles = { siren_client: { statut: 'present', preuve: new Array(250).join('a'), note: '' } };
  assert.strictEqual(L.validateDossier(j3).ok, false);
});

/* ---------- Contrôle automatique des lignes de factures ---------- */

function ligne(over) {
  var r = { ligne: 2, numero: 'F-1', client: 'Client Un', sirenClient: '844083246', livraisonAdresse: '', livraisonCodePostal: '', livraisonVille: '',
    livraisonDifferente: false, natureOperation: 'Livraison de biens', optionDebits: 'oui', designation: 'x', quantite: 1, prixUnitaireHT: 1, tauxTVA: 20 };
  Object.keys(over || {}).forEach(function (k) { r[k] = over[k]; });
  return r;
}
var TOUTES = ['siren_client', 'livraison_adresse', 'livraison_differente', 'nature_operation', 'option_tva_debits'];
function statuts(over) { var c = L.controlerLignes([ligne(over)], { colonnes: TOUTES }); return c.facturesConcernees.length ? c.facturesConcernees[0].mentions : null; }

function lignesFixture() {
  var txt = fs.readFileSync(path.join(__dirname, 'fixtures', 'lignes-fictif.csv'), 'utf8').replace(/^﻿/, '');
  var cm = L.canonicalizeCsv(L.parseCsv(txt), 'lignes');
  return { recs: cm.records.map(function (r, i) { return L.KINDS.lignes.normaliser(r, i + 2).valeur; }), colonnes: cm.columns };
}

test('lignes : la fixture donne, par mention, présent / manquant / à vérifier / sans objet', function () {
  var f = lignesFixture();
  var c = L.controlerLignes(f.recs, { colonnes: f.colonnes });
  assert.strictEqual(c.nbFactures, 3);
  assert.deepStrictEqual(c.parMention.siren_client, { present: 2, manquant: 1, aVerifier: 0, sansObjet: 0, controle: true });
  assert.deepStrictEqual(c.parMention.adresse_livraison, { present: 0, manquant: 1, aVerifier: 0, sansObjet: 2, controle: true });
  assert.deepStrictEqual(c.parMention.nature_operation, { present: 2, manquant: 1, aVerifier: 0, sansObjet: 0, controle: true });
  assert.deepStrictEqual(c.parMention.option_debits, { present: 2, manquant: 0, aVerifier: 1, sansObjet: 0, controle: true });
});

test('lignes : même résultat que le contrôle de présence des 3 factures (6 présentes sur 10 contrôlées)', function () {
  var f = lignesFixture();
  var c = L.controlerLignes(f.recs, { colonnes: f.colonnes });
  assert.strictEqual(c.ok, 6);
  assert.strictEqual(c.total, 10);
  assert.strictEqual(c.taux, 0.6);
});

test('lignes : liste des factures concernées (celles qui ont une mention manquante ou à vérifier)', function () {
  var f = lignesFixture();
  var c = L.controlerLignes(f.recs, { colonnes: f.colonnes });
  assert.deepStrictEqual(c.facturesConcernees.map(function (x) { return x.numero; }), ['F-DEMO-002', 'F-DEMO-003']);
  assert.strictEqual(c.nbConcernees, 2);
  assert.strictEqual(c.facturesConcernees[0].mentions.siren_client, 'manquant');
  assert.strictEqual(c.facturesConcernees[1].mentions.option_debits, 'a_verifier');
});

test('lignes : adresse de livraison identique à la facturation : sans objet', function () {
  var c = L.controlerLignes([ligne({ livraisonDifferente: false })], { colonnes: TOUTES });
  assert.strictEqual(c.parMention.adresse_livraison.sansObjet, 1);
  assert.strictEqual(c.nbConcernees, 0);
});

test('lignes : adresse de livraison différente : présente si renseignée, manquante sinon', function () {
  assert.strictEqual(L.controlerLignes([ligne({ livraisonDifferente: true, livraisonAdresse: '8 chemin du Dépôt' })], { colonnes: TOUTES }).parMention.adresse_livraison.present, 1);
  assert.strictEqual(statuts({ livraisonDifferente: true, livraisonAdresse: '' }).adresse_livraison, 'manquant');
});

test('lignes : adresse de livraison sans indicateur : présente si renseignée, à vérifier sinon', function () {
  assert.strictEqual(L.controlerLignes([ligne({ livraisonDifferente: null, livraisonAdresse: '8 chemin du Dépôt' })], { colonnes: TOUTES }).parMention.adresse_livraison.present, 1);
  assert.strictEqual(statuts({ livraisonDifferente: null, livraisonAdresse: '' }).adresse_livraison, 'a_verifier');
});

test('lignes : SIREN du client manquant, invalide (à vérifier) ou valide', function () {
  assert.strictEqual(statuts({ sirenClient: '' }).siren_client, 'manquant');
  assert.strictEqual(statuts({ sirenClient: '844083247' }).siren_client, 'a_verifier');
  assert.strictEqual(L.controlerLignes([ligne({})], { colonnes: TOUTES }).parMention.siren_client.present, 1);
});

test('lignes : nature de l\'opération absente = manquante ; option TVA absente = à vérifier', function () {
  assert.strictEqual(statuts({ natureOperation: '' }).nature_operation, 'manquant');
  assert.strictEqual(statuts({ optionDebits: '' }).option_debits, 'a_verifier');
});

test('lignes : regroupement par numéro de facture, première valeur renseignée retenue', function () {
  var recs = [ligne({ ligne: 2, sirenClient: '' }), ligne({ ligne: 3, sirenClient: '844083246' }), ligne({ ligne: 4, numero: 'F-2' })];
  var c = L.controlerLignes(recs, { colonnes: TOUTES });
  assert.strictEqual(c.nbFactures, 2);
  assert.strictEqual(c.parMention.siren_client.present, 2);
  assert.strictEqual(c.parMention.siren_client.manquant, 0);
});

test('lignes : une colonne absente rend la mention non contrôlée (jamais « manquante »)', function () {
  var c = L.controlerLignes([ligne({})], { colonnes: ['siren_client', 'nature_operation'] });
  assert.strictEqual(c.parMention.option_debits.controle, false);
  assert.strictEqual(c.parMention.adresse_livraison.controle, false);
  assert.strictEqual(c.parMention.siren_client.controle, true);
  assert.strictEqual(c.total, 2);
  assert.strictEqual(c.controle, true);
  var rien = L.controlerLignes([ligne({})], { colonnes: ['numero'] });
  assert.strictEqual(rien.controle, false);
  assert.strictEqual(rien.taux, null);
});

test('lignes : factures de l\'export sans aucune ligne dans le fichier signalées', function () {
  var c = L.controlerLignes([ligne({})], { colonnes: TOUTES, numerosFactures: ['F-1', 'F-9', 'F-10', ''] });
  assert.deepStrictEqual(c.facturesSansLignes, ['F-9', 'F-10']);
  assert.strictEqual(c.nbSansLignes, 2);
});

test('lignes : la liste des factures concernées est limitée aux 200 premières, le total reste exact', function () {
  var recs = [];
  for (var i = 0; i < 300; i++) recs.push(ligne({ ligne: i + 2, numero: 'F-' + i, sirenClient: '' }));
  var c = L.controlerLignes(recs, { colonnes: TOUTES });
  assert.strictEqual(c.facturesConcernees.length, 200);
  assert.strictEqual(c.nbConcernees, 300);
  assert.strictEqual(c.facturesConcernees[0].numero, 'F-0');
});

test('lignes : aucune ligne, aucune facture : pas de division par zéro', function () {
  var c = L.controlerLignes([], { colonnes: TOUTES });
  assert.strictEqual(c.nbFactures, 0);
  assert.strictEqual(c.taux, null);
  assert.strictEqual(c.nbConcernees, 0);
});

test('lignes : 50 000 lignes de factures contrôlées en moins de 2 s', function () {
  var recs = [];
  for (var i = 0; i < 50000; i++) recs.push(ligne({ ligne: i + 2, numero: 'F-' + Math.floor(i / 5), sirenClient: i % 13 === 0 ? '' : '844083246' }));
  var t0 = Date.now();
  var c = L.controlerLignes(recs, { colonnes: TOUTES });
  assert.strictEqual(c.nbFactures, 10000);
  assert.ok(Date.now() - t0 < 2000, 'durée : ' + (Date.now() - t0) + ' ms');
});

/* ---------- Organisation (module E) ---------- */

test('organisation : le dossier neuf n\'a aucune réponse (ne sait pas) ni date cible', function () {
  var o = neuf().organisation;
  assert.deepStrictEqual([o.plateforme, o.responsable, o.logiciel, o.procedure], ['nsp', 'nsp', 'nsp', 'nsp']);
  assert.deepStrictEqual(o.cibles, { plateforme: null, responsable: null, logiciel: null, procedure: null, test: null });
});

test('organisation : le dossier démo reprend les réponses par défaut (un « oui » sur quatre)', function () {
  var o = demo().organisation;
  assert.deepStrictEqual([o.plateforme, o.responsable, o.logiciel, o.procedure], ['non', 'non', 'oui', 'non']);
});

test('organisation : une date cible interne survit à l\'enregistrement et à la réouverture du .json', function () {
  var d = neuf();
  d.organisation.plateforme = 'oui';
  d.organisation.cibles.plateforme = '2027-03-15';
  d.organisation.cibles.test = '2027-06-30';
  var v = L.validateDossier(JSON.parse(L.serialiserDossier(d)));
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.dossier.organisation.cibles.plateforme, '2027-03-15');
  assert.strictEqual(v.dossier.organisation.cibles.test, '2027-06-30');
  assert.strictEqual(v.dossier.organisation.plateforme, 'oui');
});

test('organisation : réponse ou date invalide refusée à l\'ouverture', function () {
  var j = JSON.parse(L.serialiserDossier(neuf()));
  j.organisation.plateforme = 'peut-être';
  assert.strictEqual(L.validateDossier(j).ok, false);
  var k = JSON.parse(L.serialiserDossier(neuf()));
  k.organisation.cibles.logiciel = '2027-02-31';
  assert.strictEqual(L.validateDossier(k).ok, false);
});

test('organisation : aucune date réglementaire nouvelle dans le composant (seules les dates cibles internes, choisies par le client)', function () {
  ['js/ui/organisation-form.js', 'js/ui/radiogroup.js', 'js/views/view-dashboard.js', 'js/views/view-mentions.js', 'js/views/view-tiers.js'].forEach(function (f) {
    var t = H.lire(f);
    assert.ok(!/\b\d{4}-\d{2}-\d{2}\b/.test(t), f + ' : date en dur');
    assert.ok(!/\b\d{2}\/\d{2}\/\d{4}\b/.test(t), f + ' : date en dur');
  });
  assert.ok(/Cible interne, choisie par vous/.test(H.lire('js/ui/organisation-form.js')));
});

/* ---------- Garde-fous de l'interface des modules C, D et E ---------- */

test('interface : les vues du fichier tiers et des mentions portent « ne constitue pas un conseil fiscal » et la phrase du panneau', function () {
  assert.ok(/mentionConseil/.test(H.lire('js/views/view-tiers.js')));
  assert.ok(/mentionConseil/.test(H.lire('js/views/view-mentions.js')));
  assert.ok(/Aucune donnée n\\'est modifiée dans votre fichier d\\'origine/.test(H.lire('js/views/view-tiers.js')));
  assert.ok(!/Aucune donnée n\\'est modifiée/.test(H.lire('js/core/corrections.js')), 'la phrase n\'est pas dans les exports');
});

test('interface : tableau triable (aria-sort), régions live, panneau role=complementary, boutons de segment aria-pressed', function () {
  var t = H.lire('js/views/view-tiers.js');
  assert.ok(/aria-sort/.test(t));
  assert.ok(/role: 'status'/.test(t));
  assert.ok(/role: 'complementary'/.test(t));
  assert.ok(/'aria-pressed'/.test(t));
  assert.ok(/'aria-labelledby': 'tt-panel-titre'/.test(t));
});

test('interface : radiogroup (role, aria-labelledby, flèches) et zones des mentions (tabindex, aria-current, classe linked)', function () {
  var r = H.lire('js/ui/radiogroup.js');
  assert.ok(/role: 'radiogroup'/.test(r) && /'aria-labelledby'/.test(r) && /ArrowRight/.test(r) && /ArrowLeft/.test(r));
  var m = H.lire('js/views/view-mentions.js');
  assert.ok(/tabindex: '0'/.test(m) && /aria-current/.test(m) && /linked/.test(m) && /Escape/.test(m));
  assert.ok(/'Mention ' \+ n \+ ' sur 4 : '/.test(m));
});

test('interface : aucune valeur du registre n\'est appliquée par l\'interface (pas de proposition de valeur issue du registre)', function () {
  var c = H.lire('js/core/corrections.js');
  assert.ok(/valeurProposee: null, certitude: 'a_verifier',\s*\n\s*libelle: a\.label/.test(c));
  assert.ok(/Aucune valeur du registre n\\'est appliquée automatiquement/.test(c));
});

test('constantes : limites des modèles et des listes (5 modèles, 200 caractères de preuve, 300 de note, 200 factures listées)', function () {
  assert.strictEqual(L.CONST.MAX_MODELES, 5);
  assert.strictEqual(L.CONST.MAX_PREUVE, 200);
  assert.strictEqual(L.CONST.MAX_NOTE_MENTION, 300);
  assert.strictEqual(L.CONST.MAX_FACTURES_LISTEES, 200);
});
