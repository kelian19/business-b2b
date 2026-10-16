# Flow Inbox : démonstration locale

Démonstration client d'un outil qui organise les demandes reçues par e-mail dans une agence de communication et de web (agence fictive), prépare des brouillons de réponse à relire et signale les demandes restées sans réponse. **Tout est fictif** : l'agence, les personnes, les e-mails (adresses en `.example`) et les chiffres. **Rien n'est envoyé, rien n'est enregistré.**

## Ouvrir

Double-cliquez sur `index.html` (aucun serveur, aucune installation, aucune connexion : l'outil ne fait aucune requête réseau et n'utilise que les polices du système). Un rechargement de la page remet la démonstration à zéro.

Navigateur récent conseillé (Chrome, Edge, Firefox, Safari). JavaScript doit être activé.

## Parcours conseillé (5 à 7 minutes)

1. **Tableau de bord** (écran d'ouverture) : quatre repères, dont le chiffre rouge (demandes sans réponse au-delà du délai) ; « Rien n'a été envoyé automatiquement ».
2. **Boîte de réception** : tous les messages, catégories en toutes lettres.
3. **Une demande type** (`m01`) : texte surligné, six informations relevées, passage relié au survol et au clavier.
4. **Un cas ambigu** (`m04`) et **une information absente** (`m02`) : l'outil ne devine pas, la personne tranche.
5. **Brouillon** (`m02`) : redemande le budget et le délai absents ; modifiable ; aucun bouton d'envoi.
6. **Tableau de suivi** puis **Relances** ; ouvrir le **Rapport** de la semaine.
7. **Essayer avec un e-mail fictif** : coller un texte, voir ce qui est relevé et ce qui reste absent.

La **visite guidée** (bouton « Visite guidée » ou touche `V`) enchaîne ces sept étapes. Le script de présentation est dans `script-demo.md`.

## Raccourcis

| Touche | Action |
|---|---|
| `1` à `7` | Écrans : tableau de bord, boîte, suivi, relances, rapport, essai, comment ça marche |
| `8` | Paramètres |
| `F` | Mode présentation (plein écran, textes plus grands, éléments secondaires masqués ; le bandeau « données fictives » reste) |
| `V` | Visite guidée en 7 étapes |
| `P` | Ouvrir le rapport, focus sur « Imprimer » |
| `?` | Aide : raccourcis et glossaire |
| `Échap` | Ferme la bulle d'un graphique, un panneau d'aide, l'aide, la visite ; quitte le mode présentation |
| Flèches | Dans un graphique : passer d'une barre à l'autre (la bulle s'affiche au focus) |

Les raccourcis sont désactivés pendant une saisie dans un champ.

## Imprimer le rapport

Écran **Rapport** (touche `P`) : choisir la semaine, puis « Imprimer / enregistrer en PDF ». Format A4, trois feuilles (page de garde, synthèse, demandes à relancer et points de vigilance). Dans la fenêtre d'impression, destination « Enregistrer au format PDF » ; décocher « En-têtes et pieds de page » du navigateur pour ne garder que le pied de page du rapport (« Données fictives de démonstration »). La situation de chaque semaine est reconstituée à sa clôture ; la dernière semaine s'arrête à la date de référence.

## Ce que l'outil montre

- **Date de référence fixe** : vendredi 23 octobre 2026, 17 h 30. Tous les calculs en partent, jamais de l'horloge de l'ordinateur.
- **Indicateurs** (tableau de bord, rapport) : calculés sur les données fictives ; ce ne sont pas des mesures de performance. Les budgets sont **déclarés par les prospects, non garantis** : on montre un minimum et un maximum déclarés, jamais un total unique ; les « à partir de » sont comptés à part ; les montants par mois, par an ou par unité ne s'additionnent pas aux montants ponctuels.
- **Relevé** : six informations par e-mail (besoin, service, budget, délai, entreprise, contact), chacune relevée, absente ou à vérifier, avec le passage exact du message.
- **Essai** : relevé par **règles simples de démonstration** (montants en euros, dates, mots du catalogue). La version réelle s'appuierait sur un modèle de langage avec relecture humaine ; ce comportement n'est pas démontré ici.

## Limites

- Démonstration : aucune boîte réelle lue, aucun modèle d'IA, aucun tableur écrit, aucun message envoyé. Les relevés des 47 e-mails fournis sont préparés à l'avance et vérifiés par les tests ; ils ne mesurent aucune précision.
- Les e-mails sont écrits pour la démonstration : ils sont plus nets que beaucoup de vrais messages. Le pilote devrait être jugé sur des cas réels, avec l'accord de l'agence.
- Texte des e-mails uniquement ; pièces jointes signalées, jamais lues ; liens non suivis ; une langue principale ; jours ouvrés du lundi au vendredi, sans jours fériés.
- Aucun prix, aucune date de mise à disposition, aucun résultat attendu n'est indiqué dans l'outil.

## Fichiers

- `index.html`, `styles/`, `js/` : application (scripts classiques, sans module ; `js/core/` logique testée sans navigateur, `js/ui/` interface, `js/views/` un fichier par écran, `js/data.js` données fictives).
- `tests/` : `node tests/run-tests.js` (code 0 si tout passe) : données, relances, brouillons, CSV, indicateurs, rapport, essai (plus de 70 cas), contrastes AA, contrôles statiques.
- `CONCEPTION.md` : spécification, scénario et critères d'acceptation. `script-demo.md` : déroulé de la visio.
