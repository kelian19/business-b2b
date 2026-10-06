/* Tests du module C : propositions de correction (T1), saisie validée, décisions, tiers effectifs, registre, journal,
 * exports du fichier fiabilisé, du journal et des anomalies, CA par fiche. Aucune valeur n'est tirée du hasard. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var L = require('../js/core/logic.js');
var D = require('../js/data.js');

var ROWS = L.rowsToThirdParties(D.tiers);
var A = L.analyzeThirdParties(ROWS);
var P = L.proposerToutes(A);

function ligneDe(nom) { return A.items.filter(function (it) { return it.row.nom === nom; })[0]; }
function propsDe(nom) { return P.parLigne.get(ligneDe(nom).ligne) || []; }
function propDe(nom, champ, code) { return propsDe(nom).filter(function (p) { return p.champ === champ && (!code || p.code === code); })[0]; }

function base(over) {
  var r = { ligne: 2, type: 'client', nom: 'Atelier Essai SAS', siren: '844083246', siret: '', tva: '', adresse: '1 rue du Test', code_postal: '69003', ville: 'Lyon', pays: 'FR',
    livraison_adresse: '', livraison_code_postal: '', livraison_ville: '' };
  Object.keys(over || {}).forEach(function (k) { r[k] = over[k]; });
  return r;
}
function propose(over) {
  var a = L.analyzeThirdParties([base(over)]);
  return L.proposerCorrections(a.items[0], L.creerContexte(a));
}
function dossierVide() { return L.creerDossier({ nom: 'Client essai', taille: '50-99' }, { maintenant: '2026-10-06T10:00:00.000Z', id: 'dtest' }); }

/* ---------- Propositions (T1) ---------- */

test('T1 : la démonstration a 24 propositions, 3 informatives, donc 21 décisions possibles', function () {
  assert.strictEqual(P.total, 24);
  assert.strictEqual(P.liste.filter(function (p) { return p.informative; }).length, 3);
  assert.deepStrictEqual(L.compterDecisions(P, {}), { decisions: 0, total: 21 });
});

test('T1 : TVA à clé fausse avec SIREN valide : clé recalculée (expectedTva), étiquette calculée, appliquable', function () {
  var p = propDe('Emballages Exemple India SAS', 'tva');
  assert.strictEqual(p.valeurActuelle, 'FR06260884440');
  assert.strictEqual(p.valeurProposee, L.expectedTva('260884440'));
  assert.strictEqual(p.valeurProposee, 'FR05260884440');
  assert.strictEqual(p.certitude, 'calculee');
  assert.strictEqual(p.appliquable, true);
  assert.strictEqual(p.cle, ligneDe('Emballages Exemple India SAS').ligne + '|tva');
});

test('T1 : TVA de format invalide : déduite du SIREN, à confirmer', function () {
  var p = propDe('Emballages Exemple Quatre SAS', 'tva');
  assert.strictEqual(p.valeurActuelle, 'FR12 ABC');
  assert.strictEqual(p.valeurProposee, L.expectedTva('166459172'));
  assert.strictEqual(p.certitude, 'a_verifier');
  assert.ok(/déduite du SIREN, à confirmer/.test(p.libelle));
});

test('T1 : TVA d\'un autre SIREN : deux hypothèses exclusives (TVA juste ou SIREN juste)', function () {
  var nom = 'Câblage Exemple Oscar SAS';
  var a = propDe(nom, 'tva');
  var b = propDe(nom, 'siren');
  assert.strictEqual(a.hypothese, 'A');
  assert.strictEqual(b.hypothese, 'B');
  assert.strictEqual(a.valeurProposee, L.expectedTva('877110973'));
  assert.strictEqual(b.valeurProposee, '655298669');
  assert.strictEqual(a.exclusif, b.cle);
  assert.strictEqual(b.exclusif, a.cle);
  assert.strictEqual(a.certitude, 'a_verifier');
  assert.strictEqual(b.certitude, 'a_verifier');
});

test('T1 : TVA à clé fausse sans SIREN utilisable : clé recalculée sur le SIREN contenu, à vérifier', function () {
  var p = propose({ siren: '', tva: 'FR06260884440' }).filter(function (x) { return x.champ === 'tva'; });
  // pas d'anomalie de TVA sans SIREN : le contrôle de cohérence interne seul s'applique
  assert.strictEqual(p.length, 1);
  assert.strictEqual(p[0].valeurProposee, 'FR05260884440');
  assert.strictEqual(p[0].certitude, 'a_verifier');
});

test('T1 : un SIREN avec espaces ou points valide donne une note de normalisation non comptée dans le score', function () {
  var p = propDe('Papeterie Exemple Foxtrot SAS', 'siren');
  assert.strictEqual(p.code, 'normalisation');
  assert.strictEqual(p.valeurActuelle, '958 371 338');
  assert.strictEqual(p.valeurProposee, '958371338');
  assert.strictEqual(p.comptee, false);
  assert.strictEqual(p.certitude, 'calculee');
  var q = propDe('Outillage Fictif Mike SARL', 'siren');
  assert.strictEqual(q.valeurProposee, '195003033');
  assert.strictEqual(A.score, 50, 'le score ne bouge pas : la mise en forme est une note');
});

test('T1 : un SIREN invalide avec espaces n\'est jamais normalisé ni corrigé (Hotel)', function () {
  var ps = propsDe('Plasturgie Démo Hotel SAS');
  assert.strictEqual(ps.length, 1);
  assert.strictEqual(ps[0].code, 'siren_invalide');
  assert.strictEqual(ps[0].valeurProposee, null);
  assert.strictEqual(ps[0].appliquable, false);
  assert.strictEqual(ps[0].libelle, 'à vérifier au registre (incluse dans le dossier)');
});

test('T1 : SIREN manquant sans TVA ni SIRET : « à vérifier au registre (incluse dans le dossier) », aucune valeur', function () {
  var p = propDe('Mécanique Fictive Golf SARL', 'siren');
  assert.strictEqual(p.valeurProposee, null);
  assert.strictEqual(p.appliquable, false);
  assert.strictEqual(p.libelle, L.A_VERIFIER_REGISTRE);
  assert.strictEqual(p.certitude, 'a_verifier');
});

test('T1 : SIREN manquant mais TVA valide : SIREN lu dans la TVA, à confirmer au registre', function () {
  var p = propose({ siren: '', tva: 'FR05260884440' })[0];
  assert.strictEqual(p.champ, 'siren');
  assert.strictEqual(p.valeurProposee, '260884440');
  assert.strictEqual(p.certitude, 'a_verifier');
  assert.ok(/à confirmer au registre/.test(p.libelle));
  assert.ok(/260 884 440/.test(p.libelle));
});

test('T1 : SIREN manquant mais SIRET valide : SIREN lu dans le SIRET, à confirmer', function () {
  var p = propose({ siren: '', siret: '26088444000017' })[0];
  assert.strictEqual(p.valeurProposee, '260884440');
  assert.strictEqual(p.certitude, 'a_verifier');
});

test('T1 : une TVA invalide ne fournit pas un SIREN (jamais lu dans une TVA fausse)', function () {
  var p = propose({ siren: '', tva: 'FR06260884440' })[0];
  assert.strictEqual(p.valeurProposee, null);
  assert.strictEqual(p.libelle, L.A_VERIFIER_REGISTRE);
});

test('T1 : SIREN à 8 chiffres : jamais complété, explication dédiée', function () {
  var p = propDe('Quincaillerie Fictive Papa SARL', 'siren');
  assert.strictEqual(p.valeurProposee, null);
  assert.ok(/8 chiffres/.test(p.explication));
  assert.ok(/jamais complété automatiquement/.test(p.explication));
});

test('T1 : code postal à 4 chiffres complété par un zéro (6200 → 06200), calculé', function () {
  var p = propDe('Chaudronnerie Exemple Romeo SAS', 'code_postal');
  assert.strictEqual(p.valeurActuelle, '6200');
  assert.strictEqual(p.valeurProposee, '06200');
  assert.strictEqual(p.libelle, '6200 → 06200');
  assert.strictEqual(p.certitude, 'calculee');
});

test('T1 : champ d\'adresse manquant : « à compléter auprès du client », sans valeur', function () {
  ['Matériaux Fictifs Juliett SARL:code_postal', 'Maintenance Fictive Six SAS:adresse', 'Brasserie Exemple Xray SAS:ville'].forEach(function (x) {
    var p = x.split(':');
    var pr = propDe(p[0], p[1]);
    assert.ok(pr, x);
    assert.strictEqual(pr.libelle, 'à compléter auprès du client');
    assert.strictEqual(pr.valeurProposee, null);
  });
});

test('T1 : code postal à 6 chiffres ou à 4 lettres : pas de complétion, à vérifier auprès du client', function () {
  var p = propose({ code_postal: '123456' })[0];
  assert.strictEqual(p.valeurProposee, null);
  assert.strictEqual(p.libelle, 'à vérifier auprès du client');
});

test('T1 : adresse de livraison avec code postal à 4 chiffres : complétion sur le champ de livraison', function () {
  var p = propose({ livraison_adresse: '5 quai Sud', livraison_code_postal: '1300', livraison_ville: 'Marseille' }).filter(function (x) { return x.champ === 'livraison_code_postal'; })[0];
  assert.strictEqual(p.valeurProposee, '01300');
});

test('T1 : un tiers étranger n\'a pas de complétion du code postal ni de SIREN réclamé', function () {
  var p = propose({ pays: 'BE', siren: '', code_postal: '1000' });
  assert.strictEqual(p.length, 0);
});

test('T1 : SIRET incohérent : « à vérifier au registre », aucune valeur', function () {
  ['Verrerie Fictive Victor SAS', 'Fonderie Démo Whiskey SA'].forEach(function (nom) {
    var p = propDe(nom, 'siret');
    assert.strictEqual(p.valeurProposee, null);
    assert.strictEqual(p.libelle, L.A_VERIFIER_REGISTRE);
  });
});

test('T1 : doublons : 3 composantes connexes sur la démonstration (6 lignes)', function () {
  var g = L.composantesDoublons(ROWS);
  assert.strictEqual(g.length, 3);
  assert.strictEqual(g.reduce(function (s, x) { return s + x.length; }, 0), 6);
  assert.strictEqual(A.groupesDoublons.length, 3);
});

test('T1 : doublon : on conserve la ligne la plus complète, l\'autre est à fusionner', function () {
  var garde = propDe('Charpente Fictive Sierra SARL', 'doublon');
  var fusion = propDe('SARL Charpente Fictive Sierra', 'doublon');
  assert.strictEqual(garde.informative, true);
  assert.strictEqual(garde.appliquable, false);
  assert.strictEqual(fusion.appliquable, true);
  assert.strictEqual(fusion.valeurProposee, 'fusionnée dans la ligne ' + ligneDe('Charpente Fictive Sierra SARL').ligne);
  assert.ok(/conserver la ligne la plus complète : ligne \d+ \(Charpente Fictive Sierra SARL\)/.test(fusion.libelle));
});

test('T1 : doublon à complétude égale : la ligne la plus haute n\'est pas préférée, la première est conservée', function () {
  var fusion = propDe('AGRO DEMO QUÉBEC SARL', 'doublon');
  assert.strictEqual(fusion.valeurProposee, 'fusionnée dans la ligne ' + ligneDe('Agro Démo Quebec SAS').ligne);
});

test('T1 : doublon sur trois lignes : une seule ligne conservée, deux fusions proposées', function () {
  var rows = [base({ ligne: 2, ville: '' }), base({ ligne: 3 }), base({ ligne: 4, siret: '84408324600018' })];
  var a = L.analyzeThirdParties(rows);
  var ctx = L.creerContexte(a);
  var props = a.items.map(function (it) { return L.proposerCorrections(it, ctx).filter(function (p) { return p.champ === 'doublon'; })[0]; });
  assert.strictEqual(props.filter(function (p) { return p.informative; }).length, 1);
  assert.strictEqual(props[2].informative, true, 'la ligne avec SIRET est la plus complète');
  assert.strictEqual(props.filter(function (p) { return p.appliquable; }).length, 2);
});

test('T1 : un tiers sans anomalie n\'a aucune proposition', function () {
  assert.strictEqual(propsDe('Négoce Démo Alpha SAS').filter(function (p) { return p.ligne === 2; }).length, 0);
  assert.strictEqual(propose({}).length, 0);
});

test('T1 : une proposition sans valeur n\'est jamais appliquable ; toute valeur proposée est une chaîne non vide', function () {
  P.liste.forEach(function (p) {
    if (p.valeurProposee === null) assert.strictEqual(p.appliquable, false, p.cle);
    else { assert.strictEqual(p.appliquable, true, p.cle); assert.ok(typeof p.valeurProposee === 'string' && p.valeurProposee.length > 0, p.cle); }
    assert.ok(p.certitude === 'calculee' || p.certitude === 'a_verifier', p.cle);
  });
});

test('T1 : aucun SIREN n\'est proposé sans source dans la ligne (seulement lu dans TVA, SIRET ou hypothèse B)', function () {
  var propSiren = P.liste.filter(function (p) { return p.champ === 'siren' && p.valeurProposee !== null && p.code !== 'normalisation'; });
  assert.strictEqual(propSiren.length, 1, 'seule l\'hypothèse B d\'Oscar');
  assert.strictEqual(propSiren[0].hypothese, 'B');
});

/* ---------- Saisie validée par le contrôle du champ ---------- */

test('saisie : SIREN valide accepté et normalisé, invalide refusé avec message', function () {
  assert.deepStrictEqual(L.validerSaisie('siren', '260 884 440', {}), { ok: true, valeur: '260884440', message: '' });
  assert.strictEqual(L.validerSaisie('siren', '260884441', {}).ok, false);
  assert.ok(/9 chiffres/.test(L.validerSaisie('siren', '12345678', {}).message));
  assert.ok(/chiffres/.test(L.validerSaisie('siren', 'ABC', {}).message));
  assert.ok(/Saisissez/.test(L.validerSaisie('siren', '', {}).message));
});

test('saisie : SIRET contrôlé contre le SIREN de la ligne', function () {
  assert.strictEqual(L.validerSaisie('siret', '26088444000017', { siren: '260884440' }).ok, true);
  assert.ok(/commence par le SIREN/.test(L.validerSaisie('siret', '84408324600018', { siren: '260884440' }).message));
  assert.ok(/14 chiffres/.test(L.validerSaisie('siret', '1234', {}).message));
});

test('saisie : TVA contrôlée contre le SIREN de la ligne', function () {
  assert.strictEqual(L.validerSaisie('tva', 'FR05 260884440', { siren: '260884440' }).valeur, 'FR05260884440');
  assert.ok(/attendu : FR05260884440/.test(L.validerSaisie('tva', 'FR06260884440', { siren: '260884440' }).message));
  assert.ok(/forme FR/.test(L.validerSaisie('tva', 'XX1', {}).message));
});

test('saisie : code postal français à 5 chiffres, étranger libre, champ texte non vide', function () {
  assert.strictEqual(L.validerSaisie('code_postal', '06200', { pays: 'FR' }).ok, true);
  assert.strictEqual(L.validerSaisie('code_postal', '6200', { pays: 'FR' }).ok, false);
  assert.strictEqual(L.validerSaisie('code_postal', '1000', { pays: 'BE' }).ok, true);
  assert.strictEqual(L.validerSaisie('ville', '  ', {}).ok, false);
  assert.strictEqual(L.validerSaisie('ville', ' Nice ', {}).valeur, 'Nice');
  assert.strictEqual(L.validerSaisie('doublon', 'x', {}).ok, false);
  assert.strictEqual(L.validerSaisie('adresse', new Array(202).join('a'), {}).ok, false);
});

/* ---------- Décisions, journal, annulation ---------- */

test('décision : accepter pose la correction, le journal et la certitude de la proposition', function () {
  var d = dossierVide();
  var p = propDe('Chaudronnerie Exemple Romeo SAS', 'code_postal');
  var r = L.enregistrerDecision(d, { proposition: p, decision: 'acceptee' }, '2026-10-06T10:01:00.000Z');
  assert.strictEqual(r.ok, true);
  var c = d.corrections[p.cle];
  assert.deepStrictEqual([c.decision, c.avant, c.apres, c.certitude, c.champ, c.ligne], ['acceptee', '6200', '06200', 'calculee', 'code_postal', p.ligne]);
  assert.deepStrictEqual(d.journal, [{ t: '2026-10-06T10:01:00.000Z', action: 'accepter', cle: p.cle, avant: '6200', apres: '06200' }]);
});

test('décision : refuser ne change aucune valeur ; annuler restitue l\'état et ajoute une ligne au journal', function () {
  var d = dossierVide();
  var p = propDe('Chaudronnerie Exemple Romeo SAS', 'code_postal');
  L.enregistrerDecision(d, { proposition: p, decision: 'refusee' }, 'a');
  assert.strictEqual(d.corrections[p.cle].decision, 'refusee');
  assert.strictEqual(L.applyDecisions(ROWS, d.corrections).rows[p.ligne - 2].code_postal, '6200');
  var r = L.annulerDecision(d, p.cle, 'b');
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(d.corrections, {});
  assert.deepStrictEqual(d.journal.map(function (e) { return e.action; }), ['refuser', 'annuler']);
  assert.strictEqual(L.annulerDecision(d, p.cle, 'c').ok, false);
});

test('décision : modifier valide la saisie par le contrôle du champ et marque la certitude « saisie »', function () {
  var d = dossierVide();
  var p = propDe('Plasturgie Démo Hotel SAS', 'siren');
  var mauvais = L.enregistrerDecision(d, { proposition: p, decision: 'modifiee', saisie: '12345678', row: ROWS[p.ligne - 2] }, 'a');
  assert.strictEqual(mauvais.ok, false);
  assert.deepStrictEqual(d.corrections, {});
  assert.deepStrictEqual(d.journal, []);
  var bon = L.enregistrerDecision(d, { proposition: p, decision: 'modifiee', saisie: '260 884 440', row: ROWS[p.ligne - 2] }, 'b');
  assert.strictEqual(bon.ok, true);
  assert.deepStrictEqual([d.corrections[p.cle].apres, d.corrections[p.cle].certitude, d.corrections[p.cle].decision], ['260884440', 'saisie', 'modifiee']);
});

test('décision : accepter une proposition sans valeur est refusé', function () {
  var d = dossierVide();
  var r = L.enregistrerDecision(d, { proposition: propDe('Mécanique Fictive Golf SARL', 'siren'), decision: 'acceptee' }, 'a');
  assert.strictEqual(r.ok, false);
  assert.ok(/pas de valeur/.test(r.message));
});

test('décision : les deux hypothèses d\'un même point s\'excluent', function () {
  var d = dossierVide();
  var a = propDe('Câblage Exemple Oscar SAS', 'tva');
  var b = propDe('Câblage Exemple Oscar SAS', 'siren');
  assert.strictEqual(L.enregistrerDecision(d, { proposition: a, decision: 'acceptee' }, 'a').ok, true);
  var r = L.enregistrerDecision(d, { proposition: b, decision: 'acceptee' }, 'b');
  assert.strictEqual(r.ok, false);
  assert.ok(/hypothèse/.test(r.message));
  assert.strictEqual(L.enregistrerDecision(d, { proposition: b, decision: 'refusee' }, 'c').ok, true, 'refuser l\'autre reste possible');
});

test('décision : le journal est plafonné à 5 000 entrées (la plus ancienne est supprimée)', function () {
  var d = dossierVide();
  var p = propDe('Chaudronnerie Exemple Romeo SAS', 'code_postal');
  for (var i = 0; i < 5003; i++) L.enregistrerDecision(d, { proposition: p, decision: 'refusee' }, 't' + i);
  assert.strictEqual(d.journal.length, L.CONST.MAX_JOURNAL);
  assert.strictEqual(d.journal[0].t, 't3');
});

test('décision : proposition ou décision inconnue refusée proprement', function () {
  var d = dossierVide();
  assert.strictEqual(L.enregistrerDecision(d, { proposition: null, decision: 'acceptee' }, 'a').ok, false);
  assert.strictEqual(L.enregistrerDecision(d, { proposition: propDe('Chaudronnerie Exemple Romeo SAS', 'code_postal'), decision: 'bof' }, 'a').ok, false);
});

/* ---------- Tiers effectifs ---------- */

test('applyDecisions : accepter 6200 → 06200 corrige la copie de travail, jamais les lignes d\'origine', function () {
  var d = dossierVide();
  var p = propDe('Chaudronnerie Exemple Romeo SAS', 'code_postal');
  L.enregistrerDecision(d, { proposition: p, decision: 'acceptee' }, 'a');
  var eff = L.applyDecisions(ROWS, d.corrections);
  assert.strictEqual(eff.rows[p.ligne - 2].code_postal, '06200');
  assert.strictEqual(ROWS[p.ligne - 2].code_postal, '6200', 'le fichier d\'origine est intact');
  assert.strictEqual(eff.nbAppliquees, 1);
  assert.strictEqual(eff.rows.length, 40);
});

test('applyDecisions : sans décision, mêmes lignes et score inchangé (50 / 20 / 40)', function () {
  var e = L.analyseEffective(ROWS, {});
  assert.strictEqual(e.analysis.score, 50);
  assert.strictEqual(e.analysis.clean, 20);
  assert.strictEqual(e.analysis.total, 40);
});

test('analyseEffective : accepter 6200 → 06200 fait passer Romeo à sans anomalie, score 53, adresses 3', function () {
  var d = dossierVide();
  L.enregistrerDecision(d, { proposition: propDe('Chaudronnerie Exemple Romeo SAS', 'code_postal'), decision: 'acceptee' }, 'a');
  var e = L.analyseEffective(ROWS, { corrections: d.corrections });
  var romeo = e.analysis.items.filter(function (it) { return it.row.nom === 'Chaudronnerie Exemple Romeo SAS'; })[0];
  assert.strictEqual(romeo.anomalies.length, 0);
  assert.strictEqual(e.analysis.clean, 21);
  assert.strictEqual(e.analysis.score, 53);
  assert.strictEqual(e.analysis.counts.adresse_incomplete, 3);
});

test('analyseEffective : accepter la TVA recalculée d\'India retire son anomalie de TVA', function () {
  var d = dossierVide();
  L.enregistrerDecision(d, { proposition: propDe('Emballages Exemple India SAS', 'tva'), decision: 'acceptee' }, 'a');
  var e = L.analyseEffective(ROWS, { corrections: d.corrections });
  assert.strictEqual(e.analysis.counts.tva_incoherente, 2);
  assert.strictEqual(e.analysis.clean, 21);
});

test('analyseEffective : fusionner un doublon écarte la ligne et supprime le doublon des deux côtés', function () {
  var d = dossierVide();
  var f = propDe('Fournitures Demo Cinq', 'doublon');
  L.enregistrerDecision(d, { proposition: f, decision: 'acceptee' }, 'a');
  var e = L.analyseEffective(ROWS, { corrections: d.corrections });
  assert.deepStrictEqual(e.exclues, [f.ligne]);
  assert.strictEqual(e.analysis.total, 39);
  assert.strictEqual(e.analysis.counts.doublon, 4);
});

test('analyseEffective : la correction d\'un SIREN saisi retire l\'anomalie SIREN invalide', function () {
  var d = dossierVide();
  var p = propDe('Plasturgie Démo Hotel SAS', 'siren');
  L.enregistrerDecision(d, { proposition: p, decision: 'modifiee', saisie: '260884440', row: ROWS[p.ligne - 2] }, 'a');
  var e = L.analyseEffective(ROWS, { corrections: d.corrections });
  assert.strictEqual(e.analysis.counts.siren_invalide, 1);
});

test('applyDecisions : les champs sans décision acceptée restent identiques (copie champ à champ)', function () {
  var d = dossierVide();
  L.enregistrerDecision(d, { proposition: propDe('Chaudronnerie Exemple Romeo SAS', 'code_postal'), decision: 'acceptee' }, 'a');
  var eff = L.applyDecisions(ROWS, d.corrections);
  eff.rows.forEach(function (r, i) {
    if (ROWS[i].nom === 'Chaudronnerie Exemple Romeo SAS') return;
    assert.strictEqual(r, ROWS[i]);
  });
});

/* ---------- Registre ---------- */

function regRec(over) {
  var r = { ligne: 2, siren: '844083246', statut: 'ok', denomination: 'Atelier Essai SAS', etat: 'A', adresse: '1 rue du Test', codePostal: '69003', ville: 'Lyon', dateVerification: '2026-10-05' };
  Object.keys(over || {}).forEach(function (k) { r[k] = over[k]; });
  return r;
}
function analyserAvecRegistre(rowsOver, regOver) {
  var a = L.analyzeThirdParties([base(rowsOver)]);
  return L.ajouterRegistre(a, [regRec(regOver)]);
}
function codes(a) { return a.items[0].anomalies.map(function (x) { return x.code; }); }

test('registre : sans fichier, l\'analyse est renvoyée telle quelle (aucune colonne ni compteur ajouté)', function () {
  assert.strictEqual(L.ajouterRegistre(A, null), A);
  assert.strictEqual(L.ajouterRegistre(A, []), A);
  assert.strictEqual(A.counts.etat_cesse, undefined);
});

test('registre : entreprise cessée signalée « à vérifier », compteurs de base inchangés', function () {
  var a = analyserAvecRegistre({}, { etat: 'cessée', statut: 'etat_cesse' });
  assert.deepStrictEqual(codes(a), ['etat_cesse']);
  assert.strictEqual(a.counts.etat_cesse, 1);
  assert.strictEqual(a.items[0].anomalies[0].source, 'registre');
  assert.strictEqual(a.withAnomaly, 1);
  ['C', 'cessee', 'Cessée'].forEach(function (e) { assert.deepStrictEqual(codes(analyserAvecRegistre({}, { etat: e })), ['etat_cesse'], e); });
  assert.deepStrictEqual(codes(analyserAvecRegistre({}, { etat: 'active' })), []);
});

test('registre : écart de nom, avec tolérance sur la forme juridique et l\'ordre des mots', function () {
  assert.deepStrictEqual(codes(analyserAvecRegistre({}, { denomination: 'Ébénisterie Echo et Fils' })), ['ecart_nom']);
  assert.deepStrictEqual(codes(analyserAvecRegistre({}, { denomination: 'ATELIER ESSAI' })), []);
  assert.deepStrictEqual(codes(analyserAvecRegistre({}, { denomination: 'Essai Atelier' })), []);
  assert.deepStrictEqual(codes(analyserAvecRegistre({ nom: 'Atelier Essai' }, { denomination: 'Atelier Essai Industrie SAS' })), []);
});

test('registre : écart d\'adresse (code postal, ville, voie) et tolérance sur les abréviations', function () {
  assert.deepStrictEqual(codes(analyserAvecRegistre({}, { codePostal: '75001' })), ['ecart_adresse']);
  assert.deepStrictEqual(codes(analyserAvecRegistre({}, { ville: 'Paris' })), ['ecart_adresse']);
  assert.deepStrictEqual(codes(analyserAvecRegistre({}, { adresse: '99 avenue des Lilas' })), ['ecart_adresse']);
  assert.deepStrictEqual(codes(analyserAvecRegistre({ adresse: '1 rue du Test' }, { adresse: '1 R DU TEST', codePostal: '69003', ville: 'LYON' })), []);
  assert.deepStrictEqual(codes(analyserAvecRegistre({ ville: 'Lyon 3e' }, { ville: 'LYON' })), []);
});

test('registre : SIREN introuvable signalé, sans autre écart', function () {
  var a = analyserAvecRegistre({}, { statut: 'introuvable', denomination: '', etat: '' });
  assert.deepStrictEqual(codes(a), ['siren_introuvable']);
});

test('registre : « marqué comme vérifié » (décision refusée) retire l\'écart du compte, sans toucher à la valeur', function () {
  var a0 = L.analyzeThirdParties([base({})]);
  var a1 = L.ajouterRegistre(a0, [regRec({ etat: 'C' })], { '2|etat_cesse': { decision: 'refusee', ligne: 2, champ: 'etat_cesse' } });
  assert.deepStrictEqual(a1.items[0].anomalies.map(function (x) { return x.code; }), []);
  assert.strictEqual(a1.items[0].row.nom, 'Atelier Essai SAS');
});

test('registre : aucune valeur du registre n\'est appliquée (les propositions du registre n\'ont jamais de valeur)', function () {
  var a = analyserAvecRegistre({}, { denomination: 'Autre nom', etat: 'C', codePostal: '99999' });
  var props = L.proposerCorrections(a.items[0], L.creerContexte(a));
  assert.strictEqual(props.length, 3);
  props.forEach(function (p) { assert.strictEqual(p.registre, true); assert.strictEqual(p.valeurProposee, null); assert.strictEqual(p.appliquable, false); assert.strictEqual(p.certitude, 'a_verifier'); });
  var e = L.applyDecisions([base({})], { '2|etat_cesse': { ligne: 2, champ: 'etat_cesse', decision: 'acceptee', apres: 'x' } });
  assert.strictEqual(e.rows[0].nom, 'Atelier Essai SAS');
});

test('registre : analyseEffective ajoute les codes du registre et garde les 7 compteurs de base', function () {
  var reg = [regRec({ siren: '172853038', etat: 'cessée', statut: 'etat_cesse', denomination: 'Distribution Fictive Delta SA' })];
  var e = L.analyseEffective(ROWS, { registre: reg });
  assert.strictEqual(e.analysis.counts.etat_cesse, 1);
  ['siren_manquant', 'siren_invalide', 'siret_incoherent', 'tva_incoherente', 'doublon', 'adresse_incomplete', 'livraison_differente'].forEach(function (k) {
    assert.strictEqual(e.analysis.counts[k], A.counts[k], k);
  });
  assert.strictEqual(e.analysis.score, 48);
});

test('registre : fixture du fichier de vérification : état cessée et écart de nom en « à vérifier »', function () {
  // même contenu que tests/fixtures/registre-fictif.csv (format de verif_registre.py), construit ici pour ne dépendre d'aucun fichier généré
  var reg = [];
  D.tiers.slice(0, 8).forEach(function (t, i) {
    if (!L.cleanId(t.siren)) return;
    reg.push([L.cleanId(t.siren), 'ok', i === 4 ? 'Ébénisterie Echo et Fils' : t.nom, i === 3 ? 'C' : 'A', t.adresse, t.code_postal, t.ville, '2026-10-05']);
  });
  var txt = L.toCsv(['siren', 'statut_verification', 'nom_registre', 'etat_administratif', 'adresse_registre', 'code_postal_registre', 'ville_registre', 'date_verification'], reg);
  var parsed = L.parseCsv(txt);
  var cm = L.canonicalizeCsv(parsed, 'registre');
  assert.deepStrictEqual(cm.missing, []);
  var recs = cm.records.map(function (r, i) { return L.KINDS.registre.normaliser(r, i + 2).valeur; });
  var e = L.analyseEffective(ROWS, { registre: recs });
  assert.strictEqual(e.analysis.counts.etat_cesse, 1);
  assert.strictEqual(e.analysis.counts.ecart_nom, 1);
});

/* ---------- Exports ---------- */

function tableDemo() { return L.dossierDemo(D, { maintenant: '2026-10-06T10:00:00.000Z' }).donnees.tiers; }

test('fichier fiabilisé : colonnes d\'origine, puis colonnes corrigées, puis statut_ligne et anomalies_restantes', function () {
  var t = tableDemo();
  var csv = L.buildFiabilise(t, { analysis: A, corrections: {} });
  var entete = csv.split('\r\n')[0].split(';');
  assert.deepStrictEqual(entete.slice(0, 12), t.entetes);
  assert.deepStrictEqual(entete.slice(12, 21), ['siren_corrige', 'siret_corrige', 'tva_corrige', 'adresse_corrige', 'code_postal_corrige', 'ville_corrige', 'livraison_adresse_corrige', 'livraison_code_postal_corrige', 'livraison_ville_corrige']);
  assert.deepStrictEqual(entete.slice(21), ['statut_ligne', 'anomalies_restantes']);
  assert.strictEqual(csv.split('\r\n').length, 42);
  assert.ok(!/^﻿/.test(csv), 'le BOM est ajouté au téléchargement, pas dans le texte');
});

test('fichier fiabilisé : statuts de ligne (sans_anomalie, a_corriger, corrigee, fusionnee) et valeurs corrigées', function () {
  var t = tableDemo();
  var d = dossierVide();
  L.enregistrerDecision(d, { proposition: propDe('Chaudronnerie Exemple Romeo SAS', 'code_postal'), decision: 'acceptee' }, 'a');
  L.enregistrerDecision(d, { proposition: propDe('Fournitures Demo Cinq', 'doublon'), decision: 'acceptee' }, 'b');
  var e = L.analyseEffective(ROWS, { corrections: d.corrections });
  var lignes = L.buildFiabilise(t, { analysis: e.analysis, corrections: d.corrections, exclues: e.exclues }).split('\r\n');
  function ligne(nom) { return lignes.filter(function (l) { return l.indexOf(';' + nom + ';') >= 0; })[0].split(';'); }
  var romeo = ligne('Chaudronnerie Exemple Romeo SAS');
  assert.strictEqual(romeo[6], '6200', 'la colonne d\'origine est conservée');
  assert.strictEqual(romeo[16], '06200', 'colonne code_postal_corrige');
  assert.strictEqual(romeo[21], 'corrigee');
  assert.strictEqual(ligne('Fournitures Demo Cinq')[21], 'fusionnee');
  assert.strictEqual(ligne('Plasturgie Démo Hotel SAS')[21], 'a_corriger');
  assert.strictEqual(ligne('Plasturgie Démo Hotel SAS')[22], 'SIREN invalide');
  assert.strictEqual(ligne('Atelier Exemple Charlie SAS')[21], 'sans_anomalie');
});

test('fichier fiabilisé : une décision refusée ne remplit pas la colonne corrigée', function () {
  var t = tableDemo();
  var d = dossierVide();
  L.enregistrerDecision(d, { proposition: propDe('Chaudronnerie Exemple Romeo SAS', 'code_postal'), decision: 'refusee' }, 'a');
  var l = L.buildFiabilise(t, { analysis: A, corrections: d.corrections }).split('\r\n').filter(function (x) { return x.indexOf('Romeo') >= 0; })[0].split(';');
  assert.strictEqual(l[16], '');
  assert.strictEqual(l[21], 'a_corriger');
});

test('fichier fiabilisé : colonnes inconnues du fichier d\'origine conservées, cellules de formule neutralisées', function () {
  var table = { source: {}, entetes: ['Code interne', 'Raison sociale', 'N° SIREN'], mapping: [null, 'nom', 'siren'], numerosLigne: [2, 3],
    lignes: [['=SOMME(1)', 'Société Un', '844083246'], ['-cmd', '+Deux', '']], rapport: {} };
  var csv = L.buildFiabilise(table, { analysis: null, corrections: {} });
  var l = csv.split('\r\n');
  assert.strictEqual(l[0], 'Code interne;Raison sociale;N° SIREN;siren_corrige;statut_ligne;anomalies_restantes');
  assert.strictEqual(l[1].split(';')[0], '\'=SOMME(1)');
  assert.strictEqual(l[2].split(';')[0], '\'-cmd');
  assert.strictEqual(l[2].split(';')[1], '\'+Deux');
  assert.strictEqual(l[1].split(';')[4], 'non_analysee');
});

test('journal : une ligne par événement, avec le nom du tiers, l\'action en français et les valeurs', function () {
  var d = dossierVide();
  var p = propDe('Chaudronnerie Exemple Romeo SAS', 'code_postal');
  L.enregistrerDecision(d, { proposition: p, decision: 'acceptee' }, '2026-10-06T10:01:00.000Z');
  L.annulerDecision(d, p.cle, '2026-10-06T10:02:00.000Z');
  var csv = L.buildJournal(d.journal, { rows: ROWS }).split('\r\n');
  assert.strictEqual(csv[0], 'date_heure;action;ligne;champ;nom;valeur_avant;valeur_apres');
  assert.strictEqual(csv[1], '2026-10-06T10:01:00.000Z;acceptée;' + p.ligne + ';code_postal;Chaudronnerie Exemple Romeo SAS;6200;06200');
  assert.ok(/;annulée;/.test(csv[2]));
  assert.strictEqual(csv.length, 4);
});

test('journal : injection de formule neutralisée dans les valeurs saisies', function () {
  var csv = L.buildJournal([{ t: 't', action: 'modifier', cle: '5|adresse', avant: '=1+1', apres: '@cmd' }], { rows: [] }).split('\r\n');
  assert.strictEqual(csv[1], 't;modifiée;5;adresse;;\'=1+1;\'@cmd');
});

test('journal : ne contient aucune phrase destinée au panneau (le fichier d\'origine n\'est pas évoqué)', function () {
  var csv = L.buildJournal([{ t: 't', action: 'accepter', cle: '2|ville', avant: 'a', apres: 'b' }], {});
  assert.ok(csv.indexOf('Aucune donnée n\'est modifiée') < 0);
});

test('anomalies (CSV) : colonnes valeur_actuelle, correction_proposee et certitude', function () {
  var csv = L.anomaliesToCsv(A).split('\r\n');
  assert.strictEqual(csv[0], 'ligne;type;nom;siren;anomalie;gravite;detail;action_suggeree;valeur_actuelle;correction_proposee;certitude');
  var india = csv.filter(function (l) { return l.indexOf('Emballages Exemple India SAS') >= 0; })[0].split(';');
  assert.deepStrictEqual(india.slice(-3), ['FR06260884440', 'FR05260884440', 'calculée']);
  var golf = csv.filter(function (l) { return l.indexOf('Mécanique Fictive Golf SARL') >= 0; })[0].split(';');
  assert.strictEqual(golf[golf.length - 2], 'à vérifier au registre (incluse dans le dossier)');
  assert.strictEqual(golf[golf.length - 1], 'à vérifier');
});

test('anomalies (CSV) : les 25 anomalies de la démonstration, notes comprises', function () {
  var n = L.anomaliesToCsv(A).split('\r\n').length - 2;
  assert.strictEqual(n, A.items.reduce(function (s, it) { return s + it.anomalies.length; }, 0));
});

/* ---------- CA 12 mois par fiche ---------- */

test('CA par fiche : valeurs de la démonstration (Hotel 27 111, Golf 23 565, Juliett 20 061, India 4 190) et total 454 219', function () {
  var inv = L.normalizeInvoices(D.exportFacturation).invoices;
  var m = L.caParTiers(inv, ROWS, '2026-10-06', D.tiersParClient);
  function ca(nom) { return Math.round(m.get(ligneDe(nom).ligne).ca); }
  assert.strictEqual(ca('Plasturgie Démo Hotel SAS'), 27111);
  assert.strictEqual(ca('Mécanique Fictive Golf SARL'), 23565);
  assert.strictEqual(ca('Matériaux Fictifs Juliett SARL'), 20061);
  assert.strictEqual(ca('Emballages Exemple India SAS'), 4190);
  var tot = 0;
  m.forEach(function (v) { tot += v.ca; });
  assert.strictEqual(Math.round(tot), 454219);
});

test('CA par fiche : fournisseurs et homonymes non tranchés sans CA ; fenêtre de 12 mois et mois de départ en entier', function () {
  var inv = L.normalizeInvoices(D.exportFacturation).invoices;
  var m = L.caParTiers(inv, ROWS, '2026-10-06', D.tiersParClient);
  assert.strictEqual(m.get(ligneDe('Acier Démo Yankee SAS').ligne), undefined);
  var sans = L.caParTiers(inv, ROWS, '2026-10-06');
  assert.strictEqual(sans.get(2), undefined, 'homonyme Alpha non tranché : exclu');
  assert.ok(m.get(2), 'tranché par D1 (fiche de Lyon)');
  assert.strictEqual(m.get(28), undefined, 'fiche de Paris (autre SIREN) : aucune facture');
  var apres = L.caParTiers(inv, ROWS, '2027-12-01', D.tiersParClient);
  assert.strictEqual(apres.size, 0);
  assert.strictEqual(L.moisAvant('2026-10-06', 12), '2025-10-06');
  assert.strictEqual(L.moisAvant('2024-02-29', 12), '2023-02-28');
  assert.strictEqual(L.moisAvant('2026-03-31', 1), '2026-02-28');
});

test('performance : propositions et analyse effective sur 10 000 tiers restent linéaires', function () {
  function sirenValide(n) { var s = String(10000000 + n).slice(-8); for (var c = 0; c < 10; c++) { if (L.isValidSiren(s + c)) return s + c; } return ''; }
  var rows = [];
  for (var i = 0; i < 10000; i++) {
    var siren = i % 7 === 0 ? '' : sirenValide(i);
    rows.push(base({ ligne: i + 2, nom: 'Société ' + i, siren: siren, code_postal: i % 5 === 0 ? '6200' : '69003', tva: i % 11 === 0 ? 'FR12 ABC' : '' }));
  }
  var t0 = Date.now();
  var a = L.analyzeThirdParties(rows);
  var p = L.proposerToutes(a);
  var e = L.analyseEffective(rows, { corrections: { '2|code_postal': { ligne: 2, champ: 'code_postal', decision: 'acceptee', apres: '06200' } } });
  assert.ok(p.total > 3000, 'propositions : ' + p.total);
  assert.strictEqual(e.analysis.total, 10000);
  assert.ok(Date.now() - t0 < 4000, 'durée : ' + (Date.now() - t0) + ' ms');
});
