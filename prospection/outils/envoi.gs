/**
 * Prospection par e-mail : brouillons, envoi, relances J+5, suivi des réponses (Google Apps Script, script lié au Google Sheet).
 *
 * AVERTISSEMENT DE SÉCURITÉ : lancer d'abord en MODE "BROUILLON" (par défaut)
 * - Relire chaque brouillon avant envoi
 * - Envoyer en petit volume (risque spam depuis un Gmail neuf) : plafond quotidien de 10
 * - Respecter l'opposition immédiate (onglet « Désinscrits »)
 * Passer en MODE "ENVOI" uniquement après test validé (voir constante MODE ci-dessous).
 *
 * Onglets attendus : « Suivi » (colonnes de suivi-modele.csv + segment), « Messages » (id | objet | corps | relance_objet | relance_corps),
 * « Désinscrits » (email), « Journal » (timestamp | action).
 *
 * Fonctions à lancer à la main : testerScript(), tester3Lignes(), envoyerMessages(), creerRelance(), verifierReponses(),
 * installerDeclencheurs(), supprimerDeclencheurs().
 * Fuseau horaire du projet : Europe/Paris (Paramètres du projet), sinon les dates et les heures de déclenchement sont décalées.
 */

const MODE = "BROUILLON"; // "BROUILLON" (défaut, sûr) ou "ENVOI" (à activer à la main)
const QUOTA_QUOTIDIEN = 10; // Nombre max de messages par jour (premiers messages + relances, toutes exécutions confondues)
const PAUSE_MIN_MS = 2000; // Pause min entre deux envois réels (ms), inutile pour de simples brouillons
const PAUSE_MAX_MS = 8000; // Pause max (aléatoire)
const DELAI_RELANCE_JOURS = 5; // Relance unique à J+5

// Formules neutres utilisées quand une valeur de fusion manque dans le Sheet (jamais de {{...}} brut dans un message)
const FORMULE_CABINET = "votre entreprise"; // remplace {{cabinet}}
const FORMULE_VILLE = "votre secteur"; // remplace {{ville}}

// Suivi des réponses
const LIBELLE_REPONSES = "Équerre/Réponses"; // libellé Gmail appliqué aux fils de réponse
const FENETRE_REPONSES_JOURS = 45; // on cherche les réponses reçues dans cette fenêtre
const TAILLE_LOT_RECHERCHE = 15; // adresses ou domaines par requête Gmail
const CLE_TRAITES = "messages_traites"; // PropertiesService : identifiants des messages déjà traités
const MAX_IDS_MEMORISES = 400; // PropertiesService : 9 Ko par valeur, soit environ 480 identifiants Gmail
const ATTENTE_VERROU_MS = 30000; // attente maximale du verrou avant d'abandonner

// Fonctions appelées par les déclencheurs (installerDeclencheurs / supprimerDeclencheurs)
const FONCTION_QUOTIDIENNE = "tacheQuotidienne";
const FONCTION_REPONSES = "verifierReponses";

// Statuts du suivi
const STATUT_A_ENVOYER = "à envoyer";
const PIED_DE_PAGE = "Vous pouvez à tout moment me demander de ne plus vous contacter.";

// ---------------------------------------------------------------------------
// Utilitaires : dates, journal, alerte, verrou
// ---------------------------------------------------------------------------

// Date du jour et conversion d'une cellule en "AAAA-MM-JJ" (Sheets peut convertir les dates en objets Date)
// Fuseau du CLASSEUR (Sheets stocke les dates à minuit dans ce fuseau), à défaut celui du script : évite tout décalage d'un jour
function fuseau() {
  try { return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || Session.getScriptTimeZone(); } catch (e) { return Session.getScriptTimeZone(); }
}
function aujourdhui() { return Utilities.formatDate(new Date(), fuseau(), "yyyy-MM-dd"); }
// Une chaîne qui n'est pas au format AAAA-MM-JJ (ex. « 12/10/2026 ») renvoie "" : jamais de comparaison de texte non ISO
function jour(v) {
  if (v instanceof Date) return Utilities.formatDate(v, fuseau(), "yyyy-MM-dd");
  return /^\d{4}-\d{2}-\d{2}/.test(String(v || "").trim()) ? String(v).trim().slice(0, 10) : "";
}
// Date dans n jours, même fuseau que aujourdhui() (évite le décalage UTC de toISOString)
function dateDans(n) { return Utilities.formatDate(new Date(new Date().getTime() + n * 24 * 60 * 60 * 1000), fuseau(), "yyyy-MM-dd"); }

function timestamp() {
  const now = new Date();
  return now.toISOString();
}

// Affiche une alerte quand le script est lancé depuis l'éditeur ; ne plante pas dans un déclencheur (pas d'interface)
function alerte(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    Logger.log(message);
  }
}

function sauvegarderLogs(logs) {
  if (!logs || logs.length === 0) return;
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Journal");
    const derniereLigne = sheet.getLastRow() + 1;
    const horodatage = timestamp();
    const valeurs = logs.map(function (l) { return [horodatage, l]; });
    sheet.getRange(derniereLigne, 1, valeurs.length, 2).setValues(valeurs);
  } catch (e) {
    Logger.log("Onglet 'Journal' non trouvé. Logs non enregistrés.");
  }
}

// Verrou global : empêche deux exécutions simultanées (déclencheur + lancement manuel) d'écrire en même temps dans le Sheet.
// Réentrant dans une même exécution (tacheQuotidienne appelle les autres fonctions déjà verrouillées).
let verrouActif = false;
function avecVerrou(nom, fonction) {
  if (verrouActif) return fonction();
  const verrou = LockService.getScriptLock();
  if (!verrou.tryLock(ATTENTE_VERROU_MS)) {
    const msg = nom + " : une autre exécution est en cours, abandon.";
    Logger.log(msg);
    sauvegarderLogs([msg]);
    return null;
  }
  verrouActif = true;
  try {
    return fonction();
  } finally {
    verrouActif = false;
    verrou.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Lecture du Sheet
// ---------------------------------------------------------------------------

// Lit l'onglet « Suivi » et repère les colonnes par leur nom d'en-tête. Retourne null (avec message) si une colonne manque.
function lireSuivi() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Suivi");
  if (!sheet) { alerte("Onglet « Suivi » introuvable."); return null; }
  const donnees = sheet.getDataRange().getValues();
  const entetes = (donnees[0] || []).map(function (h) { return String(h == null ? "" : h).trim(); });
  const NOMS = { id: "id", cabinet: "cabinet", ville: "ville", email: "email_generique", offre: "offre_testee", statut: "statut", dateEnvoi: "date_envoi", dateRelance: "date_relance_J5", reponse: "reponse", notes: "notes" };
  const c = {};
  Object.keys(NOMS).forEach(function (k) { c[k] = entetes.indexOf(NOMS[k]); });
  const manquantes = Object.keys(c).filter(function (k) { return c[k] === -1; }).map(function (k) { return NOMS[k]; });
  if (manquantes.length > 0) {
    const msg = "Colonnes manquantes dans « Suivi » : " + manquantes.join(", ");
    Logger.log(msg);
    sauvegarderLogs([msg]);
    alerte(msg);
    return null;
  }
  return { sheet: sheet, donnees: donnees, c: c };
}

// Neutralise l'injection de formule : un texte de tiers commençant par = + - @ est écrit comme du texte
function sure(v) { const s = String(v == null ? "" : v); return /^[=+\-@]/.test(s) ? "'" + s : s; }

function texte(v) { return String(v == null ? "" : v).trim(); }

// Nombre d'actions faites AUJOURD'HUI (premiers messages datés d'aujourd'hui + relances d'aujourd'hui), toutes exécutions confondues
function compterActionsDuJour(donnees, c) {
  const auj = aujourdhui();
  let n = 0;
  for (let k = 1; k < donnees.length; k++) {
    if (jour(donnees[k][c.dateEnvoi]) === auj) n++;
    if (String(donnees[k][c.notes] || "").indexOf("[relancé " + auj + "]") !== -1) n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Champs de fusion {{cabinet}} et {{ville}}
// ---------------------------------------------------------------------------

// Remplace {{cabinet}} et {{ville}} (espaces et casse tolérés) ; si la valeur manque, utilise une formule neutre.
function fusionner(modele, valeurs) {
  const cabinet = texte(valeurs && valeurs.cabinet) || FORMULE_CABINET;
  const ville = texte(valeurs && valeurs.ville) || FORMULE_VILLE;
  return String(modele || "")
    .replace(/\{\{\s*cabinet\s*\}\}/gi, function () { return cabinet; })
    .replace(/\{\{\s*ville\s*\}\}/gi, function () { return ville; });
}

// Un champ inconnu (ex. {{prenom}}) ne doit jamais partir tel quel : retourne le premier champ restant, ou null.
function champRestant(s) {
  const m = String(s || "").match(/\{\{[^}]*\}\}/);
  return m ? m[0] : null;
}

// Objet et corps prêts à envoyer ; { erreur } si un champ de fusion inconnu subsiste
function composer(objetModele, corpsModele, valeurs) {
  const objet = fusionner(objetModele, valeurs);
  let corps = fusionner(corpsModele, valeurs);
  const reste = champRestant(objet) || champRestant(corps);
  if (reste) return { erreur: "champ de fusion inconnu " + reste };
  if (!String(objet).trim() || !String(corps).trim()) return { erreur: "objet ou corps vide dans l'onglet Messages" };
  // Pied de page d'opposition (la phrase n'est pas saisie dans l'onglet Messages)
  if (corps.indexOf("Vous pouvez à tout moment") === -1) corps += "\n\n" + PIED_DE_PAGE;
  return { objet: objet, corps: corps };
}

// ---------------------------------------------------------------------------
// Premiers messages
// ---------------------------------------------------------------------------

// options.limite (facultatif) : nombre maximal de messages pour CETTE exécution (ex. 3 pour un test), dans la limite du plafond quotidien.
// Appelée par un déclencheur, le premier argument est un objet d'événement : sans propriété « limite », il est ignoré.
function envoyerMessages(options) {
  const limite = (options && typeof options.limite === "number") ? options.limite : null;
  return avecVerrou("envoyerMessages", function () { return envoyerMessagesInterne(limite); });
}

function tester3Lignes() { return envoyerMessages({ limite: 3 }); }

function envoyerMessagesInterne(limite) {
  if (MODE !== "BROUILLON" && MODE !== "ENVOI") {
    const msg = "MODE invalide : \"" + MODE + "\". Utiliser \"BROUILLON\" ou \"ENVOI\".";
    sauvegarderLogs([msg]);
    alerte(msg);
    return 0;
  }
  const suivi = lireSuivi();
  if (!suivi) return 0;
  const sheet = suivi.sheet, donnees = suivi.donnees, c = suivi.c;

  const desinscrits = chargerDesinscrits();
  const messages = chargerMessages();
  if (Object.keys(messages).length === 0) {
    const m = "Onglet « Messages » introuvable ou vide : aucun message créé.";
    sauvegarderLogs([m]);
    alerte(m);
    return 0;
  }
  let totalAujourdhui = compterActionsDuJour(donnees, c); // actions déjà faites aujourd'hui
  let nbCrees = 0; // actions de CETTE exécution
  const logs = [];

  // Adresses déjà contactées (statut autre que « à envoyer ») : jamais de second premier message à la même adresse
  const dejaContactes = {};
  for (let k = 1; k < donnees.length; k++) {
    const s = texte(donnees[k][c.statut]);
    if (s !== "" && s !== STATUT_A_ENVOYER) dejaContactes[texte(donnees[k][c.email]).toLowerCase()] = true;
  }

  for (let i = 1; i < donnees.length; i++) {
    if (totalAujourdhui >= QUOTA_QUOTIDIEN) {
      logs.push("Plafond quotidien (" + QUOTA_QUOTIDIEN + ") atteint. Arrêt.");
      break;
    }
    if (limite !== null && nbCrees >= limite) {
      logs.push("Limite de cette exécution (" + limite + ") atteinte. Arrêt.");
      break;
    }

    const ligne = donnees[i];
    const statut = texte(ligne[c.statut]);
    const email = texte(ligne[c.email]);
    const offre = texte(ligne[c.offre]);
    const cabinet = texte(ligne[c.cabinet]);

    // Vérifier les conditions
    if (statut !== STATUT_A_ENVOYER) {
      if (normaliser(statut) === "a envoyer") logs.push("Ligne " + (i + 1) + " : statut « " + statut + " » non reconnu (attendu « à envoyer »). Ignorée.");
      continue;
    }
    if (!email || email.indexOf("@") === -1) {
      logs.push("Ligne " + (i + 1) + " : email invalide (" + email + "). Ignorée.");
      continue;
    }
    const cle = email.toLowerCase();
    if (desinscrits.indexOf(cle) !== -1) {
      logs.push(email + " est désinscrit. Ignorée.");
      sheet.getRange(i + 1, c.statut + 1).setValue("désinscrit");
      continue;
    }
    if (dejaContactes[cle]) {
      logs.push("Ligne " + (i + 1) + " : " + email + " déjà contacté (autre ligne). Ignorée.");
      continue;
    }

    // Chercher le message correspondant à l'offre
    const messageData = messages[offre];
    if (!messageData) {
      logs.push("Ligne " + (i + 1) + " : offre \"" + offre + "\" inconnue. Ignorée.");
      continue;
    }
    const mail = composer(messageData.objet, messageData.corps, { cabinet: cabinet, ville: ligne[c.ville] });
    if (mail.erreur) {
      logs.push("Ligne " + (i + 1) + " (" + offre + ") : " + mail.erreur + ". Ignorée.");
      continue;
    }

    // Créer ou envoyer le message
    try {
      if (MODE === "BROUILLON") {
        GmailApp.createDraft(email, mail.objet, mail.corps);
        logs.push("Brouillon créé : " + email + " (" + cabinet + ") - " + mail.objet);
      } else {
        GmailApp.sendEmail(email, mail.objet, mail.corps);
        logs.push("Envoyé : " + email + " (" + cabinet + ") - " + mail.objet);
      }
    } catch (e) {
      logs.push("ERREUR Gmail pour " + email + " : " + e + ". Arrêt.");
      break;
    }
    dejaContactes[cle] = true;

    // Mettre à jour la ligne
    sheet.getRange(i + 1, c.statut + 1).setValue(MODE === "ENVOI" ? "envoyé" : "brouillon créé");
    sheet.getRange(i + 1, c.dateEnvoi + 1).setValue(aujourdhui());
    // Pas de date de relance pour un simple brouillon : synchroniserEnvoyes() la renseigne quand le message est réellement parti
    if (MODE === "ENVOI") sheet.getRange(i + 1, c.dateRelance + 1).setValue(dateDans(DELAI_RELANCE_JOURS));

    totalAujourdhui++;
    nbCrees++;

    // Pause aléatoire entre deux envois réels (inutile pour des brouillons)
    if (MODE === "ENVOI" && i < donnees.length - 1) {
      const pause = Math.random() * (PAUSE_MAX_MS - PAUSE_MIN_MS) + PAUSE_MIN_MS;
      Utilities.sleep(Math.floor(pause));
    }
  }

  // Enregistrer les logs
  sauvegarderLogs(logs);
  Logger.log(logs.join("\n"));

  if (MODE === "BROUILLON") {
    alerte(nbCrees + " brouillons créés (mode BROUILLON).\nRelisez-les, envoyez-les à la main depuis Gmail : le statut passera à « envoyé » tout seul (synchroniserEnvoyes, toutes les heures).");
  } else {
    alerte(nbCrees + " messages envoyés.");
  }
  return nbCrees;
}

// ---------------------------------------------------------------------------
// Relances (une seule, à J+5)
// ---------------------------------------------------------------------------

function relancesDues() {
  const suivi = lireSuivi();
  if (!suivi) return [];
  const donnees = suivi.donnees, c = suivi.c;
  const desinscrits = chargerDesinscrits();
  const relances = [];
  const aujourd = aujourdhui();

  for (let i = 1; i < donnees.length; i++) {
    const ligne = donnees[i];
    const statut = texte(ligne[c.statut]);
    const dateRelance = ligne[c.dateRelance] || "";
    const email = texte(ligne[c.email]);
    const notes = String(ligne[c.notes] || "");

    // Vérifier les conditions
    if (statut !== "envoyé") continue;
    if (notes.indexOf("relancé") !== -1) continue; // une seule relance, jamais de seconde
    if (texte(ligne[c.reponse]) !== "") continue; // le prospect a déjà répondu
    const jr = jour(dateRelance);
    if (!jr || jr > aujourd) continue; // pas encore J+5 (ou date illisible)
    if (desinscrits.indexOf(email.toLowerCase()) !== -1) continue;

    relances.push({ ligne: i + 1, email: email, cabinet: texte(ligne[c.cabinet]), offre: texte(ligne[c.offre]) });
  }
  return relances; // Retourner la liste pour affichage
}

// Fil Gmail du premier message envoyé à cette adresse (pour répondre dans le même fil), ou null
function trouverFilEnvoye(email) {
  try {
    const fils = GmailApp.search("in:sent to:" + email, 0, 1);
    return fils && fils.length > 0 ? fils[0] : null;
  } catch (e) {
    return null;
  }
}

function creerRelance() {
  return avecVerrou("creerRelance", creerRelanceInterne);
}

function creerRelanceInterne() {
  verifierReponsesInterne(); // d'abord les réponses : on ne relance jamais quelqu'un qui a déjà répondu
  const relances = relancesDues();
  if (relances.length === 0) {
    alerte("Aucune relance due.");
    return 0;
  }
  if (MODE !== "BROUILLON" && MODE !== "ENVOI") {
    alerte("MODE invalide : \"" + MODE + "\".");
    return 0;
  }

  const suivi = lireSuivi();
  if (!suivi) return 0;
  const sheet = suivi.sheet, donnees = suivi.donnees, c = suivi.c;
  const messages = chargerMessages();
  let totalAujourdhui = compterActionsDuJour(donnees, c);
  let nbRelances = 0;
  const logs = [];

  for (const relance of relances) {
    if (totalAujourdhui >= QUOTA_QUOTIDIEN) {
      logs.push("Plafond quotidien (" + QUOTA_QUOTIDIEN + ") atteint. Relances restantes reportées.");
      break;
    }
    const ligne = donnees[relance.ligne - 1];
    const messageData = messages[texte(ligne[c.offre])];
    if (!messageData || !messageData.relance) continue;

    const mail = composer(messageData.relance.objet, messageData.relance.corps, { cabinet: ligne[c.cabinet], ville: ligne[c.ville] });
    if (mail.erreur) {
      logs.push("Relance ligne " + relance.ligne + " : " + mail.erreur + ". Ignorée.");
      continue;
    }

    try {
      // Dans le fil du premier message si on le retrouve (« Re : » exact), sinon message séparé
      const fil = trouverFilEnvoye(relance.email);
      if (MODE === "BROUILLON") {
        if (fil) fil.createDraftReply(mail.corps); else GmailApp.createDraft(relance.email, mail.objet, mail.corps);
      } else {
        if (fil) fil.reply(mail.corps); else GmailApp.sendEmail(relance.email, mail.objet, mail.corps);
      }
      logs.push((MODE === "BROUILLON" ? "Brouillon de relance : " : "Relance envoyée : ") + relance.email);
    } catch (e) {
      logs.push("ERREUR Gmail (relance) pour " + relance.email + " : " + e + ". Arrêt.");
      break;
    }

    // Marquer comme relancé dans les notes (une seule relance par prospect)
    const anciennesNotes = texte(ligne[c.notes]);
    sheet.getRange(relance.ligne, c.notes + 1).setValue((anciennesNotes ? anciennesNotes + " " : "") + "[relancé " + aujourdhui() + "]");

    totalAujourdhui++;
    nbRelances++;
    if (MODE === "ENVOI") Utilities.sleep(Math.floor(Math.random() * (PAUSE_MAX_MS - PAUSE_MIN_MS) + PAUSE_MIN_MS));
  }

  sauvegarderLogs(logs);
  Logger.log(logs.join("\n"));
  alerte(nbRelances + " relance(s) créée(s) en mode " + MODE + ".");
  return nbRelances;
}

// ---------------------------------------------------------------------------
// Onglets Désinscrits et Messages
// ---------------------------------------------------------------------------

function chargerDesinscrits() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Désinscrits");
    const donnees = sheet.getDataRange().getValues();
    const desinscrits = [];
    for (let i = 1; i < donnees.length; i++) {
      const email = String(donnees[i][0] || "").toLowerCase().trim();
      if (email) desinscrits.push(email);
    }
    return desinscrits;
  } catch (e) {
    Logger.log("Onglet 'Désinscrits' non trouvé. Aucun email ignoré.");
    return [];
  }
}

// Ajoute une adresse à l'onglet « Désinscrits » (crée l'onglet s'il manque ; pas de doublon)
function ajouterDesinscrit(email) {
  const cle = String(email || "").toLowerCase().trim();
  if (!cle) return;
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = classeur.getSheetByName("Désinscrits");
  if (!sheet) {
    sheet = classeur.insertSheet("Désinscrits");
    sheet.appendRow(["email"]);
  }
  if (chargerDesinscrits().indexOf(cle) === -1) sheet.appendRow([sure(cle)]);
}

// Onglet « Messages » : id | objet | corps | relance_objet | relance_corps (en-tête sur la première ligne)
function chargerMessages() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Messages");
    const donnees = sheet.getDataRange().getValues();
    const messages = {};

    for (let i = 1; i < donnees.length; i++) {
      const id = String(donnees[i][0] || "").trim(); // EF-V1, EF-V2, DEC, EF-CAB...
      if (!id) continue;
      const objet = donnees[i][1];
      const corps = donnees[i][2];
      const relanceObjet = donnees[i][3]; // relance_objet (optionnel)
      const relanceCorps = donnees[i][4]; // relance_corps (optionnel)

      messages[id] = {
        objet: objet,
        corps: corps
      };

      if (relanceObjet && relanceCorps) {
        messages[id].relance = {
          objet: relanceObjet,
          corps: relanceCorps
        };
      }
    }

    return messages;
  } catch (e) {
    Logger.log("Onglet 'Messages' non trouvé.");
    return {};
  }
}

// ---------------------------------------------------------------------------
// Suivi des réponses : verifierReponses()
// ---------------------------------------------------------------------------

// Retire les accents, met en minuscules, normalise les apostrophes (pour les recherches de mots-clés)
function normaliser(s) {
  return String(s || "").toLowerCase().replace(/[’‘`]/g, "'").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Adresse e-mail d'un en-tête « Nom <adresse> »
function extraireAdresse(from) {
  const s = String(from || "");
  const m = s.match(/<([^<>]+)>\s*$/) || s.match(/<([^<>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
}

function domaineDe(adresse) { return String(adresse).split("@")[1] || ""; }

const DOMAINES_GRAND_PUBLIC = ["gmail.com", "googlemail.com", "yahoo.fr", "yahoo.com", "hotmail.fr", "hotmail.com", "outlook.fr", "outlook.com", "live.fr", "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net", "icloud.com", "aol.com"];

// Ne garde que le texte NOUVEAU d'une réponse : retire les citations (« > ... »), l'historique (« Le ... a écrit : ») et notre pied de page.
// Indispensable : notre propre message cité contient « ne plus vous contacter », qui ne doit pas passer pour une opposition.
function texteNouveau(corps) {
  let t = String(corps || "").replace(/\r/g, "");
  const coupe = t.search(/(^|\n)\s*(le\s[^\n]{0,200}(\n[^\n]{0,200})?a\s+[ée]crit\s*:|on\s[^\n]{0,200}(\n[^\n]{0,200})?wrote\s*:|-{2,}\s*(message d.origine|original message|forwarded message)|de\s*:\s[^\n]*<[^>]+>\s*\n\s*(envoy|date))/i);
  if (coupe >= 0) t = t.slice(0, coupe);
  // Citation sans « > » : on coupe à la ligne qui contient notre propre adresse (en-tête « De : ... [mailto:...] » ou signature)
  const moi = String(Session.getEffectiveUser().getEmail() || "@@").toLowerCase();
  const iMoi = t.toLowerCase().indexOf(moi);
  if (iMoi >= 0) t = t.slice(0, t.lastIndexOf("\n", iMoi) + 1);
  t = t.split("\n").filter(function (l) { return !/^\s*>/.test(l); }).join("\n");
  return t.replace(PIED_DE_PAGE, "").trim();
}

// Demande d'opposition / de désinscription (texte déjà normalisé)
const MOTIFS_OPPOSITION = [
  /\bstop\b/,
  /desinscri/, /desabonn/, /unsubscribe/,
  /\bne\s+(?:plus\s+)?(?:me|nous|m'|n')\s*(?:contact|ecri|sollicit|relanc|envoy)\w*/,
  /\bne\s+(?:me|nous)\s+(?:contactez|ecrivez|sollicitez|relancez|envoyez)\s+plus/,
  /\b(?:retir|supprim|enlev|radi)\w*\s+(?:moi|nous|mon\s+adresse|notre\s+adresse|mon\s+e-?mail|mes\s+coordonnees|mes\s+donnees|nos\s+donnees)/,
  /\b(?:retirez|supprimez|enlevez|radiez)\b[^.\n]{0,60}\b(?:liste|fichier|base)/,
  /\bje\s+m'oppose\b/, /\bdroit\s+d'opposition\b/, /(?<!aucune\s|sans\s|pas\s+de\s|pas\s+d')\bopposition\b/,
  /\bne\s+souhait\w*\s+plus\s+(?:recevoir|etre\s+(?:contacte|sollicite))/,
  /\bplus\s+recevoir\s+(?:de\s+|vos\s+)?(?:mails?|messages?|e-?mails?|courriels?|sollicitations?)/,
  /\bcessez\b/, /\barretez\s+de\s+(?:m'|nous\s+)?(?:ecrire|envoyer|contacter|solliciter)/,
  /\b(?:ne|n')\s*(?:\w+\s+){0,2}plus\s+(?:\w+\s+){0,3}(?:contact|ecri|envoy|sollicit|relanc|demarch|recontact|reveni)\w*/,
  /\b(?:ne|n')\s*(?:me\s+|nous\s+|m')?(?:contact|ecri|envoy|sollicit|relanc|demarch|recontact)\w*\s+(?:plus|pas)\b/,
  /\bne\s+(?:pas\s+)?(?:me|nous)\s+recontact/,
  /\bne\s+reven\w*\s+plus/,
  /\bcesser\s+de\s+(?:m'|me\s+|nous\s+)?(?:demarch|contact|ecri|solliciter)/,
  /\bne\s+(?:veux|veut|voulons|souhait\w*|desir\w*)\s+(?:plus|pas)\s+(?:etre\s+)?(?:re)?(?:contacte|sollicite|demarche|derange)/,
  /\bne\s+(?:veux|voulons)\s+plus\s+de\s+(?:vos|ces)/,
  /\b(?:retir|supprim|enlev|radi|effac)\w*[\s-]+(?:moi|nous|mon|ma|mes|nos|notre|de\s+(?:vos|votre))/,
  /\bretir\w*\s+(?:de\s+)?(?:vos|votre|la|cette)\s+(?:liste|fichier|base|diffusion)/,
  /(?:^|[.!?\n]\s*)plus\s+de\s+(?:mails?|messages?|e-?mails?|courriels?|sollicitations?|prospection)/,
  /\b(?:mettre\s+fin|arreter|cesser|stopper|stoppez)\b[^.\n]{0,40}\b(?:envois?|sollicitations?|mails?|messages?|demarchage|prospection)/,
  /\bspam\b/,
  /\brefus\w*\s+(?:toute\s+)?(?:sollicitation|demarchage|prospection)/,
  /\bsuppression\s+de\s+(?:mes|nos)\s+donnees/,
  /\bdroit\s+a\s+l'effacement/,
];

// Signaux positifs (texte normalisé) : oui, intéressé, devis, tarif, programme, échange, visio, rendez-vous
const MOTIFS_INTERESSE = /\b(oui|interess\w*|devis|tarifs?|programme|echange\w*|echanger|visio|rendez-?vous|volontiers|appelez|rappelez|d'accord|preneur|plus\s+d'info\w*|ok\s+pour)\b/;
const MOTIFS_NEGATION = /\bne\s+(?:m'|nous\s+|me\s+)?interess\w*\s+(?:vraiment\s+|plus\s+)?pas|\bne\s+(?:m'|nous\s+)?interess\w*\s+plus|\bplus\s+interess|\bpas\s+(?:vraiment\s+|trop\s+|du\s+tout\s+)?interess|\baucun\s+interet|\bpas\s+d'interet|\bsans\s+interet|\bnon\s+merci|\bdeja\s+(?:un|une|equipe|equipes|en\s+place)\b|\bd'ores\s+et\s+deja/;

function estOpposition(nouveau) {
  const t = normaliser(nouveau);
  return MOTIFS_OPPOSITION.some(function (re) { return re.test(t); });
}

function estInteressant(nouveau) {
  const t = normaliser(nouveau);
  return MOTIFS_INTERESSE.test(t) && !MOTIFS_NEGATION.test(t);
}

function estReponseAutomatique(sujet, nouveau) {
  // Le sujet suffit (« Absence », « Réponse automatique ») ; dans le corps seule une mention explicite compte : une vraie réponse « je suis absent jusqu'au 20, mais oui... » ne doit jamais être perdue
  if (/reponse automatique|automatic reply|auto-?reply|out of office|absent du bureau|absence du bureau|absence/.test(normaliser(sujet))) return true;
  return /reponse automatique|automatic reply|auto-?reply|out of office/.test(normaliser(String(nouveau || "").slice(0, 300)));
}

// Classe un message système (mailer-daemon, postmaster) : "echec", "retard" ou "autre"
function classerRebond(sujet, corps) {
  const t = normaliser(sujet + " " + String(corps || "").slice(0, 1500));
  if (/\(delay\)|delayed|retard|will (?:keep trying|retry)|nouvelle tentative/.test(normaliser(sujet + " " + String(corps || "").slice(0, 600)))) return "retard";
  if (/failure|failed|undeliverable|couldn't be delivered|wasn't delivered|address not found|n'a pas ete remis|non remis|n'existe pas|does not exist|user unknown|no such user|\b5\.\d\.\d\b|\b55\d\b/.test(t)) return "echec";
  if (/delay|retard|temporar|temporaire|will keep trying|nouvelle tentative/.test(t)) return "retard";
  return "autre";
}

// Adresse citée en entier (pas « superinfo@a.fr » pour « info@a.fr »), un point final de phrase restant toléré
function citeAdresse(t, a) {
  const e = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(?<![a-z0-9._%+-])" + e + "(?![a-z0-9_%+-]|\\.[a-z0-9])").test(t);
}

// Mémoire des messages déjà traités (identifiants Gmail) : jamais deux notifications pour le même message
function chargerTraites() {
  try {
    const brut = PropertiesService.getScriptProperties().getProperty(CLE_TRAITES);
    const liste = brut ? JSON.parse(brut) : [];
    const ensemble = {};
    liste.forEach(function (id) { ensemble[id] = true; });
    return { ensemble: ensemble, liste: liste };
  } catch (e) {
    return { ensemble: {}, liste: [] };
  }
}
function memoriserTraite(traites, id) {
  if (traites.ensemble[id]) return;
  traites.ensemble[id] = true;
  traites.liste.push(id);
  if (traites.liste.length > MAX_IDS_MEMORISES) traites.liste = traites.liste.slice(traites.liste.length - MAX_IDS_MEMORISES);
  PropertiesService.getScriptProperties().setProperty(CLE_TRAITES, JSON.stringify(traites.liste));
}

function libelleReponses() {
  return GmailApp.getUserLabelByName(LIBELLE_REPONSES) || GmailApp.createLabel(LIBELLE_REPONSES);
}

// Résultat de recherche Gmail paginé (par pages de 50 fils)
function rechercher(requete) {
  const fils = [];
  for (let debut = 0; debut < 500; debut += 50) {
    const page = GmailApp.search(requete, debut, 50);
    page.forEach(function (f) { fils.push(f); });
    if (page.length < 50) break;
  }
  return fils;
}

// Brouillons envoyés à la main depuis Gmail : on passe la ligne de « brouillon créé » à « envoyé » et on pose la date de relance (+5 jours)
function synchroniserEnvoyes() {
  return avecVerrou("synchroniserEnvoyes", function () {
    const suivi = lireSuivi();
    if (!suivi) return 0;
    const sheet = suivi.sheet, donnees = suivi.donnees, c = suivi.c;
    const logs = [];
    let nb = 0;
    for (let i = 1; i < donnees.length; i++) {
      if (texte(donnees[i][c.statut]) !== "brouillon créé") continue;
      const email = texte(donnees[i][c.email]);
      if (!email) continue;
      const depuis = jour(donnees[i][c.dateEnvoi]).replace(/-/g, "/");
      let fils = [];
      try { fils = GmailApp.search("in:sent to:" + email + (depuis ? " after:" + depuis : ""), 0, 1); } catch (e) { fils = []; }
      if (fils.length === 0) continue;
      const dateEnvoi = jour(fils[0].getLastMessageDate());
      sheet.getRange(i + 1, c.statut + 1).setValue("envoyé");
      sheet.getRange(i + 1, c.dateEnvoi + 1).setValue(dateEnvoi);
      const relance = Utilities.formatDate(new Date(fils[0].getLastMessageDate().getTime() + DELAI_RELANCE_JOURS * 24 * 60 * 60 * 1000), fuseau(), "yyyy-MM-dd");
      sheet.getRange(i + 1, c.dateRelance + 1).setValue(relance);
      donnees[i][c.statut] = "envoyé";
      logs.push("Envoi détecté : " + email + " (relance prévue le " + relance + ")");
      nb++;
    }
    sauvegarderLogs(logs);
    return nb;
  });
}

// À lancer toutes les heures (installerDeclencheurs) : détecte réponses, oppositions et rebonds, met à jour le Sheet,
// pose le libellé Gmail « Équerre/Réponses » et envoie UNE notification par nouveau message à l'adresse du compte.
function verifierReponses() {
  return avecVerrou("verifierReponses", verifierReponsesInterne);
}

function verifierReponsesInterne() {
  synchroniserEnvoyes();
  const suivi = lireSuivi();
  if (!suivi) return null;
  const sheet = suivi.sheet, donnees = suivi.donnees, c = suivi.c;
  const moi = String(Session.getEffectiveUser().getEmail() || "").toLowerCase();
  const traites = chargerTraites();
  const logs = [];
  const bilan = { reponses: 0, interessantes: 0, oppositions: 0, rebonds: 0 };

  // Lignes déjà contactées (hors « à envoyer », « désinscrit » et « bounce »)
  const lignes = {}; // adresse -> { ligne, email, statut, cabinet, offre }
  const parDomaine = {}; // domaine -> [adresses]
  for (let i = 1; i < donnees.length; i++) {
    const statut = texte(donnees[i][c.statut]);
    const email = texte(donnees[i][c.email]).toLowerCase();
    if (!email || email.indexOf("@") === -1) continue;
    if (statut === "" || statut === STATUT_A_ENVOYER || statut === "désinscrit" || statut === "bounce") continue;
    if (lignes[email]) continue;
    lignes[email] = { ligne: i + 1, email: email, statut: statut, cabinet: texte(donnees[i][c.cabinet]), offre: texte(donnees[i][c.offre]), dateEnvoi: jour(donnees[i][c.dateEnvoi]), notes: texte(donnees[i][c.notes]) };
    const d = domaineDe(email);
    (parDomaine[d] = parDomaine[d] || []).push(email);
  }
  const adresses = Object.keys(lignes);
  if (adresses.length === 0) {
    sauvegarderLogs(["verifierReponses : aucune adresse contactée à surveiller."]);
    return bilan;
  }

  // Modifie la ligne du Sheet et la copie en mémoire
  function majLigne(info, champs) {
    if (champs.statut) { sheet.getRange(info.ligne, c.statut + 1).setValue(champs.statut); info.statut = champs.statut; }
    if (champs.reponse) sheet.getRange(info.ligne, c.reponse + 1).setValue(sure(champs.reponse));
    if (champs.note) { info.notes = (info.notes ? info.notes + " " : "") + champs.note; sheet.getRange(info.ligne, c.notes + 1).setValue(info.notes); }
  }

  function notifier(sujet, lignesCorps) {
    try {
      GmailApp.sendEmail(Session.getEffectiveUser().getEmail(), sujet, lignesCorps.join("\n"));
    } catch (e) {
      logs.push("ERREUR notification (" + sujet + ") : " + e);
    }
  }

  // Ligne du Sheet correspondant à une adresse expéditrice : adresse exacte, sinon domaine d'entreprise (jamais un domaine grand public) s'il est sans ambiguïté
  function trouverLigne(adresse) {
    if (lignes[adresse]) return lignes[adresse];
    const d = domaineDe(adresse);
    if (DOMAINES_GRAND_PUBLIC.indexOf(d) === -1 && parDomaine[d] && parDomaine[d].length === 1) return lignes[parDomaine[d][0]];
    return null;
  }

  // 1. Réponses : recherche par lots d'adresses (domaine pour une adresse d'entreprise, adresse exacte pour un domaine grand public)
  const termes = {};
  adresses.forEach(function (a) { termes[DOMAINES_GRAND_PUBLIC.indexOf(domaineDe(a)) === -1 ? domaineDe(a) : a] = true; });
  const listeTermes = Object.keys(termes);
  let libelle = null;

  for (let debut = 0; debut < listeTermes.length; debut += TAILLE_LOT_RECHERCHE) {
    const lot = listeTermes.slice(debut, debut + TAILLE_LOT_RECHERCHE);
    const requete = "from:(" + lot.join(" OR ") + ") newer_than:" + FENETRE_REPONSES_JOURS + "d -in:sent -in:drafts";
    rechercher(requete).forEach(function (fil) {
      fil.getMessages().forEach(function (msg) {
        const id = msg.getId();
        if (traites.ensemble[id]) return; // déjà vu : jamais de seconde notification
        const adresse = extraireAdresse(msg.getFrom());
        if (adresse === moi || /^(mailer-daemon|postmaster)@/.test(adresse)) return; // nos envois ; les rebonds sont traités plus bas
        const info = trouverLigne(adresse);
        if (!info) {
          const dom = domaineDe(adresse);
          if (DOMAINES_GRAND_PUBLIC.indexOf(dom) === -1 && parDomaine[dom] && parDomaine[dom].length > 1) {
            logs.push("Message non rattaché (domaine partagé) : " + adresse);
            memoriserTraite(traites, id);
            notifier("[Équerre] Message à rattacher à la main : " + adresse, ["De : " + adresse, "Objet : " + msg.getSubject()]);
          }
          return;
        }
        if (info.dateEnvoi && jour(msg.getDate()) < info.dateEnvoi) return; // antérieur à notre message : sans rapport

        const sujet = msg.getSubject();
        const nouveau = texteNouveau(msg.getPlainBody());
        const extrait = nouveau.replace(/\s+/g, " ").slice(0, 300);
        const auj = aujourdhui();

        if (estOpposition(nouveau)) {
          // Opposition : statut désinscrit + onglet « Désinscrits » (l'adresse du Sheet ET l'adresse expéditrice)
          ajouterDesinscrit(info.email);
          if (adresse !== info.email) ajouterDesinscrit(adresse);
          majLigne(info, { statut: "désinscrit", reponse: extrait, note: "[opposition " + auj + "]" });
          bilan.oppositions++;
          logs.push("Opposition : " + info.email + " (" + info.cabinet + ") ajouté aux Désinscrits");
          memoriserTraite(traites, id);
          if (!libelle) libelle = libelleReponses();
          fil.addLabel(libelle);
          notifier("[Équerre] Opposition : " + info.cabinet, [
            "Demande d'opposition reçue : " + info.email + " (" + info.cabinet + ", offre " + info.offre + ").",
            "Adresse ajoutée à l'onglet « Désinscrits », statut « désinscrit ». Répondre par une courte confirmation (voir reponses-types.md).",
            "", "Extrait : " + extrait,
          ]);
        } else if (estReponseAutomatique(sujet, nouveau)) {
          logs.push("Réponse automatique ignorée : " + info.email);
          memoriserTraite(traites, id);
        } else {
          const interessant = estInteressant(nouveau);
          const nouveauStatut = (info.statut === "envoyé" || info.statut === "brouillon créé") ? "répondu" : null;
          majLigne(info, { statut: nouveauStatut, reponse: extrait, note: "[réponse " + auj + "]" + (interessant ? " [intéressant]" : "") });
          bilan.reponses++;
          if (interessant) bilan.interessantes++;
          logs.push("Réponse" + (interessant ? " (intéressant)" : "") + " : " + info.email + " (" + info.cabinet + ")");
          memoriserTraite(traites, id);
          if (!libelle) libelle = libelleReponses();
          fil.addLabel(libelle);
          notifier("[Équerre] Réponse" + (interessant ? " INTÉRESSANTE" : "") + " : " + info.cabinet, [
            (interessant ? "Drapeau : intéressant (signal positif dans le texte)." : "Pas de signal positif détecté : à lire."),
            "De : " + info.email + " (" + info.cabinet + ", offre " + info.offre + ")",
            "Objet : " + sujet, "", "Extrait : " + extrait, "",
            "Répondre dans la journée ; modèles dans prospection/messages/reponses-types.md.",
          ]);
        }
      });
    });
  }

  // 2. Rebonds : messages de mailer-daemon / postmaster qui citent une adresse du Sheet
  rechercher("from:(mailer-daemon OR postmaster) newer_than:" + FENETRE_REPONSES_JOURS + "d").forEach(function (fil) {
    fil.getMessages().forEach(function (msg) {
      const id = msg.getId();
      if (traites.ensemble[id]) return;
      const sujet = msg.getSubject();
      const corps = msg.getPlainBody();
      const cite = normaliser(sujet + "\n" + corps);
      const concernes = adresses.filter(function (a) { return citeAdresse(cite, a) && !(lignes[a].dateEnvoi && jour(msg.getDate()) < lignes[a].dateEnvoi); });
      if (concernes.length === 0) return; // sans rapport avec nos envois (pas mémorisé : il pourra concerner une ligne ajoutée plus tard)
      const genre = classerRebond(sujet, corps);
      memoriserTraite(traites, id);
      if (genre !== "echec") {
        logs.push("Message système (" + genre + ") pour " + concernes.join(", ") + " : statut inchangé.");
        return;
      }
      const touches = [];
      concernes.forEach(function (a) {
        const info = lignes[a];
        if (info.statut === "envoyé" || info.statut === "brouillon créé") {
          majLigne(info, { statut: "bounce", note: "[bounce " + aujourdhui() + "]" });
          touches.push(a);
          bilan.rebonds++;
          logs.push("Rebond : " + a + " (" + info.cabinet + ")");
        }
      });
      if (touches.length > 0) {
        notifier("[Équerre] Rebond : " + touches.join(", "), [
          "Adresse(s) non délivrée(s) : " + touches.join(", "),
          "Statut passé à « bounce » ; ne plus écrire à ces adresses.",
          "Règle : pause de la vague si plus de 2 % de rebonds (strategie-mailing.md).",
        ]);
      }
    });
  });

  logs.push("verifierReponses : " + bilan.reponses + " réponse(s) dont " + bilan.interessantes + " intéressante(s), " + bilan.oppositions + " opposition(s), " + bilan.rebonds + " rebond(s).");
  sauvegarderLogs(logs);
  Logger.log(logs.join("\n"));
  return bilan;
}

// ---------------------------------------------------------------------------
// Déclencheurs
// ---------------------------------------------------------------------------

// Tâche du matin : réponses d'abord (pour ne pas relancer quelqu'un qui a répondu), puis relances dues, puis nouveaux messages
function tacheQuotidienne() {
  return avecVerrou("tacheQuotidienne", function () {
    const etapes = [["verifierReponses", verifierReponses], ["creerRelance", creerRelance], ["envoyerMessages", envoyerMessages]];
    etapes.forEach(function (etape) {
      try {
        etape[1]();
      } catch (e) {
        Logger.log(etape[0] + " : erreur " + e);
        sauvegarderLogs([etape[0] + " : ERREUR " + e]);
      }
    });
  });
}

// Supprime uniquement les déclencheurs de ce script ; retourne leur nombre
function supprimerDeclencheurs() {
  let nb = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    const f = t.getHandlerFunction();
    if (f === FONCTION_QUOTIDIENNE || f === FONCTION_REPONSES) {
      ScriptApp.deleteTrigger(t);
      nb++;
    }
  });
  return nb;
}

// Idempotent : supprime les anciens déclencheurs puis recrée 5 déclencheurs (lundi à vendredi, vers 9 h) et 1 déclencheur horaire.
// Ne change PAS le MODE : en BROUILLON, la tâche du matin crée des brouillons à relire.
function installerDeclencheurs() {
  supprimerDeclencheurs();
  const jours = [ScriptApp.WeekDay.MONDAY, ScriptApp.WeekDay.TUESDAY, ScriptApp.WeekDay.WEDNESDAY, ScriptApp.WeekDay.THURSDAY, ScriptApp.WeekDay.FRIDAY];
  jours.forEach(function (j) {
    ScriptApp.newTrigger(FONCTION_QUOTIDIENNE).timeBased().onWeekDay(j).atHour(9).create();
  });
  ScriptApp.newTrigger(FONCTION_REPONSES).timeBased().everyHours(1).create();
  const msg = "Déclencheurs installés : " + FONCTION_QUOTIDIENNE + " du lundi au vendredi vers 9 h, " + FONCTION_REPONSES + " toutes les heures (MODE actuel : " + MODE + ").";
  Logger.log(msg);
  sauvegarderLogs([msg]);
  return msg;
}

// ---------------------------------------------------------------------------
// Test rapide (lecture seule)
// ---------------------------------------------------------------------------

function testerScript() {
  Logger.log("Test du script Google Apps Script");
  Logger.log("MODE: " + MODE);
  Logger.log("Quota quotidien: " + QUOTA_QUOTIDIEN);
  Logger.log("Fuseau du script: " + Session.getScriptTimeZone() + " ; fuseau du classeur: " + fuseau());
  Logger.log("Messages chargés: " + Object.keys(chargerMessages()).length + " (" + Object.keys(chargerMessages()).join(", ") + ")");
  Logger.log("Désinscrits chargés: " + chargerDesinscrits().length);
  Logger.log("Relances dues: " + relancesDues().length);
  Logger.log("Exemple de fusion: " + fusionner("Bonjour {{cabinet}} ({{ville}})", { cabinet: "", ville: "" }));
}
