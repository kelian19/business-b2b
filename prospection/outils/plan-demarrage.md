# Plan de démarrage : première vague d'e-mails (mercredi 2026-10-07)

Principe : tout part en **brouillons relus par Kélian**, 5 à 10 par jour, depuis `keliankaddouripro@gmail.com`, sans appel sortant. Rien ne s'envoie sans votre clic. Durée de la mise en place : environ 1 h 45 ; ensuite 15 à 20 minutes par jour.

Fichiers à avoir sous la main (dans `prospection/outils/`) : `suivi-import-v4.csv`, `messages-sheet.csv`, `envoi.gs`. Réponses types : `prospection/messages/reponses-types.md`.

## 0. Avant de commencer (08:30, 5 min)

1. Depuis la racine du projet : `node prospection/outils/tests/envoi.test.js` (doit afficher « tests réussis » et rendre le code 0).
2. `node prospection/outils/fusion-import.js` (prend `domaines-efacture.csv` s'il existe ; option `--sans-efacture` pour l'ignorer). Lire le résumé : **94 lignes attendues** (PME e-facture 30, Cabinets comptables 34, Organismes de formation 10, Transport 10, Bâtiment 10 ; 25 EF-V1, 25 EF-V2, 34 EF-CAB, 10 DEC) et `fusion-import.log` (un seul rejet attendu : une adresse de cabinet en messagerie grand public, détaillée dans le journal ; à remplacer par une autre adresse du cabinet ou à laisser de côté).

## 1. Mise en place, minute par minute

| Heure | Durée | Étape | Contrôle |
|---|---|---|---|
| 08:35 | 10 min | **Créer le Google Sheet** « Prospection Équerre » avec 4 onglets exactement nommés : `Suivi`, `Messages`, `Désinscrits`, `Journal`. Puis Fichier > Paramètres > fuseau horaire **Europe/Paris** (le script lit les dates dans le fuseau du classeur). | Les noms sont identiques, accents compris ; fuseau Europe/Paris. |
| 08:45 | 10 min | **Importer le suivi** : onglet `Suivi` > Fichier > Importer > Importer > `suivi-import-v4.csv` > « Remplacer la feuille actuelle ». **Décocher** « Convertir le texte en nombres, dates et formules ». | Ligne 1 : id, cabinet, ville, site, email_generique, offre_testee, statut, date_envoi, date_relance_J5, reponse, tache_citee, prix_evoque, notes, segment. Toutes les lignes « à envoyer ». |
| 08:55 | 5 min | **Importer les messages** : onglet `Messages` > Importer `messages-sheet.csv` > « Remplacer la feuille actuelle » (même case décochée). | 4 lignes : EF-V1, EF-V2, DEC, EF-CAB ; 5 colonnes id, objet, corps, relance_objet, relance_corps. |
| 09:00 | 3 min | **En-têtes** : `Désinscrits`, cellule A1 = `email` ; `Journal`, A1 = `timestamp`, B1 = `action`. | Onglets vides sous l'en-tête. |
| 09:03 | 7 min | **Coller le script** : Extensions > Apps Script, supprimer le code d'exemple, coller tout `envoi.gs`, enregistrer. Paramètres du projet > fuseau horaire **Europe/Paris**. | `const MODE = "BROUILLON"` en haut du fichier. |
| 09:10 | 5 min | **Premier lancement** : choisir `testerScript` > Exécuter. Google demande l'autorisation (Gmail, Sheets, déclencheurs) : écran « application non validée » = « Paramètres avancés » > « Accéder au projet ». | Journal d'exécution : 4 messages chargés, MODE BROUILLON, plafond 10, relances dues 0. |
| 09:15 | 5 min | **Test sur 3 lignes** : lancer `tester3Lignes`. | 3 brouillons dans Gmail ; 3 lignes du Suivi passent à « brouillon créé » avec la date du jour ; onglet Journal rempli. |
| 09:20 | 15 min | **Relire les 3 brouillons** un par un : destinataire = adresse de la ligne ; objet ; « Bonjour, » ; aucun `{{...}}` ; signature « Kélian Kaddouri » + adresse ; la phrase « Vous pouvez à tout moment me demander de ne plus vous contacter. » en dernière ligne ; aucune pièce jointe, aucun lien. Vérifier aussi que l'entreprise existe et correspond bien (colonne `notes`) et que le préfixe de l'adresse est un mot générique ou le nom de l'entreprise, jamais un prénom (le contrôle automatique ne voit que les formes `prenom.nom@`). Un brouillon supprimé : sa ligne reste « brouillon créé » ; la repasser à « à envoyer » à la main ou la retirer. | Rien à corriger, sinon corriger le modèle dans `Messages` (pas dans le brouillon seul). |
| 09:35 | 25 min | **Envoyer à la main** les 3 brouillons (bouton Envoyer), un toutes les 2 à 3 minutes, sans modifier le destinataire. Lancer ensuite une seconde fois `tester3Lignes` : 3 brouillons de plus, même relecture, même envoi. Total du jour : 6. | Le statut des 6 lignes passera tout seul à « envoyé » (avec date de relance à J+5, soit lundi 2026-10-12) à la prochaine vérification horaire. |
| 10:00 | 5 min | **Installer les déclencheurs** : lancer `installerDeclencheurs`. Vérifier dans Apps Script > Déclencheurs : 5 déclencheurs `tacheQuotidienne` (lundi à vendredi, vers 9 h) et 1 `verifierReponses` (toutes les heures). | MODE reste BROUILLON : chaque matin, des brouillons attendent d'être relus. |
| 10:05 | 5 min | **Essai du suivi des réponses** : lancer `verifierReponses` une fois ; lire l'onglet Journal. Les cas réponse, opposition et rebond sont couverts par le test automatisé ; le libellé Gmail `Équerre/Réponses` n'apparaîtra qu'à la première vraie réponse. | Journal : « 0 réponse(s) » et statuts des envois passés à « envoyé ». |

Résultat vers 10:20 : 6 messages partis, déclencheurs installés, MODE toujours BROUILLON (à ne changer qu'après décision explicite). Le test sur 3 lignes ne vérifie pas le destinataire d'une relance dans le fil : **lundi 2026-10-12**, avant d'envoyer la première relance, contrôler que le brouillon est adressé à la même personne et se trouve dans le fil du premier message (sinon, corriger à la main).

## 2. Ordre des lots

Le script traite les lignes dans l'ordre du Suivi ; le fichier d'import est déjà classé :

1. **PME e-facture** (EF-V1 / EF-V2 en alternance, 30 adresses), cible principale : première dans le fichier d'import. Si la liste est complétée après l'import : relancer `fusion-import.js`, puis insérer les nouvelles lignes (segment « PME e-facture ») **en haut** du Suivi, juste sous l'en-tête ; ne pas réimporter tout le fichier : repérer les lignes par l'adresse e-mail, jamais par l'id.
2. **Cabinets comptables** (EF-CAB) : 34 adresses, environ 4 à 5 jours. **Avant ce lot** : confirmer avec l'associé·e ESSEC qu'il ou elle participe réellement et valide la phrase « Nous sommes deux : l'un formé à l'ENSAE Paris, l'autre à l'ESSEC » ; sinon la retirer et remplacer « nous » par « je » dans EF-CAB (onglet `Messages` et `modeles-v4.md`).
3. **Organismes de formation** (DEC) : 10 adresses, environ 1 jour.
4. **Transport puis bâtiment** (EF-V1 / EF-V2 en alternance) : 20 adresses, tailles variables, c'est un test de cible.

Un lot à la fois : on compare les réponses par segment et par offre (`prospection/suivi.md`). Au moins 10 envois par offre avant d'en tirer quoi que ce soit : en dessous, c'est une indication, pas une preuve.

## 3. Routine quotidienne (15 à 20 minutes, dès jeudi)

| Durée | Action |
|---|---|
| 2 min | Lire les notifications `[Équerre]` reçues (réponses, oppositions, rebonds) et l'onglet `Journal`. |
| 5 min | Répondre aux réponses, dans la journée, avec `reponses-types.md` (réponse positive, prix, déjà équipé, pas intéressé, opposition). |
| 10 min | Ouvrir les brouillons du matin (relances d'abord, puis nouveaux), relire, envoyer à la main, un toutes les 2 à 3 minutes. |
| 2 min | Contrôle : rebonds, plaintes, réponses « c'est du spam ». Appliquer les règles d'arrêt ci-dessous. |

Le vendredi : demander à `manager` le point hebdomadaire (envois, réponses, relances J+5 par offre) dans `prospection/suivi.md`.

Réchauffement : le plan de `strategie-mailing.md` (2 à 3 semaines, correspondants réels) n'est pas appliqué tel quel ; le volume de départ (6 le premier jour, 5 à 10 ensuite, relus un à un) en tient lieu. À reconsidérer si les premiers messages tombent en spam : décision de Kélian.

Semaine 1 : 5 à 10 par jour (le plafond du script est 10 ; vous pouvez le baisser à 6 en changeant la constante `QUOTA_QUOTIDIEN`). Ensuite 15 maximum, jamais plus que ce que vous pouvez relire et suivre.

## 4. Rappel anti-spam (détails : `strategie-mailing.md`)

- Texte brut, sans pièce jointe, sans lien, sans image, sans suivi d'ouverture ; un seul appel à l'action (répondre en une ligne).
- Adresses génériques publiées par l'entreprise uniquement ; retirer toute adresse qui rebondit (le script passe la ligne à « bounce »).
- Une seule relance, à J+5, jamais de seconde ; jamais d'envoi à un désinscrit.
- Pas de pic : même volume chaque jour, messages espacés de quelques minutes, plutôt le matin du mardi au jeudi.
- **Arrêt de la vague** au premier signalement « spam », ou si plus de 2 % de rebonds (seuil de pratique, non sourcé) : lancer `supprimerDeclencheurs`, comprendre, puis reprendre.
- Les règles Gmail et CNIL de `strategie-mailing.md` viennent de sources secondaires : à recouper sur cnil.fr et support.google.com avant de monter en volume.

## 5. Points à régler vite (pas bloquants pour demain)

- Signature : une fois la micro-entreprise créée, ajouter sa dénomination et son SIRET dans la signature des modèles (identification de l'expéditeur dans un message commercial : à vérifier). Mettre à jour `Messages` en même temps que `modeles-v4.md`.
- Le nom, le statut exact et le rôle du second associé (formé à l'ESSEC) : à confirmer avant toute précision dans un message ; seul « Nous sommes deux : l'un formé à l'ENSAE Paris, l'autre à l'ESSEC » est écrit (EF-CAB et réponses types).
- Outil de démonstration (visio) : dossier `livrables/demo-appel/` (construit séparément) ; ne proposer la visio dans les réponses que s'il est terminé et testé par vous.
- Les contrôles SIREN et TVA des prospects viendront plus tard : la prospection n'en a pas besoin.
