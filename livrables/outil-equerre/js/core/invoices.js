/* Équerre : montants, statuts de paiement et normalisation des factures importées. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./util.js'), require('./identifiers.js'));
  } else {
    root.Equerre.core.invoices = factory(root.Equerre.core.util, root.Equerre.core.identifiers);
  }
})(typeof self !== 'undefined' ? self : this, function (U, I) {
  'use strict';

  var trim = U.trim;
  var parseDate = U.parseDate;

  /** Montant saisi en français ou en anglais (« 1 234,56 », « 1234.56 », « 12 € ») → nombre, ou NaN. */
  function parseAmount(value) {
    if (typeof value === 'number') return value;
    var s = trim(value).replace(/[\s  €]/g, '');
    s = s.replace(/−/g, '-').replace(/(eur|euros?)$/i, '');
    var paren = /^\((.*)\)$/.exec(s);
    if (paren) s = '-' + paren[1];
    if (!s || !/^[-+]?[\d.,]+$/.test(s)) return NaN;
    // Un seul type de séparateur répété (« 1.234.567 », « 1,234,567 ») : séparateurs de milliers.
    if ((s.match(/\./g) || []).length > 1 && s.indexOf(',') < 0) s = s.replace(/\./g, '');
    if ((s.match(/,/g) || []).length > 1 && s.indexOf('.') < 0) s = s.replace(/,/g, '');
    var lastComma = s.lastIndexOf(',');
    var lastDot = s.lastIndexOf('.');
    if (lastComma >= 0 && lastDot >= 0) {
      if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (lastComma >= 0) {
      s = s.replace(/,/g, '.');
    }
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  /** Montant à un seul séparateur suivi d'exactement 3 chiffres (« 1.234 », « 1,234 ») : lu comme décimal, mais ambigu (milliers ?). */
  function montantAmbigu(value) {
    return /^[-+]?\d{1,3}[.,]\d{3}$/.test(trim(value).replace(/[\s  €]/g, ''));
  }

  function isPaidStatus(value) {
    var s = U.normalizeHeader(value);
    return ['payee', 'paye', 'payees', 'oui', 'reglee', 'regle', 'paid', 'solde', 'soldee'].indexOf(s) >= 0;
  }

  /** Un nombre pur de type 45000 (date « série » d'un tableur, jamais une vraie date de facture). */
  function isSerieTableur(value) {
    var s = trim(value);
    if (!/^\d{5}([.,]\d+)?$/.test(s)) return false;
    var n = parseFloat(s.replace(',', '.'));
    return n >= 20000 && n <= 80000;
  }

  function nouveauxAvertissements() {
    return { ignorees: 0, sansEcheance: 0, payeesSansDate: 0, sansTTC: 0, dateSerieTableur: 0, paiementAvantEmission: 0, montantsAmbigus: 0 };
  }

  /** Une facture importée → { ok:true, valeur } ou { ok:false, raison }. w : compteurs d'avertissements. */
  function normaliserFacture(rec, ligne, w) {
    var client = trim(rec.client);
    if (!client) return { ok: false, raison: 'client_manquant' };
    if (isSerieTableur(rec.date_emission)) return { ok: false, raison: 'date_serie_tableur' };
    var emission = parseDate(rec.date_emission);
    if (!emission) return { ok: false, raison: 'date_illisible' };
    var ht = parseAmount(rec.montant_ht);
    if (isNaN(ht)) return { ok: false, raison: 'montant_illisible' };
    var ech = parseDate(rec.date_echeance);
    var ttc = rec.montant_ttc === undefined || trim(rec.montant_ttc) === '' ? NaN : parseAmount(rec.montant_ttc);
    var paid;
    if (trim(rec.statut) === '' && trim(rec.solde) !== '' && !isNaN(parseAmount(rec.solde))) {
      // Pas de statut : la facture est payée quand il ne reste rien à payer (solde nul ou négatif, avoir), impayée sinon
      paid = parseAmount(rec.solde) < 0.005;
    } else {
      paid = isPaidStatus(rec.statut);
    }
    var datePaiement = parseDate(rec.date_paiement);
    if (montantAmbigu(rec.montant_ht) || (trim(rec.montant_ttc) !== '' && montantAmbigu(rec.montant_ttc))) w.montantsAmbigus++;
    if (paid && datePaiement && datePaiement < emission) w.paiementAvantEmission++;
    if (!ech) w.sansEcheance++;
    if (isSerieTableur(rec.date_echeance) || isSerieTableur(rec.date_paiement)) w.dateSerieTableur++;
    if (paid && !datePaiement) w.payeesSansDate++;
    if (isNaN(ttc)) w.sansTTC++;
    return {
      ok: true,
      valeur: {
        ligne: ligne,
        numero: trim(rec.numero),
        client: client,
        sirenClient: I.cleanId(rec.siren_client),
        dateEmission: emission,
        dateEcheance: ech,
        ht: ht,
        ttc: isNaN(ttc) ? null : ttc,
        paid: paid,
        datePaiement: paid ? datePaiement : null
      }
    };
  }

  /** Enregistrements de factures → factures normalisées + avertissements.
   *  opts.lignes : numéros de ligne physique du fichier (sinon position + 2). */
  function normalizeInvoices(records, opts) {
    var lignes = opts && opts.lignes;
    var invoices = [];
    var ignorees = [];
    var warnings = nouveauxAvertissements();
    for (var i = 0; i < records.length; i++) {
      var ligne = lignes ? lignes[i] : i + 2;
      var r = normaliserFacture(records[i], ligne, warnings);
      if (r.ok) invoices.push(r.valeur);
      else { warnings.ignorees++; ignorees.push({ ligne: ligne, raison: r.raison }); }
    }
    return { invoices: invoices, warnings: warnings, ignorees: ignorees };
  }

  return {
    parseAmount: parseAmount,
    isPaidStatus: isPaidStatus,
    montantAmbigu: montantAmbigu,
    isSerieTableur: isSerieTableur,
    nouveauxAvertissements: nouveauxAvertissements,
    normaliserFacture: normaliserFacture,
    normalizeInvoices: normalizeInvoices
  };
});
