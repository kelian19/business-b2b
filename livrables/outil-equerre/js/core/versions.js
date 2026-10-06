/* Équerre : historique des versions d'un dossier et mise à niveau (comparaison avant / après).
 * Une version ne conserve qu'un RÉSUMÉ (indice, anomalies, avancement) : elle ne permet pas de restaurer les fichiers importés.
 * La comparaison est une différence de deux résumés : aucune donnée brute n'est nécessaire. Toute valeur est une estimation. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./constants.js'), require('./util.js'), require('./identifiers.js'), require('./tiers.js'), require('./import-kinds.js'),
      require('./dossier.js'), require('./corrections.js'), require('./mentions.js'), require('./readiness.js'), require('./csv.js'));
  } else {
    var c = root.Equerre.core;
    c.versions = factory(c.constants, c.util, c.identifiers, c.tiers, c.importKinds, c.dossier, c.corrections, c.mentions, c.readiness, c.csv);
  }
})(typeof self !== 'undefined' ? self : this, function (C, U, I, T, IK, D, COR, M, R, CSV) {
  'use strict';

  var MENTIONS_NOUVELLES = ['siren_client', 'adresse_livraison', 'nature_operation', 'option_debits'];
  var LIBELLES_COMPOSANTES = { fichier: 'Fichier tiers', modeles: 'Modèles de factures', organisation: 'Organisation' };

  /** Clé stable d'un tiers : SIREN valide, sinon nom normalisé et code postal (stable quand le fichier est ré-exporté). */
  function cleTiers(row) {
    var s = I.cleanId(row.siren);
    if (I.isValidSiren(s)) return 'siren:' + s;
    return 'nom:' + T.normalizeName(row.nom) + '|' + U.trim(row.code_postal).replace(/\s/g, '');
  }

  /** Données calculées d'un dossier, à partir de ses tables brutes : tiers effectifs (décisions et registre appliqués), factures,
   *  contrôle des lignes de factures. Pur ; les tables absentes donnent null. */
  function donneesDuDossier(dossier) {
    var out = { analysis: null, colonnes: null, rows: null, invoices: null, lignesControle: null };
    var dn = dossier.donnees;
    if (dn.tiers) {
      var ev = IK.evaluerTable(dn.tiers, 'tiers');
      var reg = dn.registre ? IK.evaluerTable(dn.registre, 'registre') : null;
      out.rows = ev.records;
      out.colonnes = ev.colonnes;
      out.analysis = COR.analyseEffective(ev.records, { columns: ev.colonnes, corrections: dossier.corrections, registre: reg ? reg.records : null }).analysis;
    }
    if (dn.factures) out.invoices = IK.evaluerTable(dn.factures, 'factures').records;
    if (dn.lignes) {
      var el = IK.evaluerTable(dn.lignes, 'lignes');
      var numeros = out.invoices ? out.invoices.map(function (i) { return i.numero; }).filter(Boolean) : null;
      out.lignesControle = M.controlerLignes(el.records, { colonnes: el.colonnes, numerosFactures: numeros });
    }
    return out;
  }

  /** Analyse effective du fichier tiers d'un dossier (null sans fichier). */
  function analyseDuDossier(dossier) {
    return donneesDuDossier(dossier).analysis;
  }

  /** Synthèse complète d'un dossier à une date de référence : tout ce que montrent le tableau de bord, le rapport et la mise à niveau.
   *  pre (facultatif) : résultats déjà calculés { analysis, colonnes, rows, invoices, lignesControle, rapprochement, tranche } pour
   *  éviter de tout recalculer. tranche : nom du client → numéro de ligne de la fiche à retenir (homonymes). */
  function syntheseDossier(dossier, refIso, pre) {
    pre = pre || {};
    var base = pre.analysis !== undefined && pre.invoices !== undefined ? null : donneesDuDossier(dossier);
    var analysis = pre.analysis !== undefined ? pre.analysis : base.analysis;
    var colonnes = pre.colonnes !== undefined ? pre.colonnes : (base ? base.colonnes : null);
    var invoices = pre.invoices !== undefined ? pre.invoices : base.invoices;
    var lignesControle = pre.lignesControle !== undefined ? pre.lignesControle : (base ? base.lignesControle : null);
    var ref = refIso || dossier.refDate || null;
    var rapprochement = pre.rapprochement !== undefined ? pre.rapprochement
      : (analysis && invoices && invoices.length ? R.rapprocherClients(analysis, invoices, { refIso: ref || undefined, tranche: pre.tranche }) : null);
    var partCa = rapprochement ? R.partCaARisque(rapprochement) : null;
    var mentions = R.bilanMentions(dossier.modeles, lignesControle);
    var scoreTiers = R.scoreTiersPourIndice(analysis, colonnes);
    var indice = R.indicePreparation({
      scoreTiers: scoreTiers,
      tiers: { clean: analysis ? analysis.clean : 0, total: analysis ? analysis.total : 0, sansSiren: !!analysis && !R.sirenEvaluable(colonnes) },
      modeles: { ok: mentions.ok, total: mentions.total, nbModeles: mentions.nbModeles, unite: mentions.source === 'lignes' ? 'factures' : 'modeles' },
      organisation: dossier.organisation
    });
    var plan = R.planAction({ analysis: analysis, mentions: mentions, organisation: dossier.organisation, hypotheses: dossier.hypotheses });
    return {
      ref: ref, analysis: analysis, colonnes: colonnes, invoices: invoices, lignesControle: lignesControle, rapprochement: rapprochement,
      partCa: partCa, mentions: mentions, scoreTiers: scoreTiers, indice: indice, plan: plan,
      etapes: R.etapesPreparation({ scoreTiers: scoreTiers, modeles: mentions, organisation: dossier.organisation })
    };
  }

  /** Résumé d'un dossier (pur) : stocké dans chaque version enregistrée. pre : voir syntheseDossier. */
  function resumeDossier(dossier, refIso, pre) {
    var syn = pre && pre.synthese ? pre.synthese : syntheseDossier(dossier, refIso, pre);
    var a = syn.analysis;
    var nbAnomalies = {};
    var anomalies = [];
    if (a) {
      Object.keys(a.counts).forEach(function (code) { nbAnomalies[code] = a.counts[code]; });
      for (var i = 0; i < a.items.length && anomalies.length < 20000; i++) {
        var it = a.items[i];
        for (var k = 0; k < it.anomalies.length && anomalies.length < 20000; k++) {
          if (it.anomalies[k].severity === 'anomalie') anomalies.push(cleTiers(it.row) + '|' + it.anomalies[k].code);
        }
      }
    }
    var actions = {};
    var titres = {};
    syn.plan.forEach(function (t) {
      var e = dossier.plan[t.id];
      actions[t.id] = e && e.statut ? e.statut : 'a_faire';
      titres[t.id] = t.titre;
    });
    var pc = syn.partCa && syn.partCa.calculable ? { bloquant: syn.partCa.bloquant, aCorriger: syn.partCa.aCorriger } : null;
    return validerResume({
      indice: syn.indice.indice,
      partiel: syn.indice.partiel,
      composantes: syn.indice.composantes.map(function (c) { return { id: c.id, valeur: c.valeur, poids: c.poids }; }),
      nbTiers: a ? a.total : 0,
      nbAnomalies: nbAnomalies,
      partCaARisque: pc,
      mentions: syn.mentions.total ? { ok: syn.mentions.ok, total: syn.mentions.total } : null,
      organisation: { plateforme: dossier.organisation.plateforme, responsable: dossier.organisation.responsable, logiciel: dossier.organisation.logiciel, procedure: dossier.organisation.procedure },
      actions: actions,
      titresActions: titres,
      anomalies: anomalies,
      refDate: refIso || dossier.refDate || null
    });
  }

  /** Normalise un résumé (passe par le validateur, forme canonique unique). */
  function validerResume(r) {
    var essai = D.validateDossier({
      format: D.FORMAT, schemaVersion: C.SCHEMA_VERSION, id: 'd0', mode: 'client', creeLe: '', majLe: '',
      entreprise: { nom: '', secteur: '', taille: 'autre', logo: null },
      donnees: {}, versions: [{ id: 'v', numero: 1, libelle: 'x', creeLe: '', note: '', resume: r }]
    });
    return essai.ok ? essai.dossier.versions[0].resume : r;
  }

  /** Ajoute une version nommée au dossier. Plafond de 20 : la plus ancienne est supprimée (renvoyé dans « supprimee »). */
  function ajouterVersion(dossier, params) {
    var libelle = U.trim(params.libelle).slice(0, C.MAX_LIBELLE_VERSION);
    if (!libelle) throw new Error('Un nom de version est nécessaire.');
    var numero = dossier.versions.reduce(function (m, v) { return Math.max(m, v.numero); }, 0) + 1;
    var version = {
      id: 'v' + numero + '-' + U.fnv1a32(String(params.maintenant) + libelle),
      numero: numero,
      libelle: libelle,
      creeLe: params.maintenant || '',
      note: U.trim(params.note).slice(0, C.MAX_NOTE),
      resume: params.resume
    };
    dossier.versions.push(version);
    var supprimee = null;
    if (dossier.versions.length > C.MAX_VERSIONS) supprimee = dossier.versions.shift();
    return { version: version, supprimee: supprimee };
  }

  /* ------------------------------------------------------------------ */
  /* Mise à niveau : comparaison de deux résumés                         */
  /* ------------------------------------------------------------------ */

  var LIBELLES_ANOMALIES = {};
  T.ANOMALY_TYPES.forEach(function (t) { LIBELLES_ANOMALIES[t.code] = t.label; });
  COR.TYPES_REGISTRE.forEach(function (t) { LIBELLES_ANOMALIES[t.code] = t.label; });

  /** Décrit une entrée d'anomalie d'un résumé (« siren:123456782|tva_incoherente ») sans donnée brute :
   *  { cle, code, libelle, identifiant }. */
  function decrireAnomalie(entree) {
    var p = String(entree).lastIndexOf('|');
    var cle = p >= 0 ? entree.slice(0, p) : entree;
    var code = p >= 0 ? entree.slice(p + 1) : '';
    var identifiant;
    if (cle.indexOf('siren:') === 0) {
      var s = cle.slice(6);
      identifiant = 'SIREN ' + (/^\d{9}$/.test(s) ? s.slice(0, 3) + ' ' + s.slice(3, 6) + ' ' + s.slice(6) : s);
    } else {
      var q = cle.slice(4).split('|');
      identifiant = (q[0] || 'Fiche sans nom') + (q[1] ? ' (code postal ' + q[1] + ')' : ' (sans code postal)');
    }
    return { cle: cle, code: code, libelle: LIBELLES_ANOMALIES[code] || code, identifiant: identifiant };
  }

  function nombre(x) { return typeof x === 'number' && isFinite(x); }
  function delta(a, b) { return nombre(a) && nombre(b) ? b - a : null; }

  /** Différence de deux résumés (avant, après) : indice et composantes, anomalies résolues et nouvelles, actions passées à « fait ».
   *  Aucun résultat n'est promis : c'est un constat entre deux états, en estimation. */
  function comparerResumes(avant, apres) {
    avant = avant || {};
    apres = apres || {};
    var ids = [];
    (avant.composantes || []).concat(apres.composantes || []).forEach(function (c) { if (ids.indexOf(c.id) < 0) ids.push(c.id); });
    function valeur(r, id) {
      var c = (r.composantes || []).filter(function (x) { return x.id === id; })[0];
      return c && nombre(c.valeur) ? c.valeur : null;
    }
    var composantes = ids.map(function (id) {
      var a = valeur(avant, id);
      var b = valeur(apres, id);
      return { id: id, label: LIBELLES_COMPOSANTES[id] || id, avant: a, apres: b, delta: delta(a, b) };
    });

    var aSet = new Set(avant.anomalies || []);
    var bSet = new Set(apres.anomalies || []);
    var resolues = [];
    var nouvelles = [];
    var vuesR = new Set();
    var vuesN = new Set();
    (avant.anomalies || []).forEach(function (x) { if (!bSet.has(x) && !vuesR.has(x)) { vuesR.add(x); resolues.push(x); } });
    (apres.anomalies || []).forEach(function (x) { if (!aSet.has(x) && !vuesN.has(x)) { vuesN.add(x); nouvelles.push(x); } });

    var actA = avant.actions || {};
    var actB = apres.actions || {};
    var titre = function (id) { return (apres.titresActions && apres.titresActions[id]) || (avant.titresActions && avant.titresActions[id]) || id; };
    var faites = [];
    var rouvertes = [];
    var sansObjet = [];
    var nouvellesActions = [];
    Object.keys(actB).forEach(function (id) {
      if (actB[id] === 'fait' && actA[id] !== 'fait') faites.push({ id: id, titre: titre(id), avant: actA[id] || null });
      else if (actA[id] === 'fait' && actB[id] !== 'fait') rouvertes.push({ id: id, titre: titre(id) });
      if (actA[id] === undefined) nouvellesActions.push({ id: id, titre: titre(id) });
    });
    Object.keys(actA).forEach(function (id) { if (actB[id] === undefined) sansObjet.push({ id: id, titre: titre(id) }); });

    function comptes(r) { return r.nbAnomalies || {}; }
    var codes = Object.keys(Object.assign({}, comptes(avant), comptes(apres)));
    var parCode = codes.map(function (code) {
      return { code: code, libelle: LIBELLES_ANOMALIES[code] || code, avant: comptes(avant)[code] || 0, apres: comptes(apres)[code] || 0 };
    }).filter(function (x) { return x.avant !== x.apres; });

    function bloquant(r) { return r.partCaARisque && nombre(r.partCaARisque.bloquant && r.partCaARisque.bloquant.part) ? r.partCaARisque.bloquant.part : null; }

    return {
      indice: {
        avant: nombre(avant.indice) ? avant.indice : null, apres: nombre(apres.indice) ? apres.indice : null,
        delta: delta(avant.indice, apres.indice), partielAvant: !!avant.partiel, partielApres: !!apres.partiel,
        comparable: !!avant.partiel === !!apres.partiel
      },
      composantes: composantes,
      anomaliesResolues: resolues,
      anomaliesNouvelles: nouvelles,
      parCode: parCode,
      actionsFaites: faites,
      actionsRouvertes: rouvertes,
      actionsSansObjet: sansObjet,
      actionsNouvelles: nouvellesActions,
      mentions: { avant: avant.mentions || null, apres: apres.mentions || null },
      partBloquant: { avant: bloquant(avant), apres: bloquant(apres), delta: delta(bloquant(avant), bloquant(apres)) },
      refDate: { avant: avant.refDate || null, apres: apres.refDate || null }
    };
  }

  /** CSV de la comparaison : indice, composantes, anomalies résolues et nouvelles, actions faites (une ligne par élément). */
  function comparaisonToCsv(cmp) {
    var rows = [];
    function signe(x) { return x === null ? '' : (x > 0 ? '+' : '') + x; }
    rows.push(['indice', 'Indice de préparation (estimation)', cmp.indice.avant === null ? '' : cmp.indice.avant, cmp.indice.apres === null ? '' : cmp.indice.apres, signe(cmp.indice.delta)]);
    cmp.composantes.forEach(function (c) { rows.push(['composante', c.label, c.avant === null ? '' : c.avant, c.apres === null ? '' : c.apres, signe(c.delta)]); });
    cmp.anomaliesResolues.forEach(function (x) { var d = decrireAnomalie(x); rows.push(['anomalie résolue', d.identifiant, d.libelle, '', '']); });
    cmp.anomaliesNouvelles.forEach(function (x) { var d = decrireAnomalie(x); rows.push(['anomalie nouvelle', d.identifiant, d.libelle, '', '']); });
    cmp.actionsFaites.forEach(function (a) { rows.push(['action passée à fait', a.titre, '', '', '']); });
    cmp.actionsRouvertes.forEach(function (a) { rows.push(['action rouverte', a.titre, '', '', '']); });
    return CSV.toCsv(['element', 'libelle', 'avant', 'apres', 'ecart'], rows);
  }

  return {
    MENTIONS_NOUVELLES: MENTIONS_NOUVELLES,
    cleTiers: cleTiers,
    donneesDuDossier: donneesDuDossier,
    analyseDuDossier: analyseDuDossier,
    syntheseDossier: syntheseDossier,
    resumeDossier: resumeDossier,
    validerResume: validerResume,
    ajouterVersion: ajouterVersion,
    decrireAnomalie: decrireAnomalie,
    comparerResumes: comparerResumes,
    comparaisonToCsv: comparaisonToCsv
  };
});
