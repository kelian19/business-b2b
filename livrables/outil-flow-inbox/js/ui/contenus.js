/* Flow Inbox : contenus rédigés (raccourcis, glossaire, aide contextuelle, visite guidée, parcours « comment ça marche »).
 * Aucun chiffre de gain, aucun prix, aucune promesse de résultat : seuls les faits de la démonstration (fictive, locale, rien n'est envoyé). */
(function (root) {
  'use strict';

  var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };

  var RACCOURCIS = [
    { touche: '1 à 7', action: 'Aller à un écran : 1 tableau de bord, 2 boîte de réception, 3 tableau de suivi, 4 relances, 5 rapport, 6 essayer, 7 comment ça marche' },
    { touche: '8', action: 'Ouvrir les paramètres' },
    { touche: 'F', action: 'Mode présentation (plein écran, textes plus grands, éléments secondaires masqués)' },
    { touche: 'V', action: 'Lancer ou quitter la visite guidée en 7 étapes' },
    { touche: 'P', action: 'Ouvrir le rapport et placer le focus sur « Imprimer »' },
    { touche: '?', action: 'Afficher cette aide' },
    { touche: 'Échap', action: 'Fermer l\'aide, la visite, une bulle d\'information ou un panneau ; quitter le mode présentation' },
    { touche: '← → ↑ ↓', action: 'Dans un graphique : passer d\'une barre à l\'autre ; la bulle s\'affiche au focus' }
  ];

  var GLOSSAIRE = [
    { terme: 'Demande', definition: 'Un fil de messages qui attend une réponse de l\'agence : nouvelle demande, client existant, relance d\'un prospect ou demande hors périmètre. Un doublon, un fournisseur, une candidature, un démarchage ou un indésirable n\'est pas une demande.' },
    { terme: 'Relevé', definition: 'Les six informations lues dans le texte d\'un e-mail : besoin, service, budget, délai, entreprise, contact. Chacune est relevée, absente ou à vérifier, et cite le passage exact du message. Ce qui n\'est pas écrit reste absent : rien n\'est deviné.' },
    { terme: 'Brouillon', definition: 'Un texte de réponse préparé à partir du relevé, du catalogue de services, du ton et de la signature de l\'agence. Il est modifiable et n\'est jamais envoyé : une personne le relit, le copie dans sa messagerie et décide.' },
    { terme: 'Revue', definition: 'La mise de côté d\'un cas douteux (information ambiguë, plusieurs services, message transféré, pièce jointe, urgence…) pour qu\'une personne tranche. L\'outil ne tranche pas.' },
    { terme: 'Relance', definition: 'Une demande restée sans réponse de l\'agence au-delà du délai convenu (2 jours ouvrés par défaut, réglable). L\'outil prépare un texte de relance à relire ; il n\'envoie rien.' },
    { terme: 'Fil', definition: 'L\'ensemble des messages d\'une même conversation. Une demande correspond à un fil ; le tableau de suivi compte une ligne par fil.' },
    { terme: 'Budget déclaré', definition: 'Le montant que le prospect écrit dans son message, avec son type (exact, fourchette, à partir de, plafond, approximatif, incertain). Il n\'est ni garanti ni un prix de l\'agence, et les montants ne s\'additionnent pas comme des montants certains.' },
    { terme: 'Jour ouvré', definition: 'Du lundi au vendredi. Aucun jour férié n\'est géré sur la période de la démonstration.' },
    { terme: 'Date de référence', definition: 'La date fixe de la démonstration (vendredi 23 octobre 2026, 17 h 30). Tous les calculs partent d\'elle, jamais de l\'horloge de l\'ordinateur.' }
  ];

  /* Aide contextuelle : « Comment est-ce calculé ? » */
  var AIDE_CTX = {
    recues: { titre: 'Demandes reçues', texte: 'Nombre de demandes (fils dont le premier message attend une réponse) reçues du 28 septembre au 23 octobre 2026. Les doublons, fournisseurs, candidatures, démarchages et indésirables ne sont pas comptés. Indicateur calculé sur des données fictives.' },
    atraiter: { titre: 'Demandes à traiter', texte: 'Demandes dont au moins un message a encore le statut « À traiter ». Le nombre de messages concernés est indiqué dessous : c\'est le chiffre de la boîte de réception. Indicateur calculé sur des données fictives.' },
    retard: { titre: 'Sans réponse au-delà du délai', texte: 'Demandes pour lesquelles une réponse est attendue, qu\'aucune réponse n\'a été envoyée, et dont le nombre de jours ouvrés écoulés depuis la réception dépasse strictement le délai convenu. Un brouillon préparé ou relu, mais non envoyé, ne compte pas comme une réponse. Le détail est dans l\'écran Relances.' },
    manquantes: { titre: 'Informations manquantes', texte: 'Demandes dans le périmètre de l\'agence dont au moins une des six informations (besoin, service, budget, délai, entreprise, contact) est absente du message. Les demandes hors périmètre ne sont pas comptées. Une information absente reste absente : l\'outil ne la devine pas.' },
    completude: { titre: 'Complètes, incomplètes, en revue', texte: 'Sur les demandes dans le périmètre : « En revue » = au moins une information à vérifier ou statut « En revue » ; « Incomplète » = au moins une information absente ; « Complète » = les six informations relevées. Une demande n\'est comptée qu\'une fois. Indicateur sur données fictives.' },
    delai: { titre: 'Délai de première réponse', texte: 'Médiane, en heures ouvrées (lundi au vendredi, 9 h à 18 h), entre la réception et la première réponse de l\'agence, calculée sur les dates fictives. Un message reçu le soir ou le week-end compte à partir de l\'ouverture suivante. Les demandes sans réponse ne sont pas dans le calcul : elles ne peuvent pas l\'être.' },
    budgets: { titre: 'Budgets déclarés', texte: 'Montants écrits par les prospects fictifs, avec leur type. Ils ne sont ni garantis ni des prix de l\'agence. Le « minimum déclaré » additionne les montants bas annoncés (un plafond compte pour 0) ; le « maximum déclaré » additionne les montants hauts (un « à partir de » n\'a pas de maximum et est compté à part). Les montants ponctuels et ceux annoncés par mois, par an ou par unité ne se mélangent jamais.' },
    responsable: { titre: 'Activité par responsable', texte: 'Nombre de demandes attribuées à chaque personne de l\'équipe fictive, dont celles déjà répondues, celles à traiter et celles sans réponse au-delà du délai. Les demandes sans responsable sont comptées à part.' }
  };

  /* Visite guidée en 7 étapes : reprend le scénario de CONCEPTION.md (section 3). */
  var VISITE = [
    {
      titre: 'Le tableau de bord', duree: '30 secondes', hash: 'tableau-de-bord',
      texte: 'Quatre repères lisibles de loin : les demandes reçues, celles à traiter, celles restées sans réponse au-delà du délai (en rouge, avec leur ancienneté) et celles dont une information manque. Rien n\'a été envoyé automatiquement. Un clic sur le chiffre rouge ouvre les relances.'
    },
    {
      titre: 'La boîte de réception', duree: '30 secondes', hash: 'boite',
      texte: 'Tous les messages reçus, avec leur catégorie écrite en toutes lettres, leur ancienneté et leurs raisons de mise en revue. Rien n\'est classé par la couleur seule.'
    },
    {
      titre: 'Une demande type', duree: '1 min 30', hash: 'message/m01',
      texte: 'Le texte de l\'e-mail avec les passages relevés surlignés, et à côté les six informations. Survolez ou sélectionnez un champ (souris ou clavier) : son passage s\'allume dans le message. Ici le budget est une fourchette : l\'outil garde son type.'
    },
    {
      titre: 'Un cas ambigu, une information absente', duree: '45 secondes', hash: 'message/m04',
      texte: 'Un message long et confus : plusieurs raisons de mise en revue et des champs « à vérifier ». L\'outil ne tranche pas, la personne décide. Dans une autre demande, le budget est « absent » : l\'outil ne devine pas.',
      liens: [{ libelle: 'Voir un champ absent (demande m02)', hash: 'message/m02' }]
    },
    {
      titre: 'Le brouillon', duree: '1 minute', hash: 'brouillon/m02',
      texte: 'Le brouillon redemande les informations absentes (budget et délai), reprend le service demandé et se termine par la signature de l\'agence. Il est modifiable. La mention « jamais envoyé automatiquement » reste affichée, et il n\'existe aucun bouton d\'envoi.'
    },
    {
      titre: 'Le tableau de suivi et les relances', duree: '1 minute 15', hash: 'suivi',
      texte: 'Une ligne par demande, comme dans un tableur : tri, filtres, export CSV. Les relances listent les demandes sans réponse au-delà du délai ; le texte de relance est préparé à relire, jamais envoyé.',
      liens: [{ libelle: 'Aller aux relances', hash: 'relances' }, { libelle: 'Ouvrir le rapport hebdomadaire', hash: 'rapport' }]
    },
    {
      titre: 'Essayer avec un e-mail fictif', duree: '30 secondes', hash: 'essai',
      texte: 'Collez un e-mail fictif, ou insérez un exemple : l\'outil relève ce qui est écrit et laisse le reste vide. Ce sont des règles simples de démonstration ; la version réelle s\'appuierait sur un modèle de langage avec relecture humaine.'
    }
  ];

  /* Les sept étapes du parcours (schéma de l'écran « Comment ça marche »). acteur : outil | personne. */
  var ETAPES_PARCOURS = [
    { id: 'boite', num: 1, titre: 'Boîte Gmail', court: 'Boîte Gmail', etiquette: 'simulée ici', acteur: 'outil',
      texte: 'Les demandes arrivent dans une boîte dédiée. Dans la démonstration, la boîte est simulée : les e-mails fictifs sont fournis avec l\'outil et aucune vraie boîte n\'est lue.' },
    { id: 'releve', num: 2, titre: 'Relevé des informations', court: 'Relevé des informations', etiquette: 'préparé à l\'avance', acteur: 'outil',
      texte: 'Six informations sont relevées dans le texte de chaque e-mail : besoin, service, budget, délai, entreprise, contact. Dans la démonstration, le relevé des e-mails fournis est préparé à l\'avance ; l\'écran « Essayer » applique des règles simples.' },
    { id: 'controles', num: 3, titre: 'Contrôles', court: 'Contrôles', etiquette: 'doute : revue', acteur: 'outil',
      texte: 'Ce qui n\'est pas écrit reste absent. Ce qui est ambigu (deux montants, plusieurs services, délai vague, message transféré, pièce jointe, urgence) passe en revue. Un délai vague ne reçoit jamais de date inventée.' },
    { id: 'tableau', num: 4, titre: 'Tableau Google Sheets', court: 'Tableau Google Sheets', etiquette: 'aperçu local', acteur: 'outil',
      texte: 'Une ligne par demande, avec le statut, le responsable et les relances. Dans la démonstration, le tableau de suivi et son export CSV montrent ce qui serait écrit ; rien n\'est écrit dans un vrai tableur.' },
    { id: 'brouillon', num: 5, titre: 'Brouillon de réponse', court: 'Brouillon', etiquette: 'à relire', acteur: 'outil',
      texte: 'Un texte de réponse est préparé avec le ton et la signature de l\'agence. Il pose les questions qui correspondent aux informations absentes ou à vérifier, et ne promet ni prix, ni délai, ni résultat.' },
    { id: 'relecture', num: 6, titre: 'Relecture humaine', court: 'Relecture humaine', etiquette: 'une personne', acteur: 'personne',
      texte: 'Une personne de l\'agence relit le brouillon, le corrige, le marque comme relu ou le met en revue. L\'outil ne décide à sa place ni du contenu ni de l\'envoi.' },
    { id: 'envoi', num: 7, titre: 'Envoi par la personne', court: 'Envoi par la personne', etiquette: 'jamais automatique', acteur: 'personne',
      texte: 'La personne copie le texte dans sa messagerie et l\'envoie elle-même, ou ne l\'envoie pas. L\'outil n\'envoie jamais de message, de relance ou de notification.' }
  ];

  var LIMITES = [
    'Le texte des e-mails uniquement : les pièces jointes sont signalées mais jamais lues, les liens ne sont pas suivis.',
    'Les cas douteux passent en revue : une personne tranche, l\'outil ne choisit pas entre deux montants ou deux services.',
    'Jamais d\'envoi automatique : ni réponse, ni relance, ni notification.',
    'Une seule boîte, une langue principale (le français), un catalogue de services convenu avec l\'agence.',
    'Les e-mails de la démonstration sont écrits pour elle : ils sont plus nets que beaucoup de vrais messages. Le relevé fourni n\'est pas une mesure de précision.',
    'Les jours ouvrés vont du lundi au vendredi ; la gestion des jours fériés est à ajouter avant un usage réel.'
  ];

  var SUPPOSE = [
    'Un accès autorisé par l\'agence à une boîte dédiée aux demandes, sans transfert de la messagerie personnelle des équipes.',
    'Un tableau Google Sheets dédié, créé et détenu par l\'agence.',
    'Une relecture humaine de chaque brouillon avant tout envoi.',
    'Un catalogue de services, un ton et une signature validés par l\'agence.',
    'Une recette sur des cas réels de l\'agence, avec son accord, avant toute activation.'
  ];

  FI.ui.contenus = {
    RACCOURCIS: RACCOURCIS, GLOSSAIRE: GLOSSAIRE, AIDE_CTX: AIDE_CTX, VISITE: VISITE,
    ETAPES_PARCOURS: ETAPES_PARCOURS, LIMITES: LIMITES, SUPPOSE: SUPPOSE
  };
})(typeof self !== 'undefined' ? self : this);
