/**
 * Flow Inbox — script lié au Google Sheet de suivi, installé dans le compte Google du client.
 *
 * Ce que fait le script :
 * - lit uniquement les fils Gmail portant le libellé « Flow Inbox/À traiter » (posé par un filtre Gmail du client) ;
 * - ajoute une ligne par demande dans l'onglet « Suivi » (service, budget et délai tels qu'écrits, informations à demander) ;
 * - en mode « Actif », prépare un BROUILLON de réponse dans le fil, seulement pour une demande claire ;
 * - repère les demandes sans réponse au-delà du délai convenu et celles auxquelles l'équipe a répondu.
 *
 * Ce que le script ne fait jamais : envoyer un e-mail, supprimer ou archiver un message, appeler un service extérieur.
 * Aucune donnée ne quitte le compte Google du client.
 *
 * Fichiers : logique.gs (règles pures) + Code.gs (ce fichier) + appsscript.json.
 */

var FI_ONGLETS = { suivi: 'Suivi', reglages: 'Réglages', services: 'Services', journal: 'Journal' };

var FI_COLONNES = ['Reçu le', 'Expéditeur', 'Objet', 'Service', 'Budget relevé', 'Délai relevé',
  'À demander', 'Points à revoir', 'Statut', 'En retard', 'Prochaine action', 'Répondu le', 'Lien Gmail', 'Identifiant'];
var FI_COL = {};
FI_COLONNES.forEach(function (nom, i) { FI_COL[nom] = i + 1; });

var FI_REGLAGES_DEFAUT = [
  ['Mode', 'Essai', 'Essai : lignes seulement, aucun brouillon. Actif : brouillons créés pour les demandes claires.'],
  ['Adresse de la boîte', '', 'Vide = adresse du compte qui a installé le script.'],
  ['Libellé à traiter', 'Flow Inbox/À traiter', 'Posé par votre filtre Gmail sur les demandes entrantes.'],
  ['Libellé traité', 'Flow Inbox/Traité', 'Posé par le script après traitement. Ne pas le retirer à la main.'],
  ['Délai de réponse (heures)', '24', 'Au-delà, la demande est marquée « En retard » (heures calendaires).'],
  ['Nombre maximal par passage', '20', 'Limite par exécution.'],
  ['Signature', 'L\'équipe', 'Signature ajoutée aux brouillons.'],
  ['Question complémentaire', '', 'Facultatif, ajoutée aux brouillons (ex. : le nombre de pages envisagé).'],
  ['Modèle de brouillon', '', 'Facultatif. Doit contenir {questions} ; peut contenir {service} et {signature}.']
];

// Exemple pour une agence : le catalogue réel est fixé avec le client lors du cadrage.
var FI_SERVICES_DEFAUT = [
  ['site', 'votre projet de site', 'site web; site internet; website; refonte; wordpress; shopify; e-commerce; boutique en ligne; vente en ligne; landing page; site vitrine'],
  ['seo', 'votre référencement', 'seo; référencement; référencement naturel; visibilité sur google'],
  ['ads', 'vos campagnes publicitaires', 'google ads; publicité en ligne; sea; meta ads; campagne publicitaire'],
  ['identite', 'votre identité visuelle', 'logo; identité visuelle; charte graphique; branding'],
  ['print', 'vos supports de communication', 'plaquette; brochure; flyer; dépliant; print; supports de communication'],
  ['redaction', 'vos contenus', 'rédaction; articles de blog; contenus éditoriaux'],
  ['video', 'votre projet vidéo', 'vidéo; film de présentation; motion design'],
  ['social', 'vos réseaux sociaux', 'réseaux sociaux; community management; publications'],
  ['emailing', 'votre newsletter', 'newsletter; emailing']
];

// ---------------------------------------------------------------------------
// Menu et installation
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Flow Inbox')
    .addItem('Installer ou vérifier', 'installer')
    .addItem('Traiter les nouvelles demandes', 'traiterNouvellesDemandes')
    .addItem('Vérifier réponses et retards', 'verifierReponsesEtRetards')
    .addSeparator()
    .addItem('Activer le traitement automatique', 'activerAutomatique')
    .addItem('Arrêter le traitement automatique', 'arreterAutomatique')
    .addToUi();
}

function fiOnglet(nom, entetes) {
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  var feuille = classeur.getSheetByName(nom);
  if (!feuille) {
    feuille = classeur.insertSheet(nom);
    if (entetes) {
      feuille.getRange(1, 1, 1, entetes.length).setValues([entetes]);
      feuille.setFrozenRows(1);
    }
  }
  return feuille;
}

function installer() {
  fiOnglet(FI_ONGLETS.suivi, FI_COLONNES);
  var reglages = fiOnglet(FI_ONGLETS.reglages, ['Réglage', 'Valeur', 'Aide']);
  if (reglages.getLastRow() < 2) reglages.getRange(2, 1, FI_REGLAGES_DEFAUT.length, 3).setValues(FI_REGLAGES_DEFAUT);
  var services = fiOnglet(FI_ONGLETS.services, ['Code', 'Libellé dans le brouillon', 'Mots-clés (séparés par ;)']);
  if (services.getLastRow() < 2) services.getRange(2, 1, FI_SERVICES_DEFAUT.length, 3).setValues(FI_SERVICES_DEFAUT);
  fiOnglet(FI_ONGLETS.journal, ['Date', 'Action', 'Détail']);
  var r = fiLireReglages();
  [r.libelle_a_traiter, r.libelle_traite].forEach(function (nom) {
    if (!GmailApp.getUserLabelByName(nom)) GmailApp.createLabel(nom);
  });
  fiJournal('installation', 'version ' + FI_VERSION + ', mode ' + r.mode);
  return r;
}

function activerAutomatique() {
  arreterAutomatique();
  ScriptApp.newTrigger('traiterNouvellesDemandes').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('verifierReponsesEtRetards').timeBased().everyHours(1).create();
  fiJournal('automatique', 'activé (traitement 15 min, vérification 1 h)');
}

function arreterAutomatique() {
  var noms = ['traiterNouvellesDemandes', 'verifierReponsesEtRetards'];
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (noms.indexOf(t.getHandlerFunction()) >= 0) { ScriptApp.deleteTrigger(t); n++; }
  });
  if (n) fiJournal('automatique', 'arrêté (' + n + ' déclencheurs supprimés)');
}

// ---------------------------------------------------------------------------
// Lecture des réglages
// ---------------------------------------------------------------------------

function fiLireReglages() {
  var valeurs = {};
  var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FI_ONGLETS.reglages);
  if (feuille && feuille.getLastRow() >= 2) {
    feuille.getRange(2, 1, feuille.getLastRow() - 1, 2).getValues().forEach(function (l) {
      valeurs[String(l[0]).trim()] = l[1];
    });
  }
  var lire = function (cle) {
    var v = valeurs[cle];
    if (v === undefined || String(v).trim() === '') {
      var defaut = FI_REGLAGES_DEFAUT.filter(function (d) { return d[0] === cle; })[0];
      return defaut ? defaut[1] : '';
    }
    return String(v).trim();
  };
  var entier = function (cle, min, max) {
    var n = parseInt(lire(cle), 10);
    if (!Number.isFinite(n) || n < min || n > max) throw new Error('Réglage invalide : « ' + cle + ' » (entre ' + min + ' et ' + max + ')');
    return n;
  };
  var mode = lire('Mode').toLowerCase() === 'actif' ? 'Actif' : 'Essai';
  return {
    mode: mode,
    adresse: (lire('Adresse de la boîte') || Session.getEffectiveUser().getEmail()).toLowerCase(),
    libelle_a_traiter: lire('Libellé à traiter'),
    libelle_traite: lire('Libellé traité'),
    delai_heures: entier('Délai de réponse (heures)', 1, 720),
    max_par_passage: entier('Nombre maximal par passage', 1, 50),
    signature: lire('Signature'),
    question: lire('Question complémentaire'),
    modele: lire('Modèle de brouillon'),
    max_caracteres: 20000
  };
}

function fiLireServices() {
  var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FI_ONGLETS.services);
  if (!feuille || feuille.getLastRow() < 2) return [];
  return feuille.getRange(2, 1, feuille.getLastRow() - 1, 3).getValues()
    .filter(function (l) { return String(l[0]).trim() && String(l[2]).trim(); })
    .map(function (l) {
      return { code: String(l[0]).trim(), libelle: String(l[1]).trim() || String(l[0]).trim(),
        mots: String(l[2]).split(';').map(function (m) { return m.trim(); }).filter(Boolean) };
    });
}

function fiJournal(action, detail) {
  var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FI_ONGLETS.journal);
  if (feuille) feuille.appendRow([new Date(), action, fiCelluleSure(detail)]);
}

function fiAvecVerrou(fonction) {
  var verrou = LockService.getScriptLock();
  if (!verrou.tryLock(30000)) { fiJournal('verrou', 'exécution déjà en cours, passage ignoré'); return null; }
  try { return fonction(); } finally { verrou.releaseLock(); }
}

function fiLignesSuivi() {
  var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FI_ONGLETS.suivi);
  var n = feuille.getLastRow() - 1;
  return { feuille: feuille, lignes: n > 0 ? feuille.getRange(2, 1, n, FI_COLONNES.length).getValues() : [] };
}

function fiAdresse(champ) {
  var m = /<([^>]+)>/.exec(String(champ || ''));
  return (m ? m[1] : String(champ || '')).trim().toLowerCase();
}

function fiDateTexte(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

// ---------------------------------------------------------------------------
// Traitement des nouvelles demandes
// ---------------------------------------------------------------------------

function traiterNouvellesDemandes() {
  return fiAvecVerrou(function () {
    var r = fiLireReglages();
    var services = fiLireServices();
    var suivi = fiLignesSuivi();
    var connus = {};
    suivi.lignes.forEach(function (l, i) { connus[String(l[FI_COL['Identifiant'] - 1])] = i + 2; });
    var traite = GmailApp.getUserLabelByName(r.libelle_traite) || GmailApp.createLabel(r.libelle_traite);

    var bilan = { lignes: 0, brouillons: 0, a_revoir: 0, hors: 0, repris: 0 };
    fiReprendreEnCours(suivi, r, bilan);

    var requete = 'label:"' + r.libelle_a_traiter + '" -label:"' + r.libelle_traite + '"';
    var fils = GmailApp.search(requete, 0, r.max_par_passage);
    fils.forEach(function (fil) {
      var message = fil.getMessages().filter(function (m) { return !m.isDraft(); })[0];
      if (!message) return;
      var id = message.getId();
      if (connus[id]) { fil.addLabel(traite); return; }

      var q = fiQualifier({
        de: fiAdresse(message.getFrom()),
        repondre_a: message.getReplyTo() ? fiAdresse(message.getReplyTo()) : null,
        objet: message.getSubject(),
        texte: message.getPlainBody(),
        entetes: {
          auto_submitted: message.getHeader('Auto-Submitted'),
          precedence: message.getHeader('Precedence'),
          list_unsubscribe: message.getHeader('List-Unsubscribe')
        }
      }, services, r);

      var statut = q.statut;
      if (q.brouillon && r.mode !== 'Actif') statut = '[essai] Brouillon possible';
      var creerBrouillon = q.brouillon && r.mode === 'Actif';
      var ligne = [
        fiDateTexte(message.getDate()),
        fiAdresse(message.getFrom()),
        message.getSubject(),
        q.service ? q.service.libelle : q.services_trouves.join(' ; '),
        fiFormaterBudget(q.budget),
        fiFormaterDelai(q.delai),
        fiLibelleManquants(q.manquants),
        fiLibelleRaisons(q.raisons),
        creerBrouillon ? 'En cours' : statut,
        '',
        fiProchaineAction(statut, q.raisons),
        '',
        'https://mail.google.com/mail/u/0/#all/' + fil.getId(),
        id
      ].map(fiCelluleSure);
      suivi.feuille.appendRow(ligne);
      var numero = suivi.feuille.getLastRow();
      connus[id] = numero;
      bilan.lignes++;
      if (creerBrouillon) {
        fiCreerBrouillonUnique(fil, message, q, r);
        suivi.feuille.getRange(numero, FI_COL['Statut']).setValue('Brouillon prêt');
        bilan.brouillons++;
      }
      if (statut === 'À revoir') bilan.a_revoir++;
      if (statut === 'Hors périmètre') bilan.hors++;
      fil.addLabel(traite);
    });
    fiJournal('traitement', bilan.lignes + ' demandes, ' + bilan.brouillons + ' brouillons, ' + bilan.a_revoir +
      ' à revoir, ' + bilan.hors + ' hors périmètre, ' + bilan.repris + ' reprises (mode ' + r.mode + ')');
    return bilan;
  });
}

/** Crée le brouillon sauf s'il en existe déjà un dans le fil (reprise après interruption). */
function fiCreerBrouillonUnique(fil, message, qualification, reglages) {
  var existant = GmailApp.getDrafts().some(function (d) {
    return d.getMessage().getThread().getId() === fil.getId();
  });
  if (existant) return false;
  message.createDraftReply(fiTexteBrouillon(qualification, reglages));
  return true;
}

/** Termine les lignes restées « En cours » (exécution interrompue entre la ligne et le brouillon). */
function fiReprendreEnCours(suivi, reglages, bilan) {
  var services = fiLireServices();
  suivi.lignes.forEach(function (l, i) {
    if (l[FI_COL['Statut'] - 1] !== 'En cours') return;
    var message = GmailApp.getMessageById(String(l[FI_COL['Identifiant'] - 1]));
    if (!message) return;
    var q = fiQualifier({ de: fiAdresse(message.getFrom()), repondre_a: null, objet: message.getSubject(),
      texte: message.getPlainBody(), entetes: {} }, services, reglages);
    var numero = i + 2;
    if (q.brouillon && reglages.mode === 'Actif') {
      fiCreerBrouillonUnique(message.getThread(), message, q, reglages);
      suivi.feuille.getRange(numero, FI_COL['Statut']).setValue('Brouillon prêt');
    } else {
      suivi.feuille.getRange(numero, FI_COL['Statut']).setValue('À revoir');
      suivi.feuille.getRange(numero, FI_COL['Prochaine action']).setValue('Qualifier à la main : traitement interrompu');
    }
    l[FI_COL['Statut'] - 1] = suivi.feuille.getRange(numero, FI_COL['Statut']).getValue();
    bilan.repris++;
  });
}

// ---------------------------------------------------------------------------
// Réponses et retards
// ---------------------------------------------------------------------------

function verifierReponsesEtRetards() {
  return fiAvecVerrou(function () {
    var r = fiLireReglages();
    var suivi = fiLignesSuivi();
    var maintenant = Date.now();
    var bilan = { repondus: 0, en_retard: 0 };
    suivi.lignes.forEach(function (l, i) {
      var statut = String(l[FI_COL['Statut'] - 1]);
      if (FI_STATUTS_OUVERTS.indexOf(statut) < 0) return;
      var numero = i + 2;
      var message = GmailApp.getMessageById(String(l[FI_COL['Identifiant'] - 1]));
      if (!message) return;
      var recu = message.getDate().getTime();
      var reponse = message.getThread().getMessages().filter(function (m) {
        return !m.isDraft() && fiAdresse(m.getFrom()) === r.adresse && m.getDate().getTime() > recu;
      })[0];
      if (reponse) {
        suivi.feuille.getRange(numero, FI_COL['Statut']).setValue('Répondu');
        suivi.feuille.getRange(numero, FI_COL['En retard']).setValue('');
        suivi.feuille.getRange(numero, FI_COL['Prochaine action']).setValue(fiProchaineAction('Répondu', []));
        suivi.feuille.getRange(numero, FI_COL['Répondu le']).setValue(fiDateTexte(reponse.getDate()));
        bilan.repondus++;
      } else if (fiEnRetard(statut, recu, maintenant, r.delai_heures)) {
        if (l[FI_COL['En retard'] - 1] !== 'Oui') suivi.feuille.getRange(numero, FI_COL['En retard']).setValue('Oui');
        bilan.en_retard++;
      }
    });
    fiJournal('vérification', bilan.repondus + ' réponses repérées, ' + bilan.en_retard + ' demandes en retard');
    return bilan;
  });
}
