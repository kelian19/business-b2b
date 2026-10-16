/* Flow Inbox : écran E, relances. Demandes sans réponse au-delà du délai convenu, puis demandes à surveiller (encore dans le délai).
 * Le texte de relance est préparé à relire : il n'est jamais envoyé. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var S = FI.ui.store;
  var C = FI.ui.composants;
  var Dates = FI.core.dates;
  var Ctx = FI.core.contexte;

  function carte(item, retard) {
    var e = item.cible;
    var rel = S.relanceTexte(item);
    var idTexte = 'relance-' + item.fil;
    var statutMsg = h('p', { class: 'statut-action', role: 'status', 'aria-live': 'polite' });
    var zone = h('textarea', { id: idTexte, class: 'champ zone-brouillon', rows: '12', lang: 'fr', spellcheck: 'true', oninput: function () { S.setRelanceTexte(item.fil, zone.value); } });
    zone.value = rel.texte;
    var plusieurs = item.sansReponse.length > 1;

    return h('article', { class: 'carte-relance' + (retard ? ' en-retard' : ''), 'aria-labelledby': 'rel-t-' + item.fil }, [
      h('div', { class: 'carte-tete' }, [
        h('h3', { id: 'rel-t-' + item.fil }, [h('a', { href: '#message/' + e.id, 'data-fk': 'rel-' + item.fil, text: item.entreprise }), ' · ' + e.objet]),
        retard ? C.pastilleRetard(item.anciennete) : h('span', { class: 'surveiller', text: 'À surveiller : ' + Dates.fmtJoursOuvres(item.anciennete) + ' sur ' + Dates.pluriel(S.delai(), 'jour ouvré', 'jours ouvrés') + ' convenus' })
      ]),
      h('dl', { class: 'dl-carte' }, [
        h('dt', { text: 'Reçu le' }), h('dd', { text: Dates.fmtCourt(e.date) + (plusieurs ? ' (' + item.sansReponse.length + ' messages sans réponse dans ce fil)' : '') }),
        h('dt', { text: 'Ancienneté' }), h('dd', { text: Dates.fmtJoursOuvres(item.anciennete) + (retard ? ' · ' + Dates.fmtJoursOuvres(item.retard) + ' au-delà du délai' : '') }),
        h('dt', { text: retard ? 'En retard depuis le' : 'En retard à partir du' }), h('dd', { text: Dates.fmtDate(item.dateRetard) }),
        h('dt', { text: 'Statut' }), h('dd', null, [C.pastilleStatut(item.statut)]),
        h('dt', { text: 'Responsable' }), h('dd', { text: Ctx.nomPersonne(S.ctx, item.responsable) })
      ]),
      h('div', { class: 'toolbar' }, [
        h('a', { href: '#message/' + e.id, class: 'btn btn-petit' }, [U.icon('document'), h('span', { text: 'Voir la fiche' })])
      ]),
      h('details', { class: 'relance-texte' }, [
        h('summary', { text: 'Texte de relance préparé, à relire' }),
        h('p', { class: 'mention-brouillon', role: 'note' }, [U.icon('info'), h('span', { text: 'Texte préparé pour être relu : jamais envoyé automatiquement. Copiez-le dans votre messagerie.' })]),
        h('label', { for: idTexte, class: 'label-zone', text: 'Texte de relance (modifiable)' }),
        zone,
        h('div', { class: 'toolbar' }, [
          U.bouton('Copier le texte', { icone: 'copier', onclick: function () {
            Promise.resolve(U.copier(zone.value, zone)).then(function (ok) {
              statutMsg.textContent = ok ? 'Texte copié : rien n\'a été envoyé.' : 'Copie automatique indisponible : sélectionnez le texte et copiez-le (Ctrl+C).';
            });
          } }),
          U.bouton('Rétablir le texte préparé', { discret: true, desactive: !rel.modifie, onclick: function () { S.retablirRelance(item.fil); } })
        ]),
        statutMsg
      ])
    ]);
  }

  function render(c) {
    var r = S.relances();
    var delai = S.delai();
    var selDelai = h('select', { id: 'delai-relances', class: 'champ', onchange: function () { S.setDelai(this.value); U.annoncer('Délai de relance : ' + Dates.pluriel(S.delai(), 'jour ouvré', 'jours ouvrés') + '.'); } },
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return h('option', { value: String(n), text: Dates.pluriel(n, 'jour ouvré', 'jours ouvrés') }); }));
    selDelai.value = String(delai);

    var nbMsg = r.enRetard.reduce(function (a, i) { return a + i.sansReponse.length; }, 0);

    U.clear(c);
    c.appendChild(h('section', { class: 'vue-relances', 'aria-labelledby': 'titre-vue' }, [
      h('h1', { id: 'titre-vue', tabindex: '-1', text: 'Relances' }),
      h('p', { class: 'lead', text: 'Demandes pour lesquelles l\'agence n\'a pas encore répondu. Un brouillon préparé ou relu, mais non envoyé, ne compte pas comme une réponse.' }),
      h('div', { class: 'toolbar' }, [
        h('div', { class: 'champ-groupe' }, [h('label', { for: 'delai-relances', text: 'Délai convenu avant relance' }), selDelai]),
        h('p', { class: 'resume-relances', role: 'status', 'aria-live': 'polite' }, [
          h('strong', { id: 'nb-retard', text: String(r.enRetard.length) }),
          ' ' + (r.enRetard.length > 1 ? 'demandes sans réponse' : 'demande sans réponse') + ' au-delà de ' + Dates.pluriel(delai, 'jour ouvré', 'jours ouvrés') +
          ' (' + Dates.pluriel(nbMsg, 'message', 'messages') + ') · ' + r.aSurveiller.length + ' à surveiller dans le délai.'
        ])
      ]),
      S.etat.ctx.parametres.delai_relance_jours_ouvres !== 2 ? h('p', { class: 'notice', text: 'Le délai a été modifié pour cette session (2 jours ouvrés par défaut). Il se rétablit dans les paramètres.' }) : null,
      h('section', { 'aria-labelledby': 'titre-retard', class: 'groupe-relances' }, [
        h('h2', { id: 'titre-retard' }, [U.icon('alerte'), ' Sans réponse au-delà du délai (' + r.enRetard.length + ')']),
        r.enRetard.length ? h('div', { class: 'liste-cartes' }, r.enRetard.map(function (i) { return carte(i, true); })) : h('p', { class: 'small', text: 'Aucune demande n\'a dépassé le délai convenu.' })
      ]),
      h('section', { 'aria-labelledby': 'titre-surveiller', class: 'groupe-relances' }, [
        h('h2', { id: 'titre-surveiller' }, [U.icon('horloge'), ' À surveiller, encore dans le délai (' + r.aSurveiller.length + ')']),
        r.aSurveiller.length ? h('div', { class: 'liste-cartes' }, r.aSurveiller.map(function (i) { return carte(i, false); })) : h('p', { class: 'small', text: 'Aucune demande récente en attente de réponse.' })
      ]),
      h('p', { class: 'note', text: 'Les jours ouvrés vont du lundi au vendredi ; aucun jour férié n\'est géré sur la période de la démonstration. L\'ancienneté est calculée à la date de référence fixe, jamais à l\'horloge de l\'ordinateur.' })
    ]));
  }

  FI.views.relances = { render: render, titre: 'Relances' };
})(typeof self !== 'undefined' ? self : this);
