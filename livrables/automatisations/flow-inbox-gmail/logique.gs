/**
 * Flow Inbox — logique pure (aucun appel aux services Google).
 * Partagée par Code.gs et par les tests Node (tests/run-tests.js).
 *
 * Règles : rien n'est deviné. Une information absente reste absente, un doute
 * passe en « À revoir ». Les montants et les dates sont relevés tels qu'écrits.
 */

var FI_VERSION = '1.0';

var FI_MOIS = ['janvier', 'f[ée]vrier', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'ao[uû]t', 'septembre', 'octobre', 'novembre', 'd[ée]cembre'];
var FI_MOIS_RE = '(?:' + FI_MOIS.join('|') + ')';

var FI_RAISONS = {
  MESSAGE_INTERNE: 'envoyé depuis la boîte elle-même',
  REPONSE_AUTOMATIQUE: 'réponse automatique ou envoi groupé',
  REPONDRE_A_DIFFERENT: 'adresse de réponse différente de l\'expéditeur',
  PERIMETRE_INCERTAIN: 'demande commerciale incertaine',
  DEMARCHAGE_POSSIBLE: 'ressemble à un démarchage reçu',
  SERVICE_INCONNU: 'service non reconnu dans le catalogue',
  PLUSIEURS_SERVICES: 'plusieurs services possibles',
  BUDGET_A_VERIFIER: 'montant ambigu ou non lu',
  PLUSIEURS_MONTANTS: 'plusieurs montants dans le message',
  TEXTE_LONG: 'message trop long pour une lecture automatique',
  TEXTE_VIDE: 'message sans texte'
};

function fiTexte(valeur) {
  return String(valeur === null || valeur === undefined ? '' : valeur)
    .normalize('NFC').replace(/\r\n?/g, '\n');
}

function fiSimplifier(valeur) {
  return fiTexte(valeur).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[’`]/g, '\'');
}

function fiEchapper(motif) {
  return motif.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Vrai si l'expression (déjà simplifiée) apparaît comme mot ou groupe de mots entier. */
function fiContient(texteSimple, expression) {
  var cle = fiSimplifier(expression).trim();
  if (!cle) return false;
  // Chaque mot accepte un pluriel en -s ou -x (« sites internet », « supports »).
  var motif = cle.split(/\s+/).map(fiEchapper).join('(?:s|x)?\\s+');
  return new RegExp('(^|[^a-z0-9])' + motif + '(?:s|x)?($|[^a-z0-9])').test(texteSimple);
}

function fiPremier(texteSimple, liste) {
  for (var i = 0; i < liste.length; i++) if (fiContient(texteSimple, liste[i])) return liste[i];
  return null;
}

// ---------------------------------------------------------------------------
// Montants
// ---------------------------------------------------------------------------

var FI_NOMBRE = '(\\d{1,3}(?:[ \\u00a0\\u202f]\\d{3})+|\\d+)(?:,(\\d{1,2}))?';
var FI_UNITE = '(k\\s*€|k\\s*euros?|k\\s*eur\\b|€|euros?\\b|eur\\b|ke\\b)';

function fiValeur(entier, decimales, unite) {
  var valeur = Number(entier.replace(/[ \u00a0\u202f]/g, '') + (decimales ? '.' + decimales : ''));
  if (/^k/i.test(unite || '')) valeur = valeur * 1000;
  return Number.isFinite(valeur) ? Math.round(valeur * 100) / 100 : null;
}

/**
 * Relève les montants en euros. Renvoie { budget, ambigu, nombre }.
 * budget = { texte, min, max } ou null.
 */
function fiReleverBudget(texte) {
  var source = fiTexte(texte);
  var trouves = [];
  var reste = source;
  var plageIllisible = false;
  var plage = new RegExp('(?:entre|de)\\s+' + FI_NOMBRE + '\\s*(k)?\\s*(?:€|euros?)?\\s+(?:et|à|a)\\s+' +
    FI_NOMBRE + '\\s*' + FI_UNITE, 'gi');
  var m;
  while ((m = plage.exec(source)) !== null) {
    var kHaut = /^k/i.test(m[6]);
    var bas = fiValeur(m[1], m[2], m[3] || kHaut ? 'k' : '');
    var haut = fiValeur(m[4], m[5], m[6]);
    if (bas !== null && haut !== null && bas <= haut) trouves.push({ texte: m[0].trim(), min: bas, max: haut });
    else plageIllisible = true;
    reste = reste.slice(0, m.index) + ' '.repeat(m[0].length) + reste.slice(m.index + m[0].length);
  }
  var simple = new RegExp('(?<![\\d.,])' + FI_NOMBRE + '\\s*' + FI_UNITE, 'gi');
  var restant = reste;
  while ((m = simple.exec(reste)) !== null) {
    var valeur = fiValeur(m[1], m[2], m[3]);
    if (valeur === null) continue;
    var avant = fiSimplifier(reste.slice(Math.max(0, m.index - 14), m.index));
    var plancher = /(a partir de|minimum|au moins|plus de)\s*$/.test(avant);
    var plafond = /(maximum|max\.?|au plus|jusqu'a|moins de)\s*$/.test(avant);
    trouves.push({ texte: m[0].trim(), min: plafond ? null : valeur, max: plancher ? null : valeur });
    restant = restant.slice(0, m.index) + ' '.repeat(m[0].length) + restant.slice(m.index + m[0].length);
  }
  // Une mention d'euros non rattachée à un montant lisible (ex. « 5.000 € », « quelques milliers d'euros ») reste à vérifier.
  var ambigu = plageIllisible || /€|(^|[^a-z])euros?([^a-z]|$)/.test(fiSimplifier(restant));
  var distincts = trouves.filter(function (t, i) {
    return trouves.findIndex(function (u) { return u.min === t.min && u.max === t.max; }) === i;
  });
  if (distincts.length === 1) return { budget: distincts[0], ambigu: ambigu, nombre: 1 };
  return { budget: null, ambigu: ambigu, nombre: distincts.length };
}

// ---------------------------------------------------------------------------
// Délais
// ---------------------------------------------------------------------------

function fiDateValide(annee, mois, jour) {
  var d = new Date(Date.UTC(annee, mois - 1, jour));
  return d.getUTCFullYear() === annee && d.getUTCMonth() === mois - 1 && d.getUTCDate() === jour;
}

function fiIso(annee, mois, jour) {
  return annee + '-' + String(mois).padStart(2, '0') + '-' + String(jour).padStart(2, '0');
}

function fiNumeroMois(nom) {
  var simple = fiSimplifier(nom);
  var noms = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout',
    'septembre', 'octobre', 'novembre', 'decembre'];
  return noms.indexOf(simple) + 1;
}

/**
 * Relève les expressions de délai. Renvoie { texte, date_iso } ou null.
 * date_iso n'est rempli que si une seule date complète (jour, mois, année) est écrite.
 */
function fiReleverDelai(texte) {
  var source = fiTexte(texte);
  var motifs = [
    { re: /(?<!\d)(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?!\d)/g, iso: function (m) {
      var j = +m[1], mo = +m[2], a = +m[3];
      return fiDateValide(a, mo, j) ? fiIso(a, mo, j) : null;
    } },
    { re: new RegExp('(?<![\\d])(\\d{1,2}|1er)\\s+(' + FI_MOIS_RE + ')(?:\\s+(\\d{4}))?', 'giu'), iso: function (m) {
      if (!m[3]) return null;
      var j = m[1].toLowerCase() === '1er' ? 1 : +m[1], mo = fiNumeroMois(m[2]), a = +m[3];
      return fiDateValide(a, mo, j) ? fiIso(a, mo, j) : null;
    } },
    { re: /(?<![\d\/])(\d{1,2})\/(\d{1,2})(?![\/\d])/g, iso: function () { return null; }, date: true },
    { re: new RegExp('(?:d\'ici|avant|pour|courant|d[ée]but|fin|mi-?)\\s*(?:la\\s+|le\\s+|de\\s+|du\\s+)?(?:fin\\s+|d[ée]but\\s+)?(?:(?:du\\s+)?mois\\s+(?:de\\s+|d\')?)?' +
      FI_MOIS_RE + '(?:\\s+\\d{4})?', 'giu'), iso: function () { return null; } },
    { re: new RegExp('\\ben\\s+' + FI_MOIS_RE + '(?:\\s+\\d{4})?', 'giu'), iso: function () { return null; } },
    { re: /\b(?:d'ici|avant|sous|dans)\s+(?:\d+|un|une|deux|trois|quatre|six)\s+(?:jours?|semaines?|mois)\b/giu, iso: function () { return null; } },
    { re: /\b(?:d'ici|avant)\s+(?:la\s+)?fin\s+(?:du\s+mois|de\s+l'ann[ée]e|d'ann[ée]e|du\s+trimestre|de\s+la\s+semaine)\b/giu, iso: function () { return null; } },
    { re: /\b(?:la\s+semaine|le\s+mois)\s+prochain(?:e)?\b|\b(?:à|a)\s+la\s+rentr[ée]e\b|\bT[1-4]\s+\d{4}\b/giu, iso: function () { return null; } },
    { re: /\b(?:urgent(?:e)?|au plus vite|d[èe]s que possible|asap|rapidement)\b/giu, iso: function () { return null; } }
  ];
  var releves = [];
  motifs.forEach(function (motif) {
    var m;
    motif.re.lastIndex = 0;
    while ((m = motif.re.exec(source)) !== null) {
      var debut = m.index, fin = m.index + m[0].length;
      var recouvre = releves.some(function (r) { return debut < r.fin && fin > r.debut; });
      if (!recouvre) releves.push({ debut: debut, fin: fin, texte: m[0].trim(), iso: motif.iso(m) });
    }
  });
  if (!releves.length) return null;
  releves.sort(function (a, b) { return a.debut - b.debut; });
  var textes = [];
  releves.forEach(function (r) { if (textes.indexOf(r.texte) < 0) textes.push(r.texte); });
  var dates = releves.filter(function (r) { return r.iso; });
  var iso = releves.length === 1 && dates.length === 1 ? dates[0].iso : null;
  return { texte: textes.slice(0, 3).join(' ; '), date_iso: iso };
}

// ---------------------------------------------------------------------------
// Qualification
// ---------------------------------------------------------------------------

var FI_SIGNES_COMMERCIAUX = ['devis', 'projet', 'besoin', 'proposition', 'tarif', 'tarifs', 'prix',
  'budget', 'accompagnement', 'accompagner', 'refonte', 'creation', 'creer', 'cahier des charges',
  'estimation', 'chiffrage', 'nous souhaitons', 'je souhaite', 'nous aimerions', 'j\'aimerais',
  'pourriez-vous', 'pouvez-vous nous', 'nous cherchons', 'nous recherchons', 'nous refaisons', 'refaire', 'nous lancons'];
var FI_SIGNES_HORS = ['candidature', 'curriculum', 'cv', 'stage', 'alternance', 'offre d\'emploi',
  'se desinscrire', 'desinscription', 'unsubscribe', 'webinar', 'webinaire',
  'absent du bureau', 'out of office', 'reponse automatique', 'accuse de reception',
  'votre facture', 'avis d\'echeance', 'confirmation de commande',
  'bon d\'achat', 'vous avez ete selectionne', 'informations de paiement', 'votre colis', 'mot de passe'];
var FI_SIGNES_DEMARCHAGE = ['je me permets de vous contacter', 'nous proposons', 'notre agence propose',
  'partenariat', 'netlinking', 'backlinks', 'backlink', 'generation de leads', 'prendre rendez-vous avec notre',
  'je suis commercial', 'nous accompagnons les agences', 'marque blanche'];

/**
 * services : [{ code, libelle, mots: [..] }]
 * message : { de, repondre_a, objet, texte, entetes: { auto_submitted, precedence, list_unsubscribe } }
 * reglages : { adresse, max_caracteres }
 */
function fiQualifier(message, services, reglages) {
  var raisons = [];
  var texte = fiTexte(message.texte);
  var objet = fiTexte(message.objet);
  var simple = fiSimplifier(objet + '\n' + texte);
  var de = String(message.de || '').toLowerCase().trim();
  var entetes = message.entetes || {};

  if (reglages.adresse && de === String(reglages.adresse).toLowerCase().trim()) raisons.push('MESSAGE_INTERNE');
  if ((entetes.auto_submitted && !/^no$/i.test(entetes.auto_submitted)) ||
      /bulk|list|junk/i.test(entetes.precedence || '') || entetes.list_unsubscribe) raisons.push('REPONSE_AUTOMATIQUE');
  if (message.repondre_a && String(message.repondre_a).toLowerCase().trim() !== de) raisons.push('REPONDRE_A_DIFFERENT');
  if (!texte.trim()) raisons.push('TEXTE_VIDE');
  if (texte.length > (reglages.max_caracteres || 20000)) raisons.push('TEXTE_LONG');

  var trouves = services.filter(function (s) {
    return s.mots.some(function (mot) { return fiContient(simple, mot); });
  });
  var preuves = trouves.map(function (s) { return s.libelle + ' (« ' + fiPremier(simple, s.mots) + ' »)'; });

  var commercial = trouves.length > 0 || fiPremier(simple, FI_SIGNES_COMMERCIAUX) !== null;
  var hors = fiPremier(simple, FI_SIGNES_HORS) !== null;
  var demarchage = fiPremier(simple, FI_SIGNES_DEMARCHAGE) !== null;
  var perimetre = commercial && !hors ? 'commercial' : (!commercial && hors ? 'hors' : 'incertain');
  if (raisons.indexOf('REPONSE_AUTOMATIQUE') >= 0 || raisons.indexOf('MESSAGE_INTERNE') >= 0) perimetre = 'hors';
  if (perimetre === 'incertain') raisons.push('PERIMETRE_INCERTAIN');
  if (demarchage && perimetre === 'commercial') raisons.push('DEMARCHAGE_POSSIBLE');

  if (perimetre === 'commercial') {
    if (trouves.length === 0) raisons.push('SERVICE_INCONNU');
    if (trouves.length > 1) raisons.push('PLUSIEURS_SERVICES');
  }

  var montants = fiReleverBudget(texte);
  if (montants.nombre > 1) raisons.push('PLUSIEURS_MONTANTS');
  else if (montants.ambigu) raisons.push('BUDGET_A_VERIFIER');
  var delai = fiReleverDelai(texte);

  var manquants = [];
  if (perimetre === 'commercial') {
    if (!montants.budget && montants.nombre === 0 && !montants.ambigu) manquants.push('budget');
    if (!delai) manquants.push('delai');
  }

  var brouillon = perimetre === 'commercial' && trouves.length === 1 && raisons.length === 0;
  var statut = perimetre === 'hors' ? 'Hors périmètre' : (brouillon ? 'Brouillon prêt' : 'À revoir');
  return {
    perimetre: perimetre,
    service: trouves.length === 1 ? trouves[0] : null,
    services_trouves: preuves,
    budget: montants.budget,
    delai: delai,
    manquants: manquants,
    raisons: raisons.filter(function (r, i) { return raisons.indexOf(r) === i; }),
    brouillon: brouillon,
    statut: statut
  };
}

function fiLibelleRaisons(raisons) {
  return raisons.map(function (r) { return FI_RAISONS[r] || r; }).join(' ; ');
}

function fiLibelleManquants(manquants) {
  var noms = { budget: 'budget', delai: 'délai' };
  return manquants.map(function (m) { return noms[m]; }).join(', ');
}

function fiFormaterBudget(budget) {
  if (!budget) return '';
  var f = function (v) { return String(v).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + ' €'; };
  if (budget.min !== null && budget.max !== null && budget.min !== budget.max) return f(budget.min) + ' à ' + f(budget.max) + ' — « ' + budget.texte + ' »';
  if (budget.min === null) return 'jusqu\'à ' + f(budget.max) + ' — « ' + budget.texte + ' »';
  if (budget.max === null) return 'à partir de ' + f(budget.min) + ' — « ' + budget.texte + ' »';
  return f(budget.min) + ' — « ' + budget.texte + ' »';
}

function fiFormaterDelai(delai) {
  if (!delai) return '';
  return delai.date_iso ? delai.date_iso + ' — « ' + delai.texte + ' »' : '« ' + delai.texte + ' »';
}

var FI_MODELE_BROUILLON = 'Bonjour,\n\nMerci pour votre message au sujet de {service}.\n\n{questions}\n\nBien cordialement,\n{signature}';

function fiTexteBrouillon(qualification, reglages) {
  if (!qualification.brouillon) throw new Error('BROUILLON_NON_QUALIFIE');
  var demandes = [];
  if (qualification.manquants.indexOf('budget') >= 0) demandes.push('l\'enveloppe budgétaire envisagée');
  if (qualification.manquants.indexOf('delai') >= 0) demandes.push('l\'échéance souhaitée');
  if (reglages.question) demandes.push(String(reglages.question).trim().replace(/[ ?.]+$/, ''));
  var questions;
  if (demandes.length === 0) questions = 'Nous étudions votre demande et revenons vers vous pour convenir des prochaines étapes.';
  else {
    var liste = demandes.length === 1 ? demandes[0] :
      demandes.slice(0, -1).join(', ') + ' et ' + demandes[demandes.length - 1];
    questions = 'Pour préparer une proposition adaptée, pourriez-vous nous préciser ' + liste + ' ?';
  }
  var modele = reglages.modele && String(reglages.modele).indexOf('{questions}') >= 0 ? String(reglages.modele) : FI_MODELE_BROUILLON;
  return modele.replace('{service}', qualification.service.libelle)
    .replace('{questions}', questions)
    .replace('{signature}', fiTexte(reglages.signature).trim());
}

function fiProchaineAction(statut, raisons) {
  if (statut === 'Brouillon prêt') return 'Relire, corriger et envoyer le brouillon';
  if (statut === 'À revoir') return 'Qualifier à la main' + (raisons.length ? ' : ' + fiLibelleRaisons(raisons) : '');
  if (statut === 'Hors périmètre') return 'Aucune (vérifier si besoin)';
  if (statut === 'Répondu') return 'Attendre le retour du prospect';
  if (statut === '[essai] Brouillon possible') return 'Mode essai : aucun brouillon créé';
  return '';
}

/** Protège une cellule contre l'interprétation comme formule. */
function fiCelluleSure(valeur) {
  var brut = String(valeur === null || valeur === undefined ? '' : valeur);
  var debut = brut.replace(/^[\s\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060\ufeff]+/, '');
  return /^[=+@-]/.test(debut) ? '\'' + brut : brut;
}

/** Statuts que le script peut encore faire évoluer. « Clos » et « Hors périmètre » restent tels quels. */
var FI_STATUTS_OUVERTS = ['Brouillon prêt', 'À revoir', '[essai] Brouillon possible'];

function fiEnRetard(statut, recuMs, maintenantMs, delaiHeures) {
  return FI_STATUTS_OUVERTS.indexOf(statut) >= 0 && maintenantMs - recuMs >= delaiHeures * 3600000;
}

if (typeof module === 'object' && module.exports) {
  module.exports = { fiQualifier: fiQualifier, fiReleverBudget: fiReleverBudget, fiReleverDelai: fiReleverDelai,
    fiTexteBrouillon: fiTexteBrouillon, fiCelluleSure: fiCelluleSure, fiEnRetard: fiEnRetard };
}
