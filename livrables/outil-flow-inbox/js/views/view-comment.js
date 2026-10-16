/* Flow Inbox : écran « Comment ça marche ». Schéma SVG du parcours (boîte Gmail, relevé, contrôles, tableau, brouillon, relecture humaine, envoi par la personne),
 * ce qui est simulé dans la démonstration, les limites, ce que la version réelle suppose, glossaire. Aucun prix, aucune date, aucune promesse de résultat. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var K = FI.ui.contenus;
  var A = FI.ui.aide;
  var NS = U.SVGNS;

  function s(tag, attrs, texte) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]); });
    if (texte !== undefined) el.textContent = texte;
    return el;
  }

  /* Titres sur une ou deux lignes pour chaque étape (largeur de boîte limitée). */
  var LIGNES = [['Boîte Gmail', '(simulée)'], ['Relevé des', 'informations'], ['Contrôles'], ['Tableau', 'Google Sheets'], ['Brouillon', 'de réponse'], ['Relecture', 'humaine'], ['Envoi par', 'la personne']];

  function boite(svg, e, x, y, w, hauteur, cx) {
    var personne = e.acteur === 'personne';
    svg.appendChild(s('rect', { x: x, y: y, width: w, height: hauteur, rx: 14, class: 'sch-boite' + (personne ? ' sch-personne' : '') }));
    svg.appendChild(s('circle', { cx: x + 24, cy: y + 24, r: 15, class: 'sch-num-fond' + (personne ? ' sch-personne' : '') }));
    svg.appendChild(s('text', { x: x + 24, y: y + 30, class: 'sch-num', 'text-anchor': 'middle' }, String(e.num)));
    var lignes = LIGNES[e.num - 1];
    var t = s('text', { x: cx, y: y + 62, class: 'sch-titre', 'text-anchor': 'middle' });
    lignes.forEach(function (l, i) { t.appendChild(s('tspan', { x: cx, dy: i ? 21 : 0 }, l)); });
    svg.appendChild(t);
    svg.appendChild(s('text', { x: cx, y: y + hauteur - 14, class: 'sch-etiquette', 'text-anchor': 'middle' }, e.etiquette));
  }

  function defs(svg, id) {
    var d = s('defs');
    var m = s('marker', { id: id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto-start-reverse' });
    m.appendChild(s('path', { d: 'M0 0 L10 5 L0 10 z', class: 'sch-pointe' }));
    d.appendChild(m);
    svg.appendChild(d);
  }

  function resume() {
    return K.ETAPES_PARCOURS.map(function (e) { return e.num + ', ' + e.titre + ' (' + e.etiquette + ')'; }).join(' ; ');
  }

  function schemaHorizontal() {
    var svg = s('svg', { class: 'schema schema-h', viewBox: '0 0 1200 230', role: 'img', 'aria-labelledby': 'sch-h-t sch-h-d', focusable: 'false' });
    svg.appendChild(s('title', { id: 'sch-h-t' }, 'Parcours d\'une demande en sept étapes'));
    svg.appendChild(s('desc', { id: 'sch-h-d' }, 'Les étapes 1 à 5 sont préparées par l\'outil, les étapes 6 et 7 sont faites par une personne : ' + resume() + '.'));
    defs(svg, 'fleche-h');
    var w = 148, g = 27, y = 66, hb = 130;
    // Bandeaux « outil » (étapes 1 à 5) et « personne » (étapes 6 et 7)
    var x5 = 1 + 4 * (w + g) + w;
    svg.appendChild(s('path', { d: 'M1 40 H' + x5, class: 'sch-bandeau' }));
    svg.appendChild(s('text', { x: 1, y: 28, class: 'sch-bandeau-t' }, 'Préparé par l\'outil'));
    var x6 = 1 + 5 * (w + g);
    svg.appendChild(s('path', { d: 'M' + x6 + ' 40 H1199', class: 'sch-bandeau sch-bandeau-p' }));
    svg.appendChild(s('text', { x: x6, y: 28, class: 'sch-bandeau-t' }, 'Fait par une personne'));
    K.ETAPES_PARCOURS.forEach(function (e, i) {
      var x = 1 + i * (w + g);
      boite(svg, e, x, y, w, hb, x + w / 2);
      if (i < 6) svg.appendChild(s('path', { d: 'M' + (x + w + 3) + ' ' + (y + hb / 2) + ' H' + (x + w + g - 3), class: 'sch-lien', 'marker-end': 'url(#fleche-h)' }));
    });
    return svg;
  }

  function schemaVertical() {
    var svg = s('svg', { class: 'schema schema-v', viewBox: '0 0 420 880', role: 'img', 'aria-labelledby': 'sch-v-t sch-v-d', focusable: 'false' });
    svg.appendChild(s('title', { id: 'sch-v-t' }, 'Parcours d\'une demande en sept étapes'));
    svg.appendChild(s('desc', { id: 'sch-v-d' }, 'Les étapes 1 à 5 sont préparées par l\'outil, les étapes 6 et 7 sont faites par une personne : ' + resume() + '.'));
    defs(svg, 'fleche-v');
    var x = 20, w = 380, hb = 90, g = 30, y0 = 6;
    K.ETAPES_PARCOURS.forEach(function (e, i) {
      var y = y0 + i * (hb + g);
      var personne = e.acteur === 'personne';
      svg.appendChild(s('rect', { x: x, y: y, width: w, height: hb, rx: 14, class: 'sch-boite' + (personne ? ' sch-personne' : '') }));
      svg.appendChild(s('circle', { cx: x + 30, cy: y + hb / 2, r: 17, class: 'sch-num-fond' + (personne ? ' sch-personne' : '') }));
      svg.appendChild(s('text', { x: x + 30, y: y + hb / 2 + 6, class: 'sch-num', 'text-anchor': 'middle' }, String(e.num)));
      svg.appendChild(s('text', { x: x + 64, y: y + 38, class: 'sch-titre' }, LIGNES[e.num - 1].join(' ')));
      svg.appendChild(s('text', { x: x + 64, y: y + 66, class: 'sch-etiquette' }, (personne ? 'Personne : ' : 'Outil : ') + e.etiquette));
      if (i < 6) svg.appendChild(s('path', { d: 'M' + (x + w / 2) + ' ' + (y + hb + 3) + ' V' + (y + hb + g - 3), class: 'sch-lien', 'marker-end': 'url(#fleche-v)' }));
    });
    return svg;
  }

  function liste(items) { return h('ul', { class: 'liste-puces' }, items.map(function (t) { return h('li', { text: t }); })); }

  function render(c) {
    var etapes = h('ol', { class: 'etapes-liste' }, K.ETAPES_PARCOURS.map(function (e) {
      return h('li', { class: 'etape-item' + (e.acteur === 'personne' ? ' etape-personne' : '') }, [
        h('div', { class: 'etape-tete' }, [
          h('span', { class: 'etape-num', 'aria-hidden': 'true', text: String(e.num) }),
          h('h3', { text: e.titre }),
          h('span', { class: 'etape-badge', text: (e.acteur === 'personne' ? 'Personne' : 'Outil') + ' · ' + e.etiquette })
        ]),
        h('p', { text: e.texte })
      ]);
    }));

    U.clear(c);
    c.appendChild(h('section', { class: 'vue-comment', 'aria-labelledby': 'titre-vue' }, [
      h('h1', { id: 'titre-vue', tabindex: '-1', text: 'Comment ça marche' }),
      h('p', { class: 'lead', text: 'Le parcours d\'une demande reçue par e-mail, de la boîte jusqu\'à l\'envoi par une personne. L\'outil prépare ; une personne relit, décide et envoie.' }),
      h('div', { class: 'card schema-carte' }, [
        h('h2', { text: 'Le parcours en sept étapes' }),
        schemaHorizontal(),
        schemaVertical(),
        h('ul', { class: 'schema-legende' }, [
          h('li', null, [h('span', { class: 'leg-sw leg-outil', 'aria-hidden': 'true' }), ' Trait plein : préparé par l\'outil']),
          h('li', null, [h('span', { class: 'leg-sw leg-personne', 'aria-hidden': 'true' }), ' Pointillé : fait par une personne'])
        ])
      ]),
      h('div', { class: 'card' }, [h('h2', { text: 'Les sept étapes en détail' }), etapes]),
      h('div', { class: 'card carte-demo', role: 'note' }, [
        h('h2', { text: 'Dans cette démonstration' }),
        liste([
          'La boîte est simulée : les e-mails sont fictifs, fournis avec l\'outil, et aucune vraie boîte n\'est lue.',
          'L\'extraction des informations est préparée à l\'avance pour ces e-mails. L\'écran « Essayer avec un e-mail fictif » applique des règles simples, pas un modèle de langage ; la version réelle s\'appuierait sur un modèle de langage avec relecture humaine.',
          'Le tableau de suivi est un aperçu local : rien n\'est écrit dans un vrai tableur Google Sheets.',
          'Rien n\'est envoyé, rien n\'est enregistré : un rechargement de la page remet la démonstration à zéro.',
          'Tous les calculs partent d\'une date de référence fixe, jamais de l\'horloge de l\'ordinateur.'
        ])
      ]),
      h('div', { class: 'grille-deux' }, [
        h('div', { class: 'card' }, [h('h2', { text: 'Limites' }), liste(K.LIMITES)]),
        h('div', { class: 'card' }, [
          h('h2', { text: 'Ce que la version réelle suppose' }),
          liste(K.SUPPOSE),
          h('p', { class: 'small', text: 'Cette démonstration n\'indique ni prix, ni date de mise à disposition, ni résultat attendu : ces points se discutent après un échange sur un cas réel de l\'agence.' })
        ])
      ]),
      h('div', { class: 'card' }, [h('h2', { text: 'Glossaire' }), A.glossaire()]),
      h('div', { class: 'card secondaire' }, [h('h2', { text: 'Raccourcis clavier' }), h('div', { class: 'table-wrap' }, [A.tableauRaccourcis()])]),
      h('div', { class: 'toolbar' }, [
        U.bouton('Lancer la visite guidée', { primaire: true, icone: 'oeil', fk: 'lancer-visite', onclick: function () { FI.ui.visite.ouvrir(); } }),
        h('a', { href: '#essai', class: 'btn' }, [U.icon('crayon'), h('span', { text: 'Essayer avec un e-mail fictif' })])
      ])
    ]));
  }

  FI.views.comment = { render: render, titre: 'Comment ça marche' };
})(typeof self !== 'undefined' ? self : this);
