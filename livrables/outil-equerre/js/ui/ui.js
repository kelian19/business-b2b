/* Équerre : outils d'interface (création de nœuds, formats fr-FR maison, icônes, annonces, focus).
 * Toute saisie utilisateur est rendue par textContent via h() : aucun HTML n'est jamais construit à partir d'une saisie. */
(function (root) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var NNBSP = ' ';
  var NBSP = ' ';

  function $(id) { return document.getElementById(id); }

  /** Crée un élément. attrs : class, text, on… (écouteurs), sinon attribut ; false/null ignorés ; true → attribut vide. */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    ajouter(el, children);
    return el;
  }

  function ajouter(el, children) {
    if (children === null || children === undefined) return el;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) { ajouter(el, c); return; }
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  /** Icône du sprite inline (index.html) : <svg><use href="#ic-nom"></svg>, décorative. */
  function icon(nom, classe) {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'ic' + (classe ? ' ' + classe : ''));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = document.createElementNS(SVGNS, 'use');
    use.setAttribute('href', '#ic-' + nom);
    svg.appendChild(use);
    return svg;
  }

  /* ---------- Formats fr-FR écrits à la main (aucune dépendance à Intl) ---------- */

  function fmtNum(n, dec) {
    dec = dec || 0;
    if (n === null || n === undefined || isNaN(n)) return '–';
    var neg = n < 0;
    var s = Math.abs(n).toFixed(dec).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
    return (neg ? '-' : '') + s.join(',');
  }
  function fmtEur(n) { return n === null || n === undefined || isNaN(n) ? '–' : fmtNum(Math.round(n), 0) + NBSP + '€'; }
  function fmtEur2(n) { return n === null || n === undefined || isNaN(n) ? '–' : fmtNum(n, 2) + NBSP + '€'; }
  function fmtPct(x, dec) { return x === null || x === undefined || isNaN(x) ? '–' : fmtNum(x * 100, dec === undefined ? 0 : dec) + NBSP + '%'; }

  /** Montant ou nombre avec signe explicite (« +1 234 € », « -50 € ») pour un écart. */
  function fmtEurSigne(n) { return n === null || n === undefined || isNaN(n) ? '–' : (n > 0 ? '+' : '') + fmtEur(n); }
  function fmtPctSigne(x, dec) { return x === null || x === undefined || isNaN(x) ? '–' : (x > 0 ? '+' : '') + fmtPct(x, dec === undefined ? 1 : dec); }
  function fmtNumSigne(n, dec) { return n === null || n === undefined || isNaN(n) ? '–' : (n > 0 ? '+' : '') + fmtNum(n, dec); }
  /** « 330 jours », « 1 jour », « 0 jour ». */
  function fmtJours(n) { return fmtNum(n, 0) + ' ' + (Math.abs(n) > 1 ? 'jours' : 'jour'); }

  function fmtDate(iso) {
    var p = String(iso || '').slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
  }

  function fmtHeure(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso || ''));
    return m ? m[3] + '/' + m[2] + '/' + m[1] + ' à ' + m[4] + ':' + m[5] : '';
  }

  function groupSiren(s) {
    var c = root.EquerreLogic.cleanId(s);
    return /^\d{9}$/.test(c) ? c.slice(0, 3) + ' ' + c.slice(3, 6) + ' ' + c.slice(6) : String(s || '');
  }

  function pluriel(n, un, plusieurs) { return n + ' ' + (n > 1 ? plusieurs : un); }

  /** Date du jour (locale) AAAA-MM-JJ : seul endroit de l'application qui lit l'horloge pour une date de référence. */
  function aujourdhui() {
    var t = new Date();
    return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
  }

  function maintenantIso() { return new Date().toISOString(); }

  /* ---------- Accessibilité ---------- */

  /** Annonce vocale polie (région aria-live de index.html). */
  function annoncer(texte) {
    var r = $('live');
    if (!r) return;
    r.textContent = '';
    setTimeout(function () { r.textContent = texte; }, 30);
  }

  function focus(el) { if (el && el.focus) { try { el.focus({ preventScroll: false }); } catch (e) { el.focus(); } } }

  function mediaReduit() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  /** Affiche un nombre en comptant de « de » à « vers » (600 ms) ; sous prefers-reduced-motion, la valeur finale est posée directement. */
  function compteur(el, de, vers, fmt, duree) {
    var f = fmt || String;
    if (de === null || de === undefined || de === vers || mediaReduit() || !root.requestAnimationFrame) { el.textContent = f(vers); return; }
    var d = duree || 600;
    var t0 = null;
    el.textContent = f(de);
    function pas(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / d);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = f(Math.round(de + (vers - de) * e));
      if (k < 1 && el.isConnected) root.requestAnimationFrame(pas); else el.textContent = f(vers);
    }
    root.requestAnimationFrame(pas);
  }

  /** Message dans une zone dédiée (role=status ou alert posé dans le HTML). */
  function showMsg(el, texte) {
    if (!texte) { el.hidden = true; el.textContent = ''; return; }
    el.textContent = texte;
    el.hidden = false;
  }

  /* ---------- Composants réutilisables ---------- */

  var STATUTS = {
    bloquant: { icone: 'croix-cercle', texte: 'Bloquant' },
    a_corriger: { icone: 'alerte', texte: 'À corriger' },
    ok: { icone: 'check-cercle', texte: 'Sans anomalie' },
    note: { icone: 'info', texte: 'Note' }
  };

  /** Badge de statut accessible : icône + texte, jamais la couleur seule. */
  function statusBadge(type, texteLibre) {
    var s = STATUTS[type] || STATUTS.note;
    return h('span', { class: 'status status-' + type }, [icon(s.icone), h('span', { text: texteLibre || s.texte })]);
  }

  /** Mention à placer partout où l'on parle de sanction ou de conformité. */
  function mentionConseil(extra) {
    return h('p', { class: 'conseil' }, [icon('info'), h('span', { text: (extra ? extra + ' ' : '') + 'Cette information ne constitue pas un conseil fiscal.' })]);
  }

  function bouton(libelle, opts) {
    opts = opts || {};
    return h('button', {
      type: 'button', class: 'btn' + (opts.primaire ? ' btn-primary' : '') + (opts.discret ? ' btn-ghost' : '') + (opts.danger ? ' btn-danger' : '') + (opts.classe ? ' ' + opts.classe : ''),
      id: opts.id, disabled: opts.desactive, onclick: opts.onclick, title: opts.titre, 'aria-label': opts.aria
    }, [opts.icone ? icon(opts.icone) : null, h('span', { text: libelle })]);
  }

  var Equerre = root.Equerre;
  Equerre.ui.ui = {
    SVGNS: SVGNS, NNBSP: NNBSP, NBSP: NBSP,
    $: $, h: h, ajouter: ajouter, clear: clear, icon: icon,
    fmtNum: fmtNum, fmtEur: fmtEur, fmtEur2: fmtEur2, fmtPct: fmtPct, fmtDate: fmtDate, fmtHeure: fmtHeure,
    fmtEurSigne: fmtEurSigne, fmtPctSigne: fmtPctSigne, fmtNumSigne: fmtNumSigne, fmtJours: fmtJours, compteur: compteur,
    groupSiren: groupSiren, pluriel: pluriel, aujourdhui: aujourdhui, maintenantIso: maintenantIso,
    annoncer: annoncer, focus: focus, mediaReduit: mediaReduit, showMsg: showMsg,
    statusBadge: statusBadge, mentionConseil: mentionConseil, bouton: bouton
  };
})(typeof self !== 'undefined' ? self : this);
