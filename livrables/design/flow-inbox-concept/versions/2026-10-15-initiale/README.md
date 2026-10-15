# Maquette locale — studio d’automatisation

Étude du 15 octobre 2026, réalisée après le partage de ressources GitHub de design. Ce dossier explore le futur site ; il ne remplace pas le site Équerre et ne valide ni la marque ni le plan technique Flow Inbox.

## Voir la maquette

Ouvrir [index.html](index.html) dans un navigateur. Aucun paquet, compte ou téléchargement de police n’est nécessaire. Les liens vers des documents Markdown peuvent être affichés comme du texte ou téléchargés selon le navigateur.

Pour servir les fichiers en HTTP sous PowerShell, depuis ce dossier :

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Puis ouvrir `http://127.0.0.1:8765/`. Ce serveur limité à la maquette ne sert pas la fiche pilote située hors du dossier ; pour consulter celle-ci, utiliser le [fichier local](../../offre/flow-inbox-pilote.md). Arrêter le serveur avec Ctrl+C.

## Direction proposée

Studio éditorial, avec papier crème, encre vert sombre et accent orange. Titres sans empattement, mot en italique sérif, filets et composition asymétrique. Le parcours opérationnel est illustré par un schéma original en HTML/CSS/SVG. Le titre « Votre agence crée. Le reste suit. » est une proposition de texte à valider.

Le libellé « Studio d’automatisation » décrit l’activité et sert de repère graphique ; ce n’est pas un nom de marque choisi. Les polices système évitent toute dépendance externe. Le rendu typographique peut varier entre appareils.

Les boutons de scénario changent uniquement des textes préécrits. Les accordéons utilisent les éléments natifs `details` et `summary`. Aucun traitement d’email, intégration, appel IA, collecte ou envoi ; l’illustration de site n’est pas un prototype fonctionnel Flow Inbox. La prise de contact est explicitement laissée inactive dans cette étude.

Le tracé décoratif effectue deux cycles puis s’arrête. La préférence de réduction des mouvements supprime animations et défilement fluide. Le contenu et le scénario initial restent lisibles sans JavaScript.

## Ressources et suite

La [sélection sourcée et les autres directions](../../../docs/SELECTION_DESIGN_SITE.md) expliquent l’usage possible des dix dépôts partagés. Aucun de leurs scripts, skills, composants ou connecteurs n’est installé ou copié. Cette maquette utilise du code original, sans dépendance JavaScript.

Après choix du positionnement, du nom et de la direction visuelle, adapter les composants du site Next.js existant. Conserver son lockfile et ses outils de mouvement lorsqu’ils répondent au besoin. Revoir les textes commerciaux et informations d’identité avant publication, qui reste une action séparée.

## Contrôles

Le résultat des contrôles de navigateur, des liens et de Git est consigné dans la [sélection de design](../../../docs/SELECTION_DESIGN_SITE.md). Les captures locales sont rangées dans `captures/`, ignoré par Git. Aucun build du site Next.js n’est requis pour cette maquette indépendante.
