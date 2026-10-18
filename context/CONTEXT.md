# Contexte du projet

> Source de vérité. Mise à jour avec `/update`. Les champs « À compléter » ne sont pas encore décidés : ne pas les inventer.

## Priorité actuelle — repère du 18 octobre 2026

Le 18 octobre, à la demande « finis les produits qu'on commercialise pour qu'on puisse passer à la prospection » : les deux produits sont prêts à vendre et à livrer, voir [prêt à prospecter](../docs/PRET_A_PROSPECTER.md). **Flow Inbox** : [version installable](../livrables/automatisations/flow-inbox-gmail/README.md) (Apps Script dans le compte Google du client, règles déterministes sans IA, brouillons seulement, aucun envoi ; 81 tests en simulation, pas encore essayée dans un vrai compte Google). **E-facture** : [offre v3](../livrables/offre/offre-v3-efacture.md) alignée sur l'outil Équerre (corrections proposées sur export), [marche à suivre](../livrables/offre/efacture-marche-a-suivre.md) ; [devis type](../livrables/offre/devis-modele.md) commun. Prix toujours en hypothèse. Bloquants restants : SIRET, adresse, régime de TVA, Gmail dédié.

Le 18 octobre, l'utilisateur confirme que le SIRET et les coordonnées d'expéditeur ne sont pas prêts : **poursuivre la préparation locale uniquement**. Les envois restent en attente. Après lecture du plan et de l'historique, rendu des deux premiers contacts intégré à la pipeline depuis des modèles texte : identité privée configurable par `--sender-file`, nouveaux brouillons marqués incomplets en son absence, aucun écrasement des textes existants. [Aperçu fictif](../livrables/automatisations/pipeline-agence/EXEMPLES_BROUILLONS_FICTIFS.md). **40 tests Python réussis**, démo CLI et rejeu vérifiés ; aucune intégration externe exécutée. Voir la [recette](../livrables/automatisations/pipeline-agence/RECETTE.md).

Kit de rédaction Hermes du 17 octobre : [charte](../livrables/automatisations/pipeline-agence/hermes/CHARTE_REDACTION.md), [modèles de messages](../livrables/automatisations/pipeline-agence/hermes/MODELES_MESSAGES.md) et prompt d'ouverture unique relié à `pipeline.py`. Objectif : rendez-vous qualifiés pour les deux offres. Premiers contacts désormais rendus localement ; relance unique, réponses proposées pour Kélian, confirmation de rendez-vous et bilan restent des supports rédactionnels. Aucune activation. Rendez-vous pris non suivis par le registre actuel, distincts des entretiens tenus.

Le 17 octobre, à la demande « fais la pipeline avec n8n, claude, hermes », [pipeline interne d'agence](../livrables/automatisations/pipeline-agence/README.md) préparée : registre local SQLite, pont HTTP authentifié sur loopback, génération de deux workflows n8n désactivés, mode demo par défaut, futur appel API Claude et bilan Telegram à configurer. Hermes dispose d'instructions de lecture des seuls agrégats ; ni installé ni exécuté. Brouillons locaux uniquement, aucun envoi ou brouillon Gmail, aucun import réel de prospects ni appel fournisseur dans cette livraison. La [recette](../livrables/automatisations/pipeline-agence/RECETTE.md) distingue contrôles locaux et intégrations restantes.

Complément du 17 octobre : [services et avatars clients](../livrables/offre/services-et-avatars-clients.md) rédigés à la demande de l'utilisateur. Six profils hypothétiques pour les deux offres, plus un profil exploratoire pour la préparation de prospection automatisée. Aucun entretien, prix accepté ou besoin commercial prouvé n'est déduit de ces portraits.

**Décision utilisateur la plus récente : deux idées de services retenues, Flow Inbox et préparation à la facturation électronique, avec l'automatisation comme compétence commune.** La [fiche offres et niches](../docs/OFFRES_ET_NICHES.md) précise les segments à qualifier et la suite proposée. Le choix des deux services est acquis ; l'ordre des tests, les niches exclusives et les prix restent à valider par les échanges commerciaux. Cette décision élargit le brief du 13 octobre décrit ci-dessous.

Le brief initial du 13 octobre ciblait les agences marketing, communication et web françaises de 3 à 15 salariés, avec Flow Inbox, puis Insight Reports et Lead Assistant. La décision ci-dessus élargit cette orientation ; les agences restent une cible pour Flow Inbox. Objectif initial : 1 000 € effectivement encaissés ; disponibilité provisoire : 10 h/semaine.

La stratégie, l’architecture connectée et le plan complet dans `docs/` restent des propositions. La demande de poursuivre après présentation de la tranche locale et clarification du coût vaut accord pour cette **démo locale uniquement**, désormais livrée. Aucun choix A/B d’intégration, nom définitif ou budget d’intégration n’est consigné. Supports : [fiche pilote](../livrables/offre/flow-inbox-pilote.md), [guide de découverte](../docs/GUIDE_DECOUVERTE_FLOW_INBOX.md) et [point d’avancement](../docs/AVANCEMENT_2026-10-15.md). Les résultats commerciaux récents sont non renseignés ; ne pas supposer des envois ou encaissements.

À la demande suivante, centrée sur le site et des ressources GitHub : [sélection de design sourcée](../docs/SELECTION_DESIGN_SITE.md) et [maquette locale indépendante](../livrables/design/flow-inbox-concept/index.html) préparées. Direction crème/encre/orange proposée, nom générique de présentation, deux exemples fictifs préécrits. Le site Next.js historique n'est pas modifié, aucune ressource tierce installée et aucune publication réalisée. Le choix de marque et la refonte restent à valider.

Dernière reprise : [démo locale Flow Inbox](../livrables/automatisations/flow-inbox/index.html) et [guide](../livrables/automatisations/flow-inbox/README.md) livrés. Sept exemples fictifs, logique partagée navigateur/commande, suivi en mémoire, brouillons texte et événements sortants fictifs. **62 tests locaux et 38 contrôles Chrome réussis** ; aucune intégration Gmail/n8n/IA réelle. Limites et couverture G01–G12 dans la [recette locale](../livrables/automatisations/flow-inbox/RECETTE_LOCALE.md). Pas de persistance, de restauration disque ni de corrélation Gmail prouvée. Conserver les autres validations avant comptes, coûts, activation ou refonte.

Les rubriques suivantes décrivent l'historique jusqu'au 7 octobre. Leurs anciennes offres, cibles, montants, dates et affirmations réglementaires ne constituent pas les décisions actuelles et ne doivent pas être repris sans vérification.

## Porteur

- Kélian Kaddouri, MSc actuariat ENSAE (promo 2025/2026), stagiaire cyber-risque jusqu'en novembre 2026 (employeur à ne jamais citer dans les livrables), disponible en février 2027.
- Profil actuaire × data scientist (cyber, DORA), deux ans de data science (Python, mise en production).
- Équipe (déclaration de Kélian, 2026-10-06) : deux associés. Kélian (data scientist, formé à l'ENSAE Paris) et un·e associé·e formé·e à l'ESSEC Business School (nom, statut et rôle à confirmer). Textes publics : « formé à », sans nom ni titre inventés.
- Temps disponible : 10 h/semaine (Kélian, 2026-10-06 ; avant : 4-5 h), contraint par le stage, le mémoire et la recherche d'emploi.
- Objectifs : 1) mémoire d'actuariat et data science ; 2) business B2B IA à 1 000 €/mois de bénéfice ; 3) minimiser les tokens.

## Vision

- Idée en une phrase (provisoire) : supprimer une tâche répétitive (reporting ou saisie de documents) dans des entreprises peu familières de l'IA ; on vend le résultat, l'IA reste en coulisse.
- Modèle : vente en ligne à des entreprises (B2B), en freelance/prestation d'abord, pas de logiciel.
- Pistes : audit et suivi des coûts IA ; kit de conformité AI Act ; veille réglementaire automatisée (DORA, cyber, AI Act) ; automatisations sur mesure ; tableaux de bord data/sinistralité.
- Pistes retenues (2026-10-04) : reporting automatisé et traitement de documents. Écartées : audit des coûts IA (cible trop informée sur l'IA), veille (demande un secteur maîtrisé, à reprendre plus tard pour le récurrent).
- Abandonné (Kélian, 2026-10-06) : sites vitrines (trop de concurrence) et gestion de réseaux sociaux. Piste à l'étude : « dossier facture électronique » pour PME B2B (fiabilisation du fichier clients/fournisseurs + contrôle des 4 nouvelles mentions), voir context/recherche/2026-10-06-idees-demande.md.
- Périmètre (Kélian, 2026-10-04) : rester uniquement sur les offres A (formation + charte IA), B (factures) et C (reporting) pour les cabinets comptables ; pas de freelance. Présentation publique : data scientist (Python, automatisation), sans actuariat ni cyber.
- Exclusion (Kélian, 2026-10-04) : ne veut PAS vendre ni faire de missions d'actuariat ou de cyber-risque (ni en freelance, ni en offre). Pistes à écarter : veille DORA/cyber, audits cyber, missions d'actuaire. Reste ouvert : automatisation de tâches, traitement de documents, reporting, formation à l'usage de l'IA.
- Contrainte : aucun secteur connu de l'intérieur, aucun réseau → cible à choisir par accessibilité (étape 1 de PIPELINE.md).

## Client cible

- Secteur (2026-10-06) : offre e-facture → PME B2B (négoce, distribution, fabrication) et, en variante, cabinets comptables en sous-traitance ; offre Décodeur → PME qui veulent utiliser l'IA sans savoir par où commencer. Ancienne cible (2026-10-04) : cabinets comptables, offres A/B/C, non testée.
- Taille d'entreprise : e-facture 20 à 249 salariés ; Décodeur 10 à 249 salariés (hypothèses de ciblage)
- Décideur (poste) : DAF / RAF pour l'e-facture ; dirigeant ou responsable des opérations pour le Décodeur (hypothèses)

## Problème

- Quel problème, à quelle fréquence, avec quel coût pour le client : À compléter

## Offre

- Ce qu'on vend : (1) « Dossier facture électronique » : fichier clients/fournisseurs fiabilisé (SIREN, TVA, adresses, doublons) + contrôle de 3 modèles de factures au regard des 4 nouvelles mentions + rapport (livrables/offre/offre-v2-efacture.md) ; (2) « Le Décodeur » : besoin métier traduit en solution automatisée, cartographie de 3 à 5 tâches + prototype (livrables/offre/offre-v2-decodeur.md). Prix hypothèses : 490 € HT et 750 € HT, mise à niveau 150 € HT.
- Différenciation : À compléter (atout possible : profil conformité/risque)
- Comparaison avec une solution sans IA : À compléter

## Prix et revenus

- Modèle (décision Kélian, 2026-10-06) : projet en une fois (hypothèse de prix : 450 à 1 000 €, hors diagnostic) suivi d'une petite « mise à niveau » optionnelle ; pas d'abonnement comme offre principale. Calcul : à 700 € le projet, il faut environ 2 projets par mois pour 1 400 € de chiffre d'affaires (hypothèse), soit plutôt du volume que du « high ticket ».
- Prix : À compléter. Fourchettes du plan, non validées : audit 800–1 500 € + suivi 150–300 €/mois ; kit AI Act 500–1 500 € ; veille 80–150 €/mois.

## Acquisition

- Canaux envisagés : À compléter (premier test : 10 prospects contactés, messages en brouillon Gmail envoyés à la main)
- Durée du cycle de vente : À compléter

## Concurrents

À compléter (source et date pour chaque élément).

## Hypothèses chiffrées

Chaque chiffre est une hypothèse tant qu'il n'a pas de source.

| Élément | Valeur | Statut |
|---|---|---|
| Bénéfice visé (mois) | 1 000 € | Objectif |
| Chiffre d'affaires nécessaire (mois) | (1 000 + 50) / (1 − 0,25) = 1 400 € | Calcul sur hypothèses |
| Cotisations micro-entreprise (services) | ~25 % du CA | Hypothèse, à vérifier sur l'URSSAF |
| Coûts récurrents (abonnement Claude, domaine, outils) | 50 €/mois | Hypothèse |
| Coût IA par client | < 1 % du prix | Hypothèse (calcul du plan) |
| Coût d'acquisition d'un client | À compléter | Hypothèse |

## Contexte réglementaire

- AI Act : l'article 4 (maîtrise de l'IA du personnel) a été assoupli par le règlement (UE) 2026/1744 (en vigueur le 27 juillet 2026, sources secondaires, à confirmer sur EUR-Lex) : devoir de prendre des mesures, sans niveau garanti ; depuis le 2 août 2026, transparence (un chatbot se déclare comme IA) ; obligations « haut risque » repoussées à fin 2027/2028. Source : blog Ingeni Solution (août 2026), à revérifier.

## Environnement technique

- Windows, Europe/Paris. Claude Code 2.1.289, Node v24.19.0.
- MCP connectés (niveau utilisateur, via `cmd /c npx`) : playwright (`@playwright/mcp@latest`), context7 (`@upstash/context7-mcp`). GitHub via CLI `gh`, non connecté (dépôt distant reporté). Firecrawl, Perplexity, remotion, ffmpeg : non installés, pré-câblés dans les agents.
- Skills (tous dans `.claude/skills/` du projet) : actuarial-modeling, business-ai, token-efficient ; K-Dense : statistical-analysis, statsmodels, scikit-learn, scientific-visualization, exploratory-data-analysis (chargés à la demande par `analyste`, trop lourds pour être préchargés).
- Agents : chercheur, prospecteur, redacteur-offre, analyste, relecteur ; skills et outils par agent dans CLAUDE.md.
- Règles tokens : Sonnet par défaut, Haiku pour le simple, Opus rarement ; sous-agents pour le verbeux ; /clear entre tâches ; CLAUDE.md < 200 lignes ; lire des extraits.

## Risques

- Juridiques : RGPD (aucune donnée nominative ni donnée de l'employeur dans Claude) ; AI Act si chatbot. Pas de conflit avec le stage : l'activité n'a aucun lien avec l'employeur (précisé par Kélian, 2026-10-04) et le stage se termine début décembre 2026 (~2 mois).
- Opérationnels : temps limité ; consommation de tokens (sous-agents en parallèle coûteux).
- Commerciaux : prix non validés, aucun client ni prospect à ce jour.

## Prochaines actions

Suivre `context/PIPELINE.md` avec `/pipeline`.

1. Mercredi 2026-10-07 (Kélian) : démarrage de la prospection par e-mail selon `prospection/outils/plan-demarrage.md` (Google Sheet + script en BROUILLON, 6 messages relus et envoyés à la main, lot « PME e-facture » en premier) ; ensuite 5 à 10 par jour.
2. Avant le lot « cabinets comptables » (EF-CAB) : confirmation de l'associé·e ESSEC (participation, formulation « Nous sommes deux… »).
3. Avant la première facture : choisir la structure juridique à deux associés (une micro-entreprise est individuelle) et obtenir le SIRET ; compléter les mentions légales du site et la signature des e-mails.
4. Lundi 2026-10-12 : premières relances J+5 (vérifier le destinataire et le fil) ; vendredi : point hebdomadaire avec `manager` dans `prospection/suivi.md`.
5. Après 10 envois par offre au moins : comparer EF-V1 (diagnostic gratuit) et EF-V2 (490 € HT) ; seuil d'arrêt proposé : moins de 2 réponses sur 30 envois d'une même offre.
6. Plus tard : script de livraison (vérification SIREN/TVA au registre), taux URSSAF, vérification du nom « Équerre » (INPI, domaine).
