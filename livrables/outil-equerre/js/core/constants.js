/* Équerre : constantes métier (source unique). Aucune règle de calcul n'est écrite ailleurs.
 *
 * Faits réglementaires retenus (les seuls) :
 * - réception des factures électroniques obligatoire pour toutes les entreprises depuis le 1er septembre 2026 ;
 * - émission obligatoire pour les PME, TPE et micro-entreprises le 1er septembre 2027 ;
 * - 4 nouvelles mentions entre entreprises assujetties depuis le 1er septembre 2026 ;
 * - amende de 50 € par facture non électronique quand c'est obligatoire, plafonnée à 15 000 € par année civile
 *   (article 1737 du CGI, loi de finances pour 2026).
 * Tout le reste (poids de l'indice, coefficients, efforts, seuil de concentration) est une HYPOTHÈSE DE TRAVAIL
 * affichée comme telle dans l'interface. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Equerre.core.constants = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function gel(o) {
    Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object') gel(o[k]); });
    return Object.freeze(o);
  }

  return gel({
    APP_VERSION: '1.0',
    SCHEMA_VERSION: 1,

    // Faits vérifiés
    DATE_RECEPTION: '2026-09-01',
    DATE_EMISSION: '2027-09-01',
    AMENDE_UNITAIRE: 50,
    AMENDE_PLAFOND: 15000,

    // Hypothèses de travail (affichées comme telles)
    POIDS_INDICE: { fichier: 0.4, modeles: 0.3, organisation: 0.3 },
    CODES_BLOQUANTS: ['siren_manquant', 'siren_invalide'],
    CODES_A_CORRIGER: ['siret_incoherent', 'tva_incoherente', 'doublon', 'adresse_incomplete'],
    SEUIL_CONCENTRATION: 0.6,
    COEF_IMPACT: { bloquant: 1, aCorriger: 0.5 },
    // Efforts par unité, en minutes (estimation à confirmer sur le fichier réel)
    EFFORTS: {
      siren: 15, mentions: 60, tva: 5, doublon: 10, adresse: 10, siret: 10,
      plateforme: 120, responsable: 30, logiciel: 60, procedure: 60, test: 120
    },

    MAX_FACTURES_HYPOTHESE: 100000,
    ROLES_PROPOSES: ['Direction financière', 'Comptabilité', 'Expert-comptable', 'Informatique', 'À désigner'],
    MAX_RESPONSABLE: 60,
    MAX_LIGNES_COMPARAISON: 200,
    MAX_ANNEXE_ANOMALIES: 200,
    MAX_DOSSIERS_CABINET: 30,
    MAX_OCTETS_CABINET: 150 * 1024 * 1024,

    // Limites d'import et de dossier
    MAX_FICHIER_OCTETS: 25 * 1024 * 1024,
    MAX_DOSSIER_OCTETS: 60 * 1024 * 1024,
    MAX_LIGNES_TABLE: 500000,
    MAX_COLONNES: 200,
    MAX_CELLULE: 10000,
    MAX_IGNOREES_RAPPORT: 200,
    MAX_VERSIONS: 20,
    MAX_JOURNAL: 5000,
    MAX_GROUPE_DOUBLONS: 50,
    MAX_MODELES: 5,
    MAX_NOM_MODELE: 60,
    MAX_PREUVE: 200,
    MAX_NOTE_MENTION: 300,
    MAX_FACTURES_LISTEES: 200,
    MAX_NOM: 80,
    MAX_SECTEUR: 60,
    MAX_LIBELLE_VERSION: 60,
    MAX_NOTE: 200,
    MAX_LOGO_CHARS: 270000,         // data:image/png;base64 d'environ 200 Ko
    LOGO_MAX_PX: 256,
    LOGO_MAX_OCTETS: 200 * 1024,

    // Performances
    TRANCHE_CARACTERES: 256 * 1024,
    BUDGET_TRANCHE_MS: 12,
    TRANCHE_LIGNES: 2000,
    LIGNES_PAR_PAGE: 100,
    APERCU_LIGNES: 5,

    TAILLES: ['20-49', '50-99', '100-249', 'autre'],
    TAILLES_LIBELLES: { '20-49': '20 à 49 salariés', '50-99': '50 à 99 salariés', '100-249': '100 à 249 salariés', autre: 'Autre taille' }
  });
});
