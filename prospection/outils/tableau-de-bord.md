# Tableau de bord de suivi (Google Sheets)

**Installation** :
1. Copier le contenu de `suivi-modele.csv` dans un Sheet nommé « Suivi » (onglet par défaut).
2. Ajouter un onglet « Messages » : colonnes `id` (EF-V1, EF-V2, DEC, EF-CAB), `objet`, `corps`, `relance_objet`, `relance_corps` (contenu : `messages-sheet.csv`).
3. Ajouter un onglet « Désinscrits » : une colonne `email` avec les adresses à ignorer.
4. Ajouter un onglet « Synthèse » : formules ci-dessous.
5. Ajouter un onglet « Journal » : colonnes `timestamp`, `action`.

**Synthèse (formules)** : colonnes du Suivi : F = offre_testee, G = statut, I = date_relance_J5, J = reponse, N = segment. Colonne A pour les libellés, colonne B pour les calculs. « Envoyé » = statut autre que « à envoyer », « brouillon créé » et vide.

| Libellé (A) | Formule (B) |
|---|---|
| Envois EF-V1 | `=COUNTIFS(Suivi!F:F,"EF-V1",Suivi!G:G,"envoyé")+COUNTIFS(Suivi!F:F,"EF-V1",Suivi!G:G,"répondu")+COUNTIFS(Suivi!F:F,"EF-V1",Suivi!G:G,"intéressé")` |
| Envois EF-V2 | même formule avec `"EF-V2"` |
| Envois DEC | même formule avec `"DEC"` |
| Envois EF-CAB | même formule avec `"EF-CAB"` |
| Réponses | `=COUNTIF(Suivi!J:J,"?*")` |
| Taux de réponse EF-V1 | `=SIERREUR(COUNTIFS(Suivi!F:F,"EF-V1",Suivi!J:J,"?*")/B2,"N/A")` (adapter la ligne de l'offre ; idem EF-V2, DEC, EF-CAB) |
| Taux de réponse par segment | `=SIERREUR(COUNTIFS(Suivi!N:N,"Transport",Suivi!J:J,"?*")/COUNTIFS(Suivi!N:N,"Transport",Suivi!G:G,"<>à envoyer",Suivi!G:G,"<>brouillon créé"),"N/A")` (remplacer « Transport » par chaque segment) |
| Relances dues | `=COUNTIFS(Suivi!I:I,"<="&AUJOURDHUI(),Suivi!G:G,"envoyé")` |
| Désinscrits | `=COUNTA(Désinscrits!A:A)-1` |
| Alerte | `=SI(MIN(B2:B5)<10,"Échantillon trop petit : moins de 10 envois pour au moins une offre","")` |

Afficher « échantillon trop petit » si moins de 10 envois par offre : en dessous, une comparaison de taux est une indication, pas une preuve. Formules à vérifier à la première utilisation (noms de fonctions selon la langue du classeur).
