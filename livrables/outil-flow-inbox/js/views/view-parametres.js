/* Flow Inbox : écran G, paramètres (délai de relance, ton, signature, responsables, catalogue de services et questions types).
 * Les modifications restent en mémoire pour la session ; les brouillons non modifiés et les relances se mettent à jour. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var S = FI.ui.store;
  var Dates = FI.core.dates;
  var Br = FI.core.brouillon;
  var Ctx = FI.core.contexte;

  function render(c) {
    var ctx = S.ctx;
    var apercuSignature = h('pre', { class: 'apercu-signature', id: 'apercu-signature' });
    function majApercu() {
      apercuSignature.textContent = Br.signature(S.ctx, S.ctx.parametres.responsable_par_defaut);
    }

    var selDelai = h('select', { id: 'p-delai', class: 'champ', onchange: function () { S.setDelai(this.value); } },
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return h('option', { value: String(n), text: Dates.pluriel(n, 'jour ouvré', 'jours ouvrés') }); }));
    selDelai.value = String(ctx.parametres.delai_relance_jours_ouvres);

    var selTon = h('select', { id: 'p-ton', class: 'champ', onchange: function () { S.setTon(this.value); } },
      Object.keys(Br.TONS).map(function (k) { return h('option', { value: k, text: Br.TONS[k].libelle }); }));
    selTon.value = ctx.agence.ton;

    var selResp = h('select', { id: 'p-resp', class: 'champ', onchange: function () { S.setResponsableDefaut(this.value); } },
      ctx.equipe.map(function (p) { return h('option', { value: p.id, text: p.nom }); }));
    selResp.value = ctx.parametres.responsable_par_defaut;

    var signature = h('textarea', { id: 'p-signature', class: 'champ', rows: '8', 'data-fk': 'p-signature', oninput: function () { S.setSignature(signature.value); majApercu(); } });
    signature.value = ctx.agence.signature;

    var equipe = h('div', { class: 'table-wrap' }, [h('table', { class: 'table petit-tableau' }, [
      h('caption', { class: 'visually-hidden', text: 'Équipe qui traite les demandes' }),
      h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Nom' }), h('th', { scope: 'col', text: 'Rôle (utilisé dans la signature)' })])]),
      h('tbody', null, ctx.equipe.map(function (p) {
        return h('tr', null, [
          h('td', null, [h('label', { for: 'eq-nom-' + p.id, class: 'visually-hidden', text: 'Nom de ' + p.nom }), h('input', { id: 'eq-nom-' + p.id, class: 'champ', value: p.nom, oninput: function () { S.setPersonne(p.id, 'nom', this.value); majApercu(); } })]),
          h('td', null, [h('label', { for: 'eq-role-' + p.id, class: 'visually-hidden', text: 'Rôle de ' + p.nom }), h('input', { id: 'eq-role-' + p.id, class: 'champ', value: p.role, oninput: function () { S.setPersonne(p.id, 'role', this.value); majApercu(); } })])
        ]);
      }))
    ])]);

    var catalogue = ctx.services.map(function (s) {
      return h('details', { class: 'service-detail' }, [
        h('summary', null, [h('strong', { text: s.libelle }), h('span', { class: 'sous', text: ' · ' + s.description })]),
        h('div', { class: 'service-corps' }, s.questions.map(function (q, i) {
          var id = 'q-' + s.id + '-' + i;
          return h('div', { class: 'champ-groupe' }, [
            h('label', { for: id, text: 'Question type ' + (i + 1) }),
            h('textarea', { id: id, class: 'champ', rows: '2', oninput: function () { S.setQuestionService(s.id, i, this.value); } }, null)
          ]);
        }))
      ]);
    });
    // Valeurs posées après création (textContent des zones).
    catalogue.forEach(function (d, k) {
      var zones = d.querySelectorAll('textarea');
      for (var i = 0; i < zones.length; i++) zones[i].value = ctx.services[k].questions[i];
    });

    var confirmation = h('p', { class: 'statut-action', role: 'status', 'aria-live': 'polite' });
    var armee = false;
    var btnReinit = U.bouton('Réinitialiser la démonstration', { fk: 'reinit', onclick: function () {
      if (!armee) {
        armee = true;
        confirmation.textContent = 'Cela remet à zéro les statuts, les brouillons modifiés et tous les réglages. Cliquez de nouveau pour confirmer.';
        return;
      }
      S.reinitialiser();
      U.annoncer('Démonstration réinitialisée.');
    } });

    U.clear(c);
    c.appendChild(h('section', { class: 'vue-parametres', 'aria-labelledby': 'titre-vue' }, [
      h('h1', { id: 'titre-vue', tabindex: '-1', text: 'Paramètres' }),
      h('p', { class: 'lead', text: 'Réglages de l\'agence fictive. Les modifications restent dans ce navigateur le temps de la session (rien n\'est enregistré) ; les brouillons non modifiés et les relances se mettent à jour.' }),
      h('div', { class: 'grille-params' }, [
        h('section', { class: 'card', 'aria-labelledby': 'p-t1' }, [
          h('h2', { id: 'p-t1', text: 'Relances' }),
          h('div', { class: 'champ-groupe' }, [h('label', { for: 'p-delai', text: 'Délai convenu avant relance' }), selDelai,
            h('p', { class: 'small', text: 'Du lundi au vendredi. Une demande dépasse le délai quand le nombre de jours ouvrés écoulés est strictement supérieur. Défaut : 2 jours ouvrés.' })])
        ]),
        h('section', { class: 'card', 'aria-labelledby': 'p-t2' }, [
          h('h2', { id: 'p-t2', text: 'Ton des réponses' }),
          h('div', { class: 'champ-groupe' }, [h('label', { for: 'p-ton', text: 'Ton' }), selTon,
            h('p', { class: 'small', text: ctx.agence.description_ton + ' Les brouillons vouvoient toujours et ne promettent ni prix, ni délai, ni résultat.' })])
        ]),
        h('section', { class: 'card', 'aria-labelledby': 'p-t3' }, [
          h('h2', { id: 'p-t3', text: 'Signature' }),
          h('div', { class: 'champ-groupe' }, [h('label', { for: 'p-signature', text: 'Modèle de signature' }), signature,
            h('p', { class: 'small', text: 'Utilisez {prenom}, {nom} et {role} : ils sont remplacés par la personne qui signe.' })]),
          h('div', { class: 'champ-groupe' }, [h('label', { for: 'p-resp', text: 'Responsable par défaut (signature des demandes non attribuées)' }), selResp]),
          h('p', { class: 'label', text: 'Aperçu' }), apercuSignature
        ]),
        h('section', { class: 'card', 'aria-labelledby': 'p-t4' }, [h('h2', { id: 'p-t4', text: 'Responsables' }), equipe]),
        h('section', { class: 'card pleine', 'aria-labelledby': 'p-t5' }, [
          h('h2', { id: 'p-t5', text: 'Catalogue de services et questions types' }),
          h('p', { class: 'small', text: 'Neuf services, sans tarif : l\'outil n\'invente aucun prix. Les questions types sont utilisées dans le brouillon quand le besoin est absent ou à vérifier, ou sur option.' })
        ].concat(catalogue)),
        h('section', { class: 'card pleine', 'aria-labelledby': 'p-t6' }, [
          h('h2', { id: 'p-t6', text: 'Rétablir' }),
          h('div', { class: 'toolbar' }, [
            U.bouton('Rétablir les réglages d\'origine', { fk: 'retablir-reglages', onclick: function () { S.retablirReglages(); U.annoncer('Réglages d\'origine rétablis.'); } }),
            btnReinit
          ]),
          confirmation
        ])
      ])
    ]));
    majApercu();
  }

  FI.views.parametres = { render: render, titre: 'Paramètres' };
})(typeof self !== 'undefined' ? self : this);
