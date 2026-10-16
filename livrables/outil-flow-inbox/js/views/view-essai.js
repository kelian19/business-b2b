/* Flow Inbox : écran « Essayer avec un e-mail fictif ». On colle un texte fictif ; l'outil relève ce qui est écrit PAR RÈGLES SIMPLES
 * (montants en euros, dates, mots du catalogue), laisse absent ce qui ne l'est pas, passe en revue ce qui est ambigu et affiche le brouillon correspondant.
 * Rien n'est envoyé ni enregistré : le texte ne vit qu'en mémoire, le temps de la session. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var S = FI.ui.store;
  var C = FI.ui.composants;
  var E = FI.core.essai;
  var Fmt = FI.core.format;
  var Ctx = FI.core.contexte;
  var Dates = FI.core.dates;
  var Data = root.FlowData;

  function pl(n, un, plusieurs) { return n + ' ' + (n > 1 ? plusieurs : un); }

  /** Valeur relevée, en lignes de texte (aucune pour un champ absent). */
  function valeurLignes(champ, f) {
    var v = f.valeur;
    if (f.statut === 'absent') return [];
    switch (champ) {
      case 'besoin': return [v];
      case 'service':
        if (!v) return ['Plusieurs services évoqués : aucun n\'est choisi à la place de la personne'];
        return [Ctx.libelleService(S.ctx, v)];
      case 'budget':
        if (!v) return ['Montant à confirmer : aucune valeur retenue'];
        return [Fmt.budgetMontant(v), 'Type conservé : ' + Fmt.budgetType(v).toLowerCase() + ' · budget déclaré, non garanti'];
      case 'delai':
        if (!v) return ['Échéance à confirmer : aucune date retenue'];
        return v.precision === 'precise' && v.date
          ? [v.texte, 'Date précise : ' + Dates.fmtDate(v.date)]
          : [v.texte, 'Délai vague : aucune date n\'est déduite'];
      case 'entreprise': return [v];
      case 'contact': {
        var l = [];
        l.push(v.nom ? v.nom + (v.fonction ? ', ' + v.fonction : '') : 'Nom non indiqué');
        var coord = [v.email, v.telephone].filter(Boolean).join(' · ');
        if (coord) l.push(coord);
        return l;
      }
    }
    return [];
  }

  function carteChamp(k, f, boutons, hooks) {
    var lib = Data.champsLibelles[k];
    if (f.statut === 'absent') {
      return h('li', { class: 'champ champ-absent', 'data-champ': k }, [
        h('div', { class: 'champ-tete' }, [h('span', { class: 'champ-lib', text: lib }), C.pastilleChamp('absent')]),
        h('p', { class: 'champ-vide', text: 'Absent : non indiqué dans le message' })
      ]);
    }
    var lignes = valeurLignes(k, f);
    var btn = h('button', { type: 'button', class: 'champ-btn champ-' + f.statut, 'aria-pressed': 'false', 'data-champ': k, 'data-fk': 'essai-champ-' + k }, [
      h('span', { class: 'champ-tete' }, [h('span', { class: 'champ-lib', text: lib }), C.pastilleChamp(f.statut)]),
      h('span', { class: 'champ-val' }, lignes.map(function (t, i) { return h('span', { class: i === 0 ? 'val-1' : 'val-2', text: t }); })),
      f.passage ? h('span', { class: 'champ-pass' }, [h('span', { class: 'sr-only-inline', text: 'Passage du texte : ' }), '« ' + f.passage + ' »']) : null,
      f.explication ? h('span', { class: 'champ-expl', text: f.explication }) : null,
      f.candidats && f.candidats.length > 1 ? h('span', { class: 'champ-expl', text: 'Passages trouvés : ' + f.candidats.map(function (x) { return '« ' + x + ' »'; }).join(', ') }) : null
    ]);
    btn.addEventListener('mouseenter', function () { hooks.survol([k]); });
    btn.addEventListener('mouseleave', function () { hooks.survol(null); });
    btn.addEventListener('focus', function () { hooks.survol([k]); });
    btn.addEventListener('blur', function () { hooks.survol(null); });
    btn.addEventListener('click', function () { hooks.epingle(k); });
    boutons[k] = btn;
    return h('li', { class: 'champ', 'data-champ': k }, [btn]);
  }

  function render(c) {
    var etat = S.etat.essai;
    var ref = S.ref();

    var zoneRes = h('div', { class: 'essai-resultats', 'aria-live': 'polite' });
    var zoneTexte = h('div', { class: 'essai-surligne' });
    var zoneBrouillon = h('div', { class: 'essai-brouillon' });
    var zoneAlertes = h('div', { class: 'essai-alertes' });
    var compteur = h('p', { class: 'small essai-compteur', 'aria-live': 'off' });
    var timer = null;

    var zone = h('textarea', {
      id: 'essai-texte', class: 'champ zone-essai', rows: '14', lang: 'fr', spellcheck: 'false', 'data-fk': 'essai-texte', autocomplete: 'off',
      placeholder: 'Collez ici un e-mail fictif, ou insérez un des trois exemples ci-dessus.',
      'aria-describedby': 'essai-avert',
      oninput: function () { etat.texte = zone.value; etat.exemple = null; planifier(); }
    });
    zone.value = etat.texte;

    function planifier() {
      clearTimeout(timer);
      timer = setTimeout(maj, 120);
    }

    function maj() {
      var rel = E.relever(etat.texte, S.ctx, ref);
      var longueur = etat.texte.length;
      compteur.textContent = longueur + ' caractère' + (longueur > 1 ? 's' : '') + ' sur ' + E.LONGUEUR_MAX + ' au maximum.' + (rel.tropLong ? ' Le texte est tronqué à la limite.' : '');
      U.clear(zoneAlertes);
      if (rel.alertes.length) {
        zoneAlertes.appendChild(h('p', { class: 'alert', role: 'alert' }, [U.icon('alerte'), ' Ce texte semble contenir des coordonnées réelles (' + rel.alertes.slice(0, 3).join(', ') + '). Collez uniquement du texte fictif : remplacez-les par des adresses en .example.']));
      }
      U.clear(zoneRes); U.clear(zoneTexte); U.clear(zoneBrouillon);

      if (rel.vide) {
        zoneRes.appendChild(h('div', { class: 'etat-vide etat-vide-grand' }, [
          U.icon('crayon'),
          h('p', { class: 'etat-vide-t', text: 'Rien à relever pour l\'instant' }),
          h('p', { text: 'Collez un e-mail fictif dans la zone de gauche, ou insérez un exemple. Le relevé s\'affiche ici au fur et à mesure.' })
        ]));
        zoneTexte.appendChild(h('p', { class: 'small', text: 'Le texte avec les passages relevés surlignés apparaîtra ici.' }));
        zoneBrouillon.appendChild(h('p', { class: 'small', text: 'Le brouillon correspondant apparaîtra ici. Il n\'est jamais envoyé.' }));
        return;
      }

      var email = E.versEmail(rel, S.ctx, ref);
      var survol = null, epingle = null, boutons = {};
      var surl;
      function afficher(defiler) {
        var set = survol || (epingle ? [epingle] : null);
        surl.activer(set, defiler);
        Object.keys(boutons).forEach(function (k) {
          boutons[k].classList.toggle('actif', !!set && set.indexOf(k) >= 0);
          boutons[k].setAttribute('aria-pressed', epingle === k ? 'true' : 'false');
        });
      }
      surl = FI.ui.surlignage.construire(email, {
        survolMarque: function (ch) { survol = ch; afficher(false); },
        cliqueMarque: function (ch) { epingle = epingle === ch ? null : ch; afficher(false); }
      });
      var hooks = {
        survol: function (ch) { survol = ch; afficher(!!ch); },
        epingle: function (k) { epingle = epingle === k ? null : k; survol = null; afficher(true); }
      };

      var liste = h('ul', { class: 'champs', 'aria-label': 'Les six informations relevées' });
      E.CHAMPS.forEach(function (k) { liste.appendChild(carteChamp(k, rel.champs[k], boutons, hooks)); });

      zoneRes.appendChild(h('p', { class: 'essai-bilan', role: 'status' }, [
        h('strong', { text: pl(rel.nbReleves, 'information relevée', 'informations relevées') }),
        ' · ' + pl(rel.nbAbsents, 'absente', 'absentes') + ' · ' + rel.nbAVerifier + ' à vérifier'
      ]));
      zoneRes.appendChild(liste);
      if (rel.revue.length) {
        zoneRes.appendChild(h('section', { class: 'bloc revue', 'aria-labelledby': 'essai-revue' }, [
          h('h3', { id: 'essai-revue' }, [U.icon('oeil'), ' Raisons de mise en revue']),
          h('ul', { class: 'liste-revue' }, rel.revue.map(function (r) { return h('li', { text: Data.raisonsRevue[r] || r }); })),
          h('p', { class: 'small', text: 'L\'outil ne tranche pas : une personne confirme ou corrige ces points avant de répondre.' })
        ]));
      } else {
        zoneRes.appendChild(h('p', { class: 'small', text: 'Aucune raison de mise en revue pour ce texte.' }));
      }

      zoneTexte.appendChild(h('div', { class: 'corps-wrap', role: 'region', 'aria-label': 'Texte collé, passages relevés surlignés', tabindex: '0' }, [surl.el]));
      zoneTexte.appendChild(h('p', { class: 'legende-passages' }, [
        h('mark', { class: 'passage passage-legende', text: 'Passage relevé' }), ' trait plein · ',
        h('mark', { class: 'passage passage-verif passage-legende', text: 'Passage à vérifier' }), ' pointillés.'
      ]));

      var b = E.brouillon(rel, S.ctx, ref).brouillon;
      if (!b.applicable) {
        zoneBrouillon.appendChild(h('p', { text: b.motif }));
      } else {
        var statut = h('p', { class: 'statut-action', role: 'status', 'aria-live': 'polite' });
        var zb = h('textarea', { id: 'essai-brouillon', class: 'champ zone-brouillon', rows: '16', lang: 'fr', spellcheck: 'true', 'data-fk': 'essai-brouillon' });
        zb.value = b.texte;
        zoneBrouillon.appendChild(h('div', null, [
          C.mentionBrouillon(),
          h('label', { for: 'essai-brouillon', class: 'label-zone', text: 'Brouillon préparé (modifiable, recalculé quand le texte change)' }),
          zb,
          h('div', { class: 'toolbar' }, [
            U.bouton('Copier le texte', { icone: 'copier', fk: 'essai-copier', onclick: function () {
              Promise.resolve(U.copier(zb.value, zb)).then(function (ok) {
                statut.textContent = ok ? 'Texte copié : rien n\'a été envoyé.' : 'La copie automatique n\'est pas disponible ici : sélectionnez le texte et copiez-le (Ctrl+C).';
              });
            } })
          ]),
          statut,
          b.questions.length
            ? h('div', null, [h('h3', { text: 'Pourquoi ces questions' }), h('ol', { class: 'liste-questions' }, b.questions.map(function (q) { return h('li', null, [h('strong', { text: q.pourquoi + ' : ' }), q.texte]); }))])
            : h('p', { class: 'small', text: b.horsPerimetre ? 'Demande hors périmètre : le brouillon l\'indique clairement.' : 'Aucune information ne manque : le brouillon propose seulement un échange.' })
        ]));
      }
    }

    var exemples = h('div', { class: 'essai-exemples', role: 'group', 'aria-label': 'Exemples fictifs à insérer' }, E.EXEMPLES.map(function (x) {
      return h('button', { type: 'button', class: 'exemple', 'data-fk': 'exemple-' + x.id, onclick: function () {
        etat.texte = x.texte; etat.exemple = x.id;
        zone.value = x.texte;
        maj();
        U.annoncer('Exemple « ' + x.titre + ' » inséré. Le relevé est affiché.');
      } }, [
        h('span', { class: 'exemple-t', text: x.titre }),
        h('span', { class: 'exemple-r', text: x.resume })
      ]);
    }));

    var effacer = U.bouton('Effacer le texte', { discret: true, icone: 'croix', fk: 'essai-effacer', onclick: function () {
      etat.texte = ''; etat.exemple = null; zone.value = ''; maj(); zone.focus();
    } });

    U.clear(c);
    c.appendChild(h('section', { class: 'vue-essai', 'aria-labelledby': 'titre-vue' }, [
      h('h1', { id: 'titre-vue', tabindex: '-1', text: 'Essayer avec un e-mail fictif' }),
      h('p', { class: 'lead', text: 'Collez un e-mail fictif : l\'outil relève ce qui est écrit, laisse absent ce qui ne l\'est pas, passe en revue ce qui est ambigu et prépare le brouillon correspondant.' }),
      h('p', { id: 'essai-avert', class: 'avertissement-essai', role: 'note' }, [U.icon('alerte'), h('strong', { text: E.AVERTISSEMENT })]),
      h('p', { class: 'methode-essai', role: 'note' }, [U.icon('info'), h('span', { text: E.MENTION_REGLES + ' Les e-mails fournis avec la démonstration ont, eux, un relevé préparé à l\'avance.' })]),
      h('h2', { class: 'titre-petit', text: 'Trois exemples fictifs' }),
      exemples,
      h('div', { class: 'grille-essai' }, [
        h('div', { class: 'card' }, [
          h('label', { for: 'essai-texte', class: 'label-zone', text: 'E-mail fictif à relever' }),
          zone, compteur, zoneAlertes,
          h('div', { class: 'toolbar' }, [effacer]),
          h('h2', { class: 'titre-petit', text: 'Passages relevés dans le texte' }),
          zoneTexte
        ]),
        h('div', { class: 'card releve' }, [h('h2', { text: 'Ce que l\'outil a relevé' }), zoneRes])
      ]),
      h('div', { class: 'card' }, [h('h2', { text: 'Brouillon correspondant' }), zoneBrouillon])
    ]));
    maj();
  }

  FI.views.essai = { render: render, titre: 'Essayer avec un e-mail fictif' };
})(typeof self !== 'undefined' ? self : this);
