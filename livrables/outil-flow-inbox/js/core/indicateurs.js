/* Flow Inbox : indicateurs du tableau de bord (demandes par semaine, catégories, services, complétude, délai de première réponse,
 * budgets DÉCLARÉS, activité par responsable). Logique pure, sans DOM. Tout est calculé à la date de référence passée en paramètre :
 * aucune lecture de l'horloge de l'ordinateur. Ce sont des indicateurs sur données fictives, pas des mesures de performance.
 *
 * Vocabulaire : un « message » est un e-mail ; une « demande » est un fil (un ou plusieurs messages) dont le premier message attend
 * une réponse de l'agence (nouvelle demande, client existant, relance de prospect, hors périmètre). Un doublon n'est pas une demande. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./dates.js'), require('./format.js'), require('./contexte.js'), require('./demandes.js'));
  } else {
    var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };
    FI.core.indicateurs = factory(FI.core.dates, FI.core.format, FI.core.contexte, FI.core.demandes);
  }
})(typeof self !== 'undefined' ? self : this, function (Dates, Fmt, Ctx, Dem) {
  'use strict';

  var CHAMPS = ['besoin', 'service', 'budget', 'delai', 'entreprise', 'contact'];
  var CHAMPS_LIBELLES = { besoin: 'Besoin', service: 'Service', budget: 'Budget', delai: 'Délai', entreprise: 'Entreprise', contact: 'Contact' };
  var HORAIRES_DEFAUT = { debut: '09:00', fin: '18:00' };

  /* Tranches de budget (bornes basses incluses). Un budget est classé selon son montant le plus bas annoncé, ou selon son plafond. */
  var TRANCHES = [
    { id: 't0', libelle: 'Moins de 1 000 €', min: 0, max: 1000 },
    { id: 't1', libelle: '1 000 à 2 999 €', min: 1000, max: 3000 },
    { id: 't2', libelle: '3 000 à 4 999 €', min: 3000, max: 5000 },
    { id: 't3', libelle: '5 000 à 9 999 €', min: 5000, max: 10000 },
    { id: 't4', libelle: '10 000 € et plus', min: 10000, max: Infinity }
  ];
  var PERIODES = { mensuel: 'par mois', annuel: 'par an', par_unite: 'par unité' };

  /* ---------- Semaines ---------- */

  function lundi(iso) {
    var jour = Dates.jourSemaine(iso);
    return Dates.msVersIso(Dates.jourMs(iso) - ((jour + 6) % 7) * 86400000);
  }

  /** Semaines (lundi à dimanche) qui couvrent la période, de la première date des données jusqu'à la date de référence. */
  function semaines(debutIso, refIso) {
    var res = [];
    var d = lundi(debutIso);
    var refJour = Dates.msVersIso(Dates.jourMs(refIso));
    var i = 0;
    while (d <= refJour && i < 60) {
      var fin = Dates.msVersIso(Dates.jourMs(d) + 6 * 86400000);
      res.push({
        index: i, debut: d, fin: fin, enCours: refJour <= fin,
        libelle: 'Semaine du ' + Dates.fmtDateCourte(d) + ' au ' + Dates.fmtDateCourte(fin) + (refJour <= fin ? ' (en cours à la date de référence)' : '')
      });
      d = Dates.msVersIso(Dates.jourMs(d) + 7 * 86400000);
      i++;
    }
    return res;
  }

  function dansSemaine(dateIso, sem) {
    var j = String(dateIso).slice(0, 10);
    return !!sem && j >= sem.debut && j <= sem.fin;
  }

  function indexSemaine(sems, dateIso) {
    for (var i = 0; i < sems.length; i++) if (dansSemaine(dateIso, sems[i])) return i;
    return -1;
  }

  /* ---------- Heures ouvrées ---------- */

  function minutes(hhmm) {
    var m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
    return m ? +m[1] * 60 + +m[2] : 0;
  }

  /**
   * Heures ouvrées écoulées entre deux horodatages : on ne compte que les jours ouvrés et les horaires de bureau (par défaut 9 h à 18 h).
   * Un message reçu hors horaires (soir, week-end) commence à compter à l'ouverture suivante.
   */
  function heuresOuvrees(debutIso, finIso, jours, horaires) {
    var hr = horaires || HORAIRES_DEFAUT;
    var o1 = minutes(hr.debut), o2 = minutes(hr.fin);
    var a = Dates.parties(debutIso), b = Dates.parties(finIso);
    var m1 = (a.h === null ? 0 : a.h) * 60 + (a.mi === null ? 0 : a.mi);
    var m2 = (b.h === null ? 0 : b.h) * 60 + (b.mi === null ? 0 : b.mi);
    var d0 = Dates.jourMs(debutIso), d1 = Dates.jourMs(finIso);
    var total = 0;
    for (var d = d0; d <= d1; d += 86400000) {
      if (!Dates.estOuvre(d, jours)) continue;
      var debut = d === d0 ? Math.max(m1, o1) : o1;
      var fin = d === d1 ? Math.min(m2, o2) : o2;
      if (fin > debut) total += fin - debut;
    }
    return total / 60;
  }

  /** « 50 min », « 2 h 05 », « 9 h 00 » (heures ouvrées). */
  function fmtDuree(heures) {
    var min = Math.round(heures * 60);
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), r = min % 60;
    return h + ' h ' + (r < 10 ? '0' : '') + r;
  }

  function mediane(valeurs) {
    if (!valeurs.length) return null;
    var t = valeurs.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(t.length / 2);
    return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
  }

  /* ---------- Demandes ---------- */

  /** Une entrée par demande (fil) : premier message qui attend une réponse, champs relevés au niveau du fil, état. */
  function demandes(emails) {
    var res = [];
    Dem.fils(emails).forEach(function (f) {
      var msgs = f.messages.filter(function (m) { return m.traitement.statut !== 'doublon'; });
      if (!msgs.length) return;
      var lead = msgs[0];
      if (Dem.CATEGORIES_REPONSE_ATTENDUE.indexOf(lead.categorie) < 0) return;
      var releves = {};
      var absents = [], averifier = [];
      CHAMPS.forEach(function (c) {
        var r = c === 'budget' ? Dem.champFil(msgs, c, true) : Dem.champFil(msgs, c, false);
        releves[c] = r;
        if (r.statut === 'absent') absents.push(c); else if (r.statut === 'a_verifier') averifier.push(c);
      });
      var service = releves.service;
      var horsPerimetre = lead.categorie === 'hors_perimetre' || (service.statut !== 'absent' && service.valeur === 'hors_catalogue');
      var statut = Dem.statutFil(msgs);
      res.push({
        fil: f.fil, messages: msgs, lead: lead, id: lead.id, categorie: lead.categorie, recu: lead.date,
        entreprise: Dem.entrepriseFil(msgs), statut: statut,
        aTraiter: msgs.some(function (m) { return m.traitement.statut === 'a_traiter'; }),
        reponse: Dem.premiereReponseFil(msgs), responsable: Dem.responsableFil(msgs),
        releves: releves, absents: absents, averifier: averifier, horsPerimetre: horsPerimetre,
        enRevueStatut: msgs.some(function (m) { return m.traitement.statut === 'en_revue'; })
      });
    });
    return res;
  }

  /* ---------- Répartitions ---------- */

  function trierParN(liste) {
    return liste.slice().sort(function (a, b) { return (b.n - a.n) || (a.libelle < b.libelle ? -1 : a.libelle > b.libelle ? 1 : 0); });
  }

  /** Messages par catégorie (tous les messages reçus, doublons compris). */
  function parCategorie(emails, categories) {
    var n = {};
    emails.forEach(function (e) { n[e.categorie] = (n[e.categorie] || 0) + 1; });
    return trierParN(Object.keys(categories).filter(function (k) { return n[k]; }).map(function (k) { return { id: k, libelle: categories[k], n: n[k] }; }));
  }

  /** Demandes par service demandé (valeur relevée, quel que soit son statut ; « Non indiqué » si le service est absent). */
  function parService(dems, ctx) {
    var n = {}, verif = {};
    dems.forEach(function (d) {
      var r = d.releves.service;
      var id = r.statut !== 'absent' && r.valeur ? r.valeur : 'non_indique';
      n[id] = (n[id] || 0) + 1;
      if (r.statut === 'a_verifier') verif[id] = (verif[id] || 0) + 1;
    });
    return trierParN(Object.keys(n).map(function (k) {
      return { id: k, libelle: k === 'non_indique' ? 'Non indiqué' : Ctx.libelleService(ctx, k), n: n[k], aVerifier: verif[k] || 0 };
    }));
  }

  function parSemaine(dems, emails, sems) {
    return sems.map(function (s) {
      return {
        index: s.index, libelle: Dates.fmtDateCourte(s.debut) + ' au ' + Dates.fmtDateCourte(s.fin), debut: s.debut, fin: s.fin, enCours: s.enCours,
        demandes: dems.filter(function (d) { return dansSemaine(d.recu, s); }).length,
        messages: emails.filter(function (e) { return dansSemaine(e.date, s); }).length
      };
    });
  }

  /**
   * Complétude des demandes dans le périmètre de l'agence (les demandes hors périmètre sont exclues).
   * En revue : au moins un champ « à vérifier », ou statut « En revue ». Incomplète : au moins un champ absent. Complète : les six champs relevés.
   */
  function completude(dems) {
    var base = dems.filter(function (d) { return !d.horsPerimetre; });
    var enRevue = base.filter(function (d) { return d.averifier.length || d.enRevueStatut; });
    var incompletes = base.filter(function (d) { return !(d.averifier.length || d.enRevueStatut) && d.absents.length; });
    var completes = base.filter(function (d) { return !(d.averifier.length || d.enRevueStatut) && !d.absents.length; });
    var manquantes = base.filter(function (d) { return d.absents.length; });
    var parChamp = {};
    CHAMPS.forEach(function (c) { parChamp[c] = manquantes.filter(function (d) { return d.absents.indexOf(c) >= 0; }).length; });
    return {
      base: base.length, horsPerimetre: dems.length - base.length,
      completes: completes.length, incompletes: incompletes.length, enRevue: enRevue.length,
      enRevueStatut: base.filter(function (d) { return d.enRevueStatut; }).length,
      manquantes: manquantes.length, manquantesEtAVerifier: manquantes.filter(function (d) { return d.averifier.length || d.enRevueStatut; }).length,
      parChamp: parChamp,
      liste: manquantes.map(function (d) { return { fil: d.fil, id: d.id, entreprise: d.entreprise, champs: d.absents.slice() }; })
    };
  }

  /* ---------- Délai de première réponse ---------- */

  /** Délai médian de première réponse, en heures ouvrées, calculé sur les dates fictives (demandes déjà répondues seulement). */
  function delaiReponse(dems, jours, horaires) {
    var repondues = dems.filter(function (d) { return d.reponse; });
    var h = repondues.map(function (d) { return heuresOuvrees(d.recu, d.reponse, jours, horaires); });
    var journee = (minutes((horaires || HORAIRES_DEFAUT).fin) - minutes((horaires || HORAIRES_DEFAUT).debut)) / 60;
    var tr = [
      { id: 'd0', libelle: 'Dans les 2 premières heures ouvrées', n: h.filter(function (x) { return x <= 2; }).length },
      { id: 'd1', libelle: 'Dans le même jour ouvré (jusqu\'à ' + journee + ' h ouvrées)', n: h.filter(function (x) { return x > 2 && x <= journee; }).length },
      { id: 'd2', libelle: 'Au-delà d\'un jour ouvré', n: h.filter(function (x) { return x > journee; }).length }
    ];
    return {
      n: repondues.length, sansReponse: dems.length - repondues.length,
      mediane: mediane(h), min: h.length ? Math.min.apply(null, h) : null, max: h.length ? Math.max.apply(null, h) : null,
      journee: journee, tranches: tr
    };
  }

  /* ---------- Budgets déclarés ---------- */

  /** Bornes annoncées d'un budget : min (null si inconnu), max (null si ouvert). Un plafond n'a pas de minimum, un « à partir de » pas de maximum. */
  function bornes(v) {
    var un = v.min !== null && v.min !== undefined ? v.min : v.max;
    switch (v.type) {
      case 'fourchette': return { min: v.min, max: v.max };
      case 'a_partir_de': return { min: un, max: null };
      case 'plafond': return { min: null, max: v.max !== null && v.max !== undefined ? v.max : un };
      default: return { min: un, max: un };
    }
  }

  function indexTranche(v) {
    var b = bornes(v);
    var ref = b.min !== null ? b.min : b.max;
    for (var i = 0; i < TRANCHES.length; i++) if (ref >= TRANCHES[i].min && ref < TRANCHES[i].max) return i;
    return TRANCHES.length - 1;
  }

  function groupeVide() { return { n: 0, minCumule: 0, maxCumule: 0, ouverts: 0, seuilsOuverts: 0, plafonds: 0, approximatifs: 0, incertains: 0, aVerifier: 0 }; }

  /**
   * Budgets DÉCLARÉS par les prospects (jamais des prix de l'agence, jamais garantis). Les montants ne s'additionnent pas comme des montants certains :
   * on garde un minimum cumulé (minimums annoncés ; un plafond compte 0) et un maximum cumulé (maximums annoncés ; un « à partir de » n'a pas de maximum
   * et est compté à part). Les montants ponctuels et ceux annoncés par mois, par an ou par unité ne se mélangent jamais.
   */
  function budgets(dems) {
    var base = dems.filter(function (d) { return !d.horsPerimetre; });
    var res = { n: base.length, avecMontant: 0, sansMontant: 0, ponctuels: groupeVide(), recurrents: {}, tranches: TRANCHES.map(function (t) { return { id: t.id, libelle: t.libelle, n: 0 }; }), types: {} };
    Object.keys(PERIODES).forEach(function (p) { res.recurrents[p] = groupeVide(); });
    base.forEach(function (d) {
      var r = d.releves.budget;
      if (r.statut === 'absent' || !r.valeur) { res.sansMontant++; return; }
      var v = r.valeur;
      res.avecMontant++;
      res.types[v.type] = (res.types[v.type] || 0) + 1;
      var g = v.periode && res.recurrents[v.periode] ? res.recurrents[v.periode] : res.ponctuels;
      var b = bornes(v);
      g.n++;
      g.minCumule += b.min !== null ? b.min : 0;
      if (b.max !== null) g.maxCumule += b.max; else { g.ouverts++; g.seuilsOuverts += b.min || 0; }
      if (v.type === 'plafond') g.plafonds++;
      if (v.type === 'approximatif') g.approximatifs++;
      if (v.type === 'incertain') g.incertains++;
      if (r.statut === 'a_verifier') g.aVerifier++;
      if (g === res.ponctuels) res.tranches[indexTranche(v)].n++;
    });
    return res;
  }

  /* ---------- Activité par responsable ---------- */

  function parResponsable(dems, relancesEnRetard, ctx) {
    var retard = {};
    relancesEnRetard.forEach(function (i) { retard[i.fil] = true; });
    var lignes = {};
    function ligne(id) {
      var k = id || 'aucun';
      return lignes[k] || (lignes[k] = { id: k, libelle: id ? Ctx.nomPersonne(ctx, id) : 'Non attribué', demandes: 0, repondues: 0, aTraiter: 0, enRetard: 0 });
    }
    ctx.equipe.forEach(function (p) { ligne(p.id); });
    dems.forEach(function (d) {
      var l = ligne(d.responsable);
      l.demandes++;
      if (d.reponse) l.repondues++;
      if (d.aTraiter) l.aTraiter++;
      if (retard[d.fil]) l.enRetard++;
    });
    return Object.keys(lignes).map(function (k) { return lignes[k]; }).filter(function (l) { return l.id !== 'aucun' || l.demandes; })
      .sort(function (a, b) { return (b.demandes - a.demandes) || (a.libelle < b.libelle ? -1 : 1); });
  }

  /* ---------- Tableau de bord complet ---------- */

  /**
   * Tous les indicateurs du tableau de bord. emails : messages avec les actions de la session ; ctx : réglages (services, équipe) ;
   * opts : { ref, debut, delai, jours, horaires, categories }.
   */
  function tableauDeBord(emails, ctx, opts) {
    var ref = opts.ref;
    var jours = opts.jours;
    var sems = semaines(opts.debut, ref);
    var dems = demandes(emails);
    var rel = Dem.relances(emails, ref, opts.delai, jours);
    var comp = completude(dems);

    var aTraiter = dems.filter(function (d) { return d.aTraiter; });
    var messagesATraiter = emails.filter(function (e) { return e.traitement.statut === 'a_traiter'; }).length;

    return {
      ref: ref, delai: opts.delai, semaines: sems,
      messages: emails.length, demandes: dems.length, horsPerimetre: dems.filter(function (d) { return d.horsPerimetre; }).length,
      aTraiter: { n: aTraiter.length, messages: messagesATraiter },
      sansReponse: {
        n: rel.enRetard.length, messages: rel.enRetard.reduce(function (a, i) { return a + i.sansReponse.length; }, 0),
        aSurveiller: rel.aSurveiller.length,
        items: rel.enRetard.map(function (i) { return { fil: i.fil, id: i.cible.id, entreprise: i.entreprise, anciennete: i.anciennete, objet: i.cible.objet, recu: i.cible.date }; })
      },
      completude: comp,
      parSemaine: parSemaine(dems, emails, sems),
      categories: parCategorie(emails, opts.categories),
      services: parService(dems, ctx),
      delaiReponse: delaiReponse(dems, jours, opts.horaires),
      budgets: budgets(dems),
      responsables: parResponsable(dems, rel.enRetard, ctx)
    };
  }

  return {
    CHAMPS: CHAMPS, CHAMPS_LIBELLES: CHAMPS_LIBELLES, TRANCHES: TRANCHES, PERIODES: PERIODES, HORAIRES_DEFAUT: HORAIRES_DEFAUT,
    lundi: lundi, semaines: semaines, dansSemaine: dansSemaine, indexSemaine: indexSemaine,
    heuresOuvrees: heuresOuvrees, fmtDuree: fmtDuree, mediane: mediane,
    demandes: demandes, parCategorie: parCategorie, parService: parService, parSemaine: parSemaine,
    completude: completude, delaiReponse: delaiReponse, bornes: bornes, budgets: budgets, parResponsable: parResponsable,
    tableauDeBord: tableauDeBord
  };
});
