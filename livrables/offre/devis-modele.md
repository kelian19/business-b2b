# Modèle de devis / bon de commande

Modèle commun à Flow Inbox (pilote) et au Dossier e-facture. Les prix proposés sont des **hypothèses** non validées par une vente. Les champs `{...}` et « À COMPLÉTER » sont à renseigner par Kélian avant envoi ; ce modèle n'est pas une validation juridique.

---

## DEVIS N° {numero_devis}

Date d'émission : {date_emission}
Validité de l'offre : {duree_validite} à compter de la date d'émission

### Émetteur

Kélian Kaddouri, entrepreneur individuel (micro-entreprise)
SIRET : À COMPLÉTER
Adresse professionnelle : À COMPLÉTER
E-mail : {adresse_reponse}
Régime de TVA : À COMPLÉTER selon l'immatriculation. Si franchise en base : « TVA non applicable, art. 293 B du CGI ». Sinon : taux et montant de TVA à ajouter aux lignes ci-dessous.

### Client

Raison sociale : {client_raison_sociale}
SIREN / SIRET : {client_siren}
Adresse de facturation : {client_adresse}
Adresse de livraison (si différente) : {client_adresse_livraison}
Interlocuteur : {client_contact}

### Désignation

Choisir une seule des deux offres (ou les deux, sur deux lignes).

**Offre A : Flow Inbox, pilote**

Mise en place pour une boîte Gmail et un tableau Google Sheets dédiés, en français, selon une liste de services convenue :

- une fiche par demande commerciale (besoin exprimé, budget et délai lorsqu'ils sont présents, informations à demander, prochaine action) ;
- un tableau de suivi des demandes et de leur état ;
- pour les demandes claires, un brouillon de réponse dans Gmail, relu, corrigé et envoyé par votre équipe (les autres demandes sont signalées « à revoir ») ;
- le repérage dans le tableau des demandes sans réponse au-delà du délai convenu ;
- livrables : configuration convenue, tableau, règles de traitement, essais de bout en bout, prise en main.

Exclus : pièces jointes et reconnaissance de texte, plusieurs boîtes, migration d'un CRM, navigation dans les liens, chatbot, envoi automatique de réponses ou de relances, développement d'un autre produit. Plafond d'usage (volume de messages) : {plafond_messages}. L'outil fonctionne dans votre compte Google, sans service tiers ajouté ; d'éventuels frais d'outils seraient chiffrés séparément et soumis à votre accord. L'autorisation Google donne au script un accès à votre boîte : il ne lit que les messages portant le libellé convenu. Aucun abonnement de maintenance n'est inclus.

**Offre B : Dossier e-facture**

À partir d'un export CSV de votre fichier clients et fournisseurs (jusqu'à 1 500 lignes, sans noms de contacts) et de jusqu'à 3 modèles de factures :

- un fichier de corrections proposées (valeur actuelle, correction proposée, statut « calculée » ou « à vérifier ») ;
- un journal des corrections ;
- le contrôle de présence des 4 nouvelles mentions sur les modèles de factures ;
- un rapport des points à corriger.

Exclus : correction des données dans votre logiciel, modification de votre logiciel, transmission des factures, choix ou paramétrage d'une plateforme, conseil fiscal ou juridique, garantie de conformité ou d'évitement d'amende. Un identifiant bien formé ne prouve pas qu'il appartient au bon client : les rapprochements incertains restent à valider par le client. Vérification au registre public des SIREN uniquement avec l'accord écrit du client (seuls les SIREN sont envoyés, avec l'adresse IP du poste de l'émetteur). Au-delà de 1 500 lignes ou de 3 modèles : nouveau devis.

### Prix

| Désignation | Quantité | Prix unitaire HT | Total HT |
|---|---:|---:|---:|
| Flow Inbox, pilote (hypothèse) | {quantite_A} | 790 € | {total_A} |
| Dossier e-facture (hypothèse) | {quantite_B} | 490 € | {total_B} |
| Option : mise à niveau e-facture (hypothèse) | {quantite_C} | 150 € | {total_C} |
| Autres frais convenus par écrit | {quantite_D} | {prix_D} | {total_D} |

**Total HT : {total_ht}**
TVA : {mention_tva_ou_montant}
**Total à payer : {total_ttc_ou_ht}**

Supprimer les lignes non retenues.

### Délai

Flow Inbox : début et recette à la date de {date_debut_A}, après vérification des accès et de la charge. Dossier e-facture : {delai_B} jours ouvrés après réception d'un export conforme (hypothèse). Le délai court à compter de la réception des éléments demandés au client ; tout retard de transmission décale d'autant la livraison.

### Conditions de paiement

- Acompte (option) : {pourcentage_acompte} % à la signature, soit {montant_acompte} €, solde à la livraison. Ou : paiement intégral à la livraison.
- Délai de paiement : {delai_paiement} à compter de la date de la facture.
- Mode de paiement : {mode_paiement}.
- Pénalités de retard : {taux_penalites_retard}, exigibles sans rappel.
- Indemnité forfaitaire pour frais de recouvrement : {indemnite_recouvrement} (voir note 1).
- Escompte pour paiement anticipé : {escompte_ou_aucun}.

### Propriété des livrables

Le client dispose des livrables remis (tableaux, rapports, règles documentées) pour son usage propre à compter du paiement intégral. {precisions_propriete}. Les méthodes, scripts et outils préexistants de l'émetteur restent sa propriété.

### Données personnelles

Les données du client restent sous sa responsabilité. L'émetteur ne traite que ce qui est nécessaire à la mission, sur un export sans noms de contacts, téléphones ni e-mails pour le Dossier e-facture. Si des personnes physiques sont concernées (par exemple des entrepreneurs individuels, ou des demandes reçues par e-mail pour Flow Inbox), un contrat de sous-traitance au sens de l'article 28 du RGPD est signé avant tout transfert de données. Les fichiers sont conservés dans un espace à accès limité, supprimés à la fin de la mission ({date_ou_condition_suppression}) avec confirmation écrite.

### Bon pour accord

Le client reconnaît avoir lu le devis et les conditions ci-dessus.

Mention manuscrite ou électronique « Bon pour accord » : ______________________

Nom et fonction du signataire : {nom_signataire}, {fonction_signataire}
Date : ______________
Signature :

---

## Notes internes (retirer avant envoi)

1. **Indemnité forfaitaire de 40 € pour frais de recouvrement** (clients professionnels, en cas de retard de paiement) : mention à vérifier sur service-public.fr avant de l'inscrire. Ne pas chiffrer les pénalités sans vérification des règles applicables ; renseigner les champs avec les valeurs confirmées.
2. **Prix** : 790 € HT (Flow Inbox) et 490 € HT (Dossier e-facture) sont des hypothèses. Ce sont des chiffres d'affaires, pas des bénéfices. Ne pas les présenter comme validés avant une première vente. Flow Inbox : le script installable est construit et testé en simulation (livrables/automatisations/flow-inbox-gmail) ; faire l'essai dans un vrai compte Google avant de signer un premier pilote.
3. **Identité** : renseigner SIRET, adresse et régime de TVA avant le premier devis. Pas de nom de marque.
4. **Maintenance Flow Inbox** (149 €/mois, hypothèse historique) : non incluse ; à traiter dans un devis distinct si le client la demande.
5. **Mentions légales à vérifier** : à vérifier sur service-public.fr / economie.gouv.fr avant la première émission (liste non garantie exhaustive) : mentions obligatoires d'un devis (date, identité et coordonnées de l'émetteur, prestation détaillée, prix, durée de validité), mentions obligatoires d'une facture (dont les 4 nouvelles mentions pour les factures entre entreprises assujetties : SIREN du client, adresse de livraison si différente, nature de l'opération, option pour le paiement de la TVA d'après les débits), conditions de règlement, pénalités de retard.
6. Faire relire ce modèle par un professionnel du droit ou un expert-comptable avant le premier usage réel.
