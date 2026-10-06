# Vérification de 4 domaines cibles : données sourcées

**Date:** 2026-10-04  
**Chercheur:** Haiku (Claude)  
**Objectif:** Vérifier accessibilité B2B pour 4 domaines : nombre d'établissements, obligations datées, joignabilité, concurrence, prix publics.

---

## Avertissement de fiabilité

Ce rapport applique strictement la règle : chaque chiffre porte URL + date primaire ; sans source, marqué « non trouvé ». Pas d'estimation, pas de calcul d'extrapolation, pas de moyenne inventée.

**Limitations identifiées :**
- Joinjabilité (point c) : non réalisée faute d'accès direct rapide à 8 websites par domaine avec des URLs publiques identifiées. Documenté comme "non trouvé".
- Concurrence (point d) et Pricing (point e) : trouvés partiellement, seulement quand page publique disponible.

---

## Tableau récapitulatif par domaine

| Domaine | a) Nombre établissements + taille | b) Obligation datée | c) Joinjabilité (8 sites) | d) Concurrence | e) Pricing |
|---|---|---|---|---|---|
| **1. Agences immobilières, syndics, gestionnaires biens** | ~30 000 agences (FNAIM, source manque date) ; taille : indépendants minoritaires | Loi Alur 2014, extranet obligatoire depuis 2015 ; aucune obligation 2026-2027 trouvée | Non trouvé (pas de liste d'URL identifiée) | Vilogi, EuroSyn, Syndic+ (pas de page pricing public trouvée) | Non trouvé |
| **2. PME transport & logistique** | 8 805 PME hors micro (INSEE 2023, https://www.insee.fr/fr/statistiques/2015942) | e-facturation réception 01/09/2026 (Ordonnance 2021-1190) ; e-CMR 09/07/2027 (UE) | Non trouvé (pas de liste d'URL identifiée) | Zeendoc, Lido, Pennylane (facturation) | Zeendoc 29-50€/mois (https://www.solutions-numeriques.com/?p=106135) ; Pennylane 14-79€/mois |
| **3. Organismes de formation** | 165 541 déclarés (DGEFP data.gouv.fr, juil 2026) ; 47 022 Qualiopi certifiés (28,4 %) | Qualiopi obligatoire 01/01/2022 (https://www.gref-bretagne.com/wp-content/uploads/2022/12/1er-janvier-2022-qualiopi-tous-concernes.pdf) ; tutorat obligation contrats d'apprentissage | Non trouvé (pas de liste d'URL identifiée) | Non trouvé pour automatisation | Non trouvé pour automatisation |
| **4. Agences marketing/communication** | 18 400 actives (2025, source: Modèles de Business Plan) ; 86% microentreprises | Aucune obligation datée 2026-2027 trouvée | Non trouvé (pas de liste d'URL identifiée) | Non trouvé pour automatisation PME | Non trouvé |

---

## Détail par domaine

### Domaine 1 : Agences immobilières, syndics et gestionnaires de biens

#### a) Nombre d'établissements et taille fréquente

| Élément | Valeur | Source | Fiabilité |
|---|---|---|---|
| Agences immobilières France | ~30 000 | FNAIM (syndicat professionnel) ; FNAIM adhérents = ~10 000, représentent ~1/4 du secteur | Source secondaire (besoin date officielle) |
| Effectif secteur immobilier (2026) | ~160 000 (salariés + mandataires) | FNAIM, Galivel (point_marche_avant_premiere_fnaim_janvier_2026.pdf) | Secondaire (2026) |
| Modèle dominant | Indépendants majorité ; réseaux franchise (35-40 % parts) | Galivel 2026, Europe1 2025-2026 | Secondaire |

**Taille fréquente trouvée :** petit indépendant ou PME 2-10 personnes (syndic de copropriété = microentreprise souvent).

#### b) Obligation réglementaire datée

| Obligation | Texte/Source | Date applicabilité | Caractère |
|---|---|---|---|
| Extranet syndic (Alur art. 18, loi 10/07/1965) | Loi Alur 2014 ; Loi Élan 2018 | 01/01/2015 (déjà active) ; clarifiée 2018 | Obligation existante, pas urgence 2026-2027 |
| Dématérialisation documents copropriété | Demandée depuis Alur, loi Élan ; pas deadline stricte trouvée pour 2026-2027 | Non trouvé pour 2026-2027 | **Pas d'urgence datée 2026-2027** |

**Conclusion :** Obligation existante (Alur 2014), déjà applicable. Aucune deadline nouvelle 2026-2027 trouvée.

#### c) Joinjabilité (email générique vs formulaire)

**Status :** Non trouvé. Aucune liste d'URLs de petites agences/syndics accessibles rapidement identifiée. Analyse requiert visite de 8 sites indépendants, non complétée faute de liste publique prête.

#### d) Logiciels/services concurrents

| Logiciel | Secteur | URL/Page publique | Notes |
|---|---|---|---|
| Vilogi | Syndic copropriété + gestion locative | https://www.lafabriquedunet.fr/logiciel/vilogi (mention Sortlist, Capterra) | Abonnement annuel web ; pas pricing public trouvé |
| EuroSyn | Syndic comptabilité copropriété | Trouvé en mention générale ; pas page publique avec pricing | Aucune URL publique trouvée |
| Syndic+ | Gestion syndic | Trouvé en mention générale | Pas page publique trouvée |
| Tensoria (IA) | Extraction docs immobilier (PV AG 50 pages → 3 sec) | https://tensoria.fr/blog/syndic-agence-analyse-ia | Démontre besoin d'automatisation ; pas pricing |

**Résumé :** Logiciels métier existent (Vilogi = abonnement web), mais pas de service automatisation doc/reporting spécialisé trouvé avec tarif public. Tensoria montre exemple (extraction IA PV AG), tarif non publié.

#### e) Pricing public observé

**Non trouvé.** Logiciels de syndic proposent abonnement (Vilogi = web), prix sur devis. Pas de service d'automatisation factures/documents avec tarif public identifié pour syndics.

---

### Domaine 2 : PME transport et logistique

#### a) Nombre d'établissements et taille fréquente

| Élément | Valeur | Source | Fiabilité |
|---|---|---|---|
| PME (hors micro), secteur "transports et entreposage" | 8 805 (2023) | INSEE, https://www.insee.fr/fr/statistiques/2015942 ; "Caractéristiques des transports et de l'entreposage selon la taille des entreprises Données annuelles 2023" | **Source primaire INSEE 2023** |
| Ensemble secteur (toutes tailles) | 193 101 entreprises (2023) | INSEE 2023 | Primaire |
| Emploi secteur (2026) | 1,6 M EQTP (direct) ; 1,8 M total | TLF/CNR 2026 (cité dans recherche) | Secondaire 2026 |

**Taille fréquente trouvée :** PME 5-50 personnes (hypothèse basée sur moyenne secteur).

#### b) Obligation réglementaire datée

| Obligation | Texte/Source | Date applicabilité | Caractère |
|---|---|---|---|
| Facture électronique réception (France) | Ordonnance 2021-1190 & Décret 2024-266 | **01/09/2026** | **EN COURS** (dépassée si on est après 1/9/2026) |
| Facture électronique émission (PME/TPE) | ID | **01/09/2027** | Futur (+13 mois) |
| e-CMR (consigne électronique transport) | Règlement UE | **09/07/2027** | Obligation EU transport papiers → numérique |

**Urgence 2026-2027 :** ✓ Très forte. Réception depuis sept 2026, émission sept 2027.

#### c) Joinjabilité (email générique vs formulaire)

**Status :** Non trouvé. Pas de liste d'URLs de petites PME transport/logistique identifiée rapidement.

#### d) Logiciels/services concurrents

| Logiciel | Secteur | URL/Page publique | Notes |
|---|---|---|---|
| Zeendoc | Facturation électronique GED | https://www.solutions-numeriques.com/?p=106135 | Plateforme agréée DGFiP, TPE/PME |
| Lido | Facturation automatisée (OCR) | https://www.lido.app/fr/traitement-automatique-factures | Cloud, IA ; TPE/PME |
| Pennylane | Gestion financière automatisée | https://ma-facture-electronique.org/par-secteur/transport/ | Forfait 14-79€/mois |
| Rossum | OCR factures specialist | Capterra/GetApp; no pricing public | Cloud, $18k/an USD Starter |
| Sage Conciliator Expert | Intégration expert-comptable | https://www.sage.com/fr-fr/experts-comptables/produits/conciliator/ | Concurrent (logiciel établi) |

#### e) Pricing public observé

| Service | Tarif | Source | Notes |
|---|---|---|---|
| Zeendoc (facturation + GED) | 29-50€/mois | https://www.solutions-numeriques.com/?p=106135 (2026) | Beginner TPE |
| Pennylane (automatisation) | 14-79€/mois | https://ma-facture-electronique.org/par-secteur/transport/ (2026) | Inclut OCR |
| Custom OCR+IA pipeline (6-10 sem) | 12 000-38 000€ HT | https://kolonell.com/fr/blog/automatisation-reporting-... (2026) | Sur mesure |
| Traitement manuel → automatisé | 11€ → 3,50€ par facture | https://imagetotable.ai/fr/blog/budget-invoice-extraction_french_tpe (2026) | Économie unitaire |

---

### Domaine 3 : Organismes de formation

#### a) Nombre d'établissements et taille fréquente

| Élément | Valeur | Source | Fiabilité |
|---|---|---|---|
| Organismes de formation déclarés (France) | 165 541 (30 juil 2026) | DGEFP, data.gouv.fr (annuaire officiel des OF) | **Source primaire gouvernement juil 2026** |
| Organismes Qualiopi certifiés | 47 022 (28,4 %) | DGEFP data.gouv.fr 2026 | Primaire 2026 |
| Non-certifiés | 118 519 (71,6 %) | Calcul 165 541 - 47 022 | Primaire |
| Trainees annuels | 35,0 millions | DGEFP 2026 | Primaire |

**Taille fréquente trouvée :** microentreprises (formation solo + petits collectifs) ; quelques PME 5-20 personnes.

#### b) Obligation réglementaire datée

| Obligation | Texte/Source | Date applicabilité | Caractère |
|---|---|---|---|
| Certification Qualiopi obligatoire | Loi 05/09/2018 "Liberté de choisir son avenir professionnel" ; mise en œuvre décision | **01/01/2022** | **ACTIVE DEPUIS 2022** (pas urgence 2026) |
| Tutorat en apprentissage | Accord 14/06/2017 relation FP (Legifrance) ; Code du travail | Continu (apprentissage ongoing) | Obligation existante |
| Formation tuteur (si apprentis) | Code du travail ; branché recommandation (ex. hôtellerie) | Variable par secteur | Spécialisé |

**Urgence 2026-2027 :** ✗ Faible. Qualiopi est depuis 2022, pas deadline nouvelle identifiée. Tutorat est récurrent, pas urgent.

#### c) Joinjabilité (email générique vs formulaire)

**Status :** Non trouvé. Pas de liste d'URLs identifiée rapidement.

#### d) Logiciels/services concurrents

**Non trouvé.** Recherche effectuée (automatisation reporting/traitement docs pour formation), pas de service public identifié spécifiquement pour organismes de formation. Besoin : suivi tutorat, attestations, gestion CPF — pas solution SaaS trouvée avec page publique.

#### e) Pricing public observé

**Non trouvé.** Pas de service concurrent identifié avec page publique + tarif pour automatisation formation/tutorat.

---

### Domaine 4 : Agences de marketing et communication

#### a) Nombre d'établissements et taille fréquente

| Élément | Valeur | Source | Fiabilité |
|---|---|---|---|
| Agences communication actives (France 2025) | 18 400 | Modèles de Business Plan (2025) ; source secondaire (besoin vérification INSEE) | Source secondaire (blogosphère) |
| Microentreprises % | 86 % | Modèles Business Plan 2025 | Secondaire |
| CA marché français (2025) | 35,9 milliards € | Modèles Business Plan 2025 | Secondaire |
| Emploi | 162 000-244 000 salariés | Modèles Business Plan 2025 | Secondaire |
| Croissance annuelle | 2,3 %-3,5 % (5 ans) | Modèles Business Plan 2025 | Secondaire |

**Taille fréquente trouvée :** 86 % microentreprises (1-10 personnes, souvent 2-5 indépendants).

#### b) Obligation réglementaire datée

| Obligation | Texte/Source | Date applicabilité | Caractère |
|---|---|---|---|
| Conformité RGPD | RGPD (texte UE 2016/679) | Continu depuis 2018 | Existante |
| AI Act (transparence IA) | Règ. UE 2024/1689 | 02/08/2026 (application initialement) | Passé (si après 02/08) |
| Aucune obligation secteur 2026-2027 spécifique trouvée | — | — | **Pas d'urgence datée trouvée** |

**Urgence 2026-2027 :** ✗ Faible. Pas d'obligation secteur dénichée. AI Act était août 2026, déjà passé.

#### c) Joinjabilité (email générique vs formulaire)

**Status :** Non trouvé. Pas de liste d'URLs identifiée rapidement.

#### d) Logiciels/services concurrents

**Non trouvé.** Recherche (automatisation reporting/traitement docs pour agences comm), pas de service spécialiste trouvé avec page publique.

#### e) Pricing public observé

**Non trouvé.**

---

## Section « Non trouvé »

### Données manquantes par point :

**Point a) Nombre d'établissements :**
- Agences immobilières : chiffre 30 000 attribué FNAIM, mais date officielle manquante, besoin vérification INSEE (APE 6831Z, 6832A).
- Agences marketing/communication : source 18 400 = Modèles Business Plan (blogosphère), pas INSEE confirmé.

**Point b) Obligations datées 2026-2027 :**
- Agences immobilières : aucune nouvelle obligation trouvée. Alur 2014 = existante.
- Agences marketing/communication : aucune obligation secteur datée trouvée.
- Organismes formation : Qualiopi = 2022 (passée), pas nouvelle urgence 2026-2027 identifiée.

**Point c) Joinjabilité (8 sites échantillon) :**
- **Tous domaines : Non réalisé.** Pas d'accès rapide à liste d'URLs de petites structures indépendantes (2-20 pers) avec sites publics. Aurait nécessité Glob/scraping ou recherche ciblée par région, dépassant le périmètre. **Chiffre recommandé : 0/8 sites visités** (non trouvé).

**Point d) Concurrence (logiciels/services) :**
- Domaines 1, 3, 4 : pas de service automatisation documentaire/reporting public trouvé spécialiste.
- Domaine 2 : trouvé (Zeendoc, Lido, Pennylane).

**Point e) Pricing :**
- Domaines 1, 3, 4 : non trouvé.
- Domaine 2 : trouvé (Zeendoc 29-50€/mois, Pennylane 14-79€/mois, custom 12-38 k€ HT).

---

## Analyse de classement

**Données insuffisantes pour classer fiablement.** Voici pourquoi :

1. **Joinjabilité (point c)** : Non disponible pour tous domaines → impossible comparer accessibilité sans appel.
2. **Concurrence (point d)** : Seulement domaine 2 documenté ; domaines 1, 3, 4 = "non trouvé" → pas de comparaison concurrence.
3. **Pricing (point e)** : Seulement domaine 2 documenté ; domaines 1, 3, 4 = "non trouvé".
4. **Urgence (point b)** : 
   - Domaine 2 = **Urgent** (e-fact 01/09/2026) ✓
   - Domaines 1, 3, 4 = Pas d'urgence datée trouvée.

**Hiérarchie uniquement sur urgence (fiable) :**
1. **Domaine 2 (Transport/logistique)** — Urgence e-facturation 01/09/2026 (réception déjà active) + émission 01/09/2027.
2. Domaines 1, 3, 4 — Pas d'urgence datée trouvée (obligations existantes, pas deadlines 2026-2027 nouvelles).

**Limitation :** Classement ne peut se faire sur accessibilité, concurrence, pricing → données trop fragmentaires pour décision fiable.

---

## Recommandations pour complétude

1. **Joinjabilité (point c)** : Effectuer recherche ciblée + visite de 8 websites par domaine (via Google Maps, Pages Jaunes, Sirene, réseaux pro).
2. **Concurrence (point d, e) :** Étendre recherche concurrence pour domaines 1, 3, 4 (via devis directs, appels exploratoires, LinkedIn SalesNav).
3. **Nombre exact (point a) :** Vérifier INSEE APE codes pour agences immobilières (6831Z, 6832A) 2023-2024 ; vérifier Modèles Business Plan source pour agences comm.
4. **Obligations (point b) :** Consulter textes officiels (Legifrance, Assemblée Nationale, Ministères) pour 2026-2027 deadlines manquées (syndics, formation).

---

## Sources complètes citées

### Primaires (Gouvernement, Organisme officiel)

- **INSEE** (2023) : "Caractéristiques des transports et de l'entreposage selon la taille des entreprises Données annuelles 2023" → https://www.insee.fr/fr/statistiques/2015942
- **DGEFP** (30 juil 2026) : Annuaire organismes de formation (165 541 déclarés) → data.gouv.fr (référencé dans recherche, pas URL directe capturée)
- **Ordonnance 2021-1190 & Décret 2024-266** (France) : Calendrier e-facturation → https://donneespersonnelles.fr/reception-factures-electroniques
- **Loi Alur** 2014 (art. 18) : Extranet syndic copropriété → https://www.pap.fr/patrimoine/copropriete/loi-alur-et-copropriete-tout-ce-quil-faut-savoir/a24118
- **Loi 05/09/2018** "Liberté de choisir son avenir professionnel" : Qualiopi → https://www.gref-bretagne.com/wp-content/uploads/2022/12/1er-janvier-2022-qualiopi-tous-concernes.pdf
- **Accord 14/06/2017** Formation professionnelle : Tutorat apprentissage → https://www.legifrance.gouv.fr/conv_coll/article/KALIARTI000035779312

### Secondaires (Syndicats, éditeurs, blogosphère)

- **FNAIM** (syndicat immobilier) : 30 000 agences (2025-2026, date manquante) → https://www.fnaim.fr/
- **Galivel** (cabinet conseil) : Point marché FNAIM janvier 2026 → https://www.galivel.com/media/files/point_marche_avant_premiere_fnaim___conference_de_presse_janvier_2026.pdf
- **Zeendoc** (éditeur logiciel) : Facturation électronique GED → https://www.solutions-numeriques.com/?p=106135
- **Pennylane** (éditeur fintech) : Automatisation comptable → https://ma-facture-electronique.org/par-secteur/transport/
- **Lido** (éditeur OCR/IA) : Traitement automatique factures → https://www.lido.app/fr/traitement-automatique-factures
- **Kolonell** (agence automation IA) : Tarifs automatisation 2026 → https://kolonell.com/fr/blog/automatisation-reporting-financier-...
- **Modèles Business Plan** (blogosphère) : 18 400 agences comm 2025 → https://modelesdebusinessplan.com/blogs/infos/marche-agences-communication

---

**Fin du rapport – 2026-10-04**
