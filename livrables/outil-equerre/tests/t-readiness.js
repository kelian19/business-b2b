/* Tests du tableau de bord (P3) : calendrier, indice, exposition, rapprochement des clients, trésorerie, plan d'action. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var near = H.near;
var L = require('../js/core/logic.js');
var D = require('../js/data.js');

var REF = '2026-10-06';
var INV = L.normalizeInvoices(D.exportFacturation).invoices;
var DOSSIER = L.dossierDemo(D, { maintenant: '2026-10-06T08:00:00.000Z' });
var ROWS = L.rowsToThirdParties(D.tiers);
var TRANCHE = L.trancheVersLignes(D.tiersParClient, ROWS);
var ANALYSE = L.analyzeThirdParties(ROWS);
var RAPP = L.rapprocherClients(ANALYSE, INV, { refIso: REF, tranche: TRANCHE });
var MENTIONS = L.bilanMentions(DOSSIER.modeles, null);
var REP = L.computeReporting(INV, REF);
function plan(org) {
  return L.planAction({ analysis: ANALYSE, mentions: MENTIONS, organisation: org || D.organisationDefaut, hypotheses: { nbFactures12m: null } });
}

/* ---------- Calendrier ---------- */

test('joursRestants : 330 jours jusqu\'au 1er septembre 2027, 35 jours depuis la réception', function () {
  assert.strictEqual(L.joursRestants(REF, '2027-09-01'), 330);
  assert.strictEqual(L.joursRestants('2026-09-01', REF), 35);
  assert.strictEqual(L.joursRestants('2027-09-01', '2027-09-01'), 0);
  assert.strictEqual(L.joursRestants('2027-09-02', '2027-09-01'), -1);
});

test('compteARebours : quatre phases, jours recalculés', function () {
  var c = L.compteARebours(REF);
  assert.strictEqual(c.phase, 'avant_emission');
  assert.strictEqual(c.joursAvantEmission, 330);
  assert.strictEqual(c.joursDepuisReception, 35);
  assert.strictEqual(L.compteARebours('2027-09-01').phase, 'echeance_atteinte');
  var d = L.compteARebours('2027-09-02');
  assert.strictEqual(d.phase, 'echeance_depassee');
  assert.strictEqual(d.joursDepassement, 1);
  var a = L.compteARebours('2026-03-01');
  assert.strictEqual(a.phase, 'avant_reception');
  assert.strictEqual(a.joursAvantReception, 184);
  assert.ok(a.joursDepuisReception < 0);
});

test('jalons : position proportionnelle de « aujourd\'hui » (35 sur 365) et bornée aux extrémités', function () {
  var j = L.jalons(REF);
  assert.strictEqual(j.totalJours, 365);
  near(j.position, 35 / 365, 1e-9);
  assert.strictEqual(L.jalons('2026-01-01').position, 0);
  assert.strictEqual(L.jalons('2026-01-01').avant, true);
  assert.strictEqual(L.jalons('2028-01-01').position, 1);
  assert.strictEqual(L.jalons('2028-01-01').apres, true);
});

/* ---------- Indice de préparation ---------- */

test('indicePreparation : démo = 0,4 × 50 + 0,3 × 60 + 0,3 × 25 arrondi à 46', function () {
  var r = L.indicePreparation({ scoreTiers: 50, modeles: { ok: 6, total: 10 }, organisation: D.organisationDefaut });
  assert.strictEqual(r.indice, 46);
  assert.strictEqual(r.partiel, false);
  assert.deepStrictEqual(r.composantes.map(function (c) { return c.valeur; }), [50, 60, 25]);
  assert.deepStrictEqual(r.composantes.map(function (c) { return c.poidsPct; }), [40, 30, 30]);
  assert.strictEqual(r.poidsTotalPct, 100);
});

test('indicePreparation : trois « oui » donnent organisation 100 et indice 68 ; tout « non » ou « ne sait pas » donne 38', function () {
  var oui = { plateforme: 'oui', responsable: 'oui', logiciel: 'oui', procedure: 'oui' };
  var trois = { plateforme: 'oui', responsable: 'oui', logiciel: 'non', procedure: 'oui' };
  var r3 = L.indicePreparation({ scoreTiers: 50, modeles: { ok: 6, total: 10 }, organisation: trois });
  assert.strictEqual(r3.composantes[2].valeur, 75);
  var r = L.indicePreparation({ scoreTiers: 50, modeles: { ok: 6, total: 10 }, organisation: Object.assign({}, D.organisationDefaut, { plateforme: 'oui', responsable: 'oui', procedure: 'oui' }) });
  assert.strictEqual(r.composantes[2].valeur, 100);
  assert.strictEqual(r.indice, 68);
  var non = L.indicePreparation({ scoreTiers: 50, modeles: { ok: 6, total: 10 }, organisation: { plateforme: 'non', responsable: 'nsp', logiciel: 'non', procedure: 'nsp' } });
  assert.strictEqual(non.composantes[2].valeur, 0);
  assert.strictEqual(non.indice, 38);
  assert.strictEqual(L.indicePreparation({ scoreTiers: 100, modeles: { ok: 10, total: 10 }, organisation: oui }).indice, 100);
});

test('indicePreparation : mode partiel quand une composante n\'est pas évaluable, recalcul sur les poids restants', function () {
  var org = D.organisationDefaut;
  var sansFichier = L.indicePreparation({ scoreTiers: null, modeles: { ok: 6, total: 10 }, organisation: org });
  assert.strictEqual(sansFichier.partiel, true);
  assert.strictEqual(sansFichier.composantes[0].evalue, false);
  assert.strictEqual(sansFichier.composantes[0].valeur, null);
  assert.strictEqual(sansFichier.indice, Math.round((30 * 60 + 30 * 25) / 60));
  assert.strictEqual(sansFichier.poidsEvaluesPct, 60);
  var sansModeles = L.indicePreparation({ scoreTiers: 50, modeles: { ok: 0, total: 0 }, organisation: org });
  assert.strictEqual(sansModeles.partiel, true);
  assert.strictEqual(sansModeles.composantes[1].evalue, false);
  var seul = L.indicePreparation({ scoreTiers: null, modeles: null, organisation: org });
  assert.strictEqual(seul.indice, 25);
  assert.strictEqual(seul.termes.length, 1);
});

test('fichier tiers sans colonne siren : composante fichier non évaluée', function () {
  var cols = ['nom', 'adresse', 'code_postal', 'ville'];
  assert.strictEqual(L.sirenEvaluable(cols), false);
  assert.strictEqual(L.scoreTiersPourIndice(ANALYSE, cols), null);
  assert.strictEqual(L.scoreTiersPourIndice(ANALYSE, null), 50);
  assert.strictEqual(L.scoreTiersPourIndice(null, null), null);
  var r = L.indicePreparation({ scoreTiers: null, tiers: { sansSiren: true }, modeles: { ok: 6, total: 10 }, organisation: D.organisationDefaut });
  assert.ok(/SIREN absente/.test(r.composantes[0].detail));
});

test('etapesPreparation : statuts calculés, étape de test à faire tant que les trois autres ne sont pas faites', function () {
  var e = L.etapesPreparation({ scoreTiers: 50, modeles: { ok: 6, total: 10 }, organisation: D.organisationDefaut });
  assert.deepStrictEqual(e.map(function (x) { return x.statut; }), ['en_cours', 'en_cours', 'a_faire', 'a_faire']);
  var tout = L.etapesPreparation({ scoreTiers: 100, modeles: { ok: 10, total: 10 }, organisation: { plateforme: 'oui', cibles: { plateforme: '2027-01-01' } } });
  assert.deepStrictEqual(tout.map(function (x) { return x.statut; }), ['fait', 'fait', 'fait', 'en_cours']);
  assert.strictEqual(tout[2].cible, '2027-01-01');
  assert.strictEqual(L.etapesPreparation({ scoreTiers: null, modeles: { ok: 0, total: 0 }, organisation: {} })[0].statut, 'a_faire');
});

/* ---------- Exposition ---------- */

test('expositionAmende : 150 × 50 = 7 500, plafond de 15 000 atteint à 300 factures', function () {
  var a = L.expositionAmende(150);
  assert.strictEqual(a.brut, 7500);
  assert.strictEqual(a.plafonne, 7500);
  assert.strictEqual(a.plafondAtteint, false);
  assert.strictEqual(a.seuilFactures, 300);
  assert.strictEqual(L.expositionAmende(299).plafonne, 14950);
  var b = L.expositionAmende(300);
  assert.strictEqual(b.plafonne, 15000);
  assert.strictEqual(b.plafondAtteint, true);
  assert.strictEqual(L.expositionAmende(301).plafonne, 15000);
  assert.strictEqual(L.expositionAmende(400).brut, 20000);
  assert.strictEqual(L.expositionAmende(0).plafonne, 0);
});

test('expositionAmende : valeurs invalides refusées', function () {
  [-1, 2.5, NaN, null, undefined, 'abc'].forEach(function (v) { assert.strictEqual(L.expositionAmende(v), null); });
});

test('validerNbFactures : entier de 0 à 100 000, jamais -5, 2,5 ni texte', function () {
  assert.strictEqual(L.validerNbFactures('150').valeur, 150);
  assert.strictEqual(L.validerNbFactures(' 0 ').valeur, 0);
  assert.strictEqual(L.validerNbFactures('100000').ok, true);
  ['-5', '2,5', '2.5', 'abc', '', '100001', '1 000', '1e3'].forEach(function (v) {
    var r = L.validerNbFactures(v);
    assert.strictEqual(r.ok, false, v);
    assert.strictEqual(r.message, 'Nombre entier de 0 à 100 000');
  });
});

test('nbFactures12Mois : 150 sur les données, 0 pour une liste vide', function () {
  assert.strictEqual(L.nbFactures12Mois(INV, REF), 150);
  assert.strictEqual(L.nbFactures12Mois([], REF), 0);
  assert.strictEqual(L.nbFactures12Mois(INV, '2025-12-31'), L.nbFactures12Mois(INV, '2025-12-31'));
  assert.ok(L.nbFactures12Mois(INV, '2026-01-31') < 150);
});

/* ---------- Rapprochement et part du CA à risque ---------- */

test('rapprocherClients : 10 clients rapprochés, 0 homonyme, statuts attendus', function () {
  assert.strictEqual(RAPP.length, 10);
  RAPP.forEach(function (r) { assert.ok(['bloquant', 'a_corriger', 'ok'].indexOf(r.statut) >= 0, r.nom + ' : ' + r.statut); });
  var parNom = {};
  RAPP.forEach(function (r) { parNom[r.nom] = r.statut; });
  assert.strictEqual(parNom['Plasturgie Démo Hotel SAS'], 'bloquant');
  assert.strictEqual(parNom['Mécanique Fictive Golf SARL'], 'bloquant');
  assert.strictEqual(parNom['Matériaux Fictifs Juliett SARL'], 'a_corriger');
  assert.strictEqual(parNom['Emballages Exemple India SAS'], 'a_corriger');
});

test('rapprocherClients : homonymes exclus sans tranche, tranchés par la fiche de Lyon', function () {
  var sans = L.rapprocherClients(ANALYSE, INV, { refIso: REF });
  assert.deepStrictEqual(sans.filter(function (r) { return r.statut === 'homonyme'; }).map(function (r) { return r.nom; }), ['Négoce Démo Alpha SAS']);
  var pc = L.partCaARisque(sans);
  assert.strictEqual(pc.homonymes.nbClients, 1);
  assert.ok(pc.homonymes.ca > 0);
  assert.strictEqual(pc.bloquant.nbClients, 2);
});

test('partCaARisque : bloquant 50 676 € (11,2 %) pour 2 clients, à corriger 24 251 € pour 2 clients', function () {
  var p = L.partCaARisque(RAPP);
  assert.strictEqual(Math.round(p.bloquant.ca), 50676);
  assert.strictEqual(Math.round(p.bloquant.part * 1000) / 10, 11.2);
  assert.strictEqual(p.bloquant.nbClients, 2);
  assert.strictEqual(Math.round(p.aCorriger.ca), 24251);
  assert.strictEqual(Math.round(p.aCorriger.part * 1000) / 10, 5.3);
  assert.strictEqual(p.aCorriger.nbClients, 2);
  assert.strictEqual(Math.round(p.ok.part * 1000) / 10, 83.5);
  assert.strictEqual(p.calculable, true);
  near(p.bloquant.part + p.aCorriger.part + p.ok.part, 1, 1e-9);
  near(p.total, 454219.22, 0.01);
});

test('partCaARisque : liste vide, aucune division par zéro, non calculable', function () {
  var vide = L.partCaARisque([]);
  assert.strictEqual(vide.calculable, false);
  assert.strictEqual(vide.bloquant.part, 0);
  assert.strictEqual(vide.aCorriger.part, 0);
  assert.strictEqual(vide.total, 0);
  assert.deepStrictEqual(L.rapprocherClients(ANALYSE, [], { refIso: REF }), []);
  assert.deepStrictEqual(L.rapprocherClients(null, INV, { refIso: REF }), []);
  var inconnus = L.rapprocherClients(ANALYSE, [{ client: 'Société introuvable', sirenClient: '', dateEmission: '2026-09-01', ht: 100 }], { refIso: REF });
  assert.strictEqual(inconnus[0].statut, 'non_rapproche');
  assert.strictEqual(L.partCaARisque(inconnus).calculable, false);
  assert.strictEqual(L.partCaARisque(inconnus).nonRapproche.nbClients, 1);
});

test('rapprocherClients : le SIREN valide de l\'export prime sur le nom', function () {
  var fiche = ANALYSE.items.filter(function (it) { return /^\d{9}$/.test(it.row.siren) && it.row.type === 'client' && it.anomalies.length === 0; })[0];
  var inv = [{ client: 'Nom différent', sirenClient: fiche.row.siren, dateEmission: '2026-09-01', ht: 100 }];
  var r = L.rapprocherClients(ANALYSE, inv, { refIso: REF });
  assert.strictEqual(r[0].statut, 'ok');
  assert.strictEqual(r[0].ligne, fiche.ligne);
});

test('prioriteParImpact : Hotel, Golf, Juliett, India (CA × coefficient décroissant)', function () {
  var p = L.prioriteParImpact(RAPP);
  assert.deepStrictEqual(p.map(function (r) { return r.nom; }), ['Plasturgie Démo Hotel SAS', 'Mécanique Fictive Golf SARL', 'Matériaux Fictifs Juliett SARL', 'Emballages Exemple India SAS']);
  assert.deepStrictEqual(p.map(function (r) { return Math.round(r.ca); }), [27111, 23565, 20061, 4190]);
  assert.deepStrictEqual(p.map(function (r) { return r.libelles[0]; }), ['SIREN invalide', 'SIREN manquant', 'Adresse incomplète', 'TVA incohérente']);
  assert.strictEqual(p[0].coefficient, 1);
  assert.strictEqual(p[2].coefficient, 0.5);
  assert.deepStrictEqual(L.prioriteParImpact([]), []);
});

/* ---------- Trésorerie ---------- */

test('encaissementsParEcheance : 21 774 / 25 388 / 9 143 / 0 = 56 306 €, somme égale à l\'encours', function () {
  var e = L.encaissementsParEcheance(INV, REF);
  assert.deepStrictEqual(e.tranches.map(function (t) { return Math.round(t.total); }), [21774, 25388, 9143, 0, 0]);
  assert.deepStrictEqual(e.tranches.map(function (t) { return t.nb; }), [9, 8, 3, 0, 0]);
  assert.strictEqual(Math.round(e.total), 56306);
  near(e.total, REP.encours, 0.005);
  assert.strictEqual(e.tranches[4].visible, false);
  assert.strictEqual(e.tranches[3].visible, true);
  assert.strictEqual(e.sansEcheance.nb, 0);
});

test('encaissementsParEcheance : facture sans échéance comptée à part, tranche « plus de 90 jours » visible si non vide', function () {
  var inv = [
    { client: 'A', dateEmission: '2026-09-01', dateEcheance: null, ht: 100, ttc: 120, paid: false },
    { client: 'A', dateEmission: '2026-09-01', dateEcheance: '2027-03-01', ht: 50, ttc: 60, paid: false },
    { client: 'A', dateEmission: '2026-09-01', dateEcheance: '2026-10-06', ht: 10, ttc: null, paid: false }
  ];
  var e = L.encaissementsParEcheance(inv, REF);
  assert.strictEqual(e.sansEcheance.nb, 1);
  assert.strictEqual(e.sansEcheance.total, 120);
  assert.strictEqual(e.tranches[4].visible, true);
  assert.strictEqual(e.tranches[1].nb, 1);
  assert.strictEqual(e.total, 190);
});

test('encaissementsParEcheance : liste vide ou une seule facture payée', function () {
  var vide = L.encaissementsParEcheance([], REF);
  assert.strictEqual(vide.total, 0);
  assert.strictEqual(vide.nbNonPayees, 0);
  var payee = L.encaissementsParEcheance([{ client: 'A', dateEmission: '2026-09-01', dateEcheance: '2026-10-01', ht: 10, ttc: 12, paid: true, datePaiement: '2026-09-30' }], REF);
  assert.strictEqual(payee.nbNonPayees, 0);
  assert.strictEqual(payee.total, 0);
});

test('encaissementsParEcheance : date de référence antérieure, tranches recalculées sans erreur', function () {
  var e = L.encaissementsParEcheance(INV, '2026-03-01');
  near(e.total, REP.encours, 0.005);
  assert.strictEqual(e.tranches.reduce(function (t, x) { return t + x.nb; }, 0), 20);
});

test('alertesTresorerie : 2 factures de plus de 60 jours (3 104 €) sur Juliett, client le plus exposé Delta 18 851 €', function () {
  var a = L.alertesTresorerie(REP, INV);
  assert.strictEqual(a.echuesPlus60.nb, 2);
  assert.strictEqual(Math.round(a.echuesPlus60.total), 3104);
  assert.deepStrictEqual(a.echuesPlus60.clients, ['Matériaux Fictifs Juliett SARL']);
  assert.strictEqual(a.clientLePlusExpose.nom, 'Distribution Fictive Delta SA');
  assert.strictEqual(Math.round(a.clientLePlusExpose.encours), 18851);
  assert.strictEqual(Math.round(a.clientLePlusExpose.part * 1000) / 10, 33.5);
  assert.strictEqual(a.aucune, false);
});

test('alertesTresorerie : aucune alerte sans facture non payée', function () {
  var inv = [{ client: 'A', dateEmission: '2026-09-01', dateEcheance: '2026-10-01', ht: 10, ttc: 12, paid: true, datePaiement: '2026-09-30' }];
  var a = L.alertesTresorerie(L.computeReporting(inv, REF), inv);
  assert.strictEqual(a.aucune, true);
  assert.strictEqual(a.clientLePlusExpose, null);
  assert.strictEqual(a.echuesPlus60.nb, 0);
});

test('concentration : 80 % pour les 5 premiers clients, seuil de 60 % (hypothèse)', function () {
  var c = L.concentration(REP);
  assert.strictEqual(Math.round(c.part * 100), 80);
  assert.strictEqual(c.seuil, 0.6);
  assert.strictEqual(c.elevee, true);
  assert.strictEqual(L.concentration(L.computeReporting([], REF)).elevee, false);
  assert.strictEqual(REP.delaiMoyenPaiement, 44);
});

/* ---------- Plan d'action ---------- */

test('planAction : dix tâches dans l\'ordre B4 avec les libellés attendus', function () {
  var p = plan();
  assert.strictEqual(p.length, 10);
  assert.deepStrictEqual(p.map(function (t) { return t.id; }), ['siren', 'mentions', 'tva', 'doublons', 'adresses', 'siret', 'plateforme', 'responsable', 'procedure', 'test']);
  assert.strictEqual(p[0].titre, 'Corriger 6 SIREN (4 manquants, 2 invalides)');
  assert.strictEqual(p[1].titre, 'Ajouter les mentions manquantes à vos modèles de factures (SIREN du client, nature de l\'opération, adresse de livraison, option TVA d\'après les débits)');
  assert.strictEqual(p[2].titre, 'Corriger 3 clés de TVA');
  assert.strictEqual(p[3].titre, 'Regrouper 3 doublons');
  assert.strictEqual(p[4].titre, 'Compléter 4 adresses');
  assert.strictEqual(p[5].titre, 'Corriger 2 SIRET incohérents');
  assert.strictEqual(p[6].titre, 'Choisir une plateforme agréée');
  assert.strictEqual(p[7].titre, 'Désigner un responsable du sujet');
  assert.strictEqual(p[8].titre, 'Mettre en place une procédure de mise à jour du fichier tiers');
  assert.strictEqual(p[9].titre, 'Tester avant la bascule');
  assert.deepStrictEqual(p.map(function (t) { return t.priorite; }), ['P1', 'P1', 'P2', 'P2', 'P2', 'P2', 'P2', 'P2', 'P3', 'P3']);
  assert.deepStrictEqual(p.map(function (t) { return t.ordre; }), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('planAction : chaque tâche a un pourquoi, une source et un effort étiqueté « estimation »', function () {
  plan().forEach(function (t) {
    assert.ok(t.pourquoi.length > 10, t.id);
    assert.ok(['fait verifie', 'bonne pratique'].indexOf(t.sourcePourquoi) >= 0, t.id);
    assert.ok(/^estimation : environ /.test(t.effortLabel), t.id);
    assert.ok(t.effortMin > 0);
    assert.ok(L.CONST.ROLES_PROPOSES.indexOf(t.parDefautResponsable) >= 0, t.id);
  });
  var p = plan();
  assert.strictEqual(p[0].sourcePourquoi, 'fait verifie');
  assert.strictEqual(p[3].sourcePourquoi, 'bonne pratique');
  assert.strictEqual(p[0].effortLabel, 'estimation : environ 1 h 30');
  assert.strictEqual(p[3].concerne.length, 6, 'doublons : 3 groupes, 6 lignes concernées');
  assert.strictEqual(p[0].concerne.length, 6);
});

test('planAction : « oui » à la plateforme retire la tâche 7, « non » au logiciel ajoute la vérification', function () {
  var oui = plan(Object.assign({}, D.organisationDefaut, { plateforme: 'oui' }));
  assert.strictEqual(oui.length, 9);
  assert.ok(!oui.some(function (t) { return t.id === 'plateforme'; }));
  var non = plan(Object.assign({}, D.organisationDefaut, { logiciel: 'non' }));
  assert.strictEqual(non.length, 11);
  var i = non.map(function (t) { return t.id; }).indexOf('logiciel');
  assert.ok(i > non.map(function (t) { return t.id; }).indexOf('responsable'));
  assert.strictEqual(non[i].titre, 'Vérifier que le logiciel de facturation émet au format électronique');
  assert.strictEqual(non[i].sourcePourquoi, 'fait verifie');
});

test('planAction : tout « oui » ne garde que les tâches de données et le test ; sans fichier, aucune tâche de fichier tiers', function () {
  var tout = plan({ plateforme: 'oui', responsable: 'oui', logiciel: 'oui', procedure: 'oui' });
  assert.deepStrictEqual(tout.map(function (t) { return t.id; }), ['siren', 'mentions', 'tva', 'doublons', 'adresses', 'siret', 'test']);
  var sans = L.planAction({ analysis: null, mentions: { ok: 0, total: 0, aReprendre: [], nbModelesConcernes: 0, nbModeles: 0, source: null }, organisation: { plateforme: 'nsp', responsable: 'nsp', logiciel: 'nsp', procedure: 'nsp' } });
  assert.deepStrictEqual(sans.map(function (t) { return t.id; }), ['mentions', 'plateforme', 'responsable', 'logiciel', 'procedure', 'test']);
  assert.strictEqual(sans[0].titre, 'Contrôler vos modèles de factures face aux 4 nouvelles mentions');
});

test('planAction : une tâche à zéro élément n\'est pas générée', function () {
  var propre = L.analyzeThirdParties([{ ligne: 2, type: 'client', nom: 'Test SARL', siren: '732829320', siret: '', tva: '', adresse: '1 rue A', code_postal: '75001', ville: 'Paris', pays: 'FR', livraison_adresse: '', livraison_code_postal: '', livraison_ville: '' }]);
  var p = L.planAction({ analysis: propre, mentions: { ok: 4, total: 4, aReprendre: [], nbModelesConcernes: 0, nbModeles: 1, source: 'modeles' }, organisation: { plateforme: 'oui', responsable: 'oui', logiciel: 'oui', procedure: 'oui' } });
  assert.deepStrictEqual(p.map(function (t) { return t.id; }), ['test']);
});

test('resumePlan : « 10 actions · 0 faite · effort total estimé » et mise à jour avec les statuts', function () {
  var avec = L.planAvecEtats(plan(), {});
  var r = L.resumePlan(avec);
  assert.strictEqual(r.nb, 10);
  assert.strictEqual(r.faites, 0);
  assert.strictEqual(r.effortMin, 645);
  assert.strictEqual(r.effortLabel, 'environ 10 h 45');
  var etats = {};
  assert.strictEqual(L.appliquerPlan(etats, 'siren', { statut: 'fait' }).ok, true);
  var r2 = L.resumePlan(L.planAvecEtats(plan(), etats));
  assert.strictEqual(r2.faites, 1);
  assert.strictEqual(r2.restantMin, 645 - 90);
});

test('statut « fait » : l\'indice et le plan ne changent pas (les statuts n\'influencent jamais l\'indice)', function () {
  var avant = L.syntheseDossier(DOSSIER, REF, { tranche: TRANCHE });
  var d2 = JSON.parse(JSON.stringify(DOSSIER));
  d2.plan.plateforme = { responsable: 'Direction financière', statut: 'fait', echeance: null };
  var apres = L.syntheseDossier(d2, REF, { tranche: TRANCHE });
  assert.strictEqual(avant.indice.indice, 46);
  assert.strictEqual(apres.indice.indice, 46);
  assert.strictEqual(apres.plan.length, avant.plan.length);
});

test('appliquerPlan : responsable en saisie libre limité à 60 caractères, statut et date validés, identifiant contrôlé', function () {
  var e = {};
  assert.strictEqual(L.appliquerPlan(e, 'tva', { responsable: '  Comptabilité  ' }).ok, true);
  assert.strictEqual(e.tva.responsable, 'Comptabilité');
  assert.strictEqual(L.appliquerPlan(e, 'tva', { responsable: new Array(62).join('x') }).ok, false);
  assert.strictEqual(L.appliquerPlan(e, 'tva', { statut: 'inconnu' }).ok, false);
  assert.strictEqual(L.appliquerPlan(e, 'tva', { echeance: '2026-02-30' }).ok, false);
  assert.strictEqual(L.appliquerPlan(e, 'tva', { echeance: '2026-12-15' }).ok, true);
  assert.strictEqual(e.tva.echeance, '2026-12-15');
  assert.strictEqual(L.appliquerPlan(e, '__proto__', { statut: 'fait' }).ok, false);
  assert.strictEqual(L.appliquerPlan(e, 'a b', { statut: 'fait' }).ok, false);
  assert.strictEqual(L.appliquerPlan(e, 'tva', { responsable: 'a\u0000b' }).ok, true);
  assert.strictEqual(e.tva.responsable, 'a b');
});

test('planToCsv : en-tête et une ligne par action, toutes les cellules entre guillemets, formule neutralisée', function () {
  var etats = { siren: { responsable: '=SOMME(1)', statut: 'en_cours', echeance: '2026-11-15' } };
  var csv = L.planToCsv(plan(), etats);
  var lignes = csv.split('\r\n');
  assert.strictEqual(lignes.length, 12);
  assert.strictEqual(lignes[11], '');
  assert.strictEqual(lignes[0], '"priorite";"action";"pourquoi";"effort (estimation)";"responsable";"statut";"echeance"');
  assert.ok(lignes[1].indexOf('"\'=SOMME(1)"') > 0);
  assert.ok(lignes[1].indexOf('"En cours"') > 0);
  assert.ok(lignes[1].indexOf('"15/11/2026"') > 0);
  lignes.slice(0, 11).forEach(function (l) { assert.ok(/^"/.test(l) && /"$/.test(l)); });
  ['+1', '-1+2', '@x'].forEach(function (f) {
    var c = L.planToCsv(plan(), { tva: { responsable: f, statut: 'a_faire', echeance: null } });
    assert.ok(c.indexOf('"\'' + f + '"') > 0, f);
  });
});

test('indice et plan : aucune règle chiffrée dans la logique du tableau de bord n\'est dupliquée dans l\'interface', function () {
  assert.strictEqual(L.CONST.AMENDE_UNITAIRE, 50);
  assert.strictEqual(L.CONST.AMENDE_PLAFOND, 15000);
  assert.strictEqual(L.CONST.SEUIL_CONCENTRATION, 0.6);
  assert.deepStrictEqual(L.CONST.POIDS_INDICE, { fichier: 0.4, modeles: 0.3, organisation: 0.3 });
  assert.strictEqual(L.REGLES_COMPOSANTES.organisation.indexOf('25 points') === 0, true);
});

test('bilanMentions : modèles guidés puis export des lignes, mentions à reprendre dans l\'ordre d\'affichage', function () {
  assert.strictEqual(MENTIONS.ok, 6);
  assert.strictEqual(MENTIONS.total, 10);
  assert.strictEqual(MENTIONS.nbModeles, 3);
  assert.strictEqual(MENTIONS.nbModelesConcernes, 2);
  assert.deepStrictEqual(MENTIONS.aReprendre, ['siren_client', 'nature_operation', 'adresse_livraison', 'option_debits']);
  var vide = L.bilanMentions([{ id: 'm1', nom: 'M', controles: {} }], null);
  assert.strictEqual(vide.total, 0);
  assert.strictEqual(vide.source, null);
  var lignes = { controle: true, total: 8, ok: 6, nbFactures: 2, nbConcernees: 1, parMention: { siren_client: { manquant: 1, aVerifier: 0, controle: true }, adresse_livraison: { manquant: 0, aVerifier: 0, controle: true }, nature_operation: { manquant: 0, aVerifier: 0, controle: true }, option_debits: { manquant: 0, aVerifier: 1, controle: true } } };
  var b = L.bilanMentions([{ id: 'm1', nom: 'M', controles: {} }], lignes);
  assert.strictEqual(b.source, 'lignes');
  assert.deepStrictEqual(b.aReprendre, ['siren_client', 'option_debits']);
});

test('dureeLabel : minutes, heures et demi-heures', function () {
  assert.strictEqual(L.dureeLabel(15), 'environ 15 min');
  assert.strictEqual(L.dureeLabel(60), 'environ 1 h');
  assert.strictEqual(L.dureeLabel(90), 'environ 1 h 30');
  assert.strictEqual(L.dureeLabel(645), 'environ 10 h 45');
});

test('syntheseDossier : démo à la date de référence, 46, 11,2 %, plan de 10 tâches', function () {
  var s = L.syntheseDossier(DOSSIER, REF, { tranche: TRANCHE });
  assert.strictEqual(s.indice.indice, 46);
  assert.strictEqual(s.partCa.calculable, true);
  assert.strictEqual(Math.round(s.partCa.bloquant.part * 1000) / 10, 11.2);
  assert.strictEqual(s.plan.length, 10);
  assert.strictEqual(s.etapes.length, 4);
});

test('syntheseDossier : dossier client sans fichier, états vides et indice partiel', function () {
  var d = L.creerDossier({ nom: 'Client', secteur: '', taille: '20-49' }, { maintenant: '2026-10-06T00:00:00.000Z', id: 'x' });
  var s = L.syntheseDossier(d, REF);
  assert.strictEqual(s.analysis, null);
  assert.strictEqual(s.partCa, null);
  assert.strictEqual(s.indice.partiel, true);
  assert.strictEqual(s.indice.indice, 0);
  assert.ok(s.plan.some(function (t) { return t.id === 'test'; }));
});
