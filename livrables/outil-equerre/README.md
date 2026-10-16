# flow : préparation e-facture et reporting (outil Équerre)

## Adaptation visuelle du 16 octobre 2026

### Direction retenue après le retour utilisateur

La passe éditoriale décrite ci-dessous a été rejetée par l'utilisateur comme trop générique. Elle est remplacée par une interface de gestion : fond neutre, surfaces blanches, en-tête compact, navigation latérale sur ordinateur, action « Nouveau dossier », suppression du grand slogan et des italiques décoratifs. `styles/flow.css` contient cette nouvelle présentation. Le parcours et les calculs existants sont réutilisés. Les références et critères de revue du designer sont consignés dans [les règles de design produit](../design/REGLES_DESIGN_PRODUITS.md).

Validation de cette passe : **384 tests réussis** ; neuf routes × six tailles contrôlées, sans débordement de page ; navigation clavier verticale/horizontale, aide, création de dossier, mode présentation et média print vérifiés. Les couleurs neutres autorisées ont été ajoutées au contrôle de palette. Le détail et les limites figurent dans le guide ci-dessus. La nouvelle navigation reste visible sur les écrans de gestion ; haut/bas complète gauche/droite lorsque les onglets sont verticaux.

### Modernisation de l'interface client

Une seconde passe, demandée par l'utilisateur pour rapprocher e-facture de la présentation flow, ajoute `styles/flow.css` : en-tête clair avec nom du produit visible, introduction éditoriale, typographie sans sérif et accent italique, navigation à cartes, champs et tableaux allégés, indicateurs plus aérés. La navigation mobile défile horizontalement avec les libellés visibles. Les identifiants de composants et les interactions métier sont conservés.

Cette couche s'applique à l'écran. L'introduction est masquée en mode présentation et à l'impression ; le gabarit A4 et les calculs ne changent pas. Aucun prix, engagement commercial ou fait réglementaire n'a été ajouté ou revalidé par cette passe.

Contrôles de cette seconde passe : **384 tests réussis** avec `node livrables/outil-equerre/tests/run-tests.js`. Playwright sur serveur local : neuf routes (cinq étapes, dossier, mise à niveau, cabinet, aide) à six largeurs (320, 390, 768, 1 024, 1 440 et 1 920 px), soit **54 combinaisons sans débordement de page**, avec un seul titre principal et aucune exception JavaScript relevée. Navigation des onglets au clavier, mode présentation, réduction des mouvements et média d'impression vérifiés. Captures du tableau de bord inspectées à 390 et 1 440 px. Pas d'impression physique ni d'export PDF exécutés. Serveur de recette arrêté après vérification.

### Première adaptation de la palette et de la signature

À la demande de l'utilisateur, l'outil reprend l'identité de travail « flow » de `livrables/design/flow-inbox-concept/` : crème, vert sombre, orange, signature en minuscules et pictogramme. Cette adaptation concerne l'en-tête, les titres du navigateur, la palette des écrans et les rapports imprimables. Elle ne constitue pas une vérification de disponibilité du nom.

Les fonctions de facturation électronique, les calculs, les imports et les données sont conservés. Le dossier technique `outil-equerre`, l'espace de noms JavaScript et le format `.equerre.json` gardent leurs noms pour préserver la compatibilité. Les messages qui désignent ce format historique peuvent encore mentionner Équerre. Aucun paquet ajouté, aucune connexion externe, aucun déploiement.

Validation : `node livrables/outil-equerre/tests/run-tests.js` — **384 tests réussis**, dont les contrastes et les contrôles du format des dossiers. Les attentes de palette et de signature des rapports ont été actualisées. Recette Playwright sur serveur local : cinq étapes × cinq largeurs (320, 390, 768, 1 024 et 1 440 px), aucun débordement horizontal de page ; titres et marque corrects, couverture et pied de rapport actualisés, aucune erreur JavaScript relevée. Aperçu écran du rapport inspecté ; impression physique et export PDF non exécutés. `git diff --check` réussi.

Application web 100 % locale. Elle s'ouvre par double-clic sur `index.html` : aucun serveur, aucune requête réseau, polices système, hors ligne. Rien n'est envoyé : tout reste dans le navigateur. L'outil ne contient aucune tarification : le prix n'est pas affiché dans l'outil.

Elle a été copiée de `livrables/demo-appel/` (qui n'est jamais modifiée). Pour la procédure à suivre avec un client, voir `GUIDE-LIVRAISON.md` ; pour la présentation en visio, voir `script-demo.md`.

## Deux modes, jamais mélangés

- **Démo** : données fictives (bandeau orange « Données fictives de démonstration »). C'est le mode d'ouverture. Les zones d'import y sont remplacées par un renvoi vers la création d'un dossier client.
- **Dossier client** : données réelles importées (bandeau « Dossier client : données confidentielles, traitées uniquement dans ce navigateur »).

## Le parcours en 5 étapes

| Étape | Adresse | Contenu |
|---|---|---|
| 1. Tableau de bord | `#tableau-de-bord` (ouverture par défaut) | Indice de préparation expliqué, compte à rebours, part du CA à risque, frise des jalons, questions d'organisation, exposition théorique, clients classés par impact, plan d'action éditable, trésorerie et alertes |
| 2. Fichier tiers | `#tiers` | Qualité du fichier, anomalies, recherche et tri, correction proposée ligne par ligne, exports (fichier fiabilisé, journal, anomalies) |
| 3. Mentions | `#mentions` | Facture annotée avec les 4 nouvelles mentions, 1 à 5 modèles contrôlés, contrôle automatique de l'export des lignes de factures |
| 4. Trésorerie et reporting | `#reporting` | Six indicateurs, graphique mensuel, encours par ancienneté, cinq premiers clients, filtres, comparaison avec la période précédente, export CSV |
| 5. Rapport | `#rapport` | Rapport de livraison A4 : couverture, synthèse de direction, plan d'action, annexes |

Écrans hors parcours, depuis l'en-tête : **Dossier** (`#accueil`), **Mise à niveau** (`#mise-a-niveau`), **Cabinet** (`#cabinet`), **Aide** (`?`, et `#aide` pour le glossaire).

## Raccourcis clavier

| Touche | Action |
|---|---|
| `1` à `5` | Aller à l'étape correspondante |
| `←` `→` | Étape précédente ou suivante (le focus est sur la page ou sur les étapes) |
| `F` | Mode présentation (plein écran) |
| `P` | Ouvrir le rapport ; `Entrée` lance ensuite l'impression |
| `?` | Afficher l'aide |
| `Échap` | Fermer l'aide, un panneau ou une info-bulle ; quitter le mode présentation |

Les raccourcis ne s'activent jamais pendant la saisie dans un champ, ni avec `Ctrl`, `Alt` ou `Méta`. La case « Activer les raccourcis clavier » (dans l'aide) les désactive.

## Mode présentation (partage d'écran)

`F` ou le bouton « Mode présentation » : plein écran si le navigateur l'accepte (sinon simple changement d'affichage), police agrandie de 12 %, chiffres des cartes agrandis, masquage des introductions, des aides, des barres d'outils d'import et du pied de page. Le bandeau rouge, la navigation et les chiffres restent. Une pastille « Mode présentation — Échap pour quitter » s'efface après 4 secondes. En mode dossier client, l'outil rappelle : « Évitez de charger un fichier réel pendant un partage d'écran. » `Échap` quitte le mode.

## Aide

- Boutons **?** à côté de l'indice, de l'exposition, du plan, de l'import et des corrections : panneaux non modaux (`Échap` les ferme).
- **Visite guidée** de 4 étapes, que l'on peut passer (bouton sur l'écran Dossier, dans l'Aide et dans le dialogue d'aide).
- **Glossaire** (`#aide`) : SIREN, SIRET, TVA intracommunautaire, plateforme agréée, mentions obligatoires, indice, exposition, part du CA à risque. Il ne contient que les faits retenus.

## Importer des fichiers CSV

Quatre types de fichiers, dans un dossier client : fichier tiers (étape 2), vérification au registre (étape 2, facultatif), lignes de factures (étape 3, facultatif), export des factures de vente (étape 4). Pour chacun : déposer ou choisir le fichier, vérifier l'aperçu, contrôler la reconnaissance des colonnes (synonymes reconnus, choix manuel possible), lire le rapport d'import (lignes ignorées avec leur numéro dans le fichier et la raison), confirmer.

Modèles CSV à télécharger depuis chaque zone d'import : `modele-fichier-tiers.csv`, `modele-export-factures.csv`, `modele-lignes-de-factures.csv`, `modele-verification-registre.csv`.

Formats lus : séparateur `;`, `,` ou tabulation ; UTF-8 avec ou sans BOM, UTF-16, Windows-1252 ; champs entre guillemets avec séparateurs et retours à la ligne ; 25 Mo au plus par fichier.

Messages d'erreur (un par cas) : fichier vide ; en-têtes sans aucune ligne ; séparateur non reconnu ; colonnes obligatoires manquantes (avec la liste des colonnes trouvées) ; accents mal encodés ; fichier qui n'est pas un CSV texte (`.xlsx`, `.xls`, `.pdf`, `.zip` : « Enregistrer sous > CSV ») ; fichier trop volumineux ; dates enregistrées comme des nombres par un tableur. Un seul fichier est lu à la fois.

## Dossiers, `.json` et versions

- « Dossier » : créer un dossier (raison sociale, secteur, taille, logo local facultatif ré-encodé en PNG), ouvrir la démonstration, enregistrer, rouvrir.
- Un dossier enregistré est un fichier `<nom>.equerre.json`. Avant chaque téléchargement, l'outil affiche : « Ce fichier contient des données de votre client : conservez-le dans un espace protégé et supprimez-le quand il n'est plus utile. » À l'ouverture, le fichier est validé strictement (structure, tailles, version de schéma, somme d'intégrité) ; 60 Mo au plus. Un fichier plus récent que l'outil est refusé avec un message.
- **Versions nommées** (20 au plus) : une version conserve un résumé (indice, anomalies, avancement), pas les fichiers importés ; elle ne permet pas de restaurer les données.
- **Mise à niveau** : comparaison de deux versions (ou d'un second `.json`) : indice, anomalies résolues et nouvelles, actions passées à « fait ». Aucune promesse de résultat.
- « Effacer toutes les données de cette session » vide le dossier et le portefeuille de la mémoire de l'outil. Les fichiers déjà téléchargés restent sur le disque : à supprimer par vos soins.

## Mode cabinet (`#cabinet`)

Pour suivre plusieurs clients : charger plusieurs `.equerre.json` (sélection multiple ou glisser-déposer ; 30 dossiers et 150 Mo au plus). Chaque fichier est validé ; un fichier invalide est signalé par un message à son nom sans bloquer les autres. Le tableau affiche, pour chaque dossier : secteur, indice (estimation), part du CA à risque, actions ouvertes, anomalies bloquantes, date de situation. Tri par colonne, filtre, export CSV (avec neutralisation des formules : une cellule commençant par `=`, `+`, `-` ou `@` est préfixée d'une apostrophe), ouverture d'un dossier, retrait d'un dossier. Le portefeuille n'existe qu'en mémoire : il n'est jamais enregistré. Un avertissement permanent rappelle que plusieurs clients sont chargés.

## Rapport et PDF (étape 5)

Aperçu en feuilles A4 : page 1 couverture (marque, titre « Rapport de préparation à la facture électronique », logo et nom du client, date de situation, version du dossier, cadre « Données fictives de démonstration » ou mention de confidentialité), page 2 synthèse de direction sur une page, page 3 plan d'action, puis annexes : A corrections et anomalies du fichier tiers (200 lignes les plus impactantes au plus, avec renvoi au fichier fiabilisé), B modèles de factures, C organisation, D trésorerie. Le pied de page répété indique le mode (« Données fictives de démonstration · Équerre · ne constitue pas un conseil fiscal » ou « Dossier client : données confidentielles · Équerre · ne constitue pas un conseil fiscal »), la version du dossier et le numéro de page.

Le nom d'entreprise se modifie dans le rapport ou dans l'en-tête (80 caractères, « Votre entreprise » s'il est vide). Bouton « Imprimer / enregistrer en PDF » : choisir « Enregistrer au format PDF » et activer « Graphiques d'arrière-plan » pour conserver les couleurs. L'impression ne contient que le rapport, quelle que soit l'étape affichée.

## Confidentialité

- Aucune requête réseau : les fichiers sont lus dans le navigateur ; une politique de sécurité de contenu (`connect-src 'none'`) bloque toute tentative.
- Aucune donnée de dossier n'est écrite dans le stockage du navigateur. Seules deux préférences d'affichage (raccourcis activés, visite vue) peuvent l'être, avec repli en mémoire : l'outil fonctionne sans.
- Toute saisie ou donnée de fichier est affichée comme du texte, jamais interprétée comme du HTML.
- La vérification au registre n'existe pas dans l'outil web : elle se fait avec l'outil en ligne de commande `livrables/registre-cli/verif_registre.py`, qui n'envoie que des SIREN, au plus 5 requêtes par seconde.

## Limites à connaître

- **L'indice de préparation est une estimation** ; sa **pondération (40 %, 30 %, 30 %) est une hypothèse**, pas une norme.
- **Les efforts du plan d'action sont des estimations** à confirmer sur le fichier réel.
- L'exposition théorique est un plafond calculé (nombre de factures × 50 €, au plus 15 000 € par année civile), pas une prévision ; elle ne constitue pas un conseil fiscal.
- Un SIREN « valide » a 9 chiffres et une clé de contrôle correcte ; cela ne prouve pas l'existence de l'entreprise. **Il n'y a pas de vérification au registre dans l'outil web.**
- Aucune obligation, date ou sanction n'est affichée en dehors des faits retenus : réception obligatoire depuis le 1er septembre 2026 ; émission pour les PME, TPE et micro-entreprises le 1er septembre 2027 ; 4 nouvelles mentions depuis le 1er septembre 2026 ; amende de 50 € par facture non émise sous forme électronique quand c'est obligatoire, plafonnée à 15 000 € par année civile (article 1737 du CGI).
- L'outil ne promet aucun gain et aucune conformité.
- Conçu pour 10 000 tiers et 50 000 lignes de factures (tableaux paginés par 100 lignes, annexe A plafonnée).

## Fichiers

- `index.html` ; `styles/` : `tokens.css`, `base.css`, `components.css`, `views.css`, `modules.css`, `dashboard.css`, `report.css`, `cabinet.css`, `aide.css`, `presentation.css`, `print.css`.
- `js/core/` : logique pure (format UMD, testée sous Node) : `constants.js`, `util.js`, `identifiers.js`, `csv.js`, `import-kinds.js`, `tiers.js`, `corrections.js`, `invoices.js`, `mentions.js`, `reporting.js`, `readiness.js`, `dossier.js`, `versions.js`, `portfolio.js` (mode cabinet), `rapport.js` (rapport), `logic.js` (façade `EquerreLogic`).
- `js/data.js` : données fictives. `js/ui/` : interface sans règle métier (dont `aide.js`). `js/views/` : un fichier par écran (`view-report.js`, `view-cabinet.js`, `view-help.js`...). `js/app.js` : coque, routeur par hash, clavier, mode présentation.
- `tests/` : `node livrables/outil-equerre/tests/run-tests.js` (code de sortie 0 si tout passe). `tests/make-fixtures.js` génère les fichiers d'essai (CSV, dossiers `cabinet-*.equerre.json` ; `--gros` pour 10 000 tiers et 50 000 lignes, non versionnés).
- `GUIDE-LIVRAISON.md` : procédure de livraison pour un client. `script-demo.md` : déroulé de la démonstration en visio.
- Outil facultatif en ligne de commande (Python, bibliothèque standard) : `livrables/registre-cli/verif_registre.py`, tests : `python -m unittest discover -s livrables/registre-cli/tests`.

## Contrôle visuel

Le navigateur de contrôle lit l'application servie en local (`python -m http.server 8772 --bind 127.0.0.1 --directory livrables/outil-equerre`). L'ouverture par double-clic (`file://`) est vérifiée par contrôle statique (aucun module, chemins relatifs, aucun appel réseau) ; la vérification manuelle par double-clic reste à faire par le consultant.
