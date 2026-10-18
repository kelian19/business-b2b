# Prêt à prospecter — état des deux produits au 18 octobre 2026

Document interne. Il répond à la question « que peut-on vendre et livrer dès qu'un prospect dit oui ? ». Les prix restent des hypothèses non validées par une vente. Aucun message n'a été envoyé.

## Les deux produits

| | Flow Inbox (pilote) | Préparation des données de facturation |
|---|---|---|
| Cible du premier lot | Agences marketing, communication et web, 3 à 15 personnes (hypothèse) | PME de négoce et distribution B2B (hypothèse) |
| Prix (hypothèse) | 790 € HT, installation | Diagnostic 50 lignes gratuit ; dossier 490 € HT ; revue mise à jour 150 € HT |
| Message à froid | [Modèle 1](../livrables/automatisations/pipeline-agence/hermes/MODELES_MESSAGES.md) | [Modèle 2](../livrables/automatisations/pipeline-agence/hermes/MODELES_MESSAGES.md) |
| Appel de 15 min | [Guide de découverte](GUIDE_DECOUVERTE_FLOW_INBOX.md) + [démo client](../livrables/outil-flow-inbox/README.md) | [Guide de découverte](GUIDE_DECOUVERTE_EFACTURE.md) + [démo](../livrables/outil-equerre/script-demo.md) |
| Fiche envoyée après l'appel | [Offre commerciale](../livrables/offre/flow-inbox-offre-commerciale.md) | [Offre v3](../livrables/offre/offre-v3-efacture.md) + [marche à suivre](../livrables/offre/efacture-marche-a-suivre.md) |
| Devis | [Modèle de devis](../livrables/offre/devis-modele.md) | [Modèle de devis](../livrables/offre/devis-modele.md) |
| Outil de livraison | [Script Gmail + Sheets](../livrables/automatisations/flow-inbox-gmail/README.md) : 81 tests en simulation | [Outil Équerre](../livrables/outil-equerre/GUIDE-LIVRAISON.md) : 384 tests + [registre](../livrables/registre-cli/README.md) : 35 tests |
| Procédure de livraison | Installation et recette : [README](../livrables/automatisations/flow-inbox-gmail/README.md) | [Guide de livraison](../livrables/outil-equerre/GUIDE-LIVRAISON.md) |

Tests relancés le 18 octobre 2026 sur ce poste : 81/81, 384/384, 35/35.

## Ce qui reste avant le premier envoi (Kélian)

1. **Immatriculation** de la micro-entreprise : SIRET, adresse professionnelle, régime de TVA (franchise ou non). Ces champs sont marqués `À COMPLÉTER` dans les modèles de messages, la fiche e-facture et le devis.
2. **Boîte Gmail dédiée** à l'activité (`{adresse_reponse}`), puis contrôle de l'historique et des oppositions.
3. **Relire et valider** les quatre documents clients (offre Flow Inbox, offre v3 e-facture, marche à suivre, devis). Faire relire le devis par un professionnel avant le premier usage (mentions obligatoires, pénalités).
4. **Essai Flow Inbox dans un vrai compte Google** (le sien, avec des messages fictifs), selon la recette du README. Cela vérifie ce que la simulation ne couvre pas : écran d'autorisation, libellés, brouillons, liens. À faire avant de signer un premier pilote, pas avant le premier envoi.
5. Revérifier les faits réglementaires de la fiche e-facture (sources consultées le 6 octobre 2026) avant chaque vague d'envois.

## Ce qui reste volontairement hors des produits

- Flow Inbox : lecture par IA, pièces jointes, plusieurs boîtes, envoi automatique. À chiffrer à part, après un premier pilote.
- E-facture : correction dans le logiciel du client, choix de plateforme, conseil fiscal ou juridique.
- Maintenance mensuelle Flow Inbox (149 €/mois dans l'ancienne fiche pilote) : non proposée dans l'offre actuelle.

## Suite

Démarrer selon la [stratégie de prospection](STRATEGIE_PROSPECTION.md), une piste à la fois, et noter chaque envoi réel dans `prospection/suivi.md`.
