/* Équerre : groupe de boutons radio accessible (role=radiogroup, nom par aria-labelledby, flèches, tabindex itinérant).
 * Une seule option est dans l'ordre de tabulation ; les flèches changent la valeur et déplacent le focus. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;

  /** opts : { id, labelId, options:[{ valeur, libelle }], valeur, onChange(valeur), classe, desactive }.
   *  Renvoie { el, set(valeur), valeur() }. Le libellé de chaque option est visible : jamais la couleur seule. */
  function creer(opts) {
    var courant = opts.valeur;
    var boutons = [];

    function majEtats() {
      var actif = -1;
      boutons.forEach(function (b, i) { if (b.valeur === courant) actif = i; });
      boutons.forEach(function (b, i) {
        var coche = b.valeur === courant;
        b.el.setAttribute('aria-checked', coche ? 'true' : 'false');
        b.el.tabIndex = coche || (actif < 0 && i === 0) ? 0 : -1;
      });
    }

    function choisir(valeur, focus) {
      if (opts.desactive) return;
      var change = valeur !== courant;
      courant = valeur;
      majEtats();
      if (focus) {
        boutons.forEach(function (b) { if (b.valeur === valeur) b.el.focus(); });
      }
      if (change && opts.onChange) opts.onChange(valeur);
    }

    var el = h('div', { class: 'radios' + (opts.classe ? ' ' + opts.classe : ''), role: 'radiogroup', 'aria-labelledby': opts.labelId, id: opts.id });
    opts.options.forEach(function (o, i) {
      var b = h('button', {
        type: 'button', role: 'radio', class: 'radio', 'aria-checked': 'false', tabindex: '-1', disabled: opts.desactive ? true : null,
        'data-fk': (opts.id || 'radio') + '-' + o.valeur,
        onclick: function () { choisir(o.valeur, false); },
        onkeydown: function (e) {
          var j = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % opts.options.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i + opts.options.length - 1) % opts.options.length;
          else if (e.key === 'Home') j = 0;
          else if (e.key === 'End') j = opts.options.length - 1;
          if (j === null) return;
          e.preventDefault();
          choisir(opts.options[j].valeur, true);
        }
      }, [h('span', { class: 'radio-pt', 'aria-hidden': 'true' }), h('span', { text: o.libelle })]);
      boutons.push({ valeur: o.valeur, el: b });
      el.appendChild(b);
    });
    majEtats();
    return { el: el, set: function (v) { courant = v; majEtats(); }, valeur: function () { return courant; } };
  }

  E.ui.radiogroup = { creer: creer };
})(typeof self !== 'undefined' ? self : this);
