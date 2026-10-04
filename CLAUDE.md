# Projet : business en ligne B2B

Ce dossier sert à construire, valider et lancer un business en ligne vendant à des entreprises.
La source de vérité est `context/CONTEXT.md`. Le journal des décisions est `context/HISTORY.md`.

## Règles de travail

- Répondre en français, de façon concise, sans reformuler la demande.
- Ne jamais inventer de chiffres, de prix, de noms de clients ou de concurrents. Un chiffre non sourcé est une hypothèse et doit être marqué comme telle.
- Distinguer chiffre d'affaires, marge et bénéfice.
- Privilégier un test simple et peu coûteux avant tout développement.
- Demander avant une action lourde ou difficile à annuler (refonte, suppression, envoi de messages).
- Ne jamais lire, afficher ni commiter `.env`.

## Arborescence

```
context/   CONTEXT.md (vérité) · HISTORY.md (journal) · PIPELINE.md (étapes) · recherche/ (sorties du chercheur) · import/ (bruts)
prospection/   prospects.csv (non versionné) · messages/ (non versionné) · suivi.md (retours)
livrables/   offre/ (offre-vN.md) · analyse/ (chiffrage, scripts) · site/ (vitrine, plus tard)
module-installs/   dépôts externes
.claude/   agents/ (5) · commands/ (5) · skills/ (actuarial-modeling, business-ai, token-efficient + K-Dense : exploratory-data-analysis, statistical-analysis, statsmodels, scikit-learn, scientific-visualization) · settings.json
```

## Agents (délégation)

| Agent | Modèle | Skills préchargés | Outils en plus | Rôle |
|---|---|---|---|---|
| `chercheur` | Haiku | business-ai, token-efficient | playwright (+ perplexity, firecrawl pré-câblés) | Recherche web sourcée → `context/recherche/` |
| `prospecteur` | Sonnet | business-ai, token-efficient | playwright (+ firecrawl pré-câblé) | Liste de prospects et messages de découverte |
| `redacteur-offre` | Sonnet | business-ai, token-efficient | (remotion, ffmpeg après étape 7) | Offre et texte de vitrine → `livrables/offre/` |
| `analyste` | Sonnet | actuarial-modeling, business-ai, token-efficient (+ K-Dense à la demande) | Bash (Python), Skill, context7 | Chiffrage CA/marge/bénéfice, puis prototype reporting → `livrables/analyse/` |
| `relecteur` | Haiku | business-ai, token-efficient | – | Relecture en lecture seule avant toute sortie |

Le principal orchestre et ne fait pas le travail verbeux lui-même. Un agent à la fois.

## Commandes

- `/prime` en début de session · `/morning` point du jour · `/pipeline [N]` avancer la pipeline · `/update` en fin de session · `/commit`.

## Économie de tokens

- Sonnet par défaut, Haiku pour collecter et relire, Opus seulement pour une décision difficile.
- Lire des extraits plutôt que des fichiers entiers ; modifier par patch.
- `/update` puis `/clear` entre deux tâches ; garder ce fichier court.
- Skills : `/business-ai` pour juger une idée, `/token-efficient` pour des réponses courtes.
