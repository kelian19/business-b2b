export const meta = {
  name: 'equerre-outil-produit',
  description: 'Outil Equerre de A a Z (facture electronique et reporting) : architecture, 4 passes, outil registre, triple verification, corrections',
  whenToUse: 'Construire l outil client complet facture electronique et reporting',
  phases: [
    { title: 'Conception', detail: 'audit UX (reutilise du cache)', model: 'sonnet' },
    { title: 'Architecture', detail: 'modules, donnees, passes', model: 'sonnet' },
    { title: 'Construction', detail: '4 passes successives et outil registre en parallele', model: 'sonnet' },
    { title: 'Vérification', detail: 'justesse, conformite, experience', model: 'sonnet' },
    { title: 'Correction', detail: 'corrections et contre-verification, 2 tours max', model: 'sonnet' },
  ],
}
const MODEL = 'sonnet'
const URL = 'http://127.0.0.1:8771/index.html'

const COMMON = `Contexte : projet c:\\Users\\kelia\\projets\\business-b2b (Windows ; PowerShell et Bash disponibles). Outil : livrables/demo-appel/ (index.html, styles.css, app.js, logic.js, data.js, tests/run-tests.js, script-demo.md, README.md). C'est le support de démonstration en visio (partage d'écran) d'Équerre auprès de DAF de PME et d'experts-comptables, pour l'offre « Dossier facture électronique » (et, en ouverture, « Le Décodeur »).
OBJECTIF DE KÉLIAN : l'outil doit faire PREMIUM et justifier le prix du dossier par un vrai tableau de bord client qui anticipe tous ses besoins. Le prix n'est PAS affiché dans l'outil (il figure dans la proposition) : on justifie par la valeur et la clarté, jamais par des gains inventés.
FAITS VÉRIFIÉS (les seuls autorisés pour la réglementation) :
- Réception des factures électroniques obligatoire pour toutes les entreprises depuis le 1er septembre 2026 ; émission obligatoire pour les PME, TPE et micro-entreprises le 1er septembre 2027.
- Depuis le 1er septembre 2026, 4 nouvelles mentions obligatoires sur les factures entre entreprises assujetties : SIREN du client ; adresse de livraison si elle diffère de l'adresse de facturation ; nature de l'opération (biens, services ou les deux) ; option pour le paiement de la TVA d'après les débits.
- Amende de 50 € par facture non émise sous forme électronique quand c'est obligatoire, plafonnée à 15 000 € par année civile (article 1737 du CGI, loi de finances pour 2026).
Aucune autre obligation, date ou sanction ne doit apparaître (pas d'e-reporting, pas d'annuaire, pas de format imposé nommé, pas de nom de plateforme).
Contraintes non négociables : fonctionne hors ligne par double-clic (file://) avec des scripts classiques relatifs (pas de modules ES) ; AUCUNE requête réseau (pas de CDN, de police distante, de fetch, de XMLHttpRequest, d'URL externe) ; polices système ; couleurs de la marque (papier #E9E5D8, bleu nuit #0F1E3D, encre #111111, rouge #C8200E, nuances dérivées permises) ; bandeau « Données fictives de démonstration » toujours visible ; données entièrement fictives et déterministes ; toute estimation est marquée « estimation » ; « ne constitue pas un conseil fiscal » conservé ; français simple ; jamais d'employeur ni de stage de Kélian, ni actuariat ni cyber-risque ; la commande « node livrables/demo-appel/tests/run-tests.js » doit réussir (code 0) ; aucune donnée ne quitte le navigateur (stockage local éventuel enveloppé dans try/catch, l'outil doit marcher sans). Tu ne fais ni commit, ni push, ni publication.
Navigateur : l'outil est servi sur ${URL} (serveur python). S'il ne répond pas : python -m http.server 8771 --bind 127.0.0.1 --directory livrables/demo-appel (en arrière-plan). Playwright ne peut pas ouvrir file://. Un seul agent utilise le navigateur à la fois.`

const DASHBOARD = `TABLEAU DE BORD DE DIRECTION (nouvel onglet, ouvert par défaut, en tête du parcours de démo), calculé à partir des données fictives et de la date de référence :
1. Compte à rebours jusqu'au 1er septembre 2027 (jours restants depuis la date de référence) et frise des jalons : 1er septembre 2026 réception obligatoire (passé) ; puis étapes de préparation SANS date réglementaire inventée (fiabiliser le fichier tiers, mettre à jour les modèles de factures, choisir une plateforme agréée, tester) ; 1er septembre 2027 émission obligatoire.
2. Indice de préparation global (jauge) décomposé et expliqué : fichier tiers, modèles de factures (4 nouvelles mentions), organisation (questions oui/non modifiables par le présentateur : plateforme agréée choisie ? responsable désigné ? logiciel de facturation capable d'émettre au format électronique ? procédure de mise à jour du fichier tiers ?) ; pondération affichée.
3. Exposition théorique aux amendes, formule visible : factures émises sur 12 mois (déduites de l'export fictif, modifiables) × 50 €, plafonnée à 15 000 € par an (article 1737 du CGI) ; texte : « plafond théorique si les factures restent non électroniques après le 1er septembre 2027 ; estimation, ne constitue pas un conseil fiscal ».
4. Priorisation par impact : anomalies du fichier tiers pondérées par le chiffre d'affaires de chaque client ; part du chiffre d'affaires facturée à des clients dont la fiche bloquerait une facture électronique (par exemple SIREN manquant ou invalide). Rends les données cohérentes : les clients de l'export de factures doivent exister dans le fichier tiers (avec des anomalies réalistes sur certains).
5. Plan d'action généré automatiquement : tâches concrètes classées par priorité (corriger N SIREN, N clés de TVA, N doublons, compléter N adresses, ajouter les mentions manquantes aux modèles, choisir une plateforme agréée, désigner un responsable, tester avant la bascule), chacune avec « pourquoi » (fait vérifié ou bonne pratique), effort marqué « estimation », responsable et statut modifiables (en mémoire, rien n'est envoyé), export CSV.
6. Trésorerie et pilotage : encaissements attendus par échéance (déjà échu, 0-30, 31-60, 61-90 jours), factures échues par ancienneté, délai moyen de paiement, part des 5 premiers clients, alertes (factures échues de plus de 60 jours, client le plus exposé).
7. Encart « Ce que comprend votre dossier » (fichier fiabilisé, contrôle de 3 modèles de factures, rapport de préparation, mise à niveau optionnelle avant la bascule) et ouverture discrète « Au-delà : Le Décodeur cartographie vos tâches répétitives » — sans prix.
8. Rapport imprimable premium (impression du navigateur) : page de garde « Rapport de préparation à la facture électronique » avec nom d'entreprise modifiable, synthèse de direction sur une page (indice, compte à rebours, exposition théorique, part du CA à risque, 5 actions prioritaires), puis annexes (anomalies, mentions, trésorerie) ; pied de page « Données fictives de démonstration ».
Toute nouvelle logique va dans logic.js (UMD, sans DOM) avec des tests dans tests/run-tests.js : jours restants, indice de préparation, exposition plafonnée, part du CA à risque, plan d'action, encaissements par tranche.`

const POLISH = `FINITION PREMIUM ET UX (sur tout l'outil) :
- Système visuel : titres en serif système (Georgia, Iowan Old Style, Charter), texte en sans-serif système, chiffres tabulaires ; grille et espacements généreux et réguliers ; cartes à ombres subtiles ; icônes SVG intégrées cohérentes ; badges de statut accessibles (couleur + icône + texte) ; états de survol et de focus soignés ; animations discrètes qui respectent prefers-reduced-motion.
- Parcours de démo : progression visible (Tableau de bord → Fichier tiers → Mentions → Trésorerie et reporting → Rapport), mode présentation plein écran plus lisible en partage d'écran (touche F, éléments secondaires masqués), raccourcis clavier documentés (aide sur la touche ?).
- Fichier tiers : vue d'ensemble du score et de la répartition des anomalies (cliquable pour filtrer), recherche et tri, détail d'une ligne avec « valeur actuelle → correction proposée » quand elle se calcule sans registre (clé de TVA déduite du SIREN, normalisation), sinon « à vérifier au registre (incluse dans le dossier) ».
- Mentions : aperçu visuel d'une facture fictive annotée, synchronisé avec la liste des mentions (survol ou sélection au clavier).
- Reporting : grille d'indicateurs équilibrée (pas de carte orpheline), graphiques plus lisibles (barres du CA mensuel, barres empilées d'ancienneté des impayés) avec infobulles accessibles au clavier.
- Import CSV : zone de glisser-déposer + bouton, aperçu des colonnes reconnues, messages d'erreur utiles (fichier vide, séparateur, colonnes manquantes, accents, BOM), état vide.
- Accessibilité : contraste AA, focus visible, ARIA des onglets, des infobulles et des panneaux, navigation clavier complète, Échap ferme les panneaux.
- Mettre à jour script-demo.md (nouveau déroulé de 5 à 7 minutes centré sur le tableau de bord : quoi montrer, quoi dire, transitions, questions de découverte, réponses honnêtes aux objections, et comment présenter la valeur sans promettre de gain) et README.md (raccourcis, impression du rapport, chargement de fichier, confidentialité).`

const SPEC = { type: 'object', properties: {
  items: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, priority: { type: 'string', enum: ['P1', 'P2', 'P3'] }, area: { type: 'string' },
    problem: { type: 'string' }, solution: { type: 'string' }, acceptance: { type: 'string' } },
    required: ['id', 'priority', 'area', 'problem', 'solution', 'acceptance'] } },
  summary: { type: 'string' } }, required: ['items', 'summary'] }

const BUILD = { type: 'object', properties: {
  implemented: { type: 'array', items: { type: 'string' } },
  not_implemented: { type: 'array', items: { type: 'string' } },
  files: { type: 'array', items: { type: 'string' } },
  checks: { type: 'string' }, summary: { type: 'string' } },
  required: ['implemented', 'not_implemented', 'files', 'checks', 'summary'] }

const REVIEW = { type: 'object', properties: {
  verdict: { type: 'string', enum: ['OK', 'A_CORRIGER', 'BLOQUANT'] },
  findings: { type: 'array', items: { type: 'object', properties: {
    file: { type: 'string' }, severity: { type: 'string', enum: ['bloquant', 'important', 'mineur'] },
    problem: { type: 'string' }, fix: { type: 'string' } }, required: ['file', 'severity', 'problem', 'fix'] } },
  summary: { type: 'string' } }, required: ['verdict', 'findings', 'summary'] }

const FIX = { type: 'object', properties: {
  applied: { type: 'array', items: { type: 'string' } }, skipped: { type: 'array', items: { type: 'string' } },
  final_checks: { type: 'string' }, status: { type: 'string', enum: ['OK', 'PROBLEMES_RESTANTS'] }, summary: { type: 'string' } },
  required: ['applied', 'skipped', 'final_checks', 'status', 'summary'] }

phase('Conception')
const spec = await agent(COMMON + `

TU ES UX DESIGNER SENIOR (produits B2B de données et démonstrations commerciales haut de gamme). Lis script-demo.md, index.html, styles.css, app.js, logic.js et data.js. Puis, avec Playwright sur ${URL} : captures à 1440×900 et 1920×1080 de chaque onglet (dans .playwright-mcp), et 390 px pour vérifier que rien ne casse ; observe ce qu'un DAF comprend en 5 secondes.
Produis la spécification d'implémentation priorisée (18 éléments au maximum) qui couvre ENTIÈREMENT les deux blocs ci-dessous, en les précisant à partir de ce que tu observes : architecture de l'information du tableau de bord (ordre des blocs, ce qui est au-dessus de la ligne de flottaison à 1440×900, libellés exacts en français, états vides), composants, données à ajouter ou à rendre cohérentes, critère d'acceptation vérifiable pour chaque élément.
${DASHBOARD}

${POLISH}
LECTURE SEULE : ne modifie aucun fichier.`, { label: 'conception', phase: 'Conception', schema: SPEC, model: MODEL, agentType: 'general-purpose', effort: 'high' })

if (!spec) return { erreur: 'conception en échec' }
log(`Spécification : ${spec.items.length} éléments (${spec.items.filter(i => i.priority === 'P1').length} P1)`)

log(`Spécification de conception (réutilisée) : ${spec.items.length} éléments`)

const APP = 'livrables/outil-equerre'
const URL2 = 'http://127.0.0.1:8772/index.html'

const COMMON2 = `Contexte : projet c:\\Users\\kelia\\projets\\business-b2b (Windows ; PowerShell et Bash disponibles). On construit le PRODUIT complet d'Équerre : une application web locale dans ${APP}/ et un outil en ligne de commande facultatif dans livrables/registre-cli/. Point de départ : la démo existante livrables/demo-appel/ (à COPIER, jamais à modifier).
OBJECTIF DE KÉLIAN : un outil de A à Z pour la facture électronique et le reporting, qui répond à tous les besoins de ses clients (DAF/RAF de PME B2B de 20 à 249 salariés ; cabinets comptables qui suivent plusieurs clients), premium, interactif, pensé UX. Le prix n'est jamais affiché dans l'outil : la valeur se montre par la clarté et l'anticipation des besoins, jamais par des gains inventés.
FAITS VÉRIFIÉS (les seuls autorisés pour la réglementation) :
- Réception des factures électroniques obligatoire pour toutes les entreprises depuis le 1er septembre 2026 ; émission obligatoire pour les PME, TPE et micro-entreprises le 1er septembre 2027.
- Depuis le 1er septembre 2026, 4 nouvelles mentions obligatoires sur les factures entre entreprises assujetties : SIREN du client ; adresse de livraison si elle diffère de l'adresse de facturation ; nature de l'opération (biens, services ou les deux) ; option pour le paiement de la TVA d'après les débits.
- Amende de 50 € par facture non émise sous forme électronique quand c'est obligatoire, plafonnée à 15 000 € par année civile (article 1737 du CGI, loi de finances pour 2026).
Aucune autre obligation, date ou sanction (pas d'e-reporting, pas d'annuaire, pas de format imposé nommé, pas de nom de plateforme).
Contraintes de l'application web : 100 % locale, fonctionne hors ligne par double-clic (file://) avec des scripts classiques relatifs (pas de modules ES) ; AUCUNE requête réseau (pas de CDN, de police distante, de fetch, de XMLHttpRequest, d'URL externe) ; polices système ; marque Équerre (papier #E9E5D8, bleu nuit #0F1E3D, encre #111111, rouge #C8200E, nuances dérivées permises) ; deux modes : « Démo » (données fictives, bandeau « Données fictives de démonstration ») et « Dossier client » (données réelles importées, bandeau « Dossier client : données confidentielles, traitées uniquement dans ce navigateur ») ; toute estimation est marquée « estimation » ; « ne constitue pas un conseil fiscal » visible là où l'on parle de sanctions ou de conformité ; aucune promesse de gain ni de conformité ; français simple ; jamais d'employeur ni de stage de Kélian, ni actuariat ni cyber-risque ; stockage local éventuel enveloppé dans try/catch et l'outil marche sans ; performances : 10 000 tiers et 50 000 lignes de factures sans blocage de l'interface (algorithmes linéaires, rendu paginé ou virtualisé).
Navigateur : ${URL2}, servi par python. S'il ne répond pas, lance en arrière-plan : python -m http.server 8772 --bind 127.0.0.1 --directory ${APP}. Playwright ne peut pas ouvrir file://. Un seul agent utilise le navigateur à la fois.
Tu ne fais ni commit, ni push, ni publication. Ne modifie jamais livrables/demo-appel/, le site (livrables/site-cabinets/) ni prospection/.`

const PRODUCT = `PRODUIT « Équerre : facture électronique et reporting », modules attendus :
A. Accueil et dossiers : créer un dossier client (raison sociale, secteur, taille, logo local facultatif), ouvrir la démo, enregistrer et rouvrir un dossier (fichier .json téléchargé puis rechargé localement, avec avertissement : il contient des données du client), bouton « Effacer toutes les données de cette session », historique des versions du dossier.
B. Import assisté (CSV) : détection du séparateur et de l'encodage (UTF-8, UTF-8 avec BOM, Windows-1252), champs entre guillemets avec séparateurs et retours à la ligne, aperçu, mappage des colonnes avec reconnaissance automatique par synonymes et choix manuel, validation, rapport d'import (lignes ignorées et raisons), modèles CSV téléchargeables, guide « exporter en CSV depuis Excel ou votre logiciel ». Trois types de fichiers : tiers (clients et fournisseurs), export des factures de vente, export des lignes de factures (facultatif, pour vérifier la présence des nouvelles mentions dans les données).
C. Contrôles et corrections du fichier tiers : SIREN, SIRET, clé de TVA, adresses, doublons, plus l'état administratif et les écarts s'ils sont fournis par l'outil de vérification au registre ; propositions de correction calculables ; validation ligne par ligne (accepter, refuser, modifier) ; export du « fichier fiabilisé » (CSV : colonnes d'origine + colonnes corrigées + statut) et du « journal des corrections ».
D. Modèles de factures : contrôle guidé de 1 à 5 modèles (les 4 nouvelles mentions + mentions courantes, liste non exhaustive), preuves et notes ; si l'export des lignes de factures est fourni, contrôle automatique de la présence des champs correspondants.
E. Organisation : questionnaire (plateforme agréée choisie, responsable désigné, logiciel capable d'émettre au format électronique, procédure de mise à jour du fichier tiers) et dates cibles internes choisies par le client.
F. Tableau de bord de direction (ouvert par défaut) : compte à rebours jusqu'au 1er septembre 2027, frise de préparation sans date réglementaire inventée, indice de préparation pondéré et expliqué, exposition théorique (factures sur 12 mois × 50 €, plafond 15 000 €, formule visible, « estimation, ne constitue pas un conseil fiscal »), part du CA facturée à des clients dont la fiche bloquerait une facture électronique, plan d'action généré (priorité, pourquoi, effort estimé, responsable, échéance, statut modifiables, export), trésorerie (encaissements attendus par échéance, ancienneté des impayés, délai moyen de paiement, concentration client, alertes).
G. Reporting mensuel : CA, évolution mensuelle, comparaison avec la période précédente, 5 premiers clients, encours, ancienneté des impayés, délai moyen de paiement, encaissements attendus, filtres (période, client), export CSV, graphiques SVG avec infobulles accessibles au clavier.
H. Rapport de livraison premium (impression du navigateur, A4) : page de garde (logo et nom du client, date, version du dossier), synthèse de direction sur une page, plan d'action, annexes (corrections, modèles, organisation, trésorerie), mentions « estimation » et « ne constitue pas un conseil fiscal », pied de page selon le mode.
I. Mise à niveau : comparaison de deux versions d'un dossier (avant/après) : évolution de l'indice, anomalies résolues, actions faites.
J. Mode cabinet : charger plusieurs dossiers et voir un portefeuille (indice de préparation, part du CA à risque, actions ouvertes par client), tri, export CSV.
K. Aide : parcours d'accueil guidé, aide contextuelle, glossaire (SIREN, SIRET, TVA intracommunautaire, plateforme agréée, mentions obligatoires), raccourcis clavier (aide sur ?), mode présentation plein écran (F).
Finition premium et accessibilité : voir la spécification de conception (système visuel, badges accessibles, facture annotée, « valeur actuelle → correction proposée », graphiques, glisser-déposer, contraste AA, focus visible, ARIA, navigation clavier complète, prefers-reduced-motion).
Documentation : README.md (utilisateur), GUIDE-LIVRAISON.md (procédure de Kélian de A à Z pour un client : collecte des exports, import, revue des corrections, rapport, remise, suppression des données ; RGPD : contrat de sous-traitance article 28 si des personnes physiques figurent dans les fichiers, aucun envoi de données), script-demo.md (visio de 5 à 7 minutes en mode démo, centrée sur le tableau de bord).`

const CLI = `OUTIL EN LIGNE DE COMMANDE FACULTATIF : livrables/registre-cli/verif_registre.py (Python 3, bibliothèque standard uniquement). Il lit un CSV de tiers (séparateur et encodage détectés), interroge pour chaque SIREN valide l'API publique de recherche d'entreprises de l'État (https://recherche-entreprises.api.gouv.fr, sans clé ; lis sa documentation publique pour le format de réponse), au plus 5 requêtes par seconde, avec reprise sur erreur, cache local et option --dry-run ; il ajoute les colonnes etat_administratif, nom_registre, adresse_registre, code_postal_registre, ville_registre, naf_registre, date_verification et un indicateur d'écart (nom ou adresse différents) ; il écrit un nouveau CSV à réimporter dans l'application ; journal clair ; avertissement de confidentialité (seuls les SIREN sont envoyés à l'API publique ; à n'utiliser qu'avec l'accord du client). Tests : livrables/registre-cli/tests/test_verif_registre.py avec une API simulée, sans aucun appel réseau ; « python -m unittest discover -s livrables/registre-cli/tests » doit réussir. README.md. Au plus un appel réseau réel pendant le développement, pour vérifier le format de réponse.`

const ARCH = { type: 'object', properties: {
  architecture: { type: 'string' }, data_model: { type: 'string' },
  files: { type: 'array', items: { type: 'string' } },
  passes: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'] }, title: { type: 'string' }, scope: { type: 'string' },
    acceptance: { type: 'array', items: { type: 'string' } } }, required: ['id', 'title', 'scope', 'acceptance'] } },
  risks: { type: 'array', items: { type: 'string' } } },
  required: ['architecture', 'data_model', 'files', 'passes', 'risks'] }

const PASSES = [
  { id: 'P1', title: 'Socle, dossiers et import', scope: 'Copie de livrables/demo-appel vers ' + APP + ' (si ' + APP + ' n\'existe pas encore) puis démarrage du serveur ; découpage du code en modules classiques (logique sans DOM au format UMD, testée par node) ; modèle de données du dossier versionné ; modes Démo et Dossier client ; modules A (accueil et dossiers) et B (import assisté) ; tests des fonctions d\'import (séparateurs, encodages, guillemets, synonymes de colonnes, rapport d\'import).' },
  { id: 'P2', title: 'Contrôles, corrections, modèles, organisation', scope: 'Modules C (contrôles et corrections du fichier tiers, exports du fichier fiabilisé et du journal), D (modèles de factures, contrôle automatique sur les lignes de factures) et E (organisation) ; tests.' },
  { id: 'P3', title: 'Tableau de bord, reporting, mise à niveau', scope: 'Modules F (tableau de bord de direction, plan d\'action, trésorerie), G (reporting mensuel) et I (comparaison de versions) ; éléments correspondants de la spécification de conception ; tests de tous les indicateurs.' },
  { id: 'P4', title: 'Rapport, cabinet, aide, finition', scope: 'Modules H (rapport de livraison premium), J (mode cabinet) et K (aide, glossaire, raccourcis, mode présentation) ; finition premium et accessibilité de tout l\'outil selon la spécification de conception ; documentation (README.md, GUIDE-LIVRAISON.md, script-demo.md).' },
]

phase('Architecture')
const arch = await agent(COMMON2 + `

TU ES ARCHITECTE LOGICIEL ET DESIGNER PRODUIT. Lis la démo livrables/demo-appel/ (tous les fichiers) et la spécification de conception UX ci-dessous, puis conçois l'architecture du produit :
${PRODUCT}

Spécification de conception (déjà validée, à intégrer) : ${JSON.stringify(spec)}
Les passes de construction sont fixées (une à la suite de l'autre) : ${JSON.stringify(PASSES)}
Rends : l'architecture (modules, fichiers, ordre de chargement des scripts, conventions, gestion de l'état et des événements, performances), le modèle de données du dossier (champs, versions, ce qui est enregistré dans le .json), la liste des fichiers, et pour CHAQUE passe P1 à P4 le périmètre détaillé et des critères d'acceptation vérifiables (tests node, contrôles dans le navigateur) ; et les risques. LECTURE SEULE : ne modifie aucun fichier.`, { label: 'architecture', phase: 'Architecture', schema: ARCH, model: MODEL, agentType: 'general-purpose', effort: 'high' })

if (!arch) return { erreur: 'architecture en échec' }

phase('Construction')
const cliRun = agent(COMMON2 + `

TU ES DÉVELOPPEUR PYTHON. ${CLI}
Ne touche à aucun autre dossier que livrables/registre-cli/. Rends : fichiers créés, résultat des tests, limites.`, { label: 'registre-cli', phase: 'Construction', schema: BUILD, model: MODEL, agentType: 'general-purpose', effort: 'high' })

const built = []
for (const p of PASSES) {
  const detail = (arch.passes || []).find(x => x.id === p.id) || p
  const r = await agent(COMMON2 + `

TU ES DÉVELOPPEUR FRONT-END SENIOR ET DESIGNER D'INTERFACE. Construis la passe ${p.id} « ${p.title} » de l'application ${APP}.
Périmètre de la passe : ${p.scope}
Détail et critères d'acceptation (architecte) : ${JSON.stringify(detail)}
Architecture et modèle de données à respecter : ${JSON.stringify({ architecture: arch.architecture, data_model: arch.data_model, files: arch.files })}
Exigences produit de référence : ${PRODUCT}
Spécification de conception UX : ${JSON.stringify(spec)}
Passes précédentes (ne casse rien de ce qui existe) : ${JSON.stringify(built.map(b => ({ passe: b.passe, implemented: b.implemented, files: b.files })))}
Contrôles avant de rendre : tous les tests node du projet ${APP}/tests réussissent (code 0) ; node --check sur chaque .js ; avec Playwright sur ${URL2} : aucune erreur de console, aucun débordement horizontal à 1440 et 390 px, parcours de la passe fonctionnel (évaluations DOM ; 3 captures au maximum, dans .playwright-mcp).
Rends : éléments implémentés, non implémentés (avec la raison), fichiers créés ou modifiés, contrôles effectués et résultats.`, { label: `construction:${p.id}`, phase: 'Construction', schema: BUILD, model: MODEL, agentType: 'general-purpose', effort: 'high' })
  built.push(r ? Object.assign({ passe: p.id }, r) : { passe: p.id, implemented: [], not_implemented: ['passe en échec'], files: [], checks: 'échec', summary: 'agent en échec' })
  log(`Passe ${p.id} terminée`)
}
const cli = await cliRun

phase('Vérification')
const ctx = JSON.stringify({ passes: built.map(b => ({ passe: b.passe, implemented: b.implemented, not_implemented: b.not_implemented, files: b.files })), cli: cli ? { files: cli.files, checks: cli.checks } : 'échec' })
const reviews = (await parallel([
  () => agent(COMMON2 + `

TU ES RELECTEUR « JUSTESSE ET ROBUSTESSE » (sans navigateur). Exigences : ${PRODUCT}
Rapports de construction : ${ctx}
Vérifie : tous les tests node de ${APP}/tests (code 0), node --check sur chaque .js, « python -m unittest discover -s livrables/registre-cli/tests » ; recalcule INDÉPENDAMMENT dans %TEMP% (sans réutiliser le code de l'outil) les indicateurs du tableau de bord et du reporting sur les données de démo et compare ; teste l'import avec des fichiers CSV piégés générés dans %TEMP% (point-virgule, tabulation, Windows-1252 avec accents, BOM, champs entre guillemets contenant séparateurs et retours à la ligne, colonnes dans le désordre ou manquantes, lignes vides, montants « 1 234,56 ») en appelant les fonctions exposées avec node ; mesure le temps de traitement de 10 000 tiers et 50 000 lignes de factures générés ; vérifie l'enregistrement puis le rechargement d'un dossier (.json) sans perte, et la comparaison de deux versions. LECTURE SEULE sur le dépôt (fichiers temporaires dans %TEMP% uniquement).`, { label: 'verif:justesse', phase: 'Vérification', schema: REVIEW, model: MODEL, agentType: 'general-purpose', effort: 'high' }),
  () => agent(COMMON2 + `

TU ES RELECTEUR « CONFORMITÉ ET CONFIDENTIALITÉ » (sans navigateur). Exigences : ${PRODUCT}
Rapports de construction : ${ctx}
Vérifie : chaque phrase réglementaire de l'application, du rapport imprimable, de README.md, GUIDE-LIVRAISON.md, script-demo.md et de livrables/registre-cli/ est conforme aux FAITS VÉRIFIÉS (toute autre obligation, date, sanction, nom de plateforme ou de format = bloquant) ; aucune promesse de gain ni de conformité ; estimations marquées ; aucun prix affiché ; aucune requête ni ressource externe dans l'application web (cherche fetch, XMLHttpRequest, import(), http:// et https:// dans html, css, js) ; l'outil en ligne de commande n'appelle que l'API publique annoncée, seulement à la demande, avec avertissement et --dry-run ; bandeaux des deux modes corrects ; avertissement sur le fichier .json du dossier ; bouton d'effacement réellement efficace (lis le code) ; GUIDE-LIVRAISON.md cohérent (RGPD, article 28, suppression des données) ; aucune mention de l'employeur, du stage, d'actuariat ou de cyber-risque. LECTURE SEULE sur le dépôt.`, { label: 'verif:conformite', phase: 'Vérification', schema: REVIEW, model: MODEL, agentType: 'general-purpose', effort: 'high' }),
  () => agent(COMMON2 + `

TU ES RELECTEUR « EXPÉRIENCE PREMIUM ET ACCESSIBILITÉ » (seul agent à utiliser le navigateur pendant cette phase), avec l'œil d'un DAF exigeant et d'un expert-comptable. Exigences : ${PRODUCT}
Rapports de construction : ${ctx}
Avec Playwright sur ${URL2}, parcours de bout en bout et regarde réellement les captures (1440×900, 1920×1080, 390×844, dans .playwright-mcp) : (1) mode démo : tableau de bord, fichier tiers, mentions, organisation, trésorerie et reporting, rapport imprimable (émulation du média print) ; (2) mode dossier client : créer un dossier, importer des CSV que tu génères dans %TEMP% (outil de téléversement de fichiers de Playwright), mapper les colonnes, valider des corrections, exporter le fichier fiabilisé, enregistrer puis rouvrir le dossier, comparer deux versions ; (3) mode cabinet avec deux dossiers. Juge la hiérarchie visuelle, la clarté en 5 secondes, la finition (alignements, textes tronqués, chevauchements mesurés par les rectangles), les états vides et d'erreur ; aucune erreur de console ; aucun débordement ; navigation clavier complète avec focus visible ; contraste AA calculé ; mode présentation et raccourcis conformes au README. LECTURE SEULE sur le dépôt.`, { label: 'verif:experience', phase: 'Vérification', schema: REVIEW, model: MODEL, agentType: 'general-purpose', effort: 'high' }),
])).filter(Boolean)

const findings = reviews.flatMap(r => r.findings)
log(`Vérification : ${findings.length} constat(s), dont ${findings.filter(f => f.severity === 'bloquant').length} bloquant(s)`)

const fixes = []
let pending = findings
for (let round = 1; round <= 2 && pending.length; round++) {
  phase('Correction')
  const fx = await agent(COMMON2 + `

TU ES CORRECTEUR (tour ${round}). Exigences : ${PRODUCT}
Constats à traiter : ${JSON.stringify(pending)}
Vérifie chaque constat dans le code (un relecteur peut se tromper : écarte les constats infondés en expliquant pourquoi). Applique tous les bloquants et importants fondés, et les mineurs s'ils sont rapides. Puis relance : tests node de ${APP}/tests (code 0), node --check sur chaque .js, tests Python de livrables/registre-cli, et avec Playwright sur ${URL2} des évaluations DOM ciblées sur les points corrigés (aucune erreur de console, pas de débordement à 1440 et 390 px ; 2 captures au maximum). Rends les corrections appliquées, écartées (avec la raison), les contrôles finaux et le statut.`, { label: `correction:${round}`, phase: 'Correction', schema: FIX, model: MODEL, agentType: 'general-purpose', effort: 'high' })
  if (!fx) break
  fixes.push(fx)
  if (fx.status === 'OK') break
  const recheck = await agent(COMMON2 + `

TU ES CONTRE-VÉRIFICATEUR. Corrections annoncées : ${JSON.stringify(fx)}
Constats d'origine : ${JSON.stringify(pending)}
Relance tous les contrôles (tests node, node --check, tests Python, et dans le navigateur sur ${URL2} les points concernés) et dis quels constats restent réellement ouverts. LECTURE SEULE sur le dépôt.`, { label: `contre-verification:${round}`, phase: 'Correction', schema: REVIEW, model: MODEL, agentType: 'general-purpose', effort: 'high' })
  pending = recheck ? recheck.findings.filter(f => f.severity !== 'mineur') : []
}

return {
  architecture: arch.architecture.slice(0, 1500),
  fichiers: arch.files,
  passes: built.map(b => ({ passe: b.passe, implemente: b.implemented, non_implemente: b.not_implemented, controles: b.checks })),
  registre_cli: cli ? { implemente: cli.implemented, non_implemente: cli.not_implemented, controles: cli.checks } : 'échec',
  verifications: reviews.map(r => ({ verdict: r.verdict, nb: r.findings.length, bloquants: r.findings.filter(f => f.severity === 'bloquant').map(f => f.problem), resume: r.summary })),
  corrections: fixes.map(f => ({ statut: f.status, appliquees: f.applied.length, ecartees: f.skipped, controles_finaux: f.final_checks })),
  restant: pending.map(f => `${f.severity} — ${f.problem}`),
}
