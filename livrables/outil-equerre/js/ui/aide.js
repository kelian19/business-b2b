/* Équerre : contenus d'aide (aide contextuelle, glossaire, raccourcis) et bouton « ? » à panneau non modal.
 * Seuls les faits réglementaires retenus figurent ici : réception obligatoire à compter du 1er septembre 2026, émission obligatoire pour les
 * PME, TPE et micro-entreprises le 1er septembre 2027, 4 nouvelles mentions entre entreprises assujetties à compter du 1er septembre 2026,
 * amende par facture plafonnée par année civile (article 1737 du CGI ; montants dans constants.js). Aucune promesse de gain ni de conformité. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var L = root.EquerreLogic;
  var compteur = 0;

  // Les montants et poids viennent de CONST : aucune règle chiffrée n'est écrite dans l'interface.
  var K = L.CONST;
  var BAREME = L.expositionAmende(1);
  var UNITAIRE = U.fmtEur(BAREME.unitaire);
  var PLAFOND = U.fmtEur(BAREME.plafond);
  function pct(x) { return Math.round(x * 100) + U.NBSP + '%'; }

  var RACCOURCIS = [
    { touche: '1 à 5', action: 'Aller à l\'étape correspondante' },
    { touche: '← →', action: 'Étape précédente ou suivante (le focus est sur la page ou sur les étapes)' },
    { touche: 'F', action: 'Mode présentation (plein écran)' },
    { touche: 'P', action: 'Ouvrir le rapport, puis Entrée pour imprimer' },
    { touche: '?', action: 'Afficher cette aide' },
    { touche: 'Échap', action: 'Fermer l\'aide, un panneau ou une info-bulle, ou quitter le mode présentation' }
  ];

  var AIDE_CTX = {
    indice: {
      titre: 'Indice de préparation',
      texte: 'L\'indice résume trois choses : l\'état du fichier tiers (40 % du total), les mentions présentes sur vos modèles de factures (30 %) et vos réponses d\'organisation (30 %). Ces poids sont une convention de l\'outil (hypothèse). C\'est une estimation, pas une note officielle.'
    },
    exposition: {
      titre: 'Exposition théorique',
      texte: 'Montant théorique : nombre de factures émises sur 12 mois (du premier jour du mois situé 12 mois avant la date de référence jusqu\'à cette date) × ' + UNITAIRE + ', plafonné à ' + PLAFOND + ' par année civile (article 1737 du CGI), si les factures restent non électroniques alors que l\'émission électronique est obligatoire. C\'est une estimation, pas une prévision ; ne constitue pas un conseil fiscal.'
    },
    plan: {
      titre: 'Plan d\'action',
      texte: 'Le plan est généré à partir de vos données et de vos réponses. Les efforts sont des estimations à confirmer sur votre fichier. Responsable, statut et échéance sont libres et restent dans votre navigateur ; ils ne changent pas l\'indice.'
    },
    import: {
      titre: 'Importer un fichier',
      texte: 'Glissez un fichier CSV (export de votre logiciel ou de votre tableur : Enregistrer sous, puis CSV). L\'outil détecte le séparateur et l\'encodage, montre les colonnes reconnues, puis vous validez. Rien n\'est envoyé : le fichier reste dans votre navigateur.'
    },
    corrections: {
      titre: 'Corrections proposées',
      texte: 'Chaque correction est calculée à partir de la ligne ou signalée « à vérifier ». Rien n\'est modifié sans votre décision : acceptez, refusez ou modifiez. L\'outil n\'invente jamais de SIREN.'
    }
  };

  var GLOSSAIRE = [
    { id: 'siren', terme: 'SIREN', definition: 'Numéro de 9 chiffres qui identifie une entreprise. Le SIREN du client fait partie des 4 nouvelles mentions obligatoires sur les factures entre entreprises assujetties à compter du 1er septembre 2026. Dans cet outil, un SIREN « valide » a 9 chiffres et une clé de contrôle correcte ; cela ne prouve pas que l\'entreprise existe au registre.' },
    { id: 'siret', terme: 'SIRET', definition: 'Numéro de 14 chiffres : le SIREN de l\'entreprise suivi de 5 chiffres propres à l\'établissement. L\'outil contrôle son format, sa clé et sa cohérence avec le SIREN de la ligne.' },
    { id: 'tva', terme: 'TVA intracommunautaire', definition: 'Numéro de TVA d\'une entreprise française : « FR », une clé de 2 chiffres, puis le SIREN. L\'outil recalcule la clé à partir du SIREN et signale une clé incohérente.' },
    { id: 'plateforme', terme: 'Plateforme agréée', definition: 'Terme utilisé dans l\'outil pour la plateforme que l\'entreprise choisit afin d\'émettre et de recevoir ses factures sous forme électronique. L\'outil n\'en nomme aucune, ne recommande aucun choix et ne vérifie aucune condition : renseignez-vous auprès de votre expert-comptable.' },
    { id: 'mentions', terme: 'Mentions obligatoires', definition: 'À compter du 1er septembre 2026, 4 nouvelles mentions sont obligatoires sur les factures entre entreprises assujetties : le SIREN du client, l\'adresse de livraison si elle diffère de l\'adresse de facturation, la nature de l\'opération (biens, services ou les deux) et l\'option pour le paiement de la TVA d\'après les débits. L\'outil contrôle leur présence ; la liste des mentions courantes qu\'il affiche en plus est non exhaustive et ne constitue pas un avis de conformité.' },
    { id: 'indice', terme: 'Indice de préparation', definition: 'Note sur 100 calculée par l\'outil à partir du fichier tiers, des modèles de factures et de vos réponses d\'organisation. C\'est une estimation, avec une pondération conventionnelle (hypothèse), pas une note officielle.' },
    { id: 'exposition', terme: 'Exposition théorique', definition: 'Montant maximal que représenterait l\'amende de 50 € par facture non émise sous forme électronique quand c\'est obligatoire, plafonnée à ' + PLAFOND + ' par année civile (article 1737 du CGI). C\'est une estimation de plafond, pas une prévision ; elle ne constitue pas un conseil fiscal.' },
    { id: 'partca', terme: 'Part du CA à risque', definition: 'Part du chiffre d\'affaires hors taxe des 12 derniers mois (du premier jour du mois situé 12 mois avant la date de référence jusqu\'à cette date, le premier mois étant pris en entier) facturée à des clients dont la fiche (SIREN manquant ou invalide) bloquerait une facture électronique. Le chiffre d\'affaires ne concerne que les clients.' }
  ];

  /** Bouton « ? » et panneau d'aide non modal. Renvoie { btn, panneau } : l'appelant place le bouton à côté du titre et le panneau juste après. */
  function bouton(cle) {
    var a = AIDE_CTX[cle];
    var id = 'aide-ctx-' + cle + '-' + (++compteur);
    var panneau = h('div', { id: id, class: 'aide-panneau', role: 'region', 'aria-label': 'Aide : ' + a.titre, hidden: true }, [
      h('p', { class: 'aide-panneau-t', text: a.titre }),
      h('p', { text: a.texte })
    ]);
    var btn = h('button', { type: 'button', class: 'aide-btn', 'aria-expanded': 'false', 'aria-controls': id, 'aria-label': 'Aide : ' + a.titre, 'data-aide': cle }, [h('span', { 'aria-hidden': 'true', text: '?' })]);
    function basculer(ouvert) {
      panneau.hidden = !ouvert;
      btn.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { basculer(panneau.hidden); });
    function echap(e) {
      if (e.key === 'Escape' && !panneau.hidden) { e.stopPropagation(); basculer(false); U.focus(btn); }
    }
    btn.addEventListener('keydown', echap);
    panneau.addEventListener('keydown', echap);
    return { btn: btn, panneau: panneau };
  }

  /** Table des raccourcis (accessible : en-têtes de colonnes et de lignes). */
  function tableRaccourcis() {
    return h('table', { class: 'table table-raccourcis' }, [
      h('caption', { class: 'visually-hidden', text: 'Raccourcis clavier' }),
      h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Touche' }), h('th', { scope: 'col', text: 'Action' })])]),
      h('tbody', null, RACCOURCIS.map(function (r) {
        return h('tr', null, [h('th', { scope: 'row' }, [h('kbd', { text: r.touche })]), h('td', { text: r.action })]);
      }))
    ]);
  }

  E.ui.aide = { RACCOURCIS: RACCOURCIS, AIDE_CTX: AIDE_CTX, GLOSSAIRE: GLOSSAIRE, bouton: bouton, tableRaccourcis: tableRaccourcis };
})(typeof self !== 'undefined' ? self : this);
