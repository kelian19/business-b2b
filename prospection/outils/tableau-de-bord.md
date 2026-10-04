# Tableau de bord de suivi (Google Sheets)

**Installation** :
1. Copier le contenu de `suivi-modele.csv` dans un Sheet nommé « Suivi » (onglet par défaut).
2. Ajouter un onglet « Messages » : colonnes `id` (A/B), `objet`, `corps`.
3. Ajouter un onglet « Désinscrits » : une colonne `email` avec les adresses à ignorer.
4. Ajouter un onglet « Synthèse » : formules ci-dessous.
5. Ajouter un onglet « Journal » : colonnes `timestamp`, `action`, `email`, `statut`.

**Synthèse (formules) — colonne A pour les labels, colonne B pour les calculs** :

| Label | Formule |
|---|---|
| Envois offre A | `=NB.SI(Suivi!F:F,"A")-NB.SI(Suivi!G:G,"à envoyer")`  |
| Envois offre B | `=NB.SI(Suivi!F:F,"B")-NB.SI(Suivi!G:G,"à envoyer")`  |
| Réponses | `=COUNTIF(Suivi!J:J,"<>")+COUNTIF(Suivi!K:K,"<>")` |
| Taux (A) | `=SI(B2=0,"N/A",COUNTIFS(Suivi!F:F,"A",Suivi!J:J,"<>")/B2)` |
| Taux (B) | `=SI(B3=0,"N/A",COUNTIFS(Suivi!F:F,"B",Suivi!J:J,"<>")/B3)` |
| Relances dues | `=COUNTIFS(Suivi!H:H,"<="&TODAY(),Suivi!G:G,"envoyé")` |
| Désinscrits | `=COUNTA(Désinscrits!A:A)` |
| Alerte | `=SI(B2<10,"Offre A : échantillon trop petit","")`  |

Afficher « échantillon trop petit » si moins de 10 envois par offre.
