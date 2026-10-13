# Audit initial — 13 octobre 2026

## Verdict et limites

Le dépôt fournit un socle concret de traitement CSV, reporting et démonstration commerciale. Il ne contient pas encore Flow Inbox, de workflow n8n importable, d'intégration OpenAI applicative ni de service de traitement des demandes entrantes. Recommandation : conserver les applications et construire, après validation, une seule automatisation indépendante.

Audit du **dépôt local**, et non certification de l'état actuel du serveur GitHub. Inventaire de tous les chemins versionnés ; lecture ciblée des applications, de leur logique et de leurs tests, des huit agents et des documents structurants. Pas de revue exhaustive ligne par ligne, de pentest ni d'audit juridique. Les données privées ignorées et les secrets n'ont pas été parcourus. Les cinq ressources GitHub demandées ont été consultées en lecture seule.

## État Git initial

- Branche `main`, suit `origin/main` ; `git status --short --branch` n'indique ni avance ni retard selon les références **locales**. Aucun `fetch` effectué, donc synchronisation distante récente non certifiée.
- Aucun changement suivi, indexé ou non suivi au début ; `git diff --stat` vide.
- HEAD : `7495978d2db965b7419564536b630421140beb07`, 7 octobre 2026, 01:10:14 +0200.
- 252 fichiers versionnés avant cet audit. Aucun `AGENTS.md` existant trouvé dans le projet ou les répertoires parents examinés.
- Aucun commit, push, renommage, suppression historique ou déploiement effectué.

## Cartographie du dépôt

Les nombres incluent les fichiers de documentation et les `.gitkeep`.

| Zone | Fichiers suivis | Contenu réel et décision |
|---|---:|---|
| Racine et `module-installs/.gitkeep` | 5 | README ancien, CLAUDE.md, gitignore, modèle d'environnement ; `module-installs` est réservé aux copies externes ignorées |
| `.claude/` hors skills | 16 | 8 agents, 5 commandes, settings, hook de contrôle et script d'orchestration historique |
| `.claude/skills/` | 70 | 8 skills et leurs références/scripts ; ce ne sont pas huit applications |
| `context/` | 10 | Contexte, historique, pipeline, 5 recherches, répertoires import/recherche |
| `livrables/.gitkeep` | 1 | Structure historique |
| `livrables/analyse/` | 3 | BP Python déterministe et analyse de trois anciennes offres |
| `livrables/demo-appel/` | 8 | Démo HTML/CSS/JS autonome, données fictives, guide et tests |
| `livrables/design/` | 3 | Charte et prompt de site historiques |
| `livrables/offre/` | 6 | Cinq documents d'offres v1/v2 et `.gitkeep` |
| `livrables/outil-equerre/` | 77 | Application métier locale, noyau, interface, styles, tests, documentation |
| `livrables/registre-cli/` | 3 | CLI Python, README et tests unittest |
| `livrables/site-cabinets/` | 36 | Ancien HTML + application Next.js avec composants, styles et lockfile |
| `prospection/` | 14 | Suivi, outils Apps Script/Node, modèles CSV, stratégie et tests simulés |

Organisation technique d'Équerre :

```text
js/core/       CSV, utilitaires, identifiants, tiers, corrections, factures,
               reporting, mentions, imports, préparation, dossiers,
               versions, portefeuille, rapport ; façade logic.js
js/ui/         store, import-wizard, io, dropzone, formulaires, tableaux,
               graphiques, aide, dialogues, préférences, pagination
js/views/      accueil, dashboard, tiers, mentions, reporting, rapport,
               cabinet, aide et mise à niveau
styles/        tokens, base, composants, modules, vues et impression
tests/         harnais, fixtures et 16 modules t-*.js
```

Dans Next.js : App Router (`app/page.jsx`, `layout.jsx`, CSS global), 19 composants dans `components/`, contenu centralisé partiellement dans `lib/site.js`, adaptation aux animations réduites dans `lib/useReduced.js`. Export statique configuré ; aucun backend/API métier versionné. Le contact repose sur `mailto:`, pas sur un CRM ni un service de prise de rendez-vous.

Éléments locaux ignorés observés : `node_modules`, sorties de build, `.netlify`, `.playwright-mcp`. Leur présence ne prouve ni une intégration active, ni la disponibilité du site hébergé. Le journal mentionne un déploiement Netlify antérieur ; ce déploiement n'a pas été vérifié.

**Évolution pendant l'audit :** au contrôle final, `.agents/` et `.codex/` sont apparus comme dossiers non suivis, alors qu'ils étaient absents du relevé initial. Aucune commande de cet audit ne les a créés. Leur provenance n'est pas établie ; ils ont été laissés intacts. Inventaire complémentaire : `.agents/` contient 74 fichiers, reprenant les huit skills historiques et quatre commandes migrées (`commit`, `morning`, `prime`, `update`) ; `.codex/agents/` contient six profils TOML (`analyste`, `chercheur`, `designer`, `prospecteur`, `redacteur-offre`, `relecteur`). Ces six profils ont été lus : ils reprennent les anciennes instructions, donc aussi leurs décalages de cible/pipeline. `ceo` et `manager` n'y figurent pas. La présence de fichiers TOML ne prouve ni leur chargement ni l'application des restrictions d'outils Claude. La commande migrée de commit n'a pas été invoquée et ne constitue pas un accord pour créer un commit.

## Technologies et dépendances

| Application | Stack effectivement observée | Dépendances et limites |
|---|---|---|
| Équerre / démo | JavaScript classique, HTML/CSS, modules compatibles navigateur et CommonJS | Pas de dépendance npm pour les tests ; pas de backend ; données client en mémoire puis export JSON explicite |
| Site | Next.js **15.5.27**, React/React DOM **19.3.0** | JSX, **pas TypeScript** ; export statique |
| Animation | Framer Motion **14.0.0**, Lenis **1.3.26** | À simplifier au moment d'une refonte validée si nécessaire |
| Styles site | Tailwind **3.4.19**, PostCSS **8.5.29**, Autoprefixer **10.6.1** | Polices Archivo, Public Sans, IBM Plex Mono via `next/font/google` |
| Registre | Python, bibliothèque standard | argparse, csv, urllib, cache, retries ; aucun paquet à installer pour unittest |
| Prospection | Google Apps Script + scripts Node | GmailApp/SpreadsheetApp réels dans le code, simulés dans les tests |
| BP et skills data | Python ; bibliothèques spécialisées référencées par les skills | Pas de manifeste Python applicatif global ni d'environnement data reproductible fourni |

Versions du site confirmées dans `package-lock.json` **et** les paquets installés ; lockfile v3. Les plages `^` du manifeste ne fixent pas seules la version : préserver le lockfile. Environnement de test : Node **v24.19.0**, Python **3.13.1**, Windows/PowerShell. Pas de mise à jour de dépendances ni d'audit de vulnérabilités npm effectué ; compilation réussie ne signifie pas absence de vulnérabilités.

## Réutilisation : faits et effort proposé

| Composant | Preuve dans le code | Usage recommandé |
|---|---|---|
| Import CSV et encodages | `js/core/csv.js`, `import-kinds.js`, `ui/import-wizard.js` | Insight Reports : décodage UTF-8/UTF-16/Windows-1252, séparateurs, mapping, erreurs de lignes |
| Calculs KPI | `js/core/reporting.js`, `invoices.js` | CA HT, encours, ancienneté, clients, périodes et comparaisons ; conserver les conventions métier et les tests |
| Nettoyage et doublons de tiers | `tiers.js`, `corrections.js`, `identifiers.js` | Reporting/qualité de données ; **ne remplace pas** l'idempotence d'événements Gmail |
| Dossiers et journal de corrections | `dossier.js`, `versions.js`, `portfolio.js` | Référence de séparation démo/client et traçabilité ; pas une base transactionnelle multi-client |
| Rapport | `rapport.js`, `views/view-report.js`, `styles/print.css` | Rapport A4 via impression navigateur ; génération PDF automatique à développer ultérieurement |
| Registre d'entreprises | `verif_registre.py` | Conserver pour les clients qui en ont besoin ; modèle de retries/cache intéressant, aucune utilité bloquante pour Flow Inbox |
| Prospection | `envoi.gs`, `fusion-import.js`, tests | Réutiliser concepts de statuts, opposition, verrous, neutralisation de formules et tests simulés ; pas importer le script entier dans Flow Inbox |
| Site existant | `app/`, `components/`, `lib/` | Base réutilisable après choix de marque ; ne pas reconstruire Next.js ni migrer tout en TypeScript |
| Guides et fixtures | README, guides de livraison, scripts de démo et tests | Reprendre le format, renouveler les exemples et les critères pour Flow Inbox |

Points à ne pas survendre : `.xlsx`/`.xls` sont détectés puis refusés par l'import actuel ; il faut exporter en CSV. Les KPI existants portent sur des **factures**, pas sur tous les types de données commerciales. Les versions de dossiers conservent des résumés, pas une restauration complète. Le contrôle Luhn d'un SIREN ne prouve pas son existence. Le checksum de dossier n'est ni chiffrement ni signature de sécurité.

Conserver tels quels à ce stade : les deux applications statiques, registre-cli, anciennes offres, recherches, BP, historique, site et agents. Extraire un module commun seulement après démonstration d'un besoin dans deux produits ; la façade `logic.js` permet déjà des appels sous Node sans réécriture Python.

## Faiblesses et risques priorisés

| Priorité | Constat et preuve | Conséquence / action proposée |
|---|---|---|
| Avant Flow Inbox | `envoi.gs:278,402,700` contient envois et notifications ; les notifications partent même en BROUILLON | Nouveau workflow sans opération Send/Reply/Send Draft ; ne pas exécuter l'ancien script sur un compte réel pendant l'audit |
| Avant toute nouvelle session de développement | CONTEXT/PIPELINE ciblent encore d'autres secteurs ; `ceo.md` garde 4–5 h/semaine ; BP garde 19 h/mois | Le brief du 13/10 et AGENTS.md cadrent la transition ; synchroniser les anciens documents après validation, sans effacer l'historique |
| Avant livraison | Pas d'intégration n8n/OpenAI, de contrat JSON Flow ni de test Gmail réel | Les 507 tests existants ne valident pas le nouveau produit ; prévoir tests locaux et recette d'intégration séparés |
| Avant publication | Site avec mentions `À COMPLÉTER`, identité d'équipe à confirmer, anciennes offres, `noindex` | Revue éditoriale et légale ciblée ; `noindex` n'est pas un contrôle d'accès |
| Avant exploitation client | Dossiers JSON exportés en clair ; isolation locale logique | Stockage protégé, partage contrôlé, durée de conservation et effacement à définir pour chaque client |
| Important | Tests statiques et unitaires, aucune suite navigateur versionnée identifiée ; pas de CI `.github/workflows` | Ajouter plus tard une CI minimale et un vrai parcours navigateur ciblé ; ne pas prétendre que l'accessibilité est entièrement certifiée |
| Important | `.claude/settings.json` a `ask: []`, contrairement à certaines annonces du journal ; hook lié à Windows et fichier externe de termes interdits | Configuration historique et garanties annoncées divergent ; hooks Claude non transposables automatiquement à Codex ; leur fonctionnement réel n'a pas été testé |
| Important | `guard.js` retourne 1 sur erreur de lecture du fichier de termes ou JSON invalide | Ce garde-fou peut échouer sans blocage ; ne pas le traiter comme unique barrière de sécurité |
| Important | Pas de LICENSE/NOTICE versionné à la racine ; skills data copiés avec licences seulement déclarées en métadonnées | Provenance, version source, notices et droits de redistribution à documenter avant livraison de code tiers |
| Important | Pas de test d'installation depuis un environnement vierge ni audit des dépendances | Le build prouve le fonctionnement de l'installation actuelle uniquement |
| Commercial | `prospection/suivi.md` ne contient aucune ligne de résultat | Impossible de conclure qu'il y a eu des envois, ventes ou encaissements ; interroger le porteur sans supposer zéro activité réelle |
| Commercial | Chiffres réglementaires/statistiques historiques, parfois annoncés comme à revérifier | Ne pas les réutiliser comme arguments de vente sans contrôle de sources primaires ; pas de validation réglementaire d'Équerre dans cet audit |

## Agents Claude : analyse individuelle

Les huit fichiers sont des profils Claude, pas des processus actifs. Leurs champs `model`, `tools`, `skills`, les MCP et les hooks ne sont pas une preuve d'exécution dans Codex. Aucun sous-agent lancé pendant cet audit.

Six adaptations TOML Codex ont également été observées en fin de session, voir l'inventaire complémentaire ci-dessus ; elles ne sont pas des modifications réalisées par cet audit et n'ont pas été activées.

| Agent | Utilité | Ajustements nécessaires, sans modification aujourd'hui |
|---|---|---|
| chercheur | Haute : problèmes métiers, entreprises et sources | Cible agences ; sources primaires, dates ; garder la collecte limitée et séparer fait/inférence |
| prospecteur | Haute : qualification et brouillons personnalisés | Nouvelle offre, nouveaux segments, preuve de personnalisation ; garder interdiction d'envoi |
| redacteur-offre | Haute : promesse, périmètre, devis | Installation + maintenance ; limites et prix hypothétiques ; conserver les anciennes versions |
| relecteur | Haute : contrôle des preuves et promesses | Ajouter exactitude du statut démo/intégration, limites IA et points de sécurité techniques à examiner séparément |
| manager | Haute dès les premiers contacts | Remplacer les indicateurs A/B obsolètes ; suivre facturation/encaissement séparément ; données publiques ne veut pas dire libre réutilisation |
| analyste | Haute pour rentabilité et, ensuite, reporting | Retirer le préchargement actuariel hors sujet ; garder calculs déterministes et sensibilité aux hypothèses |
| designer | Utile après choix du nom | Cible agences, site Next existant, palette proposée, animations sobres ; ne pas suivre l'ancien impératif HTML autonome |
| ceo | Ponctuelle | Corriger temps, objectif et secteurs ; recommandation sur décision difficile, pas direction automatique |

Skills locaux : `business-ai` et `token-efficient` sont courts et réutilisables comme méthodes ; `actuarial-modeling` est hors périmètre ; `exploratory-data-analysis` et `scientific-visualization` pourront servir pour Insight Reports ; `statistical-analysis`, `statsmodels`, `scikit-learn` restent en réserve. Aucun ML entraîné n'est justifié pour le premier MVP. Les scripts scientifiques n'ont pas été exécutés.

## Ressources externes : sélection restreinte

Consultation le 13/10/2026. Vérification des README, licences racines et exemples indiqués ci-dessous ; **pas d'installation, de clone ni d'exécution de leurs scripts**. Les références sont sur des branches mouvantes : épingler un SHA et relire les fichiers complets avant adoption. Les jugements d'utilité sont ceux de cet audit, pas des garanties des auteurs.

| Ressource | Licence observée et maintenance | Sélection / compatibilité / permissions |
|---|---|---|
| [agency-agents](https://github.com/msitarzewski/agency-agents) | [MIT](https://raw.githubusercontent.com/msitarzewski/agency-agents/main/LICENSE) ; API GitHub consultée : non archivé, push le 13/10/2026 | [Brand Guardian](https://github.com/msitarzewski/agency-agents/blob/main/design/design-brand-guardian.md) pour une grille de cohérence visuelle. README annonce Codex ; privilégier adaptation de texte, sans installateur ni accès comptes. Retirer métriques de succès non mesurées et périmètre branding disproportionné. |
| [wshobson/agents](https://github.com/wshobson/agents) | [MIT](https://raw.githubusercontent.com/wshobson/agents/main/LICENSE) ; commits visibles en août 2026 dans la page indexée, date du dernier push non confirmée | Catalogue Python/JS/tests/sécurité ; [python-pro](https://github.com/wshobson/agents/blob/main/plugins/python-development/agents/python-pro.md) lu, à réserver au reporting. README multi-outils avec Codex, mais `model: opus` du profil reste spécifique au fournisseur. Ne pas importer tout le marketplace ni ses dépendances/outils. |
| [knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | [Apache-2.0 déclarée](https://raw.githubusercontent.com/anthropics/knowledge-work-plugins/main/LICENSE) ; date de dernière activité non confirmée, API/historique indisponibles via l'outil | [account-research](https://github.com/anthropics/knowledge-work-plugins/blob/main/sales/skills/account-research/SKILL.md) utile comme grille entreprise/source/qualification. Ciblé Cowork/Claude Code, portabilité textuelle seulement retenue. Connecteurs CRM/enrichissement et règles d'action à adapter : les autorisations du projet priment. Le LICENSE renvoyé présente du texte additionnel inhabituel en fin de fichier : contrôler le fichier au SHA retenu avant copie. |
| [claude-quickstarts](https://github.com/anthropics/claude-quickstarts) | [MIT](https://raw.githubusercontent.com/anthropics/claude-quickstarts/main/LICENSE) ; activité visible au moins en mai 2026, dernier push non confirmé | README de [customer-support-agent](https://github.com/anthropics/claude-quickstarts/tree/main/customer-support-agent) consulté. Applications Claude API, pas un pack de skills Codex. Trop large pour Flow Inbox ; exclure code d'autonomie navigateur et permissions système. Aucun besoin d'un second fournisseur dans le MVP. |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | [MIT](https://raw.githubusercontent.com/addyosmani/agent-skills/main/LICENSE) ; API : non archivé, push le 13/10/2026 | Retenir en priorité [api-and-interface-design](https://github.com/addyosmani/agent-skills/blob/main/skills/api-and-interface-design/SKILL.md), examiné : contrats, validation, erreurs. README annonce une intégration Codex, non testée ici. Les skills de tests/revue/front sont des candidats ultérieurs, non audités individuellement. Ne pas importer de hooks de commit/publication. |

Maintenance : une page de commits indexée peut être en retard ; aucune promesse de maintenance ou sécurité n'en découle. Sources des signaux datés : [API agency-agents](https://api.github.com/repos/msitarzewski/agency-agents), [API agent-skills](https://api.github.com/repos/addyosmani/agent-skills), [historique wshobson](https://github.com/wshobson/agents/commits/main/), [historique quickstarts](https://github.com/anthropics/claude-quickstarts/commits/main/).

Stratégie proposée : commencer avec les rôles locaux chercheur, prospecteur, rédacteur, relecteur et manager ; analyste à la demande. Une seule compétence externe technique et éventuellement une grille branding, après comparaison avec les instructions existantes. Codex garde développement, tests, revue de sécurité et documentation dans un même périmètre maîtrisé. Pour n8n/API, utiliser les documentations officielles plutôt qu'un agent généraliste présenté comme expert. Pas de nouvel agent dédié à chaque technologie.

Avant toute copie : enregistrer URL, SHA, licence/NOTICE, fichiers retenus, modifications, outils nécessaires et exemple de vérification. MIT : préserver les notices ; Apache : vérifier également les notices et modifications requises. Aucune ressource externe n'autorise l'envoi, la dépense, le commit ou le déploiement.

## Contrôles réellement exécutés

| Commande / contrôle | Résultat observé |
|---|---|
| `node livrables/outil-equerre/tests/run-tests.js` | **384 tests réussis**, sortie 0 |
| `node livrables/demo-appel/tests/run-tests.js` | **53 tests réussis**, sortie 0 |
| `python -m unittest discover -s livrables/registre-cli/tests` | **35 tests**, OK, sortie 0 ; API simulée |
| `node prospection/outils/tests/envoi.test.js` | **35/35**, sortie 0 ; tous les services Google simulés |
| `node --check` sur 69 JS suivis | **0 échec** ; Équerre, démo, outils prospection et hook ; hors JSX et ancien orchestrateur |
| `npm.cmd run build` dans `livrables/site-cabinets/next` | **Réussi**, sortie 0 ; export statique, page `/` : 11,1 kB, First Load JS : 160 kB |
| Git avant/après les tests et le build | Aucun fichier suivi modifié |

Total : **507 tests**. Les avertissements cache/HTTP 429/500/503 du test Python sont des scénarios simulés attendus. Mesures ponctuelles Équerre affichées par les tests : charge 2 361 ms ; 10 000 tiers 464 ms ; 20 000 tiers 1 193 ms. Ce ne sont pas des garanties de performance en production.

Effets locaux possibles des contrôles : fixtures fictives ignorées si manquantes, `__pycache__`, fichiers temporaires de tests, `.next/` et `out/`. Aucun fichier source applicatif modifié. Pas de réinstallation propre, navigateur, test Gmail/Sheets réel, appel OpenAI, exécution n8n, validation du site distant ou revue exhaustive des secrets/historique Git.

## Livrables de cette session

Cinq nouveaux documents créés par cet audit : ce rapport, `STRATEGIE_AGENCE_IA.md`, `ARCHITECTURE_FLOW_INBOX.md`, `PLAN_30_JOURS.md`, ainsi que `AGENTS.md` à la racine. Aucun fichier préexistant modifié. Le plan reste à valider avant développement. L'état Git final comporte aussi les deux dossiers non suivis `.agents/` et `.codex/` apparus indépendamment ; ils ne sont ni ajoutés à l'index ni supprimés.
