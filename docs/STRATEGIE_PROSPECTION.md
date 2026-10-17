# Stratégie de prospection et de démarchage — premières ventes

17 octobre 2026. **Proposition à valider par Kélian.** Elle reprend les décisions existantes ([offres et niches](OFFRES_ET_NICHES.md), [lancement Flow Inbox](../prospection/LANCEMENT_FLOW_INBOX.md), [Hermes](HERMES.md)). Tous les chiffres de conversion sont inconnus : ils sont à mesurer, pas à supposer. Prix = hypothèses non validées par une vente.

## 1. Objectif et arithmétique
- Objectif du projet : **1 000 € effectivement encaissés**, capacité provisoire **10 h/semaine**.
- Un pilote Flow Inbox à 790 € HT ne suffit pas seul (790 < 1 000). Deux pilotes donnent 1 580 € ; un pilote plus un dossier e-facture (490 € HT) donnent 1 280 € (même base HT). Il faut donc viser **2 clients payants**, pas 1.
- Une signature ou un acompte n'est pas un encaissement. Suivre séparément : contactés, réponses humaines, entretiens tenus, devis, signatures, factures, encaissements.

## 2. Deux pistes, une à la fois
| Piste | Cible | Interlocuteur | Premier message | Ordre |
|---|---|---|---|---|
| A. Flow Inbox | Agences marketing/communication/web (3 à 15 pers.), puis organismes de formation B2B, puis cabinets de conseil | Dirigeant, resp. commercial ou opérations | Question sur le suivi des demandes entrantes | Vague 1 (déjà préparée) |
| B. Données de facturation | PME de négoce/distribution B2B (20 à 249 pers., hypothèse), France | RAF, DAF, resp. facturation | Question sur la préparation des fichiers clients/fournisseurs | Vague 2, en parallèle seulement si la capacité le permet |

Ne pas mélanger les deux offres dans un même message. Les tailles sont des hypothèses de ciblage, pas des filtres validés.

## 3. Qui fait quoi

| Tâche | Hermes | Kélian |
|---|---|---|
| Trouver les entreprises et les adresses publiées | Oui : collecte avec URL et date de source par cellule ([consigne](../livrables/automatisations/pipeline-agence/hermes/CONSIGNE_COLLECTE.md)) | Vérifie chaque ligne sur sa source |
| Dédoublonner, contrôler historique et oppositions | Non | Oui |
| Phrase d'ouverture à partir d'un fait sourcé | Propose | Relit |
| Message complet | Non : [modèle fixe](../livrables/automatisations/pipeline-agence/hermes/MODELES_MESSAGES.md) | Valide une fois |
| Envoi | Non au départ (voir §6) | Oui |
| Récap quotidien Telegram | Oui, à partir des compteurs du registre | Lit |
| Réponses de prospects | Alerte seulement | Répond toujours |
| Appels, démonstration, devis, négociation, facturation | Non | Oui |

## 4. Canaux
1. **E-mail individuel**, un message par entreprise, une question, une demande de 15 minutes, identité et refus simple.
2. **Téléphone** vers le standard quand aucune adresse n'est publiée : demander qui gère le sujet, rien de plus.
3. Pas de formulaire de devis détourné, pas de pixel de suivi, pas de faux « Re: », pas de pièce jointe au premier message.
4. LinkedIn exclu du scraping. Un contact manuel et ponctuel de Kélian reste possible, hors Hermes.

## 5. Rythme proposé (10 h/semaine, hypothèse)
| Bloc | Temps indicatif | Contenu |
|---|---|---|
| Collecte vérifiée | 1 à 2 h | Contrôle des lignes, dédoublonnage, historique |
| Envois et appels | 2 à 3 h | Messages relus et envoyés, appels aux standards |
| Réponses et entretiens | 2 à 3 h | Réponses, démo de 15 minutes, notes |
| Suivi et mesure | 1 h | `suivi.md`, récap, relance J+5 |
| Offre et livraison | reste | Cadrage et pilote pour un client signé |

## 6. Plan par étapes
Chaque étape s'ouvre seulement si la précédente s'est bien passée.

**Étape 0 — Prérequis (avant tout envoi).** Identité de l'expéditeur arrêtée (structure juridique, adresse, identifiant légal) ; boîte dédiée avec SPF/DKIM/DMARC ; modèle validé ; contrôle de l'historique et des oppositions ; mentions légales et cadre CNIL relus ([source CNIL consultée le 16 octobre](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel)). Aucun pays hors France tant que ses règles ne sont pas vérifiées.

**Étape 1 — Vague manuelle (semaine du 19 octobre, proposée).** 10 entreprises déjà préparées : 4 e-mails du premier lot envoyés à la main, 2 appels (Dimatrap, SNIMOP), le reste ensuite. Noter la date réelle de chaque envoi dans `suivi.md`, sans coordonnées. Relance unique à J+5 minimum.

**Étape 2 — Alimenter la machine (semaines suivantes).** Hermes collecte 10 entreprises par lot ; Kélian vérifie au moins 8 lignes sur 10 avant import. Volume : de 5 à 10 contacts par jour au début (hypothèse), jamais plus que ce que Kélian peut traiter en réponse.

**Étape 3 — Envoi assisté.** Hermes prépare les messages complets à partir du modèle fixe ; Kélian valide par lot (par exemple un « OK » sur Telegram) et l'envoi part de la boîte dédiée avec plafond quotidien. À ouvrir seulement après le premier lot envoyé sans incident ni plainte.

**Étape 4 — Envoi autonome (France, une piste).** Possible seulement après plusieurs semaines sans rejet élevé ni opposition mal gérée, avec arrêt automatique ([garde-fous](../livrables/automatisations/pipeline-agence/hermes/PROSPECTION_AUTONOME.md)). Belgique, Luxembourg, Canada : brouillons seulement tant que non vérifiés.

## 7. Parcours d'un prospect intéressé
Réponse → alerte Telegram → Kélian répond sous 24 h ouvrées (objectif, hypothèse) → deux créneaux de 15 minutes → démonstration sur données fictives ([déroulé](../prospection/LANCEMENT_FLOW_INBOX.md)) → cadrage écrit court → devis → signature → pilote → facture → encaissement. Ne pas demander de données réelles au premier échange. Un intérêt verbal ne vaut ni commande ni paiement.

## 8. Mesure et règles d'arrêt
Suivre par piste, sans moyenne globale : envois effectifs, rejets, oppositions, réponses humaines, entretiens tenus, devis, signatures, encaissements, temps passé.
- Règle déjà inscrite au projet : moins de 2 appels obtenus sur 30 messages envoyés → changer d'angle (message, cible ou offre) avant d'augmenter le volume.
- Aucun taux de conversion calculé avant 30 envois effectifs par piste.
- Arrêt immédiat de l'envoi si plusieurs rejets d'adresse ou une plainte.
- Décision difficile (continuer, ajuster, abandonner) : à demander à l'agent `ceo` avec les chiffres mesurés.

## 9. Ce qui est encore bloquant
1. Identité d'expéditeur et boîte dédiée.
2. Contrôle de l'historique et des oppositions sur la boîte réelle de Kélian.
3. Validation juridique des mentions de refus et de la collecte de contacts professionnels.
4. Première collecte Hermes de 10 entreprises, vérifiée.
5. Capacité réelle de livraison d'un pilote Flow Inbox connecté (aujourd'hui seulement une démo simulée) : ne pas vendre une intégration non construite comme livrée.
