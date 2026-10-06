/* Équerre : questionnaire d'organisation (module E). Quatre questions (oui, non, ne sait pas) et des dates cibles internes,
 * choisies par le client : ce ne sont pas des dates réglementaires. Les réponses sont enregistrées dans dossier.organisation. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var S = E.ui.store;
  var RG = E.ui.radiogroup;

  var QUESTIONS = [
    { cle: 'plateforme', texte: 'Une plateforme agréée est-elle choisie ?', court: 'Choix de la plateforme' },
    { cle: 'responsable', texte: 'Un responsable est-il désigné ?', court: 'Désignation du responsable' },
    { cle: 'logiciel', texte: 'Votre logiciel de facturation peut-il émettre au format électronique ?', court: 'Logiciel de facturation prêt' },
    { cle: 'procedure', texte: 'Existe-t-il une procédure de mise à jour du fichier tiers ?', court: 'Procédure de mise à jour du fichier tiers' }
  ];
  var OPTIONS = [{ valeur: 'oui', libelle: 'Oui' }, { valeur: 'non', libelle: 'Non' }, { valeur: 'nsp', libelle: 'Ne sait pas' }];
  var CIBLE_LIBELLE = 'Cible interne, choisie par vous';

  /** Crée le questionnaire. Renvoie { el }. Le composant se reconstruit avec la vue qui le monte ; les changements passent par Store.commit. */
  function creer(opts) {
    opts = opts || {};
    var d = S.dossier();
    var org = d.organisation;
    var uid = 'org';
    var erreur = h('p', { class: 'alert', role: 'alert', hidden: true });

    function montrerErreur(m) { U.showMsg(erreur, m); }

    var blocs = QUESTIONS.map(function (q) {
      var labelId = uid + '-q-' + q.cle;
      var rg = RG.creer({
        id: uid + '-' + q.cle, labelId: labelId, options: OPTIONS, valeur: org[q.cle],
        onChange: function (v) { montrerErreur(''); S.commit('repondreOrganisation', { cle: q.cle, valeur: v }); }
      });
      return h('div', { class: 'org-q' }, [h('p', { class: 'org-texte', id: labelId, text: q.texte }), rg.el]);
    });

    function champDate(cle, libelle) {
      var champId = uid + '-cible-' + cle;
      var champ = h('input', { type: 'date', class: 'champ champ-date', id: champId, 'data-fk': champId, value: org.cibles[cle] || '' });
      champ.addEventListener('change', function () {
        var r = S.commit('cibleOrganisation', { cle: cle, iso: champ.value || null });
        if (r.refuse) { montrerErreur(r.message); champ.value = S.dossier().organisation.cibles[cle] || ''; } else montrerErreur('');
      });
      return h('div', { class: 'org-date' }, [
        h('label', { for: champId, class: 'small' }, [libelle + ' : ' + CIBLE_LIBELLE]),
        champ
      ]);
    }
    var dates = h('details', { class: 'org-dates' }, [
      h('summary', { text: 'Dates cibles internes (facultatif)' }),
      h('p', { class: 'small', text: 'Ces dates sont vos repères, choisis par vous : ce ne sont pas des dates réglementaires.' }),
      h('div', { class: 'org-dates-grille' }, QUESTIONS.map(function (q) { return champDate(q.cle, q.court); }).concat([champDate('test', 'Test avant la bascule')]))
    ]);
    if (S.state.ui.orgDatesOuvert) dates.open = true;
    dates.addEventListener('toggle', function () { S.setUi({ orgDatesOuvert: dates.open }); });

    var el = h('div', { class: 'org-form' }, [
      h('p', { class: 'small', text: d.mode === 'demo'
        ? 'Réponses modifiables : en mémoire seulement, rien n\'est envoyé.'
        : 'Vos réponses sont enregistrées dans le dossier (fichier .json que vous téléchargez) ; rien n\'est envoyé.' }),
      erreur,
      h('div', { class: 'org-liste' }, blocs),
      dates,
      h('div', { class: 'toolbar' }, [
        U.bouton(opts.libelleReinit || 'Réinitialiser', { icone: 'historique', classe: 'btn-petit', id: 'btn-reinit-scenario', onclick: function () { S.commit('reinitialiserOrganisation'); } })
      ])
    ]);
    return { el: el };
  }

  E.ui.organisationForm = { creer: creer, QUESTIONS: QUESTIONS };
})(typeof self !== 'undefined' ? self : this);
