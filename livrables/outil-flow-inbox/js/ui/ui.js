/* Flow Inbox : outils d'interface (création de nœuds, icônes, annonces vocales, copie, téléchargement).
 * Toute donnée est rendue par textContent via h() : aucun HTML n'est jamais construit à partir d'une donnée. Aucune requête réseau. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };
  var SVGNS = 'http://www.w3.org/2000/svg';

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
        else if (k === 'value') el.value = v;
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

  /** Icône du sprite inline (index.html), décorative. */
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

  /** Bouton : libellé visible toujours présent (l'icône est décorative). */
  function bouton(libelle, opts) {
    opts = opts || {};
    return h('button', {
      type: 'button', id: opts.id,
      class: 'btn' + (opts.primaire ? ' btn-primary' : '') + (opts.discret ? ' btn-ghost' : '') + (opts.classe ? ' ' + opts.classe : ''),
      disabled: opts.desactive, title: opts.titre, onclick: opts.onclick, 'data-fk': opts.fk, 'aria-pressed': opts.presse
    }, [opts.icone ? icon(opts.icone) : null, h('span', { text: libelle })]);
  }

  /** Annonce vocale polie (région aria-live de index.html). */
  function annoncer(texte) {
    var r = $('live');
    if (!r) return;
    r.textContent = '';
    setTimeout(function () { r.textContent = texte; }, 30);
  }

  function mediaReduit() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  /** Copie dans le presse-papiers (API moderne, sinon sélection du texte d'une zone temporaire). Renvoie vrai si la copie a réussi. */
  function copier(texte, repli) {
    function secours() {
      var ta = h('textarea', { 'aria-hidden': 'true', tabindex: '-1', class: 'copie-temp' });
      ta.value = texte;
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (repli && repli.focus) repli.focus();
      return ok;
    }
    if (root.navigator && root.navigator.clipboard && root.isSecureContext) {
      return root.navigator.clipboard.writeText(texte).then(function () { return true; }, function () { return secours(); });
    }
    return Promise.resolve(secours());
  }

  /** Télécharge un texte comme fichier (Blob local : aucune requête réseau). */
  function telecharger(nom, contenu, type) {
    var blob = new Blob([contenu], { type: type || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: nom, class: 'visually-hidden' });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }

  FI.ui.ui = { SVGNS: SVGNS, $: $, h: h, ajouter: ajouter, clear: clear, icon: icon, bouton: bouton, annoncer: annoncer, mediaReduit: mediaReduit, copier: copier, telecharger: telecharger };
})(typeof self !== 'undefined' ? self : this);
