/* Flow Inbox : coque de l'application (navigation, routeur par hash, rendu des écrans, clavier, mode présentation, aide, visite guidée).
 * Scripts classiques, aucune requête réseau, état en mémoire. Écran d'ouverture : le tableau de bord. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var $ = U.$;
  var S = FI.ui.store;
  var TT = FI.ui.tooltip;
  var A = FI.ui.aide;

  var TITRE = 'Flow Inbox, démonstration';

  /* Entrées de navigation : raccourcis clavier 1 à 7 pour les écrans, 8 pour les paramètres. */
  var NAV = [
    { id: 'tableau-de-bord', hash: 'tableau-de-bord', libelle: 'Tableau de bord', icone: 'barres' },
    { id: 'boite', hash: 'boite', libelle: 'Boîte de réception', icone: 'boite' },
    { id: 'suivi', hash: 'suivi', libelle: 'Suivi', icone: 'tableau' },
    { id: 'relances', hash: 'relances', libelle: 'Relances', icone: 'cloche' },
    { id: 'rapport', hash: 'rapport', libelle: 'Rapport', icone: 'document' },
    { id: 'essai', hash: 'essai', libelle: 'Essayer', icone: 'crayon' },
    { id: 'comment', hash: 'comment', libelle: 'Comment ça marche', icone: 'aide' },
    { id: 'parametres', hash: 'parametres', libelle: 'Paramètres', icone: 'reglages' }
  ];
  var ROUTES = {
    'tableau-de-bord': { vue: 'dashboard', nav: 'tableau-de-bord' },
    boite: { vue: 'boite', nav: 'boite' },
    message: { vue: 'fiche', nav: 'boite' },
    brouillon: { vue: 'brouillon', nav: 'boite' },
    suivi: { vue: 'suivi', nav: 'suivi' },
    relances: { vue: 'relances', nav: 'relances' },
    rapport: { vue: 'rapport', nav: 'rapport' },
    essai: { vue: 'essai', nav: 'essai' },
    comment: { vue: 'comment', nav: 'comment' },
    parametres: { vue: 'parametres', nav: 'parametres' }
  };
  var ACCUEIL = 'tableau-de-bord';

  var courant = { nom: null, param: null };

  function parserHash() {
    var t = String(root.location.hash || '').replace(/^#\/?/, '');
    var i = t.indexOf('/');
    return i < 0 ? { nom: t, param: null } : { nom: t.slice(0, i), param: t.slice(i + 1) };
  }

  /* ---------- Navigation ---------- */

  function construireNav() {
    var nav = $('nav-principale');
    U.clear(nav);
    NAV.forEach(function (n, i) {
      nav.appendChild(h('a', { href: '#' + n.hash, class: 'nav-lien', 'data-nav': n.id, 'data-fk': 'nav-' + n.id, title: 'Raccourci : touche ' + (i + 1) }, [
        h('span', { class: 'nav-num', 'aria-hidden': 'true', text: String(i + 1) }),
        U.icon(n.icone),
        h('span', { class: 'nav-lib', text: n.libelle }),
        n.id === 'relances' ? h('span', { class: 'nav-badge', id: 'badge-relances' }) : null
      ]));
    });
  }

  function majNav() {
    var actif = courant.nom && ROUTES[courant.nom] ? ROUTES[courant.nom].nav : null;
    var liens = document.querySelectorAll('#nav-principale .nav-lien');
    for (var i = 0; i < liens.length; i++) {
      var on = liens[i].getAttribute('data-nav') === actif;
      if (on) liens[i].setAttribute('aria-current', 'page'); else liens[i].removeAttribute('aria-current');
    }
    var b = $('badge-relances');
    if (b) {
      var n = S.relances().enRetard.length;
      b.textContent = String(n);
      b.hidden = n === 0;
      b.setAttribute('title', n + (n > 1 ? ' demandes sans réponse au-delà du délai' : ' demande sans réponse au-delà du délai'));
    }
  }

  /* ---------- Rendu ---------- */

  function rendreVue(estNavigation) {
    var r = ROUTES[courant.nom];
    var vue = FI.views[r.vue];
    var c = $('vue');
    var fk = null;
    var a = document.activeElement;
    if (!estNavigation && a && c.contains(a) && a.getAttribute) fk = a.getAttribute('data-fk');
    var y = root.pageYOffset;
    TT.masquer();
    try {
      vue.render(c, courant.param);
    } catch (e) {
      U.clear(c);
      c.appendChild(h('p', { class: 'alert', role: 'alert', text: 'Cet écran n\'a pas pu s\'afficher : ' + e.message }));
      if (root.console) root.console.error(e);
    }
    document.body.setAttribute('data-ecran', courant.nom);
    if (estNavigation) {
      var t = $('titre-vue');
      document.title = (t ? t.textContent + ' · ' : '') + TITRE;
      root.scrollTo(0, 0);
      var dansVisite = a && a.closest && a.closest('#visite');
      if (t && !dansVisite) { try { t.focus({ preventScroll: true }); } catch (e2) { t.focus(); } }
      U.annoncer((t ? t.textContent : vue.titre) + ' : écran affiché.');
    } else {
      root.scrollTo(0, y);
      if (fk) {
        var cible = c.querySelector('[data-fk="' + fk + '"]');
        if (cible) { try { cible.focus({ preventScroll: true }); } catch (e3) { cible.focus(); } }
      }
    }
    majNav();
  }

  function route() {
    var p = parserHash();
    if (!ROUTES[p.nom]) {
      root.location.replace('#' + ACCUEIL);
      return;
    }
    courant = p;
    rendreVue(true);
  }

  /* ---------- Mode présentation ---------- */

  var timerPastille = null;

  function basculerPresentation(actif) {
    var avant = document.body.classList.contains('presentation');
    if (actif === undefined) actif = !avant;
    if (actif === avant) return;
    document.body.classList.toggle('presentation', actif);
    document.documentElement.classList.toggle('is-presentation', actif);
    var btn = $('btn-presentation');
    if (btn) btn.setAttribute('aria-pressed', actif ? 'true' : 'false');
    var pastille = $('pastille');
    clearTimeout(timerPastille);
    if (actif) {
      try { if (document.documentElement.requestFullscreen) { var p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(function () { /* repli : simple classe */ }); } } catch (e) { /* repli : simple classe */ }
      if (pastille) {
        pastille.hidden = false;
        timerPastille = setTimeout(function () { pastille.hidden = true; }, 4500);
      }
      U.annoncer('Mode présentation activé. Échap pour quitter.');
    } else {
      if (pastille) pastille.hidden = true;
      try { if (document.fullscreenElement && document.exitFullscreen) { var q = document.exitFullscreen(); if (q && q.catch) q.catch(function () { /* sans effet */ }); } } catch (e2) { /* sans effet */ }
      U.annoncer('Mode présentation quitté.');
    }
  }

  /* ---------- Clavier ---------- */

  function dansChamp(el) {
    if (!el || !el.tagName) return false;
    var t = el.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable === true;
  }

  function allerRapport() {
    root.location.hash = '#rapport';
    setTimeout(function () { var b = $('btn-imprimer'); if (b) b.focus(); }, 0);
  }

  function onKeyDown(ev) {
    if (ev.defaultPrevented) return;
    if (ev.key === 'Escape') {
      if (A.dialogueOuvert()) return; // la boîte de dialogue native se ferme seule
      if (TT.visible()) { TT.masquer(); ev.preventDefault(); return; }
      if (A.fermerPanneaux()) { ev.preventDefault(); return; }
      if (FI.ui.visite.actif()) { FI.ui.visite.fermer(); ev.preventDefault(); return; }
      if (document.body.classList.contains('presentation')) { basculerPresentation(false); ev.preventDefault(); }
      return;
    }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (dansChamp(ev.target)) return;
    if (A.dialogueOuvert()) return;
    var k = ev.key;
    if (k >= '1' && k <= '9') {
      var n = parseInt(k, 10);
      if (n <= NAV.length) { ev.preventDefault(); root.location.hash = '#' + NAV[n - 1].hash; }
      return;
    }
    if (k === 'f' || k === 'F') { ev.preventDefault(); basculerPresentation(); return; }
    if (k === 'v' || k === 'V') { ev.preventDefault(); FI.ui.visite.ouvrir(); return; }
    if (k === 'p' || k === 'P') { ev.preventDefault(); allerRapport(); return; }
    if (k === '?') { ev.preventDefault(); A.ouvrirDialogue(); return; }
  }

  function init() {
    construireNav();
    S.abonner(function (silencieux) {
      if (silencieux) majNav(); else rendreVue(false);
    });
    root.addEventListener('hashchange', route);
    document.addEventListener('keydown', onKeyDown);
    $('btn-presentation').addEventListener('click', function () { basculerPresentation(); });
    $('btn-aide').addEventListener('click', function () { A.ouvrirDialogue(); });
    $('btn-visite').addEventListener('click', function () { FI.ui.visite.ouvrir(); });
    document.addEventListener('fullscreenchange', function () {
      if (!document.fullscreenElement && document.body.classList.contains('presentation')) basculerPresentation(false);
    });
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof self !== 'undefined' ? self : this);
