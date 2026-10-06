/* Équerre : graphiques SVG (jauge, histogramme mensuel, barre empilée, barres d'encaissements).
 * Chaque graphique : équivalent texte (aria-label, légende, tableau), éléments focalisables avec infobulle partagée (survol, focus, Échap),
 * motifs de remplissage distincts en plus des couleurs : jamais la couleur seule. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var TT = E.ui.tooltip;

  var MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  function monthLabel(ym, withYear) {
    var m = MOIS[+ym.slice(5, 7) - 1];
    return withYear ? m + ' ' + ym.slice(0, 4) : m;
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
    var f = v / p;
    var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return n * p;
  }

  function compactEur(v) {
    if (v >= 1000) return U.fmtNum(Math.round(v / 100) / 10, 1) + ' k€';
    return Math.round(v) + ' €';
  }

  function s(tag, attrs, text) {
    var el = document.createElementNS(U.SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]); });
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function remPx() { return (parseFloat(root.getComputedStyle(document.documentElement).fontSize) || 16) / 16; }

  /* ------------------------------------------------------------------ */
  /* Motifs de remplissage                                               */
  /* ------------------------------------------------------------------ */

  var MOTIFS = ['plein-nuit', 'plein-rouge', 'points', 'hach', 'croix', 'hach-rouge'];

  /** <defs> avec les motifs, préfixés (identifiants uniques dans le document). */
  function motifs(prefixe) {
    var defs = s('defs');
    function pat(nom, enfants) {
      var p = s('pattern', { id: prefixe + '-' + nom, width: 8, height: 8, patternUnits: 'userSpaceOnUse' });
      enfants.forEach(function (c) { p.appendChild(c); });
      defs.appendChild(p);
    }
    function fond(c) { return s('rect', { width: 8, height: 8, class: c }); }
    var diag = 'M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6';
    var diag2 = 'M-2 6 L2 10 M0 0 L8 8 M6 -2 L10 2';
    pat('plein-nuit', [fond('pat-nuit')]);
    pat('plein-rouge', [fond('pat-rouge')]);
    pat('points', [fond('pat-fond'), s('circle', { cx: 4, cy: 4, r: 1.7, class: 'pat-nuit' })]);
    pat('hach', [fond('pat-fond'), s('path', { d: diag, class: 'pat-nuit-l' })]);
    pat('croix', [fond('pat-fond'), s('path', { d: diag, class: 'pat-nuit-l' }), s('path', { d: diag2, class: 'pat-nuit-l' })]);
    pat('hach-rouge', [fond('pat-fond'), s('path', { d: diag, class: 'pat-rouge-l' })]);
    return defs;
  }

  /* ------------------------------------------------------------------ */
  /* Jauge semi-circulaire (indice sur 100)                              */
  /* ------------------------------------------------------------------ */

  /** opts : { valeur (0 à 100), precedent (valeur affichée avant, pour l'animation), aria }. Renvoie { el }. */
  function jauge(opts) {
    var v = Math.max(0, Math.min(100, opts.valeur));
    var depart = opts.precedent === null || opts.precedent === undefined || U.mediaReduit() ? v : Math.max(0, Math.min(100, opts.precedent));
    var path = 'M 20 100 A 80 80 0 0 1 180 100';
    var svg = s('svg', { viewBox: '0 0 200 120', class: 'gauge-svg', 'aria-hidden': 'true', focusable: 'false' });
    svg.appendChild(s('path', { d: path, class: 'gauge-piste', pathLength: 100 }));
    var arc = s('path', { d: path, class: 'gauge-arc', pathLength: 100, 'stroke-dasharray': '100 100', 'stroke-dashoffset': 100 - depart });
    svg.appendChild(arc);
    svg.appendChild(s('text', { x: 20, y: 118, class: 'gauge-borne', 'text-anchor': 'middle' }, '0'));
    svg.appendChild(s('text', { x: 180, y: 118, class: 'gauge-borne', 'text-anchor': 'middle' }, '100'));
    var n = h('span', { class: 'gauge-n', text: String(opts.precedent === null || opts.precedent === undefined || U.mediaReduit() ? v : Math.round(depart)) });
    var el = h('div', { class: 'gauge', role: 'img', 'aria-label': opts.aria }, [
      svg, h('p', { class: 'gauge-val', 'aria-hidden': 'true' }, [n, h('span', { class: 'gauge-sur', text: ' / 100' })])
    ]);
    if (depart !== v) {
      root.requestAnimationFrame(function () {
        root.requestAnimationFrame(function () {
          arc.setAttribute('stroke-dashoffset', String(100 - v));
          U.compteur(n, Math.round(depart), v, String, 700);
        });
      });
    }
    return { el: el };
  }

  /* ------------------------------------------------------------------ */
  /* Histogramme du CA mensuel                                           */
  /* ------------------------------------------------------------------ */

  /** Histogramme du chiffre d'affaires HT mensuel dans « box ». parMois : [{ mois: 'AAAA-MM', ht }].
   *  ids : { titre (élément h3), titreId, descId }. opts : { moyenne, moisMax, moisMin }.
   *  Chaque barre est focalisable (role img, aria-label « oct. 2025 : 47 877 € HT ») et porte l'infobulle partagée. */
  function histogrammeMensuel(box, parMois, ids, opts) {
    opts = opts || {};
    var data = parMois.slice(-24);
    U.clear(box);
    if (ids.titre) ids.titre.textContent = 'Chiffre d\'affaires hors taxe par mois' + (parMois.length > 24 ? ' (24 derniers mois)' : '');
    if (!data.length) { box.appendChild(h('p', { class: 'small', text: 'Aucune donnée à afficher.' })); return; }
    var rem = remPx();
    var W = Math.max(300, Math.round(box.clientWidth || 640));
    var narrow = W < 520;
    var H = Math.round((narrow ? 230 : 214) * rem);
    var m = { l: Math.round((narrow ? 50 : 62) * rem), r: 8, t: Math.round(28 * rem), b: Math.round(42 * rem) };
    var pw = W - m.l - m.r;
    var ph = H - m.t - m.b;
    var max = niceMax(Math.max.apply(null, data.map(function (d) { return d.ht; })));
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-labelledby': ids.titreId + ' ' + ids.descId, preserveAspectRatio: 'xMidYMid meet' });
    svg.appendChild(s('desc', { id: ids.descId }, 'Histogramme du chiffre d\'affaires HT mensuel, de ' + monthLabel(data[0].mois, true) + ' à ' + monthLabel(data[data.length - 1].mois, true) +
      '. Chaque barre se lit au clavier ; les valeurs sont aussi dans le tableau sous le graphique.'));
    var ticks = 4;
    for (var i = 0; i <= ticks; i++) {
      var val = (max * i) / ticks;
      var y = m.t + ph - (ph * i) / ticks;
      svg.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: i === 0 ? 'axis' : 'grid' }));
      svg.appendChild(s('text', { x: m.l - 6, y: y + 4, 'text-anchor': 'end', 'font-size': (narrow ? 11 : 12.5) * rem }, compactEur(val)));
    }
    var slot = pw / data.length;
    var bw = Math.max(8, slot * 0.62);
    var fs = (narrow ? 11 : 12) * rem;
    var showValues = W >= 640;
    var moy = typeof opts.moyenne === 'number' ? opts.moyenne : null;
    // La ligne de moyenne est tracée avant les barres et leurs valeurs : les étiquettes (avec halo) passent par-dessus, jamais barrées
    if (moy !== null && data.length > 1) {
      var ym = m.t + ph - (max ? (ph * moy) / max : 0);
      svg.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: ym, y2: ym, class: 'moy' }));
    }
    data.forEach(function (d, k) {
      var bh = max ? (ph * d.ht) / max : 0;
      var x = m.l + slot * k + (slot - bw) / 2;
      var y2 = m.t + ph - bh;
      var ecart = moy ? (d.ht - moy) / moy : null;
      var lib = monthLabel(d.mois, true);
      var g = s('g', { class: 'bar-g', tabindex: '0', role: 'img', 'aria-label': lib + ' : ' + U.fmtEur(d.ht) + ' HT', 'data-mois': d.mois });
      g.appendChild(s('rect', { x: m.l + slot * k, y: m.t, width: slot, height: ph, class: 'bar-hit' }));
      g.appendChild(s('rect', { x: x, y: y2, width: bw, height: Math.max(0, bh), class: 'bar-r' }));
      svg.appendChild(g);
      TT.attacher(g, function () {
        var lignes = [U.fmtEur(d.ht) + ' HT'];
        if (ecart !== null) lignes.push('Écart à la moyenne mensuelle : ' + U.fmtPctSigne(ecart, 1));
        return { titre: lib, lignes: lignes };
      });
      var cx = x + bw / 2;
      var haut = y2 - 5;
      if (showValues) svg.appendChild(s('text', { x: cx, y: haut, 'text-anchor': 'middle', 'font-size': 12 * rem, class: 'bar-val' }, compactEur(d.ht)));
      var bord = opts.moisMax && opts.moisMax.mois === d.mois ? 'max' : opts.moisMin && opts.moisMin.mois === d.mois ? 'min' : null;
      if (bord && data.length > 1) svg.appendChild(s('text', { x: cx, y: haut - (showValues ? 14 * rem : 0), 'text-anchor': 'middle', 'font-size': 11.5 * rem, 'font-weight': '700', class: 'bar-borne' }, bord));
      svg.appendChild(s('text', { x: cx, y: H - m.b + 16 * rem, 'text-anchor': 'middle', 'font-size': fs }, monthLabel(d.mois, false).replace('.', '')));
      if (k === 0 || d.mois.slice(5, 7) === '01') {
        svg.appendChild(s('text', { x: cx, y: H - m.b + 31 * rem, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': '700' }, d.mois.slice(0, 4)));
      }
    });
    if (moy !== null && data.length > 1) {
      svg.appendChild(s('text', { x: W - m.r - 4, y: 12 * rem, 'text-anchor': 'end', 'font-size': (narrow ? 11 : 12.5) * rem, 'font-weight': '700', class: 'moy-lab' }, '- - Moyenne mensuelle : ' + U.fmtEur(moy)));
    }
    box.appendChild(svg);
  }

  /* ------------------------------------------------------------------ */
  /* Barre empilée (100 %)                                               */
  /* ------------------------------------------------------------------ */

  /** opts : { id, segments:[{ id, label, valeur (>= 0), motif, legende, aria }], ariaLabel, focusable, tooltip(seg) → { titre, lignes } }.
   *  Les largeurs sont des parts de la somme des valeurs. Chaque segment a un motif distinct (fill=url(#…)) et une légende texte. */
  function barreEmpilee(opts) {
    var total = opts.segments.reduce(function (t, x) { return t + x.valeur; }, 0);
    var hauteur = Math.round(34 * remPx());
    var svg = s('svg', { class: 'stack-svg', width: '100%', height: hauteur, role: opts.focusable ? 'group' : 'img', 'aria-label': opts.ariaLabel });
    svg.appendChild(motifs(opts.id));
    var x = 0;
    opts.segments.forEach(function (seg) {
      var w = total ? (100 * seg.valeur) / total : 0;
      if (w <= 0) return;
      var attrs = { class: 'stack-seg' };
      if (opts.focusable) { attrs.tabindex = '0'; attrs.role = 'img'; attrs['aria-label'] = seg.aria || seg.legende; }
      var g = s('g', attrs);
      g.appendChild(s('rect', { x: x.toFixed(3) + '%', y: 0, width: w.toFixed(3) + '%', height: hauteur, fill: 'url(#' + opts.id + '-' + seg.motif + ')', class: 'stack-rect', 'data-segment': seg.id }));
      svg.appendChild(g);
      if (opts.focusable && opts.tooltip) TT.attacher(g, function () { return opts.tooltip(seg); });
      x += w;
    });
    var legende = h('ul', { class: 'stack-legend', role: 'list' }, opts.segments.map(function (seg) {
      var sw = s('svg', { class: 'stack-sw', width: 22, height: 14, 'aria-hidden': 'true', focusable: 'false' });
      sw.appendChild(s('rect', { x: 0.75, y: 0.75, width: 20.5, height: 12.5, fill: 'url(#' + opts.id + '-' + seg.motif + ')', class: 'stack-sw-r' }));
      return h('li', null, [sw, h('span', { text: seg.legende })]);
    }));
    return { el: h('div', { class: 'stack' }, [svg, legende]) };
  }

  /* ------------------------------------------------------------------ */
  /* Barres d'encaissements par tranche                                  */
  /* ------------------------------------------------------------------ */

  function couper(texte, maxCar) {
    var mots = texte.split(' ');
    var lignes = [];
    var cur = '';
    mots.forEach(function (m) {
      if (cur && (cur + ' ' + m).length > maxCar) { lignes.push(cur); cur = m; } else cur = cur ? cur + ' ' + m : m;
    });
    if (cur) lignes.push(cur);
    return lignes;
  }

  /** items : [{ id, label, valeur, nb, alerte }]. Barres verticales par tranche, montant au-dessus, nombre de factures dessous. */
  function barresEncaissements(box, items, opts) {
    opts = opts || {};
    U.clear(box);
    var rem = remPx();
    var W = Math.max(280, Math.round(box.clientWidth || 560));
    var narrow = W < 520;
    var fs = (narrow ? 11 : 12.5) * rem;
    var lh = fs * 1.25;
    var slot = (W - 16) / items.length;
    var maxCar = Math.max(8, Math.floor(slot / (fs * 0.52)));
    var lignesMax = items.reduce(function (t, it) { return Math.max(t, couper(it.label, maxCar).length); }, 1);
    var m = { l: 8, r: 8, t: Math.round(26 * rem), b: Math.round(lh * (lignesMax + 1) + 22 * rem) };
    var H = Math.round(m.t + 150 * rem + m.b);
    var ph = H - m.t - m.b;
    var max = niceMax(Math.max.apply(null, items.map(function (it) { return it.valeur; }).concat([1])));
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': opts.ariaLabel || 'Encaissements attendus par tranche d\'échéance', preserveAspectRatio: 'xMidYMid meet' });
    svg.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph, class: 'axis' }));
    var bw = Math.min(slot * 0.56, 96 * rem);
    items.forEach(function (it, k) {
      var cx = m.l + slot * k + slot / 2;
      var bh = it.valeur > 0 ? Math.max(4, (ph * it.valeur) / max) : 0;
      var y2 = m.t + ph - bh;
      var aria = it.label + ' : ' + U.fmtEur(it.valeur) + ' TTC, ' + U.pluriel(it.nb, 'facture', 'factures');
      var g = s('g', { class: 'bar-g' + (it.alerte ? ' bar-alerte' : ''), tabindex: '0', role: 'img', 'aria-label': aria, 'data-tranche': it.id });
      g.appendChild(s('rect', { x: m.l + slot * k, y: 0, width: slot, height: m.t + ph, class: 'bar-hit' }));
      if (bh > 0) g.appendChild(s('rect', { x: cx - bw / 2, y: y2, width: bw, height: bh, class: it.alerte ? 'bar-r bar-rouge' : 'bar-r' }));
      else g.appendChild(s('rect', { x: cx - bw / 2, y: m.t + ph - 3, width: bw, height: 3, class: 'bar-zero' }));
      svg.appendChild(g);
      TT.attacher(g, function () { return { titre: it.label, lignes: [U.fmtEur(it.valeur) + ' TTC', U.pluriel(it.nb, 'facture', 'factures')] }; });
      svg.appendChild(s('text', { x: cx, y: y2 - 6, 'text-anchor': 'middle', 'font-size': fs * 1.05, 'font-weight': '700', class: 'bar-val' }, U.fmtEur(it.valeur)));
      var y0 = m.t + ph + lh + 4;
      var lignes = couper(it.label, maxCar);
      var t = s('text', { x: cx, y: y0, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': '600' });
      lignes.forEach(function (l, i) { t.appendChild(s('tspan', { x: cx, dy: i === 0 ? 0 : lh }, l)); });
      svg.appendChild(t);
      svg.appendChild(s('text', { x: cx, y: y0 + lh * lignes.length, 'text-anchor': 'middle', 'font-size': fs, class: 'bar-nb' }, it.nb ? U.pluriel(it.nb, 'facture', 'factures') : 'Aucune facture'));
      if (it.alerte) {
        var ic = s('use', { href: '#ic-alerte', x: cx - fs * 0.55, y: y0 + lh * (lignes.length + 1) - fs * 0.2, width: fs * 1.1, height: fs * 1.1, class: 'ic ic-svg' });
        svg.appendChild(ic);
      }
    });
    box.appendChild(svg);
  }

  E.ui.charts = {
    s: s, monthLabel: monthLabel, niceMax: niceMax, compactEur: compactEur, motifs: motifs, MOTIFS: MOTIFS,
    jauge: jauge, histogrammeMensuel: histogrammeMensuel, barreEmpilee: barreEmpilee, barresEncaissements: barresEncaissements
  };
})(typeof self !== 'undefined' ? self : this);
