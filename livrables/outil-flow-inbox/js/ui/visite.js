/* Flow Inbox : visite guidée en 7 étapes (carte non modale, fixée en bas à droite). Elle reprend le scénario de la conception : tableau de bord,
 * boîte, demande type, cas ambigu, brouillon, suivi et relances, essai. Elle ne simule aucune action et n'envoie rien. Échap la ferme ; « V » la lance. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var ETAPES = FI.ui.contenus.VISITE;

  var carte = null;
  var etape = 0;
  var el = {};

  function actif() { return !!(carte && carte.isConnected); }

  function aller(i) {
    etape = Math.max(0, Math.min(ETAPES.length - 1, i));
    var e = ETAPES[etape];
    el.num.textContent = 'Étape ' + (etape + 1) + ' sur ' + ETAPES.length + ' · ' + e.duree;
    el.titre.textContent = e.titre;
    el.texte.textContent = e.texte;
    U.clear(el.liens);
    (e.liens || []).forEach(function (l) {
      el.liens.appendChild(h('a', { href: '#' + l.hash, class: 'btn btn-petit', text: l.libelle }));
    });
    el.points.forEach(function (p, k) { p.className = 'visite-point' + (k === etape ? ' actuel' : k < etape ? ' fait' : ''); });
    el.prec.disabled = etape === 0;
    el.suiv.firstChild.textContent = etape === ETAPES.length - 1 ? 'Terminer' : 'Suivant';
    if (root.location.hash !== '#' + e.hash) root.location.hash = '#' + e.hash;
    U.annoncer('Visite guidée, étape ' + (etape + 1) + ' sur ' + ETAPES.length + ' : ' + e.titre + '.');
  }

  function fermer() {
    if (!actif()) return;
    var etaitDedans = carte.contains(document.activeElement);
    carte.parentNode.removeChild(carte);
    carte = null;
    document.body.classList.remove('visite-active');
    var b = U.$('btn-visite');
    if (b) { b.setAttribute('aria-pressed', 'false'); if (etaitDedans) b.focus(); }
    U.annoncer('Visite guidée fermée.');
  }

  function ouvrir() {
    if (actif()) { fermer(); return; }
    el.num = h('p', { class: 'visite-num' });
    el.titre = h('h2', { id: 'visite-titre', tabindex: '-1' });
    el.texte = h('p', { class: 'visite-texte' });
    el.liens = h('div', { class: 'visite-liens' });
    el.points = ETAPES.map(function () { return h('span', { class: 'visite-point', 'aria-hidden': 'true' }); });
    el.prec = U.bouton('Précédent', { icone: 'fleche-gauche', onclick: function () { aller(etape - 1); } });
    el.suiv = h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { if (etape === ETAPES.length - 1) fermer(); else aller(etape + 1); } }, [h('span', { text: 'Suivant' }), U.icon('fleche')]);
    var reduire = h('button', { type: 'button', class: 'btn btn-petit btn-ghost', 'aria-expanded': 'true', 'aria-controls': 'visite-corps', onclick: function () {
      var ferme = !corps.hidden;
      corps.hidden = ferme;
      this.setAttribute('aria-expanded', ferme ? 'false' : 'true');
      this.firstChild.textContent = ferme ? 'Développer' : 'Réduire';
    } }, [h('span', { text: 'Réduire' })]);
    var quitter = U.bouton('Quitter la visite', { discret: true, icone: 'croix', onclick: fermer });
    var corps = h('div', { id: 'visite-corps', class: 'visite-corps' }, [el.texte, el.liens, h('div', { class: 'visite-actions' }, [el.prec, el.suiv])]);
    carte = h('aside', { id: 'visite', class: 'visite', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'visite-titre' }, [
      h('div', { class: 'visite-tete' }, [h('div', null, [el.num, el.titre]), reduire]),
      h('div', { class: 'visite-points' }, el.points),
      corps,
      h('div', { class: 'visite-pied' }, [quitter, h('span', { class: 'small', text: 'Échap pour fermer' })])
    ]);
    document.body.appendChild(carte);
    document.body.classList.add('visite-active');
    var b = U.$('btn-visite');
    if (b) b.setAttribute('aria-pressed', 'true');
    aller(0);
    el.titre.focus();
  }

  FI.ui.visite = { ouvrir: ouvrir, fermer: fermer, actif: actif, aller: aller, ETAPES: ETAPES };
})(typeof self !== 'undefined' ? self : this);
