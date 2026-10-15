# Recette locale — Flow Inbox 0.1

15 octobre 2026. Fournisseurs et extraction simulés, données fictives exclusivement. Les IDs G01–G12 renvoient au [contrat Gmail](../../../docs/CONTRAT_GMAIL_FLOW_INBOX.md). Ils ne représentent pas douze intégrations réelles réussies.

| Cas | Couverture locale livrée | Preuve réelle manquante |
|---|---|---|
| G01 | Ordre suivi → intention → faux brouillon ; destinataire, fil, références et absence de confirmation | MIME réellement produit et fil Gmail/n8n |
| G02 | Refus de référence MIME invalide, d’injection CRLF et de destinataires multiples | Sérialisation et comportements Gmail |
| G03 | Rejeu même clé sans nouveau suivi ni création ; extraction du rejeu ignorée | Rejeu de déclencheur n8n avec stockage durable |
| G04 | Contextes séparés, mauvaise agence/boîte refusée, lectures croisées absentes | Credentials, droits et stockage clients réels |
| G05 | Texte retouché conservé ; ID brouillon stable, ID de son message modifié par le faux fournisseur | Retouche dans les interfaces Gmail |
| G06 | Disparition ≠ réponse ; aucune recréation au rejeu | Suppression et observation Gmail |
| G07 | Événement sortant fictif rapproché ; source explicitement simulée | Envoi manuel d’un message fictif dans un bac à sable, autorisé séparément |
| G08 | Ancienne sortie, fil/référence/destinataires incorrects, absence SENT et réponse automatique non confirmés | Extraction et interprétation des métadonnées réelles |
| G09 | Nouvelle demande du même fil conservée et mise en revue ; pas de clôture globale | Déclenchements et interaction dans Gmail |
| G10 | Écriture de suivi incertaine simulée : zéro création ; rejeu bloqué | Panne/réconciliation Sheets et persistance |
| G11 | Timeout ou ID non stocké simulés ; une seule création et réconciliation par corrélation du mock | Corrélation Gmail fiable, panne réelle et redémarrage |
| G12 | Lecture incomplète/refusée/transitoire simulée : aucune fausse absence | Pagination fournisseur, droits révoqués et erreurs réseau réelles |

Autres contrôles locaux : types/champs, preuve textuelle, montants et dates, service hors catalogue, contenu non fiable, formules de tableau, journal expurgé, délai calendaire, indépendance des snapshots et fixtures.

## Résultats constatés

- Moteur Node **v24.21.0** inclus dans VS Code, utilisé avec ELECTRON_RUN_AS_NODE=1, sans installation. Vérification de syntaxe des **7 fichiers JavaScript**, aucune erreur.
- Commande métier équivalente à `node tests/run-tests.js` depuis ce dossier : **62 tests réussis, sortie 0**, services exclusivement simulés.
- Commande de démo équivalente à `node demo/run.js` : assertions de rejeu, retouche, disparition et réconciliation réussies, **sortie 0** ; trois créations de brouillons chez le faux fournisseur pour le jeu complet, aucun message réel.
- `python tests/review-browser.py` avec Chrome **155.0.8059.79** sous Windows : **38/38 contrôles réussis**. Le script est versionnable et ne nécessite aucun paquet Python externe. Il utilise un profil Chrome temporaire séparé et un serveur HTTP sur 127.0.0.1, arrêté après contrôle.
- Ouverture directe du HTML : les scripts rendent les exemples sans serveur. Parcours navigateur : sélection, traitement, retouche enregistrée/non enregistrée, rejeu, disparition, entrée invalide, texte hostile inerte, sortie IA invalide, création incertaine, rapprochement fictif et réinitialisation.
- Aucun débordement horizontal de page à **320, 390, 768, 1 024 et 1 440 px** ; le tableau possède volontairement son propre défilement sur petit écran. États de revue et réponse fictive contrôlés aussi à 320 px. Les captures à 390 px utilisent une iframe pour éviter la largeur minimale de fenêtre Chrome headless.
- Captures ordinateur et mobile examinées visuellement. Elles restent dans le dossier local `captures/`, ignoré par Git. Absence de ressource distante déclarée, politique de connexion interdite et absence de stockage navigateur contrôlées.

Reproduction facultative du contrôle navigateur, depuis ce dossier sous Windows :

    python tests/review-browser.py

Chrome est recherché dans Program Files ; la variable FLOW_INBOX_CHROME permet de fournir le chemin d’un autre exécutable Chrome installé. Le script crée des profils temporaires propres, sans utiliser celui du navigateur habituel ; leur nettoyage est limité aux répertoires qu’il crée.

Pas de test complet manuel au clavier, de lecteur d’écran, de test sur mobile physique, d’audit de dépendances du navigateur ni de mesure de production. Pas de test des 36 scénarios de l’architecture au niveau connecté. Cette recette ne prouve ni l’idempotence inter-services, ni un appel réel n8n, Gmail, Sheets ou IA.
