# Page vitrine locale (non publiée)

Fichiers : `index.html`, `styles.css`, `site.js`, `mentions-legales.html`. Aucune dépendance externe, aucun formulaire, aucun traceur. Le script local sert uniquement aux deux aperçus de service : onglets, navigation au clavier et boutons « Voir l’aperçu ». Aucun appel réseau du script ni stockage. Les deux pages portent `<meta name="robots" content="noindex">` : à retirer seulement à la publication.

## Refonte locale du 18 octobre 2026

Le HTML précédent utilisait notamment `cadre`, `barre` et `hero`, alors que la feuille de styles définissait `conteneur`, `entete` et `bande`. Le CSS se chargeait mais ne mettait pas en page l’accueil. Les styles correspondent désormais au HTML ; les classes de la page légale restent prises en charge.

Direction : fond ivoire, titres Georgia, accent bleu, offres en lignes et maquettes locales Flow Inbox / e-facture. Animations d’entrée courtes, supprimées avec `prefers-reduced-motion`. Les données des aperçus sont fictives. Les versions conservées dans `versions/` ne sont pas modifiées.

Les liens commerciaux mènent à `#contact`. Aucun lien `mailto:` vide : le contact est explicitement indisponible jusqu’à la configuration d’une adresse réelle. Pour l’activer, renseigner cette adresse dans la section contact et les mentions légales, puis ajouter le lien de contact souhaité. Aucun calendrier ni formulaire ne sont connectés.

Contrôles exécutés après refonte : audit Chrome local, 32/32 vérifications en mode normal et 34/34 en mouvements réduits. Chargement CSS/JS, titre principal unique, ancres, onglets (clic, flèches, Home/End, focus), CTA d’aperçu et FAQ. Aucun débordement de page pour les deux aperçus à 320, 390, 740, 768, 1024, 1440 et 1600 px. Aucun chargement de ressource distante observé. Captures relues : accueil desktop/mobile, offres desktop/mobile, contact mobile et mentions légales mobile. Fichier HTML également ouvert directement. Ces contrôles ne constituent pas un audit complet d’accessibilité ; lecteur d’écran non testé. Aucun compte, envoi, workflow ou déploiement activé.

## Ouvrir

Double-clic sur `index.html` (ou `open livrables/site/index.html`). Rien à installer.

## Champs « À COMPLÉTER » (orange, visibles)

| Champ | Où |
|---|---|
| Adresse e-mail de contact (boîte Gmail dédiée) | section `#contact` et mentions légales ; remplacer le message d’attente par un lien réel |
| SIRET | mentions légales |
| Adresse postale de l'éditeur | mentions légales |
| Hébergeur (nom, adresse) | mentions légales |
| Durée de conservation des e-mails reçus | mentions légales |

## Contrôles de la version précédente (avant refonte)

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
