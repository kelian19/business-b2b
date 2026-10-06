/* Équerre : logique de la démonstration (aucune dépendance au DOM).
 * Format UMD : module.exports sous Node, variable globale EquerreLogic dans le navigateur.
 *
 * Limite à garder en tête : un SIREN « valide » ici signifie qu'il a 9 chiffres et que sa
 * clé de contrôle (algorithme de Luhn) est correcte. Cela ne prouve PAS que l'entreprise
 * existe au registre. La vérification au registre fait partie de la prestation, pas de la démo.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EquerreLogic = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Constantes                                                          */
  /* ------------------------------------------------------------------ */

  var TIERS_HEADERS = ['type', 'nom', 'siren', 'siret', 'tva', 'adresse', 'code_postal', 'ville', 'pays',
    'livraison_adresse', 'livraison_code_postal', 'livraison_ville'];
  var TIERS_REQUIRED = ['nom', 'siren'];
  var FACTURES_HEADERS = ['numero', 'client', 'date_emission', 'date_echeance', 'montant_ht', 'montant_ttc',
    'statut', 'date_paiement'];
  var FACTURES_REQUIRED = ['client', 'date_emission', 'date_echeance', 'montant_ht', 'statut'];

  var TIERS_ALIASES = {
    raison_sociale: 'nom', denomination: 'nom', societe: 'nom', nom_client: 'nom', nom_tiers: 'nom',
    categorie: 'type', tiers_type: 'type', nature: 'type',
    n_siren: 'siren', numero_siren: 'siren',
    n_siret: 'siret', numero_siret: 'siret',
    tva_intracommunautaire: 'tva', n_tva: 'tva', numero_tva: 'tva', tva_intra: 'tva',
    numero_tva_intracommunautaire: 'tva', n_tva_intracommunautaire: 'tva',
    adresse_facturation: 'adresse', rue: 'adresse', adresse_1: 'adresse',
    cp: 'code_postal', codepostal: 'code_postal', code_postal_facturation: 'code_postal',
    commune: 'ville', ville_facturation: 'ville',
    country: 'pays',
    adresse_livraison: 'livraison_adresse',
    cp_livraison: 'livraison_code_postal', code_postal_livraison: 'livraison_code_postal',
    ville_livraison: 'livraison_ville'
  };
  var FACTURES_ALIASES = {
    numero_facture: 'numero', n_facture: 'numero', num: 'numero', n: 'numero',
    nom_client: 'client', tiers: 'client', client_nom: 'client',
    date: 'date_emission', date_facture: 'date_emission', emission: 'date_emission',
    echeance: 'date_echeance',
    ht: 'montant_ht', total_ht: 'montant_ht',
    ttc: 'montant_ttc', total_ttc: 'montant_ttc',
    etat: 'statut', status: 'statut',
    date_reglement: 'date_paiement', date_de_paiement: 'date_paiement', date_de_reglement: 'date_paiement'
  };

  var ANOMALY_TYPES = [
    { code: 'siren_manquant', label: 'SIREN manquant', severity: 'anomalie' },
    { code: 'siren_invalide', label: 'SIREN invalide', severity: 'anomalie' },
    { code: 'siret_incoherent', label: 'SIRET incohérent', severity: 'anomalie' },
    { code: 'tva_incoherente', label: 'TVA incohérente', severity: 'anomalie' },
    { code: 'doublon', label: 'Doublon possible', severity: 'anomalie' },
    { code: 'adresse_incomplete', label: 'Adresse incomplète', severity: 'anomalie' },
    { code: 'livraison_differente', label: 'Adresse de livraison différente', severity: 'note' }
  ];

  var LEGAL_FORMS = ['SARL', 'SAS', 'SASU', 'SA', 'EURL', 'SNC'];
  var MS_DAY = 86400000;

  /* ------------------------------------------------------------------ */
  /* Identifiants                                                        */
  /* ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------ */
  /* Adresses et noms                                                    */
  /* ------------------------------------------------------------------ */

  function isFrance(pays) {
    var p = cleanId(pays);
    return p === '' || p === 'FR' || p === 'FRA' || p === 'FRANCE';
  }

  function trim(v) {
    return v === null || v === undefined ? '' : String(v).trim();
  }

  /** Complétude d'une adresse : { adresse, code_postal, ville, pays } → { ok, problems:[{champ, code}] }.
   *  Code postal : 5 chiffres pour la France ; simplement renseigné pour l'étranger. */
  function checkAddress(a) {
    var problems = [];
    var adresse = trim(a.adresse);
    var cp = trim(a.code_postal);
    var ville = trim(a.ville);
    if (!adresse) problems.push({ champ: 'adresse', code: 'manquant' });
    if (!cp) {
      problems.push({ champ: 'code_postal', code: 'manquant' });
    } else if (isFrance(a.pays) && !/^\d{5}$/.test(cp)) {
      problems.push({ champ: 'code_postal', code: 'format' });
    }
    if (!ville) problems.push({ champ: 'ville', code: 'manquant' });
    return { ok: problems.length === 0, problems: problems };
  }

  function stripAccents(s) {
    return String(s).replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /** Nom normalisé pour comparer : majuscules, sans accents, sans ponctuation, sans forme juridique. */
  function normalizeName(name) {
    var t = stripAccents(trim(name)).toUpperCase().replace(/\./g, '');
    t = t.replace(/[^A-Z0-9]+/g, ' ').trim();
    var words = t.split(' ').filter(function (w) { return w && LEGAL_FORMS.indexOf(w) < 0; });
    return words.join(' ');
  }

  function normalizeAddress(adresse, cp, ville) {
    var t = [adresse, cp, ville].map(function (x) {
      return stripAccents(trim(x)).toUpperCase().replace(/\./g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
    });
    return t.join('|');
  }

  /** Les deux adresses (facturation, livraison) diffèrent-elles ? Faux si aucune adresse de livraison. */
  function deliveryDiffers(row) {
    if (!trim(row.livraison_adresse)) return false;
    return normalizeAddress(row.adresse, row.code_postal, row.ville) !==
      normalizeAddress(row.livraison_adresse, row.livraison_code_postal, row.livraison_ville);
  }

  /* ------------------------------------------------------------------ */
  /* Doublons                                                            */
  /* ------------------------------------------------------------------ */

  /** Détecte les doublons au sein d'un même type (client / fournisseur) :
   *  même SIREN, ou même nom normalisé ET même code postal.
   *  Renvoie un tableau (un élément par ligne) de [{ index, raison: 'siren'|'nom' }]. */
  function findDuplicates(rows) {
    var bySiren = {};
    var byName = {};
    rows.forEach(function (r, i) {
      var type = trim(r.type).toLowerCase();
      var s = cleanId(r.siren);
      if (s) (bySiren[type + '#' + s] = bySiren[type + '#' + s] || []).push(i);
      var nm = normalizeName(r.nom);
      var cp = trim(r.code_postal).replace(/\s/g, '');
      if (nm && cp) (byName[type + '#' + nm + '#' + cp] = byName[type + '#' + nm + '#' + cp] || []).push(i);
    });
    var result = rows.map(function () { return []; });
    function addGroup(groups, reason) {
      Object.keys(groups).forEach(function (k) {
        var g = groups[k];
        if (g.length < 2) return;
        g.forEach(function (i) {
          g.forEach(function (j) {
            if (i === j) return;
            var already = result[i].some(function (x) { return x.index === j; });
            if (!already) result[i].push({ index: j, raison: reason });
          });
        });
      });
    }
    addGroup(bySiren, 'siren');
    addGroup(byName, 'nom');
    return result;
  }

  /* ------------------------------------------------------------------ */
  /* Analyse d'un fichier de tiers                                       */
  /* ------------------------------------------------------------------ */

  var ADDRESS_LABELS = { adresse: 'l\'adresse', code_postal: 'le code postal', ville: 'la ville' };

  function addressProblemsText(problems) {
    return problems.map(function (p) {
      if (p.code === 'format') return 'le code postal n\'a pas 5 chiffres';
      return ADDRESS_LABELS[p.champ] + ' manque';
    }).join(' ; ');
  }

  /** Analyse des lignes (champs canoniques). opts.columns : colonnes réellement présentes dans le fichier
   *  (les contrôles dont la colonne est absente sont ignorés). */
  function analyzeThirdParties(rows, opts) {
    opts = opts || {};
    var cols = opts.columns || null;
    function has(c) { return !cols || cols.indexOf(c) >= 0; }
    var hasAddr = has('adresse') || has('code_postal') || has('ville');
    var hasLiv = has('livraison_adresse');

    var dups = findDuplicates(rows);
    var items = rows.map(function (r, i) {
      return { ligne: r.ligne || i + 2, row: r, anomalies: [] };
    });

    items.forEach(function (it, i) {
      var r = it.row;
      var isClient = trim(r.type).toLowerCase() !== 'fournisseur';
      var france = isFrance(r.pays);
      var sirenCheck = checkSiren(r.siren);
      var sirenOk = sirenCheck.ok;

      if (france && has('siren')) {
        if (sirenCheck.code === 'vide') {
          var siretClean = cleanId(r.siret);
          var hint = /^\d{14}$/.test(siretClean) ? ' Le SIRET renseigné contient déjà le SIREN (ses 9 premiers chiffres) : à confirmer.' : '';
          it.anomalies.push({
            code: 'siren_manquant', severity: 'anomalie', label: 'SIREN manquant',
            detail: isClient
              ? 'Le SIREN de ce client n\'est pas renseigné. Depuis le 1er septembre 2026, il fait partie des mentions obligatoires sur les factures entre entreprises assujetties.' + hint
              : 'Le SIREN de ce fournisseur n\'est pas renseigné : il sert à l\'identifier sans ambiguïté et à contrôler son numéro de TVA.' + hint,
            action: 'Retrouver le SIREN de l\'entreprise (registre public) et le saisir.'
          });
        } else if (!sirenOk) {
          var why = sirenCheck.code === 'caracteres' ? 'il contient autre chose que des chiffres'
            : sirenCheck.code === 'longueur' ? 'il a ' + sirenCheck.length + ' chiffres au lieu de 9'
              : 'sa clé de contrôle est incorrecte (probablement une faute de frappe)';
          it.anomalies.push({
            code: 'siren_invalide', severity: 'anomalie', label: 'SIREN invalide',
            detail: 'Le SIREN « ' + trim(r.siren) + ' » ne peut pas être correct : ' + why + '.',
            action: 'Corriger la saisie à partir d\'une source fiable (facture, Kbis, registre public).'
          });
        }
      }

      if (france && has('siret') && cleanId(r.siret)) {
        var sc = checkSiret(r.siret, r.siren);
        if (!sc.ok) {
          var detail = sc.code === 'format' ? 'Le SIRET « ' + trim(r.siret) + ' » n\'a pas 14 chiffres.'
            : sc.code === 'cle' ? 'Le SIRET « ' + trim(r.siret) + ' » a une clé de contrôle incorrecte.'
              : 'Le SIRET commence par le SIREN ' + sc.sirenDuSiret + ', qui n\'est pas celui de la ligne (' + cleanId(r.siren) + ').';
          it.anomalies.push({
            code: 'siret_incoherent', severity: 'anomalie', label: 'SIRET incohérent', detail: detail,
            action: 'Vérifier lequel des deux (SIREN ou SIRET) est faux et corriger.'
          });
        }
      }

      if (france && has('tva') && cleanId(r.tva)) {
        var tc = checkTva(r.tva, r.siren);
        if (!tc.ok) {
          var td = tc.code === 'format' ? 'Le numéro de TVA « ' + trim(r.tva) + ' » n\'a pas la forme attendue pour la France (FR, 2 chiffres de clé, SIREN).'
            : tc.code === 'cle' ? 'Le numéro de TVA « ' + trim(r.tva) + ' » a une clé incorrecte (attendu : ' + tc.expected + ').'
              : 'Le numéro de TVA « ' + trim(r.tva) + ' » ne correspond pas au SIREN de la ligne (attendu : ' + tc.expected + ').';
          it.anomalies.push({
            code: 'tva_incoherente', severity: 'anomalie', label: 'TVA incohérente', detail: td,
            action: 'Corriger le numéro de TVA ou le SIREN, selon celui qui est faux.'
          });
        }
      }

      if (hasAddr) {
        var billing = checkAddress({
          adresse: has('adresse') ? r.adresse : 'x', code_postal: has('code_postal') ? r.code_postal : '00000',
          ville: has('ville') ? r.ville : 'x', pays: r.pays
        });
        var parts = [];
        if (!billing.ok) parts.push('Adresse de facturation : ' + addressProblemsText(billing.problems) + '.');
        if (hasLiv && (trim(r.livraison_adresse) || trim(r.livraison_code_postal) || trim(r.livraison_ville))) {
          var liv = checkAddress({
            adresse: r.livraison_adresse, code_postal: r.livraison_code_postal, ville: r.livraison_ville, pays: r.pays
          });
          if (!liv.ok) parts.push('Adresse de livraison : ' + addressProblemsText(liv.problems) + '.');
        }
        if (parts.length) {
          it.anomalies.push({
            code: 'adresse_incomplete', severity: 'anomalie', label: 'Adresse incomplète', detail: parts.join(' '),
            action: 'Compléter l\'adresse auprès du client ou du fournisseur.'
          });
        }
      }

      if (hasLiv && deliveryDiffers(r)) {
        it.anomalies.push({
          code: 'livraison_differente', severity: 'note', label: 'Adresse de livraison différente',
          detail: 'La livraison se fait à une autre adresse que la facturation : ' + trim(r.livraison_adresse) + ', ' +
            trim(r.livraison_code_postal) + ' ' + trim(r.livraison_ville) + '. Depuis le 1er septembre 2026, cette adresse doit figurer sur la facture quand elle diffère.',
          action: 'S\'assurer que votre logiciel de facturation reprend cette adresse sur les factures concernées.'
        });
      }

      if (dups[i].length) {
        var txt = dups[i].map(function (d) {
          var other = items[d.index];
          return (d.raison === 'siren' ? 'même SIREN' : 'même nom et même code postal') +
            ' que la ligne ' + other.ligne + ' (' + trim(other.row.nom) + ')';
        }).join(' ; ');
        it.anomalies.push({
          code: 'doublon', severity: 'anomalie', label: 'Doublon possible',
          detail: 'À rapprocher d\'une autre ligne : ' + txt + '.',
          action: 'Décider quelle ligne conserver et fusionner : deux fiches pour un même tiers donnent des factures et des relances incohérentes.'
        });
      }
    });

    var counts = {};
    ANOMALY_TYPES.forEach(function (t) { counts[t.code] = 0; });
    var clean = 0;
    var withAnomaly = 0;
    items.forEach(function (it) {
      var seen = {};
      var blocking = false;
      it.anomalies.forEach(function (a) {
        if (!seen[a.code]) { counts[a.code]++; seen[a.code] = true; }
        if (a.severity === 'anomalie') blocking = true;
      });
      if (blocking) withAnomaly++; else clean++;
    });
    return {
      items: items,
      total: items.length,
      clean: clean,
      withAnomaly: withAnomaly,
      counts: counts,
      score: readinessScore(items.length, clean)
    };
  }

  /** Score de préparation : part (en %, entier) des lignes sans anomalie. Les simples « notes » ne comptent pas. */
  function readinessScore(total, clean) {
    if (!total) return null;
    return Math.round((100 * clean) / total);
  }

  /* ------------------------------------------------------------------ */
  /* CSV                                                                 */
  /* ------------------------------------------------------------------ */

  function normalizeHeader(h) {
    return stripAccents(trim(h).replace(/^﻿/, '')).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function detectSeparator(text) {
    var firstLine = '';
    var inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (c === '"') inQ = !inQ;
      else if ((c === '\n' || c === '\r') && !inQ) break;
      firstLine += c;
    }
    var counts = { ';': 0, ',': 0, '\t': 0 };
    inQ = false;
    for (var j = 0; j < firstLine.length; j++) {
      var ch = firstLine[j];
      if (ch === '"') inQ = !inQ;
      else if (!inQ && counts[ch] !== undefined) counts[ch]++;
    }
    var best = ';';
    [';', ',', '\t'].forEach(function (s) { if (counts[s] > counts[best]) best = s; });
    return best;
  }

  /** Lecture CSV (guillemets, séparateur ; , ou tabulation détecté). Renvoie { separator, headers, rows } (rows : tableaux). */
  function parseCsv(text) {
    text = String(text || '').replace(/^﻿/, '');
    var sep = detectSeparator(text);
    var rows = [];
    var row = [];
    var field = '';
    var inQ = false;
    var i = 0;
    var n = text.length;
    while (i < n) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === sep) { row.push(field); field = ''; i++; continue; }
      if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = ''; rows.push(row); row = []; i++; continue;
      }
      field += c; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (x) { return trim(x) !== ''; }); });
    var headers = rows.length ? rows[0].map(trim) : [];
    return { separator: sep, headers: headers, rows: rows.slice(1) };
  }

  /** Convertit un CSV lu en enregistrements aux colonnes canoniques.
   *  kind : 'tiers' ou 'factures'. Renvoie { records, columns, missing, ignored }. */
  function canonicalizeCsv(parsed, kind) {
    var aliases = kind === 'tiers' ? TIERS_ALIASES : FACTURES_ALIASES;
    var known = kind === 'tiers' ? TIERS_HEADERS : FACTURES_HEADERS;
    var required = kind === 'tiers' ? TIERS_REQUIRED : FACTURES_REQUIRED;
    var mapping = parsed.headers.map(function (h) {
      var nh = normalizeHeader(h);
      if (known.indexOf(nh) >= 0) return nh;
      return aliases[nh] || null;
    });
    var columns = [];
    mapping.forEach(function (m) { if (m && columns.indexOf(m) < 0) columns.push(m); });
    var ignored = parsed.headers.filter(function (h, idx) { return !mapping[idx]; });
    var missing = required.filter(function (c) { return columns.indexOf(c) < 0; });
    var records = parsed.rows.map(function (cells) {
      var rec = {};
      mapping.forEach(function (m, idx) {
        if (m && rec[m] === undefined) rec[m] = trim(cells[idx]);
      });
      return rec;
    });
    return { records: records, columns: columns, missing: missing, ignored: ignored };
  }

  /** Lignes de tiers (champs texte nettoyés, numéro de ligne du fichier : en-tête = ligne 1). */
  function rowsToThirdParties(records) {
    return records.map(function (rec, i) {
      var r = { ligne: i + 2 };
      TIERS_HEADERS.forEach(function (h) { r[h] = trim(rec[h]); });
      return r;
    });
  }

  function csvCell(v, sep) {
    var s = v === null || v === undefined ? '' : String(v);
    // Protection contre l'injection de formule à l'ouverture dans un tableur.
    if (/^[=+@\t\r]/.test(s) || (/^-/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s))) s = '\'' + s;
    if (s.indexOf(sep) >= 0 || /["\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  /** Construit un CSV (séparateur point-virgule, fins de ligne CRLF, sans BOM : le BOM est ajouté côté navigateur). */
  function toCsv(headers, rows, sep) {
    sep = sep || ';';
    var lines = [headers.map(function (h) { return csvCell(h, sep); }).join(sep)];
    rows.forEach(function (r) {
      lines.push((Array.isArray(r) ? r : headers.map(function (h) { return r[h]; })).map(function (v) { return csvCell(v, sep); }).join(sep));
    });
    return lines.join('\r\n') + '\r\n';
  }

  /** CSV des anomalies : une ligne par anomalie (notes comprises, avec la colonne « gravité »). */
  function anomaliesToCsv(analysis) {
    var headers = ['ligne', 'type', 'nom', 'siren', 'anomalie', 'gravite', 'detail', 'action_suggeree'];
    var rows = [];
    analysis.items.forEach(function (it) {
      it.anomalies.forEach(function (a) {
        rows.push([it.ligne, it.row.type, it.row.nom, it.row.siren, a.label,
          a.severity === 'anomalie' ? 'anomalie' : 'à noter', a.detail, a.action]);
      });
    });
    return toCsv(headers, rows);
  }

  function templateCsv(kind) {
    return toCsv(kind === 'tiers' ? TIERS_HEADERS : FACTURES_HEADERS, []);
  }

  /* ------------------------------------------------------------------ */
  /* Dates et montants                                                   */
  /* ------------------------------------------------------------------ */

  /** Accepte AAAA-MM-JJ, JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA ; renvoie « AAAA-MM-JJ » ou null. */
  function parseDate(value) {
    var s = trim(value);
    var y, m, d;
    var a = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s);
    var b = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s);
    if (a) { y = +a[1]; m = +a[2]; d = +a[3]; }
    else if (b) { d = +b[1]; m = +b[2]; y = +b[3]; }
    else return null;
    var t = new Date(Date.UTC(y, m - 1, d));
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
    return pad(y, 4) + '-' + pad(m, 2) + '-' + pad(d, 2);
  }

  function pad(n, w) {
    var s = String(n);
    while (s.length < w) s = '0' + s;
    return s;
  }

  function dayNumber(iso) {
    var p = iso.split('-');
    return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / MS_DAY);
  }

  /** Nombre de jours entre deux dates ISO (b - a). */
  function daysBetween(a, b) {
    return dayNumber(b) - dayNumber(a);
  }

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

  function isPaidStatus(value) {
    var s = normalizeHeader(value);
    return ['payee', 'paye', 'payees', 'oui', 'reglee', 'regle', 'paid', 'solde', 'soldee'].indexOf(s) >= 0;
  }

  /** Enregistrements de factures → factures normalisées + avertissements. */
  function normalizeInvoices(records) {
    var invoices = [];
    var warnings = { ignorees: 0, sansEcheance: 0, payeesSansDate: 0, sansTTC: 0 };
    records.forEach(function (rec, i) {
      var emission = parseDate(rec.date_emission);
      var ht = parseAmount(rec.montant_ht);
      var client = trim(rec.client);
      if (!emission || isNaN(ht) || !client) { warnings.ignorees++; return; }
      var ech = parseDate(rec.date_echeance);
      var ttc = rec.montant_ttc === undefined || trim(rec.montant_ttc) === '' ? NaN : parseAmount(rec.montant_ttc);
      var paid = isPaidStatus(rec.statut);
      var datePaiement = parseDate(rec.date_paiement);
      if (!ech) warnings.sansEcheance++;
      if (paid && !datePaiement) warnings.payeesSansDate++;
      if (isNaN(ttc)) warnings.sansTTC++;
      invoices.push({
        ligne: i + 2,
        numero: trim(rec.numero),
        client: client,
        dateEmission: emission,
        dateEcheance: ech,
        ht: ht,
        ttc: isNaN(ttc) ? null : ttc,
        paid: paid,
        datePaiement: paid ? datePaiement : null
      });
    });
    return { invoices: invoices, warnings: warnings };
  }

  /* ------------------------------------------------------------------ */
  /* Reporting                                                           */
  /* ------------------------------------------------------------------ */

  function cents(x) { return Math.round(x * 100); }
  function eur(c) { return c / 100; }

  function monthRange(first, last) {
    var out = [];
    var y = +first.slice(0, 4);
    var m = +first.slice(5, 7);
    var ly = +last.slice(0, 4);
    var lm = +last.slice(5, 7);
    while (y < ly || (y === ly && m <= lm)) {
      out.push(pad(y, 4) + '-' + pad(m, 2));
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return out;
  }

  var AGE_BUCKETS = [
    { id: '1-30', label: '1 à 30 jours', min: 1, max: 30 },
    { id: '31-60', label: '31 à 60 jours', min: 31, max: 60 },
    { id: '60+', label: 'Plus de 60 jours', min: 61, max: Infinity }
  ];

  /** Indicateurs de reporting à partir de factures normalisées et d'une date de référence (AAAA-MM-JJ).
   *  Montants en euros. Le CA est le total HT de toutes les factures émises (payées ou non).
   *  L'encours et les échues sont en TTC (HT lorsque le TTC n'est pas fourni). */
  function computeReporting(invoices, refDate) {
    var totalHT = 0;
    var byMonth = {};
    var byClient = {};
    var firstMonth = null;
    var lastMonth = null;
    var encours = 0;
    var encoursHT = 0;
    var nbImpayees = 0;
    var buckets = AGE_BUCKETS.map(function (b) { return { id: b.id, label: b.label, nb: 0, c: 0 }; });
    var aEchoir = { nb: 0, c: 0 };
    var sansEcheance = { nb: 0, c: 0 };
    var delaiTotal = 0;
    var nbPayeesDatees = 0;
    var nbEnRetard = 0;

    invoices.forEach(function (inv) {
      var htC = cents(inv.ht);
      var dueC = inv.ttc === null || inv.ttc === undefined ? htC : cents(inv.ttc);
      totalHT += htC;
      var mois = inv.dateEmission.slice(0, 7);
      byMonth[mois] = (byMonth[mois] || 0) + htC;
      byClient[inv.client] = (byClient[inv.client] || 0) + htC;
      if (!firstMonth || mois < firstMonth) firstMonth = mois;
      if (!lastMonth || mois > lastMonth) lastMonth = mois;

      if (!inv.paid) {
        nbImpayees++;
        encours += dueC;
        encoursHT += htC;
        if (!inv.dateEcheance) { sansEcheance.nb++; sansEcheance.c += dueC; return; }
        var age = daysBetween(inv.dateEcheance, refDate);
        if (age <= 0) { aEchoir.nb++; aEchoir.c += dueC; return; }
        for (var k = 0; k < AGE_BUCKETS.length; k++) {
          if (age >= AGE_BUCKETS[k].min && age <= AGE_BUCKETS[k].max) {
            buckets[k].nb++;
            buckets[k].c += dueC;
            break;
          }
        }
      } else if (inv.datePaiement) {
        nbPayeesDatees++;
        delaiTotal += daysBetween(inv.dateEmission, inv.datePaiement);
        if (inv.dateEcheance && daysBetween(inv.dateEcheance, inv.datePaiement) > 0) nbEnRetard++;
      }
    });

    var parMois = [];
    if (firstMonth) {
      monthRange(firstMonth, lastMonth).forEach(function (m) { parMois.push({ mois: m, ht: eur(byMonth[m] || 0) }); });
    }

    var clients = Object.keys(byClient).map(function (name) { return { client: name, c: byClient[name] }; });
    clients.sort(function (a, b) { return b.c - a.c || (a.client < b.client ? -1 : 1); });
    var top = clients.slice(0, 5).map(function (x) {
      return { client: x.client, ht: eur(x.c), part: totalHT ? x.c / totalHT : 0 };
    });
    var topC = clients.slice(0, 5).reduce(function (s, x) { return s + x.c; }, 0);

    var nbEchues = buckets.reduce(function (s, b) { return s + b.nb; }, 0);
    var echuesC = buckets.reduce(function (s, b) { return s + b.c; }, 0);

    return {
      refDate: refDate,
      nbFactures: invoices.length,
      caHT: eur(totalHT),
      parMois: parMois,
      nbClients: clients.length,
      topClients: top,
      topPart: totalHT ? topC / totalHT : 0,
      autresPart: totalHT ? (totalHT - topC) / totalHT : 0,
      autresHT: eur(totalHT - topC),
      nbImpayees: nbImpayees,
      encours: eur(encours),
      encoursHT: eur(encoursHT),
      echues: {
        nb: nbEchues,
        total: eur(echuesC),
        tranches: buckets.map(function (b) {
          return { id: b.id, label: b.label, nb: b.nb, total: eur(b.c), part: encours ? b.c / encours : 0 };
        })
      },
      aEchoir: { nb: aEchoir.nb, total: eur(aEchoir.c) },
      sansEcheance: { nb: sansEcheance.nb, total: eur(sansEcheance.c) },
      nbPayeesDatees: nbPayeesDatees,
      delaiMoyenPaiement: nbPayeesDatees ? Math.round((10 * delaiTotal) / nbPayeesDatees) / 10 : null,
      nbPayeesEnRetard: nbEnRetard,
      partPayeesEnRetard: nbPayeesDatees ? nbEnRetard / nbPayeesDatees : null
    };
  }

  /* ------------------------------------------------------------------ */
  /* Mentions d'une facture                                              */
  /* ------------------------------------------------------------------ */

  var MENTION_CLASSIQUES_NOTE = 'Liste non exhaustive : mentions courantes retenues pour la démonstration, à confirmer avec votre expert-comptable.';

  function hasText(v) { return trim(v) !== ''; }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /** Contrôle des mentions d'une facture (objet décrit dans data.js).
   *  Statuts : ok | manquant | a_verifier | na. Les 4 nouvelles mentions sont séparées des mentions courantes. */
  function checkInvoiceMentions(inv) {
    var items = [];
    function add(groupe, id, label, statut, explication) {
      items.push({ groupe: groupe, id: id, label: label, statut: statut, explication: explication });
    }
    var N = 'nouvelle';
    var C = 'classique';
    var client = inv.client || {};
    var vendeur = inv.vendeur || {};
    var lignes = inv.lignes || [];

    // 1. SIREN du client
    var cs = checkSiren(client.siren);
    if (cs.code === 'vide') {
      add(N, 'siren_client', 'SIREN du client', 'manquant', 'Le SIREN de votre client n\'apparaît pas. Depuis le 1er septembre 2026, c\'est une mention obligatoire entre entreprises assujetties.');
    } else if (!cs.ok) {
      add(N, 'siren_client', 'SIREN du client', 'a_verifier', 'Un SIREN est indiqué mais il ne passe pas le contrôle de clé : probablement une faute de saisie.');
    } else {
      add(N, 'siren_client', 'SIREN du client', 'ok', 'Le SIREN du client est indiqué et sa clé de contrôle est correcte (cela ne prouve pas son existence au registre).');
    }

    // 2. Adresse de livraison, si elle diffère de l'adresse de facturation
    if (!inv.livraisonDifferente) {
      add(N, 'adresse_livraison', 'Adresse de livraison (si elle diffère de la facturation)', 'na', 'Sans objet ici : la livraison se fait à l\'adresse de facturation.');
    } else if (hasText(inv.adresseLivraison)) {
      add(N, 'adresse_livraison', 'Adresse de livraison (si elle diffère de la facturation)', 'ok', 'La livraison se fait à une autre adresse et cette adresse figure bien sur la facture.');
    } else {
      add(N, 'adresse_livraison', 'Adresse de livraison (si elle diffère de la facturation)', 'manquant', 'La livraison se fait à une autre adresse que la facturation, mais la facture ne l\'indique pas.');
    }

    // 3. Nature de l'opération
    if (hasText(inv.natureOperation)) {
      add(N, 'nature_operation', 'Nature de l\'opération (biens, services ou les deux)', 'ok', 'La nature de l\'opération est indiquée : ' + trim(inv.natureOperation) + '.');
    } else {
      add(N, 'nature_operation', 'Nature de l\'opération (biens, services ou les deux)', 'manquant', 'La facture n\'indique pas s\'il s\'agit de biens, de services ou des deux.');
    }

    // 4. Option pour le paiement de la TVA d'après les débits
    if (hasText(inv.optionDebits)) {
      add(N, 'option_debits', 'Option pour le paiement de la TVA d\'après les débits', 'ok', 'La mention est présente sur la facture.');
    } else {
      add(N, 'option_debits', 'Option pour le paiement de la TVA d\'après les débits', 'a_verifier', 'La mention n\'apparaît pas. Elle ne concerne que les entreprises qui ont opté : à vérifier avec votre expert-comptable selon votre situation (la démo contrôle seulement sa présence).');
    }

    // Mentions courantes (liste non exhaustive)
    add(C, 'numero', 'Numéro de facture unique', hasText(inv.numero) ? 'ok' : 'manquant', hasText(inv.numero) ? 'Un numéro est indiqué (son unicité se contrôle sur l\'ensemble des factures).' : 'Aucun numéro de facture.');
    add(C, 'date_emission', 'Date d\'émission', parseDate(inv.dateEmission) ? 'ok' : 'manquant', parseDate(inv.dateEmission) ? 'Une date d\'émission valide est indiquée.' : 'Date d\'émission absente ou illisible.');
    var ident = hasText(vendeur.nom) && hasText(vendeur.adresse);
    add(C, 'vendeur_identite', 'Identité du vendeur (nom et adresse)', ident ? 'ok' : 'manquant', ident ? 'Le nom et l\'adresse du vendeur sont indiqués.' : 'Le nom ou l\'adresse du vendeur manque.');
    var vs = checkSiren(vendeur.siren);
    add(C, 'vendeur_siren', 'SIREN du vendeur', vs.ok ? 'ok' : (vs.code === 'vide' ? 'manquant' : 'a_verifier'),
      vs.ok ? 'Le SIREN du vendeur est indiqué et passe le contrôle de clé.' : (vs.code === 'vide' ? 'Le SIREN du vendeur n\'est pas indiqué.' : 'Le SIREN du vendeur ne passe pas le contrôle de clé.'));
    var vt = checkTva(vendeur.tva, vendeur.siren);
    add(C, 'vendeur_tva', 'Numéro de TVA intracommunautaire du vendeur', vt.ok ? 'ok' : (vt.code === 'vide' ? 'manquant' : 'a_verifier'),
      vt.ok ? 'Le numéro de TVA est indiqué et cohérent avec le SIREN.' : (vt.code === 'vide' ? 'Le numéro de TVA du vendeur n\'est pas indiqué.' : 'Le numéro de TVA est indiqué mais incohérent (clé ou SIREN).'));
    var allDes = lignes.length > 0 && lignes.every(function (l) { return hasText(l.designation); });
    add(C, 'designation', 'Désignation des biens ou services', allDes ? 'ok' : 'manquant', allDes ? 'Chaque ligne a une désignation.' : 'Au moins une ligne n\'a pas de désignation.');
    var allQty = lignes.length > 0 && lignes.every(function (l) { return isNum(l.quantite) && l.quantite > 0; });
    add(C, 'quantite', 'Quantité', allQty ? 'ok' : 'manquant', allQty ? 'Chaque ligne a une quantité.' : 'Au moins une ligne n\'a pas de quantité.');
    var allPu = lignes.length > 0 && lignes.every(function (l) { return isNum(l.prixUnitaireHT) && l.prixUnitaireHT >= 0; });
    add(C, 'pu_ht', 'Prix unitaire hors taxe', allPu ? 'ok' : 'manquant', allPu ? 'Chaque ligne a un prix unitaire HT.' : 'Au moins une ligne n\'a pas de prix unitaire HT.');
    var allTaux = lignes.length > 0 && lignes.every(function (l) { return isNum(l.tauxTVA); });
    add(C, 'taux_tva', 'Taux de TVA', allTaux ? 'ok' : 'manquant', allTaux ? 'Chaque ligne a un taux de TVA.' : 'Au moins une ligne n\'a pas de taux de TVA.');
    add(C, 'montant_tva', 'Montant de TVA', isNum(inv.totalTVA) ? 'ok' : 'manquant', isNum(inv.totalTVA) ? 'Le montant de TVA est indiqué.' : 'Le montant de TVA n\'est pas indiqué.');
    add(C, 'total_ttc', 'Total toutes taxes comprises', isNum(inv.totalTTC) ? 'ok' : 'manquant', isNum(inv.totalTTC) ? 'Le total TTC est indiqué.' : 'Le total TTC n\'est pas indiqué.');
    add(C, 'date_echeance', 'Date d\'échéance (limite de paiement)', parseDate(inv.dateEcheance) ? 'ok' : 'manquant', parseDate(inv.dateEcheance) ? 'Une date d\'échéance est indiquée.' : 'Aucune date d\'échéance.');

    function tally(groupe) {
      var applicable = items.filter(function (x) { return x.groupe === groupe && x.statut !== 'na'; });
      return {
        total: applicable.length,
        ok: applicable.filter(function (x) { return x.statut === 'ok'; }).length
      };
    }
    var nouv = tally(N);
    var clas = tally(C);
    return {
      items: items,
      nouvelles: nouv,
      classiques: clas,
      noteClassiques: MENTION_CLASSIQUES_NOTE,
      aucunPoint: nouv.ok === nouv.total && clas.ok === clas.total
    };
  }

  /* ------------------------------------------------------------------ */

  return {
    TIERS_HEADERS: TIERS_HEADERS,
    TIERS_REQUIRED: TIERS_REQUIRED,
    FACTURES_HEADERS: FACTURES_HEADERS,
    FACTURES_REQUIRED: FACTURES_REQUIRED,
    ANOMALY_TYPES: ANOMALY_TYPES,
    AGE_BUCKETS: AGE_BUCKETS,
    cleanId: cleanId,
    luhnValid: luhnValid,
    isValidSiren: isValidSiren,
    checkSiren: checkSiren,
    isValidSiret: isValidSiret,
    checkSiret: checkSiret,
    tvaKey: tvaKey,
    expectedTva: expectedTva,
    checkTva: checkTva,
    isFrance: isFrance,
    checkAddress: checkAddress,
    normalizeName: normalizeName,
    deliveryDiffers: deliveryDiffers,
    findDuplicates: findDuplicates,
    analyzeThirdParties: analyzeThirdParties,
    readinessScore: readinessScore,
    normalizeHeader: normalizeHeader,
    parseCsv: parseCsv,
    canonicalizeCsv: canonicalizeCsv,
    rowsToThirdParties: rowsToThirdParties,
    toCsv: toCsv,
    anomaliesToCsv: anomaliesToCsv,
    templateCsv: templateCsv,
    parseDate: parseDate,
    daysBetween: daysBetween,
    parseAmount: parseAmount,
    isPaidStatus: isPaidStatus,
    normalizeInvoices: normalizeInvoices,
    computeReporting: computeReporting,
    checkInvoiceMentions: checkInvoiceMentions
  };
});
