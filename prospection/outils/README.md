# Outils de prospection par e-mail (v4)

Démarrage pas à pas, minuté : `plan-demarrage.md`. Stratégie anti-spam : `strategie-mailing.md`. Messages : `../messages/modeles-v4.md`. Réponses types : `../messages/reponses-types.md`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `fusion-import.js` | Fusionne les listes en `suivi-import-v4.csv` (onglet « Suivi »). Node.js seul, sans dépendance. |
| `suivi-import-v4.csv` | Sortie de la fusion (UTF-8 avec BOM, colonnes de `suivi-modele.csv` + `segment`). Non versionné (adresses d'entreprises). |
| `fusion-import.log` | Adresses rejetées, doublons, effectifs (non versionné). |
| `messages-sheet.csv` | Contenu de l'onglet « Messages » : EF-V1, EF-V2, DEC, EF-CAB, relances comprises. Copie des textes de `../messages/modeles-v4.md` : si on modifie l'un, mettre à jour l'autre. |
| `envoi.gs` | Script Google Apps Script (brouillons, envoi, relances, suivi des réponses, déclencheurs). |
| `tests/envoi.test.js` | Tests de `envoi.gs` avec simulations Google (aucun envoi réel). |
| `suivi-modele.csv` | En-têtes de l'onglet « Suivi » (exemples fictifs). |
| `tableau-de-bord.md` | Formules de synthèse. Elles citent encore les anciennes offres A et B : remplacer par EF-V1, EF-V2, DEC, EF-CAB. |

## Fusion des listes

```
node prospection/outils/fusion-import.js                  # prend aussi domaines-efacture.csv s'il existe
node prospection/outils/fusion-import.js --sans-efacture  # l'ignore
```

Sources : `suivi-import.csv` (cabinets), `domaines-test.csv` (formation 101-110, transport 111-120), `domaines-btp.csv` (bâtiment 121-130), `domaines-efacture.csv` (PME e-facture, facultatif).

| Segment | Offre |
|---|---|
| PME e-facture | EF-V1 et EF-V2 en alternance |
| Cabinets comptables | EF-CAB |
| Organismes de formation | DEC |
| Transport, bâtiment | EF-V1 et EF-V2 en alternance (dans chaque segment) |

Règles : statut « à envoyer » ; dédoublonnage par adresse e-mail (casse ignorée) ; uniquement des adresses génériques : les adresses de forme `prenom.nom@` et les domaines grand public (gmail, orange, etc.) sont rejetés et journalisés. L'ordre du fichier (PME e-facture, cabinets, formation, transport, bâtiment) est l'ordre de traitement du script.

## Installation (détail dans `plan-demarrage.md`)

1. Créer un Google Sheet avec 4 onglets : « Suivi », « Messages », « Désinscrits » (en-tête `email`), « Journal » (en-têtes `timestamp`, `action`).
2. Importer `suivi-import-v4.csv` dans « Suivi » et `messages-sheet.csv` dans « Messages » (Fichier > Importer > Remplacer la feuille ; décocher la conversion en nombres et dates).
3. Extensions > Apps Script : coller `envoi.gs` ; fuseau horaire du projet **et du classeur** (Fichier > Paramètres) : Europe/Paris.
4. Vérifier `const MODE = "BROUILLON"`, lancer `testerScript()`, puis `tester3Lignes()`.
5. Relire les brouillons dans Gmail, envoyer à la main, puis lancer `installerDeclencheurs()`.

## Fonctions de `envoi.gs`

| Fonction | Effet |
|---|---|
| `testerScript()` | Lecture seule : messages, désinscrits, relances dues, exemple de fusion. |
| `tester3Lignes()` | Comme `envoyerMessages()` mais 3 messages au plus pour cette exécution. |
| `envoyerMessages()` | Pour chaque ligne « à envoyer » : brouillon (BROUILLON) ou envoi (ENVOI). Plafond quotidien 10, relances comprises, toutes exécutions confondues. |
| `creerRelance()` | Relance unique des lignes « envoyé » dont `date_relance_J5` est échue, sans réponse, dans le fil du premier message quand il est retrouvé. |
| `verifierReponses()` | Voir ci-dessous. Lancée toutes les heures par le déclencheur. |
| `synchroniserEnvoyes()` | Passe « brouillon créé » à « envoyé » quand le message est parti de Gmail, et pose la date de relance (+5 jours). Appelée par `verifierReponses()`. |
| `tacheQuotidienne()` | Chaque matin ouvré : `verifierReponses`, `creerRelance`, `envoyerMessages` (dans cet ordre). |
| `installerDeclencheurs()` | Idempotent : `tacheQuotidienne` du lundi au vendredi vers 9 h, `verifierReponses` toutes les heures. Ne change pas le MODE. |
| `supprimerDeclencheurs()` | Supprime uniquement ces déclencheurs (arrêt d'urgence). |

Garde-fous : MODE BROUILLON par défaut ; verrou `LockService` (pas deux exécutions simultanées) ; un message n'est jamais créé si un champ `{{...}}` inconnu subsiste ; adresses de l'onglet « Désinscrits » jamais contactées (comparaison sans casse) ; une seule relance par adresse ; en cas de colonne manquante dans « Suivi », le script s'arrête avec un message.

## Champs de fusion

`{{cabinet}}` et `{{ville}}` sont reconnus dans l'objet et le corps (casse et espaces ignorés). Si la valeur manque dans le Sheet : « votre entreprise » et « votre secteur » (constantes `FORMULE_CABINET`, `FORMULE_VILLE`) : écrire la phrase pour qu'elle reste correcte dans les deux cas. Les textes actuels de `messages-sheet.csv` n'en utilisent aucun (texte unique par offre, comme dans `modeles-v4.md`) ; en ajouter dans `Messages` suffit à les activer. Tout autre champ `{{...}}` bloque la création du message.

## Suivi des réponses

`verifierReponses()` cherche dans Gmail, pour les adresses déjà contactées (statut autre que « à envoyer », « désinscrit », « bounce ») : les messages reçus de ces adresses (ou de la même adresse de domaine d'entreprise), et les rebonds de `mailer-daemon` / `postmaster` qui les citent.

| Détecté | Mise à jour du Sheet | Gmail |
|---|---|---|
| Réponse | statut « répondu », texte dans `reponse`, note `[réponse date]`, `[intéressant]` si un signal positif (oui, intéressé, devis, tarif, programme, échange, visio, rendez-vous) sans négation (« pas intéressé ») | libellé `Équerre/Réponses`, un e-mail de notification à l'adresse du compte |
| Opposition (stop, désinscription, ne plus me contacter, retirez-moi de votre liste, etc.) | statut « désinscrit », adresse ajoutée à « Désinscrits » | libellé, notification |
| Rebond (échec de remise) | statut « bounce » | notification |
| Réponse automatique, simple retard de remise | rien (journal) | rien |

Les citations de nos propres messages (historique, lignes `>`, pied de page) sont ignorées : notre phrase « ne plus vous contacter » n'est jamais prise pour une opposition. Les identifiants de messages traités sont mémorisés dans `PropertiesService` : jamais deux notifications pour le même message. Les notifications partent même en mode BROUILLON : elles ne vont qu'à votre adresse, jamais à un prospect.

## Tests

```
node prospection/outils/tests/envoi.test.js
```

Code de sortie 0 si tout passe. Les tests utilisent des simulations de Google (SpreadsheetApp, GmailApp, PropertiesService, LockService, ScriptApp, Utilities, Session) : ils ne prouvent pas le comportement réel de Gmail (syntaxe des requêtes de recherche, quotas, délais). D'où l'étape « test sur 3 lignes » avant tout volume.

## Limites

- Gmail : quota d'envoi quotidien de l'ordre de 500 (non vérifié), mais la prudence impose 5 à 10 messages par jour au début ; adresse @gmail.com sans SPF/DKIM/DMARC propres (décision : pas de domaine avant une première vente).
- Un envoi à la main depuis le brouillon est détecté par la recherche `in:sent to:adresse` : si le brouillon est envoyé depuis un autre compte ou une autre adresse, mettre le statut à « envoyé » et la date de relance à la main.
- Le script est lié au Sheet : le copier-coller de `envoi.gs` est à refaire après chaque modification du fichier.
