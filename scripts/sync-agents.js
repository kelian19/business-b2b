#!/usr/bin/env node
// Synchronise les agents et skills entre Claude Code (source de vérité) et Codex.
//   .claude/agents/*.md   ->  .codex/agents/*.toml   (name, description, developer_instructions)
//   .claude/skills/<nom>/ ->  .agents/skills/<nom>/  (copie à l'identique ; les dossiers source-command-* ne sont pas touchés)
// Usage : node scripts/sync-agents.js           applique la synchronisation
//         node scripts/sync-agents.js --check   ne modifie rien, sort en code 1 s'il y a un écart
// Les champs propres à Claude Code (tools, model, skills, maxTurns, disallowedTools) n'ont pas d'équivalent
// dans les fichiers Codex générés ici : ils restent uniquement dans .claude/agents.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CHECK = process.argv.includes("--check");
const diffs = [];

function read(p) { return fs.readFileSync(p, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n"); }
function writeIfChanged(p, content) {
  const old = fs.existsSync(p) ? read(p) : null;
  if (old === content) return;
  diffs.push(path.relative(ROOT, p));
  if (!CHECK) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content, "utf8"); }
}

// --- Agents : .claude/agents/*.md -> .codex/agents/*.toml
const agentsDir = path.join(ROOT, ".claude", "agents");
const codexDir = path.join(ROOT, ".codex", "agents");
const tomlStr = (s) => '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
const tomlBlock = (s) => s.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');

for (const f of fs.readdirSync(agentsDir).filter((x) => x.endsWith(".md")).sort()) {
  const text = read(path.join(agentsDir, f));
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) { console.error("En-tête illisible : " + f); process.exit(2); }
  const meta = {};
  for (const line of m[1].split("\n")) {
    const k = line.match(/^(name|description):\s*(.*)$/);
    if (k) meta[k[1]] = k[2].trim().replace(/^"(.*)"$/, "$1");
  }
  if (!meta.name || !meta.description) { console.error("name ou description manquant : " + f); process.exit(2); }
  const body = m[2].trim();
  const toml = `name = ${tomlStr(meta.name)}\ndescription = ${tomlStr(meta.description)}\ndeveloper_instructions = """\n${tomlBlock(body)}\n"""\n`;
  writeIfChanged(path.join(codexDir, meta.name + ".toml"), toml);
}

// Fichiers Codex orphelins (agent supprimé côté Claude)
const names = new Set(fs.readdirSync(agentsDir).filter((x) => x.endsWith(".md")).map((x) => x.replace(/\.md$/, "")));
if (fs.existsSync(codexDir)) for (const f of fs.readdirSync(codexDir).filter((x) => x.endsWith(".toml"))) {
  if (!names.has(f.replace(/\.toml$/, ""))) diffs.push("orphelin (non supprimé) : .codex/agents/" + f);
}

// --- Skills : .claude/skills -> .agents/skills
function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name))]);
}
const skillsSrc = path.join(ROOT, ".claude", "skills");
const skillsDst = path.join(ROOT, ".agents", "skills");
for (const rel of walk(skillsSrc)) {
  const src = path.join(skillsSrc, rel), dst = path.join(skillsDst, rel);
  const a = fs.readFileSync(src);
  const same = fs.existsSync(dst) && fs.readFileSync(dst).equals(a);
  if (!same) { diffs.push(path.relative(ROOT, dst)); if (!CHECK) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, a); } }
}

if (diffs.length === 0) { console.log("Agents et skills synchronisés : aucun écart."); process.exit(0); }
console.log((CHECK ? "Écarts détectés (" : "Fichiers mis à jour (") + diffs.length + ") :\n- " + diffs.join("\n- "));
process.exit(CHECK ? 1 : 0);
