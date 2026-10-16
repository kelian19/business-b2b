/* Flow Inbox : « Essayer avec un e-mail fictif ». Relevé PAR RÈGLES SIMPLES et déterministes (expressions régulières et listes de mots du catalogue).
 * Ce n'est PAS un modèle de langage : la version réelle s'appuierait sur un modèle de langage avec relecture humaine. Logique pure, sans DOM.
 *
 * Principes (identiques à ceux du reste de l'outil) :
 *  - une information qui n'est pas écrite reste ABSENTE : ni valeur, ni passage ;
 *  - ce qui est ambigu passe « à vérifier » et donne une raison de mise en revue ;
 *  - chaque information relevée cite le passage EXACT du texte (sous-chaîne du texte collé) ;
 *  - un délai vague (« fin janvier ») ne reçoit jamais de date inventée ;
 *  - le budget garde son type (exact, fourchette, à partir de, plafond, approximatif, incertain) et sa période ; rien n'est converti en prix.
 * Le texte collé n'est ni envoyé, ni enregistré. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./dates.js'), require('./format.js'), require('./contexte.js'), require('./brouillon.js'));
  } else {
    var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };
    FI.core.essai = factory(FI.core.dates, FI.core.format, FI.core.contexte, FI.core.brouillon);
  }
})(typeof self !== 'undefined' ? self : this, function (Dates, Fmt, Ctx, Br) {
  'use strict';

  var LONGUEUR_MAX = 8000;
  var CHAMPS = ['besoin', 'service', 'budget', 'delai', 'entreprise', 'contact'];

  var MENTION_REGLES = 'Règles simples de démonstration ; la version réelle s\'appuie sur un modèle de langage avec relecture humaine.';
  var AVERTISSEMENT = 'Collez uniquement du texte fictif : rien n\'est envoyé ni enregistré.';

  var LETTRE = 'A-Za-zÀ-ÖØ-öø-ÿ';
  var MAJ = 'A-ZÀ-ÖØ-Þ';
  var ESP = '[ \\u00a0\\u202f]';

  function vide() { return { statut: 'absent', valeur: null, passage: null }; }
  function champ(statut, valeur, passage, explication, candidats) {
    return { statut: statut, valeur: valeur, passage: passage, explication: explication || null, candidats: candidats || [] };
  }

  /** Parcourt toutes les occurrences d'une expression ; accept(m, texte) peut écarter un résultat (la recherche reprend un caractère plus loin). */
  function tous(re, texte, accept) {
    var res = [], m;
    re.lastIndex = 0;
    while ((m = re.exec(texte)) !== null) {
      if (!m[0].length) { re.lastIndex++; continue; }
      if (accept && !accept(m, texte)) { re.lastIndex = m.index + 1; continue; }
      res.push(m);
    }
    return res;
  }

  function precedent(texte, i) { return i > 0 ? texte.charAt(i - 1) : ''; }

  /** Vrai si l'occurrence ne démarre pas au milieu d'un nombre (« 2026 5 000 € » ne donne pas « 026 5 »). */
  function debutNombre(texte, i) {
    var c = precedent(texte, i);
    if (/\d/.test(c)) return false;
    if ((c === '.' || c === ',') && /\d/.test(precedent(texte, i - 1))) return false;
    return true;
  }

  function debutMot(texte, i) { return !new RegExp('[' + LETTRE + '0-9]').test(precedent(texte, i)); }

  function sansAccents(s) { return Fmt.norm(s); }

  /* ------------------------------------------------------------------ */
  /* Budget                                                              */
  /* ------------------------------------------------------------------ */

  var NUM = '(?:\\d{1,3}(?:[ \\u00a0\\u202f.]\\d{3})+|\\d+)(?:[.,]\\d{1,2})?';
  var MULT = '(?:k|K|mille|milliers?|millions?|M)';
  var DEV = '(?:€|euros?|Euros?|EUR|eur|\\$|dollars?|£)';
  var NON_LETTRE = '(?![' + LETTRE + '])';
  /* Un montant : nombre, multiplicateur facultatif (k, mille, milliers), devise facultative. 3 groupes : nombre, multiplicateur, devise. */
  var MONTANT = '(' + NUM + ')' + ESP + '*(' + MULT + NON_LETTRE + ')?' + ESP + '*(?:d[\'’]|de' + ESP + '+)?(' + DEV + NON_LETTRE + ')?';
  var RE_MONTANT = new RegExp(MONTANT, 'g');
  var RE_ENTRE = new RegExp('[Ee]ntre' + ESP + '+' + MONTANT + ESP + '*(?:et|à|-|–|—)' + ESP + '*' + MONTANT, 'g');
  var RE_PLAGE = new RegExp('(?:(?:de|du|d[\'’])' + ESP + '*)?' + MONTANT + ESP + '*(?:à|-|–|—)' + ESP + '*' + MONTANT, 'g');

  function parserNombre(s) {
    var t = s.replace(/[   ]/g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '');
    t = t.replace(',', '.');
    return parseFloat(t);
  }

  function facteur(mult) {
    if (!mult) return 1;
    var m = mult.toLowerCase();
    if (m === 'k' || m === 'mille' || m === 'milliers' || m === 'millier') return 1000;
    return mult === 'M' || /^million/.test(m) ? 1000000 : 1;
  }

  function deviseEuro(d) { return !d || /^(€|euros?|eur)$/i.test(d); }

  /* Mots qui précisent la nature d'un montant, cherchés juste avant (préfixe) ou juste après (suffixe). */
  var PRE_PLAFOND = '(?:budget\\s+)?(?:maximum|maxi|max\\.?|jusqu[\'’]à|jusqu[\'’]a|pas\\s+plus\\s+de|moins\\s+de|au\\s+plus|au\\s+maximum|plafonn[ée]+\\s+à|plafond(?:\\s+de|\\s+à)?|(?:ne\\s+)?(?:pas\\s+)?(?:d[ée]passer|d[ée]passe|d[ée]passera)|sans\\s+d[ée]passer|inf[ée]rieur(?:e)?\\s+à|dans\\s+la\\s+limite\\s+de|limit[ée]+\\s+à)';
  var PRE_PARTIR = '(?:à\\s+partir\\s+de|a\\s+partir\\s+de|dès|minimum(?:\\s+de)?|mini|au\\s+moins|au\\s+minimum|plus\\s+de|sup[ée]rieur(?:e)?\\s+à|d[ée]marre\\s+à|d[ée]bute\\s+à|commence\\s+à)';
  var PRE_APPROX = '(?:environ|autour\\s+de|à\\s+peu\\s+près|dans\\s+les|approximativement|de\\s+l[\'’]ordre\\s+de|aux\\s+alentours\\s+de|vers|presque|quasi|plus\\s+ou\\s+moins|~|≈)';
  var POST_PLAFOND = '(?:maximum|maxi|max\\b|au\\s+plus|au\\s+maximum|plafond|tout\\s+compris\\s+maximum)';
  var POST_PARTIR = '(?:minimum|mini\\b|au\\s+minimum|et\\s+plus|ou\\s+plus|et\\s+au-delà|\\+)';
  var POST_APPROX = '(?:environ|à\\s+peu\\s+près|approximativement|plus\\s+ou\\s+moins)';
  var LIAISON = '(?:\\s+(?:budget|montant|enveloppe|total|somme))?(?:\\s+(?:de|d[\'’]|à))?\\s*';
  var HT = '(?:\\s*(?:HT|TTC|H\\.T\\.|T\\.T\\.C\\.))?';
  var PERIODE = '\\s*(?:/\\s*mois|par\\s+mois|mensuel(?:s|les|lement)?|chaque\\s+mois|tous\\s+les\\s+mois|/\\s*an\\b|par\\s+an\\b|par\\s+ann[ée]e|annuel(?:s|les|lement)?|par\\s+unit[ée]|par\\s+num[ée]ro|par\\s+article|par\\s+newsletter|par\\s+envoi|/\\s*unit[ée])';
  var RE_SUFFIXE = new RegExp('^' + HT + '(?:' + PERIODE + ')?(?:\\s*' + HT + ')?(?:\\s*(?:' + POST_PLAFOND + '|' + POST_PARTIR + '|' + POST_APPROX + '))?', 'i');
  var RE_PERIODE = new RegExp(PERIODE, 'i');

  var RE_INCERTAIN = /peut[- ]?être|éventuellement|sans doute|à confirmer|pas (?:encore )?(?:certain|sûr|sur|défini|arrêté|décidé)|si possible|à voir|à définir|à discuter|je ne sais pas|ne sais pas si|on hésite|hésitons|j['’]imagine|je pense|on verra|pourrait|pourraient|serait peut/i;
  var RE_INCERTAIN_APRES = /^\s*[(,]?\s*(?:à confirmer|à voir|à définir|sous réserve|non confirmé|pas sûr|peut[- ]?être)/i;
  var RE_EXCLU = /chiffre d['’]affaires|\bCA\b|capital|salaires?|loyers?|dettes?|(?:avons|avait|a|ont)\s+(?:pay[ée]|d[ée]pens[ée]|r[ée]gl[ée]|investi|co[ûu]t[ée])|co[ûu]t[ée]+\b|facture[sé]?\b|frais de|valorisation|lev[ée]e de fonds|investisseurs?|\d+\s*salari[ée]s?/i;
  var RE_DOUTEUX = /subvention|financement|devis (?:pr[ée]c[ée]dent|de l['’]an dernier|de 20\d\d)|(?:avons|avez|a)\s+re[çc]u|augment|r[ée]duction/i;
  var RE_MOT_BUDGET = /(?:budget|enveloppe|pr[ée]voyons|pr[ée]vu|investir|consacrer|d[ée]bloquer)\s*(?:de|d['’]|:|est|serait|sera|autour de|environ|d'environ)?\s*$/i;

  /** Début et fin de la proposition qui contient la position (séparateurs : . ! ? ; retour à la ligne). */
  function phrase(texte, i, j) {
    var d = i, f = j;
    while (d > 0 && !/[.!?;\n]/.test(texte.charAt(d - 1))) d--;
    while (f < texte.length && !/[.!?;\n]/.test(texte.charAt(f))) f++;
    return { d: d, f: f, texte: texte.slice(d, f) };
  }

  /** Proposition plus étroite : coupée aussi aux virgules suivies de « mais » et à « alors que » (un chiffre d'affaires ne contamine pas un budget). */
  function proposition(texte, i, j) {
    var p = phrase(texte, i, j);
    var avant = texte.slice(p.d, i);
    var apres = texte.slice(j, p.f);
    var coupeAvant = Math.max(avant.lastIndexOf(', '), avant.lastIndexOf(' mais '), avant.lastIndexOf(' alors que '), avant.lastIndexOf(' tandis que '), avant.lastIndexOf(' puis '));
    if (coupeAvant >= 0) avant = avant.slice(coupeAvant + 1);
    var coupeApres = [apres.indexOf(', '), apres.indexOf(' mais '), apres.indexOf(' alors que '), apres.indexOf(' tandis que '), apres.indexOf(' puis ')].filter(function (x) { return x >= 0; });
    if (coupeApres.length) apres = apres.slice(0, Math.min.apply(null, coupeApres));
    return avant + texte.slice(i, j) + apres;
  }

  function montantDepuis(g1, g2, g3) {
    return { n: parserNombre(g1), mult: g2 || null, dev: g3 || null };
  }

  /** Valeurs d'une plage : le premier nombre hérite de l'unité du second (« entre 3 et 5 k€ » = 3 000 à 5 000). */
  function plage(a, b) {
    var f2 = facteur(b.mult);
    var v2 = b.n * f2;
    var v1, douteux = false;
    if (a.mult || a.dev) v1 = a.n * facteur(a.mult);
    else if (b.mult) v1 = a.n * f2;
    else if (a.n < 100 && v2 >= 1000) { v1 = a.n * 1000; douteux = true; }
    else v1 = a.n;
    return { min: v1, max: v2, douteux: douteux };
  }

  function typeAutour(texte, deb, fin) {
    var avant = texte.slice(Math.max(0, deb - 60), deb);
    var apres = texte.slice(fin, Math.min(texte.length, fin + 60));
    var pre = new RegExp('(?:^|[\\s,;:(])(' + '(?:' + PRE_PLAFOND + ')|(?:' + PRE_PARTIR + ')|(?:' + PRE_APPROX + ')' + ')' + LIAISON + '$', 'i').exec(avant);
    var info = { type: null, debut: deb, fin: fin };
    if (pre) {
      var mot = pre[1];
      info.debut = deb - (avant.length - pre.index) + (pre[0].length - pre[0].replace(/^[\s,;:(]/, '').length);
      if (new RegExp('^(?:' + PRE_PLAFOND + ')$', 'i').test(mot)) info.type = 'plafond';
      else if (new RegExp('^(?:' + PRE_PARTIR + ')$', 'i').test(mot)) info.type = 'a_partir_de';
      else info.type = 'approximatif';
    }
    var suf = RE_SUFFIXE.exec(apres);
    if (suf && suf[0].length) {
      info.fin = fin + suf[0].length;
      var s = suf[0].toLowerCase();
      if (!info.type) {
        if (new RegExp('(?:' + POST_PLAFOND + ')\\s*$', 'i').test(s)) info.type = 'plafond';
        else if (new RegExp('(?:' + POST_PARTIR + ')\\s*$', 'i').test(s)) info.type = 'a_partir_de';
        else if (new RegExp('(?:' + POST_APPROX + ')\\s*$', 'i').test(s)) info.type = 'approximatif';
      }
    }
    var periode = null;
    var p = RE_PERIODE.exec(apres.slice(0, suf ? suf[0].length : 0));
    if (p) {
      var t = p[0].toLowerCase();
      periode = /mois|mensuel/.test(t) ? 'mensuel' : /an\b|ann[ée]e|annuel/.test(t) ? 'annuel' : 'par_unite';
    }
    info.periode = periode;
    return info;
  }

  function candidatsBudget(texte) {
    var cands = [];
    var spans = [];

    function ajouter(deb, fin, min, max, type0, extra) {
      var info = typeAutour(texte, deb, fin);
      var type = type0 || info.type || 'exact';
      var debPass = info.debut, finPass = info.fin;
      var contexteLarge = proposition(texte, deb, fin);
      if (RE_EXCLU.test(contexteLarge)) return;
      var avant = texte.slice(phrase(texte, deb, fin).d, deb);
      var apres = texte.slice(fin, fin + 60);
      var incertain = RE_INCERTAIN.test(avant) || RE_INCERTAIN_APRES.test(apres);
      var douteux = RE_DOUTEUX.test(contexteLarge);
      var raisons = [];
      if (extra && extra.raisons) raisons = extra.raisons.slice();
      if (incertain) raisons.push('formulation incertaine (« peut-être », « à confirmer »…)');
      if (douteux) raisons.push('montant déjà reçu ou lié à un autre échange : à confirmer');
      var valeurType = type;
      if (type !== 'fourchette' && incertain) valeurType = 'incertain';
      var v;
      if (valeurType === 'fourchette') v = { min: min, max: max, type: 'fourchette' };
      else if (valeurType === 'a_partir_de') v = { min: min, max: null, type: 'a_partir_de' };
      else if (valeurType === 'plafond') v = { min: null, max: max, type: 'plafond' };
      else v = { min: min, max: max, type: valeurType };
      v.periode = info.periode;
      v.devise = 'EUR';
      cands.push({ debut: debPass, fin: finPass, passage: texte.slice(debPass, finPass), valeur: v, raisons: raisons, douteux: incertain || douteux || raisons.length > 0 });
      spans.push([deb, fin]);
    }

    function dansPlage(i) { return spans.some(function (s) { return i >= s[0] && i < s[1]; }); }

    /* 1) Plages : « entre 3 et 5 k€ », « 3-5 k€ », « de 3 000 à 4 000 € ». */
    [RE_ENTRE, RE_PLAGE].forEach(function (re) {
      tous(re, texte, function (m) { return debutNombre(texte, m.index + (m[0].search(/\d/))); }).forEach(function (m) {
        var a = montantDepuis(m[1], m[2], m[3]), b = montantDepuis(m[4], m[5], m[6]);
        if (!b.mult && !b.dev) return;
        if (!deviseEuro(b.dev) || (a.dev && !deviseEuro(a.dev))) return;
        var p = plage(a, b);
        if (!(p.min <= p.max)) return;
        var deb = m.index, fin = m.index + m[0].length;
        if (dansPlage(deb)) return;
        var extra = p.douteux ? { raisons: ['premier nombre sans unité (« ' + a.n + ' » lu comme ' + Fmt.fmtEuros(p.min) + ') : à confirmer'] } : null;
        ajouter(deb, fin, p.min, p.max, 'fourchette', extra);
      });
    });

    /* 2) Montants isolés. */
    tous(RE_MONTANT, texte, function (m) {
      var iNombre = m.index;
      if (!debutNombre(texte, iNombre)) return false;
      return !!(m[2] || m[3]);
    }).forEach(function (m) {
      if (dansPlage(m.index)) return;
      var a = montantDepuis(m[1], m[2], m[3]);
      if (a.mult === 'M' && !a.dev) return;
      var fin = m.index + m[0].length;
      /* Une unité sans devise (« 5k ») n'est un budget que si le mot « budget » (ou équivalent) la précède. */
      if (!a.dev) {
        var avantMot = texte.slice(Math.max(0, m.index - 40), m.index);
        if (!RE_MOT_BUDGET.test(avantMot)) return;
      }
      if (!deviseEuro(a.dev)) {
        cands.push({ debut: m.index, fin: fin, passage: texte.slice(m.index, fin).replace(/\s+$/, ''), valeur: null, raisons: ['devise autre que l\'euro : montant à confirmer'], douteux: true, autreDevise: true });
        spans.push([m.index, fin]);
        return;
      }
      var v = a.n * facteur(a.mult);
      var finTexte = m.index + m[0].replace(/\s+$/, '').length;
      var extra = a.dev ? null : { raisons: ['devise non indiquée (« ' + texte.slice(m.index, finTexte) + ' ») : à confirmer'] };
      ajouter(m.index, finTexte, v, v, null, extra);
    });

    /* 3) Nombre nu après « budget » (« budget de 5000 ») : devise non indiquée, donc à vérifier. */
    tous(new RegExp('(?:budget|enveloppe)' + ESP + '*(?:de|d[\'’]|:|est de|serait de|autour de|environ|d[\'’]environ)?' + ESP + '*(' + NUM + ')(?!' + ESP + '*(?:€|euros?|k\\b|mille|%|jours?|mois|semaines?|pages?|salari|personnes|ans\\b|heures?|h\\b|\\d))', 'gi'), texte, function (m) {
      var i = m.index + m[0].lastIndexOf(m[1]);
      return debutNombre(texte, i);
    }).forEach(function (m) {
      var i = m.index + m[0].lastIndexOf(m[1]);
      if (dansPlage(i)) return;
      var v = parserNombre(m[1]);
      if (!(v >= 50) || /^(?:19|20)\d\d$/.test(m[1])) return;
      cands.push({ debut: m.index, fin: m.index + m[0].length, passage: m[0], valeur: { min: v, max: v, type: 'exact', periode: null, devise: 'EUR' }, raisons: ['devise non indiquée : à confirmer'], douteux: true });
      spans.push([i, m.index + m[0].length]);
    });

    cands.sort(function (x, y) { return x.debut - y.debut; });
    return cands;
  }

  function memeValeur(a, b) {
    if (!a.valeur || !b.valeur) return false;
    return a.valeur.min === b.valeur.min && a.valeur.max === b.valeur.max && a.valeur.type === b.valeur.type && a.valeur.periode === b.valeur.periode;
  }

  function releverBudget(texte) {
    var cands = candidatsBudget(texte);
    var uniques = [];
    cands.forEach(function (c) { if (!uniques.some(function (u) { return memeValeur(u, c); })) uniques.push(c); });
    if (!uniques.length) return vide();
    if (uniques.length > 1) {
      return champ('a_verifier', null, uniques[0].passage, 'Plusieurs montants différents : une personne doit confirmer lequel retenir.', uniques.map(function (u) { return u.passage; }));
    }
    var c = uniques[0];
    if (c.autreDevise) return champ('a_verifier', null, c.passage, c.raisons.join(' ; '));
    if (c.douteux) return champ('a_verifier', c.valeur, c.passage, c.raisons.join(' ; ') || 'À confirmer');
    return champ('releve', c.valeur, c.passage, null);
  }

  /* ------------------------------------------------------------------ */
  /* Délai                                                               */
  /* ------------------------------------------------------------------ */

  var MOIS_NOMS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var MOIS_RE = '(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre|janv\\.?|f[ée]vr?\\.?|avr\\.?|juil\\.?|sept\\.?|oct\\.?|nov\\.?|d[ée]c\\.?)' + NON_LETTRE;
  var MOIS_COURT = { janv: 1, janvier: 1, fevr: 2, fevrier: 2, fev: 2, mars: 3, avril: 4, avr: 4, mai: 5, juin: 6, juillet: 7, juil: 7, aout: 8, septembre: 9, sept: 9, octobre: 10, oct: 10, novembre: 11, nov: 11, decembre: 12, dec: 12 };
  var PREP_DATE = '(?:(?:pour|avant|d[\'’]ici|dès|jusqu[\'’]au|jusqu[\'’]à|au\\s+plus\\s+tard|vers|le|ce)' + ESP + '+(?:le' + ESP + '+)?)?';
  var CONTEXTE_DATE = /livraison|livr[ée]|[ée]ch[ée]ance|deadline|\bdate\b|d[ée]lai|souhait|mise en ligne|lancement|ouverture|sortie|\bsalon\b|[ée]v[èe]nement|publication|au plus tard/i;

  function numMois(nom) { return MOIS_COURT[sansAccents(nom).replace('.', '')] || 0; }

  function dateValide(a, m, j) {
    if (m < 1 || m > 12 || j < 1 || j > 31) return false;
    var d = new Date(Date.UTC(a, m - 1, j));
    return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
  }

  function iso(a, m, j) { return a + '-' + (m < 10 ? '0' : '') + m + '-' + (j < 10 ? '0' : '') + j; }

  /** Lignes d'en-tête de messages transférés ou citations (« Envoyé : », « Date : », « Le 12/10/2026, X a écrit ») : les dates qui s'y trouvent ne sont pas des délais. */
  function lignesEnTete(texte) {
    var zones = [], offset = 0;
    texte.split('\n').forEach(function (l) {
      if (/^\s*(?:envoy[ée]|date|sent|re[çc]u le|cc|objet|de|à)\s*:/i.test(l) || /\ba [ée]crit\s*:?\s*$/i.test(l) || /^\s*>/.test(l) || /^\s*le\s+\d{1,2}[/.]\d{1,2}[/.]\d{2,4}.*,.*[ée]crit/i.test(l)) zones.push([offset, offset + l.length]);
      offset += l.length + 1;
    });
    return zones;
  }

  function candidatsDates(texte, ref) {
    var cands = [];
    var ignores = lignesEnTete(texte);
    var refJour = ref ? String(ref).slice(0, 10) : null;
    var refAnnee = refJour ? +refJour.slice(0, 4) : new Date(0).getUTCFullYear();

    function ignore(i) { return ignores.some(function (z) { return i >= z[0] && i < z[1]; }); }
    function chevauche(deb, fin) { return cands.some(function (c) { return deb < c.fin && fin > c.debut; }); }

    function pousser(c) { if (!ignore(c.debut) && !chevauche(c.debut, c.fin)) cands.push(c); }

    function explicite(deb, fin, a, m, j, anneeDonnee, avecContexte) {
      var passage = texte.slice(deb, fin);
      if (!dateValide(a, m, j)) {
        pousser({ debut: deb, fin: fin, passage: passage, genre: 'invalide', explication: 'Date impossible dans le calendrier : à confirmer.' });
        return;
      }
      var d = iso(a, m, j);
      if (refJour && d < refJour) {
        pousser({ debut: deb, fin: fin, passage: passage, genre: 'passee', iso: d, explication: 'Cette date est antérieure à la date de référence de la démonstration (' + Dates.fmtDate(refJour) + ') : année à confirmer.' });
        return;
      }
      pousser({ debut: deb, fin: fin, passage: passage, genre: 'precise', iso: d, explication: anneeDonnee ? null : 'Année non écrite : ' + a + ' supposée (année de la date de référence de la démonstration).' });
    }

    /* Périodes de jours (« du 12 au 15 novembre », « entre le 10 et le 15 novembre ») : ce n'est pas une date unique. */
    tous(new RegExp('(?:du|entre' + ESP + '+le|entre)' + ESP + '+(\\d{1,2})(?:er)?' + ESP + '+(?:au|et' + ESP + '+le|et)' + ESP + '+(\\d{1,2})' + ESP + '+' + MOIS_RE, 'gi'), texte).forEach(function (m) {
      pousser({ debut: m.index, fin: m.index + m[0].length, passage: m[0], genre: 'periode', explication: 'Période de plusieurs jours, pas une date unique : à confirmer.' });
    });

    /* Dates écrites avec le nom du mois : « 15 novembre », « pour le 1er décembre 2026 », « 15 nov. ». */
    tous(new RegExp(PREP_DATE + '(\\d{1,2})(?:er)?' + ESP + '+' + MOIS_RE + '(?:' + ESP + '+(\\d{4})(?!\\d))?', 'gi'), texte, function (m) {
      var i = m.index + m[0].search(/\d/);
      var avant = precedent(texte, m.index);
      return !/[\d/]/.test(avant) && debutNombre(texte, i);
    }).forEach(function (m) {
      var mois = numMois(m[2]);
      var annee = m[3] ? +m[3] : refAnnee;
      explicite(m.index, m.index + m[0].length, annee, mois, +m[1], !!m[3]);
    });

    /* Dates numériques : « 15/11/2026 », « 15/11/26 », « 15/11 » (avec contexte), « 15-11-2026 », « 15.11.2026 », « 2026-11-15 ». */
    tous(/(\d{1,2})([/.-])(\d{1,2})(?:\2(\d{4}|\d{2}))?(?!\d)/g, texte, function (m) {
      if (!debutNombre(texte, m.index)) return false;
      var suivant = texte.charAt(m.index + m[0].length);
      if (/[/.-]/.test(suivant) && /\d/.test(texte.charAt(m.index + m[0].length + 1))) return false;
      var sep = m[2];
      if (sep !== '/' && !m[4]) return false;
      if (sep !== '/' && m[4].length !== 4) return false;
      return true;
    }).forEach(function (m) {
      var j = +m[1], mo = +m[3];
      var avecAnnee = !!m[4];
      var annee = avecAnnee ? (m[4].length === 2 ? 2000 + +m[4] : +m[4]) : refAnnee;
      /* Sans année, « 24/7 » ou « 3/4 » ne sont pas des dates : il faut une préposition de date juste avant (« pour le », « avant le »…) ou un mot d'échéance dans la phrase. */
      if (!avecAnnee) {
        var avant = texte.slice(Math.max(0, m.index - 30), m.index);
        var phr = phrase(texte, m.index, m.index + m[0].length).texte;
        var prepositionProche = /(?:\b(?:le|au|du)|\bjusqu['’]au?|\b(?:avant|d['’]ici|dès|vers))\s*$/i.test(avant);
        if (!prepositionProche && !CONTEXTE_DATE.test(phr)) return;
      }
      explicite(m.index, m.index + m[0].length, annee, mo, j, avecAnnee);
    });
    tous(/(\d{4})-(\d{2})-(\d{2})(?!\d)/g, texte, function (m) { return debutNombre(texte, m.index); }).forEach(function (m) {
      explicite(m.index, m.index + m[0].length, +m[1], +m[2], +m[3], true);
    });

    /* Jours de la semaine : ambigus (« vendredi prochain » : de quelle semaine ?), jamais convertis en date. */
    tous(/(?:\b(?:pour|avant|d['’]ici|jusqu['’]à|jusqu['’]au|pour ce|dès)\s+(?:le\s+)?(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b(?:\s+(?:prochain|suivant))?|\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(?:prochain|suivant)\b)/gi, texte).forEach(function (m) {
      pousser({ debut: m.index, fin: m.index + m[0].length, passage: m[0], genre: 'jour_semaine', explication: 'Jour de la semaine sans date : on ne sait pas de quelle semaine il s\'agit. À confirmer.' });
    });

    /* Délais vagues : jamais de date inventée. */
    var vagues = [
      '(?:(?:avant|pour|d[\'’]ici|vers|dès|courant|en)' + ESP + '+)?(?:tout' + ESP + '+d[ée]but|toute' + ESP + '+fin|d[ée]but|fin|mi|milieu|courant)(?:' + ESP + '+|-)(?:du' + ESP + '+mois' + ESP + '+de' + ESP + '+|de' + ESP + '+|d[\'’]|du' + ESP + '+)?' + MOIS_RE + '(?:' + ESP + '+\\d{4})?',
      '(?:avant|pour|d[\'’]ici|vers|dès|courant|en|au' + ESP + '+mois' + ESP + 'de|pour' + ESP + '+le' + ESP + '+mois' + ESP + 'de)' + ESP + '+(?:le' + ESP + '+mois' + ESP + '+d[e\'’]' + ESP + '*)?' + MOIS_RE + '(?:' + ESP + '+\\d{4})?',
      MOIS_RE + ESP + '+20\\d\\d',
      '(?:le' + ESP + '+)?mois' + ESP + '+prochain|ce' + ESP + '+mois-ci|(?:la' + ESP + '+)?semaine' + ESP + '+prochaine|cette' + ESP + '+semaine|ce' + ESP + '+week-end',
      '(?:dans|d[\'’]ici)' + ESP + '+(?:\\d+|un|une|deux|trois|quatre|cinq|six|quelques|plusieurs)' + ESP + '+(?:jours?|semaines?|mois)',
      '\\bdemain\\b|\\bapr[èe]s-demain\\b|\\baujourd[\'’]hui\\b',
      '\\bprochainement\\b|\\brapidement\\b|\\bau' + ESP + '+plus' + ESP + '+vite\\b|\\bd[èe]s' + ESP + '+que' + ESP + '+possible\\b|\\basap\\b|\\ble' + ESP + '+plus' + ESP + '+t[ôo]t' + ESP + '+possible\\b|\\bdans' + ESP + '+les' + ESP + '+(?:meilleurs|plus' + ESP + '+brefs)' + ESP + '+d[ée]lais\\b|\\bsans' + ESP + '+tarder\\b|à' + ESP + '+court' + ESP + '+terme\\b',
      '(?:pour|avant|d[\'’]ici)' + ESP + '+(?:No[ëe]l|P[âa]ques|la' + ESP + '+rentr[ée]e|l[\'’][ée]t[ée]|l[\'’]automne|l[\'’]hiver|le' + ESP + '+printemps|les' + ESP + '+f[êe]tes|les' + ESP + '+vacances|la' + ESP + '+fin' + ESP + '+(?:de' + ESP + '+l[\'’]ann[ée]e|du' + ESP + '+mois|de' + ESP + '+la' + ESP + '+semaine)|fin' + ESP + '+(?:d[\'’]ann[ée]e|de' + ESP + '+mois))',
      '(?:à|pour)' + ESP + '+la' + ESP + '+rentr[ée]e|\\bfin' + ESP + '+d[\'’]ann[ée]e\\b|\\bd[ée]but' + ESP + '+d[\'’]ann[ée]e\\b|\\bl[\'’]ann[ée]e' + ESP + '+prochaine\\b|\\bcet' + ESP + '+(?:[ée]t[ée]|automne|hiver)\\b|\\bce' + ESP + '+printemps\\b|\\bau' + ESP + '+printemps\\b',
      '(?:au|le)' + ESP + '+(?:premier|deuxi[èe]me|second|troisi[èe]me|quatri[èe]me|1er|2e|3e|4e)' + ESP + '+trimestre(?:' + ESP + '+\\d{4})?|\\bT[1-4]' + ESP + '*20\\d\\d\\b',
      '\\burgent(?:e|es|s)?\\b|\\ben' + ESP + '+urgence\\b|\\burgence\\b'
    ];
    vagues.forEach(function (src) {
      tous(new RegExp(src, 'gi'), texte, function (m) { return debutMot(texte, m.index); }).forEach(function (m) {
        pousser({ debut: m.index, fin: m.index + m[0].length, passage: m[0], genre: 'vague', explication: 'Délai vague : aucune date n\'est déduite.' });
      });
    });

    cands.sort(function (x, y) { return x.debut - y.debut; });
    return cands;
  }

  function releverDelai(texte, ref) {
    var cands = candidatsDates(texte, ref);
    if (!cands.length) return vide();

    var precises = cands.filter(function (c) { return c.genre === 'precise'; });
    var anormales = cands.filter(function (c) { return c.genre === 'invalide' || c.genre === 'passee' || c.genre === 'periode' || c.genre === 'jour_semaine'; });
    var vagues = cands.filter(function (c) { return c.genre === 'vague'; });
    var distinctes = [];
    precises.forEach(function (c) { if (!distinctes.some(function (d) { return d.iso === c.iso; })) distinctes.push(c); });

    function valeurVague(c) { return { texte: c.passage, date: null, precision: 'vague' }; }

    if (distinctes.length > 1) {
      return champ('a_verifier', null, distinctes[0].passage, 'Plusieurs dates différentes : une personne doit confirmer laquelle est l\'échéance.', distinctes.map(function (c) { return c.passage; }));
    }
    if (distinctes.length === 1 && !anormales.length) {
      var c = distinctes[0];
      return champ('releve', { texte: c.passage, date: c.iso, precision: 'precise' }, c.passage, c.explication);
    }
    if (anormales.length) {
      var a = anormales[0];
      if (distinctes.length) return champ('a_verifier', null, a.passage, 'Plusieurs indications de date, dont une ambiguë : une personne doit confirmer.', distinctes.concat(anormales).map(function (x) { return x.passage; }));
      return champ('a_verifier', valeurVague(a), a.passage, a.explication, cands.length > 1 ? cands.map(function (x) { return x.passage; }) : []);
    }
    /* Vagues : on écarte « urgent » s'il y a une autre indication plus précise. */
    var reelles = vagues.filter(function (c) { return !/urgen/i.test(c.passage); });
    var utiles = reelles.length ? reelles : vagues;
    var uniq = [];
    utiles.forEach(function (c) { if (!uniq.some(function (u) { return sansAccents(u.passage) === sansAccents(c.passage); })) uniq.push(c); });
    if (uniq.length > 1) {
      return champ('a_verifier', valeurVague(uniq[0]), uniq[0].passage, 'Plusieurs indications de délai différentes : une personne doit confirmer.', uniq.map(function (c) { return c.passage; }));
    }
    return champ('releve', valeurVague(uniq[0]), uniq[0].passage, uniq[0].explication);
  }

  /* ------------------------------------------------------------------ */
  /* Service                                                             */
  /* ------------------------------------------------------------------ */

  var MOTS_SERVICE = [
    { id: 'web', re: /\bsite\s+(?:web|internet|vitrine|e-?commerce|marchand)\b|\b(?:notre|votre|mon|ton|le|un|ce|nouveau|actuel)\s+site(?!\s+(?:de|d['’]|industriel|historique))\b|\brefonte\s+(?:compl[èe]te\s+|totale\s+)?(?:de\s+|du\s+|d['’])?(?:notre\s+|votre\s+|mon\s+|le\s+|la\s+|l['’])?(?:site|boutique|plateforme|page)|boutique\s+en\s+ligne|\be-?shop\b|\be-?commerce\b|nom\s+de\s+domaine|landing\s*page|page\s+web|pages?\s+(?:à|a)\s+ajouter|webdesign|d[ée]veloppement\s+web|\bwebsite\b/i },
    { id: 'seo', re: /r[ée]f[ée]rencement|\bSEO\b|r[ée]f[ée]rencer|visibilit[ée]\s+(?:sur\s+)?(?:google|internet|en\s+ligne)|positionn(?:er|ement)\s+(?:sur\s+)?google|premi[èe]re\s+page\s+de\s+google|mots-cl[ée]s|fiches?\s+produits?|mieux\s+trouv[ée]s/i },
    { id: 'social', re: /r[ée]seaux\s+sociaux|instagram|facebook|linkedin|tiktok|community\s*manag\w*|calendrier\s+(?:de\s+publication|[ée]ditorial)|campagne\s+(?:sur\s+les\s+r[ée]seaux|social\w*)/i },
    { id: 'identite', re: /\blogos?\b|charte\s+graphique|identit[ée]\s+(?:visuelle|graphique|de\s+marque)|[ée]tiquettes?\b|branding|image\s+de\s+marque|packaging/i },
    { id: 'newsletter', re: /newsletters?|e-?mailings?|infolettres?|campagne\s+d['’]e-?mail|lettre\s+d['’]information/i },
    { id: 'video', re: /vid[ée]os?\b|\bfilm\b|tournage|clip\b|\bdrone\b|captation|motion\s+design|\bteaser\b/i },
    { id: 'evenementiel', re: /\bsalons?\b|\bstands?\b|roll-?up|kak[ée]mono|signal[ée]tique|[ée]v[èe]nements?\b|congr[èe]s|portes?\s+ouvertes|banderole/i },
    { id: 'redaction', re: /r[ée]daction|r[ée]diger|articles?\s+de\s+blog|\barticles\b|brochures?|plaquettes?|communiqu[ée]s?\s+de\s+presse|copywriting|livre\s+blanc|contenus?\s+(?:r[ée]dactionnels?|[ée]ditoriaux?)|d[ée]pliants?/i },
    { id: 'conseil', re: /\bateliers?\b|s[ée]ance\s+de\s+conseil|accompagnement|conseil\s+en\s+communication|audit\s+de\s+communication|strat[ée]gie\s+de\s+communication|coaching/i },
    { id: 'hors_catalogue', re: /impression|imprimer|imprimerie|flyers?|traduction|traduire|traducteur|informatique|d[ée]pannage|ordinateurs?|\bserveurs?\b|imprimante|comptabilit[ée]|logiciel\s+de\s+gestion|installation\s+(?:de|d['’])\s*(?:un\s+)?(?:r[ée]seau|wifi|serveur)/i }
  ];

  function releverService(texte, ctx) {
    var trouves = [];
    MOTS_SERVICE.forEach(function (s) {
      var re = new RegExp(s.re.source, 'gi');
      var m = re.exec(texte);
      if (m) trouves.push({ id: s.id, passage: m[0], debut: m.index });
    });
    if (!trouves.length) return vide();
    trouves.sort(function (a, b) { return a.debut - b.debut; });
    if (trouves.length === 1) return champ('releve', trouves[0].id, trouves[0].passage, null);
    var libelles = trouves.map(function (t) { return Fmt.premiereMinuscule(Ctx.libelleService(ctx, t.id)); });
    return champ('a_verifier', null, trouves[0].passage, 'Plusieurs services évoqués (' + libelles.join(', ') + ') : une personne choisit par lequel commencer.',
      trouves.map(function (t) { return t.passage; }));
  }

  /* ------------------------------------------------------------------ */
  /* Besoin                                                              */
  /* ------------------------------------------------------------------ */

  var RE_BESOIN = /\b(?:nous|je|on|j['’])\s*(?:souhaitons|souhaite|voudrions|voudrais|voulons|veux|cherchons|cherche|aimerions|aimerais|avons\s+besoin|ai\s+besoin|aurions\s+besoin|aurais\s+besoin|envisageons|envisage|pr[ée]voyons|recherchons|demandons|lan[çc]ons|allons\s+refaire|voulons\s+refaire)\b|\bbesoin\s+d|\bil\s+(?:nous|me)\s+faut\b|\bdemande\s+de\s+(?:devis|renseignements|proposition)|\bprojet\s+de\b|\bwe\s+(?:need|want|would\s+like|are\s+looking)\b/i;
  var RE_BESOIN_FAIBLE = /\b(?:pouvez-vous|pourriez-vous)\s+(?:nous\s+)?(?:r[ée]aliser|cr[ée]er|faire|proposer|accompagner|aider)\b/i;
  var RE_META = /\b(?:pouvez-vous|pourriez-vous)\s+(?:nous\s+)?(?:dire|indiquer|pr[ée]ciser|envoyer|communiquer|contacter|rappeler|confirmer)\b/i;

  function phrases(texte) {
    var res = [], re = /[^.!?\n]+[.!?]*/g, m;
    while ((m = re.exec(texte)) !== null) {
      var brut = m[0];
      var t = brut.replace(/^\s+/, '');
      var deb = m.index + (brut.length - t.length);
      t = t.replace(/\s+$/, '');
      if (t.length) res.push({ texte: t, debut: deb });
    }
    return res;
  }

  function releverBesoin(texte) {
    var liste = phrases(texte).filter(function (p) { return p.texte.charAt(0) !== '>' && !/^(?:bonjour|bonsoir|madame|monsieur|cordialement|merci)\b[^.!?]{0,30}[,.!]?$/i.test(p.texte); });
    var forte = liste.filter(function (p) { return RE_BESOIN.test(p.texte); })[0];
    var choisie = forte || liste.filter(function (p) { return RE_BESOIN_FAIBLE.test(p.texte) && !RE_META.test(p.texte); })[0];
    if (!choisie) return vide();
    var t = choisie.texte.replace(/^(?:bonjour|bonsoir|salut|hello)\b[^,.!?]{0,25}[,.!]\s*/i, '');
    if (t.length > 280) { t = t.slice(0, 280); var i = t.lastIndexOf(' '); if (i > 200) t = t.slice(0, i); }
    t = t.replace(/[\s,;:]+$/, '');
    return champ('releve', t, t, null);
  }

  /* ------------------------------------------------------------------ */
  /* Entreprise et contact                                               */
  /* ------------------------------------------------------------------ */

  var NOM = '[' + MAJ + '][' + LETTRE + '0-9\'’&.-]*(?:' + ESP + '+(?:(?:de|du|des|d[\'’]|la|le|les|et|&|sur|en|aux?|l[\'’])' + ESP + '*)?[' + MAJ + '0-9][' + LETTRE + '0-9\'’&.-]*){0,5}';
  var MOTS_ENTREPRISE = 'Boulangerie|P[âa]tisserie|Brasserie|Cabinet|Association|H[ôo]tel|Clinique|Garage|Menuiserie|Studio|Atelier|Domaine|Maison|P[ée]pini[èe]res?|Fromagerie|Cave|Office|Communaut[ée]|F[ée]d[ée]ration|Coop[ée]rative|R[ée]sidence|SARL|SAS|SASU|EURL|Soci[ée]t[ée]|Entreprise|Groupe|Institut|Agence|Restaurant|Caf[ée]|Boutique|Librairie|Pharmacie|Mairie|Cr[êe]perie|Boucherie|Imprimerie|Quincaillerie|Fleuriste|Salon|Auberge|Ferme|Exploitation|Transports?|Plomberie|Charpente|[ÉE]lectricit[ée]|Jardinerie|Opticien|Optique|Laboratoire|Clinique|Cidrerie|Distillerie|Tonnellerie|Coop';
  var RE_LIGNE_ENTREPRISE = new RegExp('^(?:' + MOTS_ENTREPRISE + ')(?![' + LETTRE + '])[^@\\d]{0,60}$');
  var FONCTION = '(?:[Gg][ée]rant(?:e)?|[Dd]irect(?:eur|rice)|[Rr]esponsable[^,\\n]{0,30}|[Ff]ondat(?:eur|rice)|[Cc]o-?fondat(?:eur|rice)|[Pp]r[ée]sident(?:e)?|[Dd]irigeant(?:e)?|[Aa]ssistant(?:e)?[^,\\n]{0,25}|[Cc]harg[ée]{1,2}[^,\\n]{0,30}|[Cc]hef(?:fe)?[^,\\n]{0,25})';
  var FONCTION_COURTE = '(?:[Gg][ée]rant(?:e)?|[Dd]irect(?:eur|rice)|[Rr]esponsable|[Ff]ondat(?:eur|rice)|[Cc]o-?fondat(?:eur|rice)|[Pp]r[ée]sident(?:e)?|[Dd]irigeant(?:e)?|[Aa]ssistant(?:e)?|[Cc]harg[ée]{1,2}|[Cc]hef(?:fe)?)';
  var RE_FONCTION_ENTREPRISE = new RegExp('^(' + FONCTION + ')\\s*[,–-]\\s*(' + NOM + ')\\s*$');
  var INTERDITS_ENTREPRISE = /^(?:Bonjour|Bonsoir|Madame|Monsieur|Cordialement|Merci|Salut|Hello|Oui|Non|Nous|Notre|Votre|Vous|Je|Le|La|Les)$/;

  function agenceNom(ctx) { return Fmt.norm(ctx && ctx.agence ? ctx.agence.nom : 'Agence Exemple Fictive'); }

  function candidatsEntreprise(texte, ctx) {
    var res = [];
    var nomAgence = agenceNom(ctx);
    function ajouter(nom, passage) {
      nom = nom.replace(/[\s.,;:]+$/, '');
      passage = passage.replace(/[\s.,;:]+$/, '');
      if (!nom || nom.length < 3 || INTERDITS_ENTREPRISE.test(nom.split(/\s+/)[0]) && nom.split(/\s+/).length === 1) return;
      if (Fmt.norm(nom).indexOf(nomAgence) >= 0 || nomAgence.indexOf(Fmt.norm(nom)) >= 0) return;
      if (texte.indexOf(passage) < 0) return;
      res.push({ nom: nom, passage: passage });
    }
    /* « Nous sommes la Boulangerie Dupré » */
    tous(new RegExp('Nous' + ESP + '+sommes' + ESP + '+(?:(?:la|le|l[\'’]|une?)' + ESP + '*)?(?:(?:soci[ée]t[ée]|entreprise|association|agence|maison|cabinet|groupe)' + ESP + '+)?(' + NOM + ')', 'g'), texte).forEach(function (r) { ajouter(r[1], r[1]); });
    /* « la société Alpha », « l'association Sentiers Ouverts », « le cabinet Delorme Conseil » */
    tous(new RegExp('(?:soci[ée]t[ée]|entreprise|association|[ée]tablissement|fondation|agence|cabinet|maison)' + ESP + '+(' + NOM + ')', 'g'), texte).forEach(function (r) {
      if (/^(?:de|du|des)\b/.test(r[1])) return;
      ajouter(r[1], r[1]);
    });
    /* « gérante de la Boulangerie Dupré », « directeur de Alpha » */
    tous(new RegExp(FONCTION_COURTE + '(?:' + ESP + '+[a-zà-ÿ]+){0,2}' + ESP + '+(?:de' + ESP + '+la' + ESP + '+|de' + ESP + '+l[\'’]|du' + ESP + '+|des' + ESP + '+|de' + ESP + '+|chez' + ESP + '+|d[\'’])(' + NOM + ')', 'g'), texte).forEach(function (r) { ajouter(r[1], r[1]); });
    /* « chez Alpha » */
    tous(new RegExp('\\bchez' + ESP + '+(' + NOM + ')', 'g'), texte).forEach(function (r) { ajouter(r[1], r[1]); });
    /* Forme juridique : « Alpha SARL » */
    tous(new RegExp('(' + NOM + ')' + ESP + '+(?:SARL|SASU|SAS|EURL|SCI|SNC)\\b', 'g'), texte).forEach(function (r) { ajouter(r[1], r[1]); });
    /* Signature : « Gérante, Boulangerie Dupré » ou ligne qui commence par un mot d'entreprise. */
    var lignes = texte.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    lignes.slice(-6).forEach(function (l) {
      var f = RE_FONCTION_ENTREPRISE.exec(l);
      if (f) { ajouter(f[2], f[2]); return; }
      if (RE_LIGNE_ENTREPRISE.test(l) && l.split(/\s+/).length <= 8 && !/^(?:Je|Nous|Notre|Votre)\b/.test(l)) ajouter(l, l);
    });
    return res;
  }

  function releverEntreprise(texte, ctx) {
    var cands = candidatsEntreprise(texte, ctx);
    if (!cands.length) return vide();
    var uniques = [];
    cands.forEach(function (c) {
      var n = Fmt.norm(c.nom);
      var idx = -1;
      uniques.forEach(function (u, k) { var un = Fmt.norm(u.nom); if (un === n || un.indexOf(n) >= 0 || n.indexOf(un) >= 0) idx = k; });
      if (idx < 0) uniques.push(c);
      else if (Fmt.norm(c.nom).length > Fmt.norm(uniques[idx].nom).length) uniques[idx] = c;
    });
    if (uniques.length > 1) return champ('a_verifier', uniques[0].nom, uniques[0].passage, 'Plusieurs noms d\'organisation : une personne confirme laquelle est le demandeur.', uniques.map(function (u) { return u.passage; }));
    return champ('releve', uniques[0].nom, uniques[0].passage, null);
  }

  var RE_FORMULE = /^(?:cordialement|bien cordialement|très cordialement|bien à vous|bien à toi|amicalement|salutations(?: distingu[ée]es)?|respectueusement|cdlt|bonne (?:journ[ée]e|soir[ée]e|fin de journ[ée]e)|[àa] bient[ôo]t|merci(?: d['’]avance| beaucoup)?|sinc[èe]res salutations|dans l['’]attente de votre retour|best regards|kind regards)\b[\s,.!-]*(.*)$/i;
  var RE_PRENOM_NOM = new RegExp('^[' + MAJ + '][' + LETTRE + '\'’-]+(?:' + ESP + '+(?:de|du|le|la|van|von|d\')' + ESP + '*)?(?:' + ESP + '+[' + MAJ + '][' + LETTRE + '\'’-]+){1,3}$');
  var RE_PRENOM = new RegExp('^[' + MAJ + '][' + LETTRE + '\'’-]+$');
  var RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
  var RE_TEL = /(?:\+33[ .]?[1-9]|0[1-9])(?:[ .-]?\d{2}){4}\b/g;

  function agenceAdresse(ctx) { return ctx && ctx.agence ? ctx.agence.adresse_boite : 'contact@agence-exemple-fictive.example'; }

  function nomValide(l) {
    return RE_PRENOM_NOM.test(l) && !new RegExp('^(?:' + MOTS_ENTREPRISE + ')\\b').test(l) && !new RegExp('^' + FONCTION).test(l) && !/@|\d/.test(l);
  }

  function releverContact(texte, ctx) {
    var email = null, tel = null;
    var adr = agenceAdresse(ctx).toLowerCase();
    tous(RE_EMAIL, texte).some(function (m) { if (m[0].toLowerCase() !== adr) { email = m[0]; return true; } return false; });
    var tels = tous(RE_TEL, texte);
    if (tels.length) tel = tels[0][0];

    var nom = null, fonction = null, passage = null;
    var lignes = texte.split('\n');
    for (var i = 0; i < lignes.length && !nom; i++) {
      var f = RE_FORMULE.exec(lignes[i].trim());
      if (!f) continue;
      var reste = f[1].trim();
      if (reste && (nomValide(reste) || RE_PRENOM.test(reste))) { nom = reste; passage = reste; }
      else {
        for (var k = i + 1; k < Math.min(lignes.length, i + 4); k++) {
          var l = lignes[k].trim();
          if (!l) continue;
          if (nomValide(l) || RE_PRENOM.test(l)) { nom = l; passage = l; }
          break;
        }
      }
    }
    if (!nom) {
      /* Signature sans formule de politesse : une ligne qui ressemble à un nom, parmi les dernières lignes du message. */
      var utiles = lignes.map(function (x) { return x.trim(); }).filter(Boolean);
      var fin = utiles.slice(-4);
      for (var q = 0; q < fin.length && !nom; q++) {
        var suivante = fin[q + 1] || '';
        if (RE_FORMULE.test(fin[q]) || INTERDITS_ENTREPRISE.test(fin[q])) continue;
        if (nomValide(fin[q])) { nom = fin[q]; passage = fin[q]; }
        else if (RE_PRENOM.test(fin[q]) && (q === fin.length - 1 || /@|^\+?[\d ]{8,}/.test(suivante))) { nom = fin[q]; passage = fin[q]; }
      }
    }
    if (!nom) {
      var p = new RegExp('(?:Je' + ESP + '+m[\'’]appelle|Moi' + ESP + '+c[\'’]est|Je' + ESP + '+suis)' + ESP + '+(' + RE_PRENOM_NOM.source.replace(/^\^|\$$/g, '') + ')', 'g');
      var mm = tous(p, texte).filter(function (r) { return nomValide(r[1]); })[0];
      if (mm) { nom = mm[1]; passage = mm[1]; }
    }
    if (nom) {
      for (var j = 0; j < lignes.length; j++) {
        var fe = RE_FONCTION_ENTREPRISE.exec(lignes[j].trim());
        if (fe) { fonction = fe[1]; break; }
        var seul = new RegExp('^' + FONCTION + '$').exec(lignes[j].trim());
        if (seul) { fonction = seul[0]; break; }
      }
      if (passage && texte.indexOf(passage) < 0) passage = null;
      var valeur = { nom: nom, fonction: fonction, email: email, telephone: tel };
      if (RE_PRENOM.test(nom)) return champ('a_verifier', valeur, passage, 'Prénom seul : le nom complet manque.');
      return champ('releve', valeur, passage, null);
    }
    if (email || tel) {
      var coord = email || tel;
      return champ('a_verifier', { nom: null, fonction: null, email: email, telephone: tel }, coord, 'Des coordonnées sont écrites mais aucun nom : à confirmer.');
    }
    return vide();
  }

  /* ------------------------------------------------------------------ */
  /* Raisons de revue et alertes                                         */
  /* ------------------------------------------------------------------ */

  var RE_ANGLAIS = /\b(?:the|and|we|our|you|your|please|would|need|with|from|have|could|looking|project|website|redesign|launch|about)\b/gi;

  function raisonsRevue(texte, champs) {
    var r = [];
    function ajouter(x) { if (r.indexOf(x) < 0) r.push(x); }
    if (champs.budget.statut === 'a_verifier') ajouter('budget_ambigu');
    if (champs.delai.statut === 'a_verifier') ajouter('delai_ambigu');
    if (champs.service.statut === 'a_verifier') ajouter('plusieurs_services');
    if (champs.service.statut === 'releve' && champs.service.valeur === 'hors_catalogue') ajouter('hors_perimetre');
    if (/\burgent(?:e|es|s)?\b|\burgence\b|\bASAP\b|\ben urgence\b/i.test(texte)) ajouter('urgence');
    if (/rappel(?:ez|er|lez)[- ]?(?:moi|nous)|appel(?:ez|er|lez)[- ]?(?:moi|nous)|me rappeler|nous rappeler|être rappel[ée]|un appel\b|par t[ée]l[ée]phone|[ée]change t[ée]l[ée]phonique/i.test(texte)) ajouter('demande_appel');
    if (/pi[èe]ce\s+jointe|pi[èe]ces\s+jointes|ci-joint|en\s+pj\b|\bPJ\b|vous\s+trouverez\s+(?:en\s+)?joint|je\s+joins|nous\s+joignons|document\s+joint/i.test(texte)) ajouter('piece_jointe_non_lue');
    if (/(?:^|\n)\s*(?:-{2,}\s*)?(?:message\s+transf[ée]r[ée]|forwarded\s+message|d[ée]but\s+du\s+message\s+transf[ée]r[ée])|(?:^|\n)\s*(?:TR|Fwd|Fw)\s*:|je\s+vous\s+transf[èe]re/i.test(texte)) ajouter('message_transfere');
    if (/je\s+me\s+permets\s+de\s+(?:vous\s+)?relancer|je\s+reviens\s+vers\s+vous|sans\s+nouvelles|toujours\s+(?:pas\s+de|sans)\s+r[ée]ponse|n['’]ai\s+pas\s+eu\s+de\s+retour|pas\s+de\s+r[ée]ponse\s+à\s+mon/i.test(texte)) ajouter('relance_prospect');
    var mots = (texte.match(/[A-Za-zÀ-ÿ']+/g) || []).length;
    var anglais = (texte.match(RE_ANGLAIS) || []).length;
    if (anglais >= 5 && anglais / Math.max(1, mots) > 0.06) ajouter('langue_etrangere');
    if (texte.length > 1500) ajouter('texte_confus');
    return r;
  }

  /** Alerte si le texte semble contenir des coordonnées réelles : adresse hors .example ou numéro autre que les numéros fictifs. */
  function donneesReelles(texte) {
    var res = [];
    tous(RE_EMAIL, texte).forEach(function (m) { if (!/\.example$/i.test(m[0])) res.push('adresse e-mail « ' + m[0] + ' »'); });
    tous(RE_TEL, texte).forEach(function (m) { if (m[0].replace(/\D/g, '') !== '0123456789' && m[0].replace(/\D/g, '') !== '0612345678') res.push('numéro de téléphone « ' + m[0] + ' »'); });
    return res;
  }

  /* ------------------------------------------------------------------ */
  /* Relevé complet                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Relève les informations d'un texte collé. ctx : réglages de l'agence (catalogue, signature) ; ref : date de référence de la démonstration (jamais l'horloge).
   * Renvoie { vide, tropLong, texte, champs{six}, revue[], alertes[], enRevue, nbReleves, nbAbsents, nbAVerifier }.
   */
  function relever(texteBrut, ctx, ref) {
    var texte = String(texteBrut === null || texteBrut === undefined ? '' : texteBrut).replace(/\r\n?/g, '\n');
    var tropLong = texte.length > LONGUEUR_MAX;
    if (tropLong) texte = texte.slice(0, LONGUEUR_MAX);
    if (!texte.replace(/\s+/g, '').length) {
      var champsVides = {};
      CHAMPS.forEach(function (c) { champsVides[c] = vide(); });
      return { vide: true, tropLong: false, texte: texte, champs: champsVides, revue: [], alertes: [], enRevue: false, nbReleves: 0, nbAbsents: 6, nbAVerifier: 0 };
    }
    var champs = {
      besoin: releverBesoin(texte),
      service: releverService(texte, ctx),
      budget: releverBudget(texte),
      delai: releverDelai(texte, ref),
      entreprise: releverEntreprise(texte, ctx),
      contact: releverContact(texte, ctx)
    };
    var revue = raisonsRevue(texte, champs);
    if (texte.length > 1500 && champs.besoin.statut === 'releve') {
      champs.besoin = champ('a_verifier', champs.besoin.valeur, champs.besoin.passage, 'Message long : le besoin est à confirmer avec la personne.');
    }
    var n = { releve: 0, absent: 0, a_verifier: 0 };
    CHAMPS.forEach(function (c) { n[champs[c].statut]++; });
    return {
      vide: false, tropLong: tropLong, texte: texte, champs: champs, revue: revue, alertes: donneesReelles(texte),
      enRevue: revue.length > 0 || n.a_verifier > 0, nbReleves: n.releve, nbAbsents: n.absent, nbAVerifier: n.a_verifier
    };
  }

  /** Message de la démonstration à partir d'un relevé : permet de réutiliser le surlignage et le générateur de brouillon. */
  function versEmail(rel, ctx, ref) {
    var releves = {};
    CHAMPS.forEach(function (c) {
      var r = rel.champs[c];
      releves[c] = { statut: r.statut, valeur: r.valeur, passage: r.passage };
    });
    var service = rel.champs.service;
    var contact = rel.champs.contact;
    var horsPerimetre = service.statut === 'releve' && service.valeur === 'hors_catalogue';
    var nom = contact.valeur && contact.valeur.nom ? contact.valeur.nom : 'Madame, Monsieur';
    var adresse = contact.valeur && contact.valeur.email ? contact.valeur.email : 'expediteur@exemple.example';
    var objet = rel.champs.besoin.valeur ? Fmt.extrait(rel.champs.besoin.valeur, 60) : 'Votre demande';
    var marqueurs = [];
    if (rel.revue.indexOf('urgence') >= 0 && rel.revue.indexOf('demande_appel') >= 0) marqueurs.push('appel_urgent');
    if (rel.revue.indexOf('relance_prospect') >= 0) marqueurs.push('relance');
    return {
      id: 'essai', message_id: 'essai@exemple.example', fil: 'essai', en_reponse_a: null, doublon_de: null,
      de: { nom: nom, adresse: adresse }, a: [{ nom: ctx.agence.nom, adresse: ctx.agence.adresse_boite }], cc: [],
      objet: objet, date: ref, corps: rel.texte, pieces_jointes: [], marqueurs: marqueurs,
      categorie: horsPerimetre ? 'hors_perimetre' : 'nouvelle_demande', releves: releves, revue: rel.revue.slice(),
      traitement: { statut: 'a_traiter', responsable: null, premiere_reponse: null, note: null }
    };
  }

  /** Brouillon préparé pour le texte collé (mêmes règles que le reste de l'outil ; jamais envoyé). */
  function brouillon(rel, ctx, ref) {
    var e = versEmail(rel, ctx, ref);
    return { email: e, brouillon: Br.construire(e, ctx, { emails: [], questionsService: false }) };
  }

  /* ------------------------------------------------------------------ */
  /* Exemples fictifs                                                    */
  /* ------------------------------------------------------------------ */

  var EXEMPLES = [
    {
      id: 'complet', titre: 'Demande complète',
      resume: 'Budget, délai, service et signature écrits : tout est relevé.',
      texte: 'Bonjour,\n\nNous sommes la Pâtisserie Lambert, deux boutiques en centre-ville. Nous souhaitons refaire notre site internet, avec une page par boutique et un formulaire pour commander des gâteaux.\n\nNotre budget se situe entre 3 et 5 k€. Nous aimerions que le nouveau site soit en ligne pour le 15/12/2026.\n\nPourriez-vous nous proposer un rendez-vous ?\n\nCordialement,\nMarion Lambert\nGérante, Pâtisserie Lambert\nmarion@patisserie-lambert.example'
    },
    {
      id: 'incomplet', titre: 'Demande très courte',
      resume: 'Ni budget ni délai : ils restent absents, rien n\'est deviné.',
      texte: 'Bonjour, nous aurions besoin d\'un logo pour notre cabinet de kinésithérapie. Pouvez-vous nous contacter ?\n\nPaul Martin\nCabinet de kinésithérapie des Lilas'
    },
    {
      id: 'piege', titre: 'Message piégé',
      resume: 'Deux montants, deux services, une urgence : ce qui est ambigu passe en revue.',
      texte: 'Bonjour,\n\nURGENT. Nous voulons refaire notre site internet et aussi améliorer notre référencement. Nous avons prévu 2 500 € par mois, soit 7 500 € au total. Idéalement pour fin janvier, ou au plus tard vendredi prochain.\n\nNotre chiffre d\'affaires est de 2 M€ et nous sommes 12 salariés. Le cahier des charges est en pièce jointe. Rappelez-moi dès que possible.\n\nJulie\njulie@exemple-travaux.example'
    }
  ];

  return {
    CHAMPS: CHAMPS, LONGUEUR_MAX: LONGUEUR_MAX, MENTION_REGLES: MENTION_REGLES, AVERTISSEMENT: AVERTISSEMENT, EXEMPLES: EXEMPLES,
    relever: relever, versEmail: versEmail, brouillon: brouillon, donneesReelles: donneesReelles,
    releverBudget: releverBudget, releverDelai: releverDelai, releverService: releverService, releverBesoin: releverBesoin,
    releverEntreprise: releverEntreprise, releverContact: releverContact, raisonsRevue: raisonsRevue
  };
});
