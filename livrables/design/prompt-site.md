# Prompt : site vitrine « agence IA » pour cabinets comptables

> Mode d'emploi pour Kélian : copier tout ce qui se trouve sous la ligne « DÉBUT DU PROMPT » et le coller dans Claude sur le PC.
> - **Claude Design** : le coller tel quel ; une fois le design validé, l'envoyer à Claude Code (Share → Send to → Claude Code) avec « Construis ce site selon la section 9 du prompt ».
> - **Claude Code** (application de bureau, nouvelle session dans un dossier vide) : le coller tel quel ; Claude code directement.
> Avant de coller, remplacer les champs `[À COMPLÉTER]` que vous connaissez déjà ; laisser les autres tels quels.

---

DÉBUT DU PROMPT

## 1. Ton rôle (P : persona)

Tu es directeur artistique et développeur front-end senior dans une agence web primée, spécialisé dans les sites de studios d'IA et de SaaS B2B haut de gamme (niveau de finition de Linear, Vercel, Stripe, Anthropic). Tu maîtrises le design system, la typographie éditoriale, le motion design sobre, l'accessibilité (WCAG 2.2 AA), le SEO technique et la performance (Core Web Vitals). Tu écris un français impeccable, sobre et précis, qui parle à des dirigeants non techniques.

## 2. Objectif (O)

Concevoir puis construire le site vitrine d'une **agence IA qui travaille pour les cabinets d'expertise comptable**. Le site doit :
1. faire immédiatement « agence IA moderne, à la pointe » (première impression en 3 secondes) ;
2. rester crédible et rassurant pour un expert-comptable de 45-60 ans, prudent, attaché au secret professionnel ;
3. obtenir **une seule action** : réserver un appel découverte de 15 minutes ;
4. montrer le savoir-faire par l'interaction (démo, calculateur, diagnostic) plutôt que par des promesses ;
5. être ultra rapide, accessible et bien référencé.

## 3. Situation (S : contexte complet)

### Le porteur
- Kélian Kaddouri, data scientist (MSc ENSAE ; Python, mise en production, automatisation). Ne pas mettre en avant l'actuariat ni le cyber-risque. Micro-entreprise en cours de création. Travaille seul pour l'instant.
- **Aucun client à ce jour.** Les premiers cabinets travaillent à des conditions de lancement.
- Nom de l'agence : `[À COMPLÉTER : nom définitif]` (nom retenu : « Équerre » ; disponibilité non vérifiée). Si le nom n'est pas rempli, utilise « Équerre » et signale-le.
- Adresse e-mail de contact : `[À COMPLÉTER]`. Lien de prise de rendez-vous (Calendly, Cal.com, etc.) : `[À COMPLÉTER]`. Si vides, laisse un marqueur visible `À COMPLÉTER` dans le code, n'invente rien.

### La cible
- Petits cabinets d'expertise comptable indépendants en France (environ 2 à 20 personnes).
- Décideur : expert-comptable associé ou gérant. Peu de temps, méfiant envers le jargon technique, sensible au risque, au secret professionnel et au RGPD.
- Contexte réglementaire qui crée le besoin (à citer avec ces dates exactes, sans en ajouter) :
  - **Règlement européen sur l'IA (AI Act), article 4** : les entreprises qui utilisent l'IA à titre professionnel doivent assurer un niveau suffisant de maîtrise de l'IA de leur personnel ; applicable depuis le 2 février 2025 ; surveillance et sanctions à partir du 2 août 2026 ; aucune certification n'est exigée.
  - **Facturation électronique** : depuis le 1er septembre 2026, toutes les entreprises doivent pouvoir recevoir des factures électroniques ; l'émission devient obligatoire pour les PME, TPE et micro-entreprises au 1er septembre 2027.

### Les deux services (contenu à reprendre fidèlement)

**Service A : « Votre équipe utilise l'IA sans risque pour le secret professionnel, et vous avez la preuve prête »**
- Express : atelier d'équipe en visio (environ 1 h 30) sur ce qu'on peut faire ou non avec l'IA au cabinet, avec des cas concrets du métier ; charte d'usage de l'IA adaptée au cabinet (secret professionnel, données clients, RGPD, outils autorisés) ; attestation interne de formation pour chaque participant. Livré en moins de 2 semaines.
- Kit complet : tout l'Express, plus un registre des outils IA utilisés (qui, quoi, pour quelles tâches, avec quelles données), un dossier de preuve article 4 réunissant tout, et un point de suivi annuel en option.
- Résultat promis : une équipe alignée sur des règles simples, une trace écrite datée, un dossier à jour en cas de question d'un client, d'un confrère ou d'un contrôle.

**Service B : « Je supprime une tâche répétitive de votre cabinet »**
- On choisit ensemble UNE tâche et on la fait disparaître. La technologie reste en coulisse : le cabinet garde ses outils, on ne remplace pas le logiciel comptable, on se branche dessus.
- Exemples : saisie et pré-traitement des factures fournisseurs des clients (et préparation à la facture électronique) ; reporting mensuel automatique pour les clients du cabinet à partir des exports ; petit outil sur mesure (relance de pièces manquantes, contrôle, tri).
- Déroulé : 1) diagnostic d'environ 1 h 30 en visio pour choisir la tâche et mesurer le temps qu'elle prend aujourd'hui ; 2) mise en place à prix fixe en 2 à 3 semaines environ, testée sur un dossier avant généralisation ; 3) suivi mensuel optionnel.
- Gain de temps : « à mesurer pendant le diagnostic », jamais chiffré à l'avance.

### Ce que l'agence ne fait pas (à afficher clairement, c'est un argument de confiance)
Pas de certification ni de garantie de conformité ; pas de conseil juridique ou fiscal ; pas de remplacement du logiciel comptable ; pas de signature à la place du cabinet. Les résultats sont toujours relus par l'équipe du cabinet, qui garde la responsabilité de ses dossiers.

### Données et confidentialité
Les données des clients du cabinet restent sous le contrôle du cabinet. Aucune donnée client n'est placée dans un outil que le cabinet n'a pas validé. Le diagnostic et l'atelier peuvent se faire uniquement avec des exemples fictifs.

## 4. Direction artistique

Propose **3 directions artistiques distinctes** avant de produire le site complet (planche courte pour chacune : palette, typographies, un aperçu du héros, une carte de service, un bouton). Exemples de pistes, à dépasser :
1. **« Encre et lumière »** : sections très sombres (bleu-noir profond) alternant avec des sections claires crème, dégradés flous lumineux, grain discret, verre dépoli léger.
2. **« Éditorial suisse »** : fond clair, grille stricte, typographie display très grande, un seul accent couleur vif, beaucoup de blanc, lignes fines.
3. **« Précision comptable »** : esthétique de grand livre et de pointage (lignes, colonnes, coches, chiffres tabulaires) réinterprétée de façon futuriste.

Contraintes communes :
- 2 polices maximum (3 si une monospace sert à la démo), libres (Google Fonts ou auto-hébergées) : une display moderne et distinctive pour les titres, une sans-serif très lisible pour le texte. Chiffres tabulaires disponibles.
- 1 couleur principale, 1 couleur d'accent pour l'unique bouton d'action, des neutres. Contraste AA vérifié et indiqué pour chaque paire texte/fond.
- Pas de visuels clichés de l'IA : ni robot, ni cerveau lumineux, ni main humaine qui touche une main robotique, ni image générée de bureau.
- Illustrations en SVG ou en CSS ; motif signature lié au métier (coche de pointage, colonnes, flux de documents).

**Attends que je choisisse une direction** avant de construire tout le site.

## 5. Structure de la page (une seule page, ancres de navigation)

1. **En-tête collant** : nom/logo texte, liens d'ancres (Services, Démo, Méthode, Confidentialité, FAQ), bouton « Réserver un appel ». Menu mobile accessible.
2. **Héros** : titre fort (moins de 10 mots, orienté résultat pour un cabinet), sous-titre de 2 lignes, bouton principal « Réserver un appel de 15 min », lien secondaire « Voir la démo ». Fond animé léger (réseau de points, flux de documents ou lignes de grand livre en canvas ou CSS).
3. **Bande de contexte** : les deux échéances réglementaires ci-dessus, présentées sobrement en frise ou en 2 cartes datées.
4. **Services A et B** : grille de cartes (« bento »), chaque service avec son titre-résultat, 3 à 5 puces, ce que le cabinet obtient, et un lien vers l'appel.
5. **Démo interactive « extraction de facture »** (voir section 6).
6. **Calculateur « temps récupérable »** (voir section 6).
7. **Auto-diagnostic « Votre cabinet et l'IA »** (voir section 6).
8. **Méthode en 3 étapes** : appel de 15 min → diagnostic ou atelier → mise en place et suivi. Visuel en ligne de temps.
9. **Confidentialité et sécurité** : secret professionnel, RGPD, données sous le contrôle du cabinet, exemples fictifs possibles.
10. **Ce que je ne fais pas** : liste courte et nette.
11. **Premiers retours** : bloc vide marqué `À COMPLÉTER` avec la phrase « Les premières études de cas seront publiées avec l'accord écrit des cabinets. »
12. **À propos** : parcours de Kélian en 3-4 lignes, à la première personne (« je »), photo `[À COMPLÉTER]` en option.
13. **FAQ en accordéon** (6 à 8 questions) : Est-ce de la mise en conformité garantie ? Faut-il donner accès à nos données ? Remplacez-vous notre logiciel ? Combien de temps cela prend-il ? Combien ça coûte ? (réponse : tarif communiqué après l'appel de découverte) ; Que se passe-t-il après la mise en place ? ; Travaillez-vous à distance ?
14. **Appel final** : rappel de la promesse et bouton.
15. **Pied de page** : mentions légales (éditeur, statut micro-entreprise, SIRET, adresse, contact, directeur de la publication, hébergeur, politique de données), tout en `À COMPLÉTER`.

## 6. Éléments interactifs (honnêtes, testables)

1. **Démo « extraction de facture »** : une facture fictive (étiquetée en clair « Document fictif, démo ») d'un fournisseur fictif au nom manifestement inventé. Au clic sur « Extraire », animation qui surligne puis remplit les champs : fournisseur, date, numéro, montant HT, TVA, TTC, avec une coche de contrôle « HT + TVA = TTC ». Bouton « Recommencer ». Données fictives cohérentes.
2. **Calculateur « temps récupérable »** : le visiteur saisit lui-même ses valeurs (nombre de factures par mois, minutes par facture, part qu'il estime automatisable en %). Aucune valeur par défaut présentée comme une statistique (champs vides ou exemples grisés). Résultat en heures par mois et par an, avec la mention « Estimation calculée à partir de vos saisies ». Validation des saisies (pas de négatif, pas plus de 100 %).
3. **Auto-diagnostic** : 5 questions oui/non (l'équipe utilise-t-elle déjà l'IA ? existe-t-il des règles écrites ? une tâche revient-elle chaque mois ? les clients posent-ils des questions sur la facture électronique ? avez-vous des exports réguliers ?). Résultat : orientation vers le service A, B ou les deux, sans aucune promesse de conformité.

## 7. Exclusions (E : ce que tu ne dois surtout pas faire)

- **N'invente aucun client, logo de client, témoignage, note, étude de cas, nombre de clients ou de projets, récompense, statistique ou chiffre de gain.** Pas de « Ils nous font confiance », pas de « +200 cabinets », pas de « 80 % de temps gagné ».
- **N'affiche aucun prix** (« Tarif communiqué après l'appel de découverte »).
- N'invente ni adresse, ni SIRET, ni e-mail, ni numéro de téléphone, ni nom d'équipe : garde `À COMPLÉTER`.
- Ne parle pas d'une équipe : Kélian travaille seul (« je » ou formulation neutre).
- Ne promets ni certification, ni conformité garantie, ni conseil juridique.
- Ne cite aucun logiciel comptable, aucun concurrent, aucun employeur.
- Pas de jargon technique dans les textes visibles (« LLM », « RAG », « agent autonome », « fine-tuning ») : parler de résultats pour le cabinet.
- Pas de carrousel automatique, pas de pop-up, pas de chatbot, pas de vidéo en lecture automatique, pas de bannière cookies inutile (aucun traceur).
- Pas de bibliothèque lourde pour de simples animations ; pas d'images bitmap lourdes.
- Pas de texte en lorem ipsum : tout le contenu est rédigé en français final.

## 8. Références (R)

- Niveau de finition visé : linear.app, vercel.com, stripe.com, anthropic.com (rigueur de la typographie, sobriété des animations, clarté de la hiérarchie). S'en inspirer, ne rien copier.
- Ton des textes : phrases courtes, verbes d'action, bénéfice concret pour le cabinet, zéro superlatif creux.
- Exemple de ton juste : « Votre équipe utilise déjà l'IA. Donnons-lui des règles claires, et gardez la preuve. »
- Exemple de ton à éviter : « Révolutionnez votre cabinet grâce à notre IA de pointe ! »

## 9. Exigences techniques (pour Claude Code)

- **Stack** : Astro (site statique) + Tailwind CSS + TypeScript, JavaScript minimal en îlots pour la démo, le calculateur, le diagnostic et l'accordéon. Si tu juges une autre stack meilleure, justifie-le en 3 lignes avant de commencer.
- **Performance** : Lighthouse visé ≥ 95 sur les 4 axes en mobile ; LCP < 2 s ; CLS ≈ 0 ; polices en `woff2`, `font-display: swap`, préchargement de la police des titres ; pas de JavaScript bloquant ; SVG en ligne.
- **Animations** : apparition au défilement (IntersectionObserver), micro-interactions au survol, fond animé du héros léger (canvas ou CSS, 60 i/s, mis en pause hors écran). Tout est désactivé avec `prefers-reduced-motion`.
- **Accessibilité** : HTML sémantique, une seule `h1`, ordre des titres logique, focus visible, navigation complète au clavier, `aria` pour l'accordéon, la démo et le menu mobile, textes alternatifs, contrastes AA.
- **SEO** : `title` et `meta description` en français, Open Graph et Twitter Card (image de partage à générer en SVG/PNG simple, sans visuel inventé), données structurées JSON-LD `ProfessionalService` (nom et description uniquement), `sitemap.xml`, `robots.txt`. Mettre `noindex` tant que je n'ai pas validé le lancement.
- **Responsive** : parfait de 360 px à 1920 px, sans défilement horizontal.
- **Formulaire** : pas de formulaire côté serveur ; le bouton mène au lien de rendez-vous ou à un `mailto:` (`À COMPLÉTER`).
- **Livrables** : code propre dans un dépôt, `README.md` (lancer en local, construire, déployer sur Vercel, Netlify ou GitHub Pages), fichier `design-system.md` (couleurs, typographies, espacements, composants), et la liste de tous les `À COMPLÉTER` restants.
- **Vérification finale** : lance le site en local, teste la démo, le calculateur, le diagnostic, l'accordéon et le menu mobile, vérifie la console (0 erreur), fais des captures en 390 px et 1440 px, et donne-moi un rapport court : ce qui est fait, scores obtenus, points à valider.

## 10. Déroulé attendu

1. Pose-moi au maximum 5 questions si quelque chose d'essentiel manque (sinon, avance).
2. Propose les 3 directions artistiques (section 4) et attends mon choix.
3. Construis le design system, puis la page complète.
4. Fais la vérification finale (section 9) et liste les `À COMPLÉTER`.

FIN DU PROMPT
