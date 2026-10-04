---
description: Avancer la pipeline commerciale d'une étape (argument facultatif : numéro d'étape)
argument-hint: [étape]
---

1. Lis `context/PIPELINE.md` (tableau des étapes et état courant).
2. Étape à traiter : $ARGUMENTS si fourni, sinon la première étape non « fait ».
3. Si c'est une étape humaine (🧑), dis en 3 lignes ce que Kélian doit faire et arrête-toi.
4. Sinon, délègue à l'agent indiqué avec une consigne courte (objectif, fichier d'entrée, fichier de sortie). Ne fais pas le travail toi-même.
5. Si l'étape produit un livrable sortant (offre, messages), fais-le relire par l'agent `relecteur`.
6. Mets à jour l'état de l'étape dans `context/PIPELINE.md` et ajoute une ligne datée dans `context/HISTORY.md`.
7. Réponds en 5 lignes maximum : résultat, fichier produit, prochaine étape.
