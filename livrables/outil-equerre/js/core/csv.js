/* Équerre : lecture et écriture CSV, décodage des octets.
 * - decodeBytes : UTF-8 (avec ou sans BOM), UTF-16 (BOM), repli Windows-1252 (table maison, sans ICU) ;
 *   détecte les fichiers qui ne sont pas du texte (xlsx, zip, pdf, OLE, octet NUL).
 * - createCsvParser : analyseur incrémental (guillemets, séparateurs et retours à la ligne dans les champs,
 *   CRLF coupé entre deux tranches) qui conserve la ligne physique de début de chaque enregistrement.
 * - parseCsv : enrobage du même analyseur sur un texte complet. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./util.js'));
  } else {
    root.Equerre.core.csv = factory(root.Equerre.core.util);
  }
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';

  var trim = U.trim;

  /* ------------------------------------------------------------------ */
  /* Décodage                                                            */
  /* ------------------------------------------------------------------ */

  // Windows-1252, plage 0x80 à 0x9F (le reste est identique à Latin-1)
  var CP1252 = [
    0x20AC, 0x0081, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008D, 0x017D, 0x008F,
    0x0090, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x009D, 0x017E, 0x0178
  ];

  function fromCodes(codes) {
    var out = [];
    for (var i = 0; i < codes.length; i += 8192) {
      out.push(String.fromCharCode.apply(null, codes.subarray ? codes.subarray(i, i + 8192) : codes.slice(i, i + 8192)));
    }
    return out.join('');
  }

  function decode1252(bytes, start) {
    var codes = new Uint16Array(bytes.length - start);
    for (var i = start, k = 0; i < bytes.length; i++, k++) {
      var b = bytes[i];
      codes[k] = b >= 0x80 && b <= 0x9F ? CP1252[b - 0x80] : b;
    }
    return fromCodes(codes);
  }

  function decode16(bytes, start, littleEndian) {
    var n = (bytes.length - start) >> 1;
    var codes = new Uint16Array(n);
    for (var i = 0; i < n; i++) {
      var a = bytes[start + 2 * i];
      var b = bytes[start + 2 * i + 1];
      codes[i] = littleEndian ? (b << 8) | a : (a << 8) | b;
    }
    return fromCodes(codes);
  }

  function decodeUtf8Strict(bytes, start) {
    var view = start ? bytes.subarray(start) : bytes;
    if (typeof TextDecoder === 'function') {
      try { return new TextDecoder('utf-8', { fatal: true }).decode(view); } catch (e) { return null; }
    }
    // Repli sans TextDecoder : validation et décodage à la main
    var out = [];
    var i = 0;
    var n = view.length;
    while (i < n) {
      var b = view[i];
      var cp;
      var extra;
      if (b < 0x80) { cp = b; extra = 0; }
      else if (b >= 0xC2 && b <= 0xDF) { cp = b & 0x1F; extra = 1; }
      else if (b >= 0xE0 && b <= 0xEF) { cp = b & 0x0F; extra = 2; }
      else if (b >= 0xF0 && b <= 0xF4) { cp = b & 0x07; extra = 3; }
      else return null;
      if (i + extra >= n && extra > 0) return null;
      for (var k = 1; k <= extra; k++) {
        var c = view[i + k];
        if ((c & 0xC0) !== 0x80) return null;
        cp = (cp << 6) | (c & 0x3F);
      }
      i += extra + 1;
      if (cp > 0xFFFF) { cp -= 0x10000; out.push(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF)); } else out.push(cp);
    }
    return fromCodes(out);
  }

  function compterRemplaces(texte) {
    var n = 0;
    var i = texte.indexOf('�');
    while (i >= 0) { n++; i = texte.indexOf('�', i + 1); }
    return n;
  }

  /** Format binaire reconnu à la signature : zip/xlsx, pdf, ancien Excel (OLE). */
  function signatureBinaire(bytes) {
    if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) return 'zip';
    if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf';
    if (bytes.length >= 4 && bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) return 'ole';
    return null;
  }

  /** Décode des octets (Uint8Array) en texte.
   *  Renvoie { texte, encodage, bom, caracteresRemplaces, suspectBinaire, format }. */
  function decodeBytes(bytes) {
    var res = { texte: '', encodage: 'UTF-8', bom: false, caracteresRemplaces: 0, suspectBinaire: false, format: null };
    var sig = signatureBinaire(bytes);
    if (sig) { res.suspectBinaire = true; res.format = sig; return res; }
    var texte;
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      res.encodage = 'UTF-16 LE'; res.bom = true; texte = decode16(bytes, 2, true);
    } else if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      res.encodage = 'UTF-16 BE'; res.bom = true; texte = decode16(bytes, 2, false);
    } else {
      var limite = Math.min(bytes.length, 8192);
      for (var i = 0; i < limite; i++) {
        if (bytes[i] === 0) { res.suspectBinaire = true; res.format = 'nul'; return res; }
      }
      var start = 0;
      if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) { start = 3; res.bom = true; }
      texte = decodeUtf8Strict(bytes, start);
      if (texte === null) { res.encodage = 'Windows-1252'; texte = decode1252(bytes, start); }
    }
    res.texte = texte;
    res.caracteresRemplaces = compterRemplaces(texte);
    return res;
  }

  /* ------------------------------------------------------------------ */
  /* Analyseur CSV incrémental                                           */
  /* ------------------------------------------------------------------ */

  /** Début de champ : le caractère précédent est un séparateur possible. */
  function c0(p) { return p === ';' || p === ',' || p === '\t'; }

  function detectSeparator(text) {
    var firstLine = '';
    var inQ = false;
    var limit = Math.min(text.length, 200000);
    for (var i = 0; i < limit; i++) {
      var c = text[i];
      if (c === '"' && (inQ || i === 0 || c0(text[i - 1]))) inQ = !inQ;
      else if ((c === '\n' || c === '\r') && !inQ) break;
      firstLine += c;
    }
    var counts = { ';': 0, ',': 0, '\t': 0 };
    inQ = false;
    for (var j = 0; j < firstLine.length; j++) {
      var ch = firstLine[j];
      if (ch === '"' && (inQ || j === 0 || c0(firstLine[j - 1]))) inQ = !inQ;
      else if (!inQ && counts[ch] !== undefined) counts[ch]++;
    }
    var best = ';';
    [';', ',', '\t'].forEach(function (s) { if (counts[s] > counts[best]) best = s; });
    return best;
  }

  /** Crée un analyseur. feed(tranche) peut être appelé autant de fois que nécessaire, fin() termine.
   *  Les lignes entièrement vides sont écartées (leur numéro est conservé dans blanks). */
  var MAX_SAUTS_CHAMP = 50;   // au-delà, un champ entre guillemets qui s'étend sur autant de lignes est signalé

  function createCsvParser(sep) {
    var rows = [];
    var lines = [];
    var blanks = [];
    var row = [];
    var field = '';
    var inQ = false;
    var q2 = false;        // un guillemet vu dans un champ entre guillemets : fermeture ou guillemet doublé ?
    var lastCR = false;
    var line = 1;
    var recStart = 1;
    var fresh = true;
    var debut = true;      // aucun caractère lu : un BOM éventuel est retiré
    var debChamp = true;   // aucun caractère dans le champ courant : seul un guillemet en début de champ ouvre un champ entre guillemets
    var ouvertLigne = 0;   // ligne physique où s'est ouvert le champ entre guillemets en cours
    var sauts = 0;         // retours à la ligne dans le champ entre guillemets en cours
    var avert = [];

    function endRecord() {
      var blank = true;
      for (var i = 0; i < row.length; i++) { if (trim(row[i]) !== '') { blank = false; break; } }
      if (blank) blanks.push(recStart);
      else { rows.push(row); lines.push(recStart); }
      row = [];
    }

    function feed(chunk) {
      if (debut && chunk.length) { if (chunk.charCodeAt(0) === 0xFEFF) chunk = chunk.slice(1); debut = chunk.length === 0; }
      for (var i = 0, n = chunk.length; i < n; i++) {
        var c = chunk[i];
        if (q2) {
          if (c === '"') { field += '"'; q2 = false; lastCR = false; continue; }
          q2 = false; inQ = false; debChamp = false;
        }
        if (!inQ && c === '\n' && lastCR) { lastCR = false; continue; }   // seconde moitié d'un CRLF
        if (fresh) { recStart = line; fresh = false; }
        if (inQ) {
          if (c === '"') { q2 = true; lastCR = false; continue; }
          field += c;
          if (c === '\n') { if (!lastCR) { line++; sauts++; } lastCR = false; }
          else if (c === '\r') { line++; sauts++; lastCR = true; }
          else lastCR = false;
          if (sauts === MAX_SAUTS_CHAMP + 1) avert.push({ code: 'champ_tres_long', ligne: ouvertLigne });
          continue;
        }
        // Comme Excel : un guillemet n'ouvre un champ entre guillemets qu'en début de champ (« 5" acier » reste du texte)
        if (c === '"' && debChamp) { inQ = true; debChamp = false; ouvertLigne = line; sauts = 0; lastCR = false; continue; }
        if (c === sep) { row.push(field); field = ''; debChamp = true; lastCR = false; continue; }
        if (c === '\r' || c === '\n') {
          row.push(field); field = ''; debChamp = true;
          endRecord();
          line++;
          lastCR = c === '\r';
          fresh = true;
          continue;
        }
        field += c;
        debChamp = false;
        lastCR = false;
      }
    }

    function fin() {
      if (q2) { inQ = false; q2 = false; }
      if (inQ) avert.push({ code: 'guillemet_non_ferme', ligne: ouvertLigne });
      if (field !== '' || row.length) { row.push(field); field = ''; endRecord(); }
      return { separator: sep, rows: rows, lines: lines, blanks: blanks, avertissements: avert };
    }

    return { feed: feed, fin: fin };
  }

  /** Lecture CSV complète. Renvoie { separator, headers, rows, lines, blanks, headerLine }.
   *  rows : tableaux de valeurs brutes (sans l'en-tête) ; lines : numéro de ligne physique de chaque ligne de données. */
  function parseCsv(text, sep) {
    text = String(text || '').replace(/^﻿/, '');
    sep = sep || detectSeparator(text);
    var p = createCsvParser(sep);
    p.feed(text);
    return finaliser(p.fin());
  }

  /** Résultat de fin() → forme de parseCsv (en-tête séparé des lignes de données). */
  function finaliser(r) {
    var headers = r.rows.length ? r.rows[0].map(trim) : [];
    return {
      separator: r.separator,
      headers: headers,
      rows: r.rows.slice(1),
      lines: r.lines.slice(1),
      blanks: r.blanks,
      avertissements: r.avertissements || [],
      headerLine: r.lines.length ? r.lines[0] : 0
    };
  }

  /* ------------------------------------------------------------------ */
  /* Écriture                                                            */
  /* ------------------------------------------------------------------ */

  /** Neutralise l'injection de formule à l'ouverture dans un tableur : apostrophe devant = + @ tabulation retour chariot
   *  ou un « - » qui ne démarre pas un nombre. */
  function neutraliser(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (/^[=+@\t\r]/.test(s) || (/^-/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s))) s = '\'' + s;
    return s;
  }

  /** Cellule CSV : neutralisée, entre guillemets si nécessaire (ou toujours avec « tout »). */
  function csvCell(v, sep, tout) {
    var s = neutraliser(v);
    if (tout || s.indexOf(sep) >= 0 || /["\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  /** Construit un CSV (séparateur point-virgule, fins de ligne CRLF, sans BOM : le BOM est ajouté au téléchargement).
   *  tout = true : toutes les cellules entre guillemets. */
  function toCsv(headers, rows, sep, tout) {
    sep = sep || ';';
    var lines = [headers.map(function (h) { return csvCell(h, sep, tout); }).join(sep)];
    rows.forEach(function (r) {
      lines.push((Array.isArray(r) ? r : headers.map(function (h) { return r[h]; })).map(function (v) { return csvCell(v, sep, tout); }).join(sep));
    });
    return lines.join('\r\n') + '\r\n';
  }

  return {
    decodeBytes: decodeBytes,
    signatureBinaire: signatureBinaire,
    compterRemplaces: compterRemplaces,
    detectSeparator: detectSeparator,
    createCsvParser: createCsvParser,
    finaliser: finaliser,
    parseCsv: parseCsv,
    neutraliser: neutraliser,
    csvCell: csvCell,
    toCsv: toCsv
  };
});
