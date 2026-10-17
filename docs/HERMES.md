# Hermes Agent — cadrage d'intégration (test)

17 octobre 2026. Statut : **non installé**. Source principale : [documentation officielle](https://hermes-agent.nousresearch.com/docs). Le logiciel est open source (MIT) ; les services Nous Portal (modèle, recherche web, images) peuvent être payants, tarifs non vérifiés.

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
Puis configurer un fournisseur de modèle (`hermes setup`, ou `hermes setup --portal` pour Nous Portal). Un modèle gratuit (par exemple via OpenRouter) n'est pas confirmé par la documentation lue : à vérifier au moment du choix.

## Précautions
- Lire la section « Security » de la documentation (approbation des commandes, isolation) avant le premier lancement.
- Lancer Hermes depuis un dossier de travail dédié, jamais depuis la racine du dépôt.
- Ne pas activer la passerelle de messagerie ni le cron tant que le test lecture seule n'a pas fait ses preuves.
- Ne jamais citer l'employeur ni le stage dans ses fichiers de mémoire ou skills.
