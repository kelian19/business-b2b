/* Équerre : dérivés mémoïsés (aucun calcul métier ici : tout est délégué à EquerreLogic).
 * Chaque dérivé déclare ses révisions d'entrée et n'est recalculé que si l'une a changé.
 * Les gros fichiers sont préparés par tranches (preparer) avant d'être attachés au dossier, pour ne pas bloquer l'interface. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var L = root.EquerreLogic;
  var S = E.ui.store;
  var P = E.ui.perf;
  var U = E.ui.ui;

  var memo = {};

  function sess() { return S.state.session; }

  function memoise(nom, cle, calcul) {
    var m = memo[nom];
    if (m && m.cle === cle) return m.valeur;
    var v = calcul();
    memo[nom] = { cle: cle, valeur: v };
    return v;
  }

  function prepare(kind) {
    var s = sess();
    var c = s.cache[kind];
    return c && c.rev === s.rev[kind] ? c.prepared : null;
  }

  /** Évaluation d'un fichier importé (enregistrements canoniques, lignes ignorées). */
  function evaluation(kind) {
    var s = sess();
    var table = s.dossier && s.dossier.donnees[kind];
    if (!table) return null;
    return memoise('eval-' + kind, s.gen + ':' + s.rev[kind], function () {
      var p = prepare(kind);
      return p && p.eval ? p.eval : L.evaluerTable(table, kind);
    });
  }

  /** Fichier de vérification au registre : { records, ev } ou null (facultatif). */
  function registre() {
    var ev = evaluation('registre');
    return ev ? { records: ev.records, ev: ev } : null;
  }

  /** Fichier tiers : { ev, rows, columns, analysis (tiers effectifs, décisions appliquées), origine (fichier d'origine,
   *  avec écarts du registre), propositions, exclues (lignes fusionnées), registre } ou null.
   *  Aucune règle métier ici : tout est délégué à EquerreLogic. */
  function tiers() {
    var s = sess();
    var ev = evaluation('tiers');
    if (!ev) return null;
    var d = s.dossier;
    return memoise('tiers', s.gen + ':' + s.rev.tiers + ':' + s.rev.registre + ':' + s.rev.corrections, function () {
      var p = prepare('tiers');
      var base = p && p.analysis ? p.analysis : L.analyzeThirdParties(ev.records, { columns: ev.colonnes });
      var reg = registre();
      var regRecords = reg ? reg.records : null;
      var origine = regRecords ? L.ajouterRegistre(base, regRecords) : base;
      var eff;
      if (Object.keys(d.corrections || {}).length) {
        eff = L.analyseEffective(ev.records, { columns: ev.colonnes, corrections: d.corrections, registre: regRecords });
      } else {
        eff = { analysis: origine, exclues: [], nbAppliquees: 0 };
      }
      return {
        ev: ev, rows: ev.records, columns: ev.colonnes, analysis: eff.analysis, origine: origine, exclues: eff.exclues,
        propositions: L.proposerToutes(origine), registre: reg
      };
    });
  }

  /** CA HT des 12 derniers mois par ligne de tiers (Map ligne → { ca, nbFactures }) ; vide sans export de factures. */
  function caTiers() {
    var s = sess();
    var t = tiers();
    var f = factures();
    if (!t || !f) return new Map();
    var ref = refDate();
    return memoise('caTiers', s.gen + ':' + s.rev.tiers + ':' + s.rev.factures + ':' + ref, function () {
      var tranche = s.dossier.mode === 'demo' && root.EquerreData ? root.EquerreData.tiersParClient : undefined;
      return L.caParTiers(f.invoices, t.rows, ref, tranche);
    });
  }

  /** Comptes des modèles de factures (les 4 nouvelles mentions) : par modèle et cumulé. */
  function modeles() {
    var s = sess();
    return memoise('modeles', s.gen + ':' + s.rev.modeles, function () { return L.compterModeles(s.dossier.modeles); });
  }

  /** Contrôle automatique de l'export des lignes de factures, ou null s'il n'est pas importé. */
  function lignesControle() {
    var s = sess();
    var ev = evaluation('lignes');
    if (!ev) return null;
    return memoise('lignesControle', s.gen + ':' + s.rev.lignes + ':' + s.rev.factures, function () {
      var f = factures();
      var numeros = f ? f.invoices.map(function (i) { return i.numero; }).filter(Boolean) : null;
      return L.controlerLignes(ev.records, { colonnes: ev.colonnes, numerosFactures: numeros });
    });
  }

  /** Factures normalisées : { invoices, warnings, ev } ou null. */
  function factures() {
    var ev = evaluation('factures');
    if (!ev) return null;
    return { invoices: ev.records, warnings: ev.contexte, ev: ev };
  }

  function refDate() {
    var d = sess().dossier;
    return (d && d.refDate) || U.aujourdhui();
  }

  /** Période des « 12 derniers mois », dite explicitement : du premier jour du mois situé 12 mois avant la date de référence jusqu'à cette date. */
  function fenetre12Texte() {
    var w = L.fenetre12Mois(refDate());
    return 'du ' + U.fmtDate(w.debut) + ' au ' + U.fmtDate(w.fin) + ' (le premier mois est pris en entier)';
  }

  /** Indicateurs de reporting à la date de référence. */
  function reporting() {
    var s = sess();
    var f = factures();
    if (!f || !f.invoices.length) return null;
    var ref = refDate();
    return memoise('reporting', s.gen + ':' + s.rev.factures + ':' + ref, function () {
      return L.computeReporting(f.invoices, ref);
    });
  }

  /** Numéro de ligne de la fiche à retenir pour chaque client homonyme (données fictives seulement) : nom → ligne. */
  function trancheDe(dossier, rows) {
    if (!dossier || dossier.mode !== 'demo' || !root.EquerreData || !rows) return undefined;
    return L.trancheVersLignes(root.EquerreData.tiersParClient, rows);
  }

  /** Rapprochement des clients de l'export avec les fiches du fichier tiers (12 derniers mois), ou null s'il manque un fichier. */
  function rapprochement() {
    var s = sess();
    var t = tiers();
    var f = factures();
    if (!t || !f || !f.invoices.length) return null;
    var ref = refDate();
    return memoise('rapprochement', [s.gen, s.rev.tiers, s.rev.registre, s.rev.corrections, s.rev.factures, ref].join(':'), function () {
      return L.rapprocherClients(t.analysis, f.invoices, { refIso: ref, tranche: trancheDe(s.dossier, t.rows) });
    });
  }

  /** Synthèse du dossier actif à la date de référence : indice, plan, part du CA à risque, étapes de préparation (aucun calcul ici). */
  function synthese() {
    var s = sess();
    var d = s.dossier;
    var ref = refDate();
    var cle = [s.gen, s.rev.tiers, s.rev.registre, s.rev.corrections, s.rev.factures, s.rev.lignes, s.rev.modeles, s.rev.organisation, ref].join(':');
    return memoise('synthese', cle, function () {
      var t = tiers();
      var f = factures();
      return L.syntheseDossier(d, ref, {
        analysis: t ? t.analysis : null, colonnes: t ? t.columns : null, rows: t ? t.rows : null,
        invoices: f ? f.invoices : null, lignesControle: lignesControle(), rapprochement: rapprochement()
      });
    });
  }

  /** Plan d'action avec les responsables, statuts et échéances saisis. */
  function plan() {
    var syn = synthese();
    var avec = L.planAvecEtats(syn.plan, sess().dossier.plan);
    return { taches: avec, resume: L.resumePlan(avec) };
  }

  /** Exposition théorique aux amendes : nombre de factures déduit de l'export, saisi par l'utilisateur ou absent. */
  function exposition() {
    var d = sess().dossier;
    var f = factures();
    var deduit = f ? L.nbFactures12Mois(f.invoices, refDate()) : null;
    var saisi = d.hypotheses.nbFactures12m;
    var n = saisi !== null && saisi !== undefined ? saisi : deduit;
    return { deduit: deduit, saisi: saisi === undefined ? null : saisi, n: n, calcul: n === null ? null : L.expositionAmende(n) };
  }

  /** Trésorerie à la date de référence : encaissements par échéance, alertes, concentration. null sans export de factures. */
  function tresorerie() {
    var s = sess();
    var f = factures();
    var rep = reporting();
    if (!f || !rep) return null;
    var ref = refDate();
    return memoise('tresorerie', [s.gen, s.rev.factures, ref].join(':'), function () {
      return { rapport: rep, encaissements: L.encaissementsParEcheance(f.invoices, ref), alertes: L.alertesTresorerie(rep, f.invoices), concentration: L.concentration(rep) };
    });
  }

  /** Reporting filtré (période, client) avec comparaison à la période précédente. null sans facture. */
  function reportingFiltre(filtres) {
    var s = sess();
    var f = factures();
    if (!f || !f.invoices.length) return null;
    var ref = refDate();
    var fl = filtres || {};
    return memoise('reportingFiltre', [s.gen, s.rev.factures, ref, fl.du || '', fl.au || '', fl.client || ''].join('|'), function () {
      return L.computeReporting(f.invoices, ref, fl);
    });
  }

  function clients() {
    var s = sess();
    var f = factures();
    if (!f) return [];
    return memoise('clients', s.gen + ':' + s.rev.factures, function () { return L.listeClients(f.invoices); });
  }

  /** Résumé du dossier (versions), calculé à partir de la même synthèse que le tableau de bord. */
  function resume() {
    var d = sess().dossier;
    return L.resumeDossier(d, refDate(), { synthese: synthese() });
  }

  /** Résumé d'un autre dossier (fichier .json chargé pour comparaison) : calcul complet, sans toucher au dossier actif. */
  function resumeAutreDossier(autre) {
    var rows = autre.donnees.tiers ? L.evaluerTable(autre.donnees.tiers, 'tiers').records : null;
    var ref = autre.refDate || refDate();
    var syn = L.syntheseDossier(autre, ref, { tranche: trancheDe(autre, rows) });
    return L.resumeDossier(autre, ref, { synthese: syn });
  }

  /** Prépare un fichier importé par tranches : évaluation, puis analyse du fichier tiers. */
  function preparerTable(kind, table, onProgress) {
    var ev = L.creerEvaluateur(table, kind);
    var total = ev.total;
    var partEval = kind === 'tiers' ? 0.7 : 1;
    return P.tranches(total, function (a, b) { ev.avancer(a, b); }, {
      pas: 250, onProgress: function (f) { onProgress && onProgress(f * partEval); }
    }).then(function () {
      var res = ev.resultat();
      var sortie = { eval: res, analysis: null };
      if (kind !== 'tiers') { onProgress && onProgress(1); return sortie; }
      var an = L.createThirdPartyAnalyzer(res.records, { columns: res.colonnes });
      return P.tranches(an.total, function (a, b) { an.analyzeRange(a, b); }, {
        pas: 250, onProgress: function (f) { onProgress && onProgress(partEval + f * (1 - partEval)); }
      }).then(function () {
        sortie.analysis = an.finish();
        return sortie;
      });
    });
  }

  /** Prépare toutes les tables d'un dossier ouvert depuis un fichier. */
  function preparerDossier(dossier, onProgress) {
    var kinds = L.ORDRE_KINDS.filter(function (k) { return dossier.donnees[k]; });
    var resultats = {};
    var i = 0;
    function suite() {
      if (i >= kinds.length) return Promise.resolve(resultats);
      var k = kinds[i++];
      return preparerTable(k, dossier.donnees[k], function (f) { onProgress && onProgress((i - 1 + f) / kinds.length); }).then(function (r) {
        resultats[k] = r;
        return suite();
      });
    }
    return suite();
  }

  /** Données préparées par tranches d'un dossier chargé depuis un fichier (voir L.syntheseDossier) : l'interface ne se fige pas. */
  function preparerPre(dossier, onProgress) {
    return preparerDossier(dossier, onProgress).then(function (prep) {
      var pre = { analysis: null, colonnes: null, rows: null, invoices: null, lignesControle: null };
      if (prep.tiers) {
        var ev = prep.tiers.eval;
        var reg = prep.registre ? prep.registre.eval.records : null;
        var corr = dossier.corrections || {};
        pre.rows = ev.records;
        pre.colonnes = ev.colonnes;
        pre.analysis = (Object.keys(corr).length || reg)
          ? L.analyseEffective(ev.records, { columns: ev.colonnes, corrections: corr, registre: reg }).analysis
          : prep.tiers.analysis;
      }
      if (prep.factures) pre.invoices = prep.factures.eval.records;
      if (prep.lignes) {
        var numeros = pre.invoices ? pre.invoices.map(function (i) { return i.numero; }).filter(Boolean) : null;
        pre.lignesControle = L.controlerLignes(prep.lignes.eval.records, { colonnes: prep.lignes.eval.colonnes, numerosFactures: numeros });
      }
      pre.tranche = trancheDe(dossier, pre.rows);
      return pre;
    });
  }

  /** Ligne du portefeuille cabinet pour un dossier chargé depuis un fichier : préparation par tranches (progression), puis résumé.
   *  Les résultats sont ceux de L.ligneCabinet appliqué au dossier : rien n'est repris d'un résumé stocké. */
  function ligneCabinetAsync(dossier, onProgress) {
    var ref = L.refPour(dossier, U.aujourdhui());
    return preparerPre(dossier, function (f) { onProgress && onProgress(f * 0.9); }).then(function (pre) {
      return P.yieldToUi().then(function () {
        var ligne = L.ligneCabinet(dossier, ref, pre);
        onProgress && onProgress(1);
        return ligne;
      });
    });
  }

  /** Résumé d'un autre dossier (fichier .json chargé pour comparaison), préparé par tranches comme le mode cabinet. */
  function resumeAutreDossierAsync(autre, onProgress) {
    var ref = autre.refDate || refDate();
    return preparerPre(autre, function (f) { onProgress && onProgress(f * 0.9); }).then(function (pre) {
      return P.yieldToUi().then(function () {
        var syn = L.syntheseDossier(autre, ref, pre);
        var res = L.resumeDossier(autre, ref, { synthese: syn });
        onProgress && onProgress(1);
        return res;
      });
    });
  }

  function oublier() { memo = {}; }
  S.on(['dossier'], oublier);

  E.ui.derived = {
    fenetre12Texte: fenetre12Texte, evaluation: evaluation, registre: registre, caTiers: caTiers, modeles: modeles, lignesControle: lignesControle, tiers: tiers, factures: factures, refDate: refDate, reporting: reporting, resume: resume,
    rapprochement: rapprochement, synthese: synthese, plan: plan, exposition: exposition, tresorerie: tresorerie, reportingFiltre: reportingFiltre, clients: clients, resumeAutreDossier: resumeAutreDossier, resumeAutreDossierAsync: resumeAutreDossierAsync,
    preparerTable: preparerTable, preparerDossier: preparerDossier, ligneCabinetAsync: ligneCabinetAsync
  };
})(typeof self !== 'undefined' ? self : this);
