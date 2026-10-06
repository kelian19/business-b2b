/* Équerre : analyse du fichier clients et fournisseurs (tiers).
 * Algorithmes linéaires : doublons par tables de hachage et composantes connexes (union-find),
 * groupes de plus de MAX_GROUPE_DOUBLONS lignes plafonnés avec mention. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./constants.js'), require('./util.js'), require('./identifiers.js'), require('./csv.js'));
  } else {
    root.Equerre.core.tiers = factory(root.Equerre.core.constants, root.Equerre.core.util, root.Equerre.core.identifiers, root.Equerre.core.csv);
  }
})(typeof self !== 'undefined' ? self : this, function (C, U, I, CSV) {
  'use strict';

  var trim = U.trim;
  var cleanId = I.cleanId;
  var checkSiren = I.checkSiren;
  var checkSiret = I.checkSiret;
  var checkTva = I.checkTva;

  var TIERS_HEADERS = ['type', 'nom', 'siren', 'siret', 'tva', 'adresse', 'code_postal', 'ville', 'pays',
    'livraison_adresse', 'livraison_code_postal', 'livraison_ville'];
  var TIERS_REQUIRED = ['nom', 'siren'];

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

  /* ---------- Adresses et noms ---------- */

  function isFrance(pays) {
    var p = cleanId(pays);
    return p === '' || p === 'FR' || p === 'FRA' || p === 'FRANCE';
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

  /** Nom normalisé pour comparer : majuscules, sans accents, sans ponctuation, sans forme juridique. */
  function normalizeName(name) {
    var t = U.stripAccents(trim(name)).toUpperCase().replace(/\./g, '');
    t = t.replace(/[^A-Z0-9]+/g, ' ').trim();
    var words = t.split(' ').filter(function (w) { return w && LEGAL_FORMS.indexOf(w) < 0; });
    return words.join(' ');
  }

  function normalizeAddress(adresse, cp, ville) {
    var t = [adresse, cp, ville].map(function (x) {
      return U.stripAccents(trim(x)).toUpperCase().replace(/\./g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
    });
    return t.join('|');
  }

  /** Les deux adresses (facturation, livraison) diffèrent-elles ? Faux si aucune adresse de livraison. */
  function deliveryDiffers(row) {
    if (!trim(row.livraison_adresse)) return false;
    return normalizeAddress(row.adresse, row.code_postal, row.ville) !==
      normalizeAddress(row.livraison_adresse, row.livraison_code_postal, row.livraison_ville);
  }

  /* ---------- Doublons ---------- */

  /** Index des doublons : même SIREN, ou même nom normalisé ET même code postal, au sein d'un même type.
   *  result[i] = [{ index, raison: 'siren'|'nom' }] (au plus MAX_GROUPE_DOUBLONS voisins par ligne) ;
   *  groupes : composantes connexes (union-find) ; plafonnes : nombre de groupes de plus de MAX_GROUPE_DOUBLONS lignes. */
  function buildDuplicateIndex(rows) {
    var maxG = C.MAX_GROUPE_DOUBLONS;
    var bySiren = new Map();
    var byName = new Map();
    var n = rows.length;
    for (var i = 0; i < n; i++) {
      var r = rows[i];
      var type = trim(r.type).toLowerCase();
      var s = cleanId(r.siren);
      var g;
      if (s) {
        var ks = type + '#' + s;
        g = bySiren.get(ks);
        if (g) g.push(i); else bySiren.set(ks, [i]);
      }
      var nm = normalizeName(r.nom);
      var cp = trim(r.code_postal).replace(/\s/g, '');
      if (nm && cp) {
        var kn = type + '#' + nm + '#' + cp;
        g = byName.get(kn);
        if (g) g.push(i); else byName.set(kn, [i]);
      }
    }
    var result = new Array(n);
    for (var z = 0; z < n; z++) result[z] = [];
    var parent = new Int32Array(n);
    for (var p = 0; p < n; p++) parent[p] = p;
    function find(x) {
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    }
    var plafonnes = 0;
    function addGroups(map, reason) {
      map.forEach(function (grp) {
        if (grp.length < 2) return;
        if (grp.length > maxG + 1) plafonnes++;
        var ra = find(grp[0]);
        for (var a = 0; a < grp.length; a++) {
          var ia = grp[a];
          var rb = find(ia);
          if (rb !== ra) { parent[rb] = ra; ra = find(ra); }
          var vus = null;
          if (reason === 'nom' && result[ia].length) {
            vus = new Set();
            for (var e = 0; e < result[ia].length; e++) vus.add(result[ia][e].index);
          }
          var c = 0;
          for (var b = 0; b < grp.length && c < maxG; b++) {
            if (b === a) continue;
            var j = grp[b];
            if (vus && vus.has(j)) continue;
            result[ia].push({ index: j, raison: reason });
            c++;
          }
        }
      });
    }
    addGroups(bySiren, 'siren');
    addGroups(byName, 'nom');
    var comp = new Map();
    for (var k = 0; k < n; k++) {
      if (!result[k].length) continue;
      var root = find(k);
      var cur = comp.get(root);
      if (cur) cur.push(k); else comp.set(root, [k]);
    }
    var groupes = [];
    comp.forEach(function (lignes) { groupes.push(lignes); });
    return { result: result, groupes: groupes, plafonnes: plafonnes };
  }

  /** Doublons au sein d'un même type : un élément par ligne, [{ index, raison }]. */
  function findDuplicates(rows) {
    return buildDuplicateIndex(rows).result;
  }

  /* ---------- Analyse ---------- */

  var ADDRESS_LABELS = { adresse: 'l\'adresse', code_postal: 'le code postal', ville: 'la ville' };

  function addressProblemsText(problems) {
    return problems.map(function (p) {
      if (p.code === 'format') return 'le code postal n\'a pas 5 chiffres';
      return ADDRESS_LABELS[p.champ] + ' manque';
    }).join(' ; ');
  }

  /** Score de préparation : part (en %, entier) des lignes sans anomalie. Les simples « notes » ne comptent pas. */
  function readinessScore(total, clean) {
    if (!total) return null;
    return Math.round((100 * clean) / total);
  }

  /** Analyseur découpable : analyzeRange(de, a) peut être appelé par tranches, finish() renvoie le résultat.
   *  opts.columns : colonnes réellement présentes (les contrôles dont la colonne est absente sont ignorés). */
  function createThirdPartyAnalyzer(rows, opts) {
    opts = opts || {};
    var cols = opts.columns || null;
    function has(c) { return !cols || cols.indexOf(c) >= 0; }
    var hasAddr = has('adresse') || has('code_postal') || has('ville');
    var hasLiv = has('livraison_adresse');
    var dupIndex = buildDuplicateIndex(rows);
    var dups = dupIndex.result;
    var items = rows.map(function (r, i) {
      return { ligne: r.ligne || i + 2, row: r, anomalies: [] };
    });

    function analyzeOne(i) {
      var it = items[i];
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
              ? 'Le SIREN de ce client n\'est pas renseigné. À compter du 1er septembre 2026, il fait partie des mentions obligatoires sur les factures entre entreprises assujetties.' + hint
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
            trim(r.livraison_code_postal) + ' ' + trim(r.livraison_ville) + '. À compter du 1er septembre 2026, cette adresse doit figurer sur la facture quand elle diffère.',
          action: 'S\'assurer que votre logiciel de facturation reprend cette adresse sur les factures concernées.'
        });
      }

      if (dups[i].length) {
        var liste = dups[i];
        var affiche = liste.slice(0, 5).map(function (d) {
          var other = items[d.index];
          return (d.raison === 'siren' ? 'même SIREN' : 'même nom et même code postal') +
            ' que la ligne ' + other.ligne + ' (' + trim(other.row.nom) + ')';
        }).join(' ; ');
        if (liste.length > 5) affiche += ' ; et ' + (liste.length - 5) + ' autre' + (liste.length - 5 > 1 ? 's' : '') + ' ligne' + (liste.length - 5 > 1 ? 's' : '');
        it.anomalies.push({
          code: 'doublon', severity: 'anomalie', label: 'Doublon possible',
          detail: 'À rapprocher d\'une autre ligne : ' + affiche + '.',
          action: 'Décider quelle ligne conserver et fusionner : deux fiches pour un même tiers donnent des factures et des relances incohérentes.'
        });
      }
    }

    function analyzeRange(from, to) {
      var fin = Math.min(to, items.length);
      for (var i = from; i < fin; i++) analyzeOne(i);
    }

    function finish() {
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
        score: readinessScore(items.length, clean),
        doublons: { groupes: dupIndex.groupes.length, lignes: dupIndex.groupes.reduce(function (s, g) { return s + g.length; }, 0), plafonnes: dupIndex.plafonnes },
        groupesDoublons: dupIndex.groupes
      };
    }

    return { total: items.length, analyzeRange: analyzeRange, finish: finish };
  }

  /** Analyse des lignes (champs canoniques). opts.columns : colonnes réellement présentes dans le fichier. */
  function analyzeThirdParties(rows, opts) {
    var a = createThirdPartyAnalyzer(rows, opts);
    a.analyzeRange(0, a.total);
    return a.finish();
  }

  /** Lignes de tiers (champs texte nettoyés, numéro de ligne du fichier : en-tête = ligne 1).
   *  numerosLigne : lignes physiques réelles du fichier (facultatif). */
  function rowsToThirdParties(records, numerosLigne) {
    return records.map(function (rec, i) {
      var r = { ligne: numerosLigne ? numerosLigne[i] : i + 2 };
      TIERS_HEADERS.forEach(function (h) { r[h] = trim(rec[h]); });
      return r;
    });
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
    return CSV.toCsv(headers, rows);
  }

  /* ---------- Rapprochement linéaire factures / tiers ---------- */

  /** Index des fiches clients par SIREN valide et par nom normalisé. */
  function indexerTiers(rows) {
    var parSiren = new Map();
    var parNom = new Map();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (trim(r.type).toLowerCase() === 'fournisseur') continue;
      var s = cleanId(r.siren);
      if (I.isValidSiren(s)) { var a = parSiren.get(s); if (a) a.push(i); else parSiren.set(s, [i]); }
      var nm = normalizeName(r.nom);
      if (nm) { var b = parNom.get(nm); if (b) b.push(i); else parNom.set(nm, [i]); }
    }
    return { parSiren: parSiren, parNom: parNom };
  }

  /** Rapproche les clients des factures des fiches tiers : SIREN valide (colonne siren_client) d'abord, puis nom normalisé.
   *  Statuts : rapproche | homonyme (plusieurs fiches, non tranché) | non_rapproche. Linéaire. */
  function rapprocherFacturesTiers(invoices, rows, tranche) {
    var idx = indexerTiers(rows);
    var vus = new Map();
    for (var i = 0; i < invoices.length; i++) {
      var inv = invoices[i];
      var cle = (inv.sirenClient || '') + '|' + inv.client;
      if (vus.has(cle)) { vus.get(cle).nbFactures++; continue; }
      var res = { client: inv.client, nbFactures: 1, statut: 'non_rapproche', ligne: null };
      var cand = inv.sirenClient && I.isValidSiren(inv.sirenClient) ? idx.parSiren.get(inv.sirenClient) : null;
      if (!cand) cand = idx.parNom.get(normalizeName(inv.client));
      if (cand && cand.length === 1) { res.statut = 'rapproche'; res.ligne = cand[0]; }
      else if (cand && cand.length > 1) {
        var voulu = tranche && tranche[inv.client];
        if (voulu !== undefined && cand.indexOf(voulu) >= 0) { res.statut = 'rapproche'; res.ligne = voulu; }
        else res.statut = 'homonyme';
      }
      vus.set(cle, res);
    }
    var out = [];
    vus.forEach(function (v) { out.push(v); });
    return out;
  }

  return {
    TIERS_HEADERS: TIERS_HEADERS,
    TIERS_REQUIRED: TIERS_REQUIRED,
    ANOMALY_TYPES: ANOMALY_TYPES,
    isFrance: isFrance,
    checkAddress: checkAddress,
    normalizeName: normalizeName,
    deliveryDiffers: deliveryDiffers,
    findDuplicates: findDuplicates,
    buildDuplicateIndex: buildDuplicateIndex,
    createThirdPartyAnalyzer: createThirdPartyAnalyzer,
    analyzeThirdParties: analyzeThirdParties,
    readinessScore: readinessScore,
    rowsToThirdParties: rowsToThirdParties,
    anomaliesToCsv: anomaliesToCsv,
    indexerTiers: indexerTiers,
    rapprocherFacturesTiers: rapprocherFacturesTiers
  };
});
