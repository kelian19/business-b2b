/* Flow Inbox : écran B, fiche d'une demande (e-mail complet, passages surlignés, six champs relevés, raisons de revue, traitement). */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var S = FI.ui.store;
  var C = FI.ui.composants;
  var Dem = FI.core.demandes;
  var Dates = FI.core.dates;
  var Fmt = FI.core.format;
  var Ctx = FI.core.contexte;
  var Data = root.FlowData;

  function personnes(l) { return l.map(function (p) { return p.nom + ' <' + p.adresse + '>'; }).join(', '); }

  /** Valeur relevée d'un champ, en lignes de texte (aucune valeur pour un champ absent). */
  function valeurLignes(champ, r) {
    var v = r.valeur;
    if (r.statut === 'absent') return [];
    switch (champ) {
      case 'besoin': return [v];
      case 'service': return [Ctx.libelleService(S.ctx, v)];
      case 'budget':
        if (!v) return ['Montant non lisible : à confirmer avec la personne.'];
        return [Fmt.budgetMontant(v), 'Type conservé : ' + Fmt.budgetType(v).toLowerCase() + ' · budget déclaré, non garanti'];
      case 'delai':
        if (!v) return ['Délai non lisible : à confirmer.'];
        return v.precision === 'precise' && v.date
          ? [v.texte, 'Date précise : ' + Dates.fmtDate(v.date)]
          : [v.texte, 'Délai vague : aucune date n\'est déduite'];
      case 'entreprise': return [v];
      case 'contact':
        if (!v) return [];
        return [v.nom + (v.fonction ? ', ' + v.fonction : ''), v.email + (v.telephone ? ' · ' + v.telephone : '')];
    }
    return [];
  }

  /** Barre d'actions simulées sur le statut (utilisée aussi par l'écran de brouillon). */
  function actionsStatut(e, opts) {
    opts = opts || {};
    var peut = S.peutChangerStatut(e.id);
    var raison = peut ? null : 'Cette demande a déjà reçu une réponse (ou aucune réponse n\'est attendue) : son statut n\'est pas modifiable ici.';
    var enRevue = e.traitement.statut === 'en_revue';
    var ignore = e.traitement.statut === 'classe_sans_suite';
    var barre = h('div', { class: 'toolbar actions-statut', role: 'group', 'aria-label': 'Actions simulées sur la demande' }, [
      opts.avecRelu ? U.bouton(opts.relu ? 'Brouillon relu' : 'Marquer comme relu', {
        primaire: !opts.relu, icone: 'check', fk: 'act-relu', desactive: !!opts.relu,
        onclick: function () { S.marquerRelu(e.id); U.annoncer('Brouillon marqué comme relu. Rien n\'a été envoyé.'); }
      }) : null,
      U.bouton(enRevue ? 'Déjà en revue' : 'Mettre en revue', {
        icone: 'oeil', fk: 'act-revue', desactive: !peut || enRevue, titre: raison || 'Passer la demande en revue : une personne tranche',
        onclick: function () { S.setStatut(e.id, 'en_revue'); U.annoncer('Demande mise en revue.'); }
      }),
      U.bouton(ignore ? 'Déjà ignorée' : 'Ignorer', {
        icone: 'ban', fk: 'act-ignorer', desactive: !peut || ignore, titre: raison || 'Classer sans suite : plus de réponse attendue',
        onclick: function () { S.setStatut(e.id, 'classe_sans_suite'); U.annoncer('Demande ignorée : classée sans suite.'); }
      }),
      S.aSurcharge(e.id) ? U.bouton('Rétablir l\'état d\'origine', { discret: true, fk: 'act-retablir', onclick: function () { S.retablirStatut(e.id); U.annoncer('État d\'origine rétabli.'); } }) : null
    ]);
    return h('div', null, [barre, raison ? h('p', { class: 'small', text: raison }) : null]);
  }

  function render(c, id) {
    var e = S.email(id);
    if (!e) {
      U.clear(c);
      c.appendChild(h('section', null, [
        h('h1', { id: 'titre-vue', tabindex: '-1', text: 'Message introuvable' }),
        h('p', { text: 'Aucun message ne porte l\'identifiant « ' + id + ' ».' }),
        h('a', { href: '#boite', class: 'btn btn-primary', text: 'Retour à la boîte de réception' })
      ]));
      return;
    }

    var tous = S.emails();
    var liste = S.etat.boite.liste.indexOf(e.id) >= 0 ? S.etat.boite.liste : tous.map(function (x) { return x.id; });
    var pos = liste.indexOf(e.id);
    var prec = pos > 0 ? liste[pos - 1] : null;
    var suiv = pos < liste.length - 1 ? liste[pos + 1] : null;

    var fil = Dem.fils(tous).filter(function (f) { return f.fil === e.fil; })[0].messages;
    var retard = Dem.enRetard(e, S.ref(), S.delai(), S.jours());
    var pinned = null;
    var survol = null;
    var boutons = {};

    /* ---- Surlignage et liaison passage <-> champ ---- */
    function afficher(defiler) {
      var set = survol || (pinned ? [pinned] : null);
      surl.activer(set, defiler);
      Object.keys(boutons).forEach(function (k) {
        boutons[k].classList.toggle('actif', !!set && set.indexOf(k) >= 0);
        boutons[k].setAttribute('aria-pressed', pinned === k ? 'true' : 'false');
      });
    }
    var surl = FI.ui.surlignage.construire(e, {
      survolMarque: function (champs) { survol = champs; afficher(false); },
      cliqueMarque: function (champ) { pinned = pinned === champ ? null : champ; afficher(false); }
    });

    /* ---- Six champs ---- */
    var champs = h('ul', { class: 'champs', 'aria-label': 'Les six informations relevées' });
    Data.champs.forEach(function (k) {
      var r = e.releves[k];
      var lib = Data.champsLibelles[k];
      if (r.statut === 'absent') {
        champs.appendChild(h('li', { class: 'champ champ-absent', 'data-champ': k }, [
          h('div', { class: 'champ-tete' }, [h('span', { class: 'champ-lib', text: lib }), C.pastilleChamp('absent')]),
          h('p', { class: 'champ-vide', text: 'Absent : non indiqué dans le message' })
        ]));
        return;
      }
      var lignes = valeurLignes(k, r);
      var btn = h('button', {
        type: 'button', class: 'champ-btn champ-' + r.statut, 'aria-pressed': 'false', 'data-champ': k, 'data-fk': 'champ-' + k,
        'aria-describedby': 'aide-liaison'
      }, [
        h('span', { class: 'champ-tete' }, [h('span', { class: 'champ-lib', text: lib }), C.pastilleChamp(r.statut)]),
        h('span', { class: 'champ-val' }, lignes.map(function (t, i) { return h('span', { class: i === 0 ? 'val-1' : 'val-2', text: t }); })),
        r.passage ? h('span', { class: 'champ-pass' }, [h('span', { class: 'sr-only-inline', text: 'Passage du message : ' }), '« ' + r.passage + ' »']) : null
      ]);
      btn.addEventListener('mouseenter', function () { survol = [k]; afficher(true); });
      btn.addEventListener('mouseleave', function () { survol = null; afficher(false); });
      btn.addEventListener('focus', function () { survol = [k]; afficher(true); });
      btn.addEventListener('blur', function () { survol = null; afficher(false); });
      btn.addEventListener('click', function () { pinned = pinned === k ? null : k; survol = null; afficher(true); });
      boutons[k] = btn;
      champs.appendChild(h('li', { class: 'champ', 'data-champ': k }, [btn]));
    });

    /* ---- Raisons de revue ---- */
    var revue = e.revue.length ? h('section', { class: 'bloc revue', 'aria-labelledby': 'titre-revue' }, [
      h('h3', { id: 'titre-revue' }, [U.icon('oeil'), ' Raisons de mise en revue']),
      h('ul', { class: 'liste-revue' }, e.revue.map(function (r) { return h('li', { text: Data.raisonsRevue[r] || r }); })),
      h('p', { class: 'small', text: 'L\'outil ne tranche pas : une personne confirme ou corrige ces points avant de répondre.' })
    ]) : h('p', { class: 'small', text: 'Aucune raison de mise en revue pour ce message.' });

    /* ---- Traitement ---- */
    var t = e.traitement;
    var selResp = h('select', { id: 'resp-fiche', class: 'champ', onchange: function () { S.setResponsable(e.id, this.value || null); } },
      [h('option', { value: '', text: 'Non attribué' })].concat(S.ctx.equipe.map(function (p) { return h('option', { value: p.id, text: p.nom + ' (' + p.role + ')' }); })));
    selResp.value = t.responsable || '';
    var brouillonOk = FI.core.brouillon.SANS_BROUILLON.indexOf(e.categorie) < 0 && t.statut !== 'doublon';

    var traitement = h('section', { class: 'bloc traitement', 'aria-labelledby': 'titre-traitement' }, [
      h('h3', { id: 'titre-traitement', text: 'Traitement' }),
      h('dl', { class: 'dl-traitement' }, [
        h('dt', { text: 'Statut' }), h('dd', null, [C.pastilleStatut(t.statut), retard ? C.pastilleRetard(Dem.anciennete(e, S.ref(), S.jours())) : null]),
        h('dt', { text: 'Ancienneté' }), h('dd', { text: C.ancienneteTexte(e, S.ref(), S.jours()) }),
        h('dt', {}, [h('label', { for: 'resp-fiche', text: 'Responsable' })]), h('dd', null, [selResp]),
        h('dt', { text: 'Première réponse' }), h('dd', { text: t.premiere_reponse ? Dates.fmtDateHeure(t.premiere_reponse) : 'Aucune réponse enregistrée' }),
        t.note ? h('dt', { text: 'Note' }) : null, t.note ? h('dd', { text: t.note }) : null
      ]),
      h('div', { class: 'toolbar' }, [
        brouillonOk
          ? h('a', { href: '#brouillon/' + e.id, class: 'btn btn-primary', 'data-fk': 'voir-brouillon' }, [U.icon('crayon'), h('span', { text: 'Voir le brouillon' })])
          : h('span', { class: 'small', text: 'Aucun brouillon : aucune réponse n\'est attendue pour ce message.' })
      ]),
      actionsStatut(e, {})
    ]);

    /* ---- Entêtes et pièces jointes ---- */
    var entetes = h('dl', { class: 'entetes' }, [
      h('dt', { text: 'De' }), h('dd', { text: e.de.nom + ' <' + e.de.adresse + '>' }),
      h('dt', { text: 'À' }), h('dd', { text: personnes(e.a) }),
      e.cc.length ? h('dt', { text: 'Cc' }) : null, e.cc.length ? h('dd', { text: personnes(e.cc) }) : null,
      h('dt', { text: 'Date' }), h('dd', { text: Dates.fmtJourLong(e.date) + ' à ' + Dates.fmtHeure(e.date) + (Dates.estWeekEnd(e.date) ? ' (week-end)' : '') }),
      h('dt', { text: 'Objet' }), h('dd', { text: e.objet }),
      h('dt', { text: 'Message' }), h('dd', { class: 'mono-id', text: e.message_id }),
      e.pieces_jointes.length ? h('dt', { text: 'Pièces jointes' }) : null,
      e.pieces_jointes.length ? h('dd', null, [h('ul', { class: 'pj' }, e.pieces_jointes.map(function (p) {
        return h('li', null, [U.icon('document'), p + ' ', h('span', { class: 'non-lue', text: '· non lue par l\'outil' })]);
      }))]) : null
    ]);

    var filListe = fil.length > 1 ? h('section', { class: 'bloc fil', 'aria-labelledby': 'titre-fil' }, [
      h('h3', { id: 'titre-fil', text: 'Fil de discussion (' + fil.length + ' messages)' }),
      h('ol', { class: 'fil-liste' }, fil.map(function (m) {
        return h('li', m.id === e.id ? { 'aria-current': 'true', class: 'courant' } : null, [
          m.id === e.id ? h('span', { text: Dates.fmtCourt(m.date) + ' · ' + m.de.nom + ' · ' + m.objet + ' (message affiché)' })
            : h('a', { href: '#message/' + m.id, text: Dates.fmtCourt(m.date) + ' · ' + m.de.nom + ' · ' + m.objet })
        ]);
      }))
    ]) : null;

    var nav = h('nav', { class: 'fiche-nav', 'aria-label': 'Navigation entre les messages' }, [
      h('a', { href: '#boite', class: 'btn btn-petit', 'data-fk': 'retour-boite' }, [U.icon('fleche-gauche'), h('span', { text: 'Boîte de réception' })]),
      h('span', { class: 'fiche-pos', text: 'Message ' + (pos + 1) + ' sur ' + liste.length + ' (' + e.id + ')' }),
      prec ? h('a', { href: '#message/' + prec, class: 'btn btn-petit', 'aria-label': 'Message précédent' }, [U.icon('fleche-gauche'), h('span', { text: 'Précédent' })]) : h('span', { class: 'btn btn-petit btn-inactif', 'aria-hidden': 'true', text: 'Précédent' }),
      suiv ? h('a', { href: '#message/' + suiv, class: 'btn btn-petit', 'aria-label': 'Message suivant' }, [h('span', { text: 'Suivant' }), U.icon('fleche')]) : h('span', { class: 'btn btn-petit btn-inactif', 'aria-hidden': 'true', text: 'Suivant' })
    ]);

    var mail = h('article', { class: 'card mail', 'aria-labelledby': 'titre-mail' }, [
      h('h2', { id: 'titre-mail', text: 'Message reçu' }),
      entetes,
      h('div', { class: 'corps-wrap', role: 'region', 'aria-label': 'Texte du message, passages relevés surlignés', tabindex: '0' }, [surl.el]),
      h('p', { class: 'legende-passages' }, [
        h('mark', { class: 'passage passage-legende', text: 'Passage relevé' }), ' trait plein · ',
        h('mark', { class: 'passage passage-verif passage-legende', text: 'Passage à vérifier' }), ' pointillés. ',
        'Chaque passage porte le nom de son champ.'
      ]),
      filListe
    ]);

    var releve = h('aside', { class: 'card releve', 'aria-labelledby': 'titre-releve' }, [
      h('h2', { id: 'titre-releve', text: 'Ce que l\'outil a relevé' }),
      h('p', { class: 'small', id: 'aide-liaison' }, [
        'Survolez ou sélectionnez un champ (souris ou clavier) pour voir son passage dans le message ; un clic le garde en évidence. ',
        'Relevé par règles simples, sans modèle d\'IA : ce qui n\'est pas écrit reste « absent », rien n\'est déduit.'
      ]),
      champs, revue, traitement
    ]);

    U.clear(c);
    c.appendChild(h('section', { class: 'vue-fiche', 'aria-labelledby': 'titre-vue' }, [
      nav,
      h('div', { class: 'fiche-tete' }, [
        h('h1', { id: 'titre-vue', tabindex: '-1', text: e.objet }),
        h('div', { class: 'meta' }, [C.pastilleCategorie(e.categorie), C.pastilleStatut(t.statut), retard ? C.pastilleRetard(Dem.anciennete(e, S.ref(), S.jours())) : null])
      ]),
      h('div', { class: 'grille-fiche' }, [mail, releve])
    ]));
  }

  FI.views.fiche = { render: render, actionsStatut: actionsStatut, titre: 'Fiche d\'une demande' };
})(typeof self !== 'undefined' ? self : this);
