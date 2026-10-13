---
name: actuarial-modeling
description: Modélisation actuarielle quantitative (fréquence-sévérité, EVT, réassurance, agrégation, VaR/TVaR, capital, risque cyber). À utiliser pour calibrer, simuler ou documenter un modèle de perte ou de capital.
---

# Cadrage

- Définir d'abord les variables, unités, devise, horizon et périmètre.
- Séparer fréquence, sévérité et perte agrégée. Dire quelle dépendance est modélisée entre elles.

# Modélisation

- Fréquence : tester la sur-dispersion avant de choisir Poisson ou binomiale négative.
- Sévérité : comparer plusieurs lois (log-normale, Pareto, Weibull, mélange) avec QQ-plot, AIC/BIC et test d'adéquation.
- EVT : justifier le seuil (mean excess plot, stabilité des paramètres), donner les diagnostics et l'incertitude sur l'indice de queue.
- Agrégation : préciser la méthode (Monte Carlo, FFT, Panjer) et le nombre de simulations ; indiquer l'erreur de simulation sur les quantiles extrêmes.
- Réassurance : modéliser les traités (quote-part, excédent de sinistre, stop-loss) sur les pertes brutes, puis nettes.

# Mesures de risque

- Distinguer VaR, TVaR, quantile empirique et espérance conditionnelle ; ne jamais les employer comme synonymes.
- Donner la mesure, le niveau et l'horizon (ex. VaR 99,5 % à un an).

# Rigueur

- Ne jamais inventer de données ni de paramètres : signaler tout paramètre posé par hypothèse.
- Documenter hypothèses, calibration, limites et sensibilité (au seuil EVT, aux lois, à la dépendance).
- Python reproductible : graine fixée, versions des paquets, aucune valeur codée en dur sans commentaire.
- Répondre en français sauf demande contraire.
