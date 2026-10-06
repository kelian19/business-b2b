/* Équerre : espace de noms. Scripts classiques (pas de modules), aucune requête réseau.
 * core = logique pure testée sous Node ; ui et views = interface. */
(function (root) {
  'use strict';
  root.Equerre = root.Equerre || {};
  root.Equerre.core = root.Equerre.core || {};
  root.Equerre.ui = root.Equerre.ui || {};
  root.Equerre.views = root.Equerre.views || {};
})(typeof self !== 'undefined' ? self : this);
