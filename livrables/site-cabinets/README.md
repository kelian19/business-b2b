# Site agence IA pour cabinets comptables

- `index.html` : version actuelle du site (page unique, aucun build). Ouvrir dans le navigateur, ou clic droit > Open with Live Server dans VS Code.
- `PROMPT.md` : prompt complet pour reconstruire le site proprement (Astro + Tailwind) avec Claude Code.

Direction retenue : Éditorial suisse, bandes bleu nuit. Nom retenu : Équerre (INPI et domaine à vérifier, equerre.fr est pris).
Champs `À COMPLÉTER` : rendez-vous, e-mail, SIRET, adresse, hébergeur, politique de données, photo.

- `index-conversion.html` : version courte centrée sur l'appel de 15 min (une offre, calculateur dans le héros, barre d'appel mobile). À tester contre `index.html` quand il y aura du trafic.

- `next/` : version Next.js 15 avec animations au défilement (voir `next/README.md`). `index.html` reste la référence sans build.
