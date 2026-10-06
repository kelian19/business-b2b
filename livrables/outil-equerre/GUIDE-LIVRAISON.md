# Guide de livraison : procédure pour un client, de A à Z

Public : le consultant qui prépare un dossier Équerre pour un client (PME de 20 à 249 salariés, ou cabinet comptable). Cette procédure n'est pas à transmettre telle quelle au client. L'outil est local : il s'ouvre par double-clic sur `index.html` et n'envoie rien.

Principes : travailler sur un export sans noms de contacts ; ne jamais prendre de capture d'écran avec des données réelles ; ne promettre ni gain ni conformité ; toute valeur chiffrée de l'outil est une estimation ou une hypothèse affichée comme telle. L'outil ne constitue pas un conseil fiscal ni juridique.

## 1. Avant de commencer

- Faire valider par le client l'envoi des exports et le cadre de la mission (par écrit).
- **RGPD** : si les fichiers peuvent contenir des personnes physiques (entrepreneurs individuels, contacts nominatifs), prévoir un contrat de sous-traitance au sens de l'article 28 avant de recevoir les fichiers. Demander des exports sans colonnes de contacts (téléphone, e-mail, nom de la personne).
- Préparer un espace protégé pour les fichiers du client (dossier chiffré, accès limité). Rien n'est envoyé par l'outil, mais les fichiers reçus et les `.equerre.json` enregistrés restent sur votre disque.

## 2. Collecte des exports (avec les modèles CSV)

Transmettre au client les modèles CSV, téléchargeables depuis chaque zone d'import de l'outil (ouvrir « Dossier », créer un dossier, puis « Télécharger le modèle CSV vide ») :

| Fichier | Modèle | Usage |
|---|---|---|
| Fichier tiers (clients et fournisseurs) | `modele-fichier-tiers.csv` | Obligatoire. Colonnes principales : `type`, `nom`, `siren`, `siret`, `tva`, adresse et adresse de livraison |
| Export des factures de vente | `modele-export-factures.csv` | Recommandé : permet la part du CA à risque, la trésorerie et le reporting. Obligatoires : client, date d'émission, montant HT, et le statut de paiement **ou** le solde restant dû (payée si le solde est nul). La date d'échéance est facultative : sans elle, l'ancienneté des impayés n'est pas évaluable. La colonne `siren_client` est facultative et rend le rapprochement exact |
| Export des lignes de factures | `modele-lignes-de-factures.csv` | Facultatif : contrôle automatique de la présence des 4 nouvelles mentions dans les données |
| Vérification au registre | `modele-verification-registre.csv` | Produit par vous (étape 4 de cette procédure), pas par le client |

Le guide « exporter en CSV depuis Excel ou votre logiciel » est dans l'outil (zone d'import). Si le client envoie un `.xlsx`, lui demander « Enregistrer sous > CSV » : l'outil refuse les fichiers qui ne sont pas du texte.

## 3. Import dans l'outil

1. Ouvrir `index.html`, bouton « Dossier », **créer un dossier client** (raison sociale, secteur, taille, logo si le client le fournit). Le bandeau passe à « Dossier client : données confidentielles, traitées uniquement dans ce navigateur ».
2. Importer chaque fichier dans l'étape prévue : tiers (étape 2), lignes de factures (étape 3), export des factures (étape 4). Pour chaque import : lire l'aperçu, vérifier la reconnaissance des colonnes (corriger à la main si besoin), lire le rapport d'import (lignes ignorées et raisons), confirmer.
3. Si l'import échoue, lire le message : fichier vide, séparateur non reconnu, colonnes manquantes, accents mal encodés (essayer l'enregistrement en UTF-8), fichier binaire. Corriger côté client ou dans le tableur, ne jamais modifier les données au hasard.
4. **Enregistrer le dossier** (`.equerre.json`) après chaque étape importante ; lire l'avertissement avant le téléchargement.

Lire aussi les points d'attention du rapport d'import : guillemet non refermé dans le fichier, montants à un seul séparateur (1.234 lu comme 1,234), paiements datés avant l'émission, factures postérieures à la date de référence, SIREN non vérifiés. Les dates à deux chiffres d'année (05/01/26) sont lues 2000 à 2069 pour 00 à 69, 1970 à 1999 pour 70 à 99.

Ne pas faire d'import pendant un partage d'écran.

## 4. Vérification au registre (outil en ligne de commande)

Cette étape est la seule qui utilise le réseau, et seulement avec l'outil en ligne de commande, jamais avec l'application web. Elle n'envoie que des SIREN (jamais de noms ni d'adresses), avec l'adresse IP de votre poste.

1. Obtenir l'accord du client pour cette consultation.
2. Essayer d'abord sans réseau : `python livrables/registre-cli/verif_registre.py tiers.csv --dry-run`. L'essai n'appelle pas le registre et **n'écrit aucun fichier** : il affiche le nombre de SIREN valides, ceux déjà en cache et le nombre de requêtes à envoyer, avec la durée minimale.
3. Lancer la vérification : `python livrables/registre-cli/verif_registre.py tiers.csv --accord-client` (écrit `tiers_verifie.csv` ; `--accord-client` confirme l'accord du client). Les requêtes partent une par une, **5 par seconde au plus** (au moins 0,2 seconde entre deux envois) : environ 3 minutes 20 secondes pour 1 000 SIREN, davantage si le service est lent. Un cache local (`registre_cache.json`) permet de reprendre après une interruption ; en cas de SIREN non vérifiés (code de sortie 1), relancer.
4. Importer `tiers_verifie.csv` tel quel dans l'étape 2 de l'outil (zone « vérification au registre ») : l'outil lit les colonnes `siren`, `statut_verification`, `etat_administratif`, `nom_registre`, `adresse_registre`, `code_postal_registre`, `ville_registre` et `date_verification`. Seuls les statuts `ok` et `introuvable` sont des réponses du registre. Les écarts (entreprise cessée, nom ou adresse différents, SIREN introuvable) sont signalés « à vérifier » : ils ne corrigent jamais rien automatiquement. Les lignes `non_diffusible`, `siren_invalide`, `siren_vide`, `erreur_api`, `non_verifie` (ou au statut absent ou inconnu) sont comptées dans le rapport d'import et affichées « Non vérifié », sans date de vérification ni comparaison : relancer la commande pour les reprendre. Le détail des options est dans `livrables/registre-cli/README.md`.
5. Supprimer le cache local en fin de mission si le client le demande : `registre_cache.json`, à côté du fichier de tiers, ainsi que les fichiers `*_verifie.csv` produits.

## 5. Revue des corrections (étape 2)

- Passer en revue le tableau : filtrer par type d'anomalie, ouvrir la fiche, lire « valeur actuelle → correction proposée ».
- **Calculée** : la correction vient de la ligne (clé de TVA recalculée, code postal sur 5 chiffres). **À vérifier** : à confirmer auprès du client ou au registre. L'outil n'invente jamais de SIREN.
- Pour chaque ligne : accepter, refuser ou modifier. Tout est journalisé ; le fichier d'origine n'est jamais écrasé.
- Exporter le **fichier fiabilisé** (CSV) et le **journal des corrections** ; les remettre au client avec la liste des points « à vérifier ».

## 6. Modèles de factures et organisation

- Étape 3 : créer un modèle par modèle de facture du client (jusqu'à cinq), contrôler les 4 nouvelles mentions et noter la preuve (par exemple le numéro de la facture examinée) et une note. La liste de mentions courantes est non exhaustive : c'est un contrôle de présence, pas un avis de conformité. « Sans objet » pour l'adresse de livraison quand elle ne diffère pas de l'adresse de facturation.
- Étape 1 : faire répondre aux quatre questions d'organisation (plateforme choisie, responsable désigné, logiciel prêt, procédure de mise à jour) avec le client, et noter les dates cibles internes choisies par lui. Ce ne sont pas des échéances réglementaires.
- Compléter le plan d'action : responsable, statut, échéance. Les statuts ne changent pas l'indice.

## 7. Version, rapport et PDF

1. « Dossier » > « Enregistrer une version » (nom clair, par exemple « Avant correction » puis « Livraison »).
2. Étape 5 : vérifier le nom d'entreprise, la date de situation, la version.
3. « Imprimer / enregistrer en PDF » : choisir « Enregistrer au format PDF », activer « Graphiques d'arrière-plan ». Relire les 6 pages environ : couverture, synthèse de direction (une page), plan d'action, annexes A à D.
4. Relire les chiffres : indice (estimation), exposition (estimation, ne constitue pas un conseil fiscal), efforts (estimations). Aucune promesse de gain.

## 8. Remise

- Remettre : le rapport PDF, le fichier tiers fiabilisé, le journal des corrections, le plan d'action (CSV) et, si convenu, le `.equerre.json`.
- Transmettre par un canal protégé choisi avec le client. Ne jamais envoyer de captures d'écran contenant des données réelles.
- Présenter les résultats comme des constats et des estimations, jamais comme un engagement de résultat.

## 9. Suppression des données

- **Chez vous** : à la fin de la mission (ou à la date convenue), supprimer les exports reçus, les `.equerre.json`, les CSV produits, le cache du registre (`registre_cache.json`) et les PDF intermédiaires ; vider la corbeille. Dans l'outil : « Effacer toutes les données de cette session », puis fermer l'onglet. Confirmer la suppression par écrit au client.
- **Chez le client** : lui demander de supprimer de son côté les exports déposés (messagerie, partages) une fois la mission terminée, et de conserver le rapport dans un espace protégé.
- Mode cabinet : si plusieurs dossiers ont été chargés, « Effacer toutes les données de cette session » avant de changer de client.

## 10. Contrôle avant remise (liste courte)

- Le bandeau indique le bon mode ; le rapport affiche « Dossier client : données confidentielles » en pied de page.
- Aucune valeur d'exemple de la démonstration ne figure dans le rapport (nom, SIREN, montants).
- Les estimations sont étiquetées ; aucune promesse de gain ni de conformité ; aucun prix n'apparaît dans l'outil ni dans le rapport (le prix figure dans la proposition commerciale, jamais dans l'outil).
