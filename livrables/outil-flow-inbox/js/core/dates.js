/* Flow Inbox : dates, jours ouvrés (lundi à vendredi par défaut) et formats français. Logique pure, sans DOM.
 * Aucune lecture de l'horloge : toute date de référence est passée en paramètre. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };
    FI.core.dates = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var JOUR_MS = 86400000;
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var OUVRES_PAR_DEFAUT = [1, 2, 3, 4, 5];

  function deux(n) { return (n < 10 ? '0' : '') + n; }

  /** Découpe « AAAA-MM-JJ[Thh:mm] » ; null si le format n'est pas reconnu. */
  function parties(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(iso || ''));
    if (!m) return null;
    return { a: +m[1], m: +m[2], j: +m[3], h: m[4] === undefined ? null : +m[4], mi: m[5] === undefined ? null : +m[5] };
  }

  /** Jour calendaire (UTC, minuit) en millisecondes ; l'heure et le fuseau sont ignorés. */
  function jourMs(iso) {
    var p = parties(iso);
    if (!p) throw new Error('Date invalide : ' + iso);
    return Date.UTC(p.a, p.m - 1, p.j);
  }

  function jourSemaine(iso) { return new Date(jourMs(iso)).getUTCDay(); }

  function msVersIso(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + '-' + deux(d.getUTCMonth() + 1) + '-' + deux(d.getUTCDate());
  }

  function estOuvre(ms, liste) { return (liste || OUVRES_PAR_DEFAUT).indexOf(new Date(ms).getUTCDay()) >= 0; }

  /** Nombre de jours ouvrés dans l'intervalle ]jour de début, jour de fin] : un message reçu le mardi compte 1 le mercredi. */
  function joursOuvres(debutIso, finIso, liste) {
    var d = jourMs(debutIso);
    var f = jourMs(finIso);
    var n = 0;
    while (d < f) {
      d += JOUR_MS;
      if (estOuvre(d, liste)) n++;
    }
    return n;
  }

  /** Date (AAAA-MM-JJ) du n-ième jour ouvré qui suit le jour de la date donnée. */
  function ajouterJoursOuvres(iso, n, liste) {
    var d = jourMs(iso);
    var k = 0;
    while (k < n) {
      d += JOUR_MS;
      if (estOuvre(d, liste)) k++;
    }
    return msVersIso(d);
  }

  /** Jours calendaires entre deux dates, de minuit à minuit. */
  function joursCalendaires(debutIso, finIso) { return Math.round((jourMs(finIso) - jourMs(debutIso)) / JOUR_MS); }

  function memeJour(a, b) { return jourMs(a) === jourMs(b); }

  function fmtDate(iso) {
    var p = parties(iso);
    return p ? deux(p.j) + '/' + deux(p.m) + '/' + p.a : '';
  }

  function fmtDateCourte(iso) {
    var p = parties(iso);
    return p ? deux(p.j) + '/' + deux(p.m) : '';
  }

  function fmtHeure(iso) {
    var p = parties(iso);
    return p && p.h !== null ? p.h + ' h ' + deux(p.mi) : '';
  }

  /** « 23/10/2026 à 17 h 30 » (ou la date seule si l'heure manque). */
  function fmtDateHeure(iso) {
    var h = fmtHeure(iso);
    return fmtDate(iso) + (h ? ' à ' + h : '');
  }

  /** « ven. 23/10 à 9 h 05 » : jour de la semaine, date courte, heure (le week-end se voit d'un coup d'œil). */
  function fmtCourt(iso) {
    var h = fmtHeure(iso);
    return JOURS_COURTS[jourSemaine(iso)] + ' ' + fmtDateCourte(iso) + (h ? ' à ' + h : '');
  }

  /** « vendredi 23 octobre 2026 ». */
  function fmtJourLong(iso) {
    var p = parties(iso);
    return JOURS[jourSemaine(iso)] + ' ' + (p.j === 1 ? '1er' : p.j) + ' ' + MOIS[p.m - 1] + ' ' + p.a;
  }

  function estWeekEnd(iso) { var j = jourSemaine(iso); return j === 0 || j === 6; }

  function pluriel(n, un, plusieurs) { return n + ' ' + (n > 1 ? plusieurs : un); }

  /** « 0 jour ouvré », « 1 jour ouvré », « 4 jours ouvrés ». */
  function fmtJoursOuvres(n) { return pluriel(n, 'jour ouvré', 'jours ouvrés'); }

  return {
    JOURS: JOURS, MOIS: MOIS, OUVRES_PAR_DEFAUT: OUVRES_PAR_DEFAUT,
    parties: parties, jourMs: jourMs, jourSemaine: jourSemaine, msVersIso: msVersIso, estOuvre: estOuvre,
    joursOuvres: joursOuvres, ajouterJoursOuvres: ajouterJoursOuvres, joursCalendaires: joursCalendaires, memeJour: memeJour,
    fmtDate: fmtDate, fmtDateCourte: fmtDateCourte, fmtHeure: fmtHeure, fmtDateHeure: fmtDateHeure, fmtCourt: fmtCourt,
    fmtJourLong: fmtJourLong, estWeekEnd: estWeekEnd, pluriel: pluriel, fmtJoursOuvres: fmtJoursOuvres
  };
});
