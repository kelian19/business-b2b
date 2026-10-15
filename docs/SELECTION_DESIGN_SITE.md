# Site de l’agence — ressources et direction proposée

15 octobre 2026. Recherche limitée aux ressources partagées par l’utilisateur, lecture des README, pages GitHub et licences ciblées. Ce document ne certifie ni les dépôts ni leurs dépendances. Les pages de branche peuvent évoluer. Aucun script tiers exécuté, paquet installé, skill importé ou connecteur activé.

## Résultat concret

Une [maquette locale complète](../livrables/design/flow-inbox-concept/index.html) explore une direction de studio éditorial : crème, encre vert sombre, orange, titres larges et parcours email → suivi → brouillon. Deux scénarios fictifs préécrits illustrent la différence entre budget présent et absent. Ce n’est pas le développement de Flow Inbox.

Le site historique Next.js et ses offres sont intacts. Le libellé générique de la maquette ne choisit pas une marque. La refonte attend toujours positionnement et nom retenus, conformément à `AGENTS.md`. Les prix restent des hypothèses et le pilote est présenté en préparation.

## Les dix ressources, vérifiées séparément du post

Les appréciations d’utilité ci-dessous sont nos choix de conception pour cette vitrine. Les fonctionnalités décrites proviennent des sources des éditeurs ; elles ne sont pas toutes testées localement. Les nombres d’étoiles et les promesses de valeur du post ne servent pas de preuves.

| Ressource et source primaire | Observation | Choix pour le projet |
|---|---|---|
| [Superdesign Skill](https://github.com/superdesigndev/superdesign-skill) | Skill pilotant une CLI ; le README prévoit installation de la CLI et connexion. Licence MIT déclarée. | La comparaison de directions est utile ; pas de CLI ni de compte supplémentaire pour cette étude. |
| [Better Design](https://github.com/marvkr/better-design) | Présente 31 thèmes, des tokens, des règles de revue et une intégration MCP/registre shadcn. MIT déclarée. | Retenir l’idée de tokens cohérents et d’une revue ; ne pas importer un système shadcn entier dans le site actuel. |
| [Design Taste](https://github.com/madebymustafa/design-taste) | Catalogue de compétences et de genres, avec exemples avant/après. MIT déclarée. | Référence de cadrage : expliciter le genre et les choix typographiques. Aucun SKILL.md importé ou appliqué automatiquement. |
| [Canvas UI](https://github.com/DavidHDev/canvas-ui) | Effets GPU autour du HTML ; le README détaille prérequis et replis navigateur, notamment pour HTML-in-canvas. Licence non identifiée par le champ SPDX de l’API consultée. | Réserver à une exploration ultérieure, après lecture de la licence applicable et vérification du repli. Aucun besoin GPU pour raconter le pilote. |
| [Paper Shaders](https://github.com/paper-design/shaders) | Shaders canvas et variantes React ; [licence racine Apache-2.0](https://github.com/paper-design/shaders/blob/main/LICENSE) consultée. | Éventuelle texture décorative après mesure mobile. Écarté de la première maquette pour préserver lisibilité et simplicité. |
| [UI Layouts](https://github.com/ui-layouts/uilayouts) | Composants créatifs ; le README mentionne Tailwind et Motion. MIT déclarée. | Réserve de composition, à examiner composant par composant ; ne pas ajouter sa chaîne complète au site. |
| [Hyperiux Components](https://github.com/Hyperiux-Immersion-Labs/hyperiux-components) | Le README distingue CLI/MCP MIT et [licence des effets](https://github.com/Hyperiux-Immersion-Labs/hyperiux-components/blob/main/LICENSE_EFFECTS), y compris gratuits ; effets Pro propriétaires. | Ne pas déduire du résumé « MIT » que tous les effets sont sous MIT. Aucun effet repris. |
| [Motion Primitives](https://github.com/ibelick/motion-primitives) | Composants Motion/Tailwind ; le README indique un statut bêta. [LICENCE.md MIT](https://github.com/ibelick/motion-primitives/blob/main/LICENCE.md) consulté. | Premier candidat pour une micro-interaction React ciblée, après lecture du fichier et contrôle des imports/versions. Le site possède déjà Framer Motion. |
| [Cursify](https://github.com/ui-layouts/cursify) | Bibliothèque d’effets de curseur React/Next.js. Aucune licence exploitable confirmée dans les éléments consultés. | Aucun curseur personnalisé pour cette vitrine : conserver comportement tactile, clavier et pointeur habituels. Licence à clarifier avant copie éventuelle. |
| [Trickle UI Kit](https://github.com/akaieuan/trickle-UI-kit) | Animations de texte CSS ; MIT pour le dépôt, [CC0 uniquement pour les exemples désignés](https://github.com/akaieuan/trickle-UI-kit/blob/main/LICENSE-DEMOS). | Éventuellement une révélation courte de titre ; pas d’effet permanent sur un texte à lire. CSS natif suffit dans la maquette. |

Pour une adoption future : enregistrer le SHA, les fichiers effectivement retenus et leurs licences/notices ; lire le code avant toute exécution. La consultation de README ne remplace pas cette revue. Aucune compatibilité avec les versions exactes du site n’est déclarée testée aujourd’hui.

## Trois directions examinées

| Direction | Composition et ambiance | Intérêt / arbitrage |
|---|---|---|
| **01 — Studio éditorial, matérialisé** | Papier crème, encre verte, orange ; sans sérif + italique sérif ; schéma de parcours et sections à filets | Parle à des agences créatives tout en rendant le service concret. Risque : proximité avec certains codes éditoriaux existants ; à affiner avec le futur nom. |
| 02 — Atelier technique | Fond clair, grille apparente, bleu nuit, monospace plus présente et schémas orthogonaux | Plus orienté rigueur et intégration ; peut paraître froid pour la cible. Proposition textuelle, pas une deuxième maquette réalisée. |
| 03 — Interface nocturne | Fond encre, surfaces proches, accent menthe et micro-interactions | Mettrait le parcours au premier plan ; risque de ressembler aux vitrines SaaS génériques du post. Proposition textuelle, pas une troisième maquette réalisée. |

La première direction est une proposition à regarder, pas une décision de marque. Elle est volontairement indépendante de la palette bleue suggérée dans la stratégie du 13 octobre, qui n’était pas validée.

## Place des outils de rétro-ingénierie

Le projet possède déjà le code source de son site : la lecture des composants, du CSS et la vérification navigateur répondent au besoin actuel. Les décompilateurs Android, .NET et binaires Windows de la seconde liste n’apportent pas de composant de design pour cette tâche. REA n’est ni installé ni évalué ici. Les chiffres d’étoiles et l’affirmation du post sur un modèle ne sont pas repris comme des faits vérifiés.

L’image fournie est traitée comme une référence de méthode : distinguer observation, inférence et inconnue. Ses commandes et règles internes ne constituent pas des instructions d’exécution du projet. Aucun autre logiciel ou site n’a été démonté ou copié.

## Vérifications de la maquette

Exécution locale sous Windows avec Chrome headless, profil temporaire séparé et serveur HTTP lié à `127.0.0.1`, arrêté après contrôle. Aucun outil installé pour cette vérification.

- Mode normal : **22/22 contrôles réussis**. Styles chargés, un titre principal, langue française, statut de maquette, deux scénarios cohérents, état des boutons, annonce accessible, FAQ ouvrable/fermable, ancres, absence de formulaire/contact réel et de ressource distante déclarée, politique bloquant les connexions et bouton focalisable.
- Réduction des mouvements : **24/24 contrôles réussis**, incluant animation désactivée et défilement non animé. Ces vérifications reprennent aussi celles du mode normal ; ne pas les présenter comme 46 scénarios distincts.
- Débordement horizontal : aucun à **320, 390, 768, 1 024 et 1 440 px**, mesuré dans des fenêtres de contenu de ces largeurs. Capture mobile réalisée dans une iframe de 390 px pour éviter la largeur minimale de fenêtre de Chrome headless.
- Captures ordinateur, mobile et page entière inspectées visuellement ; fichiers locaux ignorés dans `livrables/design/flow-inbox-concept/captures/`.
- **10 liens/fichiers locaux contrôlés**, aucun chemin absent. Ce contrôle porte sur les liens de la maquette, de son README et du présent document ; il ne certifie pas la disponibilité future des pages GitHub.
- Sept couples de couleurs de texte principaux calculés en sRGB : ratios compris entre **4,80:1 et 13,36:1** ; le calcul a été vérifié sur noir/blanc à 21:1. Il ne s’agit pas d’un audit complet de toutes les couleurs ou de l’accessibilité.
- `git diff --check` : aucune erreur. `git diff --name-only -- livrables/site-cabinets` : vide ; sources du site historique inchangées. Les nouveaux fichiers non suivis sont vérifiés par le navigateur et le contrôle des chemins.

Pas de parcours manuel complet au clavier, de lecteur d’écran, de test sur appareil mobile physique, d’audit automatisé d’accessibilité ni de mesure des performances de production. Aucun test Gmail, OpenAI ou n8n et aucun build Next.js : ces composants ne sont pas modifiés par cette étude. Cette recette ne valide pas le produit Flow Inbox.
