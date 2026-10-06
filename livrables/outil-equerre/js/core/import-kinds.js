/* Équerre : import assisté. Registre des 4 types de fichiers, reconnaissance des colonnes (exact, synonyme, jeton,
 * choix manuel), inspection d'un CSV, messages d'erreur, évaluation par tranches et rapport d'import.
 * Tout est pur : aucune dépendance à l'interface. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./constants.js'), require('./util.js'), require('./identifiers.js'), require('./csv.js'), require('./tiers.js'), require('./invoices.js'));
  } else {
    var c = root.Equerre.core;
    c.importKinds = factory(c.constants, c.util, c.identifiers, c.csv, c.tiers, c.invoices);
  }
})(typeof self !== 'undefined' ? self : this, function (C, U, I, CSV, T, INV) {
  'use strict';

  var trim = U.trim;
  var normalizeHeader = U.normalizeHeader;

  /* ------------------------------------------------------------------ */
  /* Synonymes d'en-têtes (clés déjà normalisées par normalizeHeader)     */
  /* ------------------------------------------------------------------ */

  var COMMUNS_ADRESSE = {
    cp: 'code_postal', codepostal: 'code_postal', zip: 'code_postal', zipcode: 'code_postal', postcode: 'code_postal',
    code_postal_facturation: 'code_postal', cp_facturation: 'code_postal',
    commune: 'ville', localite: 'ville', city: 'ville', ville_facturation: 'ville',
    rue: 'adresse', adresse_1: 'adresse', adresse1: 'adresse', adresse_ligne_1: 'adresse', adresse_postale: 'adresse',
    adresse_facturation: 'adresse', voie: 'adresse',
    adresse_de_facturation: 'adresse', adresse_de_facturation_1: 'adresse', adresse_facturation_1: 'adresse', adresse_client: 'adresse',
    libelle_adresse: 'adresse', adresse_ligne1: 'adresse', adresse_ligne_1_facturation: 'adresse',
    code_postal_de_facturation: 'code_postal', cp_de_facturation: 'code_postal', code_postal_client: 'code_postal',
    ville_de_facturation: 'ville', ville_client: 'ville',
    ville_de_livraison: 'livraison_ville', adresse_de_livraison_1: 'livraison_adresse',
    country: 'pays', code_pays: 'pays',
    adresse_livraison: 'livraison_adresse', adresse_de_livraison: 'livraison_adresse', livraison_adresse_1: 'livraison_adresse',
    cp_livraison: 'livraison_code_postal', code_postal_livraison: 'livraison_code_postal', livraison_cp: 'livraison_code_postal',
    cp_liv: 'livraison_code_postal',
    ville_livraison: 'livraison_ville', livraison_commune: 'livraison_ville', ville_liv: 'livraison_ville'
  };

  function fusion(a, b) {
    var o = {};
    Object.keys(a).forEach(function (k) { o[k] = a[k]; });
    Object.keys(b).forEach(function (k) { o[k] = b[k]; });
    return o;
  }

  var TIERS_ALIASES = fusion(COMMUNS_ADRESSE, {
    raison_sociale: 'nom', denomination: 'nom', denomination_sociale: 'nom', societe: 'nom', nom_client: 'nom', nom_tiers: 'nom',
    nom_entreprise: 'nom', entreprise: 'nom', nom_societe: 'nom', nom_du_tiers: 'nom', client: 'nom', fournisseur: 'nom', tiers: 'nom',
    nom_du_client: 'nom', nom_du_fournisseur: 'nom', intitule: 'nom', libelle: 'nom', intitule_du_tiers: 'nom', libelle_tiers: 'nom',
    categorie: 'type', tiers_type: 'type', nature: 'type', type_tiers: 'type', client_fournisseur: 'type',
    n_siren: 'siren', numero_siren: 'siren', num_siren: 'siren', no_siren: 'siren', identifiant_siren: 'siren',
    n_siret: 'siret', numero_siret: 'siret', num_siret: 'siret', no_siret: 'siret',
    tva_intracommunautaire: 'tva', n_tva: 'tva', numero_tva: 'tva', tva_intra: 'tva', tva_intracom: 'tva', vat: 'tva', vat_number: 'tva',
    numero_tva_intracommunautaire: 'tva', n_tva_intracommunautaire: 'tva', numero_de_tva: 'tva', n_de_tva: 'tva'
  });

  var FACTURES_ALIASES = {
    numero_facture: 'numero', n_facture: 'numero', num: 'numero', n: 'numero', numero_de_facture: 'numero', no_facture: 'numero',
    n_piece: 'numero', numero_piece: 'numero', no_piece: 'numero', piece: 'numero',
    nom_client: 'client', intitule_client: 'client', tiers: 'client', client_nom: 'client', raison_sociale: 'client', nom_du_client: 'client',
    siren_du_client: 'siren_client', n_siren_client: 'siren_client', numero_siren_client: 'siren_client', siren: 'siren_client',
    date: 'date_emission', date_facture: 'date_emission', emission: 'date_emission', date_d_emission: 'date_emission',
    date_de_facture: 'date_emission', date_facturation: 'date_emission', date_piece: 'date_emission', date_de_piece: 'date_emission',
    echeance: 'date_echeance', date_d_echeance: 'date_echeance', date_limite_de_paiement: 'date_echeance', echeance_paiement: 'date_echeance',
    date_limite: 'date_echeance', date_limite_paiement: 'date_echeance',
    ht: 'montant_ht', total_ht: 'montant_ht', montant_hors_taxe: 'montant_ht', montant_total_ht: 'montant_ht', ca_ht: 'montant_ht',
    ttc: 'montant_ttc', total_ttc: 'montant_ttc', montant_toutes_taxes: 'montant_ttc', montant_total_ttc: 'montant_ttc',
    etat: 'statut', status: 'statut', etat_paiement: 'statut', reglement: 'statut', statut_paiement: 'statut', statut_de_paiement: 'statut',
    solde: 'solde', reste_a_payer: 'solde', reste_du: 'solde', reste_a_regler: 'solde', solde_du: 'solde', restant_du: 'solde',
    montant_restant: 'solde', solde_restant: 'solde', solde_restant_du: 'solde', reste_a_payer_ttc: 'solde', solde_ttc: 'solde', montant_restant_du: 'solde',
    siren_du_client_rapprochement_exact: 'siren_client',
    date_reglement: 'date_paiement', date_de_paiement: 'date_paiement', date_de_reglement: 'date_paiement', paye_le: 'date_paiement', payee_le: 'date_paiement', reglee_le: 'date_paiement', regle_le: 'date_paiement'
  };

  var LIGNES_ALIASES = {
    numero_facture: 'numero', n_facture: 'numero', numero_de_facture: 'numero', no_facture: 'numero', facture: 'numero', num: 'numero',
    n_piece: 'numero', numero_piece: 'numero', no_piece: 'numero', piece: 'numero',
    nom_client: 'client', tiers: 'client', raison_sociale: 'client',
    siren: 'siren_client', siren_du_client: 'siren_client', n_siren_client: 'siren_client',
    adresse_livraison: 'livraison_adresse', adresse_de_livraison: 'livraison_adresse',
    cp_livraison: 'livraison_code_postal', code_postal_livraison: 'livraison_code_postal',
    ville_livraison: 'livraison_ville',
    livraison_diff: 'livraison_differente', adresse_livraison_differente: 'livraison_differente', livraison_autre_adresse: 'livraison_differente',
    nature: 'nature_operation', type_operation: 'nature_operation', nature_de_l_operation: 'nature_operation',
    option_debits: 'option_tva_debits', tva_sur_debits: 'option_tva_debits', tva_debits: 'option_tva_debits',
    option_tva_d_apres_les_debits: 'option_tva_debits', option_pour_le_paiement_de_la_tva_d_apres_les_debits: 'option_tva_debits',
    libelle: 'designation', description: 'designation', article: 'designation', produit: 'designation',
    qte: 'quantite', quantity: 'quantite', qty: 'quantite',
    pu_ht: 'prix_unitaire_ht', pu: 'prix_unitaire_ht', prix_unitaire: 'prix_unitaire_ht', prix_ht: 'prix_unitaire_ht',
    tva: 'taux_tva', tx_tva: 'taux_tva', taux: 'taux_tva', taux_de_tva: 'taux_tva'
  };

  // Colonnes écrites par livrables/registre-cli/verif_registre.py : siren (colonne d'origine, copiée du fichier de tiers),
  // statut_verification, etat_administratif, nom_registre, adresse_registre, code_postal_registre, ville_registre,
  // date_verification (+ naf_registre, ecart_registre, ecart_detail, ignorées : l'application refait la comparaison).
  // Le fichier de sortie conserve aussi les colonnes d'origine du fichier de tiers (nom, adresse, ville, type…) : aucun
  // synonyme générique (statut, etat, adresse, ville, date, denomination) n'est donc accepté ici, il se confondrait avec elles.
  var REGISTRE_ALIASES = {
    n_siren: 'siren', numero_siren: 'siren',
    nom_registre: 'denomination_registre',
    nom_au_registre: 'denomination_registre', denomination_au_registre: 'denomination_registre',
    etat_administratif_registre: 'etat_administratif', cp_registre: 'code_postal_registre',
    date_de_verification: 'date_verification', statut_de_la_verification: 'statut_verification'
  };

  // Jetons : un en-tête qui contient tous les mots de « tous » (et aucun de « sauf ») est reconnu.
  var TIERS_JETONS = [
    { tous: ['siret'], cible: 'siret' },
    { tous: ['siren'], cible: 'siren' },
    { tous: ['tva'], sauf: ['taux', 'montant', 'liv'], cible: 'tva' },
    { tous: ['postal'], sauf: ['liv', 'livraison'], cible: 'code_postal' },
    { tous: ['ville'], sauf: ['liv', 'livraison'], cible: 'ville' }
  ];
  var FACTURES_JETONS = [
    { tous: ['siren', 'client'], cible: 'siren_client' },
    { tous: ['ttc'], cible: 'montant_ttc' },
    { tous: ['ht'], sauf: ['ttc'], cible: 'montant_ht' },
    { tous: ['echeance'], cible: 'date_echeance' },
    { tous: ['paiement', 'date'], cible: 'date_paiement' },
    { tous: ['emission'], cible: 'date_emission' }
  ];
  var LIGNES_JETONS = [
    { tous: ['livraison', 'adresse'], cible: 'livraison_adresse' },
    { tous: ['debits'], cible: 'option_tva_debits' },
    { tous: ['designation'], cible: 'designation' },
    { tous: ['quantite'], cible: 'quantite' }
  ];
  var REGISTRE_JETONS = [
    { tous: ['siren'], cible: 'siren' }
  ];

  /* ------------------------------------------------------------------ */
  /* Normalisation des enregistrements, par type de fichier              */
  /* ------------------------------------------------------------------ */

  function boolOuiNon(v) {
    var s = normalizeHeader(v);
    if (['oui', 'o', 'yes', 'y', 'vrai', 'true', '1', 'x'].indexOf(s) >= 0) return true;
    if (['non', 'n', 'no', 'faux', 'false', '0'].indexOf(s) >= 0) return false;
    return null;
  }

  function nombreOuNull(v) {
    if (trim(v) === '') return null;
    var n = INV.parseAmount(v);
    return isNaN(n) ? null : n;
  }

  /** Type d'un tiers : « client » ou « fournisseur » (c, 411, clients… ; f, 401, fournisseurs…) ; '' si vide ; null si inconnu. */
  function typeTiers(v) {
    var s = normalizeHeader(v);
    if (!s) return '';
    if (['fournisseur', 'fournisseurs', 'four', 'fourn', 'f', 'fr', '401', 'supplier', 'vendor'].indexOf(s) >= 0 || /^401/.test(s)) return 'fournisseur';
    if (['client', 'clients', 'cli', 'c', 'cl', '411', 'customer'].indexOf(s) >= 0 || /^411/.test(s)) return 'client';
    return null;
  }

  function normaliserTiers(rec, ligne, w) {
    if (!trim(rec.nom)) return { ok: false, raison: 'nom_manquant' };
    var r = { ligne: ligne };
    T.TIERS_HEADERS.forEach(function (h) { r[h] = trim(rec[h]); });
    var t = typeTiers(rec.type);
    if (t === null) { if (w) w.typesInconnus++; }
    else r.type = t;
    return { ok: true, valeur: r };
  }

  function normaliserLigne(rec, ligne) {
    if (!trim(rec.numero)) return { ok: false, raison: 'numero_manquant' };
    return {
      ok: true,
      valeur: {
        ligne: ligne,
        numero: trim(rec.numero),
        client: trim(rec.client),
        sirenClient: I.cleanId(rec.siren_client),
        livraisonAdresse: trim(rec.livraison_adresse),
        livraisonCodePostal: trim(rec.livraison_code_postal),
        livraisonVille: trim(rec.livraison_ville),
        livraisonDifferente: boolOuiNon(rec.livraison_differente),
        natureOperation: trim(rec.nature_operation),
        optionDebits: trim(rec.option_tva_debits),
        designation: trim(rec.designation),
        quantite: nombreOuNull(rec.quantite),
        prixUnitaireHT: nombreOuNull(rec.prix_unitaire_ht),
        tauxTVA: nombreOuNull(rec.taux_tva)
      }
    };
  }

  /** Statuts écrits par verif_registre.py dans la colonne statut_verification (et eux seuls) :
   *  - « ok » : le registre a répondu pour ce SIREN (état, nom, adresse sont lus) ;
   *  - « introuvable » : le registre a répondu qu'il ne connaît pas ce SIREN ;
   *  - « non_diffusible », « siren_invalide », « siren_vide », « erreur_api », « non_verifie » : rien n'a été vérifié.
   *  Classement : 'ok', 'introuvable', 'simule' (ligne d'essai, refusée à l'import : l'outil Python n'en écrit jamais, --dry-run n'écrit
   *  aucun fichier) ou 'non_verifie' (les cinq statuts ci-dessus, statut absent ou statut inconnu : jamais présenté comme vérifié). */
  var STATUTS_NON_VERIFIES = ['non_diffusible', 'siren_invalide', 'siren_vide', 'erreur_api', 'non_verifie'];
  function classerStatutRegistre(statut) {
    var s = normalizeHeader(statut);
    if (s === 'simule' || s === 'simulation' || s === 'simulee' || s === 'dry_run') return 'simule';
    if (s === 'ok') return 'ok';
    if (s === 'introuvable') return 'introuvable';
    return 'non_verifie';
  }

  function normaliserRegistre(rec, ligne, w) {
    var siren = I.cleanId(rec.siren);
    if (!siren) return { ok: false, raison: 'siren_manquant' };
    var classe = classerStatutRegistre(rec.statut_verification);
    if (classe === 'simule') return { ok: false, raison: 'simulation' };
    var verifie = classe !== 'non_verifie';
    if (!verifie && w) w.nonVerifiees++;
    return {
      ok: true,
      valeur: {
        ligne: ligne,
        siren: siren,
        statut: trim(rec.statut_verification),
        verifie: verifie,
        denomination: verifie ? trim(rec.denomination_registre) : '',
        etat: verifie ? trim(rec.etat_administratif) : '',
        adresse: verifie ? trim(rec.adresse_registre) : '',
        codePostal: verifie ? trim(rec.code_postal_registre) : '',
        ville: verifie ? trim(rec.ville_registre) : '',
        dateVerification: verifie ? U.parseDate(rec.date_verification) : null
      }
    };
  }

  var FACTURES_ENTETES = ['numero', 'client', 'date_emission', 'date_echeance', 'montant_ht', 'montant_ttc', 'statut', 'date_paiement'];
  // La date d'échéance est facultative (facture « sans échéance », non évaluable). Le statut peut être remplacé par le solde restant dû.
  var FACTURES_REQUIRED = ['client', 'date_emission', 'montant_ht', 'statut'];
  var ALTERNATIVES = { statut: ['solde'] };

  var KINDS = {
    tiers: {
      id: 'tiers',
      libelle: 'Fichier tiers (clients et fournisseurs)',
      libelleCourt: 'fichier tiers',
      entetes: T.TIERS_HEADERS,
      obligatoires: T.TIERS_REQUIRED,
      alias: TIERS_ALIASES,
      jetons: TIERS_JETONS,
      libelles: {
        type: 'Type (client ou fournisseur)', nom: 'Nom ou raison sociale', siren: 'SIREN', siret: 'SIRET', tva: 'TVA intracommunautaire',
        adresse: 'Adresse de facturation', code_postal: 'Code postal', ville: 'Ville', pays: 'Pays',
        livraison_adresse: 'Adresse de livraison', livraison_code_postal: 'Code postal de livraison', livraison_ville: 'Ville de livraison'
      },
      motifsRejet: ['ligne_vide', 'nom_manquant', 'colonnes_incoherentes'],
      modeleNom: 'modele-fichier-tiers.csv',
      contexte: function () { return { typesInconnus: 0 }; },
      normaliser: normaliserTiers
    },
    factures: {
      id: 'factures',
      libelle: 'Export des factures de vente',
      libelleCourt: 'export des factures',
      entetes: FACTURES_ENTETES.concat(['siren_client', 'solde']),
      obligatoires: FACTURES_REQUIRED,
      alternatives: ALTERNATIVES,
      alias: FACTURES_ALIASES,
      jetons: FACTURES_JETONS,
      libelles: {
        numero: 'Numéro de facture', client: 'Client', date_emission: 'Date d\'émission', date_echeance: 'Date d\'échéance (facultative)',
        montant_ht: 'Montant HT', montant_ttc: 'Montant TTC', statut: 'Statut (payée ou non), ou à défaut le solde', date_paiement: 'Date de paiement',
        siren_client: 'SIREN du client (rapprochement exact)', solde: 'Solde restant dû (0 si payée), à défaut du statut'
      },
      motifsRejet: ['ligne_vide', 'client_manquant', 'date_illisible', 'montant_illisible', 'date_serie_tableur', 'colonnes_incoherentes'],
      modeleNom: 'modele-export-factures.csv',
      contexte: function () { return INV.nouveauxAvertissements(); },
      normaliser: function (rec, ligne, w) { return INV.normaliserFacture(rec, ligne, w); }
    },
    lignes: {
      id: 'lignes',
      libelle: 'Export des lignes de factures',
      libelleCourt: 'lignes de factures',
      entetes: ['numero', 'client', 'siren_client', 'livraison_adresse', 'livraison_code_postal', 'livraison_ville', 'livraison_differente',
        'nature_operation', 'option_tva_debits', 'designation', 'quantite', 'prix_unitaire_ht', 'taux_tva'],
      obligatoires: ['numero'],
      alias: LIGNES_ALIASES,
      jetons: LIGNES_JETONS,
      libelles: {
        numero: 'Numéro de facture', client: 'Client', siren_client: 'SIREN du client', livraison_adresse: 'Adresse de livraison',
        livraison_code_postal: 'Code postal de livraison', livraison_ville: 'Ville de livraison', livraison_differente: 'Livraison à une autre adresse (oui ou non)',
        nature_operation: 'Nature de l\'opération', option_tva_debits: 'Option TVA d\'après les débits', designation: 'Désignation',
        quantite: 'Quantité', prix_unitaire_ht: 'Prix unitaire HT', taux_tva: 'Taux de TVA'
      },
      motifsRejet: ['ligne_vide', 'numero_manquant', 'colonnes_incoherentes'],
      modeleNom: 'modele-lignes-de-factures.csv',
      contexte: function () { return {}; },
      normaliser: normaliserLigne
    },
    registre: {
      id: 'registre',
      libelle: 'Fichier de vérification au registre',
      libelleCourt: 'vérification au registre',
      entetes: ['siren', 'statut_verification', 'denomination_registre', 'etat_administratif', 'adresse_registre',
        'code_postal_registre', 'ville_registre', 'date_verification'],
      obligatoires: ['siren'],
      alias: REGISTRE_ALIASES,
      jetons: REGISTRE_JETONS,
      libelles: {
        siren: 'SIREN', statut_verification: 'Statut de la vérification', denomination_registre: 'Dénomination au registre',
        etat_administratif: 'État administratif', adresse_registre: 'Adresse au registre', code_postal_registre: 'Code postal au registre',
        ville_registre: 'Ville au registre', date_verification: 'Date de vérification'
      },
      motifsRejet: ['ligne_vide', 'siren_manquant', 'simulation', 'colonnes_incoherentes'],
      modeleNom: 'modele-verification-registre.csv',
      contexte: function () { return { nonVerifiees: 0 }; },
      normaliser: normaliserRegistre
    }
  };

  var ORDRE_KINDS = ['tiers', 'factures', 'lignes', 'registre'];

  var RAISONS = {
    ligne_vide: 'Ligne vide',
    nom_manquant: 'Nom manquant',
    client_manquant: 'Client manquant',
    numero_manquant: 'Numéro de facture manquant',
    siren_manquant: 'SIREN manquant',
    simulation: 'Ligne simulée (essai de l\'outil de vérification) : ce n\'est pas une vérification au registre',
    date_illisible: 'Date d\'émission illisible',
    montant_illisible: 'Montant HT illisible',
    date_serie_tableur: 'Date enregistrée comme un nombre (format du tableur)',
    colonnes_incoherentes: 'Nombre de colonnes incohérent (guillemets ou séparateur mal placés)'
  };

  function kindDe(id) {
    var k = KINDS[id];
    if (!k) throw new Error('Type de fichier inconnu : ' + id);
    return k;
  }

  /* ------------------------------------------------------------------ */
  /* Reconnaissance des colonnes                                         */
  /* ------------------------------------------------------------------ */

  /** Libellés d'affichage normalisés → cible (« Adresse de facturation » est reconnue comme le champ qui porte ce nom). */
  function indexLibelles(kind) {
    if (!kind.indexLib) {
      var o = {};
      Object.keys(kind.libelles).forEach(function (c) { o[normalizeHeader(kind.libelles[c])] = c; });
      kind.indexLib = o;
    }
    return kind.indexLib;
  }

  function jetonCible(kind, nh) {
    var mots = nh.split('_');
    for (var i = 0; i < kind.jetons.length; i++) {
      var j = kind.jetons[i];
      var ok = j.tous.every(function (m) { return mots.indexOf(m) >= 0; });
      if (ok && j.sauf) ok = !j.sauf.some(function (m) { return mots.indexOf(m) >= 0; });
      if (ok) return j.cible;
    }
    return null;
  }

  var MOTS_BANALS = ['client', 'facture', 'date', 'numero', 'montant', 'taux', 'type', 'statut', 'nombre', 'total', 'de', 'du', 'des', 'les', 'une', 'ou', 'et', 'pour', 'avec', 'registre', 'verification', 'codes'];

  /** Colonnes ignorées dont le nom ressemble à une colonne attendue restée sans correspondance (un mot significatif en commun).
   *  Évite qu'une colonne utile soit ignorée sans que personne ne le remarque. Au plus 3 signalements. */
  function colonnesRessemblantes(kind, entetes, colonnes, cibles) {
    var out = [];
    var libres = cibles.filter(function (c) { return c.colonne < 0; });
    if (!libres.length) return out;
    function mots(texte) { return normalizeHeader(texte).split('_').filter(function (m) { return m.length >= 4 && MOTS_BANALS.indexOf(m) < 0; }); }
    for (var j = 0; j < entetes.length && out.length < 3; j++) {
      if (colonnes[j].canonique || !trim(entetes[j])) continue;
      var mj = mots(entetes[j]);
      if (!mj.length) continue;
      for (var k = 0; k < libres.length; k++) {
        var mc = mots(libres[k].canonique + ' ' + libres[k].libelle);
        if (mj.some(function (m) { return mc.indexOf(m) >= 0; })) {
          out.push({ colonne: entetes[j], cible: libres[k].canonique, libelle: libres[k].libelle });
          break;
        }
      }
    }
    return out;
  }

  /** Reconnaît les colonnes d'un fichier.
   *  overrides (facultatif) : un élément par colonne ; '' = ignorer, un nom canonique = choix manuel, undefined = automatique.
   *  Statuts : reconnue | synonyme | choisie | ignoree. Une cible n'est prise que par une colonne (conflits signalés). */
  function suggestMapping(entetes, kindId, overrides) {
    var kind = kindDe(kindId);
    var n = entetes.length;
    var nhs = entetes.map(normalizeHeader);
    var colonnes = entetes.map(function (b) { return { brut: b, canonique: null, statut: 'ignoree' }; });
    var pris = {};
    var fixe = [];
    var conflits = [];
    var j;
    if (overrides) {
      for (j = 0; j < n; j++) {
        var ov = overrides[j];
        if (ov === undefined || ov === null || ov === 'auto') continue;
        fixe[j] = true;
        if (ov === '' || kind.entetes.indexOf(ov) < 0) continue;
        if (pris[ov] !== undefined) { colonnes[pris[ov]] = { brut: entetes[pris[ov]], canonique: null, statut: 'ignoree' }; }
        pris[ov] = j;
        colonnes[j] = { brut: entetes[j], canonique: ov, statut: 'choisie' };
      }
    }
    for (var rang = 0; rang < 3; rang++) {
      for (j = 0; j < n; j++) {
        if (fixe[j] || colonnes[j].canonique) continue;
        var nh = nhs[j];
        var cible = null;
        var statut = 'reconnue';
        if (!nh) continue;
        if (rang === 0) { if (kind.entetes.indexOf(nh) >= 0) cible = nh; }
        else if (rang === 1) {
          if (Object.prototype.hasOwnProperty.call(kind.alias, nh)) { cible = kind.alias[nh]; statut = 'synonyme'; }
          else if (Object.prototype.hasOwnProperty.call(indexLibelles(kind), nh)) { cible = indexLibelles(kind)[nh]; statut = 'synonyme'; }
        }
        else { cible = jetonCible(kind, nh); statut = 'synonyme'; }
        if (!cible) continue;
        if (pris[cible] !== undefined) {
          if (rang < 2) conflits.push({ colonne: entetes[j], cible: cible, retenue: entetes[pris[cible]] });
          continue;
        }
        pris[cible] = j;
        colonnes[j] = { brut: entetes[j], canonique: cible, statut: statut, via: nh, rang: rang };
      }
    }
    var cibles = kind.entetes.map(function (c) {
      var idx = pris[c] === undefined ? -1 : pris[c];
      var obligatoire = kind.obligatoires.indexOf(c) >= 0;
      // Un champ obligatoire peut être remplacé par une autre colonne reconnue (le statut par le solde restant dû)
      if (obligatoire && kind.alternatives && kind.alternatives[c] && kind.alternatives[c].some(function (a) { return pris[a] !== undefined; })) obligatoire = false;
      return {
        canonique: c, libelle: kind.libelles[c] || c, obligatoire: obligatoire, colonne: idx,
        statut: idx >= 0 ? colonnes[idx].statut : (obligatoire ? 'obligatoire_manquante' : 'facultative_absente')
      };
    });
    var ressemblances = colonnesRessemblantes(kind, entetes, colonnes, cibles);
    return {
      colonnes: colonnes,
      ressemblances: ressemblances,
      mapping: colonnes.map(function (c) { return c.canonique; }),
      cibles: cibles,
      manquantes: cibles.filter(function (c) { return c.statut === 'obligatoire_manquante'; }).map(function (c) { return c.canonique; }),
      absentes: cibles.filter(function (c) { return c.statut === 'facultative_absente'; }).map(function (c) { return c.canonique; }),
      conflits: conflits
    };
  }

  /* ------------------------------------------------------------------ */
  /* Inspection et messages                                              */
  /* ------------------------------------------------------------------ */

  var MESSAGES = {
    vide: 'Le fichier est vide. Vérifiez que vous avez enregistré le bon fichier.',
    entete_seul: 'Le fichier contient les en-têtes mais aucune ligne de données.',
    separateur: 'Le séparateur n\'a pas été reconnu. Enregistrez le fichier en CSV avec des points-virgules ou des virgules.',
    accents: 'Les accents semblent mal encodés : le fichier est lu en Windows (ANSI). Si les noms sont encore illisibles, enregistrez-le en UTF-8.',
    binaire: 'Ce fichier n\'est pas un CSV texte. Dans votre tableur : Enregistrer sous > CSV.',
    trop_gros: 'Ce fichier est trop volumineux (25 Mo au maximum).',
    plusieurs: 'Un seul fichier est lu à la fois (le premier).',
    guillemet: 'Un guillemet ouvert à la ligne {n} n\'est jamais refermé : les lignes suivantes ont pu être lues comme un seul champ. Corrigez le fichier (guillemet isolé ou manquant) avant de continuer.',
    champ_long: 'Un champ entre guillemets commençant à la ligne {n} s\'étend sur plus de 50 lignes : vérifiez qu\'un guillemet n\'est pas resté ouvert.'
  };

  function messageColonnes(insp) {
    return 'Colonnes obligatoires introuvables : ' + insp.manquantes.join(', ') + '. Colonnes trouvées : ' +
      (insp.colonnes.map(function (c) { return c.brut; }).filter(Boolean).join(', ') || 'aucune') +
      '. Téléchargez le modèle CSV pour voir les en-têtes attendus.';
  }

  function sansExtension(nom) {
    return /\.(xlsx|xlsm|xls|ods|pdf|zip|docx|doc)$/i.test(trim(nom));
  }

  /** Inspecte un résultat d'analyse CSV (voir csv.finaliser). meta : { bom, caracteresRemplaces, suspectBinaire, encodage }. */
  function inspectParsed(parsed, kindId, meta, overrides) {
    meta = meta || {};
    var headers = parsed.headers;
    var sm = suggestMapping(headers, kindId, overrides);
    var vide = headers.length === 0;
    return {
      vide: vide,
      enteteSeul: !vide && parsed.rows.length === 0,
      bom: !!meta.bom,
      encodage: meta.encodage || '',
      separateur: parsed.separator,
      separateurIncertain: !vide && headers.length === 1,
      colonnes: sm.colonnes,
      cibles: sm.cibles,
      manquantes: sm.manquantes,
      absentes: sm.absentes,
      conflits: sm.conflits,
      ressemblances: sm.ressemblances,
      avertissementsCsv: parsed.avertissements || [],
      mapping: sm.mapping,
      apercu: parsed.rows.slice(0, C.APERCU_LIGNES),
      nbLignes: parsed.rows.length,
      suspectBinaire: !!meta.suspectBinaire,
      caracteresRemplaces: meta.caracteresRemplaces || 0
    };
  }

  /** Inspecte un texte déjà décodé. */
  function inspectCsv(text, kindId) {
    text = String(text === null || text === undefined ? '' : text);
    var binaire = text.indexOf('\u0000') >= 0 || text.slice(0, 4) === 'PK\u0003\u0004' || text.slice(0, 4) === '%PDF';
    var parsed = binaire ? { separator: ';', headers: [], rows: [], lines: [], blanks: [] } : CSV.parseCsv(text);
    return inspectParsed(parsed, kindId || 'tiers', {
      bom: text.charCodeAt(0) === 0xFEFF,
      caracteresRemplaces: CSV.compterRemplaces(text),
      suspectBinaire: binaire
    });
  }

  /** Problèmes à signaler, du plus grave au moins grave : [{ code, niveau: 'erreur'|'avertissement', bloquant, message }].
   *  Un seul message par cas. Les colonnes obligatoires manquantes ne bloquent que tant qu'aucun choix manuel ne les comble. */
  function diagnostiquer(insp) {
    var out = [];
    if (insp.suspectBinaire) { out.push({ code: 'binaire', niveau: 'erreur', bloquant: true, message: MESSAGES.binaire }); return out; }
    if (insp.vide) { out.push({ code: 'vide', niveau: 'erreur', bloquant: true, message: MESSAGES.vide }); return out; }
    if (insp.enteteSeul) { out.push({ code: 'entete_seul', niveau: 'erreur', bloquant: true, message: MESSAGES.entete_seul }); return out; }
    if (insp.separateurIncertain) { out.push({ code: 'separateur', niveau: 'erreur', bloquant: true, message: MESSAGES.separateur }); return out; }
    (insp.avertissementsCsv || []).forEach(function (a) {
      if (a.code === 'guillemet_non_ferme') out.push({ code: 'guillemet', niveau: 'erreur', bloquant: false, message: MESSAGES.guillemet.replace('{n}', a.ligne) });
      else if (a.code === 'champ_tres_long') out.push({ code: 'guillemet', niveau: 'avertissement', bloquant: false, message: MESSAGES.champ_long.replace('{n}', a.ligne) });
    });
    if (insp.manquantes.length) out.push({ code: 'colonnes', niveau: 'erreur', bloquant: true, message: messageColonnes(insp) });
    (insp.ressemblances || []).forEach(function (r) {
      out.push({ code: 'ressemblance', niveau: 'avertissement', bloquant: false,
        message: 'La colonne « ' + r.colonne + ' » est ignorée, mais son nom ressemble à « ' + r.libelle + ' ». Si c\'est la bonne, choisissez-la dans l\'étape des colonnes.' });
    });
    if (insp.caracteresRemplaces > 0) out.push({ code: 'accents', niveau: 'avertissement', bloquant: false, message: MESSAGES.accents });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Tables, évaluation par tranches et rapport                          */
  /* ------------------------------------------------------------------ */

  /** Construit la table stockée dans le dossier (matrice brute + mapping : aucune perte). */
  function tableDepuisParse(parsed, mapping, meta) {
    meta = meta || {};
    return {
      source: {
        nomFichier: String(meta.nomFichier || '').slice(0, 200),
        importeLe: meta.maintenant || '',
        encodage: meta.encodage || '',
        separateur: parsed.separator,
        nbLues: parsed.rows.length + (parsed.blanks ? parsed.blanks.length : 0),
        nbRetenues: 0
      },
      entetes: parsed.headers.slice(),
      mapping: mapping.slice(),
      lignes: parsed.rows,
      numerosLigne: parsed.lines,
      rapport: { ignorees: [], totauxParRaison: {}, avertissements: [] },
      vides: parsed.blanks || [],
      avertissementsCsv: (parsed.avertissements || []).map(function (a) {
        return (a.code === 'guillemet_non_ferme' ? MESSAGES.guillemet : MESSAGES.champ_long).replace('{n}', a.ligne).replace(/\.$/, '');
      })
    };
  }

  function extrait(row) {
    var s = row.slice(0, 8).join(' | ');
    return s.length > 100 ? s.slice(0, 100) + '…' : s;
  }

  /** Évaluateur par tranches : avancer(de, a) traite les lignes de, de+1…, a-1 ; resultat() renvoie les enregistrements
   *  canoniques et les lignes ignorées (200 premières, totaux par raison pour toutes). */
  function creerEvaluateur(table, kindId) {
    var kind = kindDe(kindId);
    var ctx = kind.contexte();
    var nEnt = table.entetes.length;
    var paires = [];
    var colonnes = [];
    table.mapping.forEach(function (m, j) {
      if (m && colonnes.indexOf(m) < 0) { colonnes.push(m); paires.push([j, m]); }
    });
    var records = [];
    var lignesRetenues = [];
    var ignorees = [];
    var totaux = {};
    var nbIgn = 0;

    function rejeter(ligne, raison, row) {
      nbIgn++;
      totaux[raison] = (totaux[raison] || 0) + 1;
      if (ignorees.length < C.MAX_IGNOREES_RAPPORT) ignorees.push({ ligne: ligne, raison: raison, extrait: extrait(row) });
    }

    function avancer(de, a) {
      var fin = Math.min(a, table.lignes.length);
      for (var i = de; i < fin; i++) {
        var row = table.lignes[i];
        var ligne = table.numerosLigne[i];
        if (row.length > nEnt) {
          var extra = false;
          for (var x = nEnt; x < row.length; x++) { if (trim(row[x]) !== '') { extra = true; break; } }
          if (extra) { rejeter(ligne, 'colonnes_incoherentes', row); continue; }
        }
        var rec = {};
        for (var p = 0; p < paires.length; p++) rec[paires[p][1]] = trim(row[paires[p][0]]);
        var r = kind.normaliser(rec, ligne, ctx);
        if (r.ok) { records.push(r.valeur); lignesRetenues.push(ligne); }
        else rejeter(ligne, r.raison, row);
      }
    }

    function resultat() {
      return { kind: kindId, records: records, lignes: lignesRetenues, colonnes: colonnes, ignorees: ignorees, totauxParRaison: totaux, nbIgnorees: nbIgn, contexte: ctx };
    }

    return { total: table.lignes.length, avancer: avancer, resultat: resultat };
  }

  /** Évaluation d'un seul tenant (petits fichiers, tests). */
  function evaluerTable(table, kindId) {
    var e = creerEvaluateur(table, kindId);
    e.avancer(0, e.total);
    return e.resultat();
  }

  function avertissementsTexte(kindId, ctx) {
    var out = [];
    if (!ctx) return out;
    if (kindId === 'tiers') {
      if (ctx.typesInconnus) out.push(ctx.typesInconnus + ' tiers dont le type n\'est ni « client » ni « fournisseur » (traités comme clients : à vérifier)');
      return out;
    }
    if (kindId === 'registre') {
      if (ctx.nonVerifiees) out.push(ctx.nonVerifiees + ' SIREN non vérifié(s) (erreur du service, non diffusible, SIREN invalide ou vide, statut absent ou inconnu) : ils ne sont pas comptés comme vérifiés et n\'ont pas de date de vérification');
      return out;
    }
    if (kindId !== 'factures') return out;
    if (ctx.sansEcheance) out.push(ctx.sansEcheance + ' facture(s) sans date d\'échéance valide (non évaluable pour l\'ancienneté)');
    if (ctx.paiementAvantEmission) out.push(ctx.paiementAvantEmission + ' facture(s) dont la date de paiement est antérieure à la date d\'émission (exclue(s) du délai moyen)');
    if (ctx.montantsAmbigus) out.push(ctx.montantsAmbigus + ' montant(s) à un seul séparateur suivi de 3 chiffres (par exemple 1.234 ou 1,234), lu(s) comme un nombre décimal : vérifiez que ce ne sont pas des milliers');
    if (ctx.payeesSansDate) out.push(ctx.payeesSansDate + ' facture(s) payée(s) sans date de paiement (exclues du délai moyen)');
    if (ctx.sansTTC) out.push(ctx.sansTTC + ' facture(s) sans montant TTC (le HT est utilisé pour l\'encours)');
    if (ctx.dateSerieTableur) out.push(ctx.dateSerieTableur + ' date(s) d\'échéance ou de paiement enregistrée(s) comme un nombre : ignorée(s)');
    return out;
  }

  /** Rapport d'import conforme à I1 : fichier, type, encodage, séparateur, lues, retenues, ignorées (200 premières),
   *  totaux par raison, avertissements, colonnes absentes. Fusionne les lignes vides de l'analyse CSV. */
  function rapportImport(table, ev, kindId, meta) {
    meta = meta || {};
    var totaux = {};
    var ignorees = [];
    var vides = table.vides || [];
    vides.forEach(function (l, i) {
      if (i < C.MAX_IGNOREES_RAPPORT) ignorees.push({ ligne: l, raison: 'ligne_vide', extrait: '' });
    });
    if (vides.length) totaux.ligne_vide = vides.length;
    ev.ignorees.forEach(function (x) { if (ignorees.length < C.MAX_IGNOREES_RAPPORT) ignorees.push(x); });
    Object.keys(ev.totauxParRaison).forEach(function (k) { totaux[k] = (totaux[k] || 0) + ev.totauxParRaison[k]; });
    ignorees.sort(function (a, b) { return a.ligne - b.ligne; });
    var kind = kindDe(kindId);
    var sm = suggestMapping(table.entetes, kindId, table.mapping.map(function (m) { return m === null ? '' : m; }));
    var lues = table.lignes.length + vides.length;
    return {
      fichier: table.source.nomFichier,
      type: kindId,
      libelleType: kind.libelle,
      encodage: table.source.encodage,
      separateur: table.source.separateur,
      lues: lues,
      retenues: ev.records.length,
      ignorees: ignorees,
      totauxParRaison: totaux,
      avertissements: avertissementsTexte(kindId, ev.contexte),
      colonnesAbsentes: sm.absentes.concat(sm.manquantes),
      colonnesIgnorees: table.entetes.filter(function (h, j) { return !table.mapping[j]; }),
      conflits: sm.conflits
    };
  }

  /** Après validation : renseigne le rapport et les compteurs de la table. */
  function finaliserTable(table, ev, kindId) {
    var rap = rapportImport(table, ev, kindId);
    rap.avertissements = (table.avertissementsCsv || []).concat(rap.avertissements);
    table.rapport = {
      ignorees: rap.ignorees,
      totauxParRaison: rap.totauxParRaison,
      avertissements: rap.avertissements
    };
    table.source.nbRetenues = ev.records.length;
    table.source.nbLues = rap.lues;
    delete table.vides;
    delete table.avertissementsCsv;
    return rap;
  }

  /** Colonnes canoniques présentes (sans doublon, dans l'ordre du fichier). */
  function colonnesPresentes(table) {
    var out = [];
    table.mapping.forEach(function (m) { if (m && out.indexOf(m) < 0) out.push(m); });
    return out;
  }

  function modeleCsv(kindId) {
    return CSV.toCsv(kindDe(kindId).entetes, []);
  }

  /* ------------------------------------------------------------------ */
  /* Anciennes fonctions (interface conservée)                           */
  /* ------------------------------------------------------------------ */

  /** Convertit un CSV lu en enregistrements aux colonnes canoniques.
   *  kind : 'tiers' ou 'factures'. Renvoie { records, columns, missing, ignored }. */
  function canonicalizeCsv(parsed, kindId) {
    var kind = kindDe(kindId);
    var sm = suggestMapping(parsed.headers, kindId);
    var mapping = sm.mapping;
    var columns = [];
    mapping.forEach(function (m) { if (m && columns.indexOf(m) < 0) columns.push(m); });
    var ignored = parsed.headers.filter(function (h, idx) { return !mapping[idx]; });
    var missing = kind.obligatoires.filter(function (c) {
      return columns.indexOf(c) < 0 && !(kind.alternatives && kind.alternatives[c] && kind.alternatives[c].some(function (a) { return columns.indexOf(a) >= 0; }));
    });
    var records = parsed.rows.map(function (cells) {
      var rec = {};
      mapping.forEach(function (m, idx) {
        if (m && rec[m] === undefined) rec[m] = trim(cells[idx]);
      });
      return rec;
    });
    return { records: records, columns: columns, missing: missing, ignored: ignored };
  }

  function templateCsv(kindId) {
    return CSV.toCsv(kindId === 'tiers' ? T.TIERS_HEADERS : FACTURES_ENTETES, []);
  }

  return {
    FACTURES_HEADERS: FACTURES_ENTETES,
    FACTURES_REQUIRED: FACTURES_REQUIRED,
    KINDS: KINDS,
    ORDRE_KINDS: ORDRE_KINDS,
    classerStatutRegistre: classerStatutRegistre,
    STATUTS_NON_VERIFIES: STATUTS_NON_VERIFIES,
    typeTiers: typeTiers,
    RAISONS: RAISONS,
    MESSAGES: MESSAGES,
    kindDe: kindDe,
    suggestMapping: suggestMapping,
    inspectParsed: inspectParsed,
    inspectCsv: inspectCsv,
    diagnostiquer: diagnostiquer,
    messageColonnes: messageColonnes,
    extensionNonCsv: sansExtension,
    tableDepuisParse: tableDepuisParse,
    creerEvaluateur: creerEvaluateur,
    evaluerTable: evaluerTable,
    rapportImport: rapportImport,
    finaliserTable: finaliserTable,
    colonnesPresentes: colonnesPresentes,
    modeleCsv: modeleCsv,
    canonicalizeCsv: canonicalizeCsv,
    templateCsv: templateCsv
  };
});
