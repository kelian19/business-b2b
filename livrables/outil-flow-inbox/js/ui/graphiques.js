/* Flow Inbox : graphiques en SVG intégré (barres horizontales, colonnes, barre empilée). Aucune bibliothèque, aucune ressource externe.
 * Chaque graphique a : un nom accessible, des éléments focalisables (un seul arrêt de tabulation, flèches pour passer de l'un à l'autre),
 * une bulle d'information au survol et au focus, et un tableau équivalent. L'information n'est jamais portée par la couleur seule :
 * chaque barre porte son libellé et sa valeur en texte, la barre empilée a des motifs différents. Les textes restent en HTML (12 px au minimum). */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var TT = FI.ui.tooltip;
  var NNBSP = ' ';

  function s(tag, attrs) {
    var el = document.createElementNS(U.SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]); });
    return el;
  }

  function pct(n, total) { return total > 0 ? Math.round(100 * n / total) + NNBSP + '%' : '0' + NNBSP + '%'; }

  /** Tabulation « roving » : un seul élément à tabindex 0, flèches, début et fin pour parcourir. */
  function rover(conteneur, elements) {
    function aller(i) {
      var n = elements.length;
      var k = (i + n) % n;
      elements.forEach(function (e, j) { e.setAttribute('tabindex', j === k ? '0' : '-1'); });
      elements[k].focus();
    }
    elements.forEach(function (e, i) {
      e.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') { ev.preventDefault(); aller(i + 1); }
        else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') { ev.preventDefault(); aller(i - 1); }
        else if (ev.key === 'Home') { ev.preventDefault(); aller(0); }
        else if (ev.key === 'End') { ev.preventDefault(); aller(elements.length - 1); }
      });
      e.addEventListener('focus', function () {
        elements.forEach(function (x, j) { x.setAttribute('tabindex', j === i ? '0' : '-1'); });
      });
    });
  }

  /** Tableau équivalent, dans un bloc repliable. entetes : [texte] ; lignes : [[texte…]] ; la première cellule est l'en-tête de ligne. */
  function tableauAlt(titre, entetes, lignes) {
    var table = h('table', { class: 'table petit-tableau alt' }, [
      h('caption', { class: 'visually-hidden', text: titre }),
      h('thead', null, [h('tr', null, entetes.map(function (e, i) { return h('th', { scope: 'col', class: i ? 'num' : null, text: e }); }))]),
      h('tbody', null, lignes.map(function (l) {
        return h('tr', null, l.map(function (c, i) { return i === 0 ? h('th', { scope: 'row', text: c }) : h('td', { class: 'num', text: c }); }));
      }))
    ]);
    return h('details', { class: 'alt-tableau' }, [
      h('summary', { text: 'Voir les chiffres en tableau' }),
      h('div', { class: 'table-wrap' }, [table])
    ]);
  }

  function vide(texte) { return h('p', { class: 'etat-vide', role: 'note' }, [U.icon('info'), h('span', { text: texte })]); }

  /**
   * Barres horizontales. o : { nom, items:[{libelle, valeur, texteValeur, ton, infobulle:{titre, lignes}}], max, total, colonnes:[entête libellé, entête valeur],
   * tableau:{entetes, lignes} (facultatif), vide }.
   */
  function barresH(o) {
    if (!o.items.length) return h('div', { class: 'graph' }, [vide(o.vide || 'Aucune donnée à afficher.')]);
    var max = o.max || Math.max.apply(null, o.items.map(function (x) { return x.valeur; }));
    if (!(max > 0)) max = 1;
    var total = o.total !== undefined ? o.total : o.items.reduce(function (a, x) { return a + x.valeur; }, 0);
    var ul = h('ul', { class: 'barres', 'aria-label': o.nom });
    var els = [];
    o.items.forEach(function (it, i) {
      var svg = s('svg', { class: 'barre-svg', viewBox: '0 0 100 10', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
      svg.appendChild(s('rect', { class: 'barre-piste', x: 0, y: 0, width: 100, height: 10 }));
      svg.appendChild(s('rect', { class: 'barre-rect' + (it.ton === 'alerte' ? ' alerte' : ''), x: 0, y: 0, width: Math.max(0, it.valeur / max * 100), height: 10, style: '--i:' + i }));
      var texteVal = it.texteValeur || (it.valeur + (o.afficherPourcent === false ? '' : ' · ' + pct(it.valeur, total)));
      var li = h('li', { class: 'barre', tabindex: i === 0 ? '0' : '-1', 'aria-label': it.libelle + ' : ' + texteVal.replace(NNBSP, ' ') }, [
        h('span', { class: 'barre-lib', text: it.libelle }),
        h('span', { class: 'barre-val', text: texteVal }),
        svg
      ]);
      TT.attacher(li, function () { return it.infobulle || { titre: it.libelle, lignes: [texteVal] }; });
      els.push(li);
      ul.appendChild(li);
    });
    rover(ul, els);
    var tab = o.tableau || {
      entetes: [o.colonnes ? o.colonnes[0] : 'Libellé', o.colonnes ? o.colonnes[1] : 'Nombre', 'Part'],
      lignes: o.items.map(function (x) { return [x.libelle, String(x.valeur), pct(x.valeur, total)]; })
    };
    return h('div', { class: 'graph' }, [ul, tableauAlt(o.nom, tab.entetes, tab.lignes)]);
  }

  /** Colonnes verticales (ex. demandes par semaine). o : { nom, items:[{libelle, sous, valeur, infobulle}], max, tableau }. */
  function colonnes(o) {
    var max = o.max || Math.max.apply(null, o.items.map(function (x) { return x.valeur; }));
    if (!(max > 0)) max = 1;
    var ul = h('ul', { class: 'colonnes', 'aria-label': o.nom });
    var els = [];
    o.items.forEach(function (it, i) {
      var haut = it.valeur / max * 100;
      var svg = s('svg', { class: 'colonne-svg', viewBox: '0 0 40 100', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
      svg.appendChild(s('rect', { class: 'barre-piste', x: 0, y: 0, width: 40, height: 100 }));
      svg.appendChild(s('rect', { class: 'barre-rect colonne-rect', x: 0, y: 100 - haut, width: 40, height: haut, style: '--i:' + i }));
      var li = h('li', { class: 'colonne', tabindex: i === 0 ? '0' : '-1', 'aria-label': it.libelle + (it.sous ? ' (' + it.sous + ')' : '') + ' : ' + it.valeur }, [
        h('span', { class: 'colonne-val', text: String(it.valeur) }),
        svg,
        h('span', { class: 'colonne-lib', text: it.libelle }),
        it.sous ? h('span', { class: 'colonne-sous', text: it.sous }) : null
      ]);
      TT.attacher(li, function () { return it.infobulle || { titre: it.libelle, lignes: [String(it.valeur)] }; });
      els.push(li);
      ul.appendChild(li);
    });
    rover(ul, els);
    var tab = o.tableau || { entetes: ['Semaine', 'Nombre'], lignes: o.items.map(function (x) { return [x.libelle, String(x.valeur)]; }) };
    return h('div', { class: 'graph' }, [ul, tableauAlt(o.nom, tab.entetes, tab.lignes)]);
  }

  var MOTIFS = ['pat-plein', 'pat-hach', 'pat-points'];

  /** Barre empilée avec motifs distincts (jamais la couleur seule) et légende au clavier. o : { nom, segments:[{libelle, valeur, motif, infobulle}], total }. */
  function empile(o) {
    var total = o.total !== undefined ? o.total : o.segments.reduce(function (a, x) { return a + x.valeur; }, 0);
    if (!(total > 0)) return h('div', { class: 'graph' }, [vide(o.vide || 'Aucune donnée à afficher.')]);
    var W = 600;
    var resume = o.segments.map(function (x) { return x.libelle + ' : ' + x.valeur + ' (' + pct(x.valeur, total).replace(NNBSP, ' ') + ')'; }).join(' ; ');
    var svg = s('svg', { class: 'empile-svg', viewBox: '0 0 ' + W + ' 44', role: 'img', 'aria-label': o.nom + ' : ' + resume, focusable: 'false' });
    var x = 0;
    o.segments.forEach(function (seg, i) {
      var w = seg.valeur / total * W;
      if (w <= 0) return;
      svg.appendChild(s('rect', { x: x, y: 0, width: w, height: 44, fill: 'url(#' + (MOTIFS[i] || MOTIFS[0]) + ')', class: 'empile-seg' }));
      svg.appendChild(s('rect', { x: x, y: 0, width: w, height: 44, fill: 'none', class: 'empile-bord' }));
      x += w;
    });
    var legende = h('ul', { class: 'legende', 'aria-label': 'Légende : ' + o.nom });
    var els = [];
    o.segments.forEach(function (seg, i) {
      var sw = s('svg', { class: 'legende-sw', viewBox: '0 0 28 18', 'aria-hidden': 'true', focusable: 'false' });
      sw.appendChild(s('rect', { x: 1, y: 1, width: 26, height: 16, fill: 'url(#' + (MOTIFS[i] || MOTIFS[0]) + ')', class: 'empile-bord-sw' }));
      var li = h('li', { class: 'legende-item', tabindex: i === 0 ? '0' : '-1', 'aria-label': seg.libelle + ' : ' + seg.valeur + ', ' + pct(seg.valeur, total).replace(NNBSP, ' ') }, [
        sw,
        h('span', { class: 'legende-lib', text: seg.libelle }),
        h('span', { class: 'legende-val', text: seg.valeur + ' · ' + pct(seg.valeur, total) })
      ]);
      TT.attacher(li, function () { return seg.infobulle || { titre: seg.libelle, lignes: [seg.valeur + ' sur ' + total] }; });
      els.push(li);
      legende.appendChild(li);
    });
    rover(legende, els);
    var tab = o.tableau || { entetes: ['Catégorie', 'Nombre', 'Part'], lignes: o.segments.map(function (z) { return [z.libelle, String(z.valeur), pct(z.valeur, total)]; }) };
    return h('div', { class: 'graph' }, [svg, legende, tableauAlt(o.nom, tab.entetes, tab.lignes)]);
  }

  FI.ui.graphiques = { barresH: barresH, colonnes: colonnes, empile: empile, tableauAlt: tableauAlt, pct: pct, vide: vide };
})(typeof self !== 'undefined' ? self : this);
