/* Équerre : calculs découpés en tranches (aucun Web Worker : bloqués sous file://) et barre de progression.
 * Budget par tranche : CONST.BUDGET_TRANCHE_MS ; l'interface reprend la main entre deux tranches. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var L = root.EquerreLogic;

  function maintenant() { return (root.performance && root.performance.now) ? root.performance.now() : Date.now(); }

  function yieldToUi() { return new Promise(function (r) { setTimeout(r, 0); }); }

  /** Traite 0…total par tranches : fn(de, a) est appelée sur des intervalles courts (budget de temps), puis l'interface respire. */
  function tranches(total, fn, opts) {
    opts = opts || {};
    var budget = opts.budget || L.CONST.BUDGET_TRANCHE_MS;
    var pas = opts.pas || 200;
    var i = 0;
    function boucle() {
      if (i >= total) return Promise.resolve();
      var t0 = maintenant();
      do {
        var a = Math.min(i + pas, total);
        fn(i, a);
        i = a;
      } while (i < total && maintenant() - t0 < budget);
      if (opts.onProgress) opts.onProgress(total ? i / total : 1);
      return yieldToUi().then(boucle);
    }
    return total ? boucle() : Promise.resolve();
  }

  /** Analyse CSV incrémentale par tranches de caractères. Renvoie une promesse du résultat de parseCsv. */
  function analyserCsv(texte, separateur, onProgress) {
    var parser = L.createCsvParser(separateur);
    var taille = L.CONST.TRANCHE_CARACTERES;
    var pos = 0;
    var n = texte.length;
    function boucle() {
      if (pos >= n) { onProgress && onProgress(1); return Promise.resolve(L.finaliser(parser.fin())); }
      var t0 = maintenant();
      do {
        parser.feed(texte.slice(pos, pos + taille));
        pos += taille;
      } while (pos < n && maintenant() - t0 < L.CONST.BUDGET_TRANCHE_MS);
      onProgress && onProgress(Math.min(1, pos / n));
      return yieldToUi().then(boucle);
    }
    return boucle();
  }

  /** Barre de progression (role=progressbar) avec libellé. */
  function barre(libelle) {
    var texte = U.h('span', { class: 'prog-lib', text: libelle });
    var interne = U.h('span', { class: 'prog-in' });
    var piste = U.h('div', { class: 'prog-piste', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-label': libelle }, [interne]);
    var el = U.h('div', { class: 'prog' }, [texte, piste]);
    return {
      el: el,
      set: function (frac, lib) {
        var p = Math.max(0, Math.min(100, Math.round(frac * 100)));
        piste.setAttribute('aria-valuenow', String(p));
        interne.style.width = p + '%';
        if (lib) { texte.textContent = lib + ' (' + p + ' %)'; piste.setAttribute('aria-label', lib); }
      }
    };
  }

  E.ui.perf = { maintenant: maintenant, yieldToUi: yieldToUi, tranches: tranches, analyserCsv: analyserCsv, barre: barre };
})(typeof self !== 'undefined' ? self : this);
