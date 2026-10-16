/* Tests du tableau de bord et du rapport : indicateurs calculés à la date de référence fixe, jamais à l'horloge ; cohérence avec la boîte et les relances. */
'use strict';

var fs = require('fs');
var path = require('path');
var H = require('./harness');
var assert = H.assert;
var test = H.test;
var D = require('../js/data.js');
var Ctx = require('../js/core/contexte.js');
var Dem = require('../js/core/demandes.js');
var Ind = require('../js/core/indicateurs.js');
var Rap = require('../js/core/rapport.js');

var CTX = Ctx.creer(D);
var OPTS = { ref: D.dateReference, debut: D.dateDebut, delai: 2, jours: [1, 2, 3, 4, 5], horaires: D.parametres.horaires, categories: D.categories };
function tdb(emails, opts) { return Ind.tableauDeBord(emails || D.emails, CTX, opts || OPTS); }
function somme(l, k) { return l.reduce(function (a, x) { return a + x[k]; }, 0); }

test('tableau de bord : les quatre repères (36 demandes, 9 à traiter, 6 sans réponse, 8 avec information manquante)', function () {
  var T = tdb();
  assert.strictEqual(T.messages, 47);
  assert.strictEqual(T.demandes, 36);
  assert.strictEqual(T.horsPerimetre, 3);
  assert.strictEqual(T.aTraiter.n, 9, 'demandes (fils) dont un message est « À traiter »');
  assert.strictEqual(T.aTraiter.messages, 10, 'comme le compteur « À traiter » de la boîte');
  assert.strictEqual(T.aTraiter.messages, Dem.compteurs(D.emails).a_traiter);
  assert.strictEqual(T.sansReponse.n, 6);
  assert.strictEqual(T.sansReponse.messages, 7);
  assert.strictEqual(T.sansReponse.aSurveiller, 6);
  assert.strictEqual(T.completude.manquantes, 8);
});

test('tableau de bord : le repère rouge est celui de l\'écran Relances, avec l\'ancienneté de chaque demande', function () {
  var T = tdb();
  var rel = Dem.relances(D.emails, D.dateReference, 2);
  assert.strictEqual(T.sansReponse.n, rel.enRetard.length);
  assert.deepStrictEqual(T.sansReponse.items.map(function (i) { return i.fil; }), rel.enRetard.map(function (i) { return i.fil; }));
  assert.deepStrictEqual(T.sansReponse.items.map(function (i) { return i.anciennete; }), [12, 8, 6, 4, 4, 3]);
});

test('tableau de bord : les répartitions se recoupent (semaines, catégories, services, responsables)', function () {
  var T = tdb();
  assert.deepStrictEqual(T.parSemaine.map(function (w) { return w.demandes; }), [9, 8, 11, 8]);
  assert.strictEqual(somme(T.parSemaine, 'demandes'), T.demandes);
  assert.strictEqual(somme(T.parSemaine, 'messages'), 47);
  assert.strictEqual(somme(T.categories, 'n'), 47);
  assert.strictEqual(somme(T.services, 'n'), T.demandes);
  assert.strictEqual(somme(T.responsables, 'demandes'), T.demandes);
  assert.strictEqual(somme(T.responsables, 'enRetard'), T.sansReponse.n);
  var c = T.completude;
  assert.strictEqual(c.completes + c.incompletes + c.enRevue, c.base);
  assert.strictEqual(c.base + c.horsPerimetre, T.demandes);
  assert.strictEqual(c.enRevueStatut, Dem.compteurs(D.emails).en_revue, 'nombre au statut « En revue » identique à celui de la boîte');
  assert.ok(T.semaines.length === 4 && T.semaines[3].enCours && !T.semaines[2].enCours);
});

test('délai de première réponse : heures ouvrées (lundi au vendredi, 9 h à 18 h), médiane sur les demandes répondues', function () {
  var J = [1, 2, 3, 4, 5];
  assert.strictEqual(Ind.heuresOuvrees('2026-10-05T09:00:00+02:00', '2026-10-05T11:30:00+02:00', J), 2.5);
  assert.strictEqual(Ind.heuresOuvrees('2026-10-02T17:00:00+02:00', '2026-10-05T10:00:00+02:00', J), 2, 'vendredi 17 h à lundi 10 h : 1 h + 1 h');
  assert.strictEqual(Ind.heuresOuvrees('2026-10-03T10:44:00+02:00', '2026-10-05T09:50:00+02:00', J), 50 / 60, 'reçu un samedi : compte à partir du lundi 9 h');
  assert.strictEqual(Ind.heuresOuvrees('2026-10-05T07:48:00+02:00', '2026-10-05T08:55:00+02:00', J), 0, 'avant l\'ouverture');
  assert.strictEqual(Ind.heuresOuvrees('2026-10-05T09:00:00+02:00', '2026-10-06T09:00:00+02:00', J), 9);
  assert.strictEqual(Ind.fmtDuree(2.4667), '2 h 28');
  assert.strictEqual(Ind.fmtDuree(50 / 60), '50 min');
  var d = tdb().delaiReponse;
  assert.strictEqual(d.n, 25);
  assert.strictEqual(d.n + d.sansReponse, 36);
  assert.ok(Math.abs(d.mediane - 2.4667) < 0.01);
  assert.ok(d.max <= 18, 'aucun délai de première réponse au-delà de 2 jours ouvrés dans l\'historique : ' + d.max);
  assert.strictEqual(somme(d.tranches, 'n'), d.n);
});

test('budgets déclarés : minimum et maximum déclarés, jamais un total unique ; « à partir de » compté à part ; périodes séparées', function () {
  var b = tdb().budgets;
  assert.strictEqual(b.avecMontant + b.sansMontant, b.n);
  assert.strictEqual(b.ponctuels.n, 18);
  assert.strictEqual(b.ponctuels.minCumule, 49400);
  assert.strictEqual(b.ponctuels.maxCumule, 73200);
  assert.strictEqual(b.ponctuels.ouverts, 2);
  assert.strictEqual(b.ponctuels.seuilsOuverts, 5000);
  assert.strictEqual(b.ponctuels.plafonds, 4);
  assert.strictEqual(somme(b.tranches, 'n'), b.ponctuels.n);
  var rec = b.recurrents;
  assert.strictEqual(rec.mensuel.n + rec.annuel.n + rec.par_unite.n + b.ponctuels.n, b.avecMontant, 'chaque budget n\'est compté que dans un groupe');
  assert.deepStrictEqual(Ind.bornes({ type: 'plafond', min: null, max: 1800 }), { min: null, max: 1800 });
  assert.deepStrictEqual(Ind.bornes({ type: 'a_partir_de', min: 2000, max: null }), { min: 2000, max: null });
  assert.deepStrictEqual(Ind.bornes({ type: 'fourchette', min: 3000, max: 4000 }), { min: 3000, max: 4000 });
});

test('actions de la session : le tableau de bord suit les statuts (ignorer une demande en retard la sort du repère rouge)', function () {
  var T = tdb(Dem.appliquerEtat(D.emails, { m34: { statut: 'classe_sans_suite' } }));
  assert.strictEqual(T.sansReponse.n, 5);
  assert.strictEqual(T.aTraiter.n, 8);
  assert.strictEqual(tdb(Dem.appliquerEtat(D.emails, { m39: { statut: 'brouillon_pret' } })).sansReponse.n, 6, 'un brouillon relu n\'est pas une réponse');
});

test('délai de relance : à 3 jours ouvrés le repère rouge passe de 6 à 5', function () {
  var o3 = JSON.parse(JSON.stringify(OPTS));
  o3.delai = 3;
  assert.strictEqual(tdb(D.emails, o3).sansReponse.n, 5);
  assert.strictEqual(tdb(D.emails, OPTS).sansReponse.n, 6);
});

test('semaines : lundi au dimanche, la dernière s\'arrête à la date de référence', function () {
  var s = Ind.semaines(D.dateDebut, D.dateReference);
  assert.deepStrictEqual(s.map(function (x) { return x.debut; }), ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19']);
  assert.strictEqual(s[3].fin, '2026-10-25');
  assert.ok(Ind.dansSemaine('2026-10-04T20:15:00+02:00', s[0]), 'dimanche 4 octobre = semaine 1');
  assert.strictEqual(Ind.indexSemaine(s, '2026-10-23T09:05:00+02:00'), 3);
  assert.strictEqual(Ind.lundi('2026-10-25'), '2026-10-19');
});

test('aucune lecture de l\'horloge dans les modules de calcul ni dans les vues du passe 2', function () {
  ['indicateurs', 'rapport', 'essai', 'dates', 'demandes', 'suivi', 'brouillon'].forEach(function (m) {
    var src = fs.readFileSync(path.join(__dirname, '../js/core/' + m + '.js'), 'utf8');
    assert.ok(!/Date\.now\s*\(|new Date\(\s*\)|performance\.now/.test(src), m);
  });
  var vues = ['view-dashboard', 'view-rapport', 'view-essai', 'view-comment'].map(function (m) { return fs.readFileSync(path.join(__dirname, '../js/views/' + m + '.js'), 'utf8'); }).join('\n');
  assert.ok(!/Date\.now\s*\(|new Date\(\s*\)/.test(vues));
});

test('même résultat quelle que soit l\'horloge simulée', function () {
  var avant = JSON.stringify(tdb());
  var RealDate = Date;
  var faux = function () { return arguments.length ? Reflect.construct(RealDate, arguments) : new RealDate(2031, 0, 1); };
  faux.UTC = RealDate.UTC;
  faux.now = function () { return new RealDate(2031, 0, 1).getTime(); };
  faux.prototype = RealDate.prototype;
  var pendant;
  global.Date = faux;
  try { pendant = JSON.stringify(tdb()); } finally { global.Date = RealDate; }
  assert.strictEqual(pendant, avant);
});

/* ---------- Rapport hebdomadaire ---------- */

test('rapport : totaux de la semaine égaux à ceux de la boîte filtrée sur la même semaine ; les quatre semaines recoupent le total', function () {
  var sems = Ind.semaines(D.dateDebut, D.dateReference);
  var total = { m: 0, d: 0 };
  sems.forEach(function (s, i) {
    var r = Rap.semaine(D.emails, CTX, OPTS, i);
    var boite = D.emails.filter(function (e) { return Ind.dansSemaine(e.date, s); });
    assert.strictEqual(r.messages, boite.length, 'semaine ' + i);
    assert.deepStrictEqual(r.messagesIds, boite.map(function (e) { return e.id; }));
    total.m += r.messages;
    total.d += r.recues;
    assert.strictEqual(somme(r.categories, 'n'), r.messages);
    assert.strictEqual(somme(r.services, 'n'), r.recues);
  });
  assert.strictEqual(total.m, 47);
  assert.strictEqual(total.d, 36);
});

test('rapport : la semaine en cours reprend le tableau de bord (relances, en attente)', function () {
  var r = Rap.semaine(D.emails, CTX, OPTS, 3);
  var T = tdb();
  assert.ok(r.enCours);
  assert.strictEqual(r.aRelancer, T.sansReponse.n);
  assert.strictEqual(r.aSurveiller, T.sansReponse.aSurveiller);
  assert.strictEqual(r.enAttente, T.sansReponse.n + T.sansReponse.aSurveiller);
  assert.strictEqual(r.relances.length, 6);
  assert.ok(r.vigilance.length >= 3 && r.vigilance[0].id === 'retard');
});

test('rapport : situation reconstituée à la clôture de la semaine (une réponse postérieure n\'existe pas encore)', function () {
  var r0 = Rap.semaine(D.emails, CTX, OPTS, 0);
  assert.strictEqual(r0.aRelancer, 0);
  assert.strictEqual(r0.cloture, '2026-10-04T23:59:00+02:00');
  var r2 = Rap.semaine(D.emails, CTX, OPTS, 2);
  assert.ok(r2.aRelancer >= 1, 'la demande de l\'hôtel (reçue le 7 octobre) est en retard fin de semaine 3');
  r2.relances.forEach(function (x) { assert.ok(x.recu <= r2.cloture); });
  var limite = '2026-10-09T12:00:00+02:00';
  var au = Rap.emailsAu(D.emails, limite);
  assert.ok(au.every(function (e) { return e.date <= limite; }));
  assert.ok(au.every(function (e) { return !e.traitement.premiere_reponse || e.traitement.premiere_reponse <= limite; }));
});

test('rapport : chaque demande répondue est « traitée » dans une seule semaine', function () {
  var tr = 0;
  Ind.semaines(D.dateDebut, D.dateReference).forEach(function (s, i) { tr += Rap.semaine(D.emails, CTX, OPTS, i).traitees; });
  assert.strictEqual(tr, tdb().delaiReponse.n);
  var r = Rap.semaine(D.emails, CTX, OPTS, 3);
  assert.ok(r.delaiMedian >= 0 && r.delaiMedian < 9);
});
