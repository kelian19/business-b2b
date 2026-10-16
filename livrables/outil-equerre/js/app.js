/* Équerre : coque de l'application (bandeau, en-tête, parcours en 5 étapes, routeur par hash, clavier, aide, mode présentation).
 * Scripts classiques, aucune requête réseau. Les données saisies ou chargées ne quittent jamais le navigateur. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var $ = U.$;
  var L = root.EquerreLogic;
  var S = E.ui.store;
  var Prefs = E.ui.prefs;
  var Dlg = E.ui.dialog;
  var DZ = E.ui.dropzone;

  var ETAPES = [
    { id: 'dashboard', hash: 'tableau-de-bord', libelle: 'Tableau de bord', vue: 'dashboard' },
    { id: 'tiers', hash: 'tiers', libelle: 'Fichier tiers', vue: 'tiers' },
    { id: 'mentions', hash: 'mentions', libelle: 'Mentions', vue: 'mentions' },
    { id: 'reporting', hash: 'reporting', libelle: 'Trésorerie et reporting', vue: 'reporting' },
    { id: 'report', hash: 'rapport', libelle: 'Rapport', vue: 'report' }
  ];
  var TITRE = 'flow · Préparation e-facture';
  var BANDEAU_DEMO = 'Données fictives de démonstration';
  var BANDEAU_CLIENT = 'Dossier client : données confidentielles, traitées uniquement dans ce navigateur';
  var PIED_DEMO = 'En démonstration, les noms d\'entreprises sont inventés et les SIREN sont générés : ils ne correspondent pas aux entreprises affichées.';
  var PIED_CLIENT = 'Dossier client : les données importées sont celles de votre client, traitées localement dans ce navigateur. Supprimez-les en fin de mission (« Effacer toutes les données de cette session »).';

  /** Écrans hors parcours (via l'en-tête) : accueil et dossiers, mise à niveau, mode cabinet, aide. */
  var ECRANS = {
    'accueil': { sec: 'screen-accueil', vue: 'home', cont: 'view-home', titre: 'home-titre', doc: 'Accueil et dossiers', btn: 'btn-dossier' },
    'mise-a-niveau': { sec: 'screen-upgrade', vue: 'upgrade', cont: 'view-upgrade', titre: 'upg-titre', doc: 'Mise à niveau', btn: 'btn-upgrade' },
    'cabinet': { sec: 'screen-cabinet', vue: 'cabinet', cont: 'view-cabinet', titre: 'cab-titre', doc: 'Mode cabinet', btn: 'btn-cabinet' },
    'aide': { sec: 'screen-aide', vue: 'help', cont: 'view-aide', titre: 'aide-titre', doc: 'Aide et glossaire', btn: null }
  };
  var VUES_TOUTES = ['dashboard', 'tiers', 'mentions', 'reporting', 'report', 'home', 'upgrade', 'cabinet', 'help'];

  var courant = { ecran: 'parcours', etape: 0 };
  var perimees = {};
  var sansEcho = false;
  var timerRapport = null;

  /* ---------- Bandeau et en-tête ---------- */

  function majBandeau() {
    var d = S.dossier();
    $('banner-main').textContent = d.mode === 'demo' ? BANDEAU_DEMO : BANDEAU_CLIENT;
    $('banner').setAttribute('data-mode', d.mode);
    var pied = $('foot-mode');
    if (pied) pied.textContent = d.mode === 'demo' ? PIED_DEMO : PIED_CLIENT;
    document.body.setAttribute('data-mode', d.mode);
  }

  function majEntreprise() {
    var champ = $('nom-entreprise');
    if (document.activeElement !== champ) champ.value = S.dossier().entreprise.nom;
    var etat = $('etat-sale');
    if (etat) etat.hidden = !S.state.session.sale;
  }

  /* ---------- Rendu des vues (rendu paresseux : une vue masquée est seulement marquée périmée) ---------- */

  function vueDe(id) { return E.views[id]; }

  function rendreVue(nomVue, conteneurId) {
    var c = $(conteneurId);
    var v = vueDe(nomVue);
    if (!c || !v) return;
    var fk = capturerFocus(c);
    if (E.ui.tooltip) E.ui.tooltip.masquer();
    try { v.render(c); } catch (e) { U.clear(c); c.appendChild(h('p', { class: 'alert', role: 'alert', text: 'Cet écran n\'a pas pu s\'afficher : ' + e.message })); if (root.console) root.console.error(e); }
    perimees[nomVue] = false;
    restaurerFocus(c, fk);
  }

  /** Mémorise la commande qui avait le focus (attribut data-fk) pour la lui rendre après une reconstruction de la vue. */
  function capturerFocus(c) {
    var a = document.activeElement;
    if (!a || a === document.body || !c.contains(a) || !a.getAttribute) return null;
    return a.getAttribute('data-fk');
  }

  function restaurerFocus(c, fk) {
    if (!fk) return;
    var a = document.activeElement;
    if (a && a !== document.body && a !== document.documentElement && c.contains(a)) return;
    var cibles = c.querySelectorAll('[data-fk]');
    for (var i = 0; i < cibles.length; i++) {
      if (cibles[i].getAttribute('data-fk') === fk) { try { cibles[i].focus({ preventScroll: true }); } catch (e) { cibles[i].focus(); } return; }
    }
  }

  function assurerVue(nomVue, conteneurId) {
    if (perimees[nomVue] !== false) rendreVue(nomVue, conteneurId);
  }

  function marquerTout() {
    VUES_TOUTES.forEach(function (v) { perimees[v] = true; });
    rafraichirActif();
    planifierRapport();
  }

  /** Le rapport est tenu à jour même quand l'étape 5 n'est pas affichée : l'impression (Ctrl+P ou bouton) part toujours du rapport complet. */
  function planifierRapport() {
    clearTimeout(timerRapport);
    timerRapport = setTimeout(function () { if (perimees.report !== false) rendreVue('report', 'view-report'); }, 250);
  }

  function dessinerActif() {
    var v = vueDe(ETAPES[courant.etape].vue);
    if (v && v.dessiner) v.dessiner();
  }

  function rafraichirActif() {
    var ec = ECRANS[courant.ecran];
    if (ec) assurerVue(ec.vue, ec.cont);
    else {
      var e = ETAPES[courant.etape];
      assurerVue(e.vue, 'view-' + e.id);
      dessinerActif();
    }
  }

  /* ---------- Navigation ---------- */

  function etapeDepuisHash(hash) {
    for (var i = 0; i < ETAPES.length; i++) { if (ETAPES[i].hash === hash) return i; }
    return -1;
  }

  function activer(route, opts) {
    opts = opts || {};
    courant = route;
    var ec = ECRANS[route.ecran] || null;
    Object.keys(ECRANS).forEach(function (k) { $(ECRANS[k].sec).hidden = k !== route.ecran; });
    $('parcours').hidden = !!ec;
    $('steps').hidden = false;
    if (ec) ETAPES.forEach(function (e) {
      $('tab-' + e.id).setAttribute('aria-selected', 'false');
    });
    S.setUi({ route: ec ? route.ecran : ETAPES[route.etape].hash, etape: ec ? -1 : route.etape });
    if (E.ui.tooltip) E.ui.tooltip.masquer();
    if (ec) {
      assurerVue(ec.vue, ec.cont);
      document.title = ec.doc + ' · ' + TITRE;
      if (opts.focus !== false) U.focus($(ec.titre));
    } else {
      ETAPES.forEach(function (e, i) {
        var tab = $('tab-' + e.id);
        var panel = $('panel-' + e.id);
        var actif = i === route.etape;
        tab.setAttribute('aria-selected', actif ? 'true' : 'false');
        tab.tabIndex = actif ? 0 : -1;
        // Pas de coche « terminé » : une étape visitée n'est pas une étape complète
        tab.classList.remove('passee');
        panel.hidden = !actif;
      });
      $('progress-in').style.width = ((route.etape + 1) / ETAPES.length * 100) + '%';
      assurerVue(ETAPES[route.etape].vue, 'view-' + ETAPES[route.etape].id);
      dessinerActif();
      document.title = ETAPES[route.etape].libelle + ' · ' + TITRE;
      if (opts.focusTab) U.focus($('tab-' + ETAPES[route.etape].id));
      else if (opts.titre) {
        // Changement d'écran demandé par un lien ou une action : retour en haut de page et focus sur le titre de l'étape
        var titre = $('panel-' + ETAPES[route.etape].id).querySelector('h2');
        try { root.scrollTo(0, 0); } catch (e) { /* sans effet */ }
        if (titre) { if (!titre.hasAttribute('tabindex')) titre.setAttribute('tabindex', '-1'); U.focus(titre); }
      }
    }
    Object.keys(ECRANS).forEach(function (k) {
      var b = ECRANS[k].btn ? $(ECRANS[k].btn) : null;
      if (b) b.setAttribute('aria-current', k === route.ecran ? 'page' : 'false');
    });
  }

  function routeDepuisLocation() {
    var hash = (root.location.hash || '').replace('#', '');
    if (Object.prototype.hasOwnProperty.call(ECRANS, hash)) return { ecran: hash, etape: courant.etape };
    var i = etapeDepuisHash(hash);
    if (i >= 0) return { ecran: 'parcours', etape: i };
    if (!hash) return { ecran: 'parcours', etape: 0 };
    return null;
  }

  function allerEtape(i, opts) {
    i = Math.max(0, Math.min(ETAPES.length - 1, i));
    sansEcho = true;
    activer({ ecran: 'parcours', etape: i }, opts);
    try { root.history.replaceState(null, '', '#' + ETAPES[i].hash); } catch (e) { root.location.hash = '#' + ETAPES[i].hash; }
    setTimeout(function () { sansEcho = false; }, 0);
  }

  function onHashChange() {
    if (sansEcho) return;
    var r = routeDepuisLocation();
    // Route inconnue (par exemple #tableau) : retour au tableau de bord, jamais l'écran précédent
    if (r) activer(r, { titre: true });
    else allerEtape(0, { titre: true });
  }

  /* ---------- Onglets : motif ARIA (flèches, Début, Fin, tabindex itinérant) ---------- */

  function initOnglets() {
    var tablist = document.querySelector('.tabs');
    function orientation() { tablist.setAttribute('aria-orientation', root.innerWidth >= 1100 ? 'vertical' : 'horizontal'); }
    orientation();
    root.addEventListener('resize', orientation);
    ETAPES.forEach(function (e, i) {
      var tab = $('tab-' + e.id);
      tab.addEventListener('click', function () { allerEtape(i, { focus: false }); });
      tab.addEventListener('keydown', function (ev) {
        if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
        var j = null;
        if (ev.key === 'ArrowRight' || (ev.key === 'ArrowDown' && tablist.getAttribute('aria-orientation') === 'vertical')) j = (i + 1) % ETAPES.length;
        else if (ev.key === 'ArrowLeft' || (ev.key === 'ArrowUp' && tablist.getAttribute('aria-orientation') === 'vertical')) j = (i + ETAPES.length - 1) % ETAPES.length;
        else if (ev.key === 'Home') j = 0;
        else if (ev.key === 'End') j = ETAPES.length - 1;
        if (j !== null) { ev.preventDefault(); allerEtape(j, { focusTab: true }); }
      });
      var panel = $('panel-' + e.id);
      var nav = h('div', { class: 'pn no-print secondary' }, [
        i > 0 ? h('button', { type: 'button', class: 'btn', onclick: function () { allerEtape(i - 1, { focus: false }); } }, [U.icon('fleche', 'ic-gauche'), h('span', { text: 'Précédent : ' + ETAPES[i - 1].libelle })]) : h('span'),
        i < ETAPES.length - 1 ? h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { allerEtape(i + 1, { focus: false }); } }, [h('span', { text: 'Suivant : ' + ETAPES[i + 1].libelle }), U.icon('fleche')]) : h('span')
      ]);
      panel.appendChild(nav);
    });
  }

  /* ---------- Aide et raccourcis : voir views/view-help.js ---------- */

  function ouvrirAide() { return E.views.help.ouvrirDialogue(); }

  /* ---------- Mode présentation ---------- */

  var timerPastille = null;

  function basculerPresentation(actif) {
    var avant = document.body.classList.contains('presentation');
    if (actif === undefined) actif = !avant;
    document.body.classList.toggle('presentation', actif);
    document.documentElement.classList.toggle('is-presentation', actif);
    S.setUi({ presentation: actif });
    $('btn-presentation').setAttribute('aria-pressed', actif ? 'true' : 'false');
    var pastille = $('pastille');
    var avert = $('pastille-avert');
    clearTimeout(timerPastille);
    if (actif) {
      try { if (document.documentElement.requestFullscreen) { var p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(function () { }); } } catch (e) { /* repli : simple classe */ }
      var client = S.dossier().mode === 'client';
      avert.hidden = !client;
      pastille.hidden = false;
      if (client) U.annoncer('Mode présentation. Évitez de charger un fichier réel pendant un partage d\'écran.');
      timerPastille = setTimeout(function () { if (!pastille.contains(document.activeElement)) pastille.hidden = true; }, client ? 8000 : 4000);
    } else {
      pastille.hidden = true;
      avert.hidden = true;
      try { if (document.fullscreenElement && document.exitFullscreen) { var q = document.exitFullscreen(); if (q && q.catch) q.catch(function () { }); } } catch (e2) { /* sans effet */ }
    }
    var again = actif !== avant;
    if (again) setTimeout(function () { if (!ECRANS[courant.ecran]) rafraichirActif(); }, 50);
  }

  /** P : ouvre le rapport et place le focus sur « Imprimer / enregistrer en PDF » (Entrée lance l'impression). */
  function allerRapport() {
    allerEtape(4, { focus: false });
    var b = $('btn-imprimer');
    if (b) U.focus(b); else U.focus($('tab-report'));
  }

  /* ---------- Clavier ---------- */

  function dansChamp(el) {
    if (!el || !el.tagName) return false;
    var t = el.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable === true;
  }

  function onKeyDown(e) {
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') {
      if (document.querySelector('dialog[open]')) return;
      if (document.body.classList.contains('presentation')) { basculerPresentation(false); e.preventDefault(); }
      return;
    }
    if (!Prefs.get('raccourcis')) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (dansChamp(e.target)) return;
    if (document.querySelector('dialog[open]')) return;
    var cible = e.target;
    var surPage = cible === document.body || cible === document.documentElement;
    var k = e.key;
    if (k >= '1' && k <= '5') { e.preventDefault(); allerEtape(+k - 1, { focusTab: true }); return; }
    if ((k === 'ArrowRight' || k === 'ArrowLeft') && surPage && courant.ecran === 'parcours') {
      e.preventDefault();
      allerEtape(courant.etape + (k === 'ArrowRight' ? 1 : -1), { focusTab: true });
      return;
    }
    if (k === 'f' || k === 'F') { e.preventDefault(); basculerPresentation(); return; }
    if (k === 'p' || k === 'P') { e.preventDefault(); allerRapport(); return; }
    if (k === '?') { e.preventDefault(); ouvrirAide(); return; }
  }

  /* ---------- Entreprise modifiable ---------- */

  function initEntreprise() {
    var champ = $('nom-entreprise');
    function valider() {
      var v = champ.value.trim();
      if (!v) { champ.value = S.dossier().entreprise.nom; return; }
      if (v !== S.dossier().entreprise.nom) S.commit('nommerEntreprise', { nom: v });
      champ.value = S.dossier().entreprise.nom;
    }
    champ.addEventListener('input', function () {
      var v = champ.value.trim();
      if (v && v !== S.dossier().entreprise.nom) S.commit('nommerEntreprise', { nom: v });
    });
    champ.addEventListener('change', valider);
    champ.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); valider(); } });
  }

  /* ---------- Démarrage ---------- */

  function demarrer() {
    DZ.proteger();
    S.commit('ouvrirDemo');
    initOnglets();
    initEntreprise();
    majBandeau();
    majEntreprise();

    $('btn-dossier').addEventListener('click', function () { root.location.hash = '#accueil'; });
    $('btn-upgrade').addEventListener('click', function () { root.location.hash = '#mise-a-niveau'; });
    $('btn-cabinet').addEventListener('click', function () { root.location.hash = '#cabinet'; });
    $('btn-presentation').addEventListener('click', function () { basculerPresentation(); });
    $('btn-rapport').addEventListener('click', function () { allerEtape(4, { focusTab: true }); });
    $('btn-aide').addEventListener('click', ouvrirAide);
    $('lien-evitement').addEventListener('click', function (e) { e.preventDefault(); var m = $('contenu'); if (m) U.focus(m); });

    S.on(['dossier', 'tiers', 'factures', 'lignes', 'registre', 'corrections', 'modeles', 'organisation', 'entreprise', 'refDate', 'versions', 'sale', 'plan', 'hypotheses'], function (sujet) {
      majBandeau();
      majEntreprise();
      if (sujet === 'sale') { if (courant.ecran === 'accueil') { perimees.home = true; rafraichirActif(); } return; }
      // Le nom d'entreprise se met à jour en place dans le rapport : la saisie et le focus ne sont jamais perdus.
      if (sujet === 'entreprise') {
        var rapportFrais = perimees.report === false;
        VUES_TOUTES.forEach(function (v) { perimees[v] = true; });
        if (rapportFrais && E.views.report) { perimees.report = false; E.views.report.majNom(); }
        if (!(courant.ecran === 'parcours' && ETAPES[courant.etape].vue === 'report')) rafraichirActif();
        else planifierRapport();
        return;
      }
      // Le suivi du plan et le nombre de factures se mettent à jour en place : le focus et la saisie du clavier ne sont jamais perdus.
      if (sujet === 'plan') {
        perimees.report = true; perimees.upgrade = true;
        planifierRapport();
        if (E.views.dashboard && E.views.dashboard.majPlan) E.views.dashboard.majPlan();
        return;
      }
      if (sujet === 'hypotheses') {
        perimees.report = true;
        planifierRapport();
        if (E.views.dashboard && E.views.dashboard.majExposition) E.views.dashboard.majExposition();
        return;
      }
      marquerTout();
    });
    S.on(['effacement'], function () {
      // Toute vue qui a gardé un état ou un DOM issu d'un dossier client est remise à zéro, qu'elle soit affichée ou non.
      Object.keys(E.views).forEach(function (nom) { var v = E.views[nom]; if (v && v.reinitialiser) v.reinitialiser(); });
      ['view-home', 'view-upgrade', 'view-cabinet', 'view-aide', 'view-dashboard', 'view-tiers', 'view-mentions', 'view-reporting', 'view-report'].forEach(function (id) {
        var c = $(id);
        if (c) U.clear(c);
      });
      marquerTout();
      Array.prototype.forEach.call(document.querySelectorAll('input[type="file"]'), function (i) { try { i.value = ''; } catch (e) { /* sans effet */ } });
    });

    root.addEventListener('hashchange', onHashChange);
    root.addEventListener('beforeprint', function () { if (perimees.report !== false) rendreVue('report', 'view-report'); });
    root.addEventListener('keydown', onKeyDown);
    root.addEventListener('beforeunload', function (e) {
      if (S.state.session.sale) { e.preventDefault(); e.returnValue = ''; return ''; }
      return undefined;
    });
    var timer = null;
    root.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { if (!ECRANS[courant.ecran]) dessinerActif(); }, 150);
    });
    document.addEventListener('fullscreenchange', function () {
      if (!document.fullscreenElement && document.body.classList.contains('presentation')) basculerPresentation(false);
    });

    var r = routeDepuisLocation() || { ecran: 'parcours', etape: 0 };
    activer(r, { focus: false });
    planifierRapport();
  }

  E.app = {
    allerEtape: allerEtape,
    rafraichir: function (vue) { perimees[vue] = true; },
    /** Marque une vue comme périmée et la reconstruit tout de suite si elle est affichée (le focus clavier est conservé). */
    actualiser: function (vue) { perimees[vue] = true; rafraichirActif(); }
  };

  demarrer();
})(typeof self !== 'undefined' ? self : this);
