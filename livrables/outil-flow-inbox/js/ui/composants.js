/* Flow Inbox : composants communs (pastilles de catégorie et de statut, état d'un champ, barre d'actions simulées).
 * Une pastille porte toujours un texte et un symbole : la couleur n'est jamais seule à informer. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var Data = root.FlowData;
  var Dem = FI.core.demandes;

  var GLYPHES_CATEGORIE = {
    nouvelle_demande: '●', client_existant: '◆', relance_prospect: '▲', fournisseur: '■',
    candidature: '◐', demarchage: '◇', hors_perimetre: '✕', indesirable: '○'
  };

  var ICONES_STATUT = {
    a_traiter: 'horloge', en_revue: 'oeil', brouillon_pret: 'crayon', repondu: 'check', en_attente_prospect: 'pause',
    devis_envoye: 'document', gagne: 'check-cercle', perdu: 'croix', classe_sans_suite: 'ban', doublon: 'copier'
  };

  var ETATS_CHAMP = {
    releve: { icone: 'check-cercle', texte: 'Relevé' },
    absent: { icone: 'ban', texte: 'Absent' },
    a_verifier: { icone: 'alerte', texte: 'À vérifier' }
  };

  function pastilleCategorie(cat) {
    return h('span', { class: 'cat cat-' + cat }, [h('span', { class: 'cat-glyphe', 'aria-hidden': 'true', text: GLYPHES_CATEGORIE[cat] || '●' }), Data.categories[cat] || cat]);
  }

  function pastilleStatut(statut) {
    return h('span', { class: 'pill pill-' + statut }, [U.icon(ICONES_STATUT[statut] || 'info'), h('span', { text: Data.statutsTraitement[statut] || statut })]);
  }

  function pastilleChamp(statut) {
    var e = ETATS_CHAMP[statut] || ETATS_CHAMP.absent;
    return h('span', { class: 'etat etat-' + statut }, [U.icon(e.icone), h('span', { text: e.texte })]);
  }

  /** « Sans réponse » : retard sur le délai convenu, avec le nombre de jours ouvrés. */
  function pastilleRetard(jours) {
    return h('span', { class: 'retard' }, [U.icon('alerte'), h('span', { text: 'Sans réponse : ' + FI.core.dates.fmtJoursOuvres(jours) })]);
  }

  function ancienneteTexte(e, ref, jours) {
    var n = Dem.anciennete(e, ref, jours);
    if (FI.core.dates.memeJour(e.date, ref)) return 'Aujourd\'hui';
    return FI.core.dates.fmtJoursOuvres(n);
  }

  /** Mention permanente des écrans de brouillon et de relance. */
  function mentionBrouillon() {
    return h('p', { class: 'mention-brouillon', role: 'note' }, [U.icon('info'), h('span', { text: FI.core.brouillon.MENTION })]);
  }

  /** En-tête de colonne triable : bouton dans un <th aria-sort>. cle = identifiant de tri ; etat = { tri, sens }. */
  function thTri(libelle, cle, etat, surTri, opts) {
    opts = opts || {};
    var actif = etat.tri === cle;
    var fleche = actif ? (etat.sens === 'asc' ? ' ▲' : ' ▼') : '';
    var th = h('th', { scope: 'col', class: opts.classe, 'aria-sort': actif ? (etat.sens === 'asc' ? 'ascending' : 'descending') : 'none' });
    th.appendChild(h('button', {
      type: 'button', class: 'tri', 'data-fk': 'tri-' + cle,
      onclick: function () { surTri(cle); },
      title: 'Trier par ' + libelle.toLowerCase()
    }, [h('span', { text: libelle }), h('span', { class: 'tri-fleche', 'aria-hidden': 'true', text: fleche })]));
    return th;
  }

  FI.ui.composants = {
    thTri: thTri,
    pastilleCategorie: pastilleCategorie, pastilleStatut: pastilleStatut, pastilleChamp: pastilleChamp,
    pastilleRetard: pastilleRetard, ancienneteTexte: ancienneteTexte, mentionBrouillon: mentionBrouillon,
    ICONES_STATUT: ICONES_STATUT
  };
})(typeof self !== 'undefined' ? self : this);
