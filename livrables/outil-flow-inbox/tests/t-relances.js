/* Tests des relances : les demandes sans réponse sont retrouvées PAR LE CALCUL (jamais par une liste écrite). */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var D = require('../js/data.js');
var Dem = require('../js/core/demandes.js');
var Dates = require('../js/core/dates.js');

var REF = D.dateReference;

test('relances : 6 demandes (7 messages) sans réponse au-delà de 2 jours ouvrés, retrouvées par le calcul', function () {
  var r = Dem.relances(D.emails, REF, 2);
  assert.strictEqual(r.enRetard.length, 6);
  var msgs = r.enRetard.reduce(function (a, i) { return a + i.sansReponse.length; }, 0);
  assert.strictEqual(msgs, 7);
  // Recoupement indépendant avec les utilitaires provisoires de data.js.
  var attendu = D.emails.filter(function (e) { return D.utilitaires.sansReponseEnRetard(e, REF, 2); });
  assert.strictEqual(attendu.length, 7);
  var fils = {};
  attendu.forEach(function (e) { fils[e.fil] = true; });
  assert.deepStrictEqual(r.enRetard.map(function (i) { return i.fil; }).sort(), Object.keys(fils).sort());
  // Chaque demande en retard a bien dépassé le délai, sans réponse, avec une réponse attendue.
  r.enRetard.forEach(function (i) {
    assert.ok(i.anciennete > 2 && i.enRetard && i.retard === i.anciennete - 2);
    i.sansReponse.forEach(function (m) { assert.ok(Dem.sansReponse(m) && !m.traitement.premiere_reponse); });
  });
  // Les brouillons prêts et la demande en revue restent sans réponse.
  var statuts = r.enRetard.map(function (i) { return i.statut; });
  assert.ok(statuts.indexOf('brouillon_pret') >= 0 && statuts.indexOf('en_revue') >= 0);
});

test('relances : classement par ancienneté décroissante, « à surveiller » dans le délai', function () {
  var r = Dem.relances(D.emails, REF, 2);
  for (var i = 1; i < r.enRetard.length; i++) assert.ok(r.enRetard[i - 1].anciennete >= r.enRetard[i].anciennete);
  assert.strictEqual(r.enRetard[0].anciennete, 12, 'la plus ancienne est reçue le 7 octobre');
  assert.strictEqual(r.aSurveiller.length, 6);
  r.aSurveiller.forEach(function (it) { assert.ok(it.anciennete <= 2 && !it.enRetard); });
  // Toute demande sans réponse est soit en retard, soit à surveiller, jamais les deux.
  var fils = r.enRetard.concat(r.aSurveiller).map(function (i) { return i.fil; });
  assert.strictEqual(new Set(fils).size, fils.length);
});

test('relances : le délai réglable change le résultat (1, 2, 3 jours) et décroît', function () {
  var n = [1, 2, 3, 4, 5, 6].map(function (d) { return Dem.relances(D.emails, REF, d).enRetard.length; });
  assert.strictEqual(n[1], 6);
  for (var i = 1; i < n.length; i++) assert.ok(n[i] <= n[i - 1], 'le nombre de relances ne peut pas croître avec le délai : ' + n.join(','));
  assert.ok(n[0] > n[1], 'à 1 jour, davantage de demandes sont en retard');
  assert.ok(n[2] < n[1], 'à 3 jours, moins de demandes sont en retard : ' + n[2]);
  // Le total (retard + à surveiller) ne dépend pas du délai.
  [1, 2, 3, 5].forEach(function (d) {
    var r = Dem.relances(D.emails, REF, d);
    assert.strictEqual(r.enRetard.length + r.aSurveiller.length, 12, 'délai ' + d);
  });
});

test('relances : cas limites (mercredi = 2 pas encore en retard, mardi = 3 en retard, week-end)', function () {
  var m42 = D.parId('m42'), m40 = D.parId('m40');
  assert.ok(Dem.aSurveiller(m42, REF, 2) && !Dem.enRetard(m42, REF, 2), 'reçu mercredi : 2 jours ouvrés, dans le délai');
  assert.ok(Dem.enRetard(m40, REF, 2), 'reçu mardi : 3 jours ouvrés, en retard');
  assert.ok(!Dem.enRetard(m40, REF, 3), 'à 3 jours convenus, 3 jours écoulés ne dépassent pas');
  // Un message reçu un samedi : à surveiller le lundi suivant.
  var sam = { date: '2026-10-17T11:05:00+02:00', categorie: 'nouvelle_demande', traitement: { statut: 'a_traiter', premiere_reponse: null } };
  assert.strictEqual(Dem.anciennete(sam, '2026-10-19T09:00:00+02:00'), 1);
  assert.ok(Dem.aSurveiller(sam, '2026-10-19T09:00:00+02:00', 2));
  assert.ok(Dem.enRetard(sam, '2026-10-22T09:00:00+02:00', 2), 'samedi + 3 jours ouvrés');
  assert.strictEqual(Dem.dateRetard(m40, 2), '2026-10-23', 'reçu mardi 20 : en retard le vendredi 23');
  assert.strictEqual(Dem.dateRetard(sam, 2), '2026-10-21');
});

test('relances : une réponse envoyée, un message classé ou un doublon ne sont jamais relancés', function () {
  var r = Dem.relances(D.emails, REF, 2);
  var tous = r.enRetard.concat(r.aSurveiller).reduce(function (a, i) { return a.concat(i.sansReponse); }, []);
  tous.forEach(function (m) {
    assert.ok(['classe_sans_suite', 'doublon'].indexOf(m.traitement.statut) < 0, m.id);
    assert.ok(Dem.CATEGORIES_REPONSE_ATTENDUE.indexOf(m.categorie) >= 0, m.id);
  });
  // « Ignorer » une demande en retard la sort des relances ; « Mettre en revue » ou « relu » ne la sort pas.
  var ignore = Dem.relances(Dem.appliquerEtat(D.emails, { m34: { statut: 'classe_sans_suite' } }), REF, 2);
  assert.strictEqual(ignore.enRetard.length, 5);
  var relu = Dem.relances(Dem.appliquerEtat(D.emails, { m38: { statut: 'brouillon_pret' }, m39: { statut: 'en_revue' } }), REF, 2);
  assert.strictEqual(relu.enRetard.length, 6, 'un brouillon relu ou une mise en revue ne sont pas une réponse');
});

test('relances : le fil de l\'hôtel (relance du prospect) compte une seule demande avec deux messages', function () {
  var r = Dem.relances(D.emails, REF, 2);
  var hotel = r.enRetard.filter(function (i) { return i.sansReponse.length === 2; });
  assert.strictEqual(hotel.length, 1);
  assert.strictEqual(hotel[0].cible.id, 'm19', 'ancienneté calculée sur le message le plus ancien sans réponse');
  assert.strictEqual(Dates.fmtDate(hotel[0].dateRetard), '12/10/2026');
});

test('fils : une ligne par fil, statut gagné conservé, première réponse la plus ancienne', function () {
  var f = Dem.fils(D.emails);
  assert.strictEqual(f.length, 43);
  var bras = f.filter(function (x) { return x.messages.some(function (m) { return m.id === 'm03'; }); })[0];
  assert.strictEqual(Dem.statutFil(bras.messages), 'gagne');
  assert.strictEqual(Dem.premiereReponseFil(bras.messages), D.parId('m03').traitement.premiere_reponse);
  var fromagerie = f.filter(function (x) { return x.messages.some(function (m) { return m.id === 'm45'; }); })[0];
  assert.strictEqual(Dem.statutFil(fromagerie.messages), 'a_traiter', 'le dernier message du fil attend une réponse');
});
