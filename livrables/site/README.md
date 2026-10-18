# Page vitrine locale (non publiée)

Fichiers : `index.html`, `styles.css`, `mentions-legales.html`. Aucune dépendance externe, aucun script, aucun formulaire, aucun traceur. Les deux pages portent `<meta name="robots" content="noindex">` : à retirer seulement à la publication.

## Ouvrir

Double-clic sur `index.html` (ou `open livrables/site/index.html`). Rien à installer.

## Champs « À COMPLÉTER » (orange, visibles)

| Champ | Où |
|---|---|
| Adresse e-mail de contact (boîte Gmail dédiée) | en-tête, section « Qui je suis », pied de page, mentions légales ; le bouton « Écrire » est un `mailto:` sans destinataire : ajouter l'adresse après `mailto:` aux deux endroits d'`index.html` |
| SIRET | en-tête, « Qui je suis », mentions légales |
| Adresse postale de l'éditeur | mentions légales |
| Hébergeur (nom, adresse) | mentions légales |
| Durée de conservation des e-mails reçus | mentions légales |

## Contrôles

Faits à la rédaction : relecture contre les deux offres relues (textes, prix, dates, liens de sources recopiés de `offre-v3-efacture.md`), colonnes et statuts de Flow Inbox (`FI_COLONNES`, README du dossier `flow-inbox-gmail`), libellés « Calculée » / « À vérifier » et champs de `corrections.js`, contrastes calculés à la main (texte secondaire 6,7:1, orange sur fond orange pâle 6,7:1, blanc sur vert 6,4:1), relecture manuelle des mots exclus.

Faits le 18 octobre 2026 avec Chrome sans fenêtre (protocole DevTools), sur `index.html` et `mentions-legales.html` à 390 px et 1280 px : aucun défilement horizontal de page, aucune erreur console, aucune requête externe au chargement, un seul `h1` par page, aucun texte sous 12 px. Liens internes présents. Recherche des mots de marque et de profil exclus : aucune occurrence. Captures desktop et mobile relues. Clé de TVA de l'exemple (FR11 123456782) recalculée : correcte. Non fait : test au lecteur d'écran.

## Avant publication

1. Renseigner le SIRET, l'adresse, l'adresse e-mail (Gmail dédiée à créer) et l'hébergeur ; vérifier les mentions légales sur service-public.fr.
2. Relire les faits réglementaires (dates, 4 mentions, amende) sur les pages citées : relevés le 6 octobre 2026.
3. Trancher le régime de TVA (franchise en base ou non) ; la page renvoie au devis.
4. Dépublication de l'ancien site Netlify (ancienne marque) : décision de Kélian.
5. Retirer `noindex` à la publication.

## Choix de rédaction à valider

- Les prix sont présentés « indicatif », « proposés », « à confirmer au devis », « non validés par une vente » plutôt que le mot « hypothèse », qui se lit mal côté prospect.
- « Délai visé : 5 jours ouvrés après réception d'un export conforme » (hypothèse non mesurée dans l'offre source).
- « Je cherche mes premiers clients » : reformulation de « premiers clients en cours » pour rester fidèle à « pas encore de client de référence ».
