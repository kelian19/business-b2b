/* Équerre : préférences d'affichage (raccourcis activés, parcours d'accueil vu). Aucune donnée de dossier, jamais.
 * Stockage local éventuel, toujours enveloppé dans try/catch avec repli en mémoire : l'outil marche sans. */
(function (root) {
  'use strict';

  var CLE = 'equerre.prefs';
  var memoire = { raccourcis: true, accueilVu: false };
  var charge = false;

  function lireStockage() {
    try {
      var brut = root.localStorage.getItem(CLE);
      if (!brut) return null;
      var o = JSON.parse(brut);
      return o && typeof o === 'object' ? o : null;
    } catch (e) { return null; }
  }

  function ecrireStockage() {
    try { root.localStorage.setItem(CLE, JSON.stringify(memoire)); } catch (e) { /* stockage indisponible : repli mémoire */ }
  }

  function charger() {
    if (charge) return;
    charge = true;
    var o = lireStockage();
    if (o) {
      if (typeof o.raccourcis === 'boolean') memoire.raccourcis = o.raccourcis;
      if (typeof o.accueilVu === 'boolean') memoire.accueilVu = o.accueilVu;
    }
  }

  var Prefs = {
    get: function (cle) { charger(); return memoire[cle]; },
    set: function (cle, valeur) {
      charger();
      if (cle !== 'raccourcis' && cle !== 'accueilVu') return;
      memoire[cle] = valeur;
      ecrireStockage();
    }
  };

  root.Equerre.ui.prefs = Prefs;
})(typeof self !== 'undefined' ? self : this);
