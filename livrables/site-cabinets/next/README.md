# Équerre : version Next.js animée

Même contenu, mêmes outils (démo, calculateur, auto-diagnostic) et même direction (éditorial suisse, bleu nuit) que `../index.html`, avec des animations liées au défilement.
`../index.html` n'est pas modifié : les deux versions coexistent.

## Lancer
```
npm install
npm run dev      # http://localhost:3000
npm run build    # site statique dans out/
npm start        # sert out/ en local
```

## Modifier
- `lib/site.js` : coordonnées, navigation, bandeau, manifeste, méthode, FAQ, facture fictive. Lien de rendez-vous : `SITE.bookingUrl` (vide = marqueur « À COMPLÉTER »).
- `app/page.jsx` : textes des autres sections et mentions légales.
- `app/globals.css` : styles. Les tons sont définis en haut (`:root`).

## Animations (composants)
Hero (carte qui s'ouvre + titre synchronisé), Marquee (bandeau qui se penche), Manifesto (mots qui s'allument), Services (cartes empilées, ordinateur seulement), Method (ligne de temps), SplitTitle (titres par mot), Reveal, ScrollProgress, Header (se cache à la descente), SmoothScroll (Lenis).
Avec `prefers-reduced-motion`, tout devient statique.

## Mise en ligne
Netlify : dossier de publication `out`, commande `npm run build`. Le site reste en `noindex` (voir `app/layout.jsx`) tant que le lancement n'est pas validé.
Les polices sont auto-hébergées : le texte « Cookies et polices » des mentions légales a été adapté en conséquence.
