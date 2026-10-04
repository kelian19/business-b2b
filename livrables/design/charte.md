# Charte visuelle v2 (2026-10-04)

Statut : proposition, à valider par Kélian. Une seule charte pour tous les supports (site, slides, e-mail). La v2 remplace la v1 (sobre, claire) par une direction « agence IA à la pointe, crédible pour des experts-comptables » : sections sombres et claires alternées, dégradés subtils, grain, verre léger, grille bento, titres display forts. Site de référence : `livrables/site/index.html` (la v1 reste en `v1.html`).

## Nom (provisoire, à vérifier avant usage)

Retenu : **Atelier Pointage** (« pointer » = rapprocher et vérifier, vocabulaire du métier). Alternatives : **Ligne Claire**, **Atelier Équerre**.

Aucune disponibilité vérifiée. Avant tout usage public :
1. INPI : recherche d'antériorités (base marques, classes 35, 41, 42).
2. Nom de domaine : tester .fr et .com chez un registrar (sans acheter avant décision).
3. Recherche web : nom entre guillemets, seul et avec « comptable », « formation », « automatisation ».

## Couleurs (contraste WCAG calculé, seuil AA : 4,5:1 texte, 3:1 éléments d'interface)

| Rôle | Hex | Usage | Contraste vérifié |
|---|---|---|---|
| Encre (fond sombre) | `#0A1220` | héros, démo, diagnostic, sécurité, à propos, appel final, pied de page | texte `#E8EDF4` 15,9:1 ; texte atténué `#A9B6C6` 9,1:1 |
| Bleu nuit | `#1B3A57` | titres sur fond clair, carte service B (dégradé vers `#0F2338`) | 10,7:1 sur `#F6F4EF` ; `#A9B6C6` dessus 5,7:1 |
| Terre cuite (action) | `#B4532A` | bouton d'action unique (dégradé vers `#9A4422`) | texte blanc 4,99:1 |
| Terre cuite foncée | `#9A4422` | liens et surtitres sur fond clair | 5,9:1 sur `#F6F4EF` ; 6,5:1 sur blanc |
| Terre cuite claire | `#F2A27B` | accents et liens sur fond sombre | 9,1:1 sur encre ; 5,7:1 sur bleu nuit |
| Menthe (signal) | `#5FD4B5` | éléments « extraits / validés » sur fond sombre uniquement | 10,3:1 sur encre ; 6,5:1 sur bleu nuit |
| Texte | `#1F2933` | corps sur fond clair | 13,4:1 sur `#F6F4EF` |
| Texte atténué | `#52606D` | légendes sur fond clair | 5,9:1 sur `#F6F4EF` ; 5,5:1 sur `#E8EDF1` ; 6,5:1 sur blanc |
| Fond clair | `#F6F4EF` / blanc `#FFFFFF` / teinte `#E8EDF1` | sections et cartes claires | |
| Erreur | `#9A1B14` | messages de saisie | 8,3:1 sur blanc |
| Marqueur | `#FFF4C2` sur `#3D3200` | « À COMPLÉTER » | 11,5:1 |

Règles : deux couleurs vives seulement (terre cuite, menthe) ; la menthe ne sert jamais de fond de bouton ni de texte sur fond clair. Bordure des champs de saisie `#6B7885` (3:1 minimum). Ne jamais placer le texte atténué sur l'accent.

Effets autorisés : dégradés radiaux flous (terre cuite et menthe, faible opacité), grain SVG à 9 % (overlay), verre léger (`rgba(255,255,255,.04 à .1)` + flou 14 px) réservé aux panneaux interactifs, lueur qui suit le pointeur sur les cartes, réseau de points en canvas dans le héros. Tous coupés ou figés avec `prefers-reduced-motion`.

## Polices (Google Fonts, licence OFL, `font-display: swap`)

- Titres : **Bricolage Grotesque** (600, 700), interlettrage serré (-0,02 à -0,035 em).
- Texte et interface : **Inter** (400, 500, 600).
- Données (démo) : pile système monospace, pas de troisième police chargée.
- Chiffres : `font-variant-numeric: tabular-nums`.
- Repli : system-ui, Segoe UI.

## Ton éditorial

Vouvoiement, « je » (une seule personne), phrases courtes, concret. Pas de jargon ni de superlatifs. L'IA reste en coulisse : on parle de tâche, de règles, de preuve. Dire ce qu'on ne fait pas. Aucun chiffre sans source ; tout prix est une « hypothèse » tant que non validé (aucun prix n'est affiché publiquement).

## Règles d'usage

- Une seule action par support : « Réserver un appel de 15 min » (bouton terre cuite).
- Pas de logo décidé : nom en texte (Bricolage Grotesque 700). Ne pas dessiner de logo avant validation du nom.
- Pas de prix publics : « Tarif communiqué après l'appel de découverte ».
- Aucun client, logo de client, témoignage, note, nombre de clients, gain chiffré ou statistique inventé. Les exemples fictifs portent la mention « fictif ». Les outils interactifs (calculateur) n'affichent que des résultats calculés à partir des saisies du visiteur, sans valeur par défaut.
- Pas de mention de l'employeur actuel.
- Fonds sombres réservés aux sections courtes (titres, cartes, démos) ; les textes longs restent sur fond clair. Texte courant 16 px minimum.
- Accessibilité : focus visible (3 px), navigation clavier, aria sur accordéon et démo, cibles tactiles 44 px.

## Étude de cas réelle (plus tard)

À publier seulement avec accord écrit du client. Structure fixe :
1. Contexte : taille du cabinet, situation de départ (anonymisable).
2. Tâche : ce qui était répétitif ou à documenter.
3. Ce qui a été fait : étapes, durée réelle.
4. Résultat mesuré : chiffre issu d'une mesure avant/après, méthode indiquée.
5. Accord écrit du client : date, périmètre (nom, logo, chiffres), droit de retrait.
