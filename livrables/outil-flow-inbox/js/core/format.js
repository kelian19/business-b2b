/* Flow Inbox : formats d'affichage des informations relevées (budget, délai, contact) et normalisation de texte. Logique pure.
 * Le type de budget est toujours conservé et affiché : rien n'est arrondi ni converti en prix. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./dates.js'));
  } else {
    var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };
    FI.core.format = factory(FI.core.dates);
  }
})(typeof self !== 'undefined' ? self : this, function (Dates) {
  'use strict';

  var NNBSP = ' ';
  var NBSP = ' ';
  var NON_INDIQUE = 'Non indiqué';

  var TYPES_BUDGET = {
    exact: 'Exact', fourchette: 'Fourchette', a_partir_de: 'À partir de',
    plafond: 'Plafond', approximatif: 'Approximatif', incertain: 'Incertain'
  };
  var PERIODES = { mensuel: ' par mois', annuel: ' par an', par_unite: ' par unité' };

  function fmtNombre(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  }
  function fmtEuros(n) { return fmtNombre(n) + NBSP + '€'; }

  /** Montant d'un budget relevé, tel qu'annoncé : « 3 000 à 4 000 € », « à partir de 3 000 € », « jusqu'à 5 000 € »... */
  function budgetMontant(v) {
    if (!v) return '';
    var un = v.min !== null && v.min !== undefined ? v.min : v.max;
    var txt;
    switch (v.type) {
      case 'fourchette': txt = fmtNombre(v.min) + ' à ' + fmtEuros(v.max); break;
      case 'a_partir_de': txt = 'à partir de ' + fmtEuros(un); break;
      case 'plafond': txt = 'jusqu\'à ' + fmtEuros(v.max !== null && v.max !== undefined ? v.max : un); break;
      case 'approximatif': txt = 'environ ' + fmtEuros(un); break;
      case 'incertain': txt = fmtEuros(un) + ' (non assuré)'; break;
      default: txt = fmtEuros(un);
    }
    return txt + (PERIODES[v.periode] || '');
  }

  function budgetType(v) { return v ? (TYPES_BUDGET[v.type] || '') : ''; }

  /** Cellule de budget : montant, type conservé, mention « à vérifier » ; « Non indiqué » si absent. */
  function budgetCellule(releve) {
    if (!releve || releve.statut === 'absent') return NON_INDIQUE;
    var verif = releve.statut === 'a_verifier' ? ' · à vérifier' : '';
    if (!releve.valeur) return '« ' + (releve.passage || '') + ' »' + ' · montant non lisible' + verif;
    return budgetMontant(releve.valeur) + ' · ' + budgetType(releve.valeur).toLowerCase() + verif;
  }

  /** Cellule de délai : texte annoncé, date si elle est précise, « vague » sinon (jamais de date inventée). */
  function delaiCellule(releve) {
    if (!releve || releve.statut === 'absent') return NON_INDIQUE;
    var verif = releve.statut === 'a_verifier' ? ' · à vérifier' : '';
    if (!releve.valeur) return '« ' + (releve.passage || '') + ' »' + verif;
    var v = releve.valeur;
    if (v.precision === 'precise' && v.date) return v.texte + ' (' + Dates.fmtDate(v.date) + ')' + verif;
    return v.texte + ' · vague' + verif;
  }

  function contactTexte(releve) {
    if (!releve || releve.statut === 'absent' || !releve.valeur) return NON_INDIQUE;
    return releve.valeur.nom + (releve.valeur.fonction ? ', ' + releve.valeur.fonction : '');
  }

  /** Minuscules sans accents : base des recherches et des tris. */
  function norm(s) {
    return String(s === null || s === undefined ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function premiereMajuscule(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function premiereMinuscule(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  /** Texte sans les lignes citées (« > ... »). */
  function sansCitations(corps) {
    return String(corps || '').split('\n').filter(function (l) { return l.charAt(0) !== '>'; }).join('\n');
  }

  /** Début du message en une ligne : sans salutation, sans citation, espaces réduits, coupé sur un mot. */
  function extrait(corps, max) {
    max = max || 120;
    var lignes = sansCitations(corps).split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    while (lignes.length && /^(bonjour|salut|bonsoir|hello|madame|monsieur|hi)\b[^.!?]{0,40}[,.!]?$/i.test(lignes[0])) lignes.shift();
    var t = lignes.join(' ').replace(/\s+/g, ' ');
    if (t.length <= max) return t;
    var coupe = t.slice(0, max);
    var i = coupe.lastIndexOf(' ');
    return (i > max * 0.6 ? coupe.slice(0, i) : coupe).replace(/[,;:\s]+$/, '') + '…';
  }

  return {
    NNBSP: NNBSP, NBSP: NBSP, NON_INDIQUE: NON_INDIQUE, TYPES_BUDGET: TYPES_BUDGET,
    fmtNombre: fmtNombre, fmtEuros: fmtEuros, budgetMontant: budgetMontant, budgetType: budgetType,
    budgetCellule: budgetCellule, delaiCellule: delaiCellule, contactTexte: contactTexte,
    norm: norm, premiereMajuscule: premiereMajuscule, premiereMinuscule: premiereMinuscule,
    sansCitations: sansCitations, extrait: extrait
  };
});
