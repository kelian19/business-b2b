/* Flow Inbox : bulle d'information partagée (un seul élément role="tooltip"). Elle s'affiche au survol et au focus clavier, disparaît à la sortie,
 * au blur et sur Échap. Le contenu est toujours rendu par textContent. Aucune information n'est portée par la bulle seule : chaque graphique a un tableau équivalent. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;

  var ID = 'bulle-info';
  var tip = null;
  var cible = null;

  function creer() {
    if (tip && tip.isConnected) return tip;
    tip = h('div', { id: ID, class: 'bulle', role: 'tooltip', hidden: true });
    document.body.appendChild(tip);
    return tip;
  }

  function positionner() {
    if (!tip || !cible || !cible.isConnected) { masquer(); return; }
    var r = cible.getBoundingClientRect();
    var t = tip.getBoundingClientRect();
    var vw = root.innerWidth || document.documentElement.clientWidth;
    var vh = root.innerHeight || document.documentElement.clientHeight;
    var x = Math.max(8, Math.min(r.left + r.width / 2 - t.width / 2, vw - t.width - 8));
    var y = r.top - t.height - 8;
    if (y < 8) y = Math.min(r.bottom + 8, vh - t.height - 8);
    tip.style.left = Math.round(x) + 'px';
    tip.style.top = Math.round(y) + 'px';
  }

  /** contenu : { titre, lignes: [texte…] }. */
  function afficher(el, contenu) {
    var t = creer();
    U.clear(t);
    if (contenu.titre) t.appendChild(h('strong', { class: 'bulle-titre', text: contenu.titre }));
    (contenu.lignes || []).forEach(function (l) { t.appendChild(h('span', { class: 'bulle-ligne', text: l })); });
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

  /** Attache la bulle à un élément focalisable : fournisseur() renvoie le contenu. */
  function attacher(el, fournisseur) {
    function montrer() { afficher(el, fournisseur()); }
    function cacher() { if (cible === el) masquer(); }
    el.addEventListener('mouseenter', montrer);
    el.addEventListener('focus', montrer);
    el.addEventListener('mouseleave', cacher);
    el.addEventListener('blur', cacher);
  }

  root.addEventListener('scroll', function () { if (visible()) positionner(); }, { passive: true, capture: true });
  root.addEventListener('resize', function () { masquer(); });

  FI.ui.tooltip = { attacher: attacher, afficher: afficher, masquer: masquer, visible: visible, ID: ID };
})(typeof self !== 'undefined' ? self : this);
