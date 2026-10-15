# Que peut-on « reverse » pour le projet ?

Discussion du 15 octobre 2026, demandée par l’utilisateur. Contributions : agent parcours/site/offre, agent technique et agent contradicteur produit. Recommandations de préparation, sans autorisation de développer Flow Inbox, de connecter un compte ou de refondre le site.

Suite à la demande « Ok, on continue le projet » : l’étude documentaire Gmail et la comparaison de la description du template n8n sont réalisées dans le [contrat Gmail et sa recette proposée](CONTRAT_GMAIL_FLOW_INBOX.md). Après clarification du coût et nouvelle demande de poursuivre, la [première démo locale](../livrables/automatisations/flow-inbox/README.md) est livrée avec fournisseurs/extractions simulés. Les autres études de cette liste ne sont pas présumées réalisées.

Ici, « reverse » signifie partir d’un comportement observable pour décrire ses entrées, ses étapes, ses états, ses sorties et ses exceptions. Pour le site, cela peut être une analyse de composition ; pour Flow Inbox, une reconstitution de parcours et de contrats techniques. Une documentation publique décrit un fonctionnement annoncé : elle ne prouve pas à elle seule le fonctionnement du service.

## Liste retenue

| Ordre proposé | Ce qu’on peut examiner | Ce qu’on cherche à comprendre | Livrable utile au projet |
|---|---|---|---|
| D’abord, dès qu’une agence accepte | Le traitement d’une demande commerciale récente dans cette agence | Qui reçoit, recopie, complète, répond et vérifie la suite ; où se situe réellement la difficulté | Carte du processus actuel, friction constatée et alternative simple à examiner |
| Préparable maintenant | Le parcours documenté de [Front Compose](https://help.front.com/en/articles/2003) | Quel contexte est utilisé, quelle action reste à la personne, comment une réponse est corrigée | Schéma annoté « entrée → contexte → brouillon → correction → validation », adapté au périmètre proposé |
| Première étude technique possible | Le contrat des [brouillons](https://developers.google.com/workspace/gmail/api/guides/drafts) et des [fils Gmail](https://developers.google.com/workspace/gmail/api/guides/threads) | Distinguer message, conversation, brouillon, suppression et réponse effectivement envoyée | Tableau des états et critères d’acceptation pour une future recette autorisée |
| Après ce contrat | Un seul [template public n8n, exemple 15953](https://n8n.io/workflows/15953-triage-gmail-emails-draft-ai-replies-and-log-to-google-sheets-with-gpt-4o/) | Séparer collecte, traitement, suivi, brouillon et erreurs ; identifier ce qu’un exemple ne règle pas | Carte des étapes et écarts à notre [architecture proposée](ARCHITECTURE_FLOW_INBOX.md), sans import |
| À intégrer à cette étude | Les reprises après erreur et effets incertains | Que faire si un brouillon a pu être créé sans que son ID soit enregistré ? La [documentation n8n](https://docs.n8n.io/build/flow-logic/handle-errors-gracefully.md) aide à décrire les erreurs, sans garantir l’unicité | Matrice des points de panne et action prévue : relire, réconcilier, arrêter ou faire revoir |
| Préparable maintenant | Nos applications et tests historiques | Réutiliser uniquement les conventions de démo, les règles déterministes et les contrôles correspondant au besoin | Petite carte « composant existant → réutilisation possible → adaptation nécessaire » ; pas de framework commun prématuré |
| Ensuite | La présentation d’offre de [Lindy](https://www.lindy.ai/pricing) et les ressources de prise en main de [Missive](https://missiveapp.com/docs) | Rendre inclus, limites, usage, prérequis, contrôle et arrêt faciles à comprendre | Questions à combler dans notre [fiche pilote](../livrables/offre/flow-inbox-pilote.md), sans reprendre les prix concurrents comme validation |
| Après clarification de l’offre | La structure de la [vitrine Lindy](https://www.lindy.ai/) et notre [maquette](../livrables/design/flow-inbox-concept/index.html) | Comment montrer un travail concret, ses limites et la prochaine action ; quels effets servent la lecture | Grille de critique de la maquette et ajustements proposés ; refonte après choix du positionnement et du nom |

La première ligne est la plus utile pour décider quoi vendre ; elle dépend d’un échange futur, pas d’un accès supposé à une boîte. Le [guide de découverte](GUIDE_DECOUVERTE_FLOW_INBOX.md) permet de commencer par le récit d’un cas, sans collecter d’emails réels. Une observation du processus nécessiterait ensuite l’accord de l’agence.

## Ce que la discussion a changé

L’agent parcours/site proposait d’abord de décortiquer la démonstration et l’offre, puis l’onboarding et la vitrine. Le contradicteur a objecté qu’un joli parcours et des prix publics ne démontrent pas un problème client. Après échange direct, ils placent tous deux la demande récente d’une agence avant les références publiques.

Ils conservent un benchmark documentaire court comme travail possible aujourd’hui : Front pour le brouillon, Lindy pour l’explication de l’offre, Missive pour la prise en main. Chaque idée doit être classée « à reprendre », « à adapter » ou « hors pilote ». L’objectif est de résoudre une inconnue précise, pas d’ajouter des fonctions.

Une question utile ressort de cet échange : **quel contexte faut-il autoriser pour préparer une réponse ?** Message courant, fil concerné, catalogue validé ou historique élargi ne demandent pas le même cadrage. Notre architecture proposée part du texte normalisé du message ; l’étude d’un autre produit ne décide pas d’élargir ce périmètre. La découverte et la recette devront déterminer ce qui est nécessaire.

L’agent technique partage la priorité au processus réel, mais déplace le premier travail technique : **contrat Gmail avant modèle n8n**. La question est de relier le brouillon à la bonne demande, préserver les retouches humaines et constater une réponse réelle. Il demande aussi de préciser ce que l’agence appelle « demande traitée » : réponse envoyée, réassignation ou devis ne sont pas le même événement.

Observation documentaire concrète : Google distingue l’identifiant stable du brouillon de celui de son message, qui change lors d’une modification. L’envoi supprime le brouillon et crée un nouveau message marqué `SENT`. **La disparition d’un brouillon ne prouve donc pas son envoi.** Ce sont des faits documentés, pas des comportements testés dans notre environnement.

Le template n8n retenu décrit un parcours classification → brouillon → journal Sheets. Notre architecture proposée exige un suivi durable avant création du brouillon. Cette différence est précisément un point à examiner ; elle interdit de considérer le template comme un workflow Flow Inbox déjà adapté. L’idempotence, le budget et les reprises restent à vérifier séparément.

## Une première étude concrète

Deux livrables courts suffisent pour la première étude : une fiche d’observation de Front Compose, consultable sans compte, et une page du contrat Gmail. Pour Front, relever action de la personne, contexte annoncé, résultat annoncé, contrôle/correction, cas non couverts et question soulevée pour Flow Inbox. Pour Gmail, décrire création, retouche, suppression, envoi humain, rejeu et reprise incertaine. Ce travail documentaire est distinct d’un test des produits.

Les critères proposés pour une future recette : bonne demande et bon fil, conservation des retouches, suppression non comptée comme réponse, réponse sortante effectivement vérifiée et aucune recréation aveugle en cas de résultat incertain. Les opérations sur un bac à sable seraient une étape distincte à autoriser ; aucun brouillon n’est créé ou envoyé pendant cette discussion.

Ne pas reconstruire une nouvelle maquette à cette occasion : la maquette actuelle suffit pour annoter le parcours. Les exemples de notre site sont préécrits ; ils ne prouvent ni extraction IA ni création Gmail. Le résultat attendu de cette première étude est une décision de cadrage plus claire, pas une nouvelle bibliothèque de composants.

## Outils à choisir selon la question

Pour ces cibles, lecture de documentation, lecture des sources publiques pertinentes et observation de notre propre site dans le navigateur constituent le point de départ. Aucun besoin de REA n’a été établi dans cette discussion ; le dépôt et la maquette sont déjà accessibles en source.

Les décompilateurs Android, .NET et binaires de la liste partagée ne correspondent pas aux premières inconnues de cette vitrine et de ce workflow. Aucun de ces outils n’est installé ou exécuté. Les bibliothèques de design déjà comparées restent des références dans la [sélection de design](SELECTION_DESIGN_SITE.md).

## État et limites

Sources publiques de parcours/offre et documents officiels Gmail/n8n consultés par les agents dédiés ; documents locaux examinés. Aucune inscription, aucun formulaire envoyé, aucun compte connecté, aucune donnée client parcourue et aucun test réel d’un service concurrent. Pas de preuve de qualité des brouillons, de gains, de conversion ou de rentabilité déduite des pages.

La discussion ne valide ni architecture A/B, ni nom, ni prix, ni développement. Elle propose l’ordre des études. Seul ce document de synthèse est ajouté à cette reprise ; les agents n’ont pas modifié de fichier. Contrôles de fin : lecture de cohérence, liens locaux et `git diff --check` ; aucun test applicatif nécessaire pour ce texte.
