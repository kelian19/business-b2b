/* Flow Inbox : export CSV (séparateur point-virgule, lisible par un tableur en français).
 * Échappement des guillemets, séparateurs et retours à la ligne ; NEUTRALISATION DES FORMULES : une cellule qui commence par
 * =, +, - ou @ (ou une tabulation / un retour chariot) est préfixée d'une apostrophe, pour qu'un tableur ne l'exécute jamais. Logique pure. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };
    FI.core.csv = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SEPARATEUR = ';';
  var BOM = '﻿';

  /** Préfixe d'une apostrophe toute cellule qui pourrait être lue comme une formule (espaces de tête ignorés). */
  function neutraliser(valeur) {
    var s = valeur === null || valeur === undefined ? '' : String(valeur);
    return /^\s*[=+\-@]/.test(s) || /^[\t\r]/.test(s) ? '\'' + s : s;
  }

  /** Une cellule : neutralisée, puis entre guillemets si elle contient un séparateur, un guillemet ou un retour à la ligne. */
  function cellule(valeur, sep) {
    var s = neutraliser(valeur);
    var separateur = sep || SEPARATEUR;
    if (s.indexOf(separateur) >= 0 || /["\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function ligne(cellules, sep) {
    return cellules.map(function (c) { return cellule(c, sep); }).join(sep || SEPARATEUR);
  }

  /** Contenu complet : en-têtes puis lignes, fins de ligne CRLF, BOM UTF-8 en option (par défaut oui, pour les accents sous Excel). */
  function versCsv(entetes, lignes, opts) {
    opts = opts || {};
    var sep = opts.sep || SEPARATEUR;
    var corps = [ligne(entetes, sep)].concat(lignes.map(function (l) { return ligne(l, sep); })).join('\r\n') + '\r\n';
    return (opts.bom === false ? '' : BOM) + corps;
  }

  return { SEPARATEUR: SEPARATEUR, BOM: BOM, neutraliser: neutraliser, cellule: cellule, ligne: ligne, versCsv: versCsv };
});
