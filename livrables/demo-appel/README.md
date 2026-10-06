# Démonstration Équerre : facture électronique et reporting

Outil à montrer en visio (partage d'écran) à un DAF de PME ou à un expert-comptable. Il fonctionne hors ligne, sans installation, sur données entièrement fictives. Le nom « Équerre » n'est pas encore vérifié (INPI, nom de domaine).

## Ouvrir l'outil

Double-cliquez sur `index.html` (ouverture en `file://`, aucun serveur nécessaire). Navigateurs récents (Chrome, Edge, Firefox, Safari). L'outil n'envoie aucune requête réseau : pas de CDN, pas de police distante.

Trois onglets, navigables au clavier (flèches gauche et droite, Début, Fin) :

1. **Fichier clients et fournisseurs** : part de lignes sans anomalie, tableau filtrable par type d'anomalie, détail en français simple, export CSV des anomalies.
2. **Mentions des factures** : trois factures fictives, avec les 4 nouvelles mentions (SIREN du client, adresse de livraison si différente, nature de l'opération, option TVA d'après les débits) et une liste de mentions courantes (liste non exhaustive).
3. **Reporting mensuel** : cartes d'indicateurs, graphique du CA HT mensuel, 5 premiers clients, factures échues par ancienneté (1-30, 31-60, plus de 60 jours).

Le bouton « Imprimer / enregistrer en PDF » ouvre l'impression du navigateur (feuille de style d'impression dédiée : seul l'onglet affiché est imprimé).

## Charger votre propre fichier

Dans les onglets 1 et 3, « Charger votre propre fichier (CSV) » lit le fichier avec le navigateur (FileReader). **Le fichier reste dans votre navigateur, rien n'est envoyé.** Un fichier chargé n'est pas conservé : fermer ou recharger la page l'efface. Le bandeau (dont le texte change) et l'indicateur de source signalent qu'un fichier réel est affiché ; pendant un partage d'écran, évitez de charger un fichier contenant des données de tiers.

Les boutons « Télécharger le modèle CSV vide » donnent les en-têtes attendus.

### Format du fichier clients et fournisseurs

Séparateur `;` ou `,` (détecté), encodage UTF-8 ou Windows (détecté), première ligne = en-têtes. Colonnes obligatoires : `nom`, `siren`. Les autres sont facultatives ; si une colonne manque, le contrôle correspondant n'est pas réalisé (un message l'indique).

| Colonne | Contenu |
|---|---|
| `type` | `client` ou `fournisseur` (les doublons ne sont cherchés qu'au sein d'un même type) |
| `nom` | raison sociale |
| `siren` | 9 chiffres (espaces, points et tirets tolérés) |
| `siret` | 14 chiffres |
| `tva` | numéro de TVA intracommunautaire (France : `FR` + 2 chiffres de clé + SIREN) |
| `adresse`, `code_postal`, `ville` | adresse de facturation |
| `pays` | `FR` par défaut (`FR`, `FRA`, `France` ou vide = France) ; pour un autre pays, les contrôles SIREN, SIRET et TVA français sont ignorés |
| `livraison_adresse`, `livraison_code_postal`, `livraison_ville` | adresse de livraison si elle diffère |

Des alias courants sont reconnus (`raison sociale`, `n° siren`, `cp`, `commune`, `adresse de livraison`...).

Contrôles : SIREN manquant ou invalide (9 chiffres + algorithme de Luhn), SIRET incohérent (14 chiffres + Luhn, doit commencer par le SIREN), TVA française incohérente (clé = (12 + 3 × (SIREN mod 97)) mod 97), adresse incomplète (code postal à 5 chiffres pour la France), doublons (même SIREN, ou même nom normalisé et même code postal), adresse de livraison différente (note, hors score).

### Format de l'export de factures

Colonnes obligatoires : `client`, `date_emission`, `date_echeance`, `montant_ht`, `statut`. Facultatives : `numero`, `montant_ttc`, `date_paiement`.

- Dates : `AAAA-MM-JJ` ou `JJ/MM/AAAA`.
- Montants : `1234.56`, `1 234,56`, `1.234.567` ; suffixe EUR et parenthèses (négatif) tolérés. Cas ambigu : `1.234` ou `1,234` est lu 1,234 (et non 1234).
- `statut` : `payée` (ou `payee`, `oui`, `réglée`, `paid`...) ; toute autre valeur = non payée.
- Le CA est le total HT de toutes les factures émises. L'encours et les factures échues sont en TTC (en HT pour une ligne sans TTC, signalé). L'ancienneté se calcule à la « date de référence » (modifiable ; aujourd'hui pour un fichier chargé, 06/10/2026 pour les données fictives).
- Délai moyen de paiement : de l'émission au paiement, sur les factures payées avec date de paiement. « Payées en retard » : paiement après l'échéance.

## Données fictives

`data.js` contient des données déterministes (les mêmes à chaque ouverture) : environ 40 tiers avec des anomalies injectées, 3 factures, 150 factures sur 12 mois et 10 clients. Les noms d'entreprises sont inventés. **Les SIREN sont générés pour la démo et ne correspondent pas aux entreprises affichées** (un numéro généré pourrait coïncider par hasard avec celui d'une entreprise réelle, sans aucun lien).

## Limites

- **Pas de vérification au registre** : un SIREN « valide » a 9 chiffres et une clé de Luhn correcte, ce qui ne prouve pas que l'entreprise existe. La vérification au registre fait partie de la prestation, pas de la démo.
- Contrôle de présence des mentions seulement, avec une liste courante non exhaustive : cela ne constitue pas un conseil fiscal ou juridique et ne garantit aucune conformité.
- Les montants du reporting sont ceux de votre export : aucun gain, économie ou résultat n'est promis.
- Taille de fichier limitée à 10 Mo ; 300 lignes affichées à l'écran dans le tableau des tiers (l'export CSV contient toutes les anomalies).
- Le graphique affiche au plus les 24 derniers mois.
- Mise en page vérifiée par lecture du code et par tests de logique ; une vérification visuelle dans un navigateur reste à faire (1280-1920 px et 390 px).

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html`, `styles.css`, `app.js` | interface (scripts classiques, polices système) |
| `logic.js` | toute la logique, sans DOM (UMD : `module.exports` ou `EquerreLogic`) |
| `data.js` | données fictives (UMD : `module.exports` ou `EquerreData`) |
| `tests/run-tests.js` | tests Node |
| `script-demo.md` | déroulé (5 à 6 minutes de démo, puis 2 à 3 minutes de questions), questions de découverte, objections |

## Tests

```
node livrables/demo-appel/tests/run-tests.js
```

Affiche le nombre de tests réussis et sort en code 0 s'ils passent tous.
