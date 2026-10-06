// Toutes les données et tous les textes modifiables du site sont ici.
// Les champs « À COMPLÉTER » restent visibles tant que l'information n'est pas fournie : n'inventez rien.

export const SITE = {
  name: 'Équerre', // nom provisoire : INPI et domaine à vérifier
  email: 'keliankaddouripro@gmail.com',
  emailSubject: 'Appel de 15 min',
  phone: '+33 6 02 43 65 99',
  phoneHref: 'tel:+33602436599',
  bookingUrl: '', // lien Calendly / Cal.com : vide = marqueur « À COMPLÉTER » affiché
};

export const NAV = [
  { href: '#services', label: 'Services' },
  { href: '#demo', label: 'Démo' },
  { href: '#methode', label: 'Méthode' },
  { href: '#confidentialite', label: 'Confidentialité' },
  { href: '#faq', label: 'FAQ' },
];

export const LEDGER = [
  "Règles d'usage écrites",
  'Secret professionnel préservé',
  'Trace datée et dossier à jour',
  'Une tâche répétitive en moins',
];

// Bandeau défilant : thèmes déjà présents dans le contenu du site
export const MARQUEE = [
  'Secret professionnel',
  'RGPD',
  'Facture électronique',
  'Article 4',
  "Charte d'usage",
  'Registre des outils',
  'Reporting mensuel',
  'Une tâche en moins',
];

export const MANIFESTO =
  "Votre équipe utilise déjà l'IA. Donnons-lui des règles claires, supprimons une tâche répétitive, et gardez la preuve. Vous gardez vos outils, votre équipe relit tout.";

export const METHOD = [
  { n: '1', d: '15 minutes', t: 'Appel découverte', p: "On parle de votre cabinet, de ce que fait déjà l'équipe avec l'IA, et de ce qui vous prend du temps. Je vous dis honnêtement si je peux vous aider." },
  { n: '2', d: 'Environ 1 h 30', t: 'Diagnostic ou atelier', p: "Service A : atelier d'équipe sur les usages de l'IA. Service B : diagnostic pour choisir la tâche et mesurer son coût actuel." },
  { n: '3', d: '2 à 3 semaines', t: 'Mise en place et suivi', p: 'Livraison à prix fixe, test sur un dossier, puis suivi en option. Votre équipe relit tout.' },
];

export const FAQ = [
  ['Est-ce une mise en conformité garantie ?', 'Non. Je ne délivre ni certification ni garantie de conformité. Vous repartez avec des règles écrites, une trace datée et un dossier à jour, que votre cabinet garde sous sa responsabilité.'],
  ['Faut-il nous donner accès à nos données ?', "Pas pour commencer. L'atelier et le diagnostic peuvent se faire avec des exemples fictifs. Avant tout accès à des données réelles, nous signons un contrat de sous-traitance des données (article 28 du RGPD)."],
  ['Remplacez-vous notre logiciel ?', 'Non. Vous gardez vos outils. Les automatisations se branchent dessus.'],
  ['Combien de temps cela prend-il ?', 'Service A, formule Express : moins de 2 semaines. Service B : un diagnostic d\'environ 1 h 30, puis une mise en place de 2 à 3 semaines environ, testée sur un dossier avant généralisation.'],
  ['Combien ça coûte ?', 'Le tarif est communiqué après l\'appel de découverte. La mise en place du service B se fait à prix fixe.'],
  ['Que se passe-t-il après la mise en place ?', 'Vous pouvez choisir un suivi : un point annuel pour le service A, un suivi mensuel pour le service B. Les deux sont optionnels.'],
  ['Travaillez-vous à distance ?', "Oui. L'atelier et le diagnostic se font en visio."],
];

// Retour d'expérience. Tant que `fictif` est true, la section s'affiche comme « cas illustratif ».
// Quand un vrai cabinet a donné son accord écrit : passer `fictif` à false, remplacer les textes
// et renseigner `resultat`, `citation` et `accord`. N'inventez ni chiffre ni citation.
export const CASE = {
  fictif: true,
  titre: "Supprimer la ressaisie des factures fournisseurs",
  profil: 'Cabinet fictif de quelques personnes',
  etapes: [
    { k: 'Contexte', d: 'Au départ', t: 'Chaque mois, la même ressaisie', p: "Chaque mois, l'équipe retape à la main les factures fournisseurs de ses clients : fournisseur, date, montants. C'est long, répétitif, et une erreur de frappe passe vite." },
    { k: 'Diagnostic', d: 'Environ 1 h 30 en visio', t: 'Une seule tâche choisie', p: "On choisit ensemble la ressaisie des factures, et on mesure avec l'équipe le temps qu'elle prend aujourd'hui. Le logiciel comptable reste en place." },
    { k: 'Mise en place', d: '2 à 3 semaines environ', t: 'Un outil qui pré-remplit', p: "L'outil lit chaque facture, pré-remplit les champs et vérifie que HT + TVA = TTC. Il est testé sur un dossier avant d'être étendu aux autres." },
    { k: 'Au quotidien', d: 'Ensuite', t: "L'équipe valide, ne ressaisit plus", p: "Chaque facture pré-remplie est relue par l'équipe, qui garde la responsabilité du dossier. Le gain de temps se compare à la mesure faite au diagnostic." },
  ],
  resultat: '', // résultat mesuré, à publier avec l'accord écrit du cabinet
  citation: '', // propos du cabinet, avec accord écrit
};

// Facture fictive de la démo. Les totaux sont recalculés dans les contrôles.
export const INVOICE = {
  fournisseur: 'Zorglub & Fils',
  client: 'Cabinet Exemple',
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
