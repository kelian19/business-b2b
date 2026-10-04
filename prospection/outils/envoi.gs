/**
 * AVERTISSEMENT DE SÉCURITÉ : Lancer d'abord en MODE "BROUILLON" (par défaut)
 * - Relire chaque brouillon avant envoi
 * - Envoyer en petit volume (risque spam depuis Gmail neuf)
 * - Respecter l'opposition immédiate (Désinscrits)
 * Passer en MODE "ENVOI" uniquement après test validé (voir constante MODE ci-dessous)
 */

const MODE = "BROUILLON"; // "BROUILLON" (défaut, sûr) ou "ENVOI" (à activer à la main)
const QUOTA_QUOTIDIEN = 15; // Nombre max de messages par jour
const PAUSE_MIN_MS = 2000; // Pause min entre deux messages (ms)
const PAUSE_MAX_MS = 8000; // Pause max (aléatoire)

// Date du jour (fuseau du script) et conversion d'une cellule en "AAAA-MM-JJ" (Sheets peut convertir les dates en objets Date)
function aujourdhui() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"); }
function jour(v) { if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd"); return String(v || "").slice(0, 10); }

function envoyerMessages() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Suivi");
  const rangeDonnees = sheet.getDataRange();
  const donnees = rangeDonnees.getValues();
  const entetes = donnees[0];

  // Index des colonnes
  const indexId = entetes.indexOf("id");
  const indexCabinet = entetes.indexOf("cabinet");
  const indexEmail = entetes.indexOf("email_generique");
  const indexOffre = entetes.indexOf("offre_testee");
  const indexStatut = entetes.indexOf("statut");
  const indexDateEnvoi = entetes.indexOf("date_envoi");
  const indexDateRelance = entetes.indexOf("date_relance_J5");

  const deserits = chargerDesinscrits();
  const messages = chargerMessages();
  let nbEnvoyesAujourd = 0; // actions déjà faites AUJOURD'HUI (toutes exécutions confondues)
  for (let k = 1; k < donnees.length; k++) { if (jour(donnees[k][indexDateEnvoi]) === aujourdhui()) nbEnvoyesAujourd++; }
  let nbCrees = 0; // actions de CETTE exécution
  const logs = [];

  for (let i = 1; i < donnees.length; i++) {
    if (nbEnvoyesAujourd >= QUOTA_QUOTIDIEN) {
      logs.push(`[${timestamp()}] Quota quotidien (${QUOTA_QUOTIDIEN}) atteint. Arrêt.`);
      break;
    }

    const ligneDonnees = donnees[i];
    const statut = ligneDonnees[indexStatut] || "";
    const email = ligneDonnees[indexEmail] || "";
    const offre = ligneDonnees[indexOffre] || "";
    const cabinet = ligneDonnees[indexCabinet] || "";
    const id = ligneDonnees[indexId] || "";

    // Vérifier les conditions
    if (statut.trim() !== "à envoyer") {
      continue; // Passer à la ligne suivante
    }
    if (!email.trim() || email.includes("@") === false) {
      logs.push(`[${timestamp()}] Ligne ${i+1} : email invalide (${email}). Ignorée.`);
      continue;
    }
    if (deserits.includes(email.toLowerCase())) {
      logs.push(`[${timestamp()}] ${email} est désabonné. Ignorée.`);
      sheet.getRange(i+1, indexStatut+1).setValue("désinscrit");
      continue;
    }

    // Chercher le message correspondant à l'offre
    const messageData = messages[offre];
    if (!messageData) {
      logs.push(`[${timestamp()}] Ligne ${i+1} : offre "${offre}" inconnue. Ignorée.`);
      continue;
    }

    const objet = messageData.objet;
    let corps = messageData.corps;

    // Ajouter le pied de page de désinscription
    if (!corps.includes("Vous pouvez à tout moment")) {
      corps += "\n\nVous pouvez à tout moment me demander de ne plus vous contacter.";
    }

    // Créer ou envoyer le message
    if (MODE === "BROUILLON") {
      GmailApp.createDraft(email, objet, corps);
      logs.push(`[${timestamp()}] ✓ Brouillon créé : ${email} (${cabinet}) - ${objet}`);
    } else if (MODE === "ENVOI") {
      GmailApp.sendEmail(email, objet, corps);
      logs.push(`[${timestamp()}] ✓ Envoyé : ${email} (${cabinet}) - ${objet}`);
    } else {
      logs.push(`[${timestamp()}] ✗ MODE invalide : "${MODE}". Utiliser "BROUILLON" ou "ENVOI".`);
      break;
    }

    // Mettre à jour la ligne
    const dateEnvoi = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const dateRelance = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // +5 jours

    sheet.getRange(i+1, indexStatut+1).setValue(MODE === "ENVOI" ? "envoyé" : "brouillon créé");
    sheet.getRange(i+1, indexDateEnvoi+1).setValue(dateEnvoi);
    if (MODE === "ENVOI") sheet.getRange(i+1, indexDateRelance+1).setValue(dateRelance); // pas de relance pour un simple brouillon

    nbEnvoyesAujourd++;
    nbCrees++;

    // Pause aléatoire
    if (i < donnees.length - 1) {
      const pause = Math.random() * (PAUSE_MAX_MS - PAUSE_MIN_MS) + PAUSE_MIN_MS;
      Utilities.sleep(Math.floor(pause));
    }
  }

  // Enregistrer les logs
  sauvegarderLogs(logs);
  Logger.log(logs.join("\n"));

  if (MODE === "BROUILLON") {
    SpreadsheetApp.getUi().alert(`${nbCrees} brouillons créés (mode BROUILLON).\nRelisez-les, envoyez-les à la main depuis Gmail, puis passez le statut de la ligne à « envoyé » et saisissez date_relance_J5 (envoi + 5 jours).`);
  } else {
    SpreadsheetApp.getUi().alert(`${nbCrees} messages envoyés.`);
  }
}

function relancesDues() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Suivi");
  const rangeDonnees = sheet.getDataRange();
  const donnees = rangeDonnees.getValues();
  const entetes = donnees[0];

  const indexEmail = entetes.indexOf("email_generique");
  const indexCabinet = entetes.indexOf("cabinet");
  const indexOffre = entetes.indexOf("offre_testee");
  const indexStatut = entetes.indexOf("statut");
  const indexDateRelance = entetes.indexOf("date_relance_J5");
  const indexDerniereRelance = entetes.indexOf("notes"); // Stocker "relancé" dans notes

  const messages = chargerMessages();
  const deserits = chargerDesinscrits();
  const logs = [];
  const relances = [];
  const aujourd = aujourdhui();

  for (let i = 1; i < donnees.length; i++) {
    const ligneDonnees = donnees[i];
    const statut = ligneDonnees[indexStatut] || "";
    const dateRelance = ligneDonnees[indexDateRelance] || "";
    const email = ligneDonnees[indexEmail] || "";
    const cabinet = ligneDonnees[indexCabinet] || "";
    const offre = ligneDonnees[indexOffre] || "";
    const notes = ligneDonnees[indexDerniereRelance] || "";

    // Vérifier les conditions
    if (statut.trim() !== "envoyé") continue;
    if (notes.includes("relancé")) continue; // Ignorer si déjà relancé
    if (!dateRelance || jour(dateRelance) > aujourd) continue; // Vérifier la date
    if (deserits.includes(email.toLowerCase())) continue;

    relances.push({
      ligne: i + 1,
      email: email,
      cabinet: cabinet,
      offre: offre
    });
  }

  return relances; // Retourner la liste pour affichage
}

function creerRelance() {
  const relances = relancesDues();

  if (relances.length === 0) {
    SpreadsheetApp.getUi().alert("Aucune relance due.");
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Suivi");
  const rangeDonnees = sheet.getDataRange();
  const donnees = rangeDonnees.getValues();
  const entetes = donnees[0];

  const indexEmail = entetes.indexOf("email_generique");
  const indexOffre = entetes.indexOf("offre_testee");
  const indexStatut = entetes.indexOf("statut");
  const indexDateEnvoi = entetes.indexOf("date_envoi");
  const indexNotes = entetes.indexOf("notes");

  const messages = chargerMessages();
  let nbRelances = 0;

  for (const relance of relances) {
    const ligneDonnees = donnees[relance.ligne - 1];
    const offre = ligneDonnees[indexOffre] || "";
    const messageData = messages[offre];

    if (!messageData || !messageData.relance) continue;

    const email = relance.email;
    const objet = messageData.relance.objet;
    let corps = messageData.relance.corps;

    if (!corps.includes("Vous pouvez à tout moment")) {
      corps += "\n\nVous pouvez à tout moment me demander de ne plus vous contacter.";
    }

    if (MODE === "BROUILLON") {
      GmailApp.createDraft(email, objet, corps);
    } else if (MODE === "ENVOI") {
      GmailApp.sendEmail(email, objet, corps);
    }

    // Marquer comme relancé dans les notes
    sheet.getRange(relance.ligne, indexNotes + 1).setValue((donnees[relance.ligne - 1][indexNotes] || "") + " [relancé " + new Date().toISOString().split("T")[0] + "]");

    nbRelances++;
  }

  SpreadsheetApp.getUi().alert(`${nbRelances} relance(s) créée(s) en mode ${MODE}.`);
}

function chargerDesinscrits() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Désinscrits");
    const donnees = sheet.getDataRange().getValues();
    const deserits = [];
    for (let i = 1; i < donnees.length; i++) {
      const email = (donnees[i][0] || "").toLowerCase().trim();
      if (email) deserits.push(email);
    }
    return deserits;
  } catch (e) {
    Logger.log("Onglet 'Désinscrits' non trouvé. Aucun email ignoré.");
    return [];
  }
}

function chargerMessages() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Messages");
    const donnees = sheet.getDataRange().getValues();
    const messages = {};

    for (let i = 1; i < donnees.length; i++) {
      const id = donnees[i][0]; // id (A ou B)
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

function sauvegarderLogs(logs) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Journal");
    const derniereLigne = sheet.getLastRow() + 1;

    for (let i = 0; i < logs.length; i++) {
      sheet.getRange(derniereLigne + i, 1).setValue(timestamp());
      sheet.getRange(derniereLigne + i, 2).setValue(logs[i]);
    }
  } catch (e) {
    Logger.log("Onglet 'Journal' non trouvé. Logs non enregistrés.");
  }
}

function timestamp() {
  const now = new Date();
  return now.toISOString();
}

function testerScript() {
  Logger.log("Test du script Google Apps Script");
  Logger.log("MODE: " + MODE);
  Logger.log("Quota quotidien: " + QUOTA_QUOTIDIEN);
  Logger.log("Messages chargés: " + Object.keys(chargerMessages()).length);
  Logger.log("Désinscrits chargés: " + chargerDesinscrits().length);
  Logger.log("Relances dues: " + relancesDues().length);
}
