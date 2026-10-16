/* Flow Inbox : écran C, brouillon de réponse. Généré par règles ; modifiable ; JAMAIS envoyé : la personne copie le texte dans sa messagerie.
 * Aucun bouton d'envoi n'existe dans cet écran. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var S = FI.ui.store;
  var C = FI.ui.composants;
  var Dates = FI.core.dates;
  var Ctx = FI.core.contexte;
  var Br = FI.core.brouillon;

  function render(c, id) {
    var e = S.email(id);
    U.clear(c);
    if (!e) {
      c.appendChild(h('section', null, [
        h('h1', { id: 'titre-vue', tabindex: '-1', text: 'Message introuvable' }),
        h('a', { href: '#boite', class: 'btn btn-primary', text: 'Retour à la boîte de réception' })
      ]));
      return;
    }

    var b = S.brouillon(id);
    var g = b.gen;
    var retour = h('a', { href: '#message/' + e.id, class: 'btn btn-petit', 'data-fk': 'retour-fiche' }, [U.icon('fleche-gauche'), h('span', { text: 'Fiche de la demande' })]);

    if (!g.applicable) {
      c.appendChild(h('section', { class: 'vue-brouillon', 'aria-labelledby': 'titre-vue' }, [
        h('p', null, [retour]),
        h('h1', { id: 'titre-vue', tabindex: '-1', text: 'Brouillon de réponse' }),
        C.mentionBrouillon(),
        h('div', { class: 'card' }, [h('p', { text: g.motif })])
      ]));
      return;
    }

    var statut = h('p', { class: 'statut-action', role: 'status', 'aria-live': 'polite', id: 'etat-brouillon' });

    var zone = h('textarea', {
      id: 'texte-brouillon', class: 'champ zone-brouillon', rows: '20', spellcheck: 'true', lang: 'fr', 'data-fk': 'texte-brouillon',
      oninput: function () { S.setTexteBrouillon(e.id, zone.value); majEtat(); }
    });
    zone.value = b.texte;

    var etatMod = h('span', { class: 'badge-etat', id: 'badge-modif' });
    function majEtat() {
      var courant = S.brouillon(id);
      avisModif.hidden = !courant.modifie;
      btnRetablir.disabled = !courant.modifie;
      etatMod.textContent = courant.modifie ? 'Modifié par une personne' : 'Texte préparé par les règles';
      etatMod.className = 'badge-etat' + (courant.modifie ? ' modifie' : '');
    }

    var caseQ = h('input', { type: 'checkbox', id: 'q-service', 'data-fk': 'q-service', onchange: function () {
      S.setQuestionsService(e.id, this.checked);
    } });
    caseQ.checked = b.questionsService;

    var svc = Ctx.service(S.ctx, e.releves.service.valeur);
    var nbQ = svc ? svc.questions.length : 0;

    var dejaRepondu = !!e.traitement.premiere_reponse;
    var resp = Ctx.personne(S.ctx, g.responsable);

    var avis = dejaRepondu
      ? h('p', { class: 'notice' }, ['Cette demande a déjà reçu une réponse le ' + Dates.fmtDateHeure(e.traitement.premiere_reponse) + ' (' + Ctx.nomPersonne(S.ctx, e.traitement.responsable) + '). Ce brouillon montre ce que l\'outil aurait préparé : il n\'est pas à envoyer.'])
      : null;
    var avisModif = h('p', { class: 'notice', id: 'avis-modif', hidden: !b.modifie, text: 'Vous avez modifié ce texte. Il est conservé tant que vous restez dans cette session ; « Rétablir le texte préparé » reprend le texte des règles avec les réglages actuels.' });
    var btnRetablir = U.bouton('Rétablir le texte préparé', { discret: true, fk: 'retablir-texte', desactive: !b.modifie, onclick: function () {
      S.retablirBrouillon(e.id); U.annoncer('Texte préparé rétabli.');
    } });

    var questions = g.questions.length
      ? h('ol', { class: 'liste-questions' }, g.questions.map(function (q) {
        return h('li', null, [h('strong', { text: q.pourquoi + ' : ' }), q.texte]);
      }))
      : h('p', { class: 'small', text: g.horsPerimetre ? 'Demande hors périmètre : aucune question, le brouillon l\'indique clairement.' : 'Aucune information ne manque : le brouillon propose seulement un échange.' });

    var gauche = h('div', { class: 'card brouillon-carte' }, [
      h('dl', { class: 'entetes' }, [
        h('dt', { text: 'À' }), h('dd', { text: g.destinataire.nom + ' <' + g.destinataire.adresse + '>' }),
        h('dt', { text: 'Objet' }), h('dd', { text: g.objet }),
        h('dt', { text: 'Signé par' }), h('dd', { text: resp ? resp.nom + ' (' + resp.role + ')' : 'Équipe' }),
        h('dt', { text: 'État' }), h('dd', null, [etatMod, b.relu ? h('span', { class: 'badge-etat relu', text: 'Relu par une personne' }) : null])
      ]),
      avis, avisModif,
      h('label', { for: 'texte-brouillon', class: 'label-zone', text: 'Texte du brouillon (modifiable)' }),
      zone,
      h('div', { class: 'toolbar' }, [
        U.bouton('Copier le texte', { icone: 'copier', fk: 'copier', onclick: function () {
          Promise.resolve(U.copier(zone.value, zone)).then(function (ok) {
            statut.textContent = ok ? 'Texte copié. Collez-le dans votre messagerie : rien n\'a été envoyé.' : 'La copie automatique n\'est pas disponible ici : sélectionnez le texte et copiez-le (Ctrl+C).';
            U.annoncer(statut.textContent);
          });
        } }),
        btnRetablir
      ]),
      h('div', { class: 'case-option' }, [
        caseQ,
        h('label', { for: 'q-service', text: 'Ajouter les ' + (nbQ || 3) + ' questions types du service (catalogue)' })
      ]),
      h('h3', { class: 'titre-actions', text: 'Actions simulées (état en mémoire)' }),
      FI.views.fiche.actionsStatut(e, { avecRelu: true, relu: b.relu }),
      statut
    ]);

    var droite = h('aside', { class: 'card pourquoi', 'aria-labelledby': 'titre-pourquoi' }, [
      h('h2', { id: 'titre-pourquoi', text: 'Pourquoi ces questions' }),
      h('p', { class: 'small', text: 'Une question est ajoutée pour chaque information absente ou à vérifier. Une information relevée n\'est pas redemandée.' }),
      questions,
      h('h3', { text: 'Ce que le brouillon utilise' }),
      h('ul', { class: 'liste-simple' }, [
        h('li', { text: 'Ton : ' + (Br.TONS[S.ctx.agence.ton] || Br.TONS.chaleureux).libelle + ' (réglable dans les paramètres)' }),
        h('li', { text: 'Signature de l\'agence, au nom de ' + (resp ? resp.nom : 'l\'équipe') }),
        h('li', { text: 'Catalogue de services et questions types' }),
        h('li', { text: 'Uniquement ce qui est écrit dans le message : aucun prix, délai ni résultat n\'est promis' })
      ])
    ]);

    c.appendChild(h('section', { class: 'vue-brouillon', 'aria-labelledby': 'titre-vue' }, [
      h('p', null, [retour]),
      h('h1', { id: 'titre-vue', tabindex: '-1', text: 'Brouillon de réponse' }),
      h('p', { class: 'lead', text: 'Réponse au message « ' + e.objet + ' » reçu le ' + Dates.fmtDateHeure(e.date) + '.' }),
      C.mentionBrouillon(),
      h('div', { class: 'grille-brouillon' }, [gauche, droite])
    ]));
    majEtat();
  }

  FI.views.brouillon = { render: render, titre: 'Brouillon de réponse' };
})(typeof self !== 'undefined' ? self : this);
