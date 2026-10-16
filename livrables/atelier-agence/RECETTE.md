# Recette locale — 16 octobre 2026

## Résultats exécutés

- `node livrables/atelier-agence/tests/run-tests.js` : **23 tests réussis**.
- `node --check livrables/atelier-agence/app.js` : syntaxe valide.
- `git diff --check` : aucune erreur signalée sur les modifications suivies ; les nouveaux fichiers ont été inspectés séparément.
- Playwright sur serveur HTTP lié à `127.0.0.1:8766`, données fictives exclusivement : **30 contrôles réussis**, en deux séquences de 22 et 8. Le serveur a été arrêté après recette.

## Contrôles navigateur

Première séquence : chargement de trois exemples fictifs, recherche, création d'un suivi privé vide, création avec texte de type HTML rendu inerte, édition et mise à jour des montants, téléchargement et lecture du JSON, restauration, rejet d'un fichier invalide sans perte des données, chiffrage nominal, marge négative explicite, blocage de l'export pour une saisie invalide, téléchargement de la note texte. Dix contrôles de débordement complètent cette séquence : les deux écrans à 320, 390, 768, 1 024 et 1 440 px.

Deuxième séquence : filtre par offre, annulation du remplacement, annulation de la suppression, suppression confirmée, navigation au clavier (Entrée sur le lien), scénario +30 % à la limite haute des heures du formulaire, affichage du seul chiffrage sous média print et absence d'exception JavaScript sur cette séquence.

Les réponses aux confirmations ont été simulées (`window.confirm` vrai ou faux) dans ces deux séquences : la logique des branches a été testée, pas l'interaction visuelle avec les dialogues système. Les téléchargements JSON et texte ont été réellement produits par le navigateur avec des données fictives.

L'aperçu du chiffrage sur grand écran a été inspecté visuellement. La vérification responsive mesure l'absence de débordement de page, sans prétendre à un audit exhaustif d'accessibilité. La zone de tableau peut défiler horizontalement sur mobile.

## Limites de la recette

Aucun compte réel, email, paiement ou service tiers utilisé. Ni impression physique, ni export PDF, ni ouverture par double-clic `file://` testés dans cette recette ; le navigateur de test a utilisé le serveur local. L'application utilise exclusivement des scripts classiques et fichiers relatifs, sans requête API ni import de modules.

Les applications historiques n'ont pas été modifiées par cette création ; leurs suites n'ont pas été relancées pour cette tâche. Les adaptations Équerre précédentes et le dossier `outil-flow-inbox` déjà présent au début de la tâche ont été préservés.

## Recette manuelle reproductible

1. Ouvrir `index.html` ou servir le dossier comme indiqué dans le README.
2. Explorer l'exemple fictif, rechercher « Comptoir », filtrer l'offre e-facture.
3. Choisir un suivi vide, ajouter une entreprise fictive, modifier l'étape en Signé et saisir 790 / 395 / 100 € pour signé / facturé / encaissé.
4. Télécharger le JSON, ouvrir un suivi vide puis restaurer ce fichier : retrouver la fiche et 100 € encaissés.
5. Essayer un JSON invalide : vérifier que les données courantes sont conservées.
6. Dans le chiffrage nominal, vérifier 12 h, 460 € de coût, 330 € de marge et 657,15 € pour la marge cible.
7. Saisir 100 € de prix : vérifier la marge négative ; vider le prix : vérifier l'absence de résultat périmé et le bouton d'export désactivé.
8. Télécharger la note interne, vérifier son périmètre et ses hypothèses. Revenir aux données fictives ou à un suivi vide pour toute présentation publique.
