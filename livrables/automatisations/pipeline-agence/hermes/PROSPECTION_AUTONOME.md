# Hermes — prospection autonome (France, B2B)

17 octobre 2026. Décision de Kélian : Hermes scrape, remplit le registre SQLite, envoie et fait un récapitulatif Telegram. **Ce fichier est un cahier des charges, rien n'est activé.** Il remplace la limite « Hermes n'envoie pas » de [INSTRUCTIONS.md](INSTRUCTIONS.md) uniquement une fois les prérequis ci-dessous cochés par Kélian.

Références de rédaction : [charte Hermes](CHARTE_REDACTION.md), [modèles de messages](MODELES_MESSAGES.md) et [prompt unique d'ouverture](PROMPT_OUVERTURE.txt). Ces textes visent les rendez-vous qualifiés ; ils ne remplacent pas les contrôles techniques ni les conditions d'activation de cette campagne.

## Prérequis (à faire par Kélian, jamais par l'assistant)
- [ ] Fournisseur de modèle configuré dans Hermes.
- [ ] Boîte d'envoi connectée à Hermes (identifiants saisis dans Hermes, hors dépôt).
- [ ] Bot Telegram créé (BotFather), jeton saisi dans Hermes, identifiant de conversation de Kélian seul autorisé.
- [ ] Cible précisée ci-dessous (secteur, taille, zone). Valeur par défaut : cibles des offres v2 de `context/CONTEXT.md`.
- [ ] Nom, domaine d'envoi et mentions d'identité de l'expéditeur arrêtés (aujourd'hui « À COMPLÉTER »).
- [ ] Texte de message validé une fois par Kélian (deux modèles : Flow Inbox, e-facture). Hermes ne réécrit que la phrase d'ouverture.

## Cible
Pays (décision de Kélian) : France, Belgique, Luxembourg, Canada. Secteurs et tailles : ceux de [docs/OFFRES_ET_NICHES.md](../../../../docs/OFFRES_ET_NICHES.md), qui sont des hypothèses de ciblage, pas des filtres validés. **Une seule campagne à la fois**, dans cet ordre :
1. E-facture : PME de négoce et distribution B2B (20 à 249 salariés), interlocuteur RAF, DAF ou responsable facturation. France seulement.
2. Flow Inbox : agences marketing, communication et web (3 à 15 salariés), interlocuteur dirigeant, commercial ou opérations ; puis organismes de formation B2B, puis cabinets de conseil.
Extensions e-facture plus tard : fabrication B2B, cabinets d'expertise comptable. Sources autorisées : annuaires officiels et sites web publics des entreprises. Exclus : LinkedIn et tout site dont les conditions interdisent l'extraction. Colonne `pays` obligatoire dans le registre ; langue du message selon le pays (français ; anglais pour un prospect canadien anglophone).

| Pays | Offres à proposer | Envoi autonome au départ | À vérifier avant ouverture |
|---|---|---|---|
| France | Flow Inbox, e-facture | Oui, vague de 5 puis plafond | Cadre CNIL prospection B2B et scraping |
| Belgique | Flow Inbox seulement | Non, brouillons seulement | Règles belges d'envoi d'e-mails commerciaux (consentement préalable ou non, personnes morales) ; offre e-facture à reprendre selon le régime belge, qui n'est pas celui de la France |
| Luxembourg | Flow Inbox seulement | Non, brouillons seulement | Règles luxembourgeoises d'e-mail commercial et RGPD |
| Canada | Flow Inbox seulement | Non, brouillons seulement | Loi canadienne anti-pourriel (CASL) : consentement et exceptions, sanctions ; règles du Québec pour le français |

Raison : l'offre « dossier facture électronique » vise la réforme française. Les règles d'envoi diffèrent par pays et la loi canadienne passe pour être l'une des plus strictes (à confirmer). Tant qu'un pays n'est pas vérifié, Hermes collecte et prépare les brouillons, mais n'envoie pas. Kélian peut lever ce blocage pays par pays après vérification.

## Boucle quotidienne
1. **Scraper** : trouver des entreprises correspondant à la cible, avec pour chacune la raison sociale, le site, une adresse professionnelle générique ou nominative liée à la fonction, **l'URL source et la date de collecte**. Pas de donnée sans source.
2. **Remplir** : écrire dans le registre SQLite via `python pipeline.py import-csv` (unicité et exclusions gérées par le registre). Jamais en dehors.
3. **Préparer** : une phrase d'ouverture fondée sur un fait lu sur le site de l'entreprise, avec le lien du fait.
4. **Envoyer** dans la limite ci-dessous, puis enregistrer chaque envoi confirmé via `python pipeline.py record`.
5. **Récap Telegram** chaque jour : nouveaux prospects, envoyés, retours à traiter, désinscriptions, erreurs. Mêmes compteurs que `bilan.txt`, sans inventer.

## Garde-fous (obligatoires, protègent l'expéditeur)
- **Plafond d'envois par jour** : valeur de départ `20` (hypothèse prudente pour une boîte neuve, à ajuster selon la délivrabilité observée).
- **Désinscription** : chaque message contient l'identité de l'expéditeur et un moyen simple de refuser. Toute opposition est enregistrée au registre et exclut l'adresse définitivement.
- **Pertinence** : message limité à l'offre en lien avec l'activité professionnelle de la personne. Pas de particulier, pas d'adresse personnelle.
- **Arrêt automatique** et alerte Telegram si : taux de rejet (adresses invalides) élevé (seuil de départ `5 %`), plainte ou réponse hostile, erreur d'envoi répétée, ou adresse déjà contactée.
- **Pas de relance avant J+5**, une seule relance, puis arrêt.
- **Journal** : chaque action (collecte, envoi, réponse) avec date et source, dans SQLite.
- **Pas d'invention** : aucun chiffre, nom de client ou référence non sourcée dans un message. Ne jamais citer l'employeur ni le stage de Kélian.
- Une réponse humaine d'un prospect n'est **jamais** traitée automatiquement : alerte Telegram, Kélian répond.

## À vérifier avant la première vague
Cadre CNIL de la prospection B2B et du scraping de données professionnelles, conditions d'usage des sources, volumes sûrs de la boîte d'envoi. Aucun de ces points n'a été vérifié dans ce dépôt. Démarrer par une vague de 5 envois et lire les retours avant d'augmenter.
