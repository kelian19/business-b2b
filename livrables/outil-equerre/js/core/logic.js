/* Équerre : façade de la logique pure (aucune dépendance à l'interface).
 * Fusionne toutes les exportations des modules core dans EquerreLogic (global dans le navigateur, module.exports sous Node).
 * Les fonctions historiques gardent leur nom et leur signature ; CONST regroupe les constantes métier.
 *
 * Limite à garder en tête : un SIREN « valide » ici signifie qu'il a 9 chiffres et que sa clé de contrôle
 * (algorithme de Luhn) est correcte. Cela ne prouve PAS que l'entreprise existe au registre. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory([
      require('./constants.js'), require('./util.js'), require('./identifiers.js'), require('./csv.js'), require('./tiers.js'), require('./corrections.js'),
      require('./invoices.js'), require('./reporting.js'), require('./mentions.js'), require('./import-kinds.js'),
      require('./readiness.js'), require('./dossier.js'), require('./versions.js'), require('./portfolio.js'), require('./rapport.js')
    ]);
  } else {
    var c = root.Equerre.core;
    root.EquerreLogic = factory([c.constants, c.util, c.identifiers, c.csv, c.tiers, c.corrections, c.invoices, c.reporting, c.mentions,
      c.importKinds, c.readiness, c.dossier, c.versions, c.portfolio, c.rapport]);
  }
})(typeof self !== 'undefined' ? self : this, function (modules) {
  'use strict';

  var CONST = modules[0];
  var L = { CONST: CONST };
  modules.slice(1).forEach(function (m) {
    Object.keys(m).forEach(function (k) { L[k] = m[k]; });
  });
  return L;
});
