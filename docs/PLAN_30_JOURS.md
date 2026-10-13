# Plan technique et commercial — 14 octobre au 12 novembre 2026

Proposition du 13/10/2026, **non autorisation d'exécution**. Le présent audit est déjà livré en préparation ; le 14 octobre sert à le lire et trancher, pas à le refaire. Les dates se décalent ensemble si la validation intervient plus tard.

## Capacité et priorité

Budget de travail du porteur : **40 h**, réparties en quatre blocs de 10 h. Le temps de lecture/revue du code généré compte dans ce budget. Aucune disponibilité de l'associé n'est présumée. Les 11–12 novembre sont une marge calendaire, sans heures ajoutées : y déplacer du travail seulement en retirant la même durée ailleurs.

Une seule offre développée : Flow Inbox. Équerre conservé ; Insight Reports et Lead Assistant ne reçoivent aucun développement ce mois-ci. Les trois résultats recherchés sont un pilote démontrable, des problèmes clients validés, puis des contrats livrables et des encaissements observés.

Les durées sont des hypothèses. Un MVP connecté et deux installations en 40 h constituent un scénario tendu, particulièrement si n8n/OAuth est nouveau. Si l'intégration dépasse son budget, réduire la page commerciale et les volumes, ou limiter la livraison à un premier client ; ne pas supprimer les tests de sécurité pour tenir une date.

## Dépendances et validations

- **D1** : accord sur le périmètre et l'option technique A/B. Nécessaire avant développement.
- **D2** : compte de test, instance/version n8n, autorisations OAuth et budget API/hébergement explicitement approuvés. Nécessaire avant intégration réelle ; la démo simulée peut précéder.
- **D3** : positionnement et nom retenus, vérifications de marque suffisantes, textes relus. Nécessaire avant refonte de la page. Publication soumise à une autorisation séparée.
- **D4** : accord explicite sur les premiers messages, destinataires et canal ; suivi des oppositions. Les envois restent humains.
- **D5** : identité de facturation, modalités de paiement, périmètre client, traitement des données et contrat convenus. Nécessaire avant engagement/livraison réelle.
- **D6** : recette n8n réalisée et validation client, puis autorisation d'activer le workflow. Nécessaire avant exploitation.

## Calendrier détaillé

Chaque ligne porte un livrable observable. Le travail commercial n'attend pas un site complet ; les entretiens peuvent se préparer avec une présentation factuelle du prototype.

| Jour / date | Durée | Travail technique ou commercial | Livrable | Dépendance / critère de réussite |
|---|---:|---|---|---|
| J1 · 14/10 | 1,5 h | Lire l'audit, choisir A/B, confirmer capacité/budget ; choisir deux noms finalistes | Décisions datées et liste de blocages | D1 consigné ; ne pas refaire l'audit |
| J2 · 15/10 | 1,5 h | Définir contrat JSON, services et règles de qualification ; premières fixtures | Schémas et cas nominaux | D1 ; aucun champ critique inventé |
| J3 · 16/10 | 2 h | Démo locale, validation, erreurs, enrichissement de la suite de tests | Démo fictive reproductible et rapport des tests locaux | D1 ; aucun réseau, aucun secret ; cas dangereux isolés |
| J4 · 17/10 | 1,5 h | Workflow n8n désactivé, suivi et états ; vérifier accès futurs | Export et procédure d'import, sans prétendre une recette réelle | D1 ; version/accès identifiés, D2 prêt ou blocage explicite |
| J5 · 18/10 | 0 h | Repos / aucune tâche obligatoire | — | Pas de rattrapage implicite |
| J6 · 19/10 | 1,5 h | Cadrer offre et guide de découverte ; sélectionner 10 entreprises | Fiche pilote, liste sourcée hors Git | Un problème à tester, pas un besoin présumé |
| J7 · 20/10 | 2 h | Présentation de démo, premiers échanges et ajustements du script | Démo de 5 min, 5 premiers contacts possibles | D4 pour envoi ; noter verbatim et prochaine étape |
| **Semaine 1** | **10 h** | **Un prototype local + une offre courte** | | MVP connecté non promis à cette date |
| J8 · 21/10 | 2 h | Brancher Gmail, Sheets et extraction dans le bac à sable | Premier parcours connecté fictif | D2 ; un email → une ligne → un brouillon, zéro envoi |
| J9 · 22/10 | 1,5 h | Recette erreurs, rejeu, OAuth, logs et isolement | Journal de recette n8n | D2 ; preuves et échecs réels consignés, pas seulement JSON importé |
| J10 · 23/10 | 1 h | Adapter une page minimale existante après choix de marque | Page locale ou document d'offre si D3 non obtenu | D3 ; promesses exactes ; publication seulement sur accord |
| J11 · 24/10 | 2 h | Recherche ciblée et préparation de messages | 10–15 nouveaux prospects examinés ; messages relus | D4 ; source et lien avec la fonction du destinataire |
| J12 · 25/10 | 0 h | Repos | — | — |
| J13 · 26/10 | 2 h | Contacts, découverte et démonstrations | Objectif indicatif : 1–2 entretiens tenus | D4 ; problème, volume, outil, décideur et suite renseignés |
| J14 · 27/10 | 1,5 h | Corriger les points bloquants ; rapprocher tests et recette | Matrice des 36 scénarios avec état réel | Zéro blocage sécurité ; sinon conserver le statut prototype |
| **Semaine 2** | **10 h** | **Recette réelle si autorisée + premiers retours** | | Ne pas confondre démo et système livrable |
| J15 · 28/10 | 2 h | Messages ciblés et suivi des contacts précédents | Lot relu et suivi actualisé | D4 ; oppositions et rebonds exclus |
| J16 · 29/10 | 1 h | Découverte/démo et compte rendu | 1 entretien + synthèse factuelle | Questions sur une demande récente, pas une enquête abstraite |
| J17 · 30/10 | 2 h | Compléter la liste et faire les relances pertinentes | Nouvelles conversations et prochaines dates | D4 ; pas de répétition après refus |
| J18 · 31/10 | 1,5 h | Préparer propositions individualisées | 1–2 propositions si prospects qualifiés | D5 ; périmètre, recette, prix, maintenance, paiement et exclusions |
| J19 · 01/11 | 0 h | Repos | — | — |
| J20 · 02/11 | 2 h | Paramétrer le premier pilote, arrêt et sauvegarde | Configuration client et procédure de retour arrière | D5 ; sinon réaffecter à la découverte, pas à un second produit |
| J21 · 03/11 | 1,5 h | Clarifier objections, contrats et calendrier de paiement | Statuts devis/signature/acompte distincts | Aucun encaissement présumé sur une signature |
| **Semaine 3** | **10 h** | **Propositions et préparation d'une livraison** | | Une signature reste un objectif commercial |
| J22 · 04/11 | 2,5 h | Installer le pilote A dans le périmètre convenu | Workflow configuré, preuves et accès séparés | D5/D6 ; aucune activation non autorisée |
| J23 · 05/11 | 1 h | Recette A et prise en main | Accord de recette ou anomalies documentées | Démo réelle sans envoi ; client sait arrêter/reprendre |
| J24 · 06/11 | 2,5 h | Adapter le même modèle au pilote B s'il existe | Configuration B, isolation vérifiée | D5/D6 ; aucun projet différent vendu au même forfait |
| J25 · 07/11 | 1,5 h | Relances de devis, suivi clients et objections | Suivi commercial et tâches dues | D4 ; envoi humain uniquement |
| J26 · 08/11 | 0 h | Repos | — | — |
| J27 · 09/11 | 1 h | Validation B si prêt, factures/soldes et transmissions | Recette, factures émises et échéances distinctes | D5 ; contrôler paiements réellement reçus |
| J28 · 10/11 | 1,5 h | Réserve incidents, bilan de marge/temps et décision de suite | Bilan réel et trois priorités du mois suivant | Différer le reporting si Flow n'est pas stabilisé |
| **Semaine 4** | **10 h** | **Livraison, validation et suivi des encaissements** | | Capacité conditionnée à la standardisation |
| J29 · 11/11 | 0 h ajoutée | Marge de calendrier ; déplacer une tâche si nécessaire | Pas de nouvelle obligation | Jour férié en France : éviter d'y compter sur les clients |
| J30 · 12/11 | 0 h ajoutée | Date de clôture de la fenêtre de mesure | Snapshot du suivi, préparé dans le budget du J28 | Paiements après cette date comptés au mois suivant |

Le créneau de recette et de formation de B est court. Si un client demande davantage de cadrage ou si une anomalie persiste, utiliser la réserve ou reporter B ; une livraison non validée ne doit pas être factuellement présentée comme terminée.

## Volumes compatibles avec le budget

Base proposée : **40–60 entreprises identifiées, 30–40 contacts pertinents, 3–5 rendez-vous**, avec 1–2 ventes visées mais non garanties. Ce sont des objectifs de capacité à recalibrer après la première semaine, pas des taux de conversion prédictifs. Ils sont inférieurs à l'ambition initiale pour préserver le temps de recette/livraison.

L'ambition du brief reste **100–120 entreprises, 60–90 contacts et 5–8 rendez-vous**. Elle devient une option si la recherche est rapide, les échanges bien qualifiés et/ou si l'associé prend un lot clairement défini. Exemple d'estimation, non mesure : 120 recherches à 4 min = 8 h ; 90 messages à 5 min = 7,5 h ; 8 RDV à 45 min avec préparation = 6 h. Cela consomme déjà 21,5 h avant relances, construction, administration et livraison. Ne pas ajouter ces volumes silencieusement au calendrier.

Si les 10 premiers contacts demandent plus de 2 h de préparation/envoi, réduire le lot suivant. Après 15–20 messages pertinents sans conversation utile, relire cible et message ; ne pas accélérer le volume automatiquement. Après 3–5 entretiens sans problème récurrent et solvable, revoir la proposition avant d'étendre le produit. Ces seuils sont des règles de pilotage proposées, pas des tests statistiques.

## Supports commerciaux à préparer dans les créneaux prévus

| Support | Contenu minimum | Réutilisation |
|---|---|---|
| Checklist de découverte | Dernier cas concret, fréquence, personnes, outils, erreurs, coût/temps observé, décision, données sensibles | Structure des offres et guides existants, nouvelle cible |
| Script d'appel | Présentation factuelle, raison précise de l'appel, question sur le traitement des demandes, proposition de 15 min si pertinent | Pas d'argument de gain chiffré inventé |
| Email personnalisable | Observation sourcée sur l'agence, question métier, un appel à l'action, identité et opposition | `prospection/messages/` ignoré, brouillons uniquement |
| Qualification | Problème, fréquence, propriétaire, volume, compatibilité outils, accès, volonté de payer, prochaine étape | Nouveau segment ; anciens contacts non présumés pertinents |
| Démo | Demande fictive → champs vérifiés → suivi → brouillon → validation ; montrer un cas incomplet | Format `script-demo.md`, pas le discours e-facture |
| Proposition | Périmètre, exclusions, recette, prix, coûts tiers, dates, paiement, maintenance, données, réversibilité | Nouvelle version, conserver l'historique |
| Compte rendu | Faits déclarés, hypothèses, objections, décision, responsable et date suivante | Aucun résultat inventé |
| Tableau de suivi | Identifiés/contactés/RDV/devis/signatures/factures/encaissements/coûts/maintenance séparés | Modèle de suivi à adapter, pas de contacts réels versionnés |

La personnalisation et les envois réels ne sont pas réalisés au jour 1. Pour les emails B2B, prévoir information, lien avec l'activité professionnelle, identité de l'émetteur et opposition simple/gratuite. Vérifier séparément les règles du canal téléphone/LinkedIn avant usage. Source : [CNIL, prospection électronique](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel).

## Tableau financier de contrôle

Montants calculés à partir de l'hypothèse de prix du brief ; base fiscale à confirmer. Les scénarios ne représentent pas des probabilités.

| Situation au 12/11 | Installation facturée si totalité facturée | Encaissé sur installation | Objectif 1 000 € |
|---|---:|---:|---|
| Pas de vente | 0 € | 0 € | Non |
| 1 vente payée intégralement | 790 € | 790 € | Non |
| 2 ventes, seulement 50 % d'acompte reçus | 1 580 € | 790 € | Non |
| 2 ventes, deux acomptes de 50 % + un solde | 1 580 € | 1 185 € | Oui, si paiements effectivement reçus |
| 2 ventes intégralement payées | 1 580 € | 1 580 € | Oui, avant coûts/charges |

Le montant effectivement facturé dépend des factures d'acompte/solde émises : remplir les colonnes avec les pièces réelles, pas avec ce tableau hypothétique. Maintenance : 0, 149 ou 298 €/mois selon contrats actifs ; revenu récurrent, facturation et paiement suivis à part. Coûts API, hébergement, acquisition et temps réellement passé à relever avant de calculer la marge. Aucun revenu futur n'est acquis.

## Trois prochaines actions prioritaires

1. Valider le pilote **Flow Inbox seul** et choisir l'architecture A ou B ; confirmer les 10 h/semaine et les conditions d'intégration/budget.
2. Construire après ce feu vert la démo fictive et sa matrice de tests, puis effectuer la recette n8n dans un bac à sable autorisé.
3. Préparer 10 agences pertinentes et un guide de découverte ; lancer les premiers contacts après validation explicite, sans attendre une refonte complète du site.

Les noms finalistes sont à choisir en parallèle ; le nom définitif et les vérifications conditionnent la refonte, pas l'observation des problèmes métier.
