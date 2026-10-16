/* Flow Inbox : logique des demandes (filtres et compteurs, recherche, tri, fils, retards et relances). Logique pure, sans DOM.
 * Toutes les dates de référence sont passées en paramètre : la démonstration ne dépend jamais de l'horloge. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./dates.js'), require('./format.js'));
  } else {
    var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };
    FI.core.demandes = factory(FI.core.dates, FI.core.format);
  }
})(typeof self !== 'undefined' ? self : this, function (Dates, Fmt) {
  'use strict';

  /* Catégories de messages qui sont des demandes (hors périmètre exclu : traité à part). */
  var CATEGORIES_DEMANDE = ['nouvelle_demande', 'client_existant', 'relance_prospect'];
  /* Catégories pour lesquelles une réponse de l'agence est attendue (identique à FlowData). */
  var CATEGORIES_REPONSE_ATTENDUE = ['nouvelle_demande', 'client_existant', 'relance_prospect', 'hors_perimetre'];
  /* Statuts de messages écartés : aucune réponse attendue. */
  var STATUTS_ECARTES = ['classe_sans_suite', 'doublon'];
  var STATUTS_TERMINAUX = ['gagne', 'perdu'];

  /** Copie les messages en appliquant les modifications faites pendant la session (statut, responsable, relu). */
  function appliquerEtat(emails, surcharges) {
    return emails.map(function (e) {
      var o = surcharges && surcharges[e.id];
      if (!o) return e;
      var t = {};
      Object.keys(e.traitement).forEach(function (k) { t[k] = e.traitement[k]; });
      if (o.statut) t.statut = o.statut;
      if (Object.prototype.hasOwnProperty.call(o, 'responsable')) t.responsable = o.responsable;
      var c = {};
      Object.keys(e).forEach(function (k) { c[k] = e[k]; });
      c.traitement = t;
      return c;
    });
  }

  /* ---------- Réponse attendue, ancienneté, retard ---------- */

  function reponseAttendue(e) {
    return CATEGORIES_REPONSE_ATTENDUE.indexOf(e.categorie) >= 0 && STATUTS_ECARTES.indexOf(e.traitement.statut) < 0;
  }

  /** Vrai si une réponse est attendue et qu'aucune n'a été envoyée. Un brouillon préparé ou relu n'est pas une réponse. */
  function sansReponse(e) {
    return reponseAttendue(e) && !e.traitement.premiere_reponse;
  }

  /** Jours ouvrés écoulés depuis la réception, à la date de référence. */
  function anciennete(e, ref, jours) { return Dates.joursOuvres(e.date, ref, jours); }

  /** Sans réponse et délai convenu dépassé (strictement) : mercredi à vendredi = 2, pas encore en retard à 2 jours. */
  function enRetard(e, ref, delai, jours) { return sansReponse(e) && anciennete(e, ref, jours) > delai; }

  /** Sans réponse mais encore dans le délai. */
  function aSurveiller(e, ref, delai, jours) { return sansReponse(e) && anciennete(e, ref, jours) <= delai; }

  /** Date à partir de laquelle la demande est en retard : le (délai + 1)-ième jour ouvré après la réception. */
  function dateRetard(e, delai, jours) { return Dates.ajouterJoursOuvres(e.date, delai + 1, jours); }

  /* ---------- Filtres et compteurs ---------- */

  var FILTRES = [
    { id: 'a_traiter', libelle: 'À traiter', aide: 'Statut « À traiter » : aucune action enregistrée.', test: function (e) { return e.traitement.statut === 'a_traiter'; } },
    { id: 'qualifiees', libelle: 'Qualifiées', aide: 'Demandes relevées, sans passage en revue (hors doublons et messages classés).',
      test: function (e) { return CATEGORIES_DEMANDE.indexOf(e.categorie) >= 0 && ['en_revue', 'doublon', 'classe_sans_suite'].indexOf(e.traitement.statut) < 0; } },
    { id: 'en_revue', libelle: 'En revue', aide: 'Demandes mises en revue : une personne doit trancher.', test: function (e) { return e.traitement.statut === 'en_revue'; } },
    { id: 'hors_perimetre', libelle: 'Hors périmètre', aide: 'Demandes hors des services de l\'agence.', test: function (e) { return e.categorie === 'hors_perimetre'; } },
    { id: 'ignorees', libelle: 'Ignorées', aide: 'Messages classés sans suite et doublons.', test: function (e) { return STATUTS_ECARTES.indexOf(e.traitement.statut) >= 0; } },
    { id: 'toutes', libelle: 'Toutes', aide: 'Tous les messages.', test: function () { return true; } }
  ];

  function filtre(id) {
    for (var i = 0; i < FILTRES.length; i++) if (FILTRES[i].id === id) return FILTRES[i];
    return FILTRES[FILTRES.length - 1];
  }

  function filtrer(emails, id) { var f = filtre(id); return emails.filter(f.test); }

  function compteurs(emails) {
    var res = {};
    FILTRES.forEach(function (f) { res[f.id] = emails.filter(f.test).length; });
    return res;
  }

  /* ---------- Recherche ---------- */

  function entrepriseMessage(e) {
    var r = e.releves && e.releves.entreprise;
    return r && r.statut !== 'absent' && r.valeur ? r.valeur : '';
  }

  /** Recherche insensible à la casse et aux accents ; tous les mots saisis doivent être présents (expéditeur, adresse, objet, corps, entreprise). */
  function rechercher(emails, requete) {
    var mots = Fmt.norm(requete).split(/\s+/).filter(Boolean);
    if (!mots.length) return emails.slice();
    return emails.filter(function (e) {
      var foin = Fmt.norm([e.de.nom, e.de.adresse, e.objet, e.corps, entrepriseMessage(e)].join('\n'));
      return mots.every(function (m) { return foin.indexOf(m) >= 0; });
    });
  }

  /* ---------- Tri ---------- */

  var CLES_TRI = {
    date: { libelle: 'Date de réception', sens: 'desc' },
    expediteur: { libelle: 'Expéditeur', sens: 'asc' },
    objet: { libelle: 'Objet', sens: 'asc' },
    categorie: { libelle: 'Catégorie', sens: 'asc' },
    statut: { libelle: 'Statut', sens: 'asc' },
    anciennete: { libelle: 'Ancienneté', sens: 'desc' }
  };

  function comparer(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  /** Tri stable (égalités départagées par date puis identifiant). opts : { ref, jours, categories, statuts }. */
  function trier(emails, cle, sens, opts) {
    opts = opts || {};
    var dir = sens === 'asc' ? 1 : -1;
    var valeur = {
      date: function (e) { return e.date; },
      expediteur: function (e) { return Fmt.norm(e.de.nom); },
      objet: function (e) { return Fmt.norm(e.objet); },
      categorie: function (e) { return Fmt.norm(opts.categories ? opts.categories[e.categorie] : e.categorie); },
      statut: function (e) { return Fmt.norm(opts.statuts ? opts.statuts[e.traitement.statut] : e.traitement.statut); },
      anciennete: function (e) { return anciennete(e, opts.ref, opts.jours); }
    }[cle] || function (e) { return e.date; };
    return emails.slice().sort(function (x, y) {
      var c = comparer(valeur(x), valeur(y)) * dir;
      if (c) return c;
      c = comparer(x.date, y.date) * -1;
      return c || comparer(x.id, y.id);
    });
  }

  /* ---------- Fils ---------- */

  /** Regroupe les messages par fil ; messages triés par date. */
  function fils(emails) {
    var par = {};
    var ordre = [];
    emails.forEach(function (e) {
      if (!par[e.fil]) { par[e.fil] = []; ordre.push(e.fil); }
      par[e.fil].push(e);
    });
    return ordre.map(function (f) {
      var m = par[f].slice().sort(function (a, b) { return comparer(a.date, b.date) || comparer(a.id, b.id); });
      return { fil: f, messages: m, lead: m[0] };
    });
  }

  /** Statut d'une demande (fil) : gagnée ou perdue si l'un des messages l'est, sinon statut du dernier message. */
  function statutFil(messages) {
    for (var i = 0; i < messages.length; i++) if (STATUTS_TERMINAUX.indexOf(messages[i].traitement.statut) >= 0) return messages[i].traitement.statut;
    return messages[messages.length - 1].traitement.statut;
  }

  /** Première réponse de l'agence dans le fil (la plus ancienne), ou null. */
  function premiereReponseFil(messages) {
    var rep = messages.map(function (m) { return m.traitement.premiere_reponse; }).filter(Boolean).sort();
    return rep.length ? rep[0] : null;
  }

  /** Première valeur non absente d'un champ dans le fil (ordre chronologique, ou inverse pour le plus récent). */
  function champFil(messages, champ, recent) {
    var liste = recent ? messages.slice().reverse() : messages;
    for (var i = 0; i < liste.length; i++) {
      var r = liste[i].releves[champ];
      if (r && r.statut !== 'absent') return r;
    }
    return { statut: 'absent', valeur: null, passage: null };
  }

  function entrepriseFil(messages) {
    var r = champFil(messages, 'entreprise', false);
    return r.statut !== 'absent' && r.valeur ? r.valeur : messages[0].de.nom;
  }

  /** Responsable d'une demande : celui du dernier message qui en a un. */
  function responsableFil(messages) {
    for (var i = messages.length - 1; i >= 0; i--) if (messages[i].traitement.responsable) return messages[i].traitement.responsable;
    return null;
  }

  /* ---------- Relances ---------- */

  /**
   * Demandes (fils) sans réponse. Le calcul part des données et de la date de référence, jamais d'une liste écrite.
   * Un fil est « en retard » si son message le plus ancien sans réponse a dépassé le délai ; sinon « à surveiller ».
   * Classement par ancienneté décroissante.
   */
  function relances(emails, ref, delai, jours) {
    var res = { enRetard: [], aSurveiller: [] };
    fils(emails).forEach(function (f) {
      var sans = f.messages.filter(sansReponse);
      if (!sans.length) return;
      var cible = sans[0];
      var age = anciennete(cible, ref, jours);
      var item = {
        fil: f.fil, messages: f.messages, lead: f.lead, cible: cible, sansReponse: sans,
        anciennete: age, retard: age - delai, enRetard: age > delai,
        entreprise: entrepriseFil(f.messages), responsable: responsableFil(f.messages), statut: statutFil(f.messages),
        dateRetard: dateRetard(cible, delai, jours)
      };
      (item.enRetard ? res.enRetard : res.aSurveiller).push(item);
    });
    var ordre = function (a, b) { return (b.anciennete - a.anciennete) || comparer(a.cible.date, b.cible.date); };
    res.enRetard.sort(ordre);
    res.aSurveiller.sort(ordre);
    return res;
  }

  return {
    CATEGORIES_DEMANDE: CATEGORIES_DEMANDE, CATEGORIES_REPONSE_ATTENDUE: CATEGORIES_REPONSE_ATTENDUE,
    STATUTS_ECARTES: STATUTS_ECARTES, STATUTS_TERMINAUX: STATUTS_TERMINAUX, FILTRES: FILTRES, CLES_TRI: CLES_TRI,
    appliquerEtat: appliquerEtat, reponseAttendue: reponseAttendue, sansReponse: sansReponse, anciennete: anciennete,
    enRetard: enRetard, aSurveiller: aSurveiller, dateRetard: dateRetard,
    filtre: filtre, filtrer: filtrer, compteurs: compteurs, rechercher: rechercher, trier: trier, entrepriseMessage: entrepriseMessage,
    fils: fils, statutFil: statutFil, premiereReponseFil: premiereReponseFil, champFil: champFil, entrepriseFil: entrepriseFil,
    responsableFil: responsableFil, relances: relances
  };
});
