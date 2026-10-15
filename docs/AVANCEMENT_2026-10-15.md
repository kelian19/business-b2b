# Point d'avancement — 15 octobre 2026

## Dernière avancée

L'utilisateur retient désormais **deux idées de services : Flow Inbox et préparation à la facturation électronique**, avec l'automatisation comme compétence commune. La [fiche offres et niches](OFFRES_ET_NICHES.md) consigne cette décision et les segments à qualifier. Un [guide de découverte e-facture](GUIDE_DECOUVERTE_EFACTURE.md) complète celui de Flow Inbox. Les priorités de test restent proposées ; aucun résultat commercial n'est présumé.

La **[démo locale Flow Inbox](../livrables/automatisations/flow-inbox/index.html)** est réalisée : sept exemples fictifs, validation, suivi en mémoire et brouillons texte modifiables. Rejeu, retouches, disparition, rapprochement fictif et création incertaine sont examinables dans le navigateur et par commande. **62 tests métier réussis et 38 contrôles Chrome réussis**, fournisseurs et extraction simulés exclusivement. La [recette locale](../livrables/automatisations/flow-inbox/RECETTE_LOCALE.md) indique commandes, périmètre et limites.

Accord retenu : poursuite sur la première tranche locale présentée, après clarification de l’absence de coût n8n/API. Le plan complet et A/B d’intégration restent à valider. Aucun compte connecté, dépense, workflow n8n ou appel IA ; état de session non persistant. La corrélation après timeout est celle du faux fournisseur, sans équivalent Gmail validé.

## État vérifié dans le dépôt

Le brief du 13 octobre donne la priorité aux agences marketing, communication et web françaises de 3 à 15 salariés, avec Flow Inbox d'abord. L'objectif initial est de 1 000 € effectivement encaissés ; 10 h/semaine restent la disponibilité provisoire.

L'[audit initial](AUDIT_INITIAL_CODEX.md), la [stratégie](STRATEGIE_AGENCE_IA.md), l'[architecture](ARCHITECTURE_FLOW_INBOX.md) et le [plan](PLAN_30_JOURS.md) existent. Aucune validation explicite du plan ou du choix technique A/B n'a été retrouvée dans le contexte disponible. La demande « continue les avancées » permet de poursuivre la préparation ; elle n'est pas enregistrée comme un choix A/B.

Flow Inbox dispose désormais de sa première démo exécutable locale ; il n’existe toujours pas d’intégration Gmail/Sheets/OpenAI ni de workflow n8n livré. Les applications et offres historiques restent conservées. Le suivi commercial versionné ne contient pas de résultat exploitable : l'activité réelle depuis le 7 octobre, les ventes et les encaissements sont **non renseignés**, et non présumés nuls.

## Livrables préparés aujourd'hui

- [Fiche pilote Flow Inbox](../livrables/offre/flow-inbox-pilote.md) : problème à tester, parcours proposé, périmètre, exclusions et prix hypothétiques.
- [Guide de découverte](GUIDE_DECOUVERTE_FLOW_INBOX.md) : entretien de 15 minutes, critères de qualification, modèle privé de compte rendu et preuves attendues dans le suivi.
- Repère daté ajouté au contexte et au pipeline pour éviter de reprendre les anciennes offres par erreur. Historique conservé.
- À la demande suivante, centrée sur le site : [sélection de dix ressources de design](SELECTION_DESIGN_SITE.md) et [maquette locale indépendante](../livrables/design/flow-inbox-concept/index.html), direction éditoriale crème/encre/orange. Exemples préécrits uniquement ; pas d'implémentation Flow Inbox, de choix de marque ou de modification du site historique. Les contrôles navigateur propres à cette maquette sont détaillés dans la sélection de design.
- Discussion entre agents sur les [pistes de rétro-ingénierie](PISTES_REVERSE_ENGINEERING.md), puis contrat Gmail et comparaison documentaire n8n liés en tête de page. La phrase de l’architecture présentant les transitions comme testées a été corrigée : elles restent à implémenter et à tester.
- Première tranche locale développée après la demande de poursuivre suivant la clarification du coût : [guide d’essai](../livrables/automatisations/flow-inbox/README.md), commandes et tests sans dépendance. Les règles couvertes sont maintenant testées localement ; aucune preuve connectée n’est annoncée.

Ces supports sont des versions internes à relire avant partage, sans nouvelle promesse de performance ni disponibilité commerciale. Aucun prospect réel ajouté, message envoyé, compte connecté, achat, commit ou déploiement effectué.

## Prochaines étapes et conditions

| Étape | Élément concret à trancher | État au 15 octobre |
|---|---|---|
| Démo locale | Examiner les sept exemples, le rejeu, une retouche et le cas de création incertaine | Livrée et vérifiée localement ; prise en main utilisateur à faire |
| Recette connectée | Compte de test, version/instance n8n, permissions et plafond de dépenses | Non renseignés ; autorisation distincte nécessaire |
| Découverte commerciale | Relire la fiche et le guide, connaître les contacts déjà effectués et les oppositions ; valider messages, destinataires et canal avant envoi | Supports préparés ; résultats et envois non renseignés |
| Site | Retenir positionnement et nom avant refonte ; vérifications de marque | Nom non choisi ; aucun changement du site |

Le calendrier du plan reste une proposition. Le 15 octobre n'est pas traité comme un J2 acquis : les dates doivent être recalées après validation, dans la limite de capacité confirmée.

## Vérification de cette reprise

Première reprise : modifications documentaires uniquement. Relecture de cohérence avec les trois propositions ; contrôle PowerShell de six documents UTF-8 et de leurs 13 liens locaux : aucune erreur. `git diff --check` : aucune erreur. Ce contrôle Git porte sur les modifications suivies ; les trois nouveaux fichiers sont couverts par le contrôle documentaire. La maquette de site réalisée à la demande suivante possède sa propre recette, liée ci-dessus.

Les premières tentatives de contrôle des liens avec Python puis Node n'ont pas pu démarrer : exécutable Python inaccessible, commande Node absente du PATH de cette session. Le contrôle a été effectué avec PowerShell, sans installation. Les 507 tests mentionnés dans l'audit sont des résultats historiques du 13 octobre ; ils ne sont pas des tests Flow Inbox et ne sont pas réexécutés pour ces textes.
