# Règles de design produit — retour utilisateur du 16 octobre 2026

Le retour utilisateur sur e-facture prime sur les directions précédentes : l'interface crème, gros slogan, italique et cartes décoratives est rejetée comme trop générique et « IA ». La nouvelle référence est une interface de gestion sobre, directement utilisable. Le nom de travail flow reste présent.

## Références consultées

- [Pennylane](https://www.pennylane.com/fr) : page produit, catégories métier et présentation du logiciel. Retenir les entrées concrètes et le produit visible ; ne reprendre ni ses chiffres, ni ses certifications, ni ses témoignages.
- [Linear — Features](https://linear.app/features) : présentation de fonctionnalités et interface structurée ; page également inspectée dans le navigateur. Retenir la hiérarchie et la sobriété typographique, pas la page marketing sombre ou ses effets.
- [Harvest — Dashboard](https://www.getharvest.com/time-tracking/time-tracking-dashboard) : présentation du tableau de bord et appels à essayer le produit. Retenir le lien entre une donnée et une tâche.

Pages consultées le 16 octobre 2026. Elles ne donnent pas accès à leurs taux de conversion : aucune supériorité commerciale chiffrée n'est démontrée ici. Ce sont des références de composition et de parcours, sans copie de code, d'images ou de marque. Les choix ci-dessous relèvent de notre interprétation de ces références.

## Avant de dessiner

1. Nommer l'utilisateur et sa tâche : ici, responsable qui examine un dossier de facturation et prépare des corrections.
2. Définir la prochaine action : créer/ouvrir un dossier, examiner les tiers, vérifier les mentions, produire le rapport.
3. Employer les vrais composants et les vraies données de démonstration. Ne pas remplacer le produit par une illustration ou de faux indicateurs.
4. Concevoir l'écran de travail séparément de la page de vente. Le client qui a ouvert l'outil doit accéder au dossier immédiatement.

## Choix appliqués à e-facture

- Suppression du slogan et de l'italique décoratif ; titre simple « Vue d’ensemble ».
- En-tête compact et bouton « Nouveau dossier » ; commandes de gestion dans une navigation latérale sur ordinateur.
- Fond de travail neutre, surfaces blanches, texte sombre ; le vert flow sert à l'action et à la sélection. L'orange reste réservé aux informations à examiner.
- Une police système sans sérif pour l'interface. Texte principal à 14 px ; petits textes de la nouvelle couche à 12 px minimum hors graphiques SVG et rapport A4.
- Bordures fines, rayons courts, sans ombre décorative. Les cartes regroupent des informations, elles n'habillent pas chaque phrase.
- Listes et tableaux conservés pour examiner les anomalies. Les chiffres restent accompagnés de leur unité et de leur statut d'estimation.
- Sur mobile, navigation horizontale et commandes réorganisées ; les tableaux peuvent défiler dans leur propre zone.
- Au clavier : haut/bas dans la navigation verticale ; gauche/droite dans la navigation horizontale ; Début/Fin conservés. La navigation reste disponible depuis les écrans de gestion.

## Revue attendue pour les prochains livrables du designer

Avant de livrer : montrer le parcours principal, retirer les slogans sans information, choisir une action dominante, vérifier les états vide/chargé/erreur et contrôler les écrans avec leurs contenus réels. Inspecter visuellement au moins un écran mobile et un écran de bureau. Vérifier le clavier et les contrastes avant de déclarer le travail terminé.

Ne pas affirmer « ce design convertit » sans mesure. Une hypothèse commerciale s'évalue en observant si les prospects comprennent le résultat, démarrent la démonstration et acceptent un échange. Aucun mécanisme de mesure ni collecte de données n'est activé par ce document.

Ce guide fournit une référence de revue pour le designer ; les profils d'agents existants ne sont pas modifiés par cette livraison.

## Vérification de cette passe

`node livrables/outil-equerre/tests/run-tests.js` : **384 tests réussis**. La liste des couleurs autorisées a été étendue aux cinq neutres de l'interface. Les nouveaux couples texte/fond ont été calculés séparément : #20252B sur blanc 15,43:1 ; #5C6570 sur blanc 5,91:1 ; #5C6570 sur #F8FAFC 5,65:1. Cela ne constitue pas un audit complet d'accessibilité.

Recette Playwright locale : neuf routes à six largeurs (320, 390, 768, 1 024, 1 440 et 1 920 px), sans débordement de page, avec un seul h1 ; aucune exception JavaScript relevée. Vérifications supplémentaires : clavier vertical et horizontal, aide en dialogue, navigation depuis l'aide, bouton Nouveau dossier, mode présentation, média print masquant la barre latérale et réduction des mouvements. Les neuf routes et six largeurs forment 54 combinaisons, pas 54 scénarios métier.

L'impression physique, le PDF et les résultats commerciaux n'ont pas été testés. Les règles métier et les données historiques restent inchangées.
