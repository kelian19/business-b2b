/* Flow Inbox : état de la session, EN MÉMOIRE SEULEMENT (rien n'est écrit sur le disque ni envoyé ; un rechargement remet la démonstration à zéro).
 * Contient les réglages de l'agence, les actions simulées (relu, mise en revue, ignoré), les brouillons modifiés et les choix d'affichage. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var Data = root.FlowData;
  var Ctx = FI.core.contexte;
  var Dem = FI.core.demandes;
  var Br = FI.core.brouillon;
  var Ind = FI.core.indicateurs;
  var Rap = FI.core.rapport;

  var etat = nouvelEtat();
  var abonnes = [];
  var cache = null;

  function nouvelEtat() {
    return {
      ctx: Ctx.creer(Data),
      surcharges: {},   // id de message -> { statut, responsable, relu }
      brouillons: {},   // id de message -> { texte (modifié) | null, questionsService, relu }
      relancesTextes: {}, // id de fil -> texte modifié
      boite: { filtre: 'toutes', q: '', tri: 'date', sens: 'desc', semaine: '', liste: [] },
      rapport: { semaine: null },
      essai: { texte: '', exemple: null },
      suivi: { tri: 'recu', sens: 'desc', statut: '', service: '', responsable: '', texte: '', classes: false }
    };
  }

  function emettre(silencieux) {
    cache = null;
    cacheTdb = null;
    abonnes.forEach(function (f) { f(!!silencieux); });
  }

  function abonner(f) { abonnes.push(f); }

  /** Messages avec les actions de la session appliquées. */
  function emails() {
    if (!cache) cache = Dem.appliquerEtat(Data.emails, etat.surcharges);
    return cache;
  }

  function email(id) {
    var l = emails();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }

  function delai() { return etat.ctx.parametres.delai_relance_jours_ouvres; }
  function jours() { return etat.ctx.parametres.jours_ouvres; }
  function ref() { return Data.dateReference; }

  function relances() { return Dem.relances(emails(), ref(), delai(), jours()); }

  /** Options communes des indicateurs : date de référence fixe, délai et jours ouvrés du réglage courant. */
  function optsIndicateurs() {
    return { ref: ref(), debut: Data.dateDebut, delai: delai(), jours: jours(), horaires: Data.parametres.horaires, categories: Data.categories };
  }

  var cacheTdb = null;
  /** Tableau de bord complet (mis en cache jusqu'à la prochaine modification). */
  function tableauDeBord() {
    if (!cacheTdb) cacheTdb = Ind.tableauDeBord(emails(), etat.ctx, optsIndicateurs());
    return cacheTdb;
  }

  function semaines() { return Ind.semaines(Data.dateDebut, ref()); }

  /** Rapport de la semaine choisie (par défaut la dernière, en cours à la date de référence). */
  function rapportSemaine(index) {
    var sems = semaines();
    var i = index === null || index === undefined ? (etat.rapport.semaine === null ? sems.length - 1 : etat.rapport.semaine) : index;
    return Rap.semaine(emails(), etat.ctx, optsIndicateurs(), i);
  }

  function setSemaineRapport(i) { etat.rapport.semaine = i; emettre(true); }

  /* ---------- Actions simulées sur un message ---------- */

  function surcharge(id) { return etat.surcharges[id] || (etat.surcharges[id] = {}); }

  /** Un message qui a déjà reçu une réponse garde son statut : seules les demandes en attente de réponse peuvent changer. */
  function peutChangerStatut(id) {
    var e = email(id);
    return !!e && !e.traitement.premiere_reponse && e.traitement.statut !== 'doublon' && Dem.CATEGORIES_REPONSE_ATTENDUE.indexOf(e.categorie) >= 0;
  }

  function setStatut(id, statut) {
    surcharge(id).statut = statut;
    emettre();
  }

  function retablirStatut(id) {
    if (etat.surcharges[id]) { delete etat.surcharges[id].statut; delete etat.surcharges[id].responsable; }
    var b = etat.brouillons[id];
    if (b) b.relu = false;
    emettre();
  }

  function aSurcharge(id) {
    var o = etat.surcharges[id];
    return !!(o && (o.statut || Object.prototype.hasOwnProperty.call(o, 'responsable'))) || !!(etat.brouillons[id] && etat.brouillons[id].relu);
  }

  function setResponsable(id, resp) {
    surcharge(id).responsable = resp || null;
    emettre();
  }

  /** « Marquer comme relu » : le brouillon est relu par une personne ; une demande « À traiter » passe à « Brouillon prêt ». Rien n'est envoyé. */
  function marquerRelu(id) {
    var b = brouillonEtat(id);
    b.relu = true;
    var e = email(id);
    if (e && e.traitement.statut === 'a_traiter') surcharge(id).statut = 'brouillon_pret';
    emettre();
  }

  /* ---------- Brouillons ---------- */

  function brouillonEtat(id) {
    return etat.brouillons[id] || (etat.brouillons[id] = { texte: null, questionsService: false, relu: false });
  }

  function genererBrouillon(id) {
    var e = email(id);
    return Br.construire(e, etat.ctx, { emails: emails(), questionsService: !!brouillonEtat(id).questionsService });
  }

  /** Brouillon courant : texte préparé par les règles (réglages actuels) ou texte modifié par la personne. */
  function brouillon(id) {
    var gen = genererBrouillon(id);
    var b = brouillonEtat(id);
    var modifie = b.texte !== null && b.texte !== gen.texte;
    return { gen: gen, texte: b.texte !== null ? b.texte : gen.texte, modifie: modifie, relu: !!b.relu, questionsService: !!b.questionsService };
  }

  function setTexteBrouillon(id, texte) {
    brouillonEtat(id).texte = texte;
    emettre(true);
  }

  function retablirBrouillon(id) {
    brouillonEtat(id).texte = null;
    emettre();
  }

  function setQuestionsService(id, oui) {
    brouillonEtat(id).questionsService = !!oui;
    emettre();
  }

  /* ---------- Relances ---------- */

  function relanceTexte(item) {
    var gen = Br.relance(item, etat.ctx, emails());
    var edite = etat.relancesTextes[item.fil];
    return { gen: gen, texte: edite !== undefined ? edite : gen.texte, modifie: edite !== undefined && edite !== gen.texte };
  }

  function setRelanceTexte(fil, texte) { etat.relancesTextes[fil] = texte; emettre(true); }
  function retablirRelance(fil) { delete etat.relancesTextes[fil]; emettre(); }

  /* ---------- Réglages ---------- */

  function setDelai(n) {
    var v = Math.max(1, Math.min(10, Math.round(+n) || 2));
    etat.ctx.parametres.delai_relance_jours_ouvres = v;
    emettre();
  }
  function setTon(t) { etat.ctx.agence.ton = t; emettre(); }
  function setSignature(s) { etat.ctx.agence.signature = s; emettre(true); }
  function setResponsableDefaut(id) { etat.ctx.parametres.responsable_par_defaut = id; emettre(); }
  function setPersonne(id, champ, valeur) { var p = Ctx.personne(etat.ctx, id); if (p) { p[champ] = valeur; emettre(true); } }
  function setQuestionService(id, i, valeur) { var s = Ctx.service(etat.ctx, id); if (s) { s.questions[i] = valeur; emettre(true); } }
  function retablirReglages() { etat.ctx = Ctx.creer(Data); emettre(); }
  function reinitialiser() { etat = nouvelEtat(); emettre(); }

  FI.ui.store = {
    get etat() { return etat; },
    get ctx() { return etat.ctx; },
    abonner: abonner, emettre: emettre, emails: emails, email: email, delai: delai, jours: jours, ref: ref, relances: relances,
    optsIndicateurs: optsIndicateurs, tableauDeBord: tableauDeBord, semaines: semaines, rapportSemaine: rapportSemaine, setSemaineRapport: setSemaineRapport,
    peutChangerStatut: peutChangerStatut, setStatut: setStatut, retablirStatut: retablirStatut, aSurcharge: aSurcharge,
    setResponsable: setResponsable, marquerRelu: marquerRelu,
    brouillon: brouillon, setTexteBrouillon: setTexteBrouillon, retablirBrouillon: retablirBrouillon, setQuestionsService: setQuestionsService,
    relanceTexte: relanceTexte, setRelanceTexte: setRelanceTexte, retablirRelance: retablirRelance,
    setDelai: setDelai, setTon: setTon, setSignature: setSignature, setResponsableDefaut: setResponsableDefaut,
    setPersonne: setPersonne, setQuestionService: setQuestionService, retablirReglages: retablirReglages, reinitialiser: reinitialiser
  };
})(typeof self !== 'undefined' ? self : this);
