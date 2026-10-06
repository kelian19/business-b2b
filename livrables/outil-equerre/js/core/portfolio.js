/* Équerre : mode cabinet (module J). Portefeuille de dossiers chargés en mémoire seulement : jamais enregistré dans un .json.
 * Une ligne du portefeuille résume un dossier : indice (estimation), part du CA à risque, actions ouvertes, anomalies bloquantes.
 * Tout est pur : la date de référence est toujours un paramètre. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./constants.js'), require('./util.js'), require('./csv.js'), require('./versions.js'));
  } else {
    var c = root.Equerre.core;
    c.portfolio = factory(c.constants, c.util, c.csv, c.versions);
  }
})(typeof self !== 'undefined' ? self : this, function (C, U, CSV, V) {
  'use strict';

  var COLONNES = [
    { id: 'nom', libelle: 'Dossier', type: 'texte' },
    { id: 'secteur', libelle: 'Secteur', type: 'texte' },
    { id: 'indice', libelle: 'Indice (estimation)', type: 'nombre' },
    { id: 'partCa', libelle: 'Part du CA à risque', type: 'nombre' },
    { id: 'actionsOuvertes', libelle: 'Actions ouvertes', type: 'nombre' },
    { id: 'anomaliesBloquantes', libelle: 'Anomalies bloquantes', type: 'nombre' },
    { id: 'date', libelle: 'Situation au', type: 'texte' }
  ];

  var MESSAGE_CONFIDENTIALITE = 'Plusieurs dossiers clients sont chargés en mémoire dans ce navigateur : ne partagez pas votre écran, ne laissez pas cette page ouverte sans surveillance et utilisez « Effacer toutes les données de cette session » en fin de travail.';

  var MESSAGE_CONFIDENTIALITE_VIDE = 'Les dossiers chargés ici restent uniquement en mémoire dans ce navigateur. Dès qu\'un dossier client est chargé, ne partagez pas votre écran et utilisez « Effacer toutes les données de cette session » en fin de travail.';

  /** Date de situation d'un dossier : sa date de référence, sinon aujourd'hui (fourni par l'appelant). */
  function refPour(dossier, aujourdhui) { return dossier.refDate || aujourdhui; }

  /** Nombre d'actions du plan qui ne sont pas « fait ». */
  function actionsOuvertes(actions) {
    return Object.keys(actions || {}).filter(function (id) { return actions[id] !== 'fait'; }).length;
  }

  /** Nombre de lignes du fichier tiers portant un SIREN manquant ou invalide (anomalies bloquantes). */
  function anomaliesBloquantes(nbAnomalies) {
    var n = 0;
    C.CODES_BLOQUANTS.forEach(function (code) { n += (nbAnomalies && nbAnomalies[code]) || 0; });
    return n;
  }

  /** Ligne du portefeuille pour un dossier : tout est recalculé à partir du dossier chargé (rien n'est repris d'un résumé stocké).
   *  pre (facultatif) : données déjà préparées { analysis, colonnes, rows, invoices, lignesControle, tranche }, voir syntheseDossier. */
  function ligneCabinet(dossier, refIso, pre) {
    var syn = V.syntheseDossier(dossier, refIso, pre);
    var res = V.resumeDossier(dossier, refIso, { synthese: syn });
    var pc = syn.partCa && syn.partCa.calculable ? syn.partCa : null;
    return {
      dossierId: dossier.id,
      nom: dossier.entreprise.nom,
      secteur: dossier.entreprise.secteur || '',
      taille: dossier.entreprise.taille,
      mode: dossier.mode,
      majLe: dossier.majLe || '',
      date: syn.ref || '',
      indice: res.indice,
      partiel: res.partiel,
      partCa: pc ? pc.bloquant.part : null,
      caARisque: pc ? pc.bloquant.ca : null,
      actionsOuvertes: actionsOuvertes(res.actions),
      nbActions: Object.keys(res.actions).length,
      anomaliesBloquantes: anomaliesBloquantes(res.nbAnomalies),
      erreurs: [],
      resume: res
    };
  }

  /** Vérifie les plafonds (30 dossiers, 150 Mo cumulés) avant d'ajouter ou de remplacer le dossier d'identifiant dossierId.
   *  Renvoie { ok, message, remplace }. Permet de refuser un fichier avant tout calcul. */
  function verifierPlafonds(portefeuille, dossierId, octets) {
    octets = octets || 0;
    var existant = portefeuille.filter(function (l) { return l.dossierId === dossierId; });
    var autres = portefeuille.filter(function (l) { return l.dossierId !== dossierId; });
    if (autres.length >= C.MAX_DOSSIERS_CABINET) {
      return { ok: false, remplace: false, message: 'Plafond atteint : ' + C.MAX_DOSSIERS_CABINET + ' dossiers au maximum dans le portefeuille. Retirez un dossier pour en ajouter un autre.' };
    }
    var cumul = autres.reduce(function (t, l) { return t + (l.octets || 0); }, 0);
    if (cumul + octets > C.MAX_OCTETS_CABINET) {
      return { ok: false, remplace: false, message: 'Plafond atteint : ' + Math.round(C.MAX_OCTETS_CABINET / 1048576) + ' Mo au maximum pour l\'ensemble des fichiers chargés. Retirez un dossier pour en ajouter un autre.' };
    }
    return { ok: true, remplace: existant.length > 0, message: existant.length ? 'Ce dossier était déjà chargé : il a été remplacé.' : '' };
  }

  /** Ajoute un dossier au portefeuille (tableau modifié en place) en respectant les plafonds.
   *  Un dossier déjà présent (même identifiant) est remplacé. Renvoie { ok, message, remplace }. */
  function ajouterAuPortefeuille(portefeuille, ligne, octets) {
    var v = verifierPlafonds(portefeuille, ligne.dossierId, octets);
    if (!v.ok) return v;
    ligne.octets = octets || 0;
    var i = -1;
    portefeuille.forEach(function (l, k) { if (l.dossierId === ligne.dossierId) i = k; });
    if (i >= 0) portefeuille[i] = ligne; else portefeuille.push(ligne);
    return v;
  }

  function retirerDuPortefeuille(portefeuille, dossierId) {
    for (var i = 0; i < portefeuille.length; i++) {
      if (portefeuille[i].dossierId === dossierId) { portefeuille.splice(i, 1); return true; }
    }
    return false;
  }

  function octetsTotal(portefeuille) { return portefeuille.reduce(function (t, l) { return t + (l.octets || 0); }, 0); }

  function cle(texte) { return U.stripAccents(U.trim(texte)).toLowerCase(); }

  /** Tri stable par colonne (sens : 'asc' | 'desc') ; les valeurs absentes sont toujours en fin de liste. Renvoie une copie. */
  function trierPortefeuille(lignes, colonne, sens) {
    var col = COLONNES.filter(function (c) { return c.id === colonne; })[0] || COLONNES[0];
    var k = sens === 'desc' ? -1 : 1;
    function valeur(l) {
      var v = l[col.id];
      if (col.id === 'nom' || col.id === 'secteur') return cle(v);
      return v === undefined || v === '' ? null : v;
    }
    return lignes.map(function (l, i) { return { l: l, i: i, v: valeur(l) }; }).sort(function (a, b) {
      if (a.v === null && b.v === null) return a.i - b.i;
      if (a.v === null) return 1;
      if (b.v === null) return -1;
      if (a.v < b.v) return -k;
      if (a.v > b.v) return k;
      return a.i - b.i;
    }).map(function (x) { return x.l; });
  }

  /** Filtre par texte (nom ou secteur, sans accents ni casse). */
  function filtrerPortefeuille(lignes, texte) {
    var t = cle(texte);
    if (!t) return lignes.slice();
    return lignes.filter(function (l) { return cle(l.nom).indexOf(t) >= 0 || cle(l.secteur).indexOf(t) >= 0; });
  }

  function pct(x) { return x === null || x === undefined ? '' : (Math.round(x * 1000) / 10).toFixed(1).replace('.', ','); }

  /** CSV du portefeuille (séparateur « ; », neutralisation des formules dans toutes les cellules : un nom de dossier peut être « =1+1 »). */
  function portefeuilleToCsv(lignes) {
    var entetes = ['dossier', 'secteur', 'mode', 'indice_estimation', 'indice_partiel', 'part_ca_a_risque_pct', 'actions_ouvertes', 'anomalies_bloquantes', 'date_situation', 'modifie_le'];
    var rows = lignes.map(function (l) {
      return [l.nom, l.secteur, l.mode === 'demo' ? 'démonstration' : 'client', l.indice, l.partiel ? 'oui' : 'non', pct(l.partCa), l.actionsOuvertes, l.anomaliesBloquantes, l.date, l.majLe];
    });
    return CSV.toCsv(entetes, rows);
  }

  return {
    COLONNES_CABINET: COLONNES,
    MESSAGE_CONFIDENTIALITE: MESSAGE_CONFIDENTIALITE,
    MESSAGE_CONFIDENTIALITE_VIDE: MESSAGE_CONFIDENTIALITE_VIDE,
    refPour: refPour,
    actionsOuvertes: actionsOuvertes,
    anomaliesBloquantes: anomaliesBloquantes,
    ligneCabinet: ligneCabinet,
    verifierPlafonds: verifierPlafonds,
    ajouterAuPortefeuille: ajouterAuPortefeuille,
    retirerDuPortefeuille: retirerDuPortefeuille,
    octetsTotal: octetsTotal,
    trierPortefeuille: trierPortefeuille,
    filtrerPortefeuille: filtrerPortefeuille,
    portefeuilleToCsv: portefeuilleToCsv
  };
});
