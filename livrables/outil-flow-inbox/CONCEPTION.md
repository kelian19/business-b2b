# Flow Inbox : démonstration client, conception

Application web locale (double-clic sur `index.html`, aucun serveur, aucun réseau, polices système), sur le modèle de `livrables/outil-equerre/` : scripts classiques, `js/core` (logique UMD sans DOM, testée par Node), `js/ui`, `js/views`, `styles/`, `tests/run-tests.js` sans dépendance.

Toutes les données sont fictives et marquées comme telles (bandeau permanent « Données fictives de démonstration »). Rien n'est jamais envoyé : l'outil prépare des brouillons, une personne les relit et décide. Dans le pilote proposé, la boîte serait une boîte Gmail et le suivi un Google Sheets dédié ; la démonstration est une simulation locale, sans connexion, et le dit à l'écran.

## 1. L'agence fictive

**Agence Exemple Fictive**, agence de communication et de web, 7 personnes, en région (Rennes). Boîte de réception commune : `contact@agence-exemple-fictive.example`. Les 5 personnes qui traitent les demandes utilisent l'outil :

| Id | Nom | Rôle | Traite surtout |
|---|---|---|---|
| camille | Camille Vautrin | Directrice et fondatrice | Gros budgets, appels, appels d'offres, décisions |
| mathis | Mathis Bellanger | Chargé de clientèle | Premier contact, relances (responsable par défaut) |
| ines | Inès Delmas | Cheffe de projet web | Sites, ajouts sur les sites clients |
| sofiane | Sofiane Arnoult | Directeur artistique et vidéo | Identité visuelle, vidéo, stands |
| laure | Laure Pichon | Rédactrice et community manager | Rédaction, newsletters, réseaux sociaux |

**Ton** : vouvoiement, phrases courtes, chaleureux et précis, aucune promesse de résultat ni de délai non confirmé. **Signature** (modèle) : `Cordialement, {prénom} {nom}, {rôle}, Agence Exemple Fictive, 01 23 45 67 89, contact@agence-exemple-fictive.example`. **Délai de relance par défaut : 2 jours ouvrés** (lundi à vendredi, sans jour férié sur la période), modifiable dans les paramètres.

### Catalogue de services (9, sans tarif : l'outil n'invente aucun prix)

| Id | Service | Exemples |
|---|---|---|
| web | Création et refonte de site web | vitrine, boutique en ligne, pages à ajouter |
| seo | Référencement naturel | audit, fiches produits, suivi mensuel |
| social | Réseaux sociaux et campagnes | calendrier, visuels, campagne ponctuelle |
| identite | Identité visuelle | logo, charte, étiquettes |
| newsletter | Newsletters et e-mailing | modèle, rédaction, envois |
| video | Vidéo | film de présentation, vidéo courte |
| evenementiel | Salons et événements | supports de stand, roll-up |
| redaction | Rédaction et contenus | articles, brochure, textes de site |
| conseil | Accompagnement ponctuel | atelier, séance de conseil |

Valeur spéciale `hors_catalogue` : impression, informatique, traduction. Chaque service porte 3 questions types, utilisées par le brouillon quand une information manque.

## 2. Règles de relevé (identiques à celles du pilote)

- Six champs par e-mail : besoin, service, budget, délai, entreprise, contact.
- Chaque champ a un statut : **relevé** (le texte le dit), **absent** (le texte ne le dit pas : valeur et passage restent vides, rien n'est déduit), **à vérifier** (le texte est ambigu ou contredit un message précédent).
- Chaque champ relevé ou à vérifier cite le **passage exact** du corps, surligné dans la fiche.
- Un champ à vérifier, ou un cas particulier (transfert, doublon, hors périmètre, pièce jointe, urgence, appel demandé, agence en copie, message en plusieurs langues), donne une **raison de mise en revue** affichée en clair.
- Budgets : exact, fourchette, « à partir de », plafond, approximatif, incertain ; l'outil conserve le type et n'arrondit rien. Délais : date précise ou vague ; un délai vague ne reçoit jamais de date inventée.
- Un message est « sans réponse » si une réponse de l'agence est attendue (nouvelle demande, client existant, relance, hors périmètre), si aucune réponse n'a été envoyée, et si le nombre de jours ouvrés écoulés depuis la réception dépasse le délai convenu. Un brouillon préparé mais non envoyé ne compte pas comme une réponse.

## 3. Jeu de données et scénario sur 4 semaines

Période : lundi 28 septembre au vendredi 23 octobre 2026. **Date de référence fixe : vendredi 23 octobre 2026, 17 h 30** (la démonstration ne dépend jamais de l'horloge de l'ordinateur). Fichier : `js/data.js` (objet `FlowData`).

**47 e-mails, 43 fils** : 34 nouvelles demandes (dont 4 réponses ou suites dans un fil, 2 transferts, 1 double envoi, 1 message où l'agence est en copie, 1 demande d'appel urgent), 3 clients existants, 1 relance de prospect, 3 hors périmètre (informatique, impression, traduction), 2 fournisseurs, 1 candidature, 1 démarchage, 2 indésirables. Tons variés : formel, pressé, très court, long et confus, fautes de frappe, français mêlé d'anglais. Budgets explicites, fourchettes, « à partir de », plafonds, approximatifs, absents ou ambigus ; délais précis, vagues ou absents. Deux messages reçus un week-end.

**Situation au 23 octobre** (calculée à partir des données, non écrite à la main) :

- 9 demandes (10 messages) à traiter, 2 brouillons prêts non envoyés, 1 en revue ; 8 répondues ; 7 en attente du prospect ; 10 propositions envoyées ; 1 gagnée, 1 perdue.
- **6 demandes (fils) sans réponse au-delà de 2 jours ouvrés** (7 messages) : rédaction pour un hôtel (reçue le 7 octobre, relancée par le prospect le 14, toujours sans réponse), référencement d'un cabinet dentaire (brouillon prêt jamais envoyé), impression de flyers, brochure de formation, refonte + référencement + articles pour un cabinet (en revue, 15 000 € annuel), vidéo d'atelier (brouillon prêt). Plus 6 demandes récentes encore dans le délai (« à surveiller »).
- Première réponse en général sous un jour ouvré ; aucun délai de première réponse supérieur à 2 jours ouvrés dans l'historique.

### Ce que le dirigeant voit en 30 secondes

Écran d'ouverture : le **tableau de bord**. Bandeau « fictif », puis quatre repères lisibles de loin : demandes reçues sur 4 semaines, demandes à traiter, **demandes sans réponse au-delà de 2 jours ouvrés (6, en rouge, avec leur ancienneté)**, demandes avec informations manquantes. Un clic sur le chiffre rouge ouvre la liste des relances. Message d'une ligne : « Rien n'a été envoyé automatiquement. »

### Ce qu'il voit en 5 minutes (parcours conseillé en visio)

1. **Boîte de réception (30 s)** : les 47 messages, catégories colorées et lisibles sans la couleur seule (texte), ancienneté, raisons de revue.
2. **Fiche d'une demande type (1 min 30)** : la boulangerie (m01) puis la brasserie pressée (m03) : le texte avec passages surlignés, les six champs relevés à côté, chacun relié à son passage au survol et au clavier. Montrer un champ « absent » (m02, budget) : « l'outil ne devine pas ».
3. **Cas ambigu (45 s)** : association au message confus (m04) : trois raisons de revue, champs « à vérifier », la personne tranche.
4. **Brouillon (1 min)** : le brouillon de m02 (budget et délai absents) demande ces informations, avec la signature de l'agence ; modifiable ; bouton « Marquer comme relu » ; mention permanente « Brouillon : jamais envoyé automatiquement. Copiez le texte dans votre messagerie. ». Aucun bouton « Envoyer ».
5. **Tableau de suivi (45 s)** : une ligne par demande, type tableur, tri et filtres, export CSV.
6. **Relances (30 s)** : les 6 demandes en retard et celles à surveiller ; texte de relance préparé à relire, jamais envoyé.
7. **Essai (30 s)** : le dirigeant colle un e-mail fictif ; l'outil relève ce qui y est, laisse le reste vide.

Questions de clôture proposées (sans promettre de gain) : « Combien de demandes comparables recevez-vous par mois ? Qui les suit aujourd'hui ? » ; renvoi vers le guide de découverte.

## 4. Les e-mails

Format de chaque e-mail (`FlowData.emails[]`) : `id`, `message_id`, `fil`, `en_reponse_a`, `doublon_de`, `de`, `a`, `cc`, `objet`, `date` (ISO, +02:00), `corps`, `pieces_jointes` (noms seulement, jamais lues), `marqueurs` (transfere, reponse_fil, relance, double_envoi, agence_en_copie, appel_urgent), `categorie`, `releves{besoin, service, budget, delai, entreprise, contact}` (chacun `statut`, `valeur`, `passage`), `revue[]`, `traitement{statut, responsable, premiere_reponse, note}`. Listes : `categories`, `statutsTraitement`, `statutsChamp`, `raisonsRevue`, `services`, `equipe`, `agence`, `parametres`.

| Id | Reçu | Catégorie | Entreprise ou expéditeur | Service | Statut | 1re réponse | Particularité |
|---|---|---|---|---|---|---|---|
| m01 | lun 28/09 09:12 | nouvelle_demande | Boulangerie Dupré | web | proposition envoyée | 28/09 11:40 | fourchette, date précise |
| m02 | lun 28/09 14:05 | nouvelle_demande | Cabinet de kinésithérapie des Lilas | identite | en attente | 29/09 09:20 | très court, budget et délai absents |
| m03 | mar 29/09 07:48 | nouvelle_demande | Brasserie des Trois Cuves | social | gagné | 29/09 08:55 | pressé |
| m04 | mar 29/09 16:30 | nouvelle_demande | Association Sentiers Ouverts | web | en attente | 30/09 10:15 | long, confus, plusieurs services |
| m05 | mer 30/09 10:02 | fournisseur | Nuage Ouest Hébergement | - | classé | - | facture |
| m06 | mer 30/09 15:20 | client_existant | Cabinet Valmont Architectes | video | proposition envoyée | 01/10 09:30 | client du site |
| m07 | jeu 01/10 11:45 | demarchage | Passerelle Affaires | - | classé | - | |
| m08 | jeu 01/10 17:10 | nouvelle_demande | Quai 9 Studio | identite | proposition envoyée | 02/10 09:40 | français mêlé d'anglais |
| m09 | ven 02/10 08:30 | candidature | Léa Fontaine | - | classé | - | CV joint |
| m10 | ven 02/10 12:20 | nouvelle_demande | Pépinières du Haut-Pré | seo | perdu | 02/10 16:05 | plafond mensuel |
| m11 | sam 03/10 10:44 | nouvelle_demande | Menuiserie Aubert & Fils | evenementiel | proposition envoyée | 05/10 09:50 | reçu un samedi, « à partir de » |
| m12 | dim 04/10 20:15 | nouvelle_demande | Talent Rive Gauche | redaction | répondu | 05/10 10:30 | reçu un dimanche |
| m13 | lun 05/10 09:05 | nouvelle_demande | Brasserie (suite de m03) | - | répondu | 05/10 11:00 | réponse dans un fil, budget modifié |
| m14 | lun 05/10 11:30 | hors_perimetre | Cabinet Comptable Rivoire | hors_catalogue | répondu | 06/10 09:00 | informatique |
| m15 | lun 05/10 15:48 | nouvelle_demande | Office de tourisme du Val-de-Brenne | newsletter | proposition envoyée | 06/10 10:30 | prix par numéro |
| m16 | mar 06/10 08:15 | nouvelle_demande | Studio Cadence | video | en attente | 06/10 14:00 | budget absent |
| m17 | mar 06/10 13:50 | nouvelle_demande | Fromagerie des Hautes Prairies | web | en attente | 07/10 09:30 | e-mail transféré par une partenaire |
| m18 | mar 06/10 18:22 | indesirable | Offres Flash | - | classé | - | |
| m19 | mer 07/10 10:40 | nouvelle_demande | Hôtel Les Glycines | redaction | à traiter | - | **sans réponse** |
| m20 | mer 07/10 14:12 | nouvelle_demande | Boulangerie (suite de m01) | web | proposition envoyée | 07/10 16:40 | réponse dans un fil, plafond révisé |
| m21 | jeu 08/10 09:33 | client_existant | Garage Lemaire | social | répondu | 08/10 11:20 | budget « comme d'habitude » |
| m22 | jeu 08/10 16:55 | fournisseur | Imprimerie Ouest Graphique | - | classé | - | devis fournisseur |
| m23 | ven 09/10 08:50 | nouvelle_demande | Oumar Plomberie | web | en attente | 09/10 10:30 | fautes de frappe, « urgent » |
| m24 | ven 09/10 11:15 | nouvelle_demande | Clinique vétérinaire des Tilleuls | social | répondu | 09/10 11:50 | demande d'appel urgent |
| m25 | lun 12/10 08:40 | nouvelle_demande | Cave Saint-Aubin | identite | proposition envoyée | 12/10 10:20 | |
| m26 | lun 12/10 14:30 | nouvelle_demande | Communauté de communes de la Plaine d'Orval | web | répondu | 14/10 10:00 | consultation, pièce jointe |
| m27 | mar 13/10 09:10 | nouvelle_demande | Cabinet dentaire du Parc | seo | brouillon prêt | - | **sans réponse**, budget flou |
| m28 | mar 13/10 11:55 | nouvelle_demande | Atelier Terre & Feu | newsletter | proposition envoyée | 13/10 14:00 | |
| m29 | mar 13/10 11:58 | nouvelle_demande | Atelier Terre & Feu | newsletter | doublon | - | même texte 3 minutes plus tard |
| m30 | mar 13/10 15:20 | nouvelle_demande | Domaine des Trois Chênes | video | répondu | 14/10 11:00 | transféré par l'assistante |
| m31 | mer 14/10 07:55 | nouvelle_demande | Maison Bellerive | social | proposition envoyée | 14/10 09:00 | deux services, plafond |
| m32 | mer 14/10 16:10 | relance_prospect | Hôtel Les Glycines | redaction | à traiter | - | **sans réponse**, relance de m19 |
| m33 | jeu 15/10 10:20 | client_existant | Cabinet Valmont Architectes | web | répondu | 15/10 14:30 | « vendredi prochain » ambigu |
| m34 | jeu 15/10 12:45 | hors_perimetre | Handball Club de l'Orval | hors_catalogue | à traiter | - | **sans réponse**, impression |
| m35 | ven 16/10 09:35 | nouvelle_demande | Fédération des commerçants du centre-ville | conseil | proposition envoyée | 16/10 11:10 | atelier |
| m36 | ven 16/10 15:25 | nouvelle_demande | (Nadia Faure vers Thomas Leroy) | web | en attente | 19/10 10:00 | agence en copie |
| m37 | sam 17/10 11:05 | nouvelle_demande | Jardin d'Éole | seo | en attente | 19/10 09:20 | reçu un samedi |
| m38 | lun 19/10 09:40 | nouvelle_demande | Horizon Compétences | redaction | à traiter | - | **sans réponse** |
| m39 | lun 19/10 14:45 | nouvelle_demande | Cabinet Delorme Conseil | web | en revue | - | **sans réponse**, trois services |
| m40 | mar 20/10 08:05 | nouvelle_demande | Tonnellerie Marchal | video | brouillon prêt | - | **sans réponse** |
| m41 | mar 20/10 16:40 | indesirable | Service Livraison | - | classé | - | pièce jointe suspecte |
| m42 | mer 21/10 09:15 | nouvelle_demande | Valdane Software | web | à traiter | - | à surveiller, français et anglais |
| m43 | mer 21/10 15:00 | nouvelle_demande | Perrot Paysage | web | à traiter | - | à surveiller, très court |
| m44 | jeu 22/10 08:45 | nouvelle_demande | Résidence Les Mimosas | social | à traiter | - | à surveiller |
| m45 | jeu 22/10 14:10 | nouvelle_demande | Fromagerie (suite de m17) | - | à traiter | - | à surveiller, réponse dans un fil |
| m46 | ven 23/10 09:05 | hors_perimetre | Cidrerie Kerlan | hors_catalogue | à traiter | - | traduction |
| m47 | ven 23/10 10:30 | nouvelle_demande | Coopérative Les Vergers du Lac | evenementiel | à traiter | - | plafond |

## 5. Architecture des écrans prévue

Navigation à adresses `#` comme Équerre ; raccourcis clavier `1` à `7` (écrans) et `8` (paramètres), `?` pour l'aide, `Échap` pour fermer ; mode présentation (`F`) ; bandeau « Données fictives » permanent ; aucun bouton d'envoi nulle part.

| Adresse | Écran | Contenu |
|---|---|---|
| `#tableau-de-bord` (ouverture) | Tableau de bord | Quatre repères (reçues, à traiter, sans réponse au-delà du délai, informations manquantes), répartition par catégorie et par service, délais de première réponse, demandes par semaine, liste « à faire aujourd'hui » |
| `#boite` | Boîte de réception | Liste filtrable (catégorie, statut, service, responsable, raison de revue), recherche, tri par date ou ancienneté, pastilles de statut en texte |
| `#message/m01` | Fiche d'une demande | Corps de l'e-mail avec passages surlignés, six champs avec statut et raison de revue, fil de discussion, historique de traitement, responsable, boutons « Voir le brouillon », « Corriger un champ » |
| `#brouillon/m01` | Brouillon | Texte préparé à partir des champs et des questions du catalogue, modifiable, signature de l'équipier, « Copier », « Marquer comme relu » ; rappel que rien n'est envoyé |
| `#suivi` | Tableau de suivi | Type tableur : une ligne par demande (fil), colonnes entreprise, contact, service, budget, délai, statut, responsable, reçu le, 1re réponse, ancienneté ; tri, filtres, colonne figée, export CSV (avec neutralisation des formules) |
| `#relances` | Relances | Demandes sans réponse au-delà du délai, puis « à surveiller » ; ancienneté en jours ouvrés ; texte de relance préparé à relire |
| `#rapport` | Rapport hebdomadaire | Format A4 imprimable : semaine choisie, reçues, répondues, délai médian de première réponse, sans réponse, répartition, points d'attention |
| `#parametres` | Paramètres | Délai de relance (2 jours ouvrés par défaut), jours et horaires ouvrés, catalogue de services, équipe et signature, ton ; modifications locales avec bouton « Rétablir » |
| `#comment` | Comment ça marche | Les cinq étapes (relever, ranger, préparer, relire, signaler), ce que l'outil ne fait pas, glossaire (statut, passage, revue, jour ouvré) |
| `#essai` | Essai avec un e-mail fictif | Zone de collage ; avertissement « collez uniquement un e-mail fictif » ; relevé en temps réel avec les mêmes règles ; rien n'est conservé après rechargement |

Modules prévus : `js/core/` (jours ouvrés, relances, relevé par règles, brouillon, suivi, indicateurs, export CSV), `js/ui/` (store, surlignage, tableur, dialogues), `js/views/` (un fichier par écran). `js/data.js` ne contient que des données et trois utilitaires provisoires (`joursOuvres`, `reponseAttendue`, `sansReponseEnRetard`) qui passeront dans `js/core` avec les mêmes tests.

L'essai avec un e-mail collé est un **relevé par règles simples et déterministes** (montants en euros, mots de délai, noms du catalogue), pas un modèle d'IA. La fiche le dit. Le comportement avec une vraie boîte et un vrai modèle n'est pas démontré par cette application.

## 6. Critères d'acceptation vérifiables

Données et tests (automatisés par `node livrables/outil-flow-inbox/tests/run-tests.js`, code 0) :

1. Le jeu comporte entre 40 et 55 e-mails, la majorité en nouvelles demandes, et au moins un exemple de chaque catégorie, de chaque service du catalogue et de chaque type de budget.
2. Chaque passage relevé existe mot pour mot dans le corps de son e-mail, hors lignes citées ; un champ absent n'a ni valeur ni passage.
3. Aucune adresse hors du domaine réservé `.example`, aucun lien, aucun téléphone autre que `01 23 45 67 89` et `06 12 34 56 78`, aucune marque courante.
4. Dates valides, comprises entre le 28 septembre et le 23 octobre 2026, en ordre croissant, antérieures à la date de référence ; réponses de l'agence postérieures à la réception, en jour ouvré et en heures de bureau.
5. Dans un fil, la réponse suit son parent ; la date citée dans le message correspond à l'historique ; un doublon a le même texte et le même expéditeur.
6. Catégories, statuts, services, raisons de revue et responsables appartiennent aux listes autorisées ; identifiants uniques.
7. Au moins 5 demandes (fils) sont sans réponse au-delà de 2 jours ouvrés à la date de référence ; les cas limites de calcul sont testés (mercredi = 2, mardi = 3, week-end).

Écrans (vérifiables à la main ou par script de navigation, à tester lors de la construction) :

8. À l'ouverture, le tableau de bord affiche, sans défilement à 1280 × 720, le nombre de demandes sans réponse au-delà du délai, égal au nombre de fils de l'écran Relances (6).
9. Le bandeau « Données fictives de démonstration » est visible sur tous les écrans, y compris en mode présentation.
10. Aucun bouton, lien ou texte ne propose d'envoyer un message ; chaque brouillon porte la mention « Brouillon : jamais envoyé automatiquement ».
11. Dans la fiche, chaque champ relevé met en évidence son passage dans le texte, au survol et au clavier ; un champ absent affiche « Absent : non indiqué dans le message » sans valeur.
12. Chaque cas à vérifier affiche en clair sa raison de revue ; le nombre de messages en revue est le même dans la boîte, le tableau de bord et le rapport.
13. Le brouillon de la demande m02 demande le budget et le délai absents, reprend le service demandé et se termine par la signature de l'agence ; il ne contient aucune promesse de délai, de prix ou de résultat.
14. Le brouillon est modifiable ; la modification reste après changement d'écran dans la même session ; « Rétablir » restaure le texte préparé.
15. Le tableau de suivi a une ligne par demande (43 fils, hors doublon et messages classés selon le réglage), se trie et se filtre au clavier, et s'exporte en CSV dont les cellules commençant par `=`, `+`, `-` ou `@` sont neutralisées.
16. Changer le délai de relance à 3 jours ouvrés dans les paramètres fait passer les relances de 6 à 5 ; le rétablir à 2 redonne 6. Calcul vérifié : à la date de référence (vendredi 23 octobre, 17 h 30), m38 et m39, reçus le lundi 19 octobre, ont 4 jours ouvrés (4 > 3, toujours en retard) ; seule m40, reçue le mardi 20 octobre, a 3 jours ouvrés (3 n'est pas > 3) et repasse « à surveiller » (7 à surveiller). Fixé par `tests/t-relances-delai.js`.
17. Le rapport hebdomadaire d'une semaine donnée affiche des totaux égaux à ceux de la boîte filtrée sur la même semaine, et s'imprime sur A4 sans coupure au milieu d'un tableau.
18. L'essai avec un e-mail collé relève le budget et le délai quand ils sont écrits, laisse « absent » quand ils ne le sont pas, passe en revue un texte ambigu, et n'enregistre rien après rechargement.
19. Chaque écran est utilisable au clavier seul (ordre de tabulation logique, focus visible), texte de 12 px au minimum, contraste d'au moins 4,5:1 pour le texte courant, aucune information portée par la couleur seule.
20. L'application s'ouvre en double-clic (`file://`), sans requête réseau (politique de sécurité de contenu restrictive), sans police ni script distant, et fonctionne hors ligne.
21. Le parcours de 5 minutes de la section 3 se déroule sans erreur dans la console du navigateur, de l'ouverture à l'essai.
22. Aucun chiffre de gain, de temps gagné ou de performance n'apparaît dans l'outil ; les seuls chiffres sont ceux calculés à partir des données fictives.

## 7. Limites assumées

- Démonstration : aucune lecture d'une vraie boîte, aucun modèle d'IA, aucune écriture dans un vrai tableur. Les relevés des 47 e-mails sont fournis avec les données et vérifiés par les tests ; ils ne mesurent aucune précision de classement.
- Les e-mails ont été écrits pour la démonstration : ils sont plus nets que beaucoup de vrais messages. Le pilote devra être jugé sur des cas réels, avec l'accord de l'agence.
- Pièces jointes mentionnées, jamais lues ; liens non suivis ; une seule boîte, une seule langue principale.
- Jours ouvrés : lundi à vendredi ; aucun jour férié sur la période démontrée, la gestion des jours fériés est à ajouter avant un usage réel.
- Les montants sont des budgets annoncés par des prospects fictifs, pas des prix de l'agence.

## 8. État après la passe 2 (réalisé)

- Raccourcis : `1` à `7` pour les écrans (tableau de bord, boîte, suivi, relances, rapport, essai, comment ça marche), `8` pour les paramètres, `F` mode présentation, `V` visite guidée en 7 étapes, `P` rapport, `?` aide, `Échap` ferme (bulle, panneau, aide, visite, présentation). L'écran « Comment ça marche » est à l'adresse `#comment` (et non `#aide`) ; l'aide « ? » est une boîte de dialogue.
- Tableau de bord : « demandes » = fils ; 36 demandes, dont 3 hors périmètre ; 9 demandes (10 messages) à traiter ; 6 sans réponse (7 messages) ; 8 avec information manquante (sur les 33 demandes dans le périmètre). Délai médian en heures ouvrées (lundi au vendredi, 9 h à 18 h). Budgets déclarés : minimum et maximum déclarés, jamais un total unique.
- Rapport : semaine du lundi au dimanche ; la situation est reconstituée à la clôture de la semaine ; la boîte sait filtrer par semaine (mêmes totaux que le rapport).
- Essai : règles simples testées dans `tests/t-essai.js` (plus de 70 cas, dont montants et dates piégés).
