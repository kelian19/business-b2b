/* Tests des jours ouvrés et des formats de dates (logique de js/core/dates.js). */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var D = require('../js/data.js');
var Dates = require('../js/core/dates.js');

test('jours ouvrés : mercredi à vendredi = 2, mardi à vendredi = 3, week-end', function () {
  var ref = D.dateReference;
  assert.strictEqual(Dates.joursOuvres('2026-10-21T09:15:00+02:00', ref), 2);
  assert.strictEqual(Dates.joursOuvres('2026-10-20T08:05:00+02:00', ref), 3);
  assert.strictEqual(Dates.joursOuvres('2026-10-23T10:30:00+02:00', ref), 0, 'même jour');
  // Vendredi soir à lundi matin : 1 jour ouvré ; samedi à lundi : 1 ; dimanche à lundi : 1 ; samedi à dimanche : 0.
  assert.strictEqual(Dates.joursOuvres('2026-10-16T18:00:00+02:00', '2026-10-19T09:00:00+02:00'), 1);
  assert.strictEqual(Dates.joursOuvres('2026-10-17T11:05:00+02:00', '2026-10-19T09:00:00+02:00'), 1);
  assert.strictEqual(Dates.joursOuvres('2026-10-18T20:15:00+02:00', '2026-10-19T09:00:00+02:00'), 1);
  assert.strictEqual(Dates.joursOuvres('2026-10-17T11:05:00+02:00', '2026-10-18T09:00:00+02:00'), 0);
  // Une semaine complète = 5 jours ouvrés.
  assert.strictEqual(Dates.joursOuvres('2026-10-12T09:00:00+02:00', '2026-10-19T09:00:00+02:00'), 5);
});

test('jours ouvrés : identique aux utilitaires provisoires de data.js sur tout le jeu', function () {
  D.emails.forEach(function (e) {
    assert.strictEqual(Dates.joursOuvres(e.date, D.dateReference), D.utilitaires.joursOuvres(e.date, D.dateReference), e.id);
  });
});

test('jours ouvrés : liste de jours réglable et ajout de jours ouvrés', function () {
  // Semaine de six jours (lundi à samedi) : du vendredi au lundi suivant = samedi + lundi = 2.
  assert.strictEqual(Dates.joursOuvres('2026-10-16', '2026-10-19', [1, 2, 3, 4, 5, 6]), 2);
  // Le 3e jour ouvré après le lundi 19 octobre est le jeudi 22 ; après le vendredi 23, le mercredi 28.
  assert.strictEqual(Dates.ajouterJoursOuvres('2026-10-19T09:40:00+02:00', 3), '2026-10-22');
  assert.strictEqual(Dates.ajouterJoursOuvres('2026-10-23T10:30:00+02:00', 3), '2026-10-28');
  assert.strictEqual(Dates.ajouterJoursOuvres('2026-10-17T11:05:00+02:00', 1), '2026-10-19', 'depuis un samedi');
});

test('formats de dates en français', function () {
  assert.strictEqual(Dates.fmtDate('2026-10-23T17:30:00+02:00'), '23/10/2026');
  assert.strictEqual(Dates.fmtHeure('2026-10-23T17:30:00+02:00'), '17 h 30');
  assert.strictEqual(Dates.fmtJourLong(D.dateReference), 'vendredi 23 octobre 2026');
  assert.strictEqual(Dates.fmtCourt('2026-10-17T11:05:00+02:00'), 'sam. 17/10 à 11 h 05');
  assert.ok(Dates.estWeekEnd('2026-10-17T11:05:00+02:00') && !Dates.estWeekEnd('2026-10-19T09:40:00+02:00'));
  assert.strictEqual(Dates.fmtJoursOuvres(1), '1 jour ouvré');
  assert.strictEqual(Dates.fmtJoursOuvres(4), '4 jours ouvrés');
  assert.throws(function () { Dates.jourMs('pas une date'); });
});
