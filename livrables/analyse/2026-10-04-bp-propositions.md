# BP comparé de 3 propositions (2026-10-04)

Source des calculs : `livrables/analyse/bp_calc.py` (python bp_calc.py). Sources d'entrée : `context/CONTEXT.md` (capacité, coûts, cotisations, fourchettes de prix) ; recherche corrigée (erratum) pour les faits externes. Tout le reste est **hypothèse**, non validée : taux de conversion, temps de livraison, prix B, churn. Aucun client, aucun prospect à ce jour.

## 1. Cadre commun

| Élément | Valeur | Statut |
|---|---|---|
| Capacité | 19 h/mois (18-20), dont 5 h de prospection | CONTEXT.md (4-5 h/sem) ; 5 h = hypothèse |
| Coûts fixes | 50 €/mois | Hypothèse CONTEXT.md |
| Cotisations | 25 % du CA | Hypothèse, à vérifier URSSAF |
| Coût IA variable | 1 % du CA | Hypothèse CONTEXT.md (< 1 %) |
| CA pour 1 000 € de bénéfice | (1 000 + 50) / (1 − 0,25) = **1 400 €/mois** | Calcul |
| Définitions | Marge = CA − coûts variables ; bénéfice = marge − cotisations − 50 € fixes | |
| Calendrier | Mois 1-2 : offre + test ; 1re vente au mois 3 | Hypothèse |
| Prospection | 30 / 50 / 70 contacts/mois (pess./central/opti.) sans réseau | Hypothèse |

Faits externes (corrigés) : 18 % des entreprises FR utilisent une IA en 2025 (INSEE Première n° 2120, juillet 2026) ; art. 4 AI Act s'applique aux entreprises qui utilisent l'IA, en vigueur depuis le 02/02/2025, sanctions dès le 02/08/2026, aucune certification exigée ; e-facturation : réception 01/09/2026 pour tous, émission PME/TPE 01/09/2027.

## 2. Les trois offres

| | **A. Conformité AI Act art. 4** | **B. Factures / e-facturation** | **C. Reporting mensuel** |
|---|---|---|---|
| Offre | Formation courte de l'équipe + charte d'usage + registre des outils + dossier de preuve ; suivi annuel en option. | Préparer la TPE-PME à l'e-facturation et automatiser la saisie des factures fournisseurs (ou sous-traitance cabinets). | Tableau de bord mensuel automatique à partir des exports Excel/logiciel, livré chaque mois. |
| Cible / décideur | PME qui utilisent déjà ChatGPT/Copilot (≈ 18 % des entreprises) ; dirigeant, DAF ou RH. | TPE-PME à volume de factures fournisseurs ; dirigeant, DAF, ou associé de cabinet. | PME 5-50 pers. (e-commerce, services) ; dirigeant ou resp. finance/ops. |
| Prix | Kit 1 000 € (fourchette 500-1 500 € CONTEXT.md) ; suivi 300 €/an (hyp.) | Setup 600 € + 120 €/mois (**hypothèse**, aucun prix FR exploitable) | Setup 500 € + 150 €/mois (setup : 150-900 $ Upwork/Fiverr ; mensuel : bas de 150-300 €, CONTEXT.md) |
| Livraison / client | 8 h (hyp.) ; suivi 2 h/an | 6 h + 1 h/mois | 6 h + 1,5 h/mois |
| Récurrence | Faible (annuelle, ~5 %/mois de perte) | Moyenne (abonnement, 4 %/mois) | Moyenne (abonnement, 4 %/mois) |
| Clients pour 1 400 € de CA | 1,4 kits/mois (ou 56 suivis : irréaliste) | 2,3 setups/mois, ou 11,7 abonnés | 2,8 setups/mois, ou 9,3 abonnés |
| Heures pour 1 400 € de CA (prospection 5 h incluse) | 16,2 h | 16,7 h (tout abonnés) à 19,0 h (tout setup) | 19,0 h (tout abonnés) à 21,8 h (tout setup) |
| vs capacité 19 h | Tient | Limite | Dépasse en régime « tout setup » |
| CA / h livrée (hors prospection) | 125 €/h au setup | 100 €/h au setup, 120 €/h récurrent | 83 €/h au setup, 100 €/h récurrent |

## 3. Scénarios sur 12 mois (mois 12)

Conversion contact → vente (pess./central/opti.) : A 1,0 / 2,5 / 4,0 % ; B 0,8 / 2,0 / 3,5 % ; C 0,6 / 1,5 / 3,0 % (hypothèses, c'est ce que le test doit mesurer).

| Piste | Scénario | Clients actifs | Ventes cumulées | Heures m12 | CA m12 | Marge m12 | Cotisations m12 | **Bénéfice m12** | Bénéfice cumulé 12 mois |
|---|---|---|---|---|---|---|---|---|---|
| A | pessimiste | 2,1 | 3,0 | 7,7 | 353 | 349 | 88 | **211** | 1 862 |
| A | central | 10,0 | 12,5 | 16,5 | 1 501 | 1 486 | 375 | **1 061** | 9 749 |
| A | optimiste | 14,0 | 16,1 | 19,0 | 1 839 | 1 821 | 460 | **1 311** | 12 855 |
| B | pessimiste | 1,8 | 2,4 | 8,0 | 365 | 362 | 91 | **220** | 1 450 |
| B | central | 8,4 | 10,0 | 18,4 | 1 606 | 1 589 | 402 | **1 138** | 8 182 |
| B | optimiste | 11,0 | 12,4 | 19,0 | 1 680 | 1 663 | 420 | **1 193** | 11 832 |
| C | pessimiste | 1,4 | 1,8 | 7,9 | 298 | 295 | 75 | **170** | 989 |
| C | central | 6,3 | 7,5 | 17,8 | 1 318 | 1 304 | 330 | **925** | 6 246 |
| C | optimiste | 8,4 | 9,5 | 19,0 | 1 416 | 1 402 | 354 | **998** | 10 008 |

(Bénéfice = marge − cotisations − 50 €.) Lecture : l'objectif de 1 000 €/mois n'est atteint au mois 12 que dans le central de A et B, et dans l'optimiste de C ; dans l'optimiste de B et C la capacité de 19 h sature (≈ 10 mois sur 12) et plafonne le bénéfice vers 1 000-1 300 €. Le pessimiste donne 170-220 €/mois : dans cette trajectoire, l'objectif n'est pas atteint.

## 4. Sensibilité (bénéfice m12, central)

| Variation | A | B | C |
|---|---|---|---|
| Base | 1 061 | 1 138 | 925 |
| Conversion divisée par 2 | 505 | 544 | 438 |
| Prix −20 % | 838 | 900 | 730 |
| Cotisations 30 % au lieu de 25 % | 986 | 1 058 | 859 |

Sensibilité principale commune : le **taux de conversion à froid** (diviser par 2 divise le bénéfice par ~2). Ces taux ne sont pas sourcés, et le volume de contacts (50/mois) pèse autant.

## 5. Acquisition sans réseau, test à moins de 100 €, risques

| | **A** | **B** | **C** |
|---|---|---|---|
| Canal | Messages individuels à des dirigeants de PME repérées comme utilisatrices d'IA (offres d'emploi « IA », posts publics) ; LinkedIn, e-mail. Coût ≈ 0 € ; temps 5 h/mois | Cabinets comptables (annuaires publics) puis TPE ; e-mail, LinkedIn. Cycle plus long (hypothèse) | Dirigeants d'e-commerce/services ; très concurrencé par outils gratuits et agences |
| Test (≤ 100 €, 2 semaines) | Page unique + modèle de charte gratuit en échange d'un échange de 15 min ; 30 messages ; seuil : ≥ 3 appels et ≥ 1 intention d'achat écrite à 1 000 € | Page « prêt pour le 01/09/2027 ? » ; 30 messages à cabinets/TPE ; seuil : ≥ 3 appels, 1 pilote gratuit accepté | Un tableau de bord démo (données fictives) envoyé à 30 PME ; seuil : ≥ 3 retours, 1 pilote |
| Coût du test | ≈ 15-30 € (domaine) | ≈ 15-30 € | ≈ 15-30 € |
| Risques | Obligation peu contrôlée en pratique (sanctions à confirmer) ; cible limitée aux entreprises utilisatrices d'IA ; concurrence conseil et formateurs ; pas de certification donc argument « preuve » à construire ; aucun avis juridique : l'offre est une aide, pas un conseil juridique | Données comptables sensibles (RGPD, responsabilité d'erreur) ; éditeurs/plateformes d'e-facturation et logiciels comptables embarquent la fonction ; demande ponctuelle autour des échéances ; prix non étayé | Outils gratuits (Looker Studio, Excel) ; pas de secteur maîtrisé ; accès aux exports clients (RGPD) ; chaque client = maintenance mensuelle |

## 6. Classement et recommandation

| Rang | Piste | Argument |
|---|---|---|
| 1 | **A. Conformité AI Act art. 4** | Le moins d'heures par client (8 h, 125 €/h) et seule piste qui tient dans 19 h avec marge de manœuvre en central (16,5 h) ; prix de départ le seul pris dans CONTEXT.md ; échéance réelle (sanctions 02/08/2026) ; adéquation avec le profil actuaire / conformité. Faiblesse : récurrence quasi nulle, il faut vendre ≈ 1,25 kit chaque mois. |
| 2 | B. Factures / e-facturation | Meilleur central (1 138 €) mais construit sur des prix entièrement hypothétiques, une demande liée à l'échéance 01/09/2027, des données clients sensibles et plus d'heures par client. |
| 3 | C. Reporting | Marché le plus concurrencé (outils gratuits), plus d'heures par client, central 925 €, atteint 1 000 € seulement en optimiste. |

Les écarts de bénéfice central (925-1 138 €) sont inférieurs à l'incertitude sur les hypothèses ; le classement repose donc sur le risque, la charge horaire et la qualité des prix, pas sur le chiffre.

**Recommandation** : piste principale A. Combinaison possible : le dossier de preuve A donne accès à des dirigeants de PME à qui proposer, plus tard, un abonnement récurrent (suivi annuel, ou reporting C) pour corriger la faiblesse de récurrence. B reste une option datée (à relancer en T1-T2 2027 si le test A échoue). Ne pas lancer deux pistes en parallèle : 19 h/mois ne suffisent pas.

**Décision attendue de Kélian**
1. Valider la piste A (go test) ou demander B.
2. Autoriser le test ≤ 100 € : page unique + 30 messages (brouillons Gmail, envoi à la main).
3. Faire vérifier le taux de cotisations (URSSAF) ; l'écart 25 % → 30 % coûte ≈ 75 €/mois de bénéfice.
4. Fixer le seuil de décision : par exemple abandonner A si 30 messages donnent < 2 appels.
