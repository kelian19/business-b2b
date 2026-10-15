# Flow Inbox — démo locale 0.1

Première tranche locale réalisée le 15 octobre 2026, à la demande de poursuivre après présentation de son périmètre et confirmation de l’absence de coût n8n/API. Cette validation porte sur la démo fictive uniquement. Elle ne valide pas le plan complet, l’architecture d’intégration A/B, une dépense ou une activation.

## Essayer

Ouvrir [index.html](index.html) dans Chrome ou Edge. Aucun compte, installation de paquet, clé, n8n ou appel IA n’est nécessaire. Si les fichiers locaux sont bloqués par les règles du navigateur, servir ce dossier avec un serveur local :

    python -m http.server 8765 --bind 127.0.0.1

Puis ouvrir http://127.0.0.1:8765/ et arrêter le serveur avec Ctrl+C après usage. Les fichiers sont autonomes et les polices système ; aucune ressource distante déclarée. Le navigateur applique une politique interdisant les connexions du code de la page.

Parcours conseillé :

1. Choisir « Budget absent » puis traiter : budget nul conservé et question correspondante dans le brouillon.
2. Retoucher le texte, enregistrer la retouche locale puis rejouer : un seul suivi/brouillon, texte conservé.
3. Simuler sa disparition puis rejouer : aucune réponse confirmée et aucune recréation.
4. Choisir « Création incertaine », traiter puis rejouer : aucun second brouillon. Revoir l’état simulé permet de retrouver celui du faux fournisseur.
5. Examiner les cas d’entrée invalide, de destinataire divergent et de sortie IA non conforme.

« Confirmer une réponse fictive » ajoute uniquement un événement de test et montre son rapprochement. Ce bouton n’envoie rien et ne constitue pas une confirmation Gmail.

Utiliser uniquement du texte fictif dans la zone de retouche. Tout l’état est en mémoire : recharger ou réinitialiser efface la session. Aucune importation de données client, persistance, sauvegarde ou reprise après fermeture n’est fournie.

## Commandes reproductibles

Depuis la racine du dépôt, avec Node.js 20 ou plus récent :

    node livrables/automatisations/flow-inbox/demo/run.js
    node livrables/automatisations/flow-inbox/tests/run-tests.js

Depuis ce dossier, les scripts du package sont aussi disponibles avec npm run demo et npm test. Aucune commande npm install n’est nécessaire ; le package ne déclare pas de dépendance externe.

Le contrôle navigateur reproductible sous Windows avec Chrome installé est décrit dans la recette : python tests/review-browser.py. Il démarre puis arrête un serveur local de contrôle et produit des captures fictives ignorées par Git.

Dans la session Windows de développement, Node n’étant pas dans le PATH, le moteur Node déjà inclus dans VS Code a été utilisé, sans installation :

    $env:ELECTRON_RUN_AS_NODE = '1'
    & "$env:LOCALAPPDATA/Programs/Microsoft VS Code/Code.exe" demo/run.js
    & "$env:LOCALAPPDATA/Programs/Microsoft VS Code/Code.exe" tests/run-tests.js

Ces deux dernières commandes sont à lancer depuis ce dossier. La variable d’environnement concerne ce terminal ; utiliser un terminal séparé pour éviter d’affecter un lancement ultérieur de VS Code.

## Ce qui est réellement calculé

Le code de validation et de simulation est commun au navigateur et à la commande :

- Contrats stricts d’entrée, de configuration, d’extraction et d’événement sortant ; champs supplémentaires et types incorrects refusés.
- Identité distincte par client, boîte et message ; référence MIME séparée de l’ID fournisseur.
- Vérification de présence des extraits, contrôle déterministe des montants EUR pris en charge, valeurs absentes conservées.
- Revue des destinataires divergents et des cas ambigus ; rédaction déterministe à partir de règles fixes, sans texte ni destinataire imposé par la sortie IA.
- Réservation et suivi en mémoire avant création chez le faux fournisseur ; rejeu sans nouvelle création.
- Préservation des retouches ; absence du brouillon distincte de réponse confirmée ; rapprochement d’événements sortants fictifs.
- Neutralisation de formules dans les valeurs destinées au tableau simulé ; signalement pur d’un délai calendaire dans le noyau, testé mais non planifié automatiquement.
- Journal contenant uniquement codes techniques, références de demande synthétiques et date d’observation.

Les extractions ne sont pas calculées par un modèle. Elles sont fournies par les [fixtures](demo/fixtures.js), y compris dans les scénarios d’erreur. La présence d’un extrait ne garantit pas sa justesse sémantique ; aucune précision de classification IA n’est mesurée.

## Contrats et limites

[src/contracts.js](src/contracts.js) contient les schémas et leur validateur local. Celui-ci applique un sous-ensemble fermé de JSON Schema : types, champs requis, propriétés, énumérations, tableaux, bornes, longueurs et motifs. Aucun $ref, résolution distante, mot-clé format ou validateur JSON Schema complet. Les mots-clés des schémas sont vérifiés au chargement ; une extension nécessite code et tests.

Adresses simples sans nom d’affichage, références MIME simples, texte brut et services web/marketing/communication seulement. HTML orienté vers la revue ; aucune lecture des pièces jointes ou URL. Budget limité aux montants EUR explicites, fourchettes « entre … et … » et minimums « à partir de … » ; formats ambigus orientés vers la revue. Dates exactes reconnues seulement si ISO explicitement citées ; « janvier » ne reçoit pas d’année inventée.

La corrélation utilisée pour retrouver un brouillon après timeout est un champ interne au **faux fournisseur**. Aucun équivalent fiable n’a été démontré sur Gmail. Les lectures incomplètes et erreurs d’accès sont injectées comme événements de test ; aucune vraie pagination, OAuth ou reprise réseau n’est implémentée.

Les états sont mono-processus et l’écriture est synchrone. Aucune garantie transactionnelle multi-service, preuve de sérialisation n8n, reprise disque ou sécurité multi-client en production ne peut être déduite des tests. Une écriture de suivi incertaine reste bloquée pour revue ; pas de réparation automatique dans cette tranche.

Le résultat d’une réponse fictive porte la source simulated_provider, jamais une preuve Gmail réelle. Ni brouillon local, ni statut répondu ne constitue une vente ou un encaissement.

## Sources et recette

Le [contrat Gmail](../../../docs/CONTRAT_GMAIL_FLOW_INBOX.md) décrit les faits documentés et les exigences d’intégration. La [matrice de cette tranche](RECETTE_LOCALE.md) distingue couverture locale et tests réels restant à effectuer. L’architecture connectée, les prompts de fournisseur, les workflows n8n et les comptes réels restent hors de cette livraison.

Les applications Équerre, l’ancien site et les outils de prospection sont conservés. Seules leurs conventions de séparation logique/interface, de données fictives et de tests sans dépendance sont reprises ; aucune fonction de facture ne correspond directement au traitement Gmail.
