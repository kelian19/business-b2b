// Hook PreToolUse du projet : bloque l'accès à .env, les « git add » forcés et les termes interdits.
// Codes de sortie : 2 = bloque (message sur stderr renvoyé à Claude) ; 0 = aucune objection ;
// 1 = erreur visible mais NON bloquante (un hook en échec laisse passer : tester après chaque modification).
// Liste des termes interdits : ~/.claude/forbidden-terms.txt (hors dépôt, un terme par ligne).
const fs = require("fs");
const os = require("os");
const path = require("path");

const block = (msg) => { fs.writeSync(2, `Bloqué par le garde-fou du projet : ${msg}\n`); process.exit(2); };
const norm = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input;
  try { input = JSON.parse(raw.replace(/^﻿/, "").trim()); } catch { fs.writeSync(2, "guard.js : entrée JSON illisible\n"); process.exit(1); }
  const tool = input.tool_name || "";
  const shell = tool === "Bash" || tool === "PowerShell";

  // Toutes les chaînes de tool_input, sans dépendre des noms de champs.
  // old_string est exclu : un Edit doit pouvoir SUPPRIMER un terme interdit.
  const strings = [];
  (function walk(v, key) {
    if (typeof v === "string") { if (key !== "old_string") strings.push(v); }
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  })(input.tool_input, "");

  // 1. Fichier .env (sauf .env.example) visé par une lecture, une recherche ou un shell.
  if (shell || ["Read", "Grep", "Glob"].includes(tool)) {
    const envFile = /(^|[\\/\s"'=:,(*])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\\/\s"';|&),*?])/i;
    if (strings.some((s) => envFile.test(s))) block("accès à un fichier .env");
  }

  // 2. git add forcé : seul moyen d'indexer un fichier ignoré (.env, prospects, messages).
  if (shell && strings.some((s) => /\bgit\b[^|;&\n]*\badd\b[^|;&\n]*(\s-[a-z]*f[a-z]*\b|\s--force\b)/i.test(s))) {
    block("git add --force interdit (fichiers ignorés : .env, prospects, messages)");
  }

  // 3. Termes interdits (nom de l'employeur, etc.) dans un fichier écrit ou une commande.
  if (shell || ["Write", "Edit", "NotebookEdit"].includes(tool)) {
    let terms;
    try {
      terms = fs.readFileSync(path.join(os.homedir(), ".claude", "forbidden-terms.txt"), "utf8")
        .split(/\r?\n/).map((t) => norm(t.trim())).filter(Boolean);
    } catch {
      fs.writeSync(2, "guard.js : forbidden-terms.txt illisible, règle des termes inactive\n");
      process.exit(1);
    }
    const text = norm(strings.join("\n"));
    if (terms.some((t) => text.includes(t))) block("terme interdit (liste ~/.claude/forbidden-terms.txt) ; pour vérifier une fuite, utiliser l'outil Grep");
  }
  process.exit(0);
});
