// Toutes les données et tous les textes modifiables du site sont ici.
// Les champs « À COMPLÉTER » restent visibles tant que l'information n'est pas fournie : n'inventez rien.

export const SITE = {
  name: 'Équerre', // nom provisoire : INPI et domaine à vérifier
  email: 'keliankaddouripro@gmail.com', // contact unique
  emailSubject: 'Premier échange',
};

export const NAV = [
  { href: '#services', label: 'Offres' },
  { href: '#demo', label: 'Démo' },
  { href: '#methode', label: 'Méthode' },
  { href: '#equipe', label: 'Équipe' },
  { href: '#confidentialite', label: 'Données' },
  { href: '#faq', label: 'FAQ' },
];

// Coches du héros : ce que contiennent les deux offres, rien d'autre.
export const LEDGER = [
  'Fichier clients fiabilisé',
  '4 nouvelles mentions contrôlées',
  '3 à 5 tâches répétitives cartographiées',
  'Un prototype sur la première',
];

// Bandeau défilant : thèmes déjà présents dans le contenu du site
export const MARQUEE = [
  'Facture électronique',
  'SIREN',
  '4 nouvelles mentions',
  'Septembre 2027',
  'Le Décodeur',
  'Prix fixe',
  'RGPD',
  'Sur un export',
];

export const MANIFESTO =
  "Deux sujets, un même point de départ : vos données et vos tâches de tous les jours. Nous contrôlons vos fichiers et vos factures pour que vous sachiez quoi corriger avant septembre 2027, et nous vous disons franchement où l'IA vous fait gagner du temps, ou pas. Prix fixe, annoncé avant de commencer.";

export const METHOD = [
  { n: '1', d: 'Par e-mail', t: 'Premier échange', p: "Vous nous écrivez en une ligne. Nous répondons avec les modalités et le prix fixe. Si vous préférez parler, une courte visio est possible, sur demande." },
  { n: '2', d: '5 jours ouvrés ou 2 semaines (hypothèses)', t: 'Diagnostic et livraison à prix fixe', p: "Dossier facture électronique : un fichier fiabilisé, le contrôle de 3 modèles de factures et un rapport. Le Décodeur : questionnaire écrit, cartographie des tâches, recommandations et prototype." },
  { n: '3', d: 'En option', t: 'Mise à niveau', p: "Un nouveau contrôle avant septembre 2027 pour le dossier, un ajustement du prototype après quelques semaines d'usage pour le Décodeur. Vous décidez." },
];

export const FAQ = [
  ['Est-ce une mise en conformité garantie ?', "Non. Nous ne garantissons pas la conformité de votre entreprise, nous ne donnons ni conseil fiscal ni conseil juridique et nous ne promettons pas d'éviter une amende. Nous listons des points à corriger : la décision reste la vôtre."],
  ['Quelles données vous faut-il, et que devient mon fichier ?', "Nous travaillons sur un export, sans accès à vos logiciels. Pour le dossier : une ligne par client ou fournisseur, sans noms de contacts. Si le fichier contient des entrepreneurs individuels (des personnes physiques), nous signons d'abord un contrat de sous-traitance des données (article 28 du RGPD). Vos fichiers sont supprimés après la livraison, avec confirmation par e-mail."],
  ['Vendez-vous une plateforme agréée ?', "Non. Nous ne vendons aucune plateforme : nous sommes neutres. Le dossier vaut quelle que soit celle que vous choisirez."],
  ['Combien ça coûte ?', "Le prix est fixe et annoncé avant de commencer, dans notre première réponse."],
  ['Le Décodeur trouve-t-il toujours une solution ?', "Non, et nous préférons vous le dire. Il peut conclure qu'un outil existant suffit, ou que l'automatisation ne vaut pas le coup pour une tâche donnée. La cartographie l'indique alors clairement, et précise où une relecture humaine reste nécessaire."],
  ['Combien de temps cela prend-il ?', "Délais indicatifs, à confirmer sur les premiers dossiers : environ 5 jours ouvrés pour le dossier facture électronique, à partir de l'export et de 3 de vos modèles de factures ; environ 2 semaines pour le Décodeur."],
  ["Corrigez-vous nos données, installez-vous un logiciel ?", "Non. Pour le dossier, vous corrigez (ou votre prestataire) à partir du rapport. Pour le Décodeur, nous ne revendons aucun outil : vous achetez vous-même les outils éventuels, dont le coût figure dans la cartographie. Une mise en place de la solution retenue est possible en option, sur devis établi après le Décodeur."],
  ['Travaillez-vous à distance ?', "Oui. Tout se fait par e-mail et sur des fichiers exportés. Une courte visio est possible si vous la souhaitez."],
];

// Section « pont » : [souci du dirigeant, bénéfice obtenu]. Pas de chiffre, uniquement ce que les offres promettent.
export const BRIDGE = [
  ["Le SIREN et l'adresse de livraison de vos clients ne sont pas tous fiables dans votre fichier.", 'Un fichier fiabilisé : chaque ligne est marquée « vérifiée » ou « à trancher ».'],
  ['Vous ne savez pas si vos modèles de factures portent les 4 nouvelles mentions.', 'Le contrôle de 3 de vos modèles et un rapport des points à corriger avant le 1er septembre 2027.'],
  ["Vous voulez utiliser l'IA mais ne savez pas par où commencer.", 'Une cartographie de 3 à 5 tâches répétitives, avec une solution recommandée, son coût estimé et ses risques pour chacune.'],
  ['Une tâche répétitive vous prend du temps chaque semaine.', 'Un prototype fonctionnel sur la tâche prioritaire : vous voyez la solution marcher avant de décider.'],
  ["Vous hésitez à confier vos données.", "Un travail sur un export, sans accès à vos logiciels, et des fichiers supprimés après la livraison."],
];

// Facture fictive de la démo. Les totaux sont recalculés dans les contrôles.
export const INVOICE = {
  fournisseur: 'Zorglub & Fils',
  client: 'Société Exemple',
  siren: '123 456 789', // fictif
  nature: 'Prestation de services',
  numero: 'F-2026-0417',
  date: '14/09/2026',
  echeance: '14/10/2026',
  lignes: [
    ['Maintenance serveurs, septembre', 1, 600],
    ['Licence outil de gestion', 5, 90],
    ['Intervention sur site (heures)', 2, 100],
  ],
  ht: 1250,
  tva: 250,
  ttc: 1500,
  iban: 'FR76 0000 0000 0000 0000 0000 000',
};

// Motif décoratif du QR de la facture (1 = case vide)
export const QR = [0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,1,0,1,0,0,1,1,0,1,0,0,1,0,0,1,0,0,1,0,1,0,0,0,0,1,0,0,1];
