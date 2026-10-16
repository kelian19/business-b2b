/* Flow Inbox : corps de l'e-mail avec SURLIGNAGE des passages relevés (DOM) ; la recherche des passages est dans core/passages.js.
 * Un passage « à vérifier » est souligné en pointillés, un passage « relevé » en trait plein, et chaque passage porte le nom de son champ :
 * l'état et le champ ne dépendent jamais de la couleur seule. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var Data = root.FlowData;
  var P = FI.core.passages;

  /**
   * Construit le corps surligné. hooks : { survolMarque(champs | null), cliqueMarque(champ) }.
   * Renvoie { el, activer(champs | null, defiler), intervalles, nbMarques }.
   */
  function construire(email, hooks) {
    var ivs = P.intervalles(email);
    var corps = h('div', { class: 'corps', id: 'corps-message' });
    var marques = [];
    P.segmenter(email.corps, ivs).forEach(function (l) {
      var ligne = h('div', { class: 'ligne' + (l.citation ? ' citation' : '') });
      if (!l.segments.length) ligne.appendChild(document.createTextNode('​'));
      l.segments.forEach(function (s) {
        if (!s.ivs.length) { ligne.appendChild(document.createTextNode(s.texte)); return; }
        var champs = s.ivs.map(function (iv) { return iv.champ; });
        var verif = s.ivs.some(function (iv) { return iv.statut === 'a_verifier'; });
        var m = h('mark', { class: 'passage' + (verif ? ' passage-verif' : ''), 'data-champs': champs.join(' ') });
        s.debuts.forEach(function (iv) {
          m.appendChild(h('span', { class: 'passage-lib', 'aria-hidden': 'true', text: Data.champsLibelles[iv.champ] }));
        });
        m.appendChild(document.createTextNode(s.texte));
        m.addEventListener('mouseenter', function () { hooks.survolMarque(champs); });
        m.addEventListener('mouseleave', function () { hooks.survolMarque(null); });
        m.addEventListener('click', function () { hooks.cliqueMarque(champs[0]); });
        marques.push(m);
        ligne.appendChild(m);
      });
      corps.appendChild(ligne);
    });

    /** Met en évidence les passages des champs donnés (liste ou null). */
    function activer(champs, defiler) {
      var premiere = null;
      marques.forEach(function (m) {
        var liste = m.getAttribute('data-champs').split(' ');
        var on = !!champs && champs.some(function (c) { return liste.indexOf(c) >= 0; });
        m.classList.toggle('actif', on);
        if (on && !premiere) premiere = m;
      });
      if (defiler && premiere && premiere.scrollIntoView) {
        premiere.scrollIntoView({ block: 'nearest', behavior: U.mediaReduit() ? 'auto' : 'smooth' });
      }
    }

    return { el: corps, activer: activer, intervalles: ivs, nbMarques: marques.length };
  }

  FI.ui.surlignage = { construire: construire };
})(typeof self !== 'undefined' ? self : this);
