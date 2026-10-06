/* Équerre : petits outils purs (textes, dates, empreinte). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Equerre.core.util = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MS_DAY = 86400000;

  function trim(v) {
    return v === null || v === undefined ? '' : String(v).trim();
  }

  function pad(n, w) {
    var s = String(n);
    while (s.length < w) s = '0' + s;
    return s;
  }

  function stripAccents(s) {
    return String(s).replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /** En-tête de colonne normalisé : minuscules, sans accents, mots séparés par « _ ». */
  function normalizeHeader(h) {
    return stripAccents(trim(h).replace(/^﻿/, '')).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  /** Accepte AAAA-MM-JJ, JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA et JJ/MM/AA (années 00 à 69 lues comme 20xx, 70 à 99 comme 19xx) ;
   *  renvoie « AAAA-MM-JJ » ou null. */
  function parseDate(value) {
    var s = trim(value);
    var y, m, d;
    var a = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s);
    var b = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s);
    var b2 = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2})$/.exec(s);
    if (a) { y = +a[1]; m = +a[2]; d = +a[3]; }
    else if (b) { d = +b[1]; m = +b[2]; y = +b[3]; }
    else if (b2) { d = +b2[1]; m = +b2[2]; y = +b2[3]; y += y < 70 ? 2000 : 1900; }
    else return null;
    var t = new Date(Date.UTC(y, m - 1, d));
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
    return pad(y, 4) + '-' + pad(m, 2) + '-' + pad(d, 2);
  }

  function dayNumber(iso) {
    var p = iso.split('-');
    return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / MS_DAY);
  }

  /** Nombre de jours entre deux dates ISO (b - a). */
  function daysBetween(a, b) {
    return dayNumber(b) - dayNumber(a);
  }

  /** Date ISO décalée de n jours calendaires (n peut être négatif). */
  function addDays(iso, n) {
    var t = new Date((dayNumber(iso) + n) * MS_DAY);
    return pad(t.getUTCFullYear(), 4) + '-' + pad(t.getUTCMonth() + 1, 2) + '-' + pad(t.getUTCDate(), 2);
  }

  /** Empreinte FNV-1a 32 bits (8 caractères hexadécimaux). Détection de corruption, pas une signature. */
  function fnv1a32(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return pad((h >>> 0).toString(16), 8);
  }

  /** JSON à clés d'objets triées (tableaux conservés dans l'ordre) : forme canonique stable. */
  function stableStringify(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) {
      // Chemin rapide : un tableau de textes (ligne d'un fichier importé) s'écrit exactement comme JSON.stringify (même forme canonique)
      var textes = true;
      for (var s = 0; s < v.length; s++) { if (typeof v[s] !== 'string') { textes = false; break; } }
      if (textes) return JSON.stringify(v);
      var simple = true;
      for (var i = 0; i < v.length && i < 4; i++) { if (v[i] !== null && typeof v[i] === 'object' && !Array.isArray(v[i])) { simple = false; break; } }
      if (simple) {
        var parts = new Array(v.length);
        for (var k = 0; k < v.length; k++) {
          var x = v[k];
          parts[k] = x !== null && typeof x === 'object' ? stableStringify(x) : JSON.stringify(x === undefined ? null : x);
        }
        return '[' + parts.join(',') + ']';
      }
      return '[' + v.map(stableStringify).join(',') + ']';
    }
    return '{' + Object.keys(v).sort().map(function (k2) {
      return JSON.stringify(k2) + ':' + stableStringify(v[k2]);
    }).join(',') + '}';
  }

  /** Nom de fichier assaini : sans accents ni caractères réservés Windows. */
  function slug(s, repli) {
    var t = stripAccents(trim(s)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return t || repli || 'dossier';
  }

  function copie(o) { return JSON.parse(JSON.stringify(o)); }

  return {
    MS_DAY: MS_DAY,
    trim: trim,
    pad: pad,
    stripAccents: stripAccents,
    normalizeHeader: normalizeHeader,
    parseDate: parseDate,
    dayNumber: dayNumber,
    daysBetween: daysBetween,
    addDays: addDays,
    fnv1a32: fnv1a32,
    stableStringify: stableStringify,
    slug: slug,
    copie: copie
  };
});
