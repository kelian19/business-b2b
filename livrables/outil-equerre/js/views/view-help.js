/* Équerre : module K, aide. Écran « Aide » (#aide : glossaire, lecture des chiffres, raccourcis), dialogue d'aide natif avec la table des
 * raccourcis et la case « Activer les raccourcis clavier » (WCAG 2.1.4), visite guidée d'accueil en 4 étapes (sautable).
 * Seuls les faits réglementaires retenus figurent ici ; aucune promesse de gain ni de conformité. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var A = E.ui.aide;
  var Dlg = E.ui.dialog;
  var Prefs = E.ui.prefs;
  var L = root.EquerreLogic;
  var K = L.CONST;
  var BAREME = L.expositionAmende(1);

  var ETAPES_VISITE = [
    { titre: 'Un parcours en 5 étapes', texte: 'Le tableau de bord résume la situation en un coup d\'œil. Les étapes 2 à 4 donnent le détail : fichier tiers, mentions des factures, trésorerie et reporting. L\'étape 5 produit le rapport à remettre.' },
    { titre: 'Démonstration ou dossier client', texte: 'Le bandeau rouge indique le mode. En démonstration, toutes les données sont fictives. Pour un client, créez un dossier (bouton Dossier) puis importez ses fichiers CSV : ils restent dans ce navigateur et rien n\'est envoyé.' },
    { titre: 'Des estimations, jamais des promesses', texte: 'L\'indice de préparation, les efforts et l\'exposition sont des estimations dont les hypothèses sont affichées. L\'outil ne promet aucun gain ni aucune conformité et ne constitue pas un conseil fiscal.' },
    { titre: 'Raccourcis et mode présentation', texte: 'Touches 1 à 5 pour changer d\'étape, F pour le mode présentation, P pour le rapport, ? pour l\'aide, Échap pour fermer. Vous pouvez désactiver les raccourcis dans l\'aide.' }
  ];

  function caseRaccourcis(id) {
    var c = h('input', { type: 'checkbox', id: id });
    c.checked = !!Prefs.get('raccourcis');
    c.addEventListener('change', function () {
      Prefs.set('raccourcis', c.checked);
      U.annoncer(c.checked ? 'Raccourcis clavier activés.' : 'Raccourcis clavier désactivés.');
      Array.prototype.forEach.call(document.querySelectorAll('input[data-raccourcis]'), function (autre) { autre.checked = c.checked; });
    });
    c.setAttribute('data-raccourcis', '1');
    return h('label', { class: 'case', for: id }, [c, h('span', { text: 'Activer les raccourcis clavier' })]);
  }

  /* ---------- Dialogue d'aide ---------- */

  function ouvrirDialogue() {
    var corps = h('div', null, [
      A.tableRaccourcis(),
      caseRaccourcis('opt-raccourcis'),
      h('p', { class: 'small', text: 'Les raccourcis ne s\'activent jamais pendant la saisie dans un champ, ni avec Ctrl, Alt ou Méta.' }),
      h('p', { class: 'small', text: 'Rien n\'est envoyé : tout reste dans votre navigateur.' })
    ]);
    return Dlg.ouvrir({
      titre: 'Aide : raccourcis clavier',
      corps: corps,
      boutons: [
        { id: 'visite', libelle: 'Visite guidée' },
        { id: 'glossaire', libelle: 'Glossaire' },
        { id: 'ok', libelle: 'Fermer', primaire: true }
      ],
      annulerId: 'ok', retourFocus: U.$('btn-aide'), large: true
    }).then(function (choix) {
      if (choix === 'glossaire') root.location.hash = '#aide';
      else if (choix === 'visite') visiteGuidee(U.$('btn-aide'));
      return choix;
    });
  }

  /* ---------- Visite guidée (4 étapes, sautable) ---------- */

  function visiteGuidee(ouvreur) {
    return new Promise(function (resolve) {
      var i = 0;
      var etat = h('p', { class: 'small', role: 'status' });
      var titre = h('h2', { id: 'visite-t' });
      var texte = h('p', { class: 'visite-texte' });
      var corps = h('div', { class: 'dlg-corps' }, [etat, texte]);
      var dlg = h('dialog', { class: 'dlg', 'aria-labelledby': 'visite-t' });
      var passer = h('button', { type: 'button', class: 'btn', onclick: function () { fermer(); } }, [h('span', { text: 'Passer la visite' })]);
      var prec = h('button', { type: 'button', class: 'btn', onclick: function () { i = Math.max(0, i - 1); maj(); } }, [h('span', { text: 'Précédent' })]);
      var suiv = h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { if (i >= ETAPES_VISITE.length - 1) fermer(); else { i++; maj(); } } }, [h('span', { text: 'Suivant' })]);
      var pied = h('div', { class: 'dlg-pied' }, [passer, prec, suiv]);
      dlg.appendChild(titre);
      dlg.appendChild(corps);
      dlg.appendChild(pied);
      var fini = false;

      function maj() {
        var e = ETAPES_VISITE[i];
        titre.textContent = e.titre;
        texte.textContent = e.texte;
        etat.textContent = 'Visite guidée : étape ' + (i + 1) + ' sur ' + ETAPES_VISITE.length;
        prec.disabled = i === 0;
        suiv.firstChild.textContent = i === ETAPES_VISITE.length - 1 ? 'Terminer' : 'Suivant';
      }
      function fermer() {
        if (typeof dlg.close === 'function') { try { dlg.close(); } catch (e) { fin(); } } else fin();
      }
      function fin() {
        if (fini) return;
        fini = true;
        Prefs.set('accueilVu', true);
        if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
        var rendre = function () { if (ouvreur && document.contains(ouvreur) && ouvreur.focus) U.focus(ouvreur); };
        rendre();
        setTimeout(rendre, 0);
        // Les contrôles qui proposent la visite disparaissent une fois la visite vue.
        Array.prototype.forEach.call(document.querySelectorAll('[data-visite]'), function (b) { if (b.getAttribute('data-visite') === 'invitation') b.hidden = true; });
        resolve();
      }
      dlg.addEventListener('close', fin);
      maj();
      document.body.appendChild(dlg);
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      suiv.focus();
    });
  }

  /** Bouton d'invitation à la visite guidée (affiché tant que la visite n'a pas été vue ou passée). */
  function boutonVisite() {
    var b = h('button', { type: 'button', class: 'btn btn-petit secondary', 'data-visite': 'invitation', id: 'btn-visite' }, [U.icon('aide'), h('span', { text: 'Visite guidée (4 étapes)' })]);
    b.addEventListener('click', function () { visiteGuidee(b); });
    if (Prefs.get('accueilVu')) b.hidden = true;
    return b;
  }

  /* ---------- Écran « Aide » ---------- */

  function render(container) {
    U.clear(container);
    container.appendChild(h('div', { class: 'panel-top' }, [
      h('div', null, [
        h('h2', { id: 'aide-titre', tabindex: '-1', text: 'Aide et glossaire' }),
        h('p', { class: 'lead', text: 'Comprendre les mots et les chiffres de l\'outil. Rien n\'est envoyé : tout reste dans votre navigateur.' })
      ]),
      h('a', { class: 'btn', href: '#tableau-de-bord' }, [h('span', { text: 'Retour au parcours' }), U.icon('fleche')])
    ]));

    container.appendChild(h('section', { class: 'card', 'aria-labelledby': 'aide-debut-t' }, [
      h('h3', { id: 'aide-debut-t', text: 'Pour commencer' }),
      h('p', { text: 'L\'outil suit un parcours en 5 étapes : tableau de bord, fichier tiers, mentions, trésorerie et reporting, rapport. La démonstration utilise des données fictives ; pour un client, créez un dossier puis importez ses fichiers CSV.' }),
      h('div', { class: 'toolbar' }, [
        U.bouton('Visite guidée (4 étapes)', { icone: 'aide', id: 'btn-visite-aide', onclick: function () { visiteGuidee(U.$('btn-visite-aide')); } }),
        U.bouton('Afficher les raccourcis', { icone: 'clavier', onclick: function () { ouvrirDialogue(); } })
      ])
    ]));

    container.appendChild(h('section', { class: 'card', 'aria-labelledby': 'glossaire-t' }, [
      h('h3', { id: 'glossaire-t', text: 'Glossaire' }),
      h('dl', { class: 'glossaire' }, A.GLOSSAIRE.map(function (g) {
        return h('div', { class: 'glossaire-item', id: 'gl-' + g.id }, [h('dt', { text: g.terme }), h('dd', { text: g.definition })]);
      })),
      U.mentionConseil()
    ]));

    container.appendChild(h('section', { class: 'card', 'aria-labelledby': 'aide-lire-t' }, [
      h('h3', { id: 'aide-lire-t', text: 'Lire les chiffres avec prudence' }),
      h('ul', { class: 'liste-simple liste-aide' }, [
        h('li', { text: 'L\'indice de préparation est une estimation : sa pondération (' + [K.POIDS_INDICE.fichier, K.POIDS_INDICE.modeles, K.POIDS_INDICE.organisation].map(function (x) { return Math.round(x * 100) + U.NBSP + '%'; }).join(', ') + ') est une hypothèse de l\'outil, pas une norme.' }),
        h('li', { text: 'Les efforts du plan d\'action sont des estimations à confirmer sur votre fichier.' }),
        h('li', { text: 'L\'exposition théorique est un plafond calculé (nombre de factures × ' + U.fmtEur(BAREME.unitaire) + ', au plus ' + U.fmtEur(BAREME.plafond) + ' par année civile), pas une prévision.' }),
        h('li', { text: 'L\'outil web ne vérifie pas l\'existence des entreprises au registre : un SIREN « valide » a 9 chiffres et une clé correcte.' }),
        h('li', { text: 'Les statuts, responsables et échéances du plan ne changent jamais l\'indice.' })
      ])
    ]));

    container.appendChild(h('section', { class: 'card', 'aria-labelledby': 'aide-raccourcis-t' }, [
      h('h3', { id: 'aide-raccourcis-t', text: 'Raccourcis clavier' }),
      A.tableRaccourcis(),
      caseRaccourcis('opt-raccourcis-ecran'),
      h('p', { class: 'small', text: 'Les raccourcis ne s\'activent jamais pendant la saisie dans un champ, ni avec Ctrl, Alt ou Méta.' })
    ]));

    container.appendChild(h('section', { class: 'card', 'aria-labelledby': 'aide-donnees-t' }, [
      h('h3', { id: 'aide-donnees-t', text: 'Vos données' }),
      h('p', { text: 'Les fichiers sont lus dans votre navigateur et jamais envoyés. Un dossier n\'existe que dans la page ouverte, jusqu\'à ce que vous l\'enregistriez (fichier .equerre.json que vous conservez vous-même). « Effacer toutes les données de cette session » vide la mémoire de l\'outil ; les fichiers téléchargés restent sur votre disque.' })
    ]));
  }

  E.views.help = { render: render, ouvrirDialogue: ouvrirDialogue, visiteGuidee: visiteGuidee, boutonVisite: boutonVisite };
})(typeof self !== 'undefined' ? self : this);
