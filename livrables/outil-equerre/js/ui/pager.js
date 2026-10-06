/* Équerre : pagination des tableaux (100 lignes par page) : le DOM ne contient jamais plus d'une page de lignes. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var L = root.EquerreLogic;

  /** Crée une barre de pagination. opts : { parPage, onChange(page) }. Renvoie { el, setTotal(n, resteSurPage), page, debut, fin }. */
  function creer(opts) {
    var parPage = opts.parPage || L.CONST.LIGNES_PAR_PAGE;
    var etat = { page: 1, total: 0 };
    var statut = h('p', { class: 'pager-statut small', role: 'status', 'aria-live': 'polite' });
    var prec = h('button', { type: 'button', class: 'btn btn-petit', onclick: function () { aller(etat.page - 1); } }, [U.icon('fleche', 'ic-gauche'), h('span', { text: 'Précédent' })]);
    var suiv = h('button', { type: 'button', class: 'btn btn-petit', onclick: function () { aller(etat.page + 1); } }, [h('span', { text: 'Suivant' }), U.icon('fleche')]);
    var champ = h('input', { type: 'number', min: '1', value: '1', class: 'champ champ-page', 'aria-label': 'Numéro de page', inputmode: 'numeric' });
    var saut = h('button', { type: 'button', class: 'btn btn-petit', onclick: function () { aller(parseInt(champ.value, 10)); } }, ['Aller']);
    champ.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); aller(parseInt(champ.value, 10)); } });
    var nav = h('div', { class: 'pager-nav' }, [prec, h('label', { class: 'pager-aller' }, [h('span', { class: 'visually-hidden', text: 'Aller à la page' }), champ]), saut, suiv]);
    var el = h('div', { class: 'pager' }, [statut, nav]);

    function nbPages() { return Math.max(1, Math.ceil(etat.total / parPage)); }

    function aller(p) {
      if (isNaN(p)) return;
      p = Math.max(1, Math.min(nbPages(), p));
      if (p === etat.page) { majAffichage(); return; }
      etat.page = p;
      majAffichage();
      opts.onChange && opts.onChange(p);
    }

    function majAffichage() {
      var n = nbPages();
      var d = etat.total ? (etat.page - 1) * parPage + 1 : 0;
      var f = Math.min(etat.total, etat.page * parPage);
      statut.textContent = etat.total
        ? 'Lignes ' + U.fmtNum(d) + ' à ' + U.fmtNum(f) + ' sur ' + U.fmtNum(etat.total) + ' (page ' + etat.page + ' sur ' + n + ')'
        : 'Aucune ligne à afficher.';
      prec.disabled = etat.page <= 1;
      suiv.disabled = etat.page >= n;
      champ.value = String(etat.page);
      champ.max = String(n);
      nav.hidden = n <= 1;
    }

    return {
      el: el,
      setTotal: function (total, garderPage) {
        etat.total = total;
        if (!garderPage) etat.page = 1;
        if (etat.page > nbPages()) etat.page = nbPages();
        majAffichage();
      },
      page: function () { return etat.page; },
      allerA: function (p) { aller(p); },
      pageDe: function (index) { return Math.floor(index / parPage) + 1; },
      debut: function () { return (etat.page - 1) * parPage; },
      fin: function () { return Math.min(etat.total, etat.page * parPage); }
    };
  }

  E.ui.pager = { creer: creer };
})(typeof self !== 'undefined' ? self : this);
