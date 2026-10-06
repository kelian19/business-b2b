#!/usr/bin/env node
/**
 * Tests de envoi.gs hors Google : le script est chargé dans un contexte Node (vm) avec des simulations (mocks) de
 * SpreadsheetApp, GmailApp, PropertiesService, LockService, ScriptApp, Utilities, Session et Logger.
 * Aucun appel réseau, aucun envoi réel, aucun fichier de prospects lu (seuls messages-sheet.csv et le script sont lus).
 *
 * Lancer : node prospection/outils/tests/envoi.test.js   (code de sortie 0 si tout passe)
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const { lireCsv, motifRejet } = require("../fusion-import.js");

const DOSSIER_OUTILS = path.join(__dirname, "..");
const SOURCE_GS = fs.readFileSync(path.join(DOSSIER_OUTILS, "envoi.gs"), "utf8");
const MOI = "keliankaddouripro@gmail.com";
const ENTETES = ["id", "cabinet", "ville", "site", "email_generique", "offre_testee", "statut", "date_envoi", "date_relance_J5", "reponse", "tache_citee", "prix_evoque", "notes", "segment"];
const ENTETES_MESSAGES = ["id", "objet", "corps", "relance_objet", "relance_corps"];

// ---------------------------------------------------------------------------
// Mini-cadre de test
// ---------------------------------------------------------------------------
const resultats = [];
function test(nom, fonction) {
  try {
    fonction();
    resultats.push({ nom: nom, ok: true });
    console.log("  ok   " + nom);
  } catch (e) {
    resultats.push({ nom: nom, ok: false, erreur: e });
    console.log("  ECHEC " + nom + "\n        " + (e && e.message ? e.message.split("\n").join("\n        ") : e));
  }
}

// ---------------------------------------------------------------------------
// Simulations (mocks)
// ---------------------------------------------------------------------------

// Horloge simulée : les objets Date créés par le script et par les mocks passent par cette classe
let maintenantFictif = new Date("2026-10-07T07:00:00Z"); // mercredi 9 h à Paris
class DateFictive extends Date {
  constructor(...args) { if (args.length === 0) super(maintenantFictif.getTime()); else super(...args); }
  static now() { return maintenantFictif.getTime(); }
}
function fixerHeure(iso) { maintenantFictif = new Date(iso); }

class Feuille {
  constructor(nom, lignes) { this.nom = nom; this.lignes = (lignes || []).map((l) => l.slice()); }
  getName() { return this.nom; }
  largeur() { return this.lignes.reduce((m, l) => Math.max(m, l.length), 0); }
  getDataRange() {
    const l = this.lignes, w = this.largeur();
    return { getValues: () => l.map((r) => { const c = r.slice(); while (c.length < w) c.push(""); return c; }) };
  }
  getLastRow() { return this.lignes.length; }
  appendRow(ligne) { this.lignes.push(ligne.slice()); }
  getRange(r, c, nr, nc) {
    const self = this;
    nr = nr || 1; nc = nc || 1;
    return {
      setValue(v) { while (self.lignes.length < r) self.lignes.push([]); const row = self.lignes[r - 1]; while (row.length < c) row.push(""); row[c - 1] = v; },
      setValues(vv) { vv.forEach((ligne, i) => ligne.forEach((v, j) => this_set(self, r + i, c + j, v))); },
      getValue() { return (self.lignes[r - 1] || [])[c - 1] || ""; },
      getValues() { const out = []; for (let i = 0; i < nr; i++) { const o = []; for (let j = 0; j < nc; j++) o.push(((self.lignes[r - 1 + i] || [])[c - 1 + j]) || ""); out.push(o); } return out; },
    };
  }
}
function this_set(f, r, c, v) { while (f.lignes.length < r) f.lignes.push([]); const row = f.lignes[r - 1]; while (row.length < c) row.push(""); row[c - 1] = v; }

/**
 * Crée un environnement complet : Sheet, Gmail, propriétés, verrou, déclencheurs, et charge envoi.gs.
 * options.mode : remplace la constante MODE du script (ex. "ENVOI").
 */
function creerEnv(options) {
  options = options || {};
  const etat = {
    alertes: [], logs: [], pause: 0,
    brouillons: [], envoyes: [], // GmailApp.createDraft / sendEmail / thread.createDraftReply / reply
    recus: [], // fils reçus (boîte de réception)
    fils_envoyes: [], // fils envoyés (pour répondre dans le fil)
    libelles: {}, proprietes: {}, declencheurs: [], verrouPris: false, verrouAppels: 0, verrouLiberes: 0,
  };
  const feuilles = {};
  feuilles["Suivi"] = new Feuille("Suivi", [ENTETES].concat(options.suivi || []));
  feuilles["Messages"] = new Feuille("Messages", [ENTETES_MESSAGES].concat(options.messages || messagesReels()));
  feuilles["Désinscrits"] = new Feuille("Désinscrits", [["email"]].concat((options.desinscrits || []).map((e) => [e])));
  feuilles["Journal"] = new Feuille("Journal", [["timestamp", "action"]]);

  const classeur = {
    getSheetByName: (n) => feuilles[n] || null,
    insertSheet: (n) => (feuilles[n] = new Feuille(n, [])),
  };

  function filDepuis(spec) {
    const fil = {
      spec: spec, libellesPoses: [],
      getMessages: () => spec.messages.map((m) => ({
        getId: () => m.id, getFrom: () => m.from, getSubject: () => m.subject, getPlainBody: () => m.body, getDate: () => new DateFictive(m.date),
      })),
      getLastMessageDate: () => new DateFictive(spec.messages[spec.messages.length - 1].date),
      addLabel: (l) => { fil.libellesPoses.push(l.name); },
      createDraftReply: (corps) => { etat.brouillons.push({ to: spec.to, subject: null, body: corps, reponseDansFil: true }); },
      reply: (corps) => { etat.envoyes.push({ to: spec.to, subject: null, body: corps, reponseDansFil: true }); },
    };
    return fil;
  }

  const GmailApp = {
    createDraft: (to, subject, body) => { etat.brouillons.push({ to: to, subject: subject, body: body }); },
    sendEmail: (to, subject, body) => { etat.envoyes.push({ to: to, subject: subject, body: body }); },
    getUserLabelByName: (n) => etat.libelles[n] || null,
    createLabel: (n) => (etat.libelles[n] = { name: n }),
    search: (requete, debut, max) => {
      let liste = [];
      let m;
      if ((m = requete.match(/^in:sent to:(\S+)(?: after:(\S+))?/))) {
        liste = etat.fils_envoyes.filter((f) => f.to === m[1].toLowerCase());
        if (m[2]) liste = liste.filter((f) => f.messages[0].date.slice(0, 10).replace(/-/g, "/") >= m[2]);
      } else if (/^from:\(mailer-daemon/.test(requete)) {
        liste = etat.recus.filter((f) => /mailer-daemon|postmaster/i.test(f.messages[0].from));
      } else if ((m = requete.match(/^from:\((.+?)\) newer_than/))) {
        const termes = m[1].split(" OR ");
        liste = etat.recus.filter((f) => !/mailer-daemon|postmaster/i.test(f.messages[0].from) && f.messages.some((x) => termes.some((t) => x.from.toLowerCase().indexOf(t) !== -1)));
      }
      return liste.slice(debut || 0, (debut || 0) + (max || 50)).map(filDepuis);
    },
  };

  const ScriptApp = {
    WeekDay: { MONDAY: "MON", TUESDAY: "TUE", WEDNESDAY: "WED", THURSDAY: "THU", FRIDAY: "FRI", SATURDAY: "SAT", SUNDAY: "SUN" },
    getProjectTriggers: () => etat.declencheurs.slice(),
    deleteTrigger: (t) => { etat.declencheurs = etat.declencheurs.filter((x) => x !== t); },
    newTrigger: (fonction) => {
      const t = { fonction: fonction, getHandlerFunction: () => fonction };
      const constructeur = {
        timeBased: () => constructeur,
        onWeekDay: (j) => { t.jour = j; return constructeur; },
        atHour: (h) => { t.heure = h; return constructeur; },
        everyHours: (n) => { t.chaqueHeures = n; return constructeur; },
        create: () => { etat.declencheurs.push(t); return t; },
      };
      return constructeur;
    },
  };

  const bac = {
    SpreadsheetApp: { getActiveSpreadsheet: () => classeur, getUi: () => ({ alert: (m) => etat.alertes.push(m) }) },
    GmailApp: GmailApp,
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in etat.proprietes ? etat.proprietes[k] : null), setProperty: (k, v) => { etat.proprietes[k] = v; } }) },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => { etat.verrouAppels++; if (etat.verrouPris) return false; etat.verrouPris = true; return true; },
        releaseLock: () => { etat.verrouPris = false; etat.verrouLiberes++; },
      }),
    },
    ScriptApp: ScriptApp,
    Utilities: {
      formatDate: (date, tz, format) => {
        assert.strictEqual(format, "yyyy-MM-dd", "le mock ne gère que yyyy-MM-dd");
        return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date.getTime()));
      },
      sleep: (ms) => { etat.pause += ms; },
    },
    Session: { getScriptTimeZone: () => "Europe/Paris", getEffectiveUser: () => ({ getEmail: () => MOI }), getActiveUser: () => ({ getEmail: () => MOI }) },
    Logger: { log: (m) => etat.logs.push(String(m)) },
    Date: DateFictive,
  };

  let source = SOURCE_GS;
  if (options.mode) {
    assert.ok(source.indexOf('const MODE = "BROUILLON";') !== -1, "constante MODE introuvable dans envoi.gs");
    source = source.replace('const MODE = "BROUILLON";', 'const MODE = "' + options.mode + '";');
  }
  const contexte = vm.createContext(bac);
  vm.runInContext(source, contexte, { filename: "envoi.gs" });

  const env = {
    etat: etat, feuilles: feuilles, ctx: contexte,
    suivi: () => feuilles["Suivi"].lignes,
    cellule: (idLigne, colonne) => { const l = feuilles["Suivi"].lignes.find((r) => String(r[0]) === String(idLigne)); return l ? (l[ENTETES.indexOf(colonne)] || "") : undefined; },
    constante: (nom) => vm.runInContext(nom, contexte),
    lancer: (code) => vm.runInContext(code, contexte),
    // Ajoute un fil reçu (une réponse d'un prospect ou un rebond)
    recevoir: (spec) => { etat.recus.push({ to: MOI, messages: [{ id: spec.id, from: spec.from, subject: spec.subject || "Re : Votre fichier clients et la facture électronique", body: spec.body, date: spec.date || maintenantFictif.toISOString() }] }); },
    // Simule l'envoi à la main d'un brouillon : un fil « envoyé » apparaît dans Gmail
    marquerEnvoye: (email, date) => { etat.fils_envoyes.push({ to: email.toLowerCase(), messages: [{ id: "env-" + email, from: MOI, subject: "x", body: "x", date: date || maintenantFictif.toISOString() }] }); },
    notifications: () => etat.envoyes.filter((m) => m.to === MOI),
    envoisProspects: () => etat.envoyes.filter((m) => m.to !== MOI),
  };
  return env;
}

// Messages réels : lecture de messages-sheet.csv (format de l'onglet « Messages »)
function messagesReels() {
  const lignes = lireCsv(fs.readFileSync(path.join(DOSSIER_OUTILS, "messages-sheet.csv"), "utf8"));
  return lignes.slice(1);
}

function ligne(id, cabinet, ville, email, offre, statut, extra) {
  extra = extra || {};
  const l = ENTETES.map(() => "");
  l[0] = id; l[1] = cabinet; l[2] = ville; l[3] = "exemple.fr"; l[4] = email; l[5] = offre; l[6] = statut === undefined ? "à envoyer" : statut;
  if (extra.dateEnvoi) l[7] = extra.dateEnvoi;
  if (extra.dateRelance) l[8] = extra.dateRelance;
  if (extra.reponse) l[9] = extra.reponse;
  if (extra.notes) l[12] = extra.notes;
  l[13] = extra.segment || "Test";
  return l;
}

function mots(s) { return s.split(/\s+/).filter(Boolean).length; }

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
console.log("envoi.gs : tests avec simulations Google\n");

test("MODE par défaut BROUILLON et plafond quotidien par défaut à 10", () => {
  const env = creerEnv({});
  assert.strictEqual(env.constante("MODE"), "BROUILLON");
  assert.strictEqual(env.constante("QUOTA_QUOTIDIEN"), 10);
});

test("BROUILLON : brouillons créés, aucun envoi, lignes mises à jour", () => {
  fixerHeure("2026-10-07T07:00:00Z");
  const env = creerEnv({ suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1"),
    ligne(2, "Beta", "Dijon", "info@beta.fr", "EF-V2"),
    ligne(3, "Gamma", "Brest", "contact@gamma.fr", "DEC"),
    ligne(4, "Delta", "Nice", "accueil@delta.fr", "EF-CAB"),
  ] });
  const n = env.ctx.envoyerMessages();
  assert.strictEqual(n, 4);
  assert.strictEqual(env.etat.brouillons.length, 4);
  assert.strictEqual(env.etat.envoyes.length, 0, "aucun envoi en mode BROUILLON (pas même une notification)");
  assert.strictEqual(env.cellule(1, "statut"), "brouillon créé");
  assert.strictEqual(env.cellule(1, "date_envoi"), "2026-10-07");
  assert.strictEqual(env.cellule(1, "date_relance_J5"), "", "pas de relance programmée tant que rien n'est parti");
  const d = env.etat.brouillons[0];
  assert.strictEqual(d.to, "contact@alpha.fr");
  assert.ok(/Vous pouvez à tout moment me demander de ne plus vous contacter\.$/.test(d.body), "pied de page d'opposition ajouté");
  assert.ok(d.body.indexOf("keliankaddouripro@gmail.com") !== -1 && d.body.indexOf("Kélian Kaddouri") !== -1, "signature");
  assert.strictEqual(env.etat.pause, 0, "pas de pause inutile pour des brouillons");
});

test("Plafond quotidien : 10 brouillons, rien de plus à la 2e exécution du même jour, reprise le lendemain", () => {
  fixerHeure("2026-10-07T07:00:00Z");
  const rows = [];
  for (let i = 1; i <= 25; i++) rows.push(ligne(i, "Cab" + i, "Lyon", "contact@cab" + i + ".fr", i % 2 ? "EF-V1" : "EF-V2"));
  const env = creerEnv({ suivi: rows });
  assert.strictEqual(env.ctx.envoyerMessages(), 10);
  assert.strictEqual(env.ctx.envoyerMessages(), 0, "2e exécution du même jour");
  assert.strictEqual(env.etat.brouillons.length, 10);
  fixerHeure("2026-10-08T07:00:00Z");
  assert.strictEqual(env.ctx.envoyerMessages(), 10, "lendemain");
  assert.strictEqual(env.etat.brouillons.length, 20);
});

test("Plafond quotidien : 4 puis 6 le même jour (limite d'exécution) puis 0", () => {
  fixerHeure("2026-10-07T07:00:00Z");
  const rows = [];
  for (let i = 1; i <= 25; i++) rows.push(ligne(i, "Cab" + i, "Lyon", "contact@cab" + i + ".fr", "EF-V1"));
  const env = creerEnv({ suivi: rows });
  assert.strictEqual(env.ctx.envoyerMessages({ limite: 4 }), 4);
  assert.strictEqual(env.ctx.envoyerMessages(), 6, "il reste 6 sur le plafond de 10");
  assert.strictEqual(env.ctx.envoyerMessages(), 0);
  // Appelée par un déclencheur (objet d'événement sans « limite ») : plafond normal
  fixerHeure("2026-10-09T07:00:00Z");
  assert.strictEqual(env.ctx.envoyerMessages({ triggerUid: "123" }), 10);
});

test("tester3Lignes : 3 brouillons au plus", () => {
  fixerHeure("2026-10-07T07:00:00Z");
  const rows = [];
  for (let i = 1; i <= 8; i++) rows.push(ligne(i, "Cab" + i, "Lyon", "contact@cab" + i + ".fr", "DEC"));
  const env = creerEnv({ suivi: rows });
  assert.strictEqual(env.ctx.tester3Lignes(), 3);
  assert.strictEqual(env.etat.brouillons.length, 3);
});

test("Désinscrit jamais contacté (casse ignorée), statut mis à jour", () => {
  fixerHeure("2026-10-07T07:00:00Z");
  const env = creerEnv({ desinscrits: ["Contact@Alpha.FR"], suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1"),
    ligne(2, "Beta", "Dijon", "contact@beta.fr", "EF-V1"),
  ] });
  env.ctx.envoyerMessages();
  assert.strictEqual(env.etat.brouillons.length, 1);
  assert.strictEqual(env.etat.brouillons[0].to, "contact@beta.fr");
  assert.strictEqual(env.cellule(1, "statut"), "désinscrit");
});

test("Désinscrit : pas de relance non plus", () => {
  fixerHeure("2026-10-14T07:00:00Z");
  const env = creerEnv({ desinscrits: ["contact@alpha.fr"], suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
  ] });
  assert.strictEqual(env.ctx.creerRelance(), 0);
  assert.strictEqual(env.etat.brouillons.length, 0);
});

test("Doublon d'adresse : une seule prise de contact", () => {
  fixerHeure("2026-10-07T07:00:00Z");
  const env = creerEnv({ suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1"),
    ligne(2, "Alpha bis", "Lyon", "Contact@Alpha.fr", "EF-V2"),
    ligne(3, "Déjà vu", "Lyon", "contact@vu.fr", "EF-V2", "envoyé", { dateEnvoi: "2026-10-01", dateRelance: "2026-10-06" }),
    ligne(4, "Déjà vu bis", "Lyon", "CONTACT@vu.fr", "EF-V2"),
  ] });
  env.ctx.envoyerMessages();
  assert.strictEqual(env.etat.brouillons.length, 1);
  assert.strictEqual(env.etat.brouillons[0].to, "contact@alpha.fr");
});

test("Fusion {{cabinet}} et {{ville}} dans l'objet et le corps, formule neutre si valeur manquante, champ inconnu bloqué", () => {
  fixerHeure("2026-10-07T07:00:00Z");
  const messages = [
    ["TEST", "Facture électronique à {{ville}}", "Bonjour,\n\nPour {{cabinet}}, à {{ ville }}.\n\nCordialement,\nKélian Kaddouri\nkeliankaddouripro@gmail.com", "Re : {{cabinet}}", "Bonjour,\n\nRelance {{CABINET}} ({{Ville}}).\n\nCordialement,\nKélian Kaddouri\nkeliankaddouripro@gmail.com"],
    ["BAD", "Objet {{prenom}}", "Bonjour {{prenom}}", "", ""],
  ];
  const env = creerEnv({ messages: messages, suivi: [
    ligne(1, "Cabinet Alpha", "Lyon", "contact@alpha.fr", "TEST"),
    ligne(2, "", "", "contact@beta.fr", "TEST"),
    ligne(3, "Gamma", "Brest", "contact@gamma.fr", "BAD"),
  ] });
  env.ctx.envoyerMessages();
  assert.strictEqual(env.etat.brouillons.length, 2, "la ligne au champ inconnu n'est pas créée");
  const [a, b] = env.etat.brouillons;
  assert.strictEqual(a.subject, "Facture électronique à Lyon");
  assert.ok(a.body.indexOf("Pour Cabinet Alpha, à Lyon.") !== -1);
  assert.strictEqual(b.subject, "Facture électronique à votre secteur");
  assert.ok(b.body.indexOf("Pour votre entreprise, à votre secteur.") !== -1);
  env.etat.brouillons.forEach((d) => { assert.ok(d.subject.indexOf("{{") === -1 && d.body.indexOf("{{") === -1, "aucun champ brut"); });
  assert.strictEqual(env.cellule(3, "statut"), "à envoyer", "ligne au champ inconnu laissée en l'état");
  assert.strictEqual(env.ctx.fusionner("{{cabinet}} / {{ville}}", { cabinet: "  ", ville: null }), "votre entreprise / votre secteur");
});

test("Relance : une seule, dans le fil du premier message, jamais de seconde", () => {
  fixerHeure("2026-10-12T07:00:00Z");
  const env = creerEnv({ suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
    ligne(2, "Beta", "Dijon", "contact@beta.fr", "EF-V2", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
    ligne(3, "Gamma", "Brest", "contact@gamma.fr", "DEC", "envoyé", { dateEnvoi: "2026-10-09", dateRelance: "2026-10-14" }), // pas encore due
    ligne(4, "Delta", "Nice", "contact@delta.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12", reponse: "Merci" }), // a répondu
    ligne(5, "Epsilon", "Metz", "contact@epsilon.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: new DateFictive("2026-10-11T22:00:00Z") }), // date au format Date
  ] });
  env.marquerEnvoye("contact@alpha.fr", "2026-10-07T08:00:00Z"); // fil existant pour Alpha, pas pour Beta
  assert.strictEqual(env.ctx.relancesDues().length, 3);
  assert.strictEqual(env.ctx.creerRelance(), 3);
  assert.strictEqual(env.etat.brouillons.length, 3);
  assert.strictEqual(env.etat.envoyes.length, 0);
  const alpha = env.etat.brouillons.find((d) => d.to === "contact@alpha.fr");
  assert.strictEqual(alpha.reponseDansFil, true, "relance dans le fil quand il existe");
  const beta = env.etat.brouillons.find((d) => d.to === "contact@beta.fr");
  assert.strictEqual(beta.subject, "Re : Votre fichier clients et la facture électronique", "repli : message séparé avec « Re : »");
  assert.ok(/ne plus vous contacter\.$/.test(beta.body));
  assert.ok(env.cellule(1, "notes").indexOf("[relancé 2026-10-12]") !== -1);
  // Seconde exécution : aucune seconde relance
  assert.strictEqual(env.ctx.creerRelance(), 0);
  assert.strictEqual(env.etat.brouillons.length, 3);
  // Même plus tard
  fixerHeure("2026-10-20T07:00:00Z");
  assert.strictEqual(env.ctx.relancesDues().length, 1, "seule la ligne 3 (relance due depuis le 14) reste");
});

test("Relance : plafond quotidien partagé avec les premiers messages", () => {
  fixerHeure("2026-10-12T07:00:00Z");
  const rows = [];
  for (let i = 1; i <= 8; i++) rows.push(ligne(i, "R" + i, "Lyon", "contact@r" + i + ".fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }));
  for (let i = 9; i <= 20; i++) rows.push(ligne(i, "N" + i, "Lyon", "contact@n" + i + ".fr", "EF-V1"));
  const env = creerEnv({ suivi: rows });
  assert.strictEqual(env.ctx.creerRelance(), 8);
  assert.strictEqual(env.ctx.envoyerMessages(), 2, "10 - 8 relances");
});

test("Mode ENVOI (script modifié) : envoi réel, date de relance à J+5, pause", () => {
  fixerHeure("2026-10-07T07:00:00Z");
  const env = creerEnv({ mode: "ENVOI", suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1"),
    ligne(2, "Beta", "Dijon", "contact@beta.fr", "EF-V2"),
  ] });
  assert.strictEqual(env.ctx.envoyerMessages(), 2);
  assert.strictEqual(env.etat.brouillons.length, 0);
  assert.strictEqual(env.envoisProspects().length, 2);
  assert.strictEqual(env.cellule(1, "statut"), "envoyé");
  assert.strictEqual(env.cellule(1, "date_relance_J5"), "2026-10-12");
  assert.ok(env.etat.pause >= 2000, "pause entre deux envois réels");
});

test("MODE invalide : aucun message", () => {
  const env = creerEnv({ mode: "AUTRE", suivi: [ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1")] });
  assert.strictEqual(env.ctx.envoyerMessages(), 0);
  assert.strictEqual(env.etat.brouillons.length + env.etat.envoyes.length, 0);
});

test("Verrou : exécution simultanée refusée, verrou libéré après une exécution normale", () => {
  fixerHeure("2026-10-07T07:00:00Z");
  const env = creerEnv({ suivi: [ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1")] });
  env.etat.verrouPris = true; // une autre exécution tient le verrou
  assert.strictEqual(env.ctx.envoyerMessages(), null);
  assert.strictEqual(env.etat.brouillons.length, 0);
  assert.ok(env.feuilles["Journal"].lignes.some((l) => /une autre exécution est en cours/.test(String(l[1]))));
  env.etat.verrouPris = false;
  assert.strictEqual(env.ctx.envoyerMessages(), 1);
  assert.strictEqual(env.etat.verrouPris, false, "verrou libéré");
  assert.strictEqual(env.etat.verrouAppels, env.etat.verrouLiberes + 1, "chaque verrou pris est libéré (le refus n'en prend pas)");
});

test("Verrou : tacheQuotidienne réentrante (un seul verrou, libéré) et enchaîne réponses, relances, envois", () => {
  fixerHeure("2026-10-12T07:00:00Z");
  const env = creerEnv({ suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
    ligne(2, "Beta", "Dijon", "contact@beta.fr", "EF-V2"),
  ] });
  env.ctx.tacheQuotidienne();
  assert.strictEqual(env.etat.brouillons.length, 2, "1 relance + 1 premier message");
  assert.strictEqual(env.etat.verrouPris, false);
  assert.strictEqual(env.etat.verrouAppels, 1);
});

test("Réponse : détectée, statut « répondu », libellé Gmail, notification unique avec drapeau « intéressant »", () => {
  fixerHeure("2026-10-09T07:00:00Z");
  const env = creerEnv({ suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
    ligne(2, "Beta", "Dijon", "contact@beta.fr", "EF-V2", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
    ligne(3, "Gamma", "Brest", "contact@gamma.fr", "DEC", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
    ligne(4, "Delta", "Nice", "contact@delta.fr", "EF-CAB", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
  ] });
  env.recevoir({ id: "m1", from: "Marie Martin <contact@alpha.fr>", body: "Bonjour,\nOui, je suis intéressée. Pouvez-vous m'envoyer un devis ?\n\nLe 7 oct. 2026 à 09:00, Kélian Kaddouri <" + MOI + "> a écrit :\n> Bonjour,\n> blabla\n> Vous pouvez à tout moment me demander de ne plus vous contacter." });
  env.recevoir({ id: "m2", from: "contact@beta.fr", body: "Merci pour votre message, nous allons regarder cela." });
  env.recevoir({ id: "m3", from: "contact@gamma.fr", body: "Bonjour, nous ne sommes pas intéressés, merci." });
  env.recevoir({ id: "m4", from: "contact@delta.fr", subject: "Réponse automatique : absence", body: "Je suis absent du bureau jusqu'au 20 octobre." });
  const bilan = env.ctx.verifierReponses();
  assert.strictEqual(bilan.reponses, 3);
  assert.strictEqual(bilan.interessantes, 1);
  assert.strictEqual(bilan.oppositions, 0, "la citation de notre pied de page n'est pas une opposition");
  assert.strictEqual(env.cellule(1, "statut"), "répondu");
  assert.strictEqual(env.cellule(2, "statut"), "répondu");
  assert.strictEqual(env.cellule(3, "statut"), "répondu");
  assert.strictEqual(env.cellule(4, "statut"), "envoyé", "réponse automatique : statut inchangé");
  assert.ok(env.cellule(1, "notes").indexOf("[intéressant]") !== -1);
  assert.ok(env.cellule(1, "reponse").indexOf("devis") !== -1);
  assert.strictEqual(env.cellule(2, "notes").indexOf("[intéressant]"), -1);
  assert.strictEqual(env.cellule(3, "notes").indexOf("[intéressant]"), -1, "« pas intéressés » n'est pas un signal positif");
  assert.ok(env.etat.libelles["Équerre/Réponses"], "libellé créé");
  assert.strictEqual(env.etat.recus.length, 4);
  // Notifications : une par réponse (3), toutes envoyées à l'adresse du compte, aucune à un prospect
  const notifs = env.notifications();
  assert.strictEqual(notifs.length, 3);
  assert.strictEqual(env.envoisProspects().length, 0);
  assert.ok(notifs.some((n) => /INTÉRESSANTE/.test(n.subject) && /Alpha/.test(n.subject)));
  assert.strictEqual(notifs.filter((n) => /INTÉRESSANTE/.test(n.subject)).length, 1);
});

test("Notification unique : une 2e vérification ne notifie pas deux fois ; un nouveau message est notifié", () => {
  fixerHeure("2026-10-09T07:00:00Z");
  const env = creerEnv({ suivi: [ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" })] });
  env.recevoir({ id: "m1", from: "contact@alpha.fr", body: "Oui, un échange en visio serait possible." });
  env.ctx.verifierReponses();
  env.ctx.verifierReponses();
  env.ctx.verifierReponses();
  assert.strictEqual(env.notifications().length, 1);
  assert.ok(JSON.parse(env.etat.proprietes["messages_traites"]).indexOf("m1") !== -1, "mémorisé dans PropertiesService");
  env.recevoir({ id: "m2", from: "contact@alpha.fr", body: "Je précise : mardi, 14 h." });
  env.ctx.verifierReponses();
  assert.strictEqual(env.notifications().length, 2);
  assert.strictEqual(env.cellule(1, "statut"), "répondu");
});

test("Réponse d'une autre adresse du même domaine d'entreprise : rattachée à la bonne ligne ; domaine grand public : non", () => {
  fixerHeure("2026-10-09T07:00:00Z");
  const env = creerEnv({ suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
    ligne(2, "Beta", "Dijon", "contact@gmail.com", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
  ] });
  env.recevoir({ id: "m1", from: "Jean Dupont <jean.dupont@alpha.fr>", body: "Pouvez-vous me rappeler le programme ?" });
  env.recevoir({ id: "m2", from: "quelquun@gmail.com", body: "Oui bonjour" });
  env.ctx.verifierReponses();
  assert.strictEqual(env.cellule(1, "statut"), "répondu");
  assert.strictEqual(env.cellule(2, "statut"), "envoyé");
  assert.strictEqual(env.notifications().length, 1);
});

test("Opposition : détectée, statut « désinscrit », adresse ajoutée à « Désinscrits », libellé, notification", () => {
  fixerHeure("2026-10-09T07:00:00Z");
  const suivi = [];
  const phrases = [
    "Merci de me désinscrire de votre liste.",
    "STOP",
    "Ne me contactez plus, s'il vous plaît.",
    "Nous ne souhaitons plus recevoir vos messages.",
    "Veuillez retirer mon adresse de votre fichier.",
    "Je m'oppose à ce démarchage.",
  ];
  phrases.forEach((p, i) => suivi.push(ligne(i + 1, "Cab" + (i + 1), "Lyon", "contact@cab" + (i + 1) + ".fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" })));
  const env = creerEnv({ suivi: suivi });
  phrases.forEach((p, i) => env.recevoir({ id: "o" + i, from: "contact@cab" + (i + 1) + ".fr", body: p + "\n\n> Vous pouvez à tout moment me demander de ne plus vous contacter." }));
  const bilan = env.ctx.verifierReponses();
  assert.strictEqual(bilan.oppositions, phrases.length);
  assert.strictEqual(bilan.reponses, 0);
  phrases.forEach((p, i) => {
    assert.strictEqual(env.cellule(i + 1, "statut"), "désinscrit", p);
    assert.ok(env.feuilles["Désinscrits"].lignes.some((l) => l[0] === "contact@cab" + (i + 1) + ".fr"), "dans Désinscrits : " + p);
  });
  assert.strictEqual(env.notifications().length, phrases.length);
  assert.ok(env.notifications().every((n) => /Opposition/.test(n.subject)));
  // Dans Désinscrits : plus jamais contacté, même si on remet « à envoyer »
  env.suivi()[1][6] = "à envoyer";
  fixerHeure("2026-10-10T07:00:00Z");
  env.ctx.envoyerMessages();
  assert.strictEqual(env.etat.brouillons.length, 0);
  // Pas de doublon dans Désinscrits après une 2e vérification
  env.ctx.verifierReponses();
  assert.strictEqual(env.feuilles["Désinscrits"].lignes.filter((l) => l[0] === "contact@cab1.fr").length, 1);
  assert.strictEqual(env.notifications().length, phrases.length);
});

test("Rebond : mailer-daemon qui cite l'adresse -> statut « bounce », notification ; simple retard ignoré", () => {
  fixerHeure("2026-10-09T07:00:00Z");
  const env = creerEnv({ suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
    ligne(2, "Beta", "Dijon", "contact@beta.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
    ligne(3, "Gamma", "Brest", "contact@gamma.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
  ] });
  env.recevoir({ id: "b1", from: "Mail Delivery Subsystem <mailer-daemon@googlemail.com>", subject: "Delivery Status Notification (Failure)", body: "Le message n'a pas été remis à contact@alpha.fr car l'adresse est introuvable.\nDétails : 550 5.1.1 User unknown" });
  env.recevoir({ id: "b2", from: "Mail Delivery Subsystem <mailer-daemon@googlemail.com>", subject: "Delivery Status Notification (Delay)", body: "Livraison retardée vers contact@beta.fr. Gmail va réessayer." });
  env.recevoir({ id: "b3", from: "postmaster@autre.fr", subject: "Undelivered Mail Returned to Sender", body: "Unrelated: contact@inconnu.fr" });
  const bilan = env.ctx.verifierReponses();
  assert.strictEqual(bilan.rebonds, 1);
  assert.strictEqual(env.cellule(1, "statut"), "bounce");
  assert.ok(env.cellule(1, "notes").indexOf("[bounce 2026-10-09]") !== -1);
  assert.strictEqual(env.cellule(2, "statut"), "envoyé", "retard de remise : inchangé");
  assert.strictEqual(env.cellule(3, "statut"), "envoyé");
  const notifs = env.notifications();
  assert.strictEqual(notifs.length, 1);
  assert.ok(/Rebond/.test(notifs[0].subject) && /contact@alpha\.fr/.test(notifs[0].subject));
  // Pas de seconde notification
  env.ctx.verifierReponses();
  assert.strictEqual(env.notifications().length, 1);
  // Une adresse en bounce n'est plus relancée
  fixerHeure("2026-10-12T07:00:00Z");
  assert.ok(!env.ctx.relancesDues().some((r) => r.email === "contact@alpha.fr"));
});

test("Citations sans « > » (historique « a écrit : », pied de page recopié) : jamais prises pour une opposition", () => {
  fixerHeure("2026-10-09T07:00:00Z");
  const env = creerEnv({ suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
    ligne(2, "Beta", "Dijon", "contact@beta.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
    ligne(3, "Gamma", "Brest", "contact@gamma.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
  ] });
  const histo = "Bonjour,\n\nBlabla.\n\nVous pouvez à tout moment me demander de ne plus vous contacter.";
  env.recevoir({ id: "q1", from: "contact@alpha.fr", body: "Merci, bien reçu.\n\nLe 7 oct. 2026 à 09:00, Kélian Kaddouri <" + MOI + "> a écrit :\n" + histo });
  env.recevoir({ id: "q2", from: "contact@beta.fr", body: "Merci, bien reçu.\n\nLe mer. 7 oct. 2026 à 09:00, Kélian Kaddouri\n<" + MOI + "> a écrit :\n" + histo });
  env.recevoir({ id: "q3", from: "contact@gamma.fr", body: "Merci.\n" + histo });
  const bilan = env.ctx.verifierReponses();
  assert.strictEqual(bilan.oppositions, 0);
  assert.strictEqual(bilan.reponses, 3);
  assert.strictEqual(env.ctx.texteNouveau("Bonjour\n> citation\nSuite"), "Bonjour\nSuite");
});

test("Brouillon envoyé à la main : la ligne passe à « envoyé » avec date de relance à J+5", () => {
  fixerHeure("2026-10-07T07:00:00Z");
  const env = creerEnv({ suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1"),
    ligne(2, "Beta", "Dijon", "contact@beta.fr", "EF-V1"),
  ] });
  env.ctx.envoyerMessages();
  env.marquerEnvoye("contact@alpha.fr", "2026-10-07T09:30:00Z"); // Kélian envoie le 1er brouillon, pas le 2e
  fixerHeure("2026-10-07T10:00:00Z");
  env.ctx.verifierReponses();
  assert.strictEqual(env.cellule(1, "statut"), "envoyé");
  assert.strictEqual(env.cellule(1, "date_relance_J5"), "2026-10-12");
  assert.strictEqual(env.cellule(2, "statut"), "brouillon créé");
});

test("Message antérieur à notre envoi ignoré ; lignes « à envoyer » non surveillées", () => {
  fixerHeure("2026-10-09T07:00:00Z");
  const env = creerEnv({ suivi: [
    ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1", "envoyé", { dateEnvoi: "2026-10-07", dateRelance: "2026-10-12" }),
    ligne(2, "Beta", "Dijon", "contact@beta.fr", "EF-V1"),
  ] });
  env.recevoir({ id: "a1", from: "contact@alpha.fr", body: "Oui", date: "2026-09-20T10:00:00Z" });
  env.recevoir({ id: "a2", from: "contact@beta.fr", body: "Oui" });
  env.ctx.verifierReponses();
  assert.strictEqual(env.notifications().length, 0);
});

test("Déclencheurs : installation idempotente (5 jours à 9 h + 1 horaire), suppression ciblée", () => {
  const env = creerEnv({});
  env.etat.declencheurs.push({ fonction: "autreFonction", getHandlerFunction: () => "autreFonction" });
  env.ctx.installerDeclencheurs();
  env.ctx.installerDeclencheurs();
  env.ctx.installerDeclencheurs();
  const ours = env.etat.declencheurs.filter((t) => t.fonction !== "autreFonction");
  assert.strictEqual(ours.length, 6);
  const quotidiens = ours.filter((t) => t.fonction === "tacheQuotidienne");
  assert.strictEqual(quotidiens.length, 5);
  assert.strictEqual(quotidiens.map((t) => t.jour).sort().join(","), "FRI,MON,THU,TUE,WED");
  assert.ok(quotidiens.every((t) => t.heure === 9));
  const horaires = ours.filter((t) => t.fonction === "verifierReponses");
  assert.strictEqual(horaires.length, 1);
  assert.strictEqual(horaires[0].chaqueHeures, 1);
  assert.strictEqual(env.ctx.supprimerDeclencheurs(), 6);
  assert.strictEqual(env.etat.declencheurs.length, 1, "le déclencheur étranger est conservé");
});

test("Journal : les actions sont écrites dans l'onglet « Journal »", () => {
  fixerHeure("2026-10-07T07:00:00Z");
  const env = creerEnv({ suivi: [ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1")] });
  env.ctx.envoyerMessages();
  const journal = env.feuilles["Journal"].lignes.slice(1);
  assert.ok(journal.length >= 1);
  assert.ok(journal.some((l) => /Brouillon créé : contact@alpha\.fr/.test(String(l[1]))));
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(String(journal[0][0])));
});

test("Colonnes manquantes dans « Suivi » : aucune action, message clair", () => {
  fixerHeure("2026-10-07T07:00:00Z");
  const env = creerEnv({ suivi: [ligne(1, "Alpha", "Lyon", "contact@alpha.fr", "EF-V1")] });
  env.feuilles["Suivi"].lignes[0] = env.feuilles["Suivi"].lignes[0].filter((h) => h !== "ville");
  assert.strictEqual(env.ctx.envoyerMessages(), 0);
  assert.strictEqual(env.etat.brouillons.length, 0);
  assert.ok(env.etat.alertes.some((a) => /Colonnes manquantes.*ville/.test(a)));
});

// ---------------------------------------------------------------------------
// Contenu de messages-sheet.csv (onglet « Messages ») et règles d'adresses
// ---------------------------------------------------------------------------

test("messages-sheet.csv : format de l'onglet Messages, 4 identifiants, règles de rédaction", () => {
  const lignes = lireCsv(fs.readFileSync(path.join(DOSSIER_OUTILS, "messages-sheet.csv"), "utf8"));
  assert.strictEqual(lignes[0].join("|"), "id|objet|corps|relance_objet|relance_corps");
  const ids = lignes.slice(1).map((l) => l[0]);
  assert.strictEqual(ids.join(","), "EF-V1,EF-V2,DEC,EF-CAB");
  const env = creerEnv({});
  const charges = env.ctx.chargerMessages();
  lignes.slice(1).forEach((l) => {
    assert.strictEqual(l.length, 5, l[0] + " : 5 colonnes");
    assert.ok(l.every((c) => c.trim() !== ""), l[0] + " : aucune cellule vide");
    assert.ok(charges[l[0]] && charges[l[0]].relance, l[0] + " : chargé avec relance par chargerMessages()");
    [l[2], l[4]].forEach((corps) => {
      assert.ok(/^Bonjour,\n/.test(corps), l[0] + " : commence par Bonjour,");
      assert.ok(/Cordialement,\nKélian Kaddouri\nkeliankaddouripro@gmail\.com$/.test(corps), l[0] + " : signature");
      assert.ok(!/https?:|www\./.test(corps), l[0] + " : pas de lien");
      assert.ok(!/ne plus vous contacter|désinscri/i.test(corps), l[0] + " : phrase de désinscription ajoutée par le script, pas ici");
      assert.ok(!/\{\{/.test(corps), l[0] + " : pas de champ de fusion dans les textes validés");
      assert.ok(/\bvous\b|\bvotre\b|\bvos\b/.test(corps) && !/\btu\b|\btoi\b|\bton\b/i.test(corps), l[0] + " : vouvoiement");
    });
    assert.ok(!/\bactuari|cyber/i.test(l.join(" ")), l[0] + " : pas d'actuariat ni de cyber-risque");
    assert.ok(l[4].indexOf("une ligne") !== -1 && l[2].indexOf("une ligne") !== -1, l[0] + " : un seul appel à l'action (répondre en une ligne)");
    assert.strictEqual(l[2].split("?").length >= 1, true);
  });
  const corpsUtile = (c) => c.replace(/^Bonjour,\n+/, "").replace(/\n+Cordialement,[\s\S]*$/, "");
  const cab = lignes.find((l) => l[0] === "EF-CAB");
  const nPremier = mots(corpsUtile(cab[2])), nRelance = mots(corpsUtile(cab[4]));
  const piedDePage = "Vous pouvez à tout moment me demander de ne plus vous contacter."; // ajouté par le script à chaque message
  assert.ok(nPremier >= 80 && nPremier + mots(piedDePage) <= 110, "EF-CAB premier e-mail : " + nPremier + " mots (+ " + mots(piedDePage) + " de désinscription ; 80 à 110 au total)");
  assert.ok(/l'un formé à l'ENSAE Paris, l'autre à l'ESSEC/.test(cab[2]), "EF-CAB : les deux écoles attribuées chacune à une personne");
  assert.ok(nRelance >= 40 && nRelance <= 60, "EF-CAB relance : " + nRelance + " mots (40 à 60)");
  assert.ok(/article 28 du RGPD/.test(cab[2]) && /sous-traitance/.test(cab[2]), "EF-CAB : sous-traitance et article 28 du RGPD");
  assert.ok(!/€/.test(cab[2] + cab[4]), "EF-CAB : pas de prix");
  assert.ok(!/ingénieur|diplômé/i.test(cab[2] + cab[4]), "équipe : « formés à », jamais « ingénieur » ni « diplômé »");
  // Le prix n'apparaît que dans EF-V2
  lignes.slice(1).filter((l) => l[0] !== "EF-V2").forEach((l) => assert.ok(!/€/.test(l[2] + l[4]), l[0] + " : pas de prix"));
  assert.ok(/490 € HT/.test(lignes.find((l) => l[0] === "EF-V2")[2]));
  // Objet court, sans majuscules criardes ni point d'exclamation
  lignes.slice(1).forEach((l) => assert.ok(l[1].length <= 70 && !/!/.test(l[1]) && l[1] !== l[1].toUpperCase(), l[0] + " : objet sobre"));
});

test("Cohérence : chaque ligne de messages-sheet.csv figure telle quelle dans modeles-v4.md (ignoré si ce fichier non versionné est absent)", () => {
  const md = path.join(DOSSIER_OUTILS, "..", "messages", "modeles-v4.md");
  if (!fs.existsSync(md)) return;
  const texteMd = fs.readFileSync(md, "utf8").replace(/\r/g, "");
  messagesReels().forEach((l) => {
    assert.ok(texteMd.indexOf(l[1]) !== -1, l[0] + " : objet absent de modeles-v4.md");
    const corps = l[2].replace(/^Bonjour,\n+/, "").replace(/\n+Cordialement,[\s\S]*$/, "");
    assert.ok(texteMd.indexOf(corps) !== -1, l[0] + " : corps différent de modeles-v4.md");
    assert.ok(texteMd.indexOf(l[3]) !== -1, l[0] + " : objet de relance absent de modeles-v4.md");
  });
});

test("fusion-import : adresses nominatives et grand public rejetées, génériques acceptées", () => {
  ["jean.dupont@entreprise.fr", "marie-curie@entreprise.fr", "prenom_nom@x.fr", "cabinet.abc@orange.fr", "x@gmail.com", "pas-une-adresse", "a@b"].forEach((e) => assert.ok(motifRejet(e), "à rejeter : " + e));
  ["contact@alpha.fr", "info@alpha.fr", "contact.agence@exemple-btp.fr", "contact-site@exemple-compta.fr", "accueil@x.fr", "nomsociete@nomsociete.fr", "intervention@exemple-elec.com", "Contact@Alpha.FR"].forEach((e) => assert.strictEqual(motifRejet(e), null, "à accepter : " + e));
});

test("Détection d'opposition élargie (formulations courantes) sans faux positif sur les phrases neutres", () => {
  const env = creerEnv({ suivi: [] });
  const oppositions = [
    "Merci de ne plus envoyer de mails", "N'envoyez plus de messages", "N'écrivez plus à cette adresse", "Ne plus écrire à cette adresse",
    "Je ne veux plus être contacté", "Je ne souhaite pas être recontacté", "Merci de me retirer de votre liste de diffusion",
    "Supprimez-moi de vos contacts", "Ne me recontactez plus", "Merci de ne pas me recontacter", "Ne revenez plus vers nous",
    "Merci d'arrêter ces envois", "Stoppez vos envois", "Veuillez cesser de nous démarcher", "Ceci est du spam",
    "RGPD : suppression de mes données", "Plus de mails svp", "Je m’oppose à ce démarchage",
  ];
  oppositions.forEach((p) => assert.ok(env.ctx.estOpposition(p), "opposition non détectée : " + p));
  const neutres = [
    "Aucune opposition à un échange", "Pas d'opposition de principe, envoyez le diagnostic", "Oui, volontiers, appelez-moi demain",
    "Nous avons déjà un programme de facturation", "Je suis absent jusqu'au 20, mais oui, envoyez-moi le diagnostic",
    "Cela ne m'intéresse pas, merci.", "Pouvez-vous me rappeler lundi ?", "Merci pour votre message, nous y réfléchissons.",
    "Je ne vous relancerai pas davantage",
  ];
  neutres.forEach((p) => assert.ok(!env.ctx.estOpposition(p), "faux positif d'opposition : " + p));
});

test("Intérêt : un refus n'est pas signalé « intéressant », un accord l'est", () => {
  const env = creerEnv({ suivi: [] });
  ["Cela ne m'intéresse pas, merci.", "Ça ne nous intéresse pas pour le moment", "Pas vraiment intéressé", "Nous ne sommes plus intéressés", "Non merci", "Nous avons déjà un programme de facturation", "Nous sommes d'ores et déjà équipés, programme en place"]
    .forEach((p) => assert.ok(!env.ctx.estInteressant(p), "refus pris pour un intérêt : " + p));
  ["Appelez-moi", "Volontiers", "D'accord pour le diagnostic", "Je suis preneur", "Oui, pourquoi pas", "Plus d'informations svp"]
    .forEach((p) => assert.ok(env.ctx.estInteressant(p), "accord non détecté : " + p));
});

test("Réponse automatique : sujet ou mention explicite seulement ; une vraie réponse « je suis absent... mais oui » n'est pas perdue", () => {
  const env = creerEnv({ suivi: [] });
  assert.ok(env.ctx.estReponseAutomatique("Réponse automatique : absence", ""));
  assert.ok(env.ctx.estReponseAutomatique("Re : x", "Out of office until Monday"));
  assert.ok(!env.ctx.estReponseAutomatique("Re : Votre fichier clients", "Je suis absent jusqu'au 20, mais oui, envoyez-moi le diagnostic"));
});

test("Rebonds : un avis de retard n'est pas un échec ; adresse citée en entier seulement", () => {
  const env = creerEnv({ suivi: [] });
  assert.strictEqual(env.ctx.classerRebond("Delivery Status Notification (Delay)", "temporary failure ... will keep trying"), "retard");
  assert.strictEqual(env.ctx.classerRebond("Delivery Status Notification (Failure)", "Address not found"), "echec");
  assert.ok(env.ctx.citeAdresse("remis a info@a.fr.", "info@a.fr"), "point final toléré");
  assert.ok(!env.ctx.citeAdresse("remis a superinfo@a.fr", "info@a.fr"), "sous-chaîne refusée");
});

test("Fuseau du classeur : date du jour et plafond calculés en Europe/Paris même si le script est en UTC", () => {
  fixerHeure("2026-10-09T22:30:00Z"); // 00 h 30 le 10 octobre à Paris
  const suivi = [];
  for (let i = 1; i <= 12; i++) suivi.push(ligne(i, "Cab" + i, "Lyon", "contact@cab" + i + ".fr", "EF-V1"));
  const env = creerEnv({ suivi: suivi });
  env.ctx.Session.getScriptTimeZone = () => "UTC";
  env.ctx.SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone = () => "Europe/Paris";
  assert.strictEqual(env.ctx.aujourdhui(), "2026-10-10");
  env.ctx.envoyerMessages();
  env.ctx.envoyerMessages();
  assert.strictEqual(env.etat.brouillons.length, 10, "plafond de 10 respecté sur deux exécutions");
});

test("Dates et textes de tiers : date non ISO illisible, formule neutralisée, objet ou corps vide refusé", () => {
  const env = creerEnv({ suivi: [] });
  assert.strictEqual(env.ctx.jour("12/10/2026"), "");
  assert.strictEqual(env.ctx.jour("2026-10-12"), "2026-10-12");
  assert.strictEqual(env.ctx.sure('=IMPORTDATA("https://x.fr")'), "'=IMPORTDATA(\"https://x.fr\")");
  assert.strictEqual(env.ctx.sure("Bonjour"), "Bonjour");
  assert.ok(env.ctx.composer("", "Corps", {}).erreur);
  assert.ok(env.ctx.composer("Objet", "  ", {}).erreur);
  assert.ok(!env.ctx.composer("Objet", "Corps", {}).erreur);
});

// ---------------------------------------------------------------------------
const echecs = resultats.filter((r) => !r.ok);
console.log("\n" + (resultats.length - echecs.length) + " / " + resultats.length + " tests réussis");
process.exit(echecs.length === 0 ? 0 : 1);
