/* Flow Inbox : rapport hebdomadaire pour le dirigeant de l'agence. Logique pure, sans DOM.
 * Une semaine va du lundi au dimanche. La situation est reconstituée À LA FIN de la semaine choisie (ou à la date de référence pour la semaine en cours) :
 * une réponse donnée après cette date n'est pas comptée. Tout vient des données fictives et de la date de référence fixe ; aucune promesse de résultat. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./dates.js'), require('./format.js'), require('./contexte.js'), require('./demandes.js'), require('./indicateurs.js'));
  } else {
    var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };
    FI.core.rapport = factory(FI.core.dates, FI.core.format, FI.core.contexte, FI.core.demandes, FI.core.indicateurs);
  }
})(typeof self !== 'undefined' ? self : this, function (Dates, Fmt, Ctx, Dem, Ind) {
  'use strict';

  /** Messages tels qu'ils étaient à la date donnée : les messages plus récents sont écartés, une réponse postérieure n'existe pas encore. */
  function emailsAu(emails, dateIso) {
    return emails.filter(function (e) { return e.date <= dateIso; }).map(function (e) {
      var rep = e.traitement.premiere_reponse;
      if (!rep || rep <= dateIso) return e;
      var t = {};
      Object.keys(e.traitement).forEach(function (k) { t[k] = e.traitement[k]; });
      t.premiere_reponse = null;
      var c = {};
      Object.keys(e).forEach(function (k) { c[k] = e[k]; });
      c.traitement = t;
      return c;
    });
  }

  /** Date et heure de clôture de la semaine : dimanche 23 h 59, ou la date de référence pour la semaine en cours. */
  function cloture(sem, ref) {
    var fin = sem.fin + 'T23:59:00+02:00';
    return fin < ref ? fin : ref;
  }

  function compter(liste, cle, libelle) {
    var n = {};
    liste.forEach(function (x) { var k = cle(x); n[k] = (n[k] || 0) + 1; });
    return Object.keys(n).map(function (k) { return { id: k, libelle: libelle(k), n: n[k] }; })
      .sort(function (a, b) { return (b.n - a.n) || (a.libelle < b.libelle ? -1 : 1); });
  }

  function pl(n, un, plusieurs) { return n + ' ' + (n > 1 ? plusieurs : un); }

  /**
   * Rapport d'une semaine. emails : messages avec les actions de la session ; ctx : réglages ; opts : { ref, debut, delai, jours, horaires, categories }.
   * Renvoie les chiffres, les relances à la clôture et les points de vigilance (tous calculés).
   */
  function semaine(emails, ctx, opts, index) {
    var sems = Ind.semaines(opts.debut, opts.ref);
    var sem = sems[Math.max(0, Math.min(sems.length - 1, index))];
    var fin = cloture(sem, opts.ref);
    var live = sem.enCours;

    var msgsSemaine = emails.filter(function (e) { return Ind.dansSemaine(e.date, sem); });
    var auFin = emailsAu(emails, fin);
    var demsFin = Ind.demandes(auFin);
    var demsSemaine = demsFin.filter(function (d) { return Ind.dansSemaine(d.recu, sem); });

    /* Traitées : demandes dont la première réponse de l'agence date de la semaine (reçues cette semaine ou avant). */
    var toutesDems = Ind.demandes(emails);
    var traitees = toutesDems.filter(function (d) { return d.reponse && Ind.dansSemaine(d.reponse, sem); });
    var delais = traitees.map(function (d) { return Ind.heuresOuvrees(d.recu, d.reponse, opts.jours, opts.horaires); });

    /* En attente : demandes (de la semaine ou plus anciennes) restées sans réponse à la clôture. */
    var rel = Dem.relances(auFin, fin, opts.delai, opts.jours);
    var sansReponse = demsFin.filter(function (d) { return !d.reponse; });
    var sansReponseFil = {};
    rel.enRetard.concat(rel.aSurveiller).forEach(function (i) { sansReponseFil[i.fil] = true; });
    var enAttente = demsFin.filter(function (d) { return sansReponseFil[d.fil]; });

    var relances = rel.enRetard.map(function (i) {
      return {
        fil: i.fil, id: i.cible.id, entreprise: i.entreprise, objet: i.cible.objet, recu: i.cible.date,
        anciennete: i.anciennete, statut: live ? i.statut : null, responsable: live ? i.responsable : null,
        messages: i.sansReponse.length
      };
    });

    var comp = Ind.completude(demsSemaine);

    /* Points de vigilance : uniquement des faits calculés. */
    var vig = [];
    if (relances.length) {
      var plus = relances[0];
      vig.push({ id: 'retard', niveau: 'haut', texte: pl(relances.length, 'demande sans réponse', 'demandes sans réponse') + ' au-delà de ' + pl(opts.delai, 'jour ouvré', 'jours ouvrés') +
        ' ; la plus ancienne (' + plus.entreprise + ') date du ' + Dates.fmtDate(plus.recu) + ' (' + Dates.fmtJoursOuvres(plus.anciennete) + ').' });
    }
    if (comp.manquantes) {
      vig.push({ id: 'manquantes', niveau: 'moyen', texte: pl(comp.manquantes, 'demande reçue cette semaine', 'demandes reçues cette semaine') + ' avec au moins une information absente (le budget manque dans ' + comp.parChamp.budget + ' cas).' });
    }
    var enRevue = demsSemaine.filter(function (d) { return !d.horsPerimetre && (d.averifier.length || d.enRevueStatut); }).length;
    if (enRevue) {
      vig.push({ id: 'revue', niveau: 'moyen', texte: pl(enRevue, 'demande reçue cette semaine comporte', 'demandes reçues cette semaine comportent') + ' une information à vérifier par une personne.' });
    }
    var hors = demsSemaine.filter(function (d) { return d.horsPerimetre; });
    if (hors.length) {
      vig.push({ id: 'hors', niveau: 'bas', texte: pl(hors.length, 'demande reçue hors périmètre', 'demandes reçues hors périmètre') + ' : une réponse claire évite de les laisser sans suite.' });
    }
    var weekend = msgsSemaine.filter(function (e) { return Dates.estWeekEnd(e.date); }).length;
    if (weekend) {
      vig.push({ id: 'weekend', niveau: 'bas', texte: pl(weekend, 'message reçu', 'messages reçus') + ' un week-end : ils attendent le prochain jour ouvré.' });
    }
    var pj = msgsSemaine.filter(function (e) { return (e.revue || []).indexOf('piece_jointe_non_lue') >= 0; }).length;
    if (pj) {
      vig.push({ id: 'pj', niveau: 'bas', texte: pl(pj, 'message mentionne', 'messages mentionnent') + ' une pièce jointe que l\'outil ne lit pas : à ouvrir par une personne.' });
    }
    var urg = msgsSemaine.filter(function (e) { return (e.revue || []).indexOf('urgence') >= 0 || (e.revue || []).indexOf('demande_appel') >= 0; }).length;
    if (urg) {
      vig.push({ id: 'urgence', niveau: 'bas', texte: pl(urg, 'message exprime', 'messages expriment') + ' une urgence ou demandent un appel.' });
    }
    if (live) {
      var prets = enAttente.filter(function (d) { return d.statut === 'brouillon_pret'; }).length;
      if (prets) {
        vig.push({ id: 'prets', niveau: 'moyen', texte: pl(prets, 'brouillon préparé reste', 'brouillons préparés restent') + ' à relire et à envoyer par une personne : tant que rien n\'est envoyé, la demande reste sans réponse.' });
      }
    }

    return {
      index: sem.index, semaine: sem, cloture: fin, enCours: live,
      messages: msgsSemaine.length, messagesIds: msgsSemaine.map(function (e) { return e.id; }),
      recues: demsSemaine.length, horsPerimetre: hors.length,
      traitees: traitees.length, delaiMedian: Ind.mediane(delais), delaiN: delais.length,
      enAttente: enAttente.length, enAttenteDontSemaine: enAttente.filter(function (d) { return Ind.dansSemaine(d.recu, sem); }).length,
      sansReponseTotal: sansReponse.length,
      aRelancer: relances.length, relances: relances, aSurveiller: rel.aSurveiller.length,
      completude: comp,
      categories: Ind.parCategorie(msgsSemaine, opts.categories),
      services: Ind.parService(demsSemaine, ctx),
      vigilance: vig
    };
  }

  return { emailsAu: emailsAu, cloture: cloture, semaine: semaine, compter: compter };
});
