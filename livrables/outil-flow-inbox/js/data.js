/* Flow Inbox (démonstration) : données ENTIÈREMENT FICTIVES et déterministes.
 *
 * - « Agence Exemple Fictive », son équipe, ses clients et prospects sont inventés.
 * - Toutes les adresses sont en .example (domaine réservé, jamais attribué).
 * - Aucun numéro réel : seuls 01 23 45 67 89 et 06 12 34 56 78 apparaissent.
 * - Aucun chiffre de gain ou de performance ; les montants sont des budgets annoncés par des prospects fictifs.
 * - Date de référence fixe : vendredi 23 octobre 2026, 17 h 30 (heure de Paris, UTC+02:00).
 *
 * Chaque information relevée porte le passage EXACT du corps de l'e-mail d'où elle vient (ou null).
 * Une information absente reste absente (statut « absent », valeur et passage null).
 *
 * Format UMD : module.exports sous Node, variable globale FlowData dans le navigateur.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FlowData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Listes autorisées ---------- */

  var CATEGORIES = {
    nouvelle_demande: 'Nouvelle demande',
    client_existant: 'Client existant',
    relance_prospect: 'Relance d\'un prospect',
    fournisseur: 'Fournisseur',
    candidature: 'Candidature',
    demarchage: 'Démarchage reçu',
    hors_perimetre: 'Hors périmètre',
    indesirable: 'Indésirable'
  };

  var STATUTS_TRAITEMENT = {
    a_traiter: 'À traiter',
    en_revue: 'En revue',
    brouillon_pret: 'Brouillon prêt',
    repondu: 'Répondu',
    en_attente_prospect: 'En attente du prospect',
    devis_envoye: 'Proposition envoyée',
    gagne: 'Gagné',
    perdu: 'Perdu',
    classe_sans_suite: 'Classé sans suite',
    doublon: 'Doublon'
  };

  /* Statuts qui supposent une première réponse de l'agence. */
  var STATUTS_AVEC_REPONSE = ['repondu', 'en_attente_prospect', 'devis_envoye', 'gagne', 'perdu'];
  /* Catégories pour lesquelles une réponse de l'agence est attendue. */
  var CATEGORIES_REPONSE_ATTENDUE = ['nouvelle_demande', 'client_existant', 'relance_prospect', 'hors_perimetre'];

  var STATUTS_CHAMP = { releve: 'Relevé', absent: 'Absent', a_verifier: 'À vérifier' };
  var CHAMPS = ['besoin', 'service', 'budget', 'delai', 'entreprise', 'contact'];
  var CHAMPS_LIBELLES = {
    besoin: 'Besoin', service: 'Service', budget: 'Budget', delai: 'Délai', entreprise: 'Entreprise', contact: 'Contact'
  };

  var RAISONS_REVUE = {
    budget_ambigu: 'Budget flou ou renvoyant à un échange antérieur',
    delai_ambigu: 'Délai flou ou pouvant être lu de deux façons',
    service_ambigu: 'Service demandé peu clair',
    plusieurs_services: 'Plusieurs services demandés dans le même message',
    texte_confus: 'Message long ou confus : besoin à confirmer',
    hors_perimetre: 'Demande hors des services de l\'agence',
    message_transfere: 'Message transféré : demandeur à confirmer',
    doublon_possible: 'Même message reçu plusieurs fois',
    agence_en_copie: 'L\'agence est en copie : le message ne lui est pas adressé',
    urgence: 'Urgence exprimée',
    demande_appel: 'Demande d\'appel téléphonique',
    piece_jointe_non_lue: 'Pièce jointe mentionnée : non lue par l\'outil',
    langue_etrangere: 'Message mêlant plusieurs langues',
    relance_prospect: 'Prospect resté sans réponse qui relance',
    information_differente_du_fil: 'Information différente de celle du message précédent'
  };

  var SERVICES = [
    { id: 'web', libelle: 'Création et refonte de site web',
      description: 'Sites vitrines, boutiques en ligne, pages supplémentaires.',
      questions: ['Quel est l\'objectif principal du site ?', 'Disposez-vous d\'un site actuel et d\'un hébergement ?', 'Avez-vous déjà des textes et des photos ?'] },
    { id: 'seo', libelle: 'Référencement naturel',
      description: 'Audit, optimisation des pages et suivi mensuel.',
      questions: ['Quelle est l\'adresse du site concerné ?', 'Sur quelles recherches souhaitez-vous être trouvés ?', 'Un suivi mensuel vous intéresse-t-il ?'] },
    { id: 'social', libelle: 'Réseaux sociaux et campagnes',
      description: 'Calendrier de publications, visuels, campagnes ponctuelles.',
      questions: ['Quels réseaux sont concernés ?', 'Sur quelle durée souhaitez-vous la campagne ?', 'Qui valide les publications chez vous ?'] },
    { id: 'identite', libelle: 'Identité visuelle',
      description: 'Logo, charte graphique, déclinaisons sur vos supports.',
      questions: ['S\'agit-il d\'une création ou d\'un renouvellement ?', 'Sur quels supports l\'identité sera-t-elle utilisée ?', 'Y a-t-il des éléments existants à conserver ?'] },
    { id: 'newsletter', libelle: 'Newsletters et e-mailing',
      description: 'Modèle de mise en page, rédaction, programmation d\'envois.',
      questions: ['À quelle fréquence souhaitez-vous écrire à vos contacts ?', 'Disposez-vous déjà d\'une liste de destinataires ?', 'Qui rédigera les contenus ?'] },
    { id: 'video', libelle: 'Vidéo',
      description: 'Tournage et montage de vidéos courtes.',
      questions: ['Quelle durée et quel usage (site, salon, réseaux) ?', 'Le tournage se fait-il chez vous ?', 'Avez-vous un texte ou un déroulé ?'] },
    { id: 'evenementiel', libelle: 'Salons et événements',
      description: 'Supports de stand, signalétique, documents d\'accueil.',
      questions: ['Quelles sont les dates et la taille du stand ?', 'Quels supports sont nécessaires ?', 'Qui assure la fabrication et l\'impression ?'] },
    { id: 'redaction', libelle: 'Rédaction et contenus',
      description: 'Articles, brochures, fiches, textes de site.',
      questions: ['Quels documents faut-il rédiger et pour quelle date ?', 'Disposez-vous de documents de base ?', 'Quel ton souhaitez-vous ?'] },
    { id: 'conseil', libelle: 'Accompagnement ponctuel',
      description: 'Atelier ou séance de conseil en communication.',
      questions: ['Quel sujet souhaitez-vous traiter ?', 'Combien de personnes participeront ?', 'Quelle durée envisagez-vous ?'] }
  ];
  var SERVICES_IDS = SERVICES.map(function (s) { return s.id; }).concat(['hors_catalogue']);

  /* ---------- Agence, équipe, paramètres ---------- */

  var DOMAINE_AGENCE = 'agence-exemple-fictive.example';

  var EQUIPE = [
    { id: 'camille', nom: 'Camille Vautrin', role: 'Directrice et fondatrice', adresse: 'camille@' + DOMAINE_AGENCE },
    { id: 'mathis', nom: 'Mathis Bellanger', role: 'Chargé de clientèle', adresse: 'mathis@' + DOMAINE_AGENCE },
    { id: 'ines', nom: 'Inès Delmas', role: 'Cheffe de projet web', adresse: 'ines@' + DOMAINE_AGENCE },
    { id: 'sofiane', nom: 'Sofiane Arnoult', role: 'Directeur artistique et vidéo', adresse: 'sofiane@' + DOMAINE_AGENCE },
    { id: 'laure', nom: 'Laure Pichon', role: 'Rédactrice et community manager', adresse: 'laure@' + DOMAINE_AGENCE }
  ];

  var AGENCE = {
    nom: 'Agence Exemple Fictive',
    effectif: 7,
    ville: 'Rennes',
    adresse_boite: 'contact@' + DOMAINE_AGENCE,
    telephone: '01 23 45 67 89',
    site: 'agence-exemple-fictive.example',
    ton: 'Vouvoiement, phrases courtes, chaleureux et précis ; aucune promesse de résultat.',
    signature: 'Cordialement,\n{prenom} {nom}\n{role}\nAgence Exemple Fictive\n01 23 45 67 89\ncontact@' + DOMAINE_AGENCE
  };

  var PARAMETRES_PAR_DEFAUT = {
    delai_relance_jours_ouvres: 2,
    jours_ouvres: [1, 2, 3, 4, 5],
    horaires: { debut: '09:00', fin: '18:00' },
    envoi_automatique: false,
    responsable_par_defaut: 'mathis'
  };

  var DATE_REFERENCE = '2026-10-23T17:30:00+02:00';
  var DATE_DEBUT = '2026-09-28T00:00:00+02:00';

  /* ---------- Utilitaires (provisoires : la logique de référence ira dans js/core) ---------- */

  function partiesDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  }

  /** Nombre de jours ouvrés (lundi à vendredi) dans l'intervalle ]jour de début, jour de fin]. */
  function joursOuvres(debutIso, finIso) {
    var d = partiesDate(debutIso);
    var f = partiesDate(finIso);
    var n = 0;
    while (d < f) {
      d += 86400000;
      var j = new Date(d).getUTCDay();
      if (j >= 1 && j <= 5) n++;
    }
    return n;
  }

  function reponseAttendue(email) {
    return CATEGORIES_REPONSE_ATTENDUE.indexOf(email.categorie) >= 0 &&
      ['doublon', 'classe_sans_suite'].indexOf(email.traitement.statut) < 0;
  }

  /** Vrai si l'agence n'a pas répondu et que le délai convenu (jours ouvrés) est dépassé à la date donnée. */
  function sansReponseEnRetard(email, dateIso, delai) {
    if (!reponseAttendue(email) || email.traitement.premiere_reponse) return false;
    return joursOuvres(email.date, dateIso) > (delai == null ? PARAMETRES_PAR_DEFAUT.delai_relance_jours_ouvres : delai);
  }

  /* ---------- Constructeurs ---------- */

  var AG = { nom: AGENCE.nom, adresse: AGENCE.adresse_boite };
  function P(nom, adresse) { return { nom: nom, adresse: adresse }; }
  function iso(d) { return d ? d.replace(' ', 'T') + ':00+02:00' : null; }

  function R(valeur, passage) { return { statut: 'releve', valeur: valeur, passage: passage }; }
  function V(valeur, passage) { return { statut: 'a_verifier', valeur: valeur, passage: passage }; }
  function X() { return { statut: 'absent', valeur: null, passage: null }; }
  function bud(min, max, type, periode) { return { min: min, max: max, type: type, periode: periode || null, devise: 'EUR' }; }
  function del(texte, date, precision) { return { texte: texte, date: date, precision: precision }; }
  function ct(nom, fonction, email, tel) { return { nom: nom, fonction: fonction || null, email: email, telephone: tel || null }; }
  function T(statut, responsable, reponse, note) {
    return { statut: statut, responsable: responsable, premiere_reponse: iso(reponse), note: note || null };
  }

  /* ---------- E-mails ---------- */

  var BRUTS = [];
  function E(o) { BRUTS.push(o); }

  E({
    cle: 'dupre-1', fil: 'dupre', de: P('Sophie Dupré', 'contact@boulangerie-dupre.example'), date: '2026-09-28 09:12',
    objet: 'Refonte de notre site internet', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nNous sommes la Boulangerie Dupré, quatre boutiques et un atelier de fabrication dans l\'agglomération. Notre site actuel date de 2018 et n\'est plus lisible sur téléphone. Nous souhaitons refaire entièrement notre site avec une page par boutique et la possibilité de commander des gâteaux d\'anniversaire en ligne.\n\nNotre budget se situe entre 3 000 et 4 000 euros. Nous aimerions que le nouveau site soit en ligne pour le 13 novembre, avant la période des fêtes.\n\nPourriez-vous nous dire si cela est réalisable et nous proposer un rendez-vous ?\n\nCordialement,\nSophie Dupré\nGérante, Boulangerie Dupré\n01 23 45 67 89',
    releves: {
      besoin: R('Refonte complète du site : une page par boutique, commande de gâteaux en ligne', 'refaire entièrement notre site avec une page par boutique'),
      service: R('web', 'refaire entièrement notre site'),
      budget: R(bud(3000, 4000, 'fourchette'), 'entre 3 000 et 4 000 euros'),
      delai: R(del('pour le 13 novembre', '2026-11-13', 'precise'), 'pour le 13 novembre'),
      entreprise: R('Boulangerie Dupré', 'Boulangerie Dupré'),
      contact: R(ct('Sophie Dupré', 'Gérante', 'contact@boulangerie-dupre.example', '01 23 45 67 89'), 'Sophie Dupré')
    },
    revue: [], traitement: T('devis_envoye', 'mathis', '2026-09-28 11:40', 'Visio proposée, puis proposition envoyée.')
  });

  E({
    cle: 'kine', fil: 'kine', de: P('Paul Martin', 'contact@cabinet-kine-lilas.example'), date: '2026-09-28 14:05',
    objet: 'logo', categorie: 'nouvelle_demande',
    corps: 'Bonjour, besoin d\'un logo pour mon cabinet de kinésithérapie. Quel tarif ? Merci.\n\nPaul Martin\nCabinet de kinésithérapie des Lilas',
    releves: {
      besoin: R('Création d\'un logo pour un cabinet de kinésithérapie', 'besoin d\'un logo pour mon cabinet de kinésithérapie'),
      service: R('identite', 'd\'un logo'),
      entreprise: R('Cabinet de kinésithérapie des Lilas', 'Cabinet de kinésithérapie des Lilas'),
      contact: R(ct('Paul Martin', null, 'contact@cabinet-kine-lilas.example'), 'Paul Martin')
    },
    revue: [], traitement: T('en_attente_prospect', 'mathis', '2026-09-29 09:20', 'Réponse envoyée ; le prospect n\u2019a précisé ni budget ni délai à ce jour.')
  });

  E({
    cle: 'brasserie-1', fil: 'brasserie', de: P('Karim Benali', 'contact@brasserie-trois-cuves.example'), date: '2026-09-29 07:48',
    objet: 'URGENT campagne lancement bière de saison', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nURGENT : nous lançons une nouvelle bière de saison et il nous faut une campagne sur les réseaux sociaux avant le 12 octobre. Visuels, textes, calendrier de publication, on vous laisse faire.\n\nBudget : 2 500 € par mois pendant trois mois, c\'est ferme. Merci de me dire aujourd\'hui si vous pouvez le faire.\n\nKarim Benali\nBrasserie des Trois Cuves\n01 23 45 67 89',
    releves: {
      besoin: R('Campagne de lancement d\'une bière de saison : visuels, textes, calendrier de publication', 'il nous faut une campagne sur les réseaux sociaux'),
      service: R('social', 'une campagne sur les réseaux sociaux'),
      budget: R(bud(2500, 2500, 'exact', 'mensuel'), '2 500 € par mois pendant trois mois'),
      delai: R(del('avant le 12 octobre', '2026-10-12', 'precise'), 'avant le 12 octobre'),
      entreprise: R('Brasserie des Trois Cuves', 'Brasserie des Trois Cuves'),
      contact: R(ct('Karim Benali', null, 'contact@brasserie-trois-cuves.example', '01 23 45 67 89'), 'Karim Benali')
    },
    revue: ['urgence'], traitement: T('gagne', 'mathis', '2026-09-29 08:55', 'Réponse dans l\'heure.')
  });

  E({
    cle: 'sentiers', fil: 'sentiers', de: P('Marie-Claire Vidal', 'contact@sentiers-ouverts.example'), date: '2026-09-29 16:30',
    objet: 'Renseignements pour notre association', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nJe vous écris au nom de l\'association Sentiers Ouverts, on organise des randonnées dans le Val d\'Orval depuis une dizaine d\'années, et on s\'est dit qu\'il fallait peut-être se moderniser, enfin c\'est surtout notre trésorier qui y tient. Donc voilà : nous avons un petit site fait par un bénévole qui ne marche plus très bien, une page sur les réseaux sociaux que personne n\'alimente, et on aimerait aussi envoyer une lettre d\'information aux adhérents, ou peut-être des flyers, on ne sait pas trop. Bref, on voudrait que quelqu\'un s\'occupe de tout ça.\n\nPour le budget, nous avons reçu 800 euros de subvention de la mairie mais le bureau pourrait peut-être voter un complément, je ne peux pas vous promettre. Pour les délais, idéalement avant la fin de l\'année, mais ce n\'est pas bloquant.\n\nSi vous avez le temps de nous rappeler pour en discuter, ce serait bien.\n\nBien à vous,\nMarie-Claire Vidal\nSecrétaire de l\'association Sentiers Ouverts',
    releves: {
      besoin: V('Site, réseaux sociaux et lettre d\'information pour une association de randonnée', 'on voudrait que quelqu\'un s\'occupe de tout ça'),
      service: V('web', 'un petit site fait par un bénévole'),
      budget: V(bud(800, null, 'incertain'), 'nous avons reçu 800 euros de subvention de la mairie mais le bureau pourrait peut-être voter un complément'),
      delai: R(del('avant la fin de l\'année', null, 'vague'), 'avant la fin de l\'année'),
      entreprise: R('Association Sentiers Ouverts', 'l\'association Sentiers Ouverts'),
      contact: R(ct('Marie-Claire Vidal', 'Secrétaire', 'contact@sentiers-ouverts.example'), 'Marie-Claire Vidal')
    },
    revue: ['plusieurs_services', 'texte_confus', 'budget_ambigu'], traitement: T('en_attente_prospect', 'mathis', '2026-09-30 10:15', 'Demande de précisions sur les priorités.')
  });

  E({
    cle: 'hebergeur', fil: 'hebergeur', de: P('Nuage Ouest Hébergement', 'facturation@hebergeur-nuage-ouest.example'), date: '2026-09-30 10:02',
    objet: 'Votre facture 2026-0931', categorie: 'fournisseur',
    corps: 'Bonjour,\n\nVotre facture n° 2026-0931 d\'un montant de 118,80 € TTC pour l\'hébergement des sites de votre agence est disponible. Elle sera prélevée le 5 octobre.\n\nCordialement,\nLe service facturation\nNuage Ouest Hébergement',
    releves: {
      entreprise: R('Nuage Ouest Hébergement', 'Nuage Ouest Hébergement')
    },
    revue: [], traitement: T('classe_sans_suite', 'camille', null, 'Facture fournisseur : à classer en gestion.')
  });

  E({
    cle: 'valmont-video', fil: 'valmont-video', de: P('Antoine Valmont', 'antoine@cabinet-valmont.example'), a: [P('Mathis Bellanger', 'mathis@' + DOMAINE_AGENCE)], date: '2026-09-30 15:20',
    objet: 'Une vidéo pour le cabinet', categorie: 'client_existant',
    corps: 'Bonjour Mathis,\n\nTout se passe bien avec le site que vous avez réalisé pour nous l\'an dernier. Nous aimerions maintenant ajouter une vidéo de présentation du cabinet (2 minutes environ, avec quelques images de chantier et un témoignage de client).\n\nNous avons prévu autour de 1 500 euros. L\'idéal serait de l\'avoir pour décembre, avant nos vœux.\n\nBien cordialement,\nAntoine Valmont\nCabinet Valmont Architectes',
    releves: {
      besoin: R('Vidéo de présentation du cabinet d\'environ 2 minutes', 'ajouter une vidéo de présentation du cabinet'),
      service: R('video', 'une vidéo de présentation'),
      budget: R(bud(1500, 1500, 'approximatif'), 'autour de 1 500 euros'),
      delai: R(del('pour décembre', null, 'vague'), 'pour décembre'),
      entreprise: R('Cabinet Valmont Architectes', 'Cabinet Valmont Architectes'),
      contact: R(ct('Antoine Valmont', null, 'antoine@cabinet-valmont.example'), 'Antoine Valmont')
    },
    revue: [], traitement: T('devis_envoye', 'mathis', '2026-10-01 09:30', 'Client du site réalisé l\'an dernier.')
  });

  E({
    cle: 'passerelle', fil: 'passerelle', de: P('Julien Roche', 'partenariats@passerelle-affaires.example'), date: '2026-10-01 11:45',
    objet: 'Rejoignez notre annuaire de prestataires', categorie: 'demarchage',
    corps: 'Bonjour,\n\nNous sommes Passerelle Affaires, un service de mise en relation entre prestataires et entreprises qui cherchent un partenaire. Nous proposons à des agences comme la vôtre de figurer dans notre annuaire en ligne contre un abonnement mensuel.\n\nSeriez-vous disponible pour un échange de 15 minutes cette semaine ?\n\nCordialement,\nJulien Roche\nResponsable des partenariats, Passerelle Affaires',
    releves: {
      entreprise: R('Passerelle Affaires', 'Passerelle Affaires'),
      contact: R(ct('Julien Roche', 'Responsable des partenariats', 'partenariats@passerelle-affaires.example'), 'Julien Roche')
    },
    revue: [], traitement: T('classe_sans_suite', 'mathis', null, 'Démarchage commercial : aucune réponse nécessaire.')
  });

  E({
    cle: 'quai9', fil: 'quai9', de: P('Clara Moreau', 'hello@quai9-studio.example'), date: '2026-10-01 17:10',
    objet: 'Brand refresh : a-t-on le même langage ?', categorie: 'nouvelle_demande',
    corps: 'Hello,\n\nNous sommes Quai 9 Studio, une petite équipe produit basée à Nantes, et on cherche une agence pour un brand refresh complet : nouveau logo, palette, guidelines. Le tout doit rester cohérent avec notre launch prévu au printemps.\n\nOn a un budget d\'environ 6 k€, mais on peut discuter si le scope est bien défini. Timing : on voudrait le kick-off d\'ici la fin du mois et une première proposition de pistes en 3 semaines.\n\nLet me know si vous avez de la dispo pour un call cette semaine.\n\nBest,\nClara Moreau\nCo-fondatrice, Quai 9 Studio',
    releves: {
      besoin: R('Refonte de l\'identité de marque : logo, palette, charte', 'un brand refresh complet : nouveau logo, palette, guidelines'),
      service: R('identite', 'nouveau logo, palette, guidelines'),
      budget: R(bud(6000, 6000, 'approximatif'), 'environ 6 k€'),
      delai: V(del('le kick-off d\'ici la fin du mois', null, 'vague'), 'le kick-off d\'ici la fin du mois'),
      entreprise: R('Quai 9 Studio', 'Quai 9 Studio'),
      contact: R(ct('Clara Moreau', 'Co-fondatrice', 'hello@quai9-studio.example'), 'Clara Moreau')
    },
    revue: ['delai_ambigu', 'langue_etrangere'], traitement: T('devis_envoye', 'mathis', '2026-10-02 09:40', 'Réponse en français, appel proposé.')
  });

  E({
    cle: 'candidature', fil: 'candidature', de: P('Léa Fontaine', 'lea.fontaine@messagerie-perso.example'), date: '2026-10-02 08:30',
    objet: 'Candidature alternance motion design', categorie: 'candidature', pieces_jointes: ['cv-lea-fontaine.pdf'],
    corps: 'Bonjour,\n\nJe me permets de vous adresser ma candidature pour une alternance de graphiste en motion design à partir de septembre prochain. Mon CV et mon portfolio sont joints à ce message.\n\nJe reste disponible pour un entretien.\n\nCordialement,\nLéa Fontaine',
    releves: {
      contact: R(ct('Léa Fontaine', null, 'lea.fontaine@messagerie-perso.example'), 'Léa Fontaine')
    },
    revue: [], traitement: T('classe_sans_suite', 'camille', null, 'Transmis à la direction : hors suivi commercial.')
  });

  E({
    cle: 'pepinieres', fil: 'pepinieres', de: P('Étienne Ravel', 'contact@pepinieres-haut-pre.example'), date: '2026-10-02 12:20',
    objet: 'Référencement de notre site', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nNous vendons des arbres et des arbustes aux particuliers et aux paysagistes. Notre site est correct mais on ne nous trouve pas quand on cherche nos produits sur internet. Nous voudrions travailler notre référencement.\n\nNous ne pouvons pas dépasser 500 € par mois. Pas de date particulière.\n\nÉtienne Ravel\nPépinières du Haut-Pré',
    releves: {
      besoin: R('Travail sur le référencement du site de vente d\'arbres et d\'arbustes', 'Nous voudrions travailler notre référencement'),
      service: R('seo', 'notre référencement'),
      budget: R(bud(null, 500, 'plafond', 'mensuel'), 'Nous ne pouvons pas dépasser 500 € par mois'),
      entreprise: R('Pépinières du Haut-Pré', 'Pépinières du Haut-Pré'),
      contact: R(ct('Étienne Ravel', null, 'contact@pepinieres-haut-pre.example'), 'Étienne Ravel')
    },
    revue: [], traitement: T('perdu', 'mathis', '2026-10-02 16:05', 'Pas de suite après la réponse.')
  });

  E({
    cle: 'menuiserie', fil: 'menuiserie', de: P('Julien Aubert', 'contact@menuiserie-aubert.example'), date: '2026-10-03 10:44',
    objet: 'Notre stand au salon de l\'habitat', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nNous serons exposants au salon régional de l\'habitat du 12 au 14 mars 2027, avec un stand de 9 m². Nous cherchons quelqu\'un pour concevoir les supports du stand (kakémono, flyers, affiche de présentation) et nous aider à préparer l\'événement.\n\nCôté budget nous prévoyons à partir de 4 000 euros, à discuter selon ce que vous proposez. Il faudrait que tout soit prêt pour le salon, et nous aimerions voir une première maquette avant les fêtes de fin d\'année.\n\nBien cordialement,\nJulien Aubert\nMenuiserie Aubert & Fils\n01 23 45 67 89',
    releves: {
      besoin: R('Supports pour un stand de salon : kakémono, flyers, affiche de présentation', 'concevoir les supports du stand (kakémono, flyers, affiche de présentation)'),
      service: R('evenementiel', 'concevoir les supports du stand'),
      budget: R(bud(4000, null, 'a_partir_de'), 'à partir de 4 000 euros'),
      delai: R(del('du 12 au 14 mars 2027', '2027-03-12', 'precise'), 'du 12 au 14 mars 2027'),
      entreprise: R('Menuiserie Aubert & Fils', 'Menuiserie Aubert & Fils'),
      contact: R(ct('Julien Aubert', null, 'contact@menuiserie-aubert.example', '01 23 45 67 89'), 'Julien Aubert')
    },
    revue: [], traitement: T('devis_envoye', 'mathis', '2026-10-05 09:50', 'Message reçu un samedi, traité le lundi.')
  });

  E({
    cle: 'talent', fil: 'talent', de: P('Alice Perrin', 'contact@talent-rive-gauche.example'), date: '2026-10-04 20:15',
    objet: 'Articles de blog réguliers', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nNous sommes un cabinet de recrutement et nous voulons publier des articles de blog réguliers : 4 articles par mois d\'environ 800 mots sur l\'emploi des cadres. Nous avons déjà les sujets mais pas le temps d\'écrire.\n\nNous pensons à un budget autour de 120 € par article. Nous voudrions démarrer en novembre.\n\nMerci de votre retour,\nAlice Perrin\nTalent Rive Gauche',
    releves: {
      besoin: R('Rédaction de 4 articles de blog par mois d\'environ 800 mots', '4 articles par mois d\'environ 800 mots sur l\'emploi des cadres'),
      service: R('redaction', 'des articles de blog réguliers'),
      budget: R(bud(120, 120, 'approximatif', 'par_unite'), 'autour de 120 € par article'),
      delai: R(del('démarrer en novembre', null, 'vague'), 'démarrer en novembre'),
      entreprise: R('Talent Rive Gauche', 'Talent Rive Gauche'),
      contact: R(ct('Alice Perrin', null, 'contact@talent-rive-gauche.example'), 'Alice Perrin')
    },
    revue: [], traitement: T('repondu', 'laure', '2026-10-05 10:30', 'Message reçu un dimanche soir.')
  });

  E({
    cle: 'brasserie-2', fil: 'brasserie', en_reponse_a: 'brasserie-1', de: P('Karim Benali', 'contact@brasserie-trois-cuves.example'), date: '2026-10-05 09:05',
    objet: 'Re: URGENT campagne lancement bière de saison', categorie: 'nouvelle_demande', marqueurs: ['reponse_fil'],
    corps: 'Bonjour Mathis,\n\nMerci pour votre proposition, nous sommes d\'accord sur le principe. Si les visuels sont de qualité, nous pouvons monter à 3 000 € par mois. Il faudrait aussi ajouter une publication par semaine pour la nouvelle étiquette.\n\nKarim\n\nLe 29 septembre 2026 à 08:55, Mathis Bellanger a écrit :\n> Bonjour Karim,\n> Merci pour votre message. Nous pouvons démarrer la campagne dès cette semaine. Je vous envoie une proposition chiffrée dans la journée.\n> Cordialement,\n> Mathis Bellanger\n> Chargé de clientèle, Agence Exemple Fictive',
    releves: {
      besoin: R('Ajout d\'une publication hebdomadaire pour la nouvelle étiquette', 'ajouter une publication par semaine pour la nouvelle étiquette'),
      budget: V(bud(3000, 3000, 'exact', 'mensuel'), 'nous pouvons monter à 3 000 € par mois'),
      contact: R(ct('Karim', null, 'contact@brasserie-trois-cuves.example'), 'Karim')
    },
    revue: ['information_differente_du_fil'], traitement: T('repondu', 'mathis', '2026-10-05 11:00', 'Budget relevé plus haut que dans le premier message.')
  });

  E({
    cle: 'compta', fil: 'compta', de: P('Bruno Rivoire', 'contact@cabinet-comptable-rivoire.example'), date: '2026-10-05 11:30',
    objet: 'Devis installation informatique', categorie: 'hors_perimetre',
    corps: 'Bonjour,\n\nNous venons d\'agrandir nos bureaux et cherchons une société pour installer 6 ordinateurs, brancher les imprimantes et configurer le réseau et le wifi. On nous a donné votre nom.\n\nPouvez-vous nous établir un devis ? Nous aimerions que ce soit fait pour fin octobre.\n\nCordialement,\nBruno Rivoire\nCabinet Comptable Rivoire\n01 23 45 67 89',
    releves: {
      besoin: R('Installation de 6 ordinateurs, imprimantes et réseau', 'installer 6 ordinateurs, brancher les imprimantes et configurer le réseau et le wifi'),
      service: R('hors_catalogue', 'installer 6 ordinateurs'),
      delai: R(del('fin octobre', null, 'vague'), 'fin octobre'),
      entreprise: R('Cabinet Comptable Rivoire', 'Cabinet Comptable Rivoire'),
      contact: R(ct('Bruno Rivoire', null, 'contact@cabinet-comptable-rivoire.example', '01 23 45 67 89'), 'Bruno Rivoire')
    },
    revue: ['hors_perimetre'], traitement: T('repondu', 'mathis', '2026-10-06 09:00', 'Réponse courtoise : hors des services de l\'agence.')
  });

  E({
    cle: 'tourisme', fil: 'tourisme', de: P('Sandrine Aubry', 'communication@tourisme-val-de-brenne.example'), date: '2026-10-05 15:48',
    objet: 'Projet de newsletter mensuelle', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nL\'Office de tourisme du Val-de-Brenne souhaite lancer une newsletter mensuelle pour les visiteurs et les commerçants du territoire. Nous avons besoin d\'un modèle de mise en page, de la rédaction des premiers numéros et de l\'envoi.\n\nNotre budget est d\'environ 300 € par numéro. Le premier envoi devrait partir le 3 novembre.\n\nCordialement,\nSandrine Aubry\nChargée de communication\nOffice de tourisme du Val-de-Brenne',
    releves: {
      besoin: R('Newsletter mensuelle : modèle, rédaction des premiers numéros, envoi', 'un modèle de mise en page, de la rédaction des premiers numéros et de l\'envoi'),
      service: R('newsletter', 'lancer une newsletter mensuelle'),
      budget: R(bud(300, 300, 'approximatif', 'par_unite'), 'environ 300 € par numéro'),
      delai: R(del('le 3 novembre', '2026-11-03', 'precise'), 'le 3 novembre'),
      entreprise: R('Office de tourisme du Val-de-Brenne', 'Office de tourisme du Val-de-Brenne'),
      contact: R(ct('Sandrine Aubry', 'Chargée de communication', 'communication@tourisme-val-de-brenne.example'), 'Sandrine Aubry')
    },
    revue: [], traitement: T('devis_envoye', 'laure', '2026-10-06 10:30')
  });

  E({
    cle: 'cadence', fil: 'cadence', de: P('Manon Lefèvre', 'contact@studio-cadence.example'), date: '2026-10-06 08:15',
    objet: 'Video pour notre studio', categorie: 'nouvelle_demande',
    corps: 'Bonjour, nous avons un studio de danse et on voudrait une vidéo de 60 secondes pour présenter nos cours à la rentrée de janvier. Est-ce que vous faites ça et quels sont vos tarifs ?\n\nMerci\nManon Lefèvre\nStudio Cadence',
    releves: {
      besoin: R('Vidéo de 60 secondes pour présenter les cours d\'un studio de danse', 'on voudrait une vidéo de 60 secondes pour présenter nos cours'),
      service: R('video', 'une vidéo de 60 secondes'),
      delai: R(del('à la rentrée de janvier', null, 'vague'), 'à la rentrée de janvier'),
      entreprise: R('Studio Cadence', 'Studio Cadence'),
      contact: R(ct('Manon Lefèvre', null, 'contact@studio-cadence.example'), 'Manon Lefèvre')
    },
    revue: [], traitement: T('en_attente_prospect', 'sofiane', '2026-10-06 14:00', 'Question sur le budget envoyée.')
  });

  E({
    cle: 'fromagerie-fwd', fil: 'fromagerie', de: P('Agnès Thibaut', 'agnes.thibaut@atelier-thibaut.example'), a: [P('Camille Vautrin', 'camille@' + DOMAINE_AGENCE)], date: '2026-10-06 13:50',
    objet: 'TR : Site de vente en ligne', categorie: 'nouvelle_demande', marqueurs: ['transfere'],
    corps: 'Salut Camille,\n\nJe te transfère une demande qui m\'est arrivée mais je suis complète jusqu\'à Noël. Ça te dit de la prendre ?\n\nAgnès\n\n---------- Message transféré ----------\nDe : Thierry Colin <thierry.colin@fromagerie-hautes-prairies.example>\nDate : lundi 5 octobre 2026 à 19:42\nObjet : Site de vente en ligne\nÀ : Agnès Thibaut <agnes.thibaut@atelier-thibaut.example>\n\nBonjour Agnès,\n\nVous m\'avez été recommandée pour créer notre boutique en ligne. Nous sommes la Fromagerie des Hautes Prairies, nous vendons nos fromages en direct et nous voulons ouvrir une vente en ligne avec livraison.\n\nNotre budget est dans les 8 000 €. Nous aimerions ouvrir pour Noël.\n\nCordialement,\nThierry Colin\nFromagerie des Hautes Prairies',
    releves: {
      besoin: R('Boutique en ligne avec livraison pour une fromagerie', 'nous voulons ouvrir une vente en ligne avec livraison'),
      service: R('web', 'créer notre boutique en ligne'),
      budget: R(bud(8000, 8000, 'approximatif'), 'dans les 8 000 €'),
      delai: R(del('pour Noël', null, 'vague'), 'pour Noël'),
      entreprise: R('Fromagerie des Hautes Prairies', 'Fromagerie des Hautes Prairies'),
      contact: R(ct('Thierry Colin', null, 'thierry.colin@fromagerie-hautes-prairies.example'), 'Thierry Colin')
    },
    revue: ['message_transfere'], traitement: T('en_attente_prospect', 'camille', '2026-10-07 09:30', 'Réponse adressée directement au demandeur d\'origine.')
  });

  E({
    cle: 'spam-1', fil: 'spam-1', de: P('Offres Flash', 'promo@offres-flash.example'), date: '2026-10-06 18:22',
    objet: 'Félicitations, vous êtes sélectionné !', categorie: 'indesirable',
    corps: 'Félicitations !\n\nVous avez été sélectionné pour recevoir un bon d\'achat exclusif. Répondez simplement OUI à ce message avant minuit pour le recevoir.\n\nL\'équipe Offres Flash',
    releves: {},
    revue: [], traitement: T('classe_sans_suite', 'mathis', null, 'Indésirable.')
  });

  E({
    cle: 'glycines-1', fil: 'glycines', de: P('Valérie Lambert', 'direction@hotel-glycines.example'), date: '2026-10-07 10:40',
    objet: 'Rédaction de notre dépliant', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nNous sommes un petit hôtel de 18 chambres et nous refaisons notre dépliant d\'accueil ainsi que les textes de notre site (présentation des chambres, du petit-déjeuner, des environs). Pourriez-vous vous charger de la rédaction ?\n\nNous souhaiterions recevoir les textes d\'ici deux semaines pour pouvoir les envoyer à la relecture.\n\nMerci d\'avance,\nValérie Lambert\nHôtel Les Glycines',
    releves: {
      besoin: R('Rédaction d\'un dépliant d\'accueil et des textes du site d\'un hôtel', 'nous refaisons notre dépliant d\'accueil ainsi que les textes de notre site'),
      service: R('redaction', 'vous charger de la rédaction'),
      delai: R(del('d\'ici deux semaines', null, 'vague'), 'd\'ici deux semaines'),
      entreprise: R('Hôtel Les Glycines', 'Hôtel Les Glycines'),
      contact: R(ct('Valérie Lambert', null, 'direction@hotel-glycines.example'), 'Valérie Lambert')
    },
    revue: [], traitement: T('a_traiter', null, null, 'Aucune action enregistrée.')
  });

  E({
    cle: 'dupre-2', fil: 'dupre', en_reponse_a: 'dupre-1', de: P('Sophie Dupré', 'contact@boulangerie-dupre.example'), date: '2026-10-07 14:12',
    objet: 'Re: Refonte de notre site internet', categorie: 'nouvelle_demande', marqueurs: ['reponse_fil'],
    corps: 'Bonjour Mathis,\n\nSuite à notre visio de la semaine dernière, nous en avons parlé avec mon mari. Nous voudrions finalement que la commande en ligne des gâteaux soit incluse dans le site, quitte à aller jusqu\'à 4 500 euros. Pouvez-vous nous envoyer le devis mis à jour ? Nous gardons la date du 13 novembre.\n\nCordialement,\nSophie Dupré\n\nLe 28 septembre 2026 à 11:40, Mathis Bellanger a écrit :\n> Bonjour Madame Dupré,\n> Merci pour votre message. Un site avec une page par boutique est tout à fait possible. Je vous propose un échange en visio jeudi ou vendredi.\n> Cordialement,\n> Mathis Bellanger\n> Chargé de clientèle, Agence Exemple Fictive',
    releves: {
      besoin: R('Commande en ligne des gâteaux incluse dans le site', 'la commande en ligne des gâteaux soit incluse dans le site'),
      service: R('web', 'incluse dans le site'),
      budget: V(bud(null, 4500, 'plafond'), 'jusqu\'à 4 500 euros'),
      delai: R(del('la date du 13 novembre', '2026-11-13', 'precise'), 'la date du 13 novembre'),
      contact: R(ct('Sophie Dupré', null, 'contact@boulangerie-dupre.example'), 'Sophie Dupré')
    },
    revue: ['information_differente_du_fil'], traitement: T('devis_envoye', 'mathis', '2026-10-07 16:40', 'Devis mis à jour envoyé.')
  });

  E({
    cle: 'garage', fil: 'garage', de: P('Hugo Lemaire', 'hugo@garage-lemaire.example'), a: [P('Mathis Bellanger', 'mathis@' + DOMAINE_AGENCE)], date: '2026-10-08 09:33',
    objet: 'Visuels pneus hiver', categorie: 'client_existant',
    corps: 'Bonjour Mathis,\n\nC\'est bientôt la période des pneus hiver et on voudrait refaire les visuels pour les réseaux sociaux, comme ceux de la rentrée. Même format, même rythme que l\'an dernier.\n\nPour le budget c\'est comme d\'habitude, vous avez mes chiffres. On voudrait que ça démarre mi-novembre.\n\nÀ bientôt,\nHugo Lemaire\nGarage Lemaire',
    releves: {
      besoin: R('Nouveaux visuels pour les réseaux sociaux, même format que la rentrée', 'refaire les visuels pour les réseaux sociaux, comme ceux de la rentrée'),
      service: R('social', 'les visuels pour les réseaux sociaux'),
      budget: V(null, 'c\'est comme d\'habitude'),
      delai: R(del('mi-novembre', null, 'vague'), 'mi-novembre'),
      entreprise: R('Garage Lemaire', 'Garage Lemaire'),
      contact: R(ct('Hugo Lemaire', null, 'hugo@garage-lemaire.example'), 'Hugo Lemaire')
    },
    revue: ['budget_ambigu'], traitement: T('repondu', 'laure', '2026-10-08 11:20', 'Budget repris de la précédente commande après vérification.')
  });

  E({
    cle: 'imprimerie', fil: 'imprimerie', de: P('Marc Lesage', 'devis@imprimerie-ouest-graphique.example'), date: '2026-10-08 16:55',
    objet: 'Devis D-2041 cartes de visite', categorie: 'fournisseur',
    corps: 'Bonjour,\n\nVoici votre devis n° D-2041 pour les 500 cartes de visite et 200 pochettes à l\'en-tête de l\'agence, d\'un montant de 346,00 € HT. Il est valable 30 jours. Pour lancer la fabrication, merci de nous retourner le bon pour accord signé.\n\nCordialement,\nMarc Lesage\nImprimerie Ouest Graphique',
    releves: {
      entreprise: R('Imprimerie Ouest Graphique', 'Imprimerie Ouest Graphique'),
      contact: R(ct('Marc Lesage', null, 'devis@imprimerie-ouest-graphique.example'), 'Marc Lesage')
    },
    revue: [], traitement: T('classe_sans_suite', 'camille', null, 'Devis fournisseur : à valider par la direction.')
  });

  E({
    cle: 'oumar', fil: 'oumar', de: P('Rachid Oumar', 'oumar.plomberie@messagerie-perso.example'), date: '2026-10-09 08:50',
    objet: 'site internet', categorie: 'nouvelle_demande',
    corps: 'bonjour\n\nje voudrai un site pour mon entreprise de plomberie, avec mes coordonées et mes tarifs. combien sa coute ? j\'ai besoin que sa soit vite fait, urgent merci\n\nR. Oumar\nOumar Plomberie',
    releves: {
      besoin: R('Site vitrine pour une entreprise de plomberie, avec coordonnées et tarifs', 'je voudrai un site pour mon entreprise de plomberie, avec mes coordonées et mes tarifs'),
      service: R('web', 'un site pour mon entreprise de plomberie'),
      delai: V(del('urgent', null, 'vague'), 'urgent'),
      entreprise: R('Oumar Plomberie', 'Oumar Plomberie'),
      contact: R(ct('R. Oumar', null, 'oumar.plomberie@messagerie-perso.example'), 'R. Oumar')
    },
    revue: ['delai_ambigu'], traitement: T('en_attente_prospect', 'mathis', '2026-10-09 10:30', 'Questions sur le budget et la date souhaitée.')
  });

  E({
    cle: 'veto', fil: 'veto', de: P('Élodie Garnier', 'clinique@clinique-veto-tilleuls.example'), date: '2026-10-09 11:15',
    objet: 'Merci de me rappeler aujourd\'hui', categorie: 'nouvelle_demande', marqueurs: ['appel_urgent'],
    corps: 'Bonjour,\n\nPouvez-vous m\'appeler aujourd\'hui avant 17 h au 01 23 45 67 89 ? Nous lançons lundi une campagne d\'information sur les vaccinations et je dois valider l\'agence qui s\'en occupe avant ce soir. Il s\'agirait de publications sur les réseaux sociaux pendant un mois.\n\nNous avons une enveloppe de 2 000 €.\n\nMerci,\nDr Élodie Garnier\nClinique vétérinaire des Tilleuls',
    releves: {
      besoin: R('Campagne d\'information sur les vaccinations pendant un mois', 'une campagne d\'information sur les vaccinations'),
      service: R('social', 'publications sur les réseaux sociaux pendant un mois'),
      budget: R(bud(2000, 2000, 'exact'), 'une enveloppe de 2 000 €'),
      delai: R(del('lundi', '2026-10-12', 'precise'), 'lundi'),
      entreprise: R('Clinique vétérinaire des Tilleuls', 'Clinique vétérinaire des Tilleuls'),
      contact: R(ct('Élodie Garnier', 'Docteure', 'clinique@clinique-veto-tilleuls.example', '01 23 45 67 89'), 'Élodie Garnier')
    },
    revue: ['demande_appel', 'urgence'], traitement: T('repondu', 'camille', '2026-10-09 11:50', 'Appel passé par la direction.')
  });

  E({
    cle: 'cave', fil: 'cave', de: P('Bastien Roy', 'contact@cave-saint-aubin.example'), date: '2026-10-12 08:40',
    objet: 'Nouveau logo et étiquettes', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nNotre cave existe depuis 12 ans et le logo n\'a jamais changé. Nous voudrions le rafraîchir et refaire nos étiquettes de la gamme maison (6 références).\n\nNotre budget : entre 1 500 et 2 000 euros. Pour les fêtes, il faudrait que les nouvelles étiquettes soient prêtes pour le 20 novembre.\n\nCordialement,\nBastien Roy\nCave Saint-Aubin',
    releves: {
      besoin: R('Rafraîchir le logo et refaire les étiquettes de la gamme maison (6 références)', 'refaire nos étiquettes de la gamme maison (6 références)'),
      service: R('identite', 'le rafraîchir et refaire nos étiquettes'),
      budget: R(bud(1500, 2000, 'fourchette'), 'entre 1 500 et 2 000 euros'),
      delai: R(del('prêtes pour le 20 novembre', '2026-11-20', 'precise'), 'prêtes pour le 20 novembre'),
      entreprise: R('Cave Saint-Aubin', 'Cave Saint-Aubin'),
      contact: R(ct('Bastien Roy', null, 'contact@cave-saint-aubin.example'), 'Bastien Roy')
    },
    revue: [], traitement: T('devis_envoye', 'sofiane', '2026-10-12 10:20')
  });

  E({
    cle: 'communaute', fil: 'communaute', de: P('Isabelle Fournier', 'communication@cc-plaine-orval.example'), date: '2026-10-12 14:30',
    objet: 'Consultation : refonte du site institutionnel', categorie: 'nouvelle_demande', pieces_jointes: ['cahier-des-charges.pdf'],
    corps: 'Madame, Monsieur,\n\nLa Communauté de communes de la Plaine d\'Orval engage une consultation pour la refonte de son site institutionnel. Le cahier des charges est joint à ce message.\n\nLe montant maximal de la prestation est fixé à 12 000 € TTC. Les offres doivent nous parvenir avant le 6 novembre 2026 à 12 heures.\n\nNous vous remercions de bien vouloir accuser réception de ce message.\n\nVeuillez agréer, Madame, Monsieur, l\'expression de nos salutations distinguées.\n\nIsabelle Fournier\nDirection de la communication\nCommunauté de communes de la Plaine d\'Orval',
    releves: {
      besoin: R('Refonte du site institutionnel d\'une communauté de communes (consultation)', 'la refonte de son site institutionnel'),
      service: R('web', 'refonte de son site institutionnel'),
      budget: R(bud(null, 12000, 'plafond'), '12 000 € TTC'),
      delai: R(del('avant le 6 novembre 2026 à 12 heures', '2026-11-06', 'precise'), 'avant le 6 novembre 2026 à 12 heures'),
      entreprise: R('Communauté de communes de la Plaine d\'Orval', 'Communauté de communes de la Plaine d\'Orval'),
      contact: R(ct('Isabelle Fournier', 'Direction de la communication', 'communication@cc-plaine-orval.example'), 'Isabelle Fournier')
    },
    revue: ['piece_jointe_non_lue'], traitement: T('repondu', 'camille', '2026-10-14 10:00', 'Accusé de réception envoyé ; cahier des charges lu par la direction.')
  });

  E({
    cle: 'dentaire', fil: 'dentaire', de: P('Julien Marchand', 'secretariat@cabinet-dentaire-du-parc.example'), date: '2026-10-13 09:10',
    objet: 'Être mieux trouvés sur internet', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nNous sommes un cabinet dentaire de trois praticiens. Quand on cherche un dentiste dans notre ville, notre cabinet n\'apparaît qu\'en deuxième page. Nous aimerions améliorer notre référencement sur les moteurs de recherche.\n\nNous avons un budget raisonnable mais pas de quoi y consacrer des milliers d\'euros. Nous n\'avons pas de date en tête, plutôt dans les prochains mois.\n\nCordialement,\nDr Julien Marchand\nCabinet dentaire du Parc',
    releves: {
      besoin: R('Améliorer le référencement du site d\'un cabinet dentaire', 'améliorer notre référencement sur les moteurs de recherche'),
      service: R('seo', 'améliorer notre référencement'),
      budget: V(null, 'un budget raisonnable mais pas de quoi y consacrer des milliers d\'euros'),
      delai: R(del('dans les prochains mois', null, 'vague'), 'dans les prochains mois'),
      entreprise: R('Cabinet dentaire du Parc', 'Cabinet dentaire du Parc'),
      contact: R(ct('Julien Marchand', 'Docteur', 'secretariat@cabinet-dentaire-du-parc.example'), 'Julien Marchand')
    },
    revue: ['budget_ambigu'], traitement: T('brouillon_pret', 'mathis', null, 'Brouillon préparé, pas encore relu ni envoyé.')
  });

  E({
    cle: 'terre-1', fil: 'terre-1', de: P('Céline Moulin', 'contact@terre-et-feu.example'), date: '2026-10-13 11:55',
    objet: 'Newsletter pour l\'atelier', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nNous sommes l\'Atelier Terre & Feu, un atelier de céramique avec une boutique en ligne. Nous voudrions envoyer une newsletter à nos clients chaque mois pour annoncer les nouvelles pièces et les ateliers. Pouvez-vous créer le modèle et nous apprendre à l\'utiliser ?\n\nBudget prévu : 900 € pour la mise en place. Nous voudrions envoyer la première avant le 30 octobre.\n\nMerci,\nCéline Moulin\nAtelier Terre & Feu',
    releves: {
      besoin: R('Newsletter mensuelle : création du modèle et prise en main', 'créer le modèle et nous apprendre à l\'utiliser'),
      service: R('newsletter', 'envoyer une newsletter à nos clients chaque mois'),
      budget: R(bud(900, 900, 'exact'), '900 € pour la mise en place'),
      delai: R(del('avant le 30 octobre', '2026-10-30', 'precise'), 'avant le 30 octobre'),
      entreprise: R('Atelier Terre & Feu', 'Atelier Terre & Feu'),
      contact: R(ct('Céline Moulin', null, 'contact@terre-et-feu.example'), 'Céline Moulin')
    },
    revue: [], traitement: T('devis_envoye', 'laure', '2026-10-13 14:00')
  });

  E({
    cle: 'terre-2', fil: 'terre-2', doublon_de: 'terre-1', de: P('Céline Moulin', 'contact@terre-et-feu.example'), date: '2026-10-13 11:58',
    objet: 'Newsletter pour l\'atelier', categorie: 'nouvelle_demande', marqueurs: ['double_envoi'],
    corps: 'Bonjour,\n\nNous sommes l\'Atelier Terre & Feu, un atelier de céramique avec une boutique en ligne. Nous voudrions envoyer une newsletter à nos clients chaque mois pour annoncer les nouvelles pièces et les ateliers. Pouvez-vous créer le modèle et nous apprendre à l\'utiliser ?\n\nBudget prévu : 900 € pour la mise en place. Nous voudrions envoyer la première avant le 30 octobre.\n\nMerci,\nCéline Moulin\nAtelier Terre & Feu',
    releves: {
      besoin: R('Newsletter mensuelle : création du modèle et prise en main', 'créer le modèle et nous apprendre à l\'utiliser'),
      service: R('newsletter', 'envoyer une newsletter à nos clients chaque mois'),
      budget: R(bud(900, 900, 'exact'), '900 € pour la mise en place'),
      delai: R(del('avant le 30 octobre', '2026-10-30', 'precise'), 'avant le 30 octobre'),
      entreprise: R('Atelier Terre & Feu', 'Atelier Terre & Feu'),
      contact: R(ct('Céline Moulin', null, 'contact@terre-et-feu.example'), 'Céline Moulin')
    },
    revue: ['doublon_possible'], traitement: T('doublon', 'laure', null, 'Même texte reçu 3 minutes plus tôt : ligne de suivi déjà créée.')
  });

  E({
    cle: 'domaine', fil: 'domaine', de: P('Julie Perrin', 'julie.perrin@domaine-trois-chenes.example'), date: '2026-10-13 15:20',
    objet: 'TR : Film de présentation', categorie: 'nouvelle_demande', marqueurs: ['transfere'],
    corps: 'Bonjour,\n\nMa directrice, Mme Aurélie Caron, m\'a demandé de vous transmettre sa demande ci-dessous. Merci de lui répondre directement.\n\nJulie Perrin\nAssistante de direction, Domaine des Trois Chênes\n\n---------- Message transféré ----------\nDe : Aurélie Caron <aurelie.caron@domaine-trois-chenes.example>\nDate : mardi 13 octobre 2026 à 14:55\nÀ : Julie Perrin <julie.perrin@domaine-trois-chenes.example>\nObjet : Film de présentation\n\nJulie, peux-tu écrire à cette agence ? Nous voulons un film de présentation du domaine pour notre site et pour les salons, environ 3 minutes, avec les vignes, le chai et l\'équipe. Budget entre 5 000 et 7 000 €. Idéalement tourné pendant les vendanges 2027.\n\nMerci,\nAurélie',
    releves: {
      besoin: R('Film de présentation du domaine d\'environ 3 minutes (vignes, chai, équipe)', 'un film de présentation du domaine pour notre site et pour les salons'),
      service: R('video', 'film de présentation du domaine'),
      budget: R(bud(5000, 7000, 'fourchette'), 'entre 5 000 et 7 000 €'),
      delai: R(del('pendant les vendanges 2027', null, 'vague'), 'pendant les vendanges 2027'),
      entreprise: R('Domaine des Trois Chênes', 'Domaine des Trois Chênes'),
      contact: V(ct('Aurélie Caron', 'Directrice', 'aurelie.caron@domaine-trois-chenes.example'), 'Aurélie Caron')
    },
    revue: ['message_transfere'], traitement: T('repondu', 'sofiane', '2026-10-14 11:00', 'Réponse adressée à la directrice, assistante en copie.')
  });

  E({
    cle: 'bellerive', fil: 'bellerive', de: P('Pauline Chevalier', 'boutique@maison-bellerive.example'), date: '2026-10-14 07:55',
    objet: 'Besoin rapide : campagne fin d\'année', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nJ\'ai besoin d\'aide rapidement. Nous ouvrons notre vente de fin d\'année le 16 novembre et il me faut une campagne sur les réseaux sociaux plus une newsletter à nos clientes pour l\'annoncer. Pas de budget illimité : 1 800 € maximum, tout compris.\n\nPouvez-vous me rappeler cette semaine ?\n\nPauline Chevalier\nResponsable boutique, Maison Bellerive',
    releves: {
      besoin: R('Campagne d\'annonce de la vente de fin d\'année : réseaux sociaux et newsletter', 'il me faut une campagne sur les réseaux sociaux plus une newsletter à nos clientes'),
      service: V('social', 'une campagne sur les réseaux sociaux'),
      budget: R(bud(null, 1800, 'plafond'), '1 800 € maximum'),
      delai: R(del('le 16 novembre', '2026-11-16', 'precise'), 'le 16 novembre'),
      entreprise: R('Maison Bellerive', 'Maison Bellerive'),
      contact: R(ct('Pauline Chevalier', 'Responsable boutique', 'boutique@maison-bellerive.example'), 'Pauline Chevalier')
    },
    revue: ['plusieurs_services'], traitement: T('devis_envoye', 'mathis', '2026-10-14 09:00', 'Réponse deux heures après la réception.')
  });

  E({
    cle: 'glycines-2', fil: 'glycines', en_reponse_a: 'glycines-1', de: P('Valérie Lambert', 'direction@hotel-glycines.example'), date: '2026-10-14 16:10',
    objet: 'Re: Rédaction de notre dépliant', categorie: 'relance_prospect', marqueurs: ['reponse_fil', 'relance'],
    corps: 'Bonjour,\n\nJe me permets de vous relancer : je vous ai écrit le 7 octobre au sujet de la rédaction de notre dépliant et des textes de notre site, et je n\'ai pas eu de réponse. Les textes étaient prévus pour dans deux semaines, nous sommes maintenant un peu justes.\n\nPouvez-vous me dire si vous êtes en mesure de nous aider ? Sinon, nous chercherons ailleurs.\n\nCordialement,\nValérie Lambert\nHôtel Les Glycines\n\nLe 7 octobre 2026 à 10:40, Valérie Lambert a écrit :\n> Bonjour,\n> Nous sommes un petit hôtel de 18 chambres et nous refaisons notre dépliant d\'accueil ainsi que les textes de notre site (présentation des chambres, du petit-déjeuner, des environs). Pourriez-vous vous charger de la rédaction ?\n> Valérie Lambert',
    releves: {
      besoin: R('Rédaction du dépliant d\'accueil et des textes du site (relance)', 'la rédaction de notre dépliant et des textes de notre site'),
      service: R('redaction', 'la rédaction de notre dépliant'),
      delai: V(del('prévus pour dans deux semaines', null, 'vague'), 'prévus pour dans deux semaines'),
      entreprise: R('Hôtel Les Glycines', 'Hôtel Les Glycines'),
      contact: R(ct('Valérie Lambert', null, 'direction@hotel-glycines.example'), 'Valérie Lambert')
    },
    revue: ['relance_prospect', 'delai_ambigu'], traitement: T('a_traiter', null, null, 'Aucune action enregistrée depuis la première demande.')
  });

  E({
    cle: 'valmont-page', fil: 'valmont-page', de: P('Antoine Valmont', 'antoine@cabinet-valmont.example'), date: '2026-10-15 10:20',
    objet: 'Une page à ajouter sur le site', categorie: 'client_existant',
    corps: 'Bonjour,\n\nPouvez-vous ajouter une page « Nos engagements environnementaux » sur le site et mettre à jour les photos de l\'équipe ? Je vous envoie les textes et les photos demain.\n\nCela doit être en ligne avant vendredi prochain.\n\nMerci,\nAntoine Valmont\nCabinet Valmont Architectes',
    releves: {
      besoin: R('Ajout d\'une page et mise à jour des photos de l\'équipe', 'ajouter une page « Nos engagements environnementaux » sur le site et mettre à jour les photos de l\'équipe'),
      service: R('web', 'ajouter une page'),
      delai: V(del('avant vendredi prochain', null, 'vague'), 'avant vendredi prochain'),
      entreprise: R('Cabinet Valmont Architectes', 'Cabinet Valmont Architectes'),
      contact: R(ct('Antoine Valmont', null, 'antoine@cabinet-valmont.example'), 'Antoine Valmont')
    },
    revue: ['delai_ambigu'], traitement: T('repondu', 'ines', '2026-10-15 14:30', 'Date de mise en ligne confirmée par téléphone.')
  });

  E({
    cle: 'flyers', fil: 'flyers', de: P('Karine Duval', 'bureau@handball-club-orval.example'), date: '2026-10-15 12:45',
    objet: 'Impression de flyers', categorie: 'hors_perimetre',
    corps: 'Bonjour,\n\nNous cherchons un imprimeur pour 2 000 flyers au format A5, recto verso, sur papier épais, pour notre tournoi du 14 novembre. Le fichier est déjà prêt. Quel serait votre prix pour l\'impression et la livraison à Orval ?\n\nMerci d\'avance,\nKarine Duval\nHandball Club de l\'Orval',
    releves: {
      besoin: R('Impression de 2 000 flyers A5 recto verso, livrés à Orval', 'un imprimeur pour 2 000 flyers au format A5, recto verso, sur papier épais'),
      service: R('hors_catalogue', '2 000 flyers au format A5'),
      delai: R(del('tournoi du 14 novembre', '2026-11-14', 'precise'), 'tournoi du 14 novembre'),
      entreprise: R('Handball Club de l\'Orval', 'Handball Club de l\'Orval'),
      contact: R(ct('Karine Duval', null, 'bureau@handball-club-orval.example'), 'Karine Duval')
    },
    revue: ['hors_perimetre'], traitement: T('a_traiter', null, null, 'Aucune action enregistrée.')
  });

  E({
    cle: 'federation', fil: 'federation', de: P('Odile Marchand', 'presidence@federation-commercants-centre.example'), date: '2026-10-16 09:35',
    objet: 'Atelier de communication pour nos adhérents', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nLa Fédération des commerçants du centre-ville organise une réunion de ses adhérents en novembre. Nous aimerions que vous animiez un atelier d\'une demi-journée pour nous aider à définir notre stratégie de communication pour l\'année 2027 : que dire, sur quels supports, avec quels moyens.\n\nNous avons prévu de l\'ordre de 1 200 €. L\'atelier devrait avoir lieu courant novembre, date à fixer ensemble.\n\nCordialement,\nOdile Marchand\nPrésidente\nFédération des commerçants du centre-ville',
    releves: {
      besoin: R('Atelier d\'une demi-journée sur la stratégie de communication 2027', 'définir notre stratégie de communication pour l\'année 2027'),
      service: R('conseil', 'animiez un atelier d\'une demi-journée'),
      budget: R(bud(1200, 1200, 'approximatif'), 'de l\'ordre de 1 200 €'),
      delai: R(del('courant novembre', null, 'vague'), 'courant novembre'),
      entreprise: R('Fédération des commerçants du centre-ville', 'Fédération des commerçants du centre-ville'),
      contact: R(ct('Odile Marchand', 'Présidente', 'presidence@federation-commercants-centre.example'), 'Odile Marchand')
    },
    revue: [], traitement: T('devis_envoye', 'camille', '2026-10-16 11:10')
  });

  E({
    cle: 'intro', fil: 'intro', de: P('Nadia Faure', 'nadia.faure@conseil-faure.example'), a: [P('Thomas Leroy', 'thomas.leroy@maison-leroy.example')], cc: [AG], date: '2026-10-16 15:25',
    objet: 'Une agence pour ton site', categorie: 'nouvelle_demande', marqueurs: ['agence_en_copie'],
    corps: 'Bonjour Thomas,\n\nComme convenu, je mets en copie l\'agence dont je te parlais pour la refonte du site de ta société. Ils ont travaillé avec plusieurs entreprises de ma connaissance. Je te laisse les contacter pour voir ce qui est possible.\n\nBonne fin de semaine,\nNadia',
    releves: {
      besoin: R('Refonte du site de la société de Thomas Leroy', 'la refonte du site de ta société'),
      service: R('web', 'la refonte du site'),
      contact: V(ct('Thomas Leroy', null, 'thomas.leroy@maison-leroy.example'), 'Bonjour Thomas')
    },
    revue: ['agence_en_copie'], traitement: T('en_attente_prospect', 'mathis', '2026-10-19 10:00', 'Message adressé à Thomas Leroy, avec Nadia Faure en copie.')
  });

  E({
    cle: 'jardin', fil: 'jardin', de: P('Marc Gautier', 'contact@jardin-eole.example'), date: '2026-10-17 11:05',
    objet: 'Référencement de notre boutique en ligne', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nNous exploitons une boutique en ligne de décoration de jardin depuis 3 ans. Nos ventes dépendent beaucoup de la publicité payante et nous voudrions être mieux positionnés dans les résultats naturels des moteurs de recherche : audit du site, optimisation des fiches produits, suivi mensuel.\n\nNotre budget démarre à 2 000 € par mois. Début de la mission souhaité en janvier 2027.\n\nCordialement,\nMarc Gautier\nJardin d\'Éole',
    releves: {
      besoin: R('Audit du site, optimisation des fiches produits et suivi mensuel', 'audit du site, optimisation des fiches produits, suivi mensuel'),
      service: R('seo', 'les résultats naturels des moteurs de recherche'),
      budget: R(bud(2000, null, 'a_partir_de', 'mensuel'), 'démarre à 2 000 € par mois'),
      delai: R(del('janvier 2027', null, 'vague'), 'en janvier 2027'),
      entreprise: R('Jardin d\'Éole', 'Jardin d\'Éole'),
      contact: R(ct('Marc Gautier', null, 'contact@jardin-eole.example'), 'Marc Gautier')
    },
    revue: [], traitement: T('en_attente_prospect', 'mathis', '2026-10-19 09:20', 'Message reçu un samedi, traité le lundi.')
  });

  E({
    cle: 'horizon', fil: 'horizon', de: P('Sylvie Barbier', 'contact@horizon-competences.example'), date: '2026-10-19 09:40',
    objet: 'Brochure des formations 2027', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nNotre centre de formation professionnelle veut refaire sa brochure des formations 2027 (24 pages) et rédiger les fiches de chaque formation. Les fiches existantes sont trop techniques. Nous voulons aussi un modèle de newsletter pour informer nos apprenants.\n\nBudget : entre 2 500 et 3 500 euros. La brochure doit être imprimée avant le 30 novembre, donc les textes nous sont nécessaires début novembre.\n\nCordialement,\nSylvie Barbier\nHorizon Compétences',
    releves: {
      besoin: R('Brochure des formations 2027 : rédaction des fiches, plus un modèle de newsletter', 'rédiger les fiches de chaque formation'),
      service: V('redaction', 'rédiger les fiches de chaque formation'),
      budget: R(bud(2500, 3500, 'fourchette'), 'entre 2 500 et 3 500 euros'),
      delai: R(del('avant le 30 novembre', '2026-11-30', 'precise'), 'avant le 30 novembre'),
      entreprise: R('Horizon Compétences', 'Horizon Compétences'),
      contact: R(ct('Sylvie Barbier', null, 'contact@horizon-competences.example'), 'Sylvie Barbier')
    },
    revue: ['plusieurs_services'], traitement: T('a_traiter', null, null, 'Aucune action enregistrée.')
  });

  E({
    cle: 'delorme', fil: 'delorme', de: P('Paul Delorme', 'associes@cabinet-delorme.example'), date: '2026-10-19 14:45',
    objet: 'Renouveler notre présence en ligne', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nNotre cabinet de conseil en gestion de patrimoine souhaite renouveler sa présence en ligne : refonte de notre site, amélioration de son référencement et rédaction d\'une série d\'articles de fond. Nous avons réservé un budget annuel de 15 000 € pour l\'ensemble et nous aimerions un premier échange pour voir comment vous organiseriez cela. Nous visons le printemps.\n\nCordialement,\nPaul Delorme\nAssocié\nCabinet Delorme Conseil',
    releves: {
      besoin: R('Refonte du site, référencement et série d\'articles de fond', 'renouveler sa présence en ligne : refonte de notre site, amélioration de son référencement et rédaction d\'une série d\'articles de fond'),
      service: V('web', 'refonte de notre site'),
      budget: R(bud(15000, 15000, 'exact', 'annuel'), 'budget annuel de 15 000 €'),
      delai: R(del('le printemps', null, 'vague'), 'Nous visons le printemps'),
      entreprise: R('Cabinet Delorme Conseil', 'Cabinet Delorme Conseil'),
      contact: R(ct('Paul Delorme', 'Associé', 'associes@cabinet-delorme.example'), 'Paul Delorme')
    },
    revue: ['plusieurs_services'], traitement: T('en_revue', 'camille', null, 'Trois services dans un seul message : à répartir avant de répondre.')
  });

  E({
    cle: 'tonnellerie', fil: 'tonnellerie', de: P('Henri Marchal', 'contact@tonnellerie-marchal.example'), date: '2026-10-20 08:05',
    objet: 'devis video', categorie: 'nouvelle_demande',
    corps: 'Bonjour. Pouvez-vous me faire un devis pour une vidéo de notre atelier de tonnellerie, filmée au sol et par drone, 2 minutes environ ? On voudrait l\'avoir pour le printemps. Merci.\n\nHenri Marchal\nTonnellerie Marchal',
    releves: {
      besoin: R('Vidéo de 2 minutes de l\'atelier, filmée au sol et par drone', 'une vidéo de notre atelier de tonnellerie, filmée au sol et par drone, 2 minutes environ'),
      service: R('video', 'une vidéo de notre atelier'),
      delai: R(del('pour le printemps', null, 'vague'), 'pour le printemps'),
      entreprise: R('Tonnellerie Marchal', 'Tonnellerie Marchal'),
      contact: R(ct('Henri Marchal', null, 'contact@tonnellerie-marchal.example'), 'Henri Marchal')
    },
    revue: [], traitement: T('brouillon_pret', 'sofiane', null, 'Brouillon préparé, pas encore relu ni envoyé.')
  });

  E({
    cle: 'spam-2', fil: 'spam-2', de: P('Service Livraison', 'livraison@suivi-colis.example'), date: '2026-10-20 16:40',
    objet: 'Votre colis est en attente', categorie: 'indesirable', pieces_jointes: ['confirmation.zip'],
    corps: 'Votre colis est en attente\n\nLa livraison de votre colis n\'a pas pu être effectuée. Confirmez vos informations de paiement dans la pièce jointe pour reprogrammer la livraison.\n\nService Livraison',
    releves: {},
    revue: [], traitement: T('classe_sans_suite', 'mathis', null, 'Indésirable : message à ne pas ouvrir.')
  });

  E({
    cle: 'kestrel', fil: 'kestrel', de: P('Élise Brun', 'marketing@valdane-software.example'), date: '2026-10-21 09:15',
    objet: 'Website redesign : une agence pour nous ?', categorie: 'nouvelle_demande',
    corps: 'Hello,\n\nWe are a small software team (12 people) and nous cherchons une agence pour une refonte complète du site (full website redesign) + du contenu pour le blog. On a besoin de quelque chose de moderne, rapide, avec un bon SEO de base.\n\nBudget range: 10-12 k€. Timing: ASAP, idéalement une mise en ligne avant le 15 décembre.\n\nCould you send us your references and availability?\n\nThanks,\nÉlise Brun\nHead of Marketing, Valdane Software',
    releves: {
      besoin: R('Refonte complète du site et contenus de blog', 'une refonte complète du site (full website redesign) + du contenu pour le blog'),
      service: V('web', 'full website redesign'),
      budget: R(bud(10000, 12000, 'fourchette'), '10-12 k€'),
      delai: R(del('avant le 15 décembre', '2026-12-15', 'precise'), 'une mise en ligne avant le 15 décembre'),
      entreprise: R('Valdane Software', 'Valdane Software'),
      contact: R(ct('Élise Brun', 'Head of Marketing', 'marketing@valdane-software.example'), 'Élise Brun')
    },
    revue: ['plusieurs_services', 'langue_etrangere'], traitement: T('a_traiter', null, null, 'Aucune action enregistrée.')
  });

  E({
    cle: 'perrot', fil: 'perrot', de: P('J. Perrot', 'contact@perrot-paysage.example'), date: '2026-10-21 15:00',
    objet: 'Site', categorie: 'nouvelle_demande',
    corps: 'Bonjour. Refonte site. Budget 5k. Délai : fin novembre. Merci.\n\nJ. Perrot\nPerrot Paysage',
    releves: {
      besoin: R('Refonte du site', 'Refonte site'),
      service: R('web', 'Refonte site'),
      budget: R(bud(5000, 5000, 'approximatif'), 'Budget 5k'),
      delai: R(del('fin novembre', null, 'vague'), 'fin novembre'),
      entreprise: R('Perrot Paysage', 'Perrot Paysage'),
      contact: R(ct('J. Perrot', null, 'contact@perrot-paysage.example'), 'J. Perrot')
    },
    revue: [], traitement: T('a_traiter', null, null, 'Aucune action enregistrée.')
  });

  E({
    cle: 'mimosas', fil: 'mimosas', de: P('Chantal Vasseur', 'direction@residence-mimosas.example'), date: '2026-10-22 08:45',
    objet: 'Campagne de recrutement', categorie: 'nouvelle_demande',
    corps: 'Madame, Monsieur,\n\nLa Résidence Les Mimosas recrute des aides-soignants et des agents de service. Nous aimerions une campagne de recrutement sur les réseaux sociaux, avec des visuels et des textes adaptés à ces métiers.\n\nNotre budget débute à 1 000 €. Nous souhaitons commencer dès que possible.\n\nCordialement,\nChantal Vasseur\nDirectrice adjointe\nRésidence Les Mimosas',
    releves: {
      besoin: R('Campagne de recrutement avec visuels et textes adaptés aux métiers', 'une campagne de recrutement sur les réseaux sociaux, avec des visuels et des textes adaptés à ces métiers'),
      service: R('social', 'une campagne de recrutement sur les réseaux sociaux'),
      budget: R(bud(1000, null, 'a_partir_de'), 'débute à 1 000 €'),
      delai: R(del('dès que possible', null, 'vague'), 'dès que possible'),
      entreprise: R('Résidence Les Mimosas', 'Résidence Les Mimosas'),
      contact: R(ct('Chantal Vasseur', 'Directrice adjointe', 'direction@residence-mimosas.example'), 'Chantal Vasseur')
    },
    revue: [], traitement: T('a_traiter', null, null, 'Aucune action enregistrée.')
  });

  E({
    cle: 'fromagerie-2', fil: 'fromagerie', en_reponse_a: 'fromagerie-fwd', de: P('Thierry Colin', 'thierry.colin@fromagerie-hautes-prairies.example'), a: [P('Camille Vautrin', 'camille@' + DOMAINE_AGENCE)], date: '2026-10-22 14:10',
    objet: 'Re: Site de vente en ligne', categorie: 'nouvelle_demande', marqueurs: ['reponse_fil'],
    corps: 'Bonjour Camille,\n\nExcusez-moi pour le retard de ma réponse, la saison est chargée. Nous avons environ 40 produits et nous livrons dans toute la France. Le budget de 8 000 € est ferme et nous visons une ouverture le 1er décembre.\n\nThierry Colin\nFromagerie des Hautes Prairies\n\nLe 7 octobre 2026 à 09:30, Camille Vautrin a écrit :\n> Bonjour Monsieur Colin,\n> Agnès Thibaut m\'a transmis votre demande de boutique en ligne. Pouvez-vous me préciser le nombre de produits à mettre en ligne et si vous livrez dans toute la France ?\n> Cordialement,\n> Camille Vautrin\n> Directrice, Agence Exemple Fictive',
    releves: {
      besoin: R('Précisions sur la boutique en ligne : environ 40 produits, livraison dans toute la France', 'Nous avons environ 40 produits et nous livrons dans toute la France'),
      budget: R(bud(8000, 8000, 'exact'), 'budget de 8 000 € est ferme'),
      delai: R(del('une ouverture le 1er décembre', '2026-12-01', 'precise'), 'une ouverture le 1er décembre'),
      entreprise: R('Fromagerie des Hautes Prairies', 'Fromagerie des Hautes Prairies'),
      contact: R(ct('Thierry Colin', null, 'thierry.colin@fromagerie-hautes-prairies.example'), 'Thierry Colin')
    },
    revue: [], traitement: T('a_traiter', null, null, 'Réponse du prospect reçue hier : en attente de suite.')
  });

  E({
    cle: 'traduction', fil: 'traduction', de: P('Gwenaël Le Goff', 'contact@cidrerie-kerlan.example'), date: '2026-10-23 09:05',
    objet: 'Traduction de notre plaquette', categorie: 'hors_perimetre',
    corps: 'Bonjour,\n\nNous voudrions faire traduire notre plaquette commerciale de 12 pages du français vers l\'anglais et l\'allemand. Faites-vous ce type de traduction ?\n\nNous n\'avons pas fixé de budget, pouvez-vous nous indiquer vos tarifs ? C\'est pour un salon en février.\n\nCordialement,\nGwenaël Le Goff\nCidrerie Kerlan',
    releves: {
      besoin: R('Traduction d\'une plaquette de 12 pages en anglais et en allemand', 'faire traduire notre plaquette commerciale de 12 pages du français vers l\'anglais et l\'allemand'),
      service: R('hors_catalogue', 'faire traduire notre plaquette commerciale'),
      delai: R(del('un salon en février', null, 'vague'), 'un salon en février'),
      entreprise: R('Cidrerie Kerlan', 'Cidrerie Kerlan'),
      contact: R(ct('Gwenaël Le Goff', null, 'contact@cidrerie-kerlan.example'), 'Gwenaël Le Goff')
    },
    revue: ['hors_perimetre'], traitement: T('a_traiter', null, null, 'Aucune action enregistrée.')
  });

  E({
    cle: 'vergers', fil: 'vergers', de: P('Léonie Hubert', 'contact@vergers-du-lac.example'), date: '2026-10-23 10:30',
    objet: 'Notre stand au salon de l\'agriculture', categorie: 'nouvelle_demande',
    corps: 'Bonjour,\n\nNotre coopérative sera présente au salon de l\'agriculture régional du 4 au 6 février 2027. Nous avons besoin de la création du stand : plan d\'aménagement, panneaux, roll-up et une vidéo en boucle de 90 secondes pour présenter nos producteurs.\n\nLe budget ne peut pas dépasser 5 000 € HT. Le design devra nous être présenté fin décembre.\n\nCordialement,\nLéonie Hubert\nCoopérative Les Vergers du Lac',
    releves: {
      besoin: R('Création du stand : plan, panneaux, roll-up et vidéo en boucle de 90 secondes', 'la création du stand : plan d\'aménagement, panneaux, roll-up et une vidéo en boucle de 90 secondes'),
      service: R('evenementiel', 'la création du stand'),
      budget: R(bud(null, 5000, 'plafond'), 'ne peut pas dépasser 5 000 € HT'),
      delai: R(del('fin décembre', null, 'vague'), 'fin décembre'),
      entreprise: R('Coopérative Les Vergers du Lac', 'Coopérative Les Vergers du Lac'),
      contact: R(ct('Léonie Hubert', null, 'contact@vergers-du-lac.example'), 'Léonie Hubert')
    },
    revue: [], traitement: T('a_traiter', null, null, 'Aucune action enregistrée.')
  });

  /* ---------- Assemblage : tri, identifiants, en-têtes complets ---------- */

  function construire() {
    var tries = BRUTS.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var parCle = {};
    var fils = {};
    var nFils = 0;
    tries.forEach(function (o, i) {
      parCle[o.cle] = 'm' + (i < 9 ? '0' : '') + (i + 1);
      if (!fils[o.fil]) { nFils++; fils[o.fil] = 'fil-' + ('000' + nFils).slice(-4); }
    });

    var vide = function () { return { statut: 'absent', valeur: null, passage: null }; };

    return tries.map(function (o) {
      var id = parCle[o.cle];
      var releves = {};
      CHAMPS.forEach(function (c) { releves[c] = (o.releves && o.releves[c]) || vide(); });
      var domaine = o.de.adresse.split('@')[1];
      return {
        id: id,
        message_id: '<' + id + '.' + o.date.replace(/\D/g, '') + '@' + domaine + '>',
        fil: fils[o.fil],
        en_reponse_a: o.en_reponse_a ? parCle[o.en_reponse_a] : null,
        doublon_de: o.doublon_de ? parCle[o.doublon_de] : null,
        de: o.de,
        a: o.a || [AG],
        cc: o.cc || [],
        objet: o.objet,
        date: iso(o.date),
        corps: o.corps,
        pieces_jointes: o.pieces_jointes || [],
        marqueurs: o.marqueurs || [],
        categorie: o.categorie,
        releves: releves,
        revue: o.revue,
        traitement: o.traitement
      };
    });
  }

  var EMAILS = construire();

  function parId(id) {
    for (var i = 0; i < EMAILS.length; i++) if (EMAILS[i].id === id) return EMAILS[i];
    return null;
  }

  return {
    avertissement: 'Données entièrement fictives pour la démonstration. Aucun e-mail réel.',
    dateReference: DATE_REFERENCE,
    dateDebut: DATE_DEBUT,
    agence: AGENCE,
    equipe: EQUIPE,
    parametres: PARAMETRES_PAR_DEFAUT,
    services: SERVICES,
    servicesIds: SERVICES_IDS,
    categories: CATEGORIES,
    statutsTraitement: STATUTS_TRAITEMENT,
    statutsAvecReponse: STATUTS_AVEC_REPONSE,
    categoriesReponseAttendue: CATEGORIES_REPONSE_ATTENDUE,
    statutsChamp: STATUTS_CHAMP,
    champs: CHAMPS,
    champsLibelles: CHAMPS_LIBELLES,
    raisonsRevue: RAISONS_REVUE,
    emails: EMAILS,
    parId: parId,
    utilitaires: { joursOuvres: joursOuvres, reponseAttendue: reponseAttendue, sansReponseEnRetard: sansReponseEnRetard }
  };
});
