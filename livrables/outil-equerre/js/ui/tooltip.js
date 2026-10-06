/* Équerre : infobulle partagée (un seul élément role="tooltip", id chart-tip). Elle apparaît au survol et au focus clavier,
 * disparaît à la sortie, au blur et sur Échap. Aucun piège clavier : l'élément reste un simple élément focalisable. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;

  var ID = 'chart-tip';
  var tip = null;
  var cible = null;

  function creer() {
    if (tip && tip.isConnected) return tip;
    tip = h('div', { id: ID, class: 'tip', role: 'tooltip', hidden: true });
    document.body.appendChild(tip);
    return tip;
  }

  function positionner() {
    if (!tip || !cible || !cible.isConnected) { masquer(); return; }
    // Pour un graphique, l'infobulle se place au-dessus de la barre elle-même, sans sortir du cadre du graphique (elle ne recouvre pas son titre)
    var ancre = cible.querySelector ? cible.querySelector('.bar-r') : null;
    var r = (ancre || cible).getBoundingClientRect();
    var t = tip.getBoundingClientRect();
    var vw = root.innerWidth || document.documentElement.clientWidth;
    var x = r.left + r.width / 2 - t.width / 2;
    x = Math.max(8, Math.min(x, vw - t.width - 8));
    var y = r.top - t.height - 10;
    var cadre = cible.ownerSVGElement ? cible.ownerSVGElement.getBoundingClientRect() : null;
    if (cadre && y < cadre.top + 4) y = cadre.top + 4;
    if (y < 8) y = Math.min(r.bottom + 10, (root.innerHeight || 800) - t.height - 8);
    tip.style.left = Math.round(x) + 'px';
    tip.style.top = Math.round(y) + 'px';
  }

  /** contenu : { titre, lignes:[texte…] }. Le contenu est toujours rendu par textContent. */
  function afficher(el, contenu) {
    var t = creer();
    U.clear(t);
    if (contenu.titre) t.appendChild(h('strong', { class: 'tip-titre', text: contenu.titre }));
    (contenu.lignes || []).forEach(function (l) { t.appendChild(h('span', { class: 'tip-ligne', text: l })); });
    if (cible && cible !== el) cible.removeAttribute('aria-describedby');
    cible = el;
    el.setAttribute('aria-describedby', ID);
    t.hidden = false;
    positionner();
  }

  function masquer() {
    if (tip) tip.hidden = true;
    if (cible) { cible.removeAttribute('aria-describedby'); cible = null; }
  }

  function visible() { return !!tip && !tip.hidden; }

  /** Attache l'infobulle à un élément : fournisseur() renvoie le contenu à afficher. */
  function attacher(el, fournisseur) {
    function montrer() { afficher(el, fournisseur()); }
    function cacher() { if (cible === el) masquer(); }
    el.addEventListener('mouseenter', montrer);
    el.addEventListener('focus', montrer);
    el.addEventListener('mouseleave', cacher);
    el.addEventListener('blur', cacher);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && visible() && cible === el) { e.preventDefault(); masquer(); }
    });
  }

  root.addEventListener('scroll', function () { if (visible()) positionner(); }, { passive: true, capture: true });
  root.addEventListener('resize', function () { masquer(); });

  E.ui.tooltip = { attacher: attacher, afficher: afficher, masquer: masquer, visible: visible, ID: ID };
})(typeof self !== 'undefined' ? self : this);
