/* Équerre : préparation à la facture électronique (tableau de bord de direction). Logique pure, déterministe, sans DOM :
 * la date de référence est toujours un paramètre. Les vues n'embarquent aucune règle de calcul : elles lisent ces résultats.
 *
 * Faits réglementaires (constants.js) : réception obligatoire à compter du 1er septembre 2026, émission obligatoire pour les PME,
 * TPE et micro-entreprises le 1er septembre 2027, quatre nouvelles mentions, amende de 50 € par facture plafonnée à 15 000 € par année civile.
 * Tout le reste (poids de l'indice, coefficients d'impact, efforts, seuil de concentration) est une hypothèse de travail,
 * affichée comme telle, et toute valeur dérivée est une estimation. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./constants.js'), require('./util.js'), require('./tiers.js'), require('./corrections.js'), require('./mentions.js'), require('./csv.js'));
  } else {
    var c = root.Equerre.core;
    c.readiness = factory(c.constants, c.util, c.tiers, c.corrections, c.mentions, c.csv);
  }
})(typeof self !== 'undefined' ? self : this, function (C, U, T, COR, M, CSV) {
  'use strict';

  var CLES_ORG = ['plateforme', 'responsable', 'logiciel', 'procedure'];
  var STATUTS_PLAN = ['a_faire', 'en_cours', 'fait'];
  var STATUTS_PLAN_LIBELLES = { a_faire: 'À faire', en_cours: 'En cours', fait: 'Fait' };
  var PRIORITES = { P1: 'Urgent', P2: 'Important', P3: 'À planifier' };
  var MENTIONS_ORDRE = ['siren_client', 'nature_operation', 'adresse_livraison', 'option_debits'];
  var MENTIONS_COURT = {
    siren_client: 'SIREN du client', nature_operation: 'nature de l\'opération',
    adresse_livraison: 'adresse de livraison', option_debits: 'option TVA d\'après les débits'
  };

  /** Règle de calcul de chaque composante de l'indice, en français simple (affichée dans les info-bulles). */
  var REGLES_COMPOSANTES = {
    fichier: 'Part des lignes du fichier tiers sans anomalie, après vos décisions de correction (estimation). Composante non évaluée sans fichier tiers ou sans colonne SIREN.',
    modeles: 'Part des 4 nouvelles mentions présentes sur les modèles de factures contrôlés (à défaut, sur l\'export des lignes de factures). Les mentions sans objet sont écartées (estimation).',
    organisation: Math.round(100 / CLES_ORG.length) + ' points par réponse « oui » aux ' + CLES_ORG.length + ' questions d\'organisation ; « non » et « ne sait pas » valent 0.'
  };

  function s(n, un, plusieurs) { return n + ' ' + (n > 1 ? plusieurs : un); }

  /* ------------------------------------------------------------------ */
  /* Calendrier                                                          */
  /* ------------------------------------------------------------------ */

  /** Nombre entier de jours calendaires de refIso à cibleIso (négatif si la cible est dépassée). */
  function joursRestants(refIso, cibleIso) {
    return U.daysBetween(refIso, cibleIso);
  }

  /** Compte à rebours jusqu'à l'obligation d'émettre et repère de la réception.
   *  phase : avant_reception | avant_emission | echeance_atteinte | echeance_depassee. */
  function compteARebours(refIso) {
    var avantEmission = joursRestants(refIso, C.DATE_EMISSION);
    var avantReception = joursRestants(refIso, C.DATE_RECEPTION);
    var phase = avantReception > 0 ? 'avant_reception' : avantEmission > 0 ? 'avant_emission' : avantEmission === 0 ? 'echeance_atteinte' : 'echeance_depassee';
    return {
      refIso: refIso, dateReception: C.DATE_RECEPTION, dateEmission: C.DATE_EMISSION,
      joursAvantEmission: avantEmission, joursAvantReception: avantReception, joursDepuisReception: -avantReception,
      joursDepassement: avantEmission < 0 ? -avantEmission : 0, phase: phase
    };
  }

  /** Jalons réglementaires et position proportionnelle de la date de référence entre les deux (0 à 1, bornée). */
  function jalons(refIso) {
    var total = joursRestants(C.DATE_RECEPTION, C.DATE_EMISSION);
    var depuis = -joursRestants(refIso, C.DATE_RECEPTION);
    var position = total > 0 ? Math.max(0, Math.min(1, depuis / total)) : 0;
    return {
      dateReception: C.DATE_RECEPTION, dateEmission: C.DATE_EMISSION, totalJours: total, joursDepuisReception: depuis,
      position: position, avant: depuis < 0, apres: depuis > total
    };
  }

  /* ------------------------------------------------------------------ */
  /* Indice de préparation (estimation)                                  */
  /* ------------------------------------------------------------------ */

  function nbOui(org) {
    var n = 0;
    CLES_ORG.forEach(function (k) { if (org && org[k] === 'oui') n++; });
    return n;
  }

  /** La colonne SIREN est-elle présente dans le fichier tiers (colonnes null = toutes) ? */
  function sirenEvaluable(colonnes) {
    return !colonnes || colonnes.indexOf('siren') >= 0;
  }

  /** Score du fichier tiers retenu pour l'indice, ou null si non évaluable (pas de fichier, pas de colonne SIREN). */
  function scoreTiersPourIndice(analysis, colonnes) {
    if (!analysis || analysis.score === null || analysis.score === undefined) return null;
    if (!sirenEvaluable(colonnes)) return null;
    return analysis.score;
  }

  /** Indice de préparation : p = { scoreTiers (null = non évalué), tiers:{clean,total,sansSiren}, modeles:{ok,total,nbModeles,unite},
   *  organisation:{plateforme,responsable,logiciel,procedure} }. Chaque composante non évaluable est écartée et l'indice est
   *  recalculé sur les poids restants (partiel = true). Valeurs arrondies à l'entier : la phrase de calcul affichée est exacte. */
  function indicePreparation(p) {
    p = p || {};
    var P = C.POIDS_INDICE;
    var tiers = p.tiers || {};
    var m = p.modeles || {};
    var comps = [];

    var fichierOk = typeof p.scoreTiers === 'number';
    comps.push({
      id: 'fichier', label: 'Fichier tiers', poidsPct: Math.round(P.fichier * 100), poids: P.fichier, evalue: fichierOk,
      valeur: fichierOk ? Math.round(p.scoreTiers) : null,
      detail: fichierOk
        ? (tiers.total ? s(tiers.clean, 'ligne', 'lignes') + ' sur ' + tiers.total + ' sans anomalie' : 'Score du fichier tiers')
        : (tiers.sansSiren ? 'Colonne SIREN absente du fichier : composante non évaluée' : 'Aucun fichier tiers importé : composante non évaluée')
    });

    var modOk = typeof m.total === 'number' && m.total > 0;
    var unite = m.unite === 'factures' ? 'factures de l\'export' : 'modèles de factures';
    comps.push({
      id: 'modeles', label: 'Modèles de factures', poidsPct: Math.round(P.modeles * 100), poids: P.modeles, evalue: modOk,
      valeur: modOk ? Math.round((100 * m.ok) / m.total) : null,
      detail: modOk
        ? m.ok + ' des ' + m.total + ' mentions nouvelles contrôlées ' + (m.ok > 1 ? 'sont présentes' : 'est présente') + (m.nbModeles ? ' (' + m.nbModeles + ' ' + unite + ')' : '')
        : 'Aucun modèle de facture contrôlé : composante non évaluée'
    });

    var n = nbOui(p.organisation);
    comps.push({
      id: 'organisation', label: 'Organisation', poidsPct: Math.round(P.organisation * 100), poids: P.organisation, evalue: true,
      valeur: Math.round((100 * n) / CLES_ORG.length),
      detail: s(n, 'réponse', 'réponses') + ' « oui » sur ' + CLES_ORG.length
    });

    var somme = 0;
    var poidsEval = 0;
    var termes = [];
    comps.forEach(function (c) {
      if (!c.evalue) return;
      somme += c.poidsPct * c.valeur;
      poidsEval += c.poidsPct;
      termes.push({ id: c.id, poidsPct: c.poidsPct, valeur: c.valeur });
    });
    var indice = poidsEval ? Math.round(somme / poidsEval) : null;
    return {
      indice: indice, partiel: termes.length < comps.length, composantes: comps, termes: termes,
      poidsEvaluesPct: poidsEval, poidsTotalPct: comps.reduce(function (t, c) { return t + c.poidsPct; }, 0)
    };
  }

  /** Statut des quatre étapes de préparation de la frise (sans date réglementaire) : fait | en_cours | a_faire.
   *  p = { scoreTiers, modeles:{ok,total}, organisation:{…, cibles:{plateforme,test}} }. */
  function etapesPreparation(p) {
    p = p || {};
    var m = p.modeles || {};
    var org = p.organisation || {};
    var cibles = org.cibles || {};
    var fichier = typeof p.scoreTiers !== 'number' ? 'a_faire' : p.scoreTiers >= 100 ? 'fait' : 'en_cours';
    var modeles = !(m.total > 0) ? 'a_faire' : m.ok === m.total ? 'fait' : 'en_cours';
    var plateforme = org.plateforme === 'oui' ? 'fait' : 'a_faire';
    var test = fichier === 'fait' && modeles === 'fait' && plateforme === 'fait' ? 'en_cours' : 'a_faire';
    return [
      { id: 'fichier', titre: 'Fiabiliser le fichier tiers', statut: fichier, cible: null },
      { id: 'modeles', titre: 'Mettre à jour les modèles de factures', statut: modeles, cible: null },
      { id: 'plateforme', titre: 'Choisir une plateforme agréée', statut: plateforme, cible: cibles.plateforme || null },
      { id: 'test', titre: 'Tester avant la bascule', statut: test, cible: cibles.test || null }
    ];
  }

  /* ------------------------------------------------------------------ */
  /* Exposition théorique aux amendes (estimation, pas un conseil fiscal) */
  /* ------------------------------------------------------------------ */

  /** Saisie du nombre de factures sur 12 mois : entier de 0 à 100 000 (jamais négatif, décimal ou texte). */
  function validerNbFactures(saisie) {
    var t = typeof saisie === 'number' ? String(saisie) : U.trim(saisie);
    var msg = 'Nombre entier de 0 à ' + String(C.MAX_FACTURES_HYPOTHESE).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (!/^\d{1,6}$/.test(t)) return { ok: false, valeur: null, message: msg };
    var n = parseInt(t, 10);
    if (n > C.MAX_FACTURES_HYPOTHESE) return { ok: false, valeur: null, message: msg };
    return { ok: true, valeur: n, message: '' };
  }

  /** Exposition théorique : n factures × montant unitaire, plafonné par année civile. */
  function expositionAmende(nbFactures) {
    if (typeof nbFactures !== 'number' || !isFinite(nbFactures) || nbFactures < 0 || Math.floor(nbFactures) !== nbFactures) return null;
    var brut = nbFactures * C.AMENDE_UNITAIRE;
    return {
      nbFactures: nbFactures, unitaire: C.AMENDE_UNITAIRE, plafond: C.AMENDE_PLAFOND, brut: brut,
      plafonne: Math.min(brut, C.AMENDE_PLAFOND), plafondAtteint: brut >= C.AMENDE_PLAFOND,
      seuilFactures: Math.ceil(C.AMENDE_PLAFOND / C.AMENDE_UNITAIRE)
    };
  }

  /** Fenêtre des 12 derniers mois : du premier jour du mois situé 12 mois avant la date de référence jusqu'à cette date. */
  function fenetre12Mois(refIso) {
    return { debut: COR.moisAvant(refIso, 12).slice(0, 8) + '01', fin: refIso };
  }

  /** Nombre de factures émises sur les 12 derniers mois (même fenêtre que le CA des 12 mois). */
  function nbFactures12Mois(invoices, refIso) {
    var w = fenetre12Mois(refIso);
    var n = 0;
    for (var i = 0; i < invoices.length; i++) {
      var d = invoices[i].dateEmission;
      if (d >= w.debut && d <= w.fin) n++;
    }
    return n;
  }

  /* ------------------------------------------------------------------ */
  /* Rapprochement des clients et part du CA à risque                    */
  /* ------------------------------------------------------------------ */

  function estCodeAcorriger(code) {
    return C.CODES_A_CORRIGER.indexOf(code) >= 0 || COR.CODES_REGISTRE.indexOf(code) >= 0;
  }

  var LIBELLES_CODES = (function () {
    var o = {};
    T.ANOMALY_TYPES.forEach(function (t) { o[t.code] = t.label; });
    COR.TYPES_REGISTRE.forEach(function (t) { o[t.code] = t.label; });
    return o;
  })();

  /** Rapproche les clients des factures (12 derniers mois si opts.refIso) des fiches du fichier tiers : SIREN valide d'abord
   *  (colonne siren_client), puis nom normalisé. opts : { refIso, tranche (nom du client → numéro de ligne de la fiche, pour trancher
   *  un homonyme) }. Statuts : bloquant | a_corriger | ok | non_rapproche | homonyme. Linéaire. Trié par CA décroissant puis nom. */
  function rapprocherClients(analysis, invoices, opts) {
    opts = opts || {};
    if (!analysis || !invoices || !invoices.length) return [];
    var items = analysis.items;
    var idx = T.indexerTiers(items.map(function (it) { return it.row; }));
    var w = opts.refIso ? fenetre12Mois(opts.refIso) : null;
    var tranche = opts.tranche || null;
    var groupes = new Map();
    var liste = [];
    for (var i = 0; i < invoices.length; i++) {
      var inv = invoices[i];
      if (w && !(inv.dateEmission >= w.debut && inv.dateEmission <= w.fin)) continue;
      var siren = inv.sirenClient && /^\d{9}$/.test(inv.sirenClient) ? inv.sirenClient : '';
      var nn = T.normalizeName(inv.client);
      var cle = siren + '|' + nn;
      var g = groupes.get(cle);
      if (!g) { g = { nom: inv.client, siren: siren, nn: nn, cents: 0, nbFactures: 0 }; groupes.set(cle, g); liste.push(g); }
      g.cents += Math.round(inv.ht * 100);
      g.nbFactures++;
    }
    var total = liste.reduce(function (t, g) { return t + g.cents; }, 0);
    var out = liste.map(function (g) {
      var cand = g.siren ? idx.parSiren.get(g.siren) : null;
      if (!cand) cand = idx.parNom.get(g.nn);
      var index = null;
      var statut = 'non_rapproche';
      if (cand && cand.length === 1) index = cand[0];
      else if (cand && cand.length > 1) {
        var voulu = tranche ? tranche[g.nom] : undefined;
        for (var k = 0; k < cand.length; k++) { if (voulu !== undefined && items[cand[k]].row.ligne === voulu) index = cand[k]; }
        if (index === null) statut = 'homonyme';
      }
      var codes = [];
      var ligne = null;
      if (index !== null) {
        ligne = items[index].ligne;
        var bloquant = false;
        var aCorriger = false;
        items[index].anomalies.forEach(function (a) {
          if (a.severity !== 'anomalie') return;
          if (C.CODES_BLOQUANTS.indexOf(a.code) >= 0) { bloquant = true; if (codes.indexOf(a.code) < 0) codes.push(a.code); }
          else if (estCodeAcorriger(a.code)) { aCorriger = true; if (codes.indexOf(a.code) < 0) codes.push(a.code); }
        });
        statut = bloquant ? 'bloquant' : aCorriger ? 'a_corriger' : 'ok';
      }
      return {
        nom: g.nom, ca: g.cents / 100, caCents: g.cents, part: total ? g.cents / total : 0, ligne: ligne, statut: statut,
        codes: codes, libelles: codes.map(function (c) { return LIBELLES_CODES[c] || c; }), nbFactures: g.nbFactures
      };
    });
    out.sort(function (a, b) { return b.caCents - a.caCents || (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0); });
    return out;
  }

  /** Part du CA facturée à des clients dont la fiche bloquerait une facture électronique (SIREN manquant ou invalide),
   *  puis à des fiches à corriger. Les clients non rapprochés et les homonymes non tranchés sont comptés à part, hors du risque.
   *  calculable = au moins un client rapproché à une fiche. Aucune division par zéro. */
  function partCaARisque(rapprochement) {
    var total = 0;
    var agg = {
      bloquant: { c: 0, n: 0 }, a_corriger: { c: 0, n: 0 }, ok: { c: 0, n: 0 }, non_rapproche: { c: 0, n: 0 }, homonyme: { c: 0, n: 0 }
    };
    (rapprochement || []).forEach(function (r) {
      total += r.caCents;
      agg[r.statut].c += r.caCents;
      agg[r.statut].n++;
    });
    function f(a) { return { ca: a.c / 100, part: total ? a.c / total : 0, nbClients: a.n }; }
    var rapproches = agg.bloquant.n + agg.a_corriger.n + agg.ok.n;
    return {
      total: total / 100, calculable: total > 0 && rapproches > 0,
      bloquant: f(agg.bloquant), aCorriger: f(agg.a_corriger), ok: f(agg.ok),
      nonRapproche: f(agg.non_rapproche), homonymes: f(agg.homonyme)
    };
  }

  /** Clients dont la fiche pose un problème, classés par CA × coefficient d'impact décroissant (hypothèse de pondération). */
  function prioriteParImpact(rapprochement) {
    var coef = C.COEF_IMPACT;
    return (rapprochement || []).filter(function (r) { return r.statut === 'bloquant' || r.statut === 'a_corriger'; }).map(function (r) {
      var c = r.statut === 'bloquant' ? coef.bloquant : coef.aCorriger;
      return Object.assign({ coefficient: c, impact: r.caCents * c / 100 }, r);
    }).sort(function (a, b) { return b.impact - a.impact || (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0); });
  }

  /** Conversion du tableau « nom du client → indice de ligne » (données fictives) en « nom → numéro de ligne de la fiche ». */
  function trancheVersLignes(tranche, rows) {
    var out = {};
    if (!tranche) return out;
    Object.keys(tranche).forEach(function (nom) {
      var r = rows[tranche[nom]];
      if (r && r.ligne !== undefined) out[nom] = r.ligne;
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Trésorerie                                                          */
  /* ------------------------------------------------------------------ */

  var TRANCHES_ENCAISSEMENT = [
    { id: 'echu', label: 'Déjà échu' },
    { id: '0-30', label: 'Dans 0 à 30 jours' },
    { id: '31-60', label: 'Dans 31 à 60 jours' },
    { id: '61-90', label: 'Dans 61 à 90 jours' },
    { id: 'plus90', label: 'Dans plus de 90 jours' }
  ];

  function trancheDe(joursAvantEcheance) {
    if (joursAvantEcheance < 0) return 0;
    if (joursAvantEcheance <= 30) return 1;
    if (joursAvantEcheance <= 60) return 2;
    if (joursAvantEcheance <= 90) return 3;
    return 4;
  }

  /** Encaissements attendus par échéance (montants TTC des factures non payées). La somme des tranches et des factures sans
   *  échéance est égale à l'encours. La tranche « plus de 90 jours » n'est visible que si elle n'est pas vide. */
  function encaissementsParEcheance(invoices, refIso) {
    var t = TRANCHES_ENCAISSEMENT.map(function (x) { return { id: x.id, label: x.label, nb: 0, c: 0 }; });
    var sans = { nb: 0, c: 0 };
    var nbNonPayees = 0;
    for (var i = 0; i < invoices.length; i++) {
      var inv = invoices[i];
      if (inv.paid) continue;
      nbNonPayees++;
      var c = Math.round((inv.ttc === null || inv.ttc === undefined ? inv.ht : inv.ttc) * 100);
      if (!inv.dateEcheance) { sans.nb++; sans.c += c; continue; }
      var k = trancheDe(U.daysBetween(refIso, inv.dateEcheance));
      t[k].nb++;
      t[k].c += c;
    }
    var total = t.reduce(function (x, y) { return x + y.c; }, 0) + sans.c;
    return {
      refIso: refIso, nbNonPayees: nbNonPayees, total: total / 100, totalCents: total,
      tranches: t.map(function (x) { return { id: x.id, label: x.label, nb: x.nb, total: x.c / 100, visible: x.id !== 'plus90' || x.nb > 0 }; }),
      sansEcheance: { nb: sans.nb, total: sans.c / 100 }
    };
  }

  /** Alertes de trésorerie : factures échues depuis plus de 60 jours, client le plus exposé (encours TTC non payé).
   *  report : résultat de computeReporting ; invoices : les mêmes factures filtrées. */
  function alertesTresorerie(report, invoices) {
    var plus60 = { nb: 0, total: 0, clients: [] };
    var tr = report && report.echues ? report.echues.tranches.filter(function (x) { return x.id === '60+'; })[0] : null;
    if (tr) { plus60.nb = tr.nb; plus60.total = tr.total; }
    var parClient = new Map();
    var parClient60 = new Map();
    var totalC = 0;
    for (var i = 0; i < invoices.length; i++) {
      var inv = invoices[i];
      if (inv.paid) continue;
      var c = Math.round((inv.ttc === null || inv.ttc === undefined ? inv.ht : inv.ttc) * 100);
      totalC += c;
      parClient.set(inv.client, (parClient.get(inv.client) || 0) + c);
      if (inv.dateEcheance && U.daysBetween(inv.dateEcheance, report.refDate) > 60) parClient60.set(inv.client, (parClient60.get(inv.client) || 0) + c);
    }
    var l60 = [];
    parClient60.forEach(function (c, nom) { l60.push({ nom: nom, c: c }); });
    l60.sort(function (a, b) { return b.c - a.c || (a.nom < b.nom ? -1 : 1); });
    plus60.clients = l60.map(function (x) { return x.nom; });
    var best = null;
    parClient.forEach(function (c, nom) { if (!best || c > best.c || (c === best.c && nom < best.nom)) best = { nom: nom, c: c }; });
    return {
      echuesPlus60: plus60,
      clientLePlusExpose: best ? { nom: best.nom, encours: best.c / 100, part: totalC ? best.c / totalC : 0 } : null,
      aucune: !(plus60.nb > 0) && !best
    };
  }

  /** Concentration client : part des 5 premiers clients, seuil (hypothèse) et dépassement. */
  function concentration(report) {
    var part = report && typeof report.topPart === 'number' ? report.topPart : 0;
    return { part: part, seuil: C.SEUIL_CONCENTRATION, elevee: part >= C.SEUIL_CONCENTRATION, nbClients: report ? report.nbClients : 0 };
  }

  /* ------------------------------------------------------------------ */
  /* Modèles de factures : bilan pour l'indice et le plan                */
  /* ------------------------------------------------------------------ */

  /** Bilan des 4 nouvelles mentions : modèles guidés, à défaut contrôle automatique des lignes de factures.
   *  Renvoie { ok, total, source: 'modeles'|'lignes'|null, nbModeles, nbModelesConcernes, aReprendre:[ids dans l'ordre d'affichage] }. */
  function bilanMentions(modeles, lignesControle) {
    var cum = M.compterModeles(modeles).cumule.nouvelles;
    if (cum.total > 0) {
      var concernes = 0;
      var manque = {};
      modeles.forEach(function (m) {
        var pb = false;
        M.LISTE_NOUVELLES.forEach(function (x) {
          var st = M.controleDe(m, x.id).statut;
          if (st === 'absent' || st === 'a_verifier') { manque[x.id] = true; pb = true; }
        });
        if (pb) concernes++;
      });
      var nb = modeles.filter(function (m) { return M.compterModele(m).nouvelles.total > 0; }).length;
      return { ok: cum.ok, total: cum.total, source: 'modeles', nbModeles: nb, nbModelesConcernes: concernes, aReprendre: MENTIONS_ORDRE.filter(function (id) { return manque[id]; }) };
    }
    if (lignesControle && lignesControle.controle && lignesControle.total > 0) {
      var pm = lignesControle.parMention;
      return {
        ok: lignesControle.ok, total: lignesControle.total, source: 'lignes', nbModeles: lignesControle.nbFactures, nbModelesConcernes: lignesControle.nbConcernees,
        aReprendre: MENTIONS_ORDRE.filter(function (id) { return pm[id] && pm[id].controle && (pm[id].manquant + pm[id].aVerifier) > 0; })
      };
    }
    return { ok: 0, total: 0, source: null, nbModeles: 0, nbModelesConcernes: 0, aReprendre: [] };
  }

  /* ------------------------------------------------------------------ */
  /* Plan d'action                                                       */
  /* ------------------------------------------------------------------ */

  /** Durée en minutes → « environ 1 h 30 ». */
  function dureeLabel(min) {
    if (min < 60) return 'environ ' + min + ' min';
    var h = Math.floor(min / 60);
    var m = min % 60;
    return 'environ ' + h + ' h' + (m ? ' ' + U.pad(m, 2) : '');
  }

  function lignesAvec(analysis, codes) {
    var out = [];
    analysis.items.forEach(function (it) {
      if (it.anomalies.some(function (a) { return a.severity === 'anomalie' && codes.indexOf(a.code) >= 0; })) out.push(it.ligne);
    });
    return out;
  }

  /** Plan d'action généré : 10 tâches au plus dans l'ordre B4 ; une tâche sans élément n'est pas générée.
   *  p = { analysis (tiers effectifs, ou null), mentions (bilanMentions), organisation, hypotheses }. Chaque effort est une estimation.
   *  Les statuts, responsables et échéances ne sont jamais stockés ici (voir planAvecEtats) et n'influencent jamais l'indice. */
  function planAction(p) {
    p = p || {};
    var a = p.analysis || null;
    var org = p.organisation || {};
    var mn = p.mentions || { ok: 0, total: 0, aReprendre: [], nbModelesConcernes: 0, nbModeles: 0, source: null };
    var E = C.EFFORTS;
    var out = [];
    var FV = 'fait verifie';
    var BP = 'bonne pratique';

    function add(id, priorite, titre, pourquoi, source, unites, parUnite, role, concerne) {
      var min = Math.round(unites * parUnite);
      out.push({
        id: id, ordre: out.length + 1, priorite: priorite, titre: titre, pourquoi: pourquoi, sourcePourquoi: source,
        effortMin: min, effortLabel: 'estimation : ' + dureeLabel(min), parDefautResponsable: role, concerne: concerne || []
      });
    }

    var cnt = a ? a.counts : {};
    var nSirenM = cnt.siren_manquant || 0;
    var nSirenI = cnt.siren_invalide || 0;
    if (a && nSirenM + nSirenI > 0) {
      var det = [];
      if (nSirenM) det.push(s(nSirenM, 'manquant', 'manquants'));
      if (nSirenI) det.push(s(nSirenI, 'invalide', 'invalides'));
      add('siren', 'P1', 'Corriger ' + (nSirenM + nSirenI) + ' SIREN (' + det.join(', ') + ')',
        'À compter du 1er septembre 2026, le SIREN du client doit figurer sur les factures entre entreprises assujetties : une fiche sans SIREN valide ne peut pas fournir cette mention.',
        FV, nSirenM + nSirenI, E.siren, 'Comptabilité', lignesAvec(a, C.CODES_BLOQUANTS));
    }

    if (mn.total === 0 || mn.aReprendre.length > 0) {
      var titreM = mn.aReprendre.length
        ? 'Ajouter les mentions manquantes à vos modèles de factures (' + mn.aReprendre.map(function (id) { return MENTIONS_COURT[id]; }).join(', ') + ')'
        : 'Contrôler vos modèles de factures face aux 4 nouvelles mentions';
      var unitesM = mn.source === 'modeles' ? Math.max(1, mn.nbModelesConcernes) : 1;
      add('mentions', 'P1', titreM,
        'Quatre mentions sont obligatoires à compter du 1er septembre 2026 sur les factures entre entreprises assujetties : SIREN du client, adresse de livraison si elle diffère de l\'adresse de facturation, nature de l\'opération, option pour le paiement de la TVA d\'après les débits.',
        FV, unitesM, E.mentions, 'Comptabilité', []);
    }

    if (a && cnt.tva_incoherente > 0) {
      add('tva', 'P2', 'Corriger ' + cnt.tva_incoherente + ' ' + (cnt.tva_incoherente > 1 ? 'clés de TVA' : 'clé de TVA'),
        'Un numéro de TVA qui ne correspond pas au SIREN trahit une erreur de saisie : mieux vaut la corriger dans le fichier tiers avant d\'émettre.',
        BP, cnt.tva_incoherente, E.tva, 'Comptabilité', lignesAvec(a, ['tva_incoherente']));
    }

    var groupes = a && a.doublons ? a.doublons.groupes : 0;
    if (a && groupes > 0) {
      var lignesDoublons = [];
      (a.groupesDoublons || []).forEach(function (g) { g.forEach(function (i) { if (a.items[i]) lignesDoublons.push(a.items[i].ligne); }); });
      add('doublons', 'P2', 'Regrouper ' + groupes + ' ' + (groupes > 1 ? 'doublons' : 'doublon'),
        'Deux fiches pour un même tiers donnent des factures et des relances incohérentes (' + s(a.doublons.lignes, 'ligne concernée', 'lignes concernées') + ').',
        BP, groupes, E.doublon, 'Comptabilité', lignesDoublons);
    }

    if (a && cnt.adresse_incomplete > 0) {
      add('adresses', 'P2', 'Compléter ' + cnt.adresse_incomplete + ' ' + (cnt.adresse_incomplete > 1 ? 'adresses' : 'adresse'),
        'Une adresse complète évite les erreurs de facturation et de livraison.',
        BP, cnt.adresse_incomplete, E.adresse, 'Comptabilité', lignesAvec(a, ['adresse_incomplete']));
    }

    if (a && cnt.siret_incoherent > 0) {
      add('siret', 'P2', 'Corriger ' + cnt.siret_incoherent + ' ' + (cnt.siret_incoherent > 1 ? 'SIRET incohérents' : 'SIRET incohérent'),
        'Un SIRET qui ne correspond pas au SIREN signale une fiche à vérifier.',
        BP, cnt.siret_incoherent, E.siret, 'Comptabilité', lignesAvec(a, ['siret_incoherent']));
    }

    if (a && a.avecRegistre) {
      var nReg = COR.CODES_REGISTRE.reduce(function (t, c) { return t + (cnt[c] || 0); }, 0);
      if (nReg > 0) {
        add('registre', 'P2', 'Examiner ' + nReg + ' ' + (nReg > 1 ? 'fiches signalées' : 'fiche signalée') + ' par la vérification au registre',
          'La vérification au registre signale des écarts (état, nom, adresse) : ils sont à confirmer auprès du client avant toute modification.',
          BP, nReg, E.siret, 'Comptabilité', lignesAvec(a, COR.CODES_REGISTRE));
      }
    }

    if (org.plateforme !== 'oui') {
      add('plateforme', 'P2', 'Choisir une plateforme agréée',
        'Choisir la plateforme tôt laisse le temps de la tester. La réception des factures électroniques est obligatoire à compter du 1er septembre 2026.',
        BP, 1, E.plateforme, 'Direction financière', []);
    }
    if (org.responsable !== 'oui') {
      add('responsable', 'P2', 'Désigner un responsable du sujet',
        'Un responsable désigné évite que le sujet reste sans pilote.', BP, 1, E.responsable, 'Direction financière', []);
    }
    if (org.logiciel !== 'oui') {
      add('logiciel', 'P2', 'Vérifier que le logiciel de facturation émet au format électronique',
        'L\'émission sous forme électronique est obligatoire à compter du 1er septembre 2027 pour les PME, TPE et micro-entreprises.',
        FV, 1, E.logiciel, 'Informatique', []);
    }
    if (org.procedure !== 'oui') {
      add('procedure', 'P3', 'Mettre en place une procédure de mise à jour du fichier tiers',
        'Une procédure aide à garder le fichier tiers à jour dans la durée, sans refaire ce travail.', BP, 1, E.procedure, 'Comptabilité', []);
    }
    add('test', 'P3', 'Tester avant la bascule',
      'Un test sur quelques factures permet de repérer les écarts avant que l\'émission ne soit obligatoire.', BP, 1, E.test, 'Informatique', []);
    return out;
  }

  /** Plan avec l'état saisi par l'utilisateur (responsable, statut, échéance par identifiant de tâche). */
  function planAvecEtats(plan, etats) {
    etats = etats || {};
    return plan.map(function (t) {
      var e = etats[t.id] || {};
      return Object.assign({}, t, {
        responsable: typeof e.responsable === 'string' ? e.responsable : '',
        statut: STATUTS_PLAN.indexOf(e.statut) >= 0 ? e.statut : 'a_faire',
        echeance: e.echeance || null
      });
    });
  }

  /** « N actions · M faites · effort total estimé » (estimation). */
  function resumePlan(planAvec) {
    var faites = planAvec.filter(function (t) { return t.statut === 'fait'; }).length;
    var min = planAvec.reduce(function (t, x) { return t + x.effortMin; }, 0);
    var restant = planAvec.filter(function (t) { return t.statut !== 'fait'; }).reduce(function (t, x) { return t + x.effortMin; }, 0);
    return { nb: planAvec.length, faites: faites, effortMin: min, effortLabel: dureeLabel(min), restantMin: restant, restantLabel: dureeLabel(restant) };
  }

  /** Applique un changement sur l'état d'une tâche (responsable en saisie libre ≤ 60 caractères, statut, échéance). Valide tout. */
  function appliquerPlan(etats, id, patch) {
    if (!/^[a-z][a-z0-9_]{0,29}$/.test(String(id)) || id === 'constructor' || id === 'prototype') return { ok: false, message: 'Action inconnue.' };
    if (!Object.prototype.hasOwnProperty.call(etats, id) && Object.keys(etats).length >= 200) return { ok: false, message: 'Trop d\'actions suivies.' };
    var cur = etats[id] || { responsable: '', statut: 'a_faire', echeance: null };
    var nouveau = { responsable: cur.responsable, statut: cur.statut, echeance: cur.echeance };
    if (patch.responsable !== undefined) {
      var r = String(patch.responsable).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
      if (r.length > C.MAX_RESPONSABLE) return { ok: false, message: 'Le responsable est limité à ' + C.MAX_RESPONSABLE + ' caractères.' };
      nouveau.responsable = r;
    }
    if (patch.statut !== undefined) {
      if (STATUTS_PLAN.indexOf(patch.statut) < 0) return { ok: false, message: 'Statut inconnu.' };
      nouveau.statut = patch.statut;
    }
    if (patch.echeance !== undefined) {
      if (patch.echeance === null || patch.echeance === '') nouveau.echeance = null;
      else {
        var d = U.parseDate(patch.echeance);
        if (!d) return { ok: false, message: 'Date non valide : choisissez une date existante.' };
        nouveau.echeance = d;
      }
    }
    etats[id] = nouveau;
    return { ok: true, message: '' };
  }

  function fmtJour(iso) {
    var p = String(iso || '').split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
  }

  /** Export CSV du plan (séparateur « ; », toutes les cellules entre guillemets, cellules neutralisées contre les formules :
   *  le responsable est une saisie libre). */
  function planToCsv(plan, etats) {
    var avec = planAvecEtats(plan, etats);
    var headers = ['priorite', 'action', 'pourquoi', 'effort (estimation)', 'responsable', 'statut', 'echeance'];
    var rows = avec.map(function (t) {
      return [t.priorite + ' ' + PRIORITES[t.priorite], t.titre, t.pourquoi, t.effortLabel, t.responsable, STATUTS_PLAN_LIBELLES[t.statut], fmtJour(t.echeance)];
    });
    return CSV.toCsv(headers, rows, ';', true);
  }

  return {
    CLES_ORG: CLES_ORG,
    REGLES_COMPOSANTES: REGLES_COMPOSANTES,
    STATUTS_PLAN: STATUTS_PLAN,
    STATUTS_PLAN_LIBELLES: STATUTS_PLAN_LIBELLES,
    PRIORITES: PRIORITES,
    MENTIONS_COURT: MENTIONS_COURT,
    LIBELLES_CODES: LIBELLES_CODES,
    joursRestants: joursRestants,
    compteARebours: compteARebours,
    jalons: jalons,
    sirenEvaluable: sirenEvaluable,
    scoreTiersPourIndice: scoreTiersPourIndice,
    indicePreparation: indicePreparation,
    etapesPreparation: etapesPreparation,
    validerNbFactures: validerNbFactures,
    expositionAmende: expositionAmende,
    fenetre12Mois: fenetre12Mois,
    nbFactures12Mois: nbFactures12Mois,
    rapprocherClients: rapprocherClients,
    partCaARisque: partCaARisque,
    prioriteParImpact: prioriteParImpact,
    trancheVersLignes: trancheVersLignes,
    encaissementsParEcheance: encaissementsParEcheance,
    alertesTresorerie: alertesTresorerie,
    concentration: concentration,
    bilanMentions: bilanMentions,
    dureeLabel: dureeLabel,
    planAction: planAction,
    planAvecEtats: planAvecEtats,
    resumePlan: resumePlan,
    appliquerPlan: appliquerPlan,
    planToCsv: planToCsv
  };
});
