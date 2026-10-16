/* Équerre : rapport de livraison (module H). Fonctions pures : textes imposés, version du dossier, pied de page selon le mode,
 * anomalies du fichier tiers classées par impact pour l'annexe A (plafonnée). Aucune date implicite. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./constants.js'));
  } else {
    var c = root.Equerre.core;
    c.rapport = factory(c.constants);
  }
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  var TEXTES = {
    titre: 'Rapport de préparation à la facture électronique',
    demo: 'Données fictives de démonstration',
    clientBandeau: 'Dossier client : données confidentielles',
    conseil: 'ne constitue pas un conseil fiscal',
    estimations: 'Estimations : l\'indice de préparation, les efforts et l\'exposition sont des estimations. Ce rapport ne constitue pas un conseil fiscal ni juridique.',
    confidentialite: 'Dossier client : données confidentielles. Ce rapport contient des informations de votre client : conservez-le dans un espace protégé et supprimez-le quand il n\'est plus utile.',
    repliNom: 'Votre entreprise',
    noteImpression: 'Choisissez « Enregistrer au format PDF » dans la fenêtre d\'impression ; activez « Graphiques d\'arrière-plan » pour conserver les couleurs.'
  };

  var DECISIONS = { acceptee: 'Acceptée', refusee: 'Refusée', modifiee: 'Modifiée' };

  /** Nom affiché : le nom saisi, ou « Votre entreprise » s'il est vide. */
  function nomAffiche(nom) {
    var n = String(nom === null || nom === undefined ? '' : nom).trim();
    return n || TEXTES.repliNom;
  }

  /** Version du dossier : dernière version enregistrée, sinon « version courante ». */
  function versionDossier(dossier) {
    var vs = (dossier && dossier.versions) || [];
    if (!vs.length) return { numero: null, court: 'Version courante', long: 'Version courante (aucune version nommée enregistrée)', libelle: '' };
    var v = vs[vs.length - 1];
    return { numero: v.numero, court: 'Version ' + v.numero, long: 'Version ' + v.numero + ' : ' + v.libelle, libelle: v.libelle };
  }

  /** Pied de page répété sur chaque page imprimée. mode : 'demo' | 'client'. */
  function piedDePage(mode, dossier) {
    var base = mode === 'demo'
      ? TEXTES.demo + ' · flow · ' + TEXTES.conseil
      : TEXTES.clientBandeau + ' · flow · ' + TEXTES.conseil;
    return { texte: base, version: versionDossier(dossier).court, complet: base + ' · ' + versionDossier(dossier).court };
  }

  /** Anomalies du fichier tiers pour l'annexe A, classées par impact (CA × coefficient, hypothèse affichée), plafonnées à max.
   *  analysis : analyse d'origine ; propositions : résultat de proposerToutes ; ca : Map ligne → { ca } ;
   *  corrections : décisions du dossier. Renvoie { lignes, total, tronque, max }. Seules les anomalies de gravité « anomalie » sont listées. */
  function anomaliesImpactantes(analysis, propositions, ca, corrections, max) {
    max = max || C.MAX_ANNEXE_ANOMALIES;
    var out = [];
    if (!analysis) return { lignes: [], total: 0, tronque: false, max: max };
    var parLigne = propositions && propositions.parLigne ? propositions.parLigne : new Map();
    var decisions = corrections || {};
    analysis.items.forEach(function (it) {
      var props = parLigne.get(it.ligne) || [];
      it.anomalies.forEach(function (a) {
        if (a.severity !== 'anomalie') return;
        var bloquant = C.CODES_BLOQUANTS.indexOf(a.code) >= 0;
        var liees = props.filter(function (p) { return p.code === a.code && p.comptee; });
        var chiffre = ca && ca.get(it.ligne) ? ca.get(it.ligne).ca : 0;
        var coef = bloquant ? C.COEF_IMPACT.bloquant : C.COEF_IMPACT.aCorriger;
        var decision = '';
        liees.forEach(function (p) {
          var d = decisions[p.cle];
          if (d && DECISIONS[d.decision]) decision = DECISIONS[d.decision] + (d.decision === 'modifiee' && d.apres ? ' : ' + d.apres : '');
        });
        out.push({
          ligne: it.ligne,
          nom: String(it.row.nom || ''),
          type: it.row.type || '',
          code: a.code,
          anomalie: a.label,
          gravite: bloquant ? 'bloquant' : 'a_corriger',
          valeurActuelle: liees.map(function (p) { return p.valeurActuelle; }).filter(Boolean).join(' | '),
          correction: liees.map(function (p) { return p.valeurProposee !== null && p.valeurProposee !== undefined ? p.valeurProposee : p.libelle; }).filter(Boolean).join(' | '),
          certitude: liees.length ? liees[0].certitude : '',
          decision: decision,
          ca: chiffre,
          impact: chiffre * coef
        });
      });
    });
    out.sort(function (x, y) {
      return y.impact - x.impact || (x.gravite === y.gravite ? 0 : x.gravite === 'bloquant' ? -1 : 1) || x.ligne - y.ligne;
    });
    return { lignes: out.slice(0, max), total: out.length, tronque: out.length > max, max: max };
  }

  return {
    TEXTES_RAPPORT: TEXTES,
    nomAffiche: nomAffiche,
    versionDossier: versionDossier,
    piedDePage: piedDePage,
    anomaliesImpactantes: anomaliesImpactantes
  };
});
