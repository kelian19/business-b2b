#!/usr/bin/env node
/**
 * Fusion des listes de prospects en un seul fichier d'import Google Sheets (onglet « Suivi »).
 *
 * Usage (depuis la racine du projet) :
 *   node prospection/outils/fusion-import.js                  (prend aussi domaines-efacture.csv s'il existe)
 *   node prospection/outils/fusion-import.js --sans-efacture  (ignore domaines-efacture.csv)
 *
 * Sources (dossier prospection/outils/) :
 *   suivi-import.csv       cabinets comptables           -> offre EF-CAB
 *   domaines-test.csv      formation (101-110)           -> offre DEC
 *                          transport (111-120)           -> EF-V1 / EF-V2 en alternance
 *   domaines-btp.csv       bâtiment (121-130)            -> EF-V1 / EF-V2 en alternance
 *   domaines-efacture.csv  PME e-facture (s'il existe)   -> EF-V1 / EF-V2 en alternance
 *
 * Sortie : suivi-import-v4.csv (UTF-8 avec BOM, séparateur virgule, colonnes de suivi-modele.csv + « segment »)
 * Journal : fusion-import.log (adresses rejetées et doublons, avec la raison).
 *
 * Règles : statut « à envoyer » ; dédoublonnage par e-mail (insensible à la casse) ; uniquement des adresses
 * génériques (rejet des adresses de forme prenom.nom@ et des domaines grand public).
 * Aucune dépendance : Node.js seul.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const DOSSIER = __dirname;
const SORTIE = path.join(DOSSIER, "suivi-import-v4.csv");
const JOURNAL = path.join(DOSSIER, "fusion-import.log");
const COLONNES = ["id", "cabinet", "ville", "site", "email_generique", "offre_testee", "statut", "date_envoi", "date_relance_J5", "reponse", "tache_citee", "prix_evoque", "notes", "segment"];

// Domaines de messagerie grand public : jamais une adresse d'entreprise
const DOMAINES_GRAND_PUBLIC = new Set([
  "gmail.com", "googlemail.com", "yahoo.fr", "yahoo.com", "ymail.com", "hotmail.fr", "hotmail.com", "outlook.fr", "outlook.com",
  "live.fr", "live.com", "msn.com", "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "neuf.fr", "laposte.net", "bbox.fr",
  "icloud.com", "me.com", "aol.com", "gmx.fr", "gmx.com", "proton.me", "protonmail.com", "numericable.fr", "club-internet.fr", "cegetel.net",
]);

// Préfixes d'adresses génériques ou fonctionnelles (contact@, contact.agence@, hello@, ...)
const PREFIXES_GENERIQUES = new Set([
  "contact", "info", "infos", "accueil", "bonjour", "hello", "secretariat", "secrétariat", "intervention", "exploitation",
  "service", "services", "facturation", "achats", "rh", "logistique", "commercial", "compta", "comptabilite", "administration", "agence", "bureau", "direction", "devis", "mail", "cabinet", "societe", "entreprise",
]);

// Segments : nom, offre, mode d'affectation
const SEGMENTS = {
  EFACTURE: { nom: "PME e-facture", mode: "alternance" },
  CABINETS: { nom: "Cabinets comptables", mode: "fixe", offre: "EF-CAB" },
  FORMATION: { nom: "Organismes de formation", mode: "fixe", offre: "DEC" },
  TRANSPORT: { nom: "Transport", mode: "alternance" },
  BATIMENT: { nom: "Bâtiment", mode: "alternance" },
};

// ---------- CSV (RFC 4180 : guillemets, virgules et retours à la ligne dans les champs) ----------

function lireCsv(texte) {
  if (texte.charCodeAt(0) === 0xfeff) texte = texte.slice(1);
  const lignes = [];
  let champ = "", ligne = [], entreGuillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (entreGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') { champ += '"'; i++; } else entreGuillemets = false;
      } else champ += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === ",") { ligne.push(champ); champ = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      ligne.push(champ); champ = "";
      if (ligne.some((v) => v !== "")) lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  if (champ !== "" || ligne.length) { ligne.push(champ); if (ligne.some((v) => v !== "")) lignes.push(ligne); }
  return lignes;
}

function enregistrements(texte) {
  const l = lireCsv(texte);
  if (!l.length) return [];
  const entetes = l[0].map((h) => h.trim());
  return l.slice(1).map((v) => {
    const o = {};
    entetes.forEach((h, i) => { o[h] = (v[i] || "").trim(); });
    return o;
  });
}

function champCsv(v) {
  const s = String(v == null ? "" : v);
  return /[",\r\n]/.test(s) || s !== s.trim() ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// ---------- Validation des adresses ----------

/** Retourne null si l'adresse est acceptable, sinon la raison du rejet. */
function motifRejet(email) {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "adresse invalide";
  const [local, domaine] = e.split("@");
  if (DOMAINES_GRAND_PUBLIC.has(domaine)) return "domaine grand public (" + domaine + ")";
  const jetons = local.split(/[._-]/).filter(Boolean);
  if (jetons.length > 1 && !PREFIXES_GENERIQUES.has(jetons[0])) {
    // « prenom.nom@ » : plusieurs jetons dont le premier n'est pas un préfixe générique connu
    return "forme prenom.nom@ (adresse nominative probable)";
  }
  return null;
}

// ---------- Chargement des sources ----------

function lireSource(fichier, obligatoire) {
  const chemin = path.join(DOSSIER, fichier);
  if (!fs.existsSync(chemin)) {
    if (obligatoire) throw new Error("Fichier source introuvable : " + chemin);
    return null;
  }
  return enregistrements(fs.readFileSync(chemin, "utf8"));
}

function ouvrirLigne(src, segmentCle, extraNotes) {
  const email = src.email_generique || src.email || "";
  return {
    segment: segmentCle,
    idSource: src.id || "",
    cabinet: src.cabinet || src.entreprise || src.nom || "",
    ville: src.ville || "",
    site: src.site || "",
    email,
    notes: [src.notes || "", extraNotes || ""].filter(Boolean).join(" ; "),
  };
}

function idNumerique(l) { const n = parseInt(l.idSource, 10); return isNaN(n) ? Number.MAX_SAFE_INTEGER : n; }

function main() {
  const args = process.argv.slice(2);
  const sansEfacture = args.includes("--sans-efacture");
  const journal = [];
  const log = (s) => { journal.push(s); };

  const candidats = []; // dans l'ordre de priorité d'envoi

  // 1. PME e-facture (optionnel : un autre processus écrit ce fichier)
  if (!sansEfacture) {
    const ef = lireSource("domaines-efacture.csv", false);
    if (ef) {
      ef.forEach((r) => candidats.push(ouvrirLigne(r, "EFACTURE")));
      log("Source domaines-efacture.csv : " + ef.length + " ligne(s) lues.");
    } else log("Source domaines-efacture.csv : absente, ignorée.");
  } else log("Option --sans-efacture : domaines-efacture.csv ignoré.");

  // 2. Cabinets comptables
  lireSource("suivi-import.csv", true).forEach((r) => candidats.push(ouvrirLigne(r, "CABINETS")));

  // 3. Formation, transport (domaines-test.csv : identifiants 101-110 et 111-120)
  lireSource("domaines-test.csv", true).forEach((r) => {
    const n = parseInt(r.id, 10);
    const note = (r.notes || "");
    if (n >= 101 && n <= 110 || /organisme de formation/i.test(note)) candidats.push(ouvrirLigne(r, "FORMATION"));
    else if (n >= 111 && n <= 120 || /transport/i.test(note)) candidats.push(ouvrirLigne(r, "TRANSPORT"));
    else log("domaines-test.csv : ligne id=" + r.id + " non classée, ignorée.");
  });

  // 4. Bâtiment
  lireSource("domaines-btp.csv", true).forEach((r) => candidats.push(ouvrirLigne(r, "BATIMENT")));

  // Rejets, doublons
  const vus = new Map();
  const retenus = [];
  const rejets = [];
  for (const c of candidats) {
    const cle = c.email.trim().toLowerCase();
    const motif = motifRejet(c.email);
    if (motif) { rejets.push(c); log("REJET (" + motif + ") : " + c.email + " [" + SEGMENTS[c.segment].nom + ", id source " + c.idSource + ", " + c.cabinet + "]"); continue; }
    if (vus.has(cle)) { log("DOUBLON : " + c.email + " [" + SEGMENTS[c.segment].nom + ", id source " + c.idSource + "] déjà présent (" + vus.get(cle) + ")"); continue; }
    vus.set(cle, SEGMENTS[c.segment].nom + " id source " + c.idSource);
    retenus.push(c);
  }

  // Affectation des offres : alternance EF-V1 / EF-V2 par segment (ordre d'identifiant), pour comparer à secteur égal
  for (const cle of Object.keys(SEGMENTS)) {
    const seg = SEGMENTS[cle];
    const lignes = retenus.filter((l) => l.segment === cle).sort((a, b) => idNumerique(a) - idNumerique(b));
    lignes.forEach((l, i) => { l.offre = seg.mode === "fixe" ? seg.offre : (i % 2 === 0 ? "EF-V1" : "EF-V2"); });
  }

  // Identifiants : on conserve ceux des sources ; en cas de collision, on prend le suivant libre et on le note
  const idsUtilises = new Set();
  let idMax = Math.max(0, ...retenus.map((l) => (isNaN(parseInt(l.idSource, 10)) ? 0 : parseInt(l.idSource, 10))));
  for (const l of retenus) {
    let id = l.idSource;
    if (!id || idsUtilises.has(id)) {
      const ancien = id;
      id = String(++idMax);
      l.notes = [l.notes, "id source " + (ancien || "vide") + " remplacé (collision)"].filter(Boolean).join(" ; ");
      log("ID : collision ou vide pour " + l.email + " (" + (ancien || "vide") + ") -> " + id);
    }
    idsUtilises.add(id);
    l.id = id;
  }

  // Ordre de sortie : ordre des segments (e-facture, cabinets, formation, transport, bâtiment), puis identifiant
  const ordre = Object.keys(SEGMENTS);
  retenus.sort((a, b) => ordre.indexOf(a.segment) - ordre.indexOf(b.segment) || Number(a.id) - Number(b.id));

  const sortie = [COLONNES.join(",")].concat(retenus.map((l) => [
    l.id, l.cabinet, l.ville, l.site, l.email.trim(), l.offre, "à envoyer", "", "", "", "", "", l.notes, SEGMENTS[l.segment].nom,
  ].map(champCsv).join(",")));
  fs.writeFileSync(SORTIE, "﻿" + sortie.join("\r\n") + "\r\n", "utf8");

  // Effectifs
  const parSegment = {}, parOffre = {}, croise = {};
  for (const l of retenus) {
    const s = SEGMENTS[l.segment].nom;
    parSegment[s] = (parSegment[s] || 0) + 1;
    parOffre[l.offre] = (parOffre[l.offre] || 0) + 1;
    croise[s + " | " + l.offre] = (croise[s + " | " + l.offre] || 0) + 1;
  }
  const resume = [
    "Fichier écrit : " + path.relative(process.cwd(), SORTIE) + " (" + retenus.length + " lignes, UTF-8 avec BOM)",
    "Candidats lus : " + candidats.length + " ; rejetés : " + rejets.length + " ; doublons : " + (candidats.length - retenus.length - rejets.length),
    "Par segment : " + JSON.stringify(parSegment),
    "Par offre   : " + JSON.stringify(parOffre),
    "Détail      : " + JSON.stringify(croise),
  ];
  log("--- Résumé ---");
  resume.forEach(log);
  fs.writeFileSync(JOURNAL, journal.join("\n") + "\n", "utf8");
  console.log(journal.join("\n"));
  console.log("\nJournal : " + path.relative(process.cwd(), JOURNAL));
}

if (require.main === module) main();
module.exports = { motifRejet, lireCsv, enregistrements };
