---
name: "source-command-update"
description: "Mettre à jour CONTEXT.md et HISTORY.md en fin de session"
---

# source-command-update

Use this skill when the user asks to run the migrated source command `update`.

## Command Template

Mets à jour la mémoire du projet à partir de cette session :

1. Dans `context/CONTEXT.md`, remplis ou corrige uniquement les champs sur lesquels une décision ou un fait a été établi pendant la session. Garde « À compléter » pour tout le reste. N'invente rien. Modifie par patch, ne réécris pas le fichier.
2. Dans `context/HISTORY.md`, ajoute en haut une ligne datée (AAAA-MM-JJ) par décision ou fait important.
3. Mets à jour « Prochaines actions » dans `context/CONTEXT.md` et l'état des étapes dans `context/PIPELINE.md`.
4. Termine par un résumé de ce qui a changé, en cinq lignes maximum, puis rappelle de faire `/clear`.
