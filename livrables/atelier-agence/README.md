# flow · Atelier de l’agence

Deux outils internes créés le 16 octobre 2026 à la demande de l'utilisateur : suivi commercial et chiffrage de mission. Identité visuelle reprise de la maquette flow (crème, vert sombre, orange). Aucun service externe, compte, bibliothèque ou installation nécessaire.

## Ouvrir

Double-cliquer sur `index.html`. Choisir « Suivi commercial » ou « Chiffrage de mission ». Les scripts classiques et les ressources sont locaux ; aucune API n'est appelée. Pour servir le dossier localement, optionnellement :

```powershell
python -m http.server 8766 --bind 127.0.0.1 --directory livrables/atelier-agence
```

Puis ouvrir `http://127.0.0.1:8766`. Arrêter le serveur avec Ctrl+C.

## 01 — Suivi commercial

- Démarrage vide. Exemple fictif chargé uniquement sur demande, avec un bandeau distinct ; créer un nouveau suivi vide avant de saisir ses opportunités réelles.
- Ajouter, modifier, supprimer, rechercher, filtrer par offre. Les actions datées à aujourd'hui ou avant sont signalées pour les opportunités non signées et non perdues.
- Entreprise ou alias, offre, étape, prochaine action, date et notes de qualification. Aucun contact préchargé ni message envoyé.
- Proposé, signé, facturé et encaissé sont des montants HT indépendants. Les compteurs ne représentent pas un funnel historique ni une comptabilité. Ils portent sur tout le suivi, même lorsque la liste est filtrée.
- Les montants signés, facturés et encaissés nécessitent l'étape Signé ; encaissé ≤ facturé ≤ signé. Ce modèle simple ne traite ni avoirs, ni remboursements, ni contrats annulés, ni plusieurs devis par opportunité.
- Maximum 500 fiches. Sauvegarde JSON explicite, schéma versionné, contrôle avant remplacement. Un fichier invalide conserve le suivi courant. Taille de restauration maximale : 5 Mo.
- Aucun enregistrement automatique ni stockage persistant dans le navigateur. Le bouton « Enregistrer la fiche » modifie seulement l'onglet : télécharger la sauvegarde pour conserver les fiches. Un avertissement de fermeture peut être présenté par le navigateur pour les modifications enregistrées non exportées. Les champs encore non enregistrés ne sont pas sauvegardés.
- Sauvegarde en clair : la conserver hors Git, par exemple dans un répertoire privé. Aucune fusion ou synchronisation avec l'ancien Google Sheet. Les données historiques de prospection n'ont pas été lues ni importées.

## 02 — Chiffrage de mission

Saisir le périmètre, le prix HT, le temps prévu, sa valorisation horaire, les coûts externes, la réserve de temps et la marge cible. Les valeurs initiales (790 €, 10 h, 35 €/h, 40 € de coûts, 20 % de réserve, 30 % de marge cible) sont exclusivement des hypothèses modifiables.

- Temps ajusté = temps prévu × (1 + réserve / 100).
- Coût estimé = valorisation du temps ajusté + coûts externes. Montants monétaires arrondis au centime.
- Marge estimée = prix − coût estimé ; taux = marge / prix. À prix nul, le taux est indéfini.
- Prix pour la marge cible = coût / (1 − marge cible / 100), arrondi au centime supérieur.
- Scénarios de temps −20 %, nominal et +30 %, chacun avec la réserve saisie.
- Note interne exportable en texte, impression via le navigateur. Ce n'est pas un devis contractuel. Pas de génération de mentions légales, de facture ou d'estimation fiscale.
- Le calcul n'est pas un bénéfice net : impôts, cotisations, frais généraux non saisis et abonnements futurs ne sont pas inclus. La valorisation du temps n'est pas nécessairement une dépense décaissée. Aucun gain client garanti.
- Le chiffrage reste en mémoire ; sa note texte est indépendante de la sauvegarde JSON commerciale et ne se réimporte pas.

## Architecture et réutilisation

`logic.js` contient les validations, calculs et format de sauvegarde, utilisables aussi depuis Node. `app.js` gère le DOM via `textContent`, les événements et les téléchargements Blob. `styles.css` gère responsive et impression. Le motif de téléchargement reprend celui de l'IO Équerre ; son module n'est pas importé car il dépend de l'espace de noms de l'autre application. Aucune migration des outils existants, aucun framework partagé ajouté.

## Vérification

```powershell
node livrables/atelier-agence/tests/run-tests.js
node --check livrables/atelier-agence/app.js
```

Les tests couvrent calculs, arrondis, valeurs limites, dates impossibles, cohérence des montants, restauration, doublons et absence d'API réseau / HTML injecté / stockage implicite. Voir `RECETTE.md` pour les contrôles navigateur et leurs limites.
