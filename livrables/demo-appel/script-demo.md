# Script de démonstration en visio (démo de 5 à 6 minutes, puis 2 à 3 minutes de questions)

Outil : `index.html` (double-clic, hors ligne). Public : DAF ou responsable administratif d'une PME, ou expert-comptable. Tout ce qui est affiché est fictif ; ce que l'on promet, c'est une méthode et un livrable, jamais un résultat.

## Avant l'appel (2 minutes, hors durée de la démo)

- Ouvrir `index.html` dans le navigateur, onglet « Fichier clients et fournisseurs », fenêtre de 1280 px de large ou plus, sans zoom ; passer le navigateur en plein écran.
- Fermer les autres onglets, les notifications et les e-mails. Ne rien ouvrir qui contienne des données de vrais clients.
- Partager l'onglet du navigateur, pas tout l'écran.
- Ne pas charger de fichier réel du prospect pendant le premier appel (voir l'objection « et si on essayait avec mon fichier ? »).
- Repères : le bandeau rouge « Données fictives de démonstration » reste visible en permanence ; le dire à voix haute une fois. Si vous chargez un fichier réel, le texte du bandeau change (« Démonstration : votre fichier est affiché »).

## Déroulé

### 0. Ouverture (30 secondes)

**Dire** : « Je vous montre un outil de démonstration sur des données entièrement fictives, pour illustrer ce que je fais. Rien de votre entreprise n'apparaît. L'objectif : voir si cela répond à un vrai sujet chez vous. Je vous pose quelques questions après. »

### 1. Le contexte, en une phrase (30 secondes)

**Dire** : « Depuis le 1er septembre 2026, vous devez pouvoir recevoir des factures électroniques et 4 mentions sont obligatoires sur les factures entre entreprises assujetties. Pour les PME, l'émission devient obligatoire le 1er septembre 2027. Mon travail porte sur ce qui précède la plateforme : vos données et vos modèles de factures. Je ne vends aucune plateforme. »

**Ne pas dire** : un montant d'amende présenté comme une certitude pour eux, ni « vous risquez ». Si on demande : « il est prévu 50 € par facture non émise sous forme électronique quand c'est obligatoire, plafonné à 15 000 € par année civile ; votre expert-comptable vous dira ce qui s'applique à vous. »

### 2. Onglet « Fichier clients et fournisseurs » (1 minute 30)

**Montrer** :
1. Le bloc « Lignes sans anomalie » (« 20 lignes sur 40 sans anomalie »). **Dire** : « Ce chiffre est un exemple sur un fichier fictif où j'ai volontairement injecté des erreurs. Il ne dit rien sur le vôtre. »
2. Les pastilles de filtre : cliquer sur « SIREN manquant ». **Dire** : « Le SIREN du client fait partie des 4 nouvelles mentions. Il vient de votre fichier clients. »
3. La première ligne dépliée, puis « Doublon possible » (deux fiches pour un même tiers) et « TVA incohérente » (le numéro de TVA se recalcule à partir du SIREN).
4. « Adresse de livraison différente » : **dire** « c'est une note, pas une erreur : cette adresse doit apparaître sur la facture quand elle diffère de la facturation ».
5. Le bouton « Exporter les anomalies (CSV) » : « Vous repartez avec une liste à corriger, ligne par ligne. »

**Transition** : « Ce fichier alimente vos factures. Regardons ce que cela donne sur une facture. »

### 3. Onglet « Mentions des factures » (1 minute)

**Montrer** : la facture 2 (SIREN client et nature de l'opération absents ; le SIREN existe dans le fichier clients mais n'a pas été repris sur la facture) : la fiche à gauche, la liste cochée à droite, avec « Manquant » en rouge et l'explication. Puis la facture 3 en dix secondes (livraison ailleurs non indiquée, mention d'option TVA absente, signalée « À vérifier » car elle ne concerne que les entreprises qui ont opté).

**Dire** : « Je contrôle 3 de vos modèles de factures de cette façon. La liste de mentions courantes est non exhaustive : c'est un contrôle de présence, pas un avis de conformité. »

**Transition** : « Une fois les données propres, on peut aussi s'en servir pour piloter. »

### 4. Onglet « Reporting mensuel » (45 secondes)

**Montrer** : les cartes (CA HT, encours, échues, délai moyen), le graphique mensuel, le tableau des 5 premiers clients, les factures échues par ancienneté.

**Dire** : « Ce reporting se construit à partir d'un simple export de factures. C'est une autre utilisation, optionnelle. Ce qui m'intéresse d'abord, c'est de savoir si votre fichier tiers et vos modèles de factures sont prêts. » Éviter de commenter les chiffres comme s'ils étaient réels ; ils sont fictifs.

Option : « Imprimer / enregistrer en PDF » en haut à droite, pour montrer le format d'un rapport remis.

### 5. Confidentialité et limites (20 secondes)

**Dire** : « Sur ma démo, un fichier chargé reste dans le navigateur, rien n'est envoyé. Pour une vraie prestation, je travaille sur un export sans noms de contacts, avec un contrat de sous-traitance si le fichier contient des entrepreneurs individuels, et je supprime les fichiers après la livraison. Dans la démo, un SIREN « valide » veut dire clé de contrôle correcte ; la vérification au registre fait partie de la prestation. »

### 6. Questions de découverte (2 à 3 minutes)

Poser au plus 3 ou 4 questions selon le déroulé de la conversation, noter les réponses mot pour mot dans `prospection/suivi.md`.

1. **Volume** : « Environ combien de factures émettez-vous par mois, et combien de clients et fournisseurs dans votre fichier ? »
2. **Logiciel** : « Quel logiciel de facturation ou de gestion utilisez-vous ? Pouvez-vous en exporter le fichier tiers ? »
3. **Plateforme** : « Avez-vous déjà choisi une plateforme de facturation électronique, ou est-ce encore ouvert ? »
4. **État du fichier tiers** : « À quand remonte le dernier nettoyage de votre fichier clients ? Savez-vous si les SIREN sont renseignés ? »
5. **Qui s'en occupe** : « Qui s'occupe de ce sujet chez vous, et qui décide ? »
6. **Échéance** : « Avez-vous une date interne pour être prêts avant le 1er septembre 2027 ? »

### 7. Clôture (30 secondes)

- Si l'intérêt est réel : « Je peux faire un diagnostic gratuit sur 50 lignes de votre fichier (export sans noms de contacts) : vous jugez sur pièces. » (offre de lancement : hypothèse à confirmer avant de la proposer ; voir `livrables/offre/offre-v2-efacture.md`).
- Si l'intérêt est faible : demander simplement pourquoi (déjà traité, pas la priorité, mauvais interlocuteur, trop cher) et le noter.
- Ne pas annoncer de prix ferme : les prix du dossier sont des hypothèses non validées.

## Réponses honnêtes aux objections

| Objection | Réponse |
|---|---|
| « Mon logiciel ou ma plateforme fera ça. » | « C'est possible, et je ne vends aucune plateforme. Je ne sais pas ce que le vôtre contrôle : demandez-lui s'il vérifie les SIREN, les doublons et vos modèles de factures. Si oui, vous n'avez pas besoin de moi. » |
| « Je peux chercher les SIREN gratuitement. » | « Oui, la recherche d'un SIREN est gratuite avec les bases publiques. Vous payez le temps de le faire sur tout le fichier, les cas ambigus et le contrôle de vos modèles de factures. Si votre fichier est petit, faites-le vous-même. » |
| « Qu'est-ce que vous garantissez ? » | « Je ne garantis ni la conformité ni l'absence d'amende, et je ne donne pas de conseil fiscal ou juridique. Je livre une liste de points à corriger ; la décision vous revient, avec votre expert-comptable. » |
| « Combien de temps ou d'argent cela me fait gagner ? » | « Je ne peux pas vous donner de chiffre avant d'avoir vu votre fichier. Les chiffres de la démo sont fictifs. » |
| « C'est trop tôt, c'est pour septembre 2027. » | « Possible. La réception est déjà obligatoire depuis septembre 2026 et les 4 mentions s'appliquent déjà. À vous de juger de la priorité ; je peux revenir plus tard. » |
| « Qui êtes-vous ? Quelles références ? » | « Une structure en cours de création, portée par deux associés : un data scientist formé à l'ENSAE Paris et un·e associé·e formé·e à l'ESSEC. Je n'ai aucun client de référence à ce jour, c'est pourquoi je propose de juger sur pièces avec un diagnostic limité. » |
| « C'est combien ? » | « Je n'ai pas encore arrêté mes tarifs : je préfère d'abord voir votre fichier. Le diagnostic sur 50 lignes permet de juger sans engagement. » (offre de lancement : hypothèse à confirmer avant de la proposer) |
| « Pourquoi pas mon expert-comptable ? » | « Vous pouvez tout à fait lui confier le sujet. Ma prestation prépare vos données et vos modèles de factures ; la décision et le conseil restent les siens. » |
| « Mes données sont-elles en sécurité ? » | « Je travaille sur un export, sans accès à votre logiciel, sans noms de contacts. Contrat de sous-traitance si des entrepreneurs individuels sont concernés, suppression des fichiers après livraison avec confirmation. Dans la démo, rien n'est envoyé. » |
| « Pouvez-vous le faire sur mon fichier maintenant ? » | « Pas en direct : je préfère vous demander un export sans noms de contacts et vous répondre par écrit. » (Si vous chargez un fichier en direct, le prospect voit ses données à l'écran et le partage d'écran peut être enregistré : à éviter au premier appel.) |
| « Et la validité d'un SIREN, c'est suffisant ? » | « Non : un numéro peut avoir une clé correcte sans que l'entreprise existe. Le contrôle au registre est dans la prestation, pas dans la démo. » |

> **Notes internes (ne pas dire)** : (1) nom, statut et rôle de l'associé·e ESSEC à confirmer avant le premier appel ; ne rien annoncer sur lui ou elle tant que ce n'est pas confirmé. (2) Ne pas dire « micro-entreprise » tant que le statut juridique n'est pas décidé : une micro-entreprise n'a pas d'associé. (3) Le diagnostic gratuit et les prix sont des hypothèses non validées.

## Variante expert-comptable

- Rester sur les 3 mêmes onglets, insister sur l'onglet « Fichier clients et fournisseurs » et l'export CSV.
- Proposition possible : préparer le fichier tiers et le contrôle des 3 modèles de factures de ses clients PME, en sous-traitance ; le cabinet garde la relation et le conseil. Chaîne de sous-traitance RGPD à faire valider par un juriste avant la première mission ; tarif non fixé.
- Question utile : « Combien de vos clients vous ont déjà posé la question de la facture électronique, et comment y répondez-vous aujourd'hui ? »

## Après l'appel

- Noter dans `prospection/suivi.md` : date, interlocuteur, réponses aux questions 1 à 5, objections entendues, prochaine étape.
- Ne rien envoyer sans validation préalable.
