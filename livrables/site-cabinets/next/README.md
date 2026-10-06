# Équerre : version Next.js animée

Site animé des deux offres v2 (Dossier facture électronique, Le Décodeur), pour dirigeants et DAF de PME (cabinets comptables en second public). Éditorial suisse, bleu nuit, animations liées au défilement.
`../index.html` (ancienne page, anciennes offres) n'est pas modifié : il ne correspond plus à ce site.

## Lancer
```
npm install
npm run dev      # http://localhost:3000
npm run build    # site statique dans out/
npm start        # sert out/ en local
```

## Modifier
- `lib/site.js` : contact (e-mail unique), navigation, bandeau, manifeste, méthode, FAQ, pont, facture fictive.
- `app/page.jsx` : repères datés, textes des autres sections et mentions légales. `components/Services.jsx` : les deux offres. `components/Team.jsx` : équipe (champs « À COMPLÉTER » pour l'associé·e).
- `app/globals.css` : styles. Les tons sont définis en haut (`:root`).

## Animations (composants)
Hero (carte qui s'ouvre + titre synchronisé), Marquee (bandeau qui se penche), Manifesto (mots qui s'allument), Services (cartes empilées, ordinateur seulement), Method (ligne de temps), SplitTitle (titres par mot), Reveal, ScrollProgress, Header (se cache à la descente), SmoothScroll (Lenis).
Avec `prefers-reduced-motion`, tout devient statique.

## Mise en ligne
Netlify : dossier de publication `out`, commande `npm run build`. Le site reste en `noindex` (voir `app/layout.jsx`) tant que le lancement n'est pas validé.
Les polices sont auto-hébergées : le texte « Cookies et polices » des mentions légales a été adapté en conséquence.

- Nom « Équerre » provisoire : INPI et domaine non vérifiés. Mentions légales (éditeur, structure à deux associés, adresse, moyen de contact direct) à faire valider par un juriste avant publication.
