# Contexte du projet

> Source de vérité. Mise à jour avec `/update`. Les champs « À compléter » ne sont pas encore décidés : ne pas les inventer.

## Porteur

- Kélian Kaddouri, MSc actuariat ENSAE (promo 2025/2026), stagiaire cyber-risque chez Nexialog jusqu'en novembre 2026, disponible en février 2027.
- Profil actuaire × data scientist (cyber, DORA), deux ans de data science (Python, mise en production).
- Temps disponible : 4-5 h/semaine (déclaré), contraint par le stage, le mémoire et la recherche d'emploi.
- Objectifs : 1) mémoire d'actuariat et data science ; 2) business B2B IA à 1 000 €/mois de bénéfice ; 3) minimiser les tokens.

## Vision

- Idée en une phrase (provisoire) : supprimer une tâche répétitive (reporting ou saisie de documents) dans des entreprises peu familières de l'IA ; on vend le résultat, l'IA reste en coulisse.
- Modèle : vente en ligne à des entreprises (B2B), en freelance/prestation d'abord, pas de logiciel.
- Pistes : audit et suivi des coûts IA ; kit de conformité AI Act ; veille réglementaire automatisée (DORA, cyber, AI Act) ; automatisations sur mesure ; tableaux de bord data/sinistralité.
- Pistes retenues (2026-10-04) : reporting automatisé et traitement de documents. Écartées : audit des coûts IA (cible trop informée sur l'IA), veille (demande un secteur maîtrisé, à reprendre plus tard pour le récurrent).
- Contrainte : aucun secteur connu de l'intérieur, aucun réseau → cible à choisir par accessibilité (étape 1 de PIPELINE.md).

## Client cible

- Secteur : À compléter (selon l'offre : startups/PME utilisant des API d'IA, courtiers, petits assureurs, cabinets)
- Taille d'entreprise : À compléter
- Décideur (poste) : À compléter

## Problème

- Quel problème, à quelle fréquence, avec quel coût pour le client : À compléter

## Offre

- Ce qu'on vend : À compléter
- Différenciation : À compléter (atout possible : profil conformité/risque)
- Comparaison avec une solution sans IA : À compléter

## Prix et revenus

- Modèle (abonnement, projet, licence) : À compléter (scénario mixte envisagé : 1 projet + abonnements)
- Prix : À compléter. Fourchettes du plan, non validées : audit 800–1 500 € + suivi 150–300 €/mois ; kit AI Act 500–1 500 € ; veille 80–150 €/mois.

## Acquisition

- Canaux envisagés : À compléter (premier test : 10 prospects contactés, messages en brouillon Gmail envoyés à la main)
- Durée du cycle de vente : À compléter

## Concurrents

À compléter (source et date pour chaque élément).

## Hypothèses chiffrées

Chaque chiffre est une hypothèse tant qu'il n'a pas de source.

| Élément | Valeur | Statut |
|---|---|---|
| Bénéfice visé (mois) | 1 000 € | Objectif |
| Chiffre d'affaires nécessaire (mois) | (1 000 + 50) / (1 − 0,25) = 1 400 € | Calcul sur hypothèses |
| Cotisations micro-entreprise (services) | ~25 % du CA | Hypothèse, à vérifier sur l'URSSAF |
| Coûts récurrents (abonnement Claude, domaine, outils) | 50 €/mois | Hypothèse |
| Coût IA par client | < 1 % du prix | Hypothèse (calcul du plan) |
| Coût d'acquisition d'un client | À compléter | Hypothèse |

## Contexte réglementaire

- AI Act : depuis le 2 août 2026, transparence (un chatbot se déclare comme IA) et formation du personnel ; obligations « haut risque » repoussées à fin 2027/2028. Source : blog Ingeni Solution (août 2026), à revérifier.

## Environnement technique

- Windows, Europe/Paris. Claude Code 2.1.289, Node v24.19.0.
- MCP connectés (niveau utilisateur, via `cmd /c npx`) : playwright (`@playwright/mcp@latest`), context7 (`@upstash/context7-mcp`). GitHub via CLI `gh`, non connecté (dépôt distant reporté). Firecrawl, Perplexity, remotion, ffmpeg : non installés, pré-câblés dans les agents.
- Skills (tous dans `.claude/skills/` du projet) : actuarial-modeling, business-ai, token-efficient ; K-Dense : statistical-analysis, statsmodels, scikit-learn, scientific-visualization, exploratory-data-analysis (chargés à la demande par `analyste`, trop lourds pour être préchargés).
- Agents : chercheur, prospecteur, redacteur-offre, analyste, relecteur ; skills et outils par agent dans CLAUDE.md.
- Règles tokens : Sonnet par défaut, Haiku pour le simple, Opus rarement ; sous-agents pour le verbeux ; /clear entre tâches ; CLAUDE.md < 200 lignes ; lire des extraits.

## Risques

- Juridiques : RGPD (aucune donnée nominative ni donnée Nexialog dans Claude) ; AI Act si chatbot. Pas de conflit avec le stage : l'activité n'a aucun lien avec Nexialog (précisé par Kélian, 2026-10-04) et le stage se termine début décembre 2026 (~2 mois).
- Opérationnels : temps limité ; consommation de tokens (sous-agents en parallèle coûteux).
- Commerciaux : prix non validés, aucun client ni prospect à ce jour.

## Prochaines actions

Suivre `context/PIPELINE.md` avec `/pipeline`.

1. Étape 1 : comparer 3-4 types de cibles (agent `chercheur`).
2. Étape 2 : choisir la cible, noter la décision dans HISTORY.md.
3. En parallèle : vérifier le taux URSSAF.
4. Plus tard : `gh auth login`, vérifier que `.env.example` ne contient aucune clé, puis `gh repo create business-b2b --private --source . --push`.
