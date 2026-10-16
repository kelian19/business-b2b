/* Flow Inbox : retrouve les passages relevés dans le corps d'un e-mail et le découpe en segments surlignables. Logique pure.
 * Un passage est cherché mot pour mot, hors lignes citées (« > ... ») ; deux champs peuvent partager un passage (segments qui se recouvrent). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };
    FI.core.passages = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CHAMPS = ['besoin', 'service', 'budget', 'delai', 'entreprise', 'contact'];

  /** Position de la première occurrence du passage qui n'est pas dans une ligne citée ; -1 si introuvable. */
  function trouver(corps, passage) {
    var i = corps.indexOf(passage);
    while (i >= 0) {
      var debutLigne = corps.lastIndexOf('\n', i - 1) + 1;
      if (corps.charAt(debutLigne) !== '>') return i;
      i = corps.indexOf(passage, i + 1);
    }
    return -1;
  }

  /** Intervalles surlignés : un par champ relevé ou à vérifier (un champ absent n'a jamais de passage). */
  function intervalles(email) {
    var res = [];
    CHAMPS.forEach(function (c) {
      var r = email.releves[c];
      if (!r || r.statut === 'absent' || !r.passage) return;
      var i = trouver(email.corps, r.passage);
      if (i >= 0) res.push({ champ: c, debut: i, fin: i + r.passage.length, statut: r.statut });
    });
    return res;
  }

  /** Découpe le corps en lignes puis en segments élémentaires ; chaque segment connaît les champs qui le couvrent. */
  function segmenter(corps, ivs) {
    var offset = 0;
    return corps.split('\n').map(function (texte) {
      var ls = offset, le = offset + texte.length;
      offset = le + 1;
      var bornes = [ls, le];
      ivs.forEach(function (iv) {
        if (iv.debut > ls && iv.debut < le) bornes.push(iv.debut);
        if (iv.fin > ls && iv.fin < le) bornes.push(iv.fin);
      });
      bornes = bornes.filter(function (b, k, t) { return t.indexOf(b) === k; }).sort(function (a, b) { return a - b; });
      var segs = [];
      for (var k = 0; k < bornes.length - 1; k++) {
        var a = bornes[k], b = bornes[k + 1];
        segs.push({
          texte: corps.slice(a, b),
          ivs: ivs.filter(function (iv) { return iv.debut <= a && iv.fin >= b; }),
          debuts: ivs.filter(function (iv) { return iv.debut === a; })
        });
      }
      return { citation: texte.charAt(0) === '>', texte: texte, segments: segs };
    });
  }

  return { trouver: trouver, intervalles: intervalles, segmenter: segmenter };
});
