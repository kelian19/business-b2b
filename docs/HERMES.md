# Hermes Agent — cadrage d'intégration (test)

17 octobre 2026. Statut : **installé et connecté à Telegram (passerelle active, identifiant autorisé unique), modèle `gpt-6.1-sol` (effort low) via abonnement ChatGPT Plus/Codex (le palier gratuit Nous Portal `stepfun/step-3.7-flash:free` reste en repli ; ses essais de rédaction étaient insuffisants), approbations `manual`, dossier de travail `hermes-travail`, écriture limitée à ce dossier. Aucun envoi, aucune boîte e-mail connectée.** Test de qualité du modèle : insuffisant pour rédiger seul (désinscription absente, promesse de conformité), voir les [modèles fixes](../livrables/automatisations/pipeline-agence/hermes/MODELES_MESSAGES.md). Source principale : [documentation officielle](https://hermes-agent.nousresearch.com/docs). Le logiciel est open source (MIT) ; les services Nous Portal (modèle, recherche web, images) peuvent être payants, tarifs non vérifiés.

Analyse complémentaire : [Hermes Free et notre prospection](ANALYSE_HERMES_FREE.md). L'existence du palier Portal Free est vérifiée publiquement : modèles gratuits seulement, limites standard, zéro crédit mensuel. Les outils hébergés sont distincts ; les droits du compte et la qualité du modèle restent à tester. Le workflow API Claude actuel ne devient pas gratuit avec ce palier.

Complément à la demande « fais la pipeline avec n8n, claude, hermes » : [pipeline agence locale](../livrables/automatisations/pipeline-agence/README.md) préparée, avec deux exports n8n inactifs et [instructions de supervision Hermes](../livrables/automatisations/pipeline-agence/hermes/INSTRUCTIONS.md). La cible de supervision est désormais un export d'agrégats séparé, pour éviter d'exposer le suivi détaillé. La lecture Hermes à la demande est préparée ; le test ci-dessous, l'installation et toute activation de passerelle/cron restent non réalisés.

## Portée du test
- Un seul job, en lecture seule : produire le point hebdomadaire à partir de `prospection/suivi.md`.
- Aucun envoi, aucun MCP d'écriture (Gmail, Sheets), aucun accès à `prospection/prospects.csv`, `prospection/messages/` ni `.env`.
- Les agents Claude/Codex restent la source de vérité (`.claude/`, `scripts/sync-agents.js`). Hermes n'y est pas synchronisé.
- Durée : deux semaines, puis décision garder/arrêter. Critère : temps réellement gagné sur le point hebdo.

## Installation (Windows, à lancer par Kélian)
Le script officiel a été lu : téléchargements épinglés et vérifiés par SHA256, installation dans `%LOCALAPPDATA%\hermes` (hors dépôt), clone de `github.com/NousResearch/hermes-agent`.
```powershell
iwr https://hermes-agent.nousresearch.com/install.ps1 -OutFile $env:TEMP\hermes-install.ps1
& $env:TEMP\hermes-install.ps1 -NonInteractive
```
Puis configurer un fournisseur de modèle (`hermes setup`, ou `hermes setup --portal` pour Nous Portal). Le palier Portal Free propose des modèles gratuits ; constater le modèle et les limites disponibles dans le compte avant de le retenir. Les outils de recherche et navigateur hébergés ne sont pas présumés inclus gratuitement. Aucun fournisseur n'est configuré par ce document.

## Précautions
- Lire la section « Security » de la documentation (approbation des commandes, isolation) avant le premier lancement.
- Lancer Hermes depuis un dossier de travail dédié, jamais depuis la racine du dépôt.
- La passerelle Telegram est active (accès limité à Kélian). Ne pas activer le cron ni la boîte e-mail avant la boîte dédiée et un test de collecte vérifié.
- Ne jamais citer l'employeur ni le stage dans ses fichiers de mémoire ou skills.
