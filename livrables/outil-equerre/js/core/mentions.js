/* Équerre : contrôle de présence des mentions d'une facture. Code repris sans modification de comportement. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./constants.js'), require('./util.js'), require('./identifiers.js'));
  } else {
    root.Equerre.core.mentions = factory(root.Equerre.core.constants, root.Equerre.core.util, root.Equerre.core.identifiers);
  }
})(typeof self !== 'undefined' ? self : this, function (C, U, I) {
  'use strict';

  var trim = U.trim;
  var parseDate = U.parseDate;
  var checkSiren = I.checkSiren;
  var checkTva = I.checkTva;

  var MENTION_CLASSIQUES_NOTE = 'Liste non exhaustive : mentions courantes retenues pour la démonstration, à confirmer avec votre expert-comptable.';

  function hasText(v) { return trim(v) !== ''; }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /** Contrôle des mentions d'une facture (objet décrit dans data.js).
   *  Statuts : ok | manquant | a_verifier | na. Les 4 nouvelles mentions sont séparées des mentions courantes. */
  function checkInvoiceMentions(inv) {
    var items = [];
    function add(groupe, id, label, statut, explication) {
      items.push({ groupe: groupe, id: id, label: label, statut: statut, explication: explication });
    }
    var N = 'nouvelle';
    var C = 'classique';
    var client = inv.client || {};
    var vendeur = inv.vendeur || {};
    var lignes = inv.lignes || [];

    // 1. SIREN du client
    var cs = checkSiren(client.siren);
    if (cs.code === 'vide') {
      add(N, 'siren_client', 'SIREN du client', 'manquant', 'Le SIREN de votre client n\'apparaît pas. À compter du 1er septembre 2026, c\'est une mention obligatoire entre entreprises assujetties.');
    } else if (!cs.ok) {
      add(N, 'siren_client', 'SIREN du client', 'a_verifier', 'Un SIREN est indiqué mais il ne passe pas le contrôle de clé : probablement une faute de saisie.');
    } else {
      add(N, 'siren_client', 'SIREN du client', 'ok', 'Le SIREN du client est indiqué et sa clé de contrôle est correcte (cela ne prouve pas son existence au registre).');
    }

    // 2. Adresse de livraison, si elle diffère de l'adresse de facturation
    if (!inv.livraisonDifferente) {
      add(N, 'adresse_livraison', 'Adresse de livraison (si elle diffère de la facturation)', 'na', 'Sans objet ici : la livraison se fait à l\'adresse de facturation.');
    } else if (hasText(inv.adresseLivraison)) {
      add(N, 'adresse_livraison', 'Adresse de livraison (si elle diffère de la facturation)', 'ok', 'La livraison se fait à une autre adresse et cette adresse figure bien sur la facture.');
    } else {
      add(N, 'adresse_livraison', 'Adresse de livraison (si elle diffère de la facturation)', 'manquant', 'La livraison se fait à une autre adresse que la facturation, mais la facture ne l\'indique pas.');
    }

    // 3. Nature de l'opération
    if (hasText(inv.natureOperation)) {
      add(N, 'nature_operation', 'Nature de l\'opération (biens, services ou les deux)', 'ok', 'La nature de l\'opération est indiquée : ' + trim(inv.natureOperation) + '.');
    } else {
      add(N, 'nature_operation', 'Nature de l\'opération (biens, services ou les deux)', 'manquant', 'La facture n\'indique pas s\'il s\'agit de biens, de services ou des deux.');
    }

    // 4. Option pour le paiement de la TVA d'après les débits
    if (hasText(inv.optionDebits)) {
      add(N, 'option_debits', 'Option pour le paiement de la TVA d\'après les débits', 'ok', 'La mention est présente sur la facture.');
    } else {
      add(N, 'option_debits', 'Option pour le paiement de la TVA d\'après les débits', 'a_verifier', 'La mention n\'apparaît pas. Elle ne concerne que les entreprises qui ont opté : à vérifier avec votre expert-comptable selon votre situation (la démo contrôle seulement sa présence).');
    }

    // Mentions courantes (liste non exhaustive)
    add(C, 'numero', 'Numéro de facture unique', hasText(inv.numero) ? 'ok' : 'manquant', hasText(inv.numero) ? 'Un numéro est indiqué (son unicité se contrôle sur l\'ensemble des factures).' : 'Aucun numéro de facture.');
    add(C, 'date_emission', 'Date d\'émission', parseDate(inv.dateEmission) ? 'ok' : 'manquant', parseDate(inv.dateEmission) ? 'Une date d\'émission valide est indiquée.' : 'Date d\'émission absente ou illisible.');
    var ident = hasText(vendeur.nom) && hasText(vendeur.adresse);
    add(C, 'vendeur_identite', 'Identité du vendeur (nom et adresse)', ident ? 'ok' : 'manquant', ident ? 'Le nom et l\'adresse du vendeur sont indiqués.' : 'Le nom ou l\'adresse du vendeur manque.');
    var vs = checkSiren(vendeur.siren);
    add(C, 'vendeur_siren', 'SIREN du vendeur', vs.ok ? 'ok' : (vs.code === 'vide' ? 'manquant' : 'a_verifier'),
      vs.ok ? 'Le SIREN du vendeur est indiqué et passe le contrôle de clé.' : (vs.code === 'vide' ? 'Le SIREN du vendeur n\'est pas indiqué.' : 'Le SIREN du vendeur ne passe pas le contrôle de clé.'));
    var vt = checkTva(vendeur.tva, vendeur.siren);
    add(C, 'vendeur_tva', 'Numéro de TVA intracommunautaire du vendeur', vt.ok ? 'ok' : (vt.code === 'vide' ? 'manquant' : 'a_verifier'),
      vt.ok ? 'Le numéro de TVA est indiqué et cohérent avec le SIREN.' : (vt.code === 'vide' ? 'Le numéro de TVA du vendeur n\'est pas indiqué.' : 'Le numéro de TVA est indiqué mais incohérent (clé ou SIREN).'));
    var allDes = lignes.length > 0 && lignes.every(function (l) { return hasText(l.designation); });
    add(C, 'designation', 'Désignation des biens ou services', allDes ? 'ok' : 'manquant', allDes ? 'Chaque ligne a une désignation.' : 'Au moins une ligne n\'a pas de désignation.');
    var allQty = lignes.length > 0 && lignes.every(function (l) { return isNum(l.quantite) && l.quantite > 0; });
    add(C, 'quantite', 'Quantité', allQty ? 'ok' : 'manquant', allQty ? 'Chaque ligne a une quantité.' : 'Au moins une ligne n\'a pas de quantité.');
    var allPu = lignes.length > 0 && lignes.every(function (l) { return isNum(l.prixUnitaireHT) && l.prixUnitaireHT >= 0; });
    add(C, 'pu_ht', 'Prix unitaire hors taxe', allPu ? 'ok' : 'manquant', allPu ? 'Chaque ligne a un prix unitaire HT.' : 'Au moins une ligne n\'a pas de prix unitaire HT.');
    var allTaux = lignes.length > 0 && lignes.every(function (l) { return isNum(l.tauxTVA); });
    add(C, 'taux_tva', 'Taux de TVA', allTaux ? 'ok' : 'manquant', allTaux ? 'Chaque ligne a un taux de TVA.' : 'Au moins une ligne n\'a pas de taux de TVA.');
    add(C, 'montant_tva', 'Montant de TVA', isNum(inv.totalTVA) ? 'ok' : 'manquant', isNum(inv.totalTVA) ? 'Le montant de TVA est indiqué.' : 'Le montant de TVA n\'est pas indiqué.');
    add(C, 'total_ttc', 'Total toutes taxes comprises', isNum(inv.totalTTC) ? 'ok' : 'manquant', isNum(inv.totalTTC) ? 'Le total TTC est indiqué.' : 'Le total TTC n\'est pas indiqué.');
    add(C, 'date_echeance', 'Date d\'échéance (limite de paiement)', parseDate(inv.dateEcheance) ? 'ok' : 'manquant', parseDate(inv.dateEcheance) ? 'Une date d\'échéance est indiquée.' : 'Aucune date d\'échéance.');

    function tally(groupe) {
      var applicable = items.filter(function (x) { return x.groupe === groupe && x.statut !== 'na'; });
      return {
        total: applicable.length,
        ok: applicable.filter(function (x) { return x.statut === 'ok'; }).length
      };
    }
    var nouv = tally(N);
    var clas = tally(C);
    return {
      items: items,
      nouvelles: nouv,
      classiques: clas,
      noteClassiques: MENTION_CLASSIQUES_NOTE,
      aucunPoint: nouv.ok === nouv.total && clas.ok === clas.total
    };
  }

  /* ------------------------------------------------------------------ */
  /* Modèles guidés (module D) : 1 à 5 modèles de factures contrôlés à la main */
  /* ------------------------------------------------------------------ */

  var NOTE_NON_EXHAUSTIVE = 'La liste de mentions courantes est non exhaustive : c\'est un contrôle de présence, pas un avis de conformité.';

  /** Les 4 nouvelles mentions (à compter du 1er septembre 2026) puis des mentions courantes, liste non exhaustive. */
  var LISTE_NOUVELLES = [
    { id: 'siren_client', groupe: 'nouvelle', label: 'SIREN du client', aide: 'Le numéro SIREN de votre client (9 chiffres) doit figurer sur la facture.' },
    { id: 'adresse_livraison', groupe: 'nouvelle', label: 'Adresse de livraison (si elle diffère de la facturation)', aide: 'Seulement si la livraison se fait à une adresse différente de l\'adresse de facturation : sinon, « sans objet ».' },
    { id: 'nature_operation', groupe: 'nouvelle', label: 'Nature de l\'opération (biens, services ou les deux)', aide: 'La facture doit dire s\'il s\'agit de livraison de biens, de prestation de services ou des deux.' },
    { id: 'option_debits', groupe: 'nouvelle', label: 'Option pour le paiement de la TVA d\'après les débits', aide: 'Ne concerne que les entreprises qui ont opté : « à vérifier » avec votre expert-comptable si vous n\'êtes pas sûr.' }
  ];
  var LISTE_COURANTES = [
    { id: 'numero', groupe: 'classique', label: 'Numéro de facture unique' },
    { id: 'date_emission', groupe: 'classique', label: 'Date d\'émission' },
    { id: 'vendeur_identite', groupe: 'classique', label: 'Identité du vendeur (nom et adresse)' },
    { id: 'vendeur_siren', groupe: 'classique', label: 'SIREN du vendeur' },
    { id: 'vendeur_tva', groupe: 'classique', label: 'Numéro de TVA intracommunautaire du vendeur' },
    { id: 'designation', groupe: 'classique', label: 'Désignation des biens ou services' },
    { id: 'quantite', groupe: 'classique', label: 'Quantité' },
    { id: 'pu_ht', groupe: 'classique', label: 'Prix unitaire hors taxe' },
    { id: 'taux_tva', groupe: 'classique', label: 'Taux de TVA' },
    { id: 'montant_tva', groupe: 'classique', label: 'Montant de TVA' },
    { id: 'total_ttc', groupe: 'classique', label: 'Total toutes taxes comprises' },
    { id: 'date_echeance', groupe: 'classique', label: 'Date d\'échéance (limite de paiement)' }
  ];
  var LISTE_MODELE = LISTE_NOUVELLES.concat(LISTE_COURANTES);

  var STATUTS_CONTROLE = ['present', 'absent', 'a_verifier', 'sans_objet', 'non_controle'];
  var STATUT_LIBELLES = { present: 'Présent', absent: 'Manquant', a_verifier: 'À vérifier', sans_objet: 'Sans objet', non_controle: 'Non contrôlé' };

  function mentionDe(id) {
    for (var i = 0; i < LISTE_MODELE.length; i++) { if (LISTE_MODELE[i].id === id) return LISTE_MODELE[i]; }
    return null;
  }

  function modeleVide(id, nom) {
    return { id: id, nom: trim(nom).slice(0, C.MAX_NOM_MODELE) || 'Modèle', controles: {} };
  }

  function controleDe(modele, mentionId) {
    var c = modele.controles && modele.controles[mentionId];
    return c ? c : { statut: 'non_controle', preuve: '', note: '' };
  }

  /** Compte « présentes sur contrôlées » d'un groupe : les mentions sans objet ou non contrôlées sont écartées,
   *  les manquantes et à vérifier comptent dans le total. */
  function compterGroupe(modele, liste) {
    var ok = 0;
    var total = 0;
    liste.forEach(function (m) {
      var s = controleDe(modele, m.id).statut;
      if (s === 'sans_objet' || s === 'non_controle') return;
      total++;
      if (s === 'present') ok++;
    });
    return { ok: ok, total: total };
  }

  function compterModele(modele) {
    return { nouvelles: compterGroupe(modele, LISTE_NOUVELLES), courantes: compterGroupe(modele, LISTE_COURANTES) };
  }

  /** Compte par modèle et cumulé (les 4 nouvelles mentions, puis les mentions courantes). */
  function compterModeles(modeles) {
    var cum = { nouvelles: { ok: 0, total: 0 }, courantes: { ok: 0, total: 0 } };
    var par = (modeles || []).map(function (m) {
      var c = compterModele(m);
      cum.nouvelles.ok += c.nouvelles.ok; cum.nouvelles.total += c.nouvelles.total;
      cum.courantes.ok += c.courantes.ok; cum.courantes.total += c.courantes.total;
      return { id: m.id, nom: m.nom, nouvelles: c.nouvelles, courantes: c.courantes };
    });
    return { parModele: par, cumule: cum };
  }

  /** Ajoute un modèle guidé (5 au maximum). Renvoie { ok, message, modele }. Modifie le tableau reçu. */
  function ajouterModele(modeles, nom) {
    if (modeles.length >= C.MAX_MODELES) return { ok: false, message: 'Cinq modèles au maximum : supprimez-en un pour en ajouter un autre.' };
    var n = 1;
    var ids = modeles.map(function (m) { return m.id; });
    while (ids.indexOf('g' + n) >= 0) n++;
    var m = modeleVide('g' + n, nom || 'Modèle ' + (modeles.length + 1));
    modeles.push(m);
    return { ok: true, message: '', modele: m };
  }

  /** Supprime un modèle (au moins un modèle est conservé). Modifie le tableau reçu. */
  function supprimerModele(modeles, id) {
    if (modeles.length <= 1) return { ok: false, message: 'Un modèle au moins est conservé.' };
    for (var i = 0; i < modeles.length; i++) {
      if (modeles[i].id === id) { modeles.splice(i, 1); return { ok: true, message: '' }; }
    }
    return { ok: false, message: 'Modèle introuvable.' };
  }

  function renommerModele(modeles, id, nom) {
    var v = trim(nom);
    if (!v) return { ok: false, message: 'Un nom est nécessaire.' };
    for (var i = 0; i < modeles.length; i++) {
      if (modeles[i].id === id) { modeles[i].nom = v.slice(0, C.MAX_NOM_MODELE); return { ok: true, message: '' }; }
    }
    return { ok: false, message: 'Modèle introuvable.' };
  }

  /** Met à jour le contrôle d'une mention : patch { statut, preuve, note }, valeurs validées. */
  function majControle(modele, mentionId, patch) {
    if (!mentionDe(mentionId)) return { ok: false, message: 'Mention inconnue.' };
    var cur = controleDe(modele, mentionId);
    var nouveau = { statut: cur.statut, preuve: cur.preuve, note: cur.note };
    if (patch.statut !== undefined) {
      if (STATUTS_CONTROLE.indexOf(patch.statut) < 0) return { ok: false, message: 'Statut inconnu.' };
      nouveau.statut = patch.statut;
    }
    if (patch.preuve !== undefined) {
      if (String(patch.preuve).length > C.MAX_PREUVE) return { ok: false, message: 'La preuve est limitée à ' + C.MAX_PREUVE + ' caractères.' };
      nouveau.preuve = String(patch.preuve);
    }
    if (patch.note !== undefined) {
      if (String(patch.note).length > C.MAX_NOTE_MENTION) return { ok: false, message: 'La note est limitée à ' + C.MAX_NOTE_MENTION + ' caractères.' };
      nouveau.note = String(patch.note);
    }
    if (!modele.controles) modele.controles = {};
    modele.controles[mentionId] = nouveau;
    return { ok: true, message: '' };
  }

  /* ------------------------------------------------------------------ */
  /* Contrôle automatique de l'export des lignes de factures             */
  /* ------------------------------------------------------------------ */

  var ID_NOUVELLES = LISTE_NOUVELLES.map(function (m) { return m.id; });

  function statutSiren(siren) {
    if (!siren) return 'manquant';
    return checkSiren(siren).ok ? 'present' : 'a_verifier';
  }

  /** Contrôle automatique des 4 nouvelles mentions sur un export de lignes de factures.
   *  records : enregistrements normalisés (colonnes canoniques du type « lignes »). opts : { colonnes, numerosFactures }.
   *  Regroupe par numéro de facture (une Map : linéaire). Statuts par mention : present | manquant | a_verifier | sans_objet.
   *  Une mention dont la colonne est absente du fichier est « non contrôlée ». Renvoie
   *  { nbFactures, controle, parMention, ok, total, taux, facturesConcernees (200 premières), nbConcernees, facturesSansLignes, nbSansLignes }. */
  function controlerLignes(records, opts) {
    opts = opts || {};
    var cols = opts.colonnes || null;
    function a(c) { return !cols || cols.indexOf(c) >= 0; }
    var disponible = {
      siren_client: a('siren_client'),
      adresse_livraison: a('livraison_adresse') || a('livraison_differente'),
      nature_operation: a('nature_operation'),
      option_debits: a('option_tva_debits')
    };
    var factures = new Map();
    var ordre = [];
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var f = factures.get(r.numero);
      if (!f) {
        f = { numero: r.numero, client: '', ligne: r.ligne, siren: '', livAdr: '', livDiff: null, nature: '', option: '' };
        factures.set(r.numero, f);
        ordre.push(f);
      }
      if (!f.client && r.client) f.client = r.client;
      if (!f.siren && r.sirenClient) f.siren = r.sirenClient;
      if (!f.livAdr && (r.livraisonAdresse || r.livraisonCodePostal || r.livraisonVille)) f.livAdr = trim(r.livraisonAdresse) || trim(r.livraisonCodePostal) || trim(r.livraisonVille);
      if (r.livraisonDifferente === true) f.livDiff = true;
      else if (r.livraisonDifferente === false && f.livDiff === null) f.livDiff = false;
      if (!f.nature && r.natureOperation) f.nature = r.natureOperation;
      if (!f.option && r.optionDebits) f.option = r.optionDebits;
    }
    var parMention = {};
    ID_NOUVELLES.forEach(function (id) { parMention[id] = { present: 0, manquant: 0, aVerifier: 0, sansObjet: 0, controle: disponible[id] }; });
    var concernees = [];
    var nbConcernees = 0;
    var ok = 0;
    var total = 0;
    ordre.forEach(function (f) {
      var st = {};
      st.siren_client = disponible.siren_client ? statutSiren(f.siren) : 'non_controle';
      if (!disponible.adresse_livraison) st.adresse_livraison = 'non_controle';
      else if (f.livDiff === false) st.adresse_livraison = 'sans_objet';
      else if (f.livAdr) st.adresse_livraison = 'present';
      else if (f.livDiff === true) st.adresse_livraison = 'manquant';
      else st.adresse_livraison = 'a_verifier';
      st.nature_operation = disponible.nature_operation ? (f.nature ? 'present' : 'manquant') : 'non_controle';
      st.option_debits = disponible.option_debits ? (f.option ? 'present' : 'a_verifier') : 'non_controle';
      var probleme = false;
      ID_NOUVELLES.forEach(function (id) {
        var s = st[id];
        var pm = parMention[id];
        if (s === 'present') { pm.present++; ok++; total++; }
        else if (s === 'manquant') { pm.manquant++; total++; probleme = true; }
        else if (s === 'a_verifier') { pm.aVerifier++; total++; probleme = true; }
        else if (s === 'sans_objet') pm.sansObjet++;
      });
      if (probleme) {
        nbConcernees++;
        if (concernees.length < C.MAX_FACTURES_LISTEES) concernees.push({ numero: f.numero, client: f.client, ligne: f.ligne, mentions: st });
      }
    });
    var sans = [];
    var nbSans = 0;
    if (opts.numerosFactures) {
      opts.numerosFactures.forEach(function (n) {
        if (n && !factures.has(n)) { nbSans++; if (sans.length < C.MAX_FACTURES_LISTEES) sans.push(n); }
      });
    }
    return {
      nbFactures: ordre.length,
      controle: ID_NOUVELLES.some(function (id) { return disponible[id]; }),
      parMention: parMention,
      ok: ok,
      total: total,
      taux: total ? ok / total : null,
      facturesConcernees: concernees,
      nbConcernees: nbConcernees,
      facturesSansLignes: sans,
      nbSansLignes: nbSans
    };
  }

  return {
    checkInvoiceMentions: checkInvoiceMentions,
    NOTE_NON_EXHAUSTIVE: NOTE_NON_EXHAUSTIVE,
    LISTE_NOUVELLES: LISTE_NOUVELLES,
    LISTE_COURANTES: LISTE_COURANTES,
    LISTE_MODELE: LISTE_MODELE,
    STATUTS_CONTROLE: STATUTS_CONTROLE,
    STATUT_LIBELLES: STATUT_LIBELLES,
    mentionDe: mentionDe,
    modeleVide: modeleVide,
    controleDe: controleDe,
    compterModele: compterModele,
    compterModeles: compterModeles,
    ajouterModele: ajouterModele,
    supprimerModele: supprimerModele,
    renommerModele: renommerModele,
    majControle: majControle,
    controlerLignes: controlerLignes
  };
});
