---
name: "source-command-commit"
description: "Créer un commit propre avec un message clair"
---

# source-command-commit

Use this skill when the user asks to run the migrated source command `commit`.

## Command Template

Crée un commit :

1. Lance `git status` et `git diff` pour voir ce qui a changé.
2. Vérifie qu'aucun fichier secret (`.env`, clés, jetons) ni fichier de prospects n'est dans les changements. S'il y en a, arrête-toi et préviens-moi.
3. Ajoute les fichiers concernés (pas de `git add .` aveugle).
4. Écris un message court en français, au présent, qui dit ce qui change et pourquoi (par exemple « Ajoute l'analyse des concurrents »).
5. Fais le commit, puis affiche le résultat de `git log -1 --oneline`.

Ne pousse rien vers un dépôt distant sans que je le demande.
