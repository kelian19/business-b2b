# Flow Inbox — version installable (Gmail + Google Sheets)

Version 1.0 du 18 octobre 2026. C'est **le livrable du pilote Flow Inbox** vendu 790 € HT (prix hypothèse) : un script Google Apps Script installé **dans le compte Google du client**, lié à un Google Sheet de suivi. Il complète la [démo client](../../outil-flow-inbox/README.md), qui reste l'outil de présentation pendant l'appel.

Public : Kélian, pour l'installation chez un client. Ce guide n'est pas à transmettre tel quel.

## Ce que fait le script

1. Il lit **seulement** les fils Gmail portant le libellé `Flow Inbox/À traiter`. Ce libellé est posé par un filtre Gmail que le client choisit (par exemple : messages adressés à `contact@`, ou issus de son formulaire de contact).
2. Il ajoute une ligne par demande dans l'onglet **Suivi** : date, expéditeur, objet, service reconnu, budget et délai **recopiés tels qu'écrits** (avec la citation), informations à demander, points à revoir, statut, prochaine action et lien vers le fil.
3. En mode **Actif**, il prépare un **brouillon** de réponse dans le fil pour une demande claire : un seul service reconnu, aucun signal de doute. Le brouillon demande le budget et l'échéance s'ils manquent. Une personne le relit, le corrige et l'envoie.
4. Toutes les heures, il repère les demandes auxquelles l'équipe a répondu (statut « Répondu ») et marque « En retard » celles qui attendent au-delà du délai convenu (24 h par défaut).

Ce qu'il ne fait jamais : envoyer, transférer, archiver ou supprimer un message, appeler un service extérieur ou une IA. **Aucune donnée ne sort du compte Google du client** et aucun abonnement n'est nécessaire. Le test `le source ne contient aucun appel d'envoi` le vérifie à chaque exécution.

### Règles de lecture (déterministes)

| Information | Règle | En cas de doute |
|---|---|---|
| Service | Mots-clés de l'onglet **Services**, sans accents ni majuscules, mot entier, pluriel toléré | Aucun service : « À revoir ». Plusieurs : « À revoir » |
| Budget | Montant suivi de `€`, `euros`, `k€` ; plages « entre … et … », « de … à … » ; « à partir de », « maximum » | Plusieurs montants, `5.000 €` ou « quelques milliers d'euros » : « À revoir », le budget n'est pas redemandé |
| Délai | Date complète (`15/03/2027`, `1er avril 2027`), mois, « fin novembre », « sous deux semaines », « urgent », etc. | **Aucune année n'est inventée** : « 12 mars » reste du texte |
| Hors périmètre | Candidature, facture, réponse automatique, envoi groupé (en-têtes `Auto-Submitted`, `Precedence`, `List-Unsubscribe`), arnaque courante, message de la boîte elle-même | Signaux mêlés (commercial et hors) : « À revoir » |
| Sécurité | Adresse de réponse différente de l'expéditeur, démarchage reçu, texte vide ou de plus de 20 000 caractères | « À revoir », jamais de brouillon |

Sur les 47 e-mails fictifs de la démo (banc du 18 octobre 2026) : 21 brouillons pour 34 nouvelles demandes, **aucun brouillon** pour une candidature, une facture, une arnaque ou un démarchage. Le reste passe en « À revoir ». Cette proportion dépend du catalogue de services et ne vaut pas mesure chez un client.

### Statuts

`[essai] Brouillon possible` (mode Essai) · `Brouillon prêt` · `À revoir` · `Hors périmètre` · `Répondu` · `Clos` (posé à la main, le script n'y touche plus) · `En cours` (transitoire, repris automatiquement après une interruption).

## Installation chez le client (environ 1 h, à mesurer)

Prérequis : compte Google du client (Gmail ou Google Workspace), accès administrateur de la boîte pendant l'installation, catalogue de services et délai de réponse convenus au cadrage. Faire l'installation **avec** le client, sur son poste ou en partage d'écran : il garde la propriété du script et du tableau.

1. **Tableau** : dans le Drive du client, créer un Google Sheet vide « Flow Inbox — suivi ».
2. **Script** : menu Extensions > Apps Script. Supprimer le contenu par défaut, créer les fichiers `logique.gs` et `Code.gs` et coller leur contenu. Dans Paramètres du projet, cocher « Afficher le fichier manifeste », puis remplacer `appsscript.json` (fuseau Europe/Paris, autorisations listées ci-dessous). Enregistrer.
3. **Autorisation** : recharger le tableau. Menu **Flow Inbox > Installer ou vérifier**. Google demande l'accord du client (écran « application non validée » : c'est le script privé du client ; passer par « Paramètres avancés »). Le script crée les onglets Suivi, Réglages, Services et Journal et les deux libellés Gmail.
4. **Réglages** : signature, délai de réponse, éventuelle question complémentaire. Laisser `Mode = Essai`.
5. **Services** : remplacer le catalogue d'exemple par celui de l'agence (une ligne par service : code, libellé dans le brouillon, mots-clés séparés par `;`). Le libellé s'insère dans « Merci pour votre message au sujet de {libellé} ».
6. **Filtre Gmail** : avec le client, créer un filtre qui applique `Flow Inbox/À traiter` aux demandes entrantes (destinataire, expéditeur du formulaire, ou mots de l'objet). Ne pas viser toute la boîte.
7. **Recette en mode Essai** (voir ci-dessous), puis passer `Mode = Actif`.
8. **Automatique** : menu **Flow Inbox > Activer le traitement automatique** (traitement toutes les 15 min, vérification toutes les heures). Arrêt à tout moment : **Arrêter le traitement automatique**.

Autorisations demandées (`appsscript.json`) : `https://mail.google.com/` (accès Gmail, exigé par le service GmailApp pour lire les messages et créer des brouillons ; le code ne lit que le libellé choisi), `spreadsheets.currentonly` (ce seul tableau), `script.scriptapp` (déclencheurs), `userinfo.email` (adresse de la boîte). L'étendue Gmail est large : le dire au client. Il peut révoquer l'accès à tout moment depuis son compte Google (Sécurité > Applications tierces).

Quotas Google : le script traite au plus 20 fils par passage (réglable jusqu'à 50) et reste très en dessous des quotas quotidiens d'Apps Script pour quelques dizaines de demandes par jour. Les limites exactes dépendent du type de compte : à vérifier dans la documentation Google avant un client à gros volume.

## Recette chez le client (avant `Mode = Actif`)

Avec 4 e-mails **fictifs**, envoyés depuis une autre adresse vers la boîte du client puis étiquetés :

| # | Message test | Attendu |
|---|---|---|
| 1 | « Refonte de notre site internet, budget 4 000 €, pour fin janvier » | Ligne, service site, budget et délai cités, statut `[essai] Brouillon possible` |
| 2 | « Nous voulons un logo » | Budget et délai à demander |
| 3 | « Candidature : voici mon CV » | `Hors périmètre` |
| 4 | « Un site internet et un logo, entre 3 et 5 k€ » | `À revoir`, plusieurs services |

Puis : relancer **Traiter** (aucune ligne en double) ; passer en Actif, retirer le libellé `Flow Inbox/Traité` du fil 1 et relancer (toujours une seule ligne, aucun brouillon recréé) ; envoyer un nouveau test clair et vérifier le brouillon dans le fil ; répondre depuis la boîte puis **Vérifier réponses et retards** (`Répondu`). Noter le résultat de chaque contrôle dans le procès-verbal de recette remis au client, puis supprimer les messages et lignes de test.

## Tests automatisés

    node livrables/automatisations/flow-inbox-gmail/tests/run-tests.js

81 tests sans dépendance (Gmail, Sheets, verrou et déclencheurs simulés en mémoire) : montants, délais, qualification, brouillons, cellules protégées contre les formules, parcours Essai et Actif, rejeu sans doublon, reprise après interruption, réponses, retards, statut Clos, déclencheurs, journal sans contenu d'e-mail, absence de toute fonction d'envoi. Sur ce Mac, Node n'est pas installé : lancer avec le moteur de VS Code, `ELECTRON_RUN_AS_NODE=1 "/Applications/Visual Studio Code.app/Contents/MacOS/Code" <fichier>`.

**Non vérifié à ce jour** : exécution dans un vrai compte Google (écran d'autorisation, libellés imbriqués, `getDrafts`, liens Gmail, quotas). À faire une fois sur un compte de test de Kélian **avant le premier client**, avec la recette ci-dessus.

## Limites connues (à dire au client)

- Lecture par règles, pas par IA : une demande formulée de façon inhabituelle passe en « À revoir » plutôt que d'être mal lue. Le catalogue de mots-clés s'ajuste pendant le premier mois.
- Texte seul : pièces jointes, images et liens ne sont pas lus.
- « En retard » compte des heures calendaires (week-end inclus).
- Une seule boîte et un seul tableau par installation. Le brouillon répond à l'expéditeur du premier message du fil.
- Le tableau contient l'adresse et l'objet des demandes : il reste dans le Drive du client, qui en contrôle le partage. Le journal ne contient que des compteurs.

## Pistes après le pilote (non incluses, prix distinct)

Lecture par IA avec citation obligatoire (logique déjà prototypée dans la [démo locale](../flow-inbox/README.md)), récapitulatif hebdomadaire par e-mail interne, plusieurs boîtes, pièces jointes.
