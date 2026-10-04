# Pipeline commerciale

Lancer une étape : `/pipeline` (étape suivante) ou `/pipeline N`. 🧑 = étape humaine, Claude s'arrête.

| # | Étape | Qui | Modèle | Entrée → Sortie | Critère de sortie | État |
|---|---|---|---|---|---|---|
| 1 | Comparer 3-4 types de cibles (nombre en France, joignabilité, paperasse) | `chercheur` | Haiku | CONTEXT.md → `context/recherche/` | Tableau sourcé | à faire |
| 2 | Choisir la cible | 🧑 Kélian | – | recherche → HISTORY.md | Ligne « Décision » datée | à faire |
| 3 | Rédiger l'offre v1 + relecture | `redacteur-offre` → `relecteur` | Sonnet / Haiku | CONTEXT.md → `livrables/offre/offre-v1.md` | Verdict relecteur OK | à faire |
| 4 | Lister 10 prospects | `prospecteur` | Sonnet | offre → `prospection/prospects.csv` | 10 entreprises sourcées | à faire |
| 5 | Rédiger 10 messages de découverte + relecture | `prospecteur` → `relecteur` | Sonnet / Haiku | prospects → `prospection/messages/` | Verdict OK | à faire |
| 6 | Envoyer les messages, mener les appels | 🧑 Kélian | – | messages → `prospection/suivi.md` | 10 envois notés | à faire |
| 7 | Analyser les retours, ajuster l'offre ou la cible | principal + `redacteur-offre` | Sonnet | suivi.md → offre-v2 + HISTORY.md | Go / ajuster / abandonner | à faire |

Règle : aucun développement (prototype, site) avant 2-3 retours concordants à l'étape 7.

## Économie de tokens

- Le principal orchestre, les agents font le travail verbeux et renvoient 5 à 10 lignes ; le détail reste dans les fichiers.
- Haiku pour collecter et relire, Sonnet pour rédiger, Opus seulement sur demande pour une décision difficile.
- Un agent à la fois (pas de parallèle tant qu'il n'y a pas de client).
- `/update` puis `/clear` entre deux étapes.

## Outils à brancher plus tard

| Outil | Quand | Usage |
|---|---|---|
| GitHub (CLI `gh`), context7 | Vitrine et livraison (après l'étape 7, si go) | Héberger la vitrine (`livrables/site/`), doc à jour des bibliothèques |
| remotion, ffmpeg | Après validation de l'offre (étape 7 : go) | Vidéo de démonstration de l'offre |
| firecrawl, perplexity | Seulement si WebSearch/WebFetch + playwright ne suffisent plus (étapes 1, 4) | Recherche et extraction web à plus grande échelle |

Déjà branchés : playwright (`chercheur`, `prospecteur`) ; skills `business-ai` et `token-efficient` préchargés dans tous les agents ; `actuarial-modeling` dans `analyste` (appui aux étapes 3 et 7 : grille de prix, chiffrage CA/marge/bénéfice ; prototype seulement après un go à l'étape 7).

Pré-câblage (2026-10-04, non installés) : `mcp__perplexity__*` et `mcp__firecrawl__*` déclarés dans `chercheur` ; `mcp__firecrawl__*` dans `prospecteur` ; remotion et ffmpeg notés dans `redacteur-offre`. context7 actif dans `analyste`. Installer un MCP suffit à l'activer : `cmd /c claude mcp add --scope user <nom> -- cmd /c npx -y <paquet>` (clé API dans `.env`).
