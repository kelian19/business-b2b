/* Équerre : boîtes de dialogue natives (<dialog>, focus piégé et Échap gérés par le navigateur, focus rendu à l'appelant). */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var compteur = 0;

  /** Ouvre un dialogue. opts : { titre, corps (nœud ou texte), boutons:[{ id, libelle, primaire, danger }], annulerId, large }.
   *  retourFocus : élément qui reprend le focus à la fermeture. Renvoie une promesse de l'id du bouton choisi (annulerId si Échap). */
  function ouvrir(opts) {
    return new Promise(function (resolve) {
      var ouvreur = opts.retourFocus || document.activeElement;
      var id = 'dlg-' + (++compteur);
      var annuler = opts.annulerId || 'annuler';
      var boutons = (opts.boutons || [{ id: 'ok', libelle: 'OK', primaire: true }]);
      var dlg = h('dialog', { class: 'dlg' + (opts.large ? ' dlg-large' : ''), 'aria-labelledby': id + '-t' });
      var titre = h('h2', { id: id + '-t', text: opts.titre });
      var corps = h('div', { class: 'dlg-corps' }, [typeof opts.corps === 'string' ? h('p', { text: opts.corps }) : opts.corps]);
      var choisi = annuler;
      var pied = h('div', { class: 'dlg-pied' }, boutons.map(function (b) {
        return h('button', {
          type: 'button', class: 'btn' + (b.primaire ? ' btn-primary' : '') + (b.danger ? ' btn-danger' : ''), 'data-id': b.id,
          onclick: function () { choisi = b.id; fermer(); }
        }, [b.libelle]);
      }));
      dlg.appendChild(titre);
      dlg.appendChild(corps);
      dlg.appendChild(pied);
      document.body.appendChild(dlg);

      var termine = false;
      function fermer() {
        if (typeof dlg.close === 'function') { try { dlg.close(); } catch (e) { fin(); } } else fin();
      }
      function fin() {
        if (termine) return;
        termine = true;
        if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
        var rendre = function () { if (ouvreur && ouvreur.focus && document.contains(ouvreur)) U.focus(ouvreur); };
        rendre();
        setTimeout(rendre, 0);
        resolve(choisi);
      }
      dlg.addEventListener('close', fin);
      dlg.addEventListener('cancel', function () { choisi = annuler; });
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      var premier = pied.querySelector(opts.focusId ? '[data-id="' + opts.focusId + '"]' : '.btn-primary') || pied.querySelector('.btn');
      if (premier) premier.focus();
    });
  }

  /** Confirmation simple : renvoie une promesse de true (ok) ou false (annuler ou Échap). */
  function confirmer(titre, texte, opts) {
    opts = opts || {};
    return ouvrir({
      titre: titre,
      corps: texte,
      boutons: [
        { id: 'annuler', libelle: opts.annuler || 'Annuler' },
        { id: 'ok', libelle: opts.ok || 'Confirmer', primaire: !opts.danger, danger: !!opts.danger }
      ],
      annulerId: 'annuler',
      focusId: opts.danger ? 'annuler' : 'ok'
    }).then(function (r) { return r === 'ok'; });
  }

  E.ui.dialog = { ouvrir: ouvrir, confirmer: confirmer };
})(typeof self !== 'undefined' ? self : this);
