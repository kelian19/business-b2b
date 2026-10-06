# verif_registre : vérification de tiers au registre public

Outil facultatif en ligne de commande, lancé par le consultant (pas par le client) avant l'import dans l'application Équerre. Il compare un CSV de tiers (clients, fournisseurs) au registre public des entreprises et écrit un nouveau CSV à réimporter.

## Un seul outil

`verif_registre.py` est l'unique outil de vérification au registre du projet. Le guide de livraison (`livrables/outil-equerre/GUIDE-LIVRAISON.md`, étape 4) décrit son usage. Le cache est à supprimer en fin de mission, et un fichier produit ne se remet pas à un client sans l'avoir relu.

## Confidentialité : à lire avant d'utiliser

- Seuls les **SIREN** sont envoyés à l'API publique `recherche-entreprises.api.gouv.fr`. Aucun nom, adresse, montant ni facture ne quitte le poste.
- L'API reçoit toutefois l'adresse IP du poste et la liste des SIREN consultés. **N'utilisez l'outil qu'avec l'accord du client** : l'option `--accord-client` est obligatoire pour lancer une vraie vérification.
- Le cache local (`registre_cache.json`) contient des données publiques du registre pour les SIREN consultés. Supprimez-le en fin de mission si le client le demande.

## Installation

Python 3.8 ou plus récent, aucune dépendance (bibliothèque standard uniquement).

## Utilisation

```
python verif_registre.py tiers.csv --dry-run                 # simule : aucun appel, aucun fichier écrit
python verif_registre.py tiers.csv --accord-client           # écrit tiers_verifie.csv
python verif_registre.py tiers.csv -o resultat.csv --accord-client
```

Le CSV d'entrée doit avoir une colonne `siren` (variantes reconnues : `n_siren`, `numero_siren`, etc.). À défaut, les 9 premiers chiffres d'une colonne `siret` sont utilisés. Séparateur (`;` `,` tabulation `|`) et encodage (UTF-8, Windows-1252, Latin-1) sont détectés. Les colonnes `nom`, `adresse`, `code_postal`, `ville` (ou `raison_sociale`, `cp`...) servent à l'indicateur d'écart ; au besoin, `--col-siren`, `--col-nom`, `--col-adresse`, `--col-code-postal`, `--col-ville` désignent les colonnes.

Le fichier de sortie est en UTF-8 avec BOM (ouvre correctement dans Excel), avec le même séparateur. Il refuse d'écraser un fichier existant sans `--force`. Les colonnes d'origine sont conservées. L'étape 2 de l'application Équerre lit directement ce fichier (zone « vérification au registre ») : les lignes sans vérification y sont affichées « Non vérifié » et ne sont jamais comptées comme vérifiées.

### Options utiles

| Option | Rôle |
|---|---|
| `--dry-run` | Compte les SIREN valides, ceux déjà en cache, les requêtes à faire et la durée minimale estimée. Rien n'est envoyé ni écrit : aucun fichier n'est produit, donc rien à importer. |
| `--cadence N` | Requêtes par seconde, 5 au plus (valeur par défaut). |
| `--reprises N` | Réessais par SIREN en cas d'erreur (3 par défaut, attente 1 s, 2 s, 4 s ; `Retry-After` respecté). |
| `--max-echecs N` | Arrêt après N SIREN consécutifs en échec (5 par défaut). |
| `--cache FICHIER`, `--sans-cache`, `--ttl-jours N` | Cache local (30 jours par défaut). |
| `--journal FICHIER` | Copie le journal dans un fichier. `-v` pour le détail. |

Codes de sortie : 0 tout est traité, 1 certains SIREN n'ont pas pu être vérifiés (relancer : le cache évite de refaire les autres), 2 erreur d'usage, 130 interruption (cache enregistré).

## Débit réel

- Les requêtes partent **une par une**, avec **au moins 0,2 seconde entre deux envois** (1 divisé par 5) : **5 requêtes par seconde au plus**, reprises après erreur comprises. Le plafond n'est pas contournable (`--cadence` refuse une valeur supérieure à 5). Vérifiez la limite de débit en vigueur dans la documentation publique de l'API avant un gros fichier.
- Durée : au mieux 0,2 seconde par SIREN à interroger, soit environ 3 minutes 20 secondes pour 1 000 SIREN, davantage si le service répond lentement ou refuse (reprises espacées de 1 s, 2 s, 4 s). Les SIREN déjà en cache ne sont pas interrogés. `--dry-run` affiche le nombre de requêtes et cette durée minimale.

## Colonnes ajoutées

| Colonne | Contenu |
|---|---|
| `etat_administratif` | Code de l'API : `A` active, `C` cessée. |
| `nom_registre` | Nom de l'entreprise au registre. |
| `adresse_registre` | Voie du siège social (sans code postal ni ville). |
| `code_postal_registre`, `ville_registre` | Code postal et commune du siège. |
| `naf_registre` | Activité principale (code NAF). |
| `date_verification` | Date de la consultation (celle du cache si la réponse en vient). |
| `ecart_registre` | `oui` si le nom ou l'adresse du fichier diffère du registre, `non` sinon, vide si rien n'était comparable. |
| `ecart_detail` | Éléments qui diffèrent : `nom`, `code_postal`, `ville`, `adresse`. |
| `statut_verification` | `ok` (le registre a répondu : seule valeur « vérifiée » avec `introuvable`), `introuvable` (le registre ne connaît pas ce SIREN), et, sans vérification : `non_diffusible`, `siren_invalide`, `siren_vide`, `erreur_api`, `non_verifie` (SIREN non interrogé, par exemple après un arrêt sur échecs consécutifs). |

Si le fichier d'entrée contient déjà ces colonnes (seconde passe), elles sont remplacées, pas dupliquées.

## Limites

- **L'écart est un signal à vérifier, pas une erreur avérée.** L'adresse du registre est celle du siège ; un tiers facturé à l'adresse d'un établissement sera signalé. La comparaison des noms est une heuristique (forme juridique et mots vides ignorés, ordre des mots ignoré, nom inclus dans l'autre accepté, ressemblance de 85 % ou plus) : elle peut manquer un écart ou en signaler à tort.
- Un SIREN « valide » respecte le format et la clé de contrôle ; c'est l'API qui dit s'il existe. Un SIREN à 8 chiffres (zéro initial perdu par Excel) est signalé invalide, il n'est pas corrigé automatiquement.
- Les entreprises non diffusibles ne renvoient pas leurs données : statut `non_diffusible`.
- Le registre est une source publique mise à jour avec un délai ; la date de vérification est donc à conserver.
- L'outil ne vérifie ni le SIRET ni la TVA intracommunautaire auprès de l'API (ces contrôles de format sont dans l'application).
- Le format de la réponse a été vérifié par un unique appel réel pendant le développement ; l'API publique peut évoluer. L'outil limite lui-même sa cadence à 5 requêtes par seconde, l'API peut néanmoins répondre 429 en cas de forte charge (reprise automatique).
- Messages du journal sans accents, pour éviter les problèmes d'affichage des consoles Windows.

## Tests

```
python -m unittest discover -s livrables/registre-cli/tests
```

Les tests utilisent une API simulée ; tout appel réseau réel y est bloqué.
