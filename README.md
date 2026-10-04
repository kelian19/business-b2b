# Business en ligne B2B

Dossier de travail pour lancer un business en ligne vendant à des entreprises, avec Claude.

## Structure

```
.claude/
  commands/        prime.md, morning.md, update.md, commit.md
  skills/          business-ai, token-efficient
  settings.local.json
context/
  import/          documents bruts à analyser
  CONTEXT.md       source de vérité du projet
  HISTORY.md       journal des décisions
livrables/         documents prêts à partager
module-installs/   modules externes installés
.env               secrets locaux (jamais commités)
.env.example       modèle des variables d'environnement
.gitignore
CLAUDE.md          instructions du projet pour Claude
README.md
```

## Démarrage

1. Compléter `context/CONTEXT.md` (les champs « À compléter »).
2. Copier `.env.example` en `.env` si besoin, puis y mettre les clés réelles.
3. Ouvrir le dossier dans Claude et lancer `/prime`.
4. Travailler, puis lancer `/update` en fin de session et `/commit` pour sauvegarder.
