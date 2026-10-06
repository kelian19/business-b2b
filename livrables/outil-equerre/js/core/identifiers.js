/* Équerre : SIREN, SIRET, TVA intracommunautaire française.
 *
 * Limite à garder en tête : un SIREN « valide » ici signifie qu'il a 9 chiffres et que sa clé de contrôle
 * (algorithme de Luhn) est correcte. Cela ne prouve PAS que l'entreprise existe au registre. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Equerre.core.identifiers = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Retire espaces (y compris insécables), points et tirets ; met en majuscules. */
  function cleanId(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[\s.\-  ]/g, '').toUpperCase();
  }

  /** Algorithme de Luhn sur une chaîne de chiffres. */
  function luhnValid(digits) {
    if (!/^\d+$/.test(digits)) return false;
    var sum = 0;
    var alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var n = digits.charCodeAt(i) - 48;
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  /** Un SIREN valide : 9 chiffres, clé de Luhn correcte (n'atteste pas l'existence au registre). */
  function isValidSiren(value) {
    var s = cleanId(value);
    if (!/^\d{9}$/.test(s)) return false;
    if (/^0+$/.test(s)) return false;
    return luhnValid(s);
  }

  /** Détail du contrôle d'un SIREN : { ok, code: ok|vide|caracteres|longueur|cle }. */
  function checkSiren(value) {
    var s = cleanId(value);
    if (!s) return { ok: false, code: 'vide', clean: s };
    if (!/^\d+$/.test(s)) return { ok: false, code: 'caracteres', clean: s };
    if (s.length !== 9) return { ok: false, code: 'longueur', clean: s, length: s.length };
    if (!isValidSiren(s)) return { ok: false, code: 'cle', clean: s };
    return { ok: true, code: 'ok', clean: s };
  }

  /** Un SIRET valide : 14 chiffres + Luhn (exception connue : les établissements du SIREN 356000000
   *  suivent une règle de somme multiple de 5). */
  function isValidSiret(value) {
    var s = cleanId(value);
    if (!/^\d{14}$/.test(s)) return false;
    if (s.slice(0, 9) === '356000000') {
      var total = 0;
      for (var i = 0; i < s.length; i++) total += s.charCodeAt(i) - 48;
      return total % 5 === 0;
    }
    return luhnValid(s);
  }

  /** Contrôle d'un SIRET, avec cohérence avec le SIREN s'il est fourni (SIREN = 9 premiers chiffres). */
  function checkSiret(siret, siren) {
    var t = cleanId(siret);
    if (!t) return { ok: false, code: 'vide', clean: t };
    if (!/^\d{14}$/.test(t)) return { ok: false, code: 'format', clean: t };
    if (!isValidSiret(t)) return { ok: false, code: 'cle', clean: t };
    var s = cleanId(siren);
    if (s && isValidSiren(s) && t.slice(0, 9) !== s) {
      return { ok: false, code: 'siren_different', clean: t, sirenDuSiret: t.slice(0, 9) };
    }
    return { ok: true, code: 'ok', clean: t };
  }

  /** Clé de TVA intracommunautaire française : (12 + 3 × (SIREN mod 97)) mod 97, sur deux chiffres. */
  function tvaKey(siren) {
    var s = cleanId(siren);
    if (!/^\d{9}$/.test(s)) return null;
    var key = (12 + 3 * (parseInt(s, 10) % 97)) % 97;
    return (key < 10 ? '0' : '') + key;
  }

  /** Numéro de TVA français attendu pour un SIREN : « FR » + clé + SIREN. */
  function expectedTva(siren) {
    var s = cleanId(siren);
    var k = tvaKey(s);
    return k === null ? null : 'FR' + k + s;
  }

  /** Contrôle d'un numéro de TVA français. Si le SIREN de la ligne est valide, on le compare ;
   *  sinon on vérifie seulement la cohérence interne du numéro (clé / SIREN contenu).
   *  Code : ok | vide | format | cle | siren_different. */
  function checkTva(tva, siren) {
    var t = cleanId(tva);
    if (!t) return { ok: false, code: 'vide', clean: t };
    var m = /^FR([0-9A-Z]{2})(\d{9})$/.exec(t);
    if (!m) return { ok: false, code: 'format', clean: t };
    var internal = tvaKey(m[2]);
    // Clé alphanumérique (rare) : seule la clé numérique est contrôlée, puis le SIREN contenu.
    if (/^\d{2}$/.test(m[1]) && internal !== m[1]) return { ok: false, code: 'cle', clean: t, expected: 'FR' + internal + m[2] };
    var s = cleanId(siren);
    if (s && isValidSiren(s) && m[2] !== s) {
      return { ok: false, code: 'siren_different', clean: t, expected: expectedTva(s) };
    }
    return { ok: true, code: 'ok', clean: t };
  }

  return {
    cleanId: cleanId,
    luhnValid: luhnValid,
    isValidSiren: isValidSiren,
    checkSiren: checkSiren,
    isValidSiret: isValidSiret,
    checkSiret: checkSiret,
    tvaKey: tvaKey,
    expectedTva: expectedTva,
    checkTva: checkTva
  };
});
