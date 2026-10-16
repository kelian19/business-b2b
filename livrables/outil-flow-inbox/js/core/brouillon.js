/* Flow Inbox : génération du brouillon de réponse et du texte de relance, PAR RÈGLES (aucun modèle d'IA).
 * Le texte n'utilise que ce qui a été relevé dans les messages, le catalogue, le ton et la signature de l'agence :
 * une information absente reste absente, chaque information absente ou à vérifier donne une question,
 * aucun prix, aucun délai ni aucun résultat n'est promis. Rien n'est envoyé : la personne copie le texte. Logique pure. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./dates.js'), require('./format.js'), require('./contexte.js'));
  } else {
    var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };
    FI.core.brouillon = factory(FI.core.dates, FI.core.format, FI.core.contexte);
  }
})(typeof self !== 'undefined' ? self : this, function (Dates, Fmt, Ctx) {
  'use strict';

  var MENTION = 'Brouillon : jamais envoyé automatiquement. Copiez le texte dans votre messagerie.';

  /* Catégories sans réponse attendue : aucun brouillon. */
  var SANS_BROUILLON = ['fournisseur', 'candidature', 'demarchage', 'indesirable'];

  var TONS = {
    chaleureux: {
      libelle: 'Chaleureux et précis',
      accuse: function (d) { return 'Merci pour votre message du ' + d + '.'; },
      accuseRelance: function (d) { return 'Merci pour votre relance du ' + d + ', et toutes nos excuses pour l\'attente.'; },
      accuseComplement: function (d) { return 'Merci pour votre message du ' + d + ', qui complète votre demande précédente.'; },
      retard: function (d) { return 'Votre message du ' + d + ' nous est bien parvenu et nous ne vous avons pas encore répondu : nous vous prions de nous en excuser.'; },
      retardPlusieurs: function (liste) { return 'Vos messages du ' + liste + ' nous sont bien parvenus et nous ne vous avons pas encore répondu : nous vous prions de nous en excuser.'; },
      introQuestions: 'Pour bien préparer la suite, pourriez-vous nous préciser :',
      clotureQuestions: 'Merci d\'avance pour ces précisions.',
      clotureSans: 'Si vous le souhaitez, nous pouvons en parler lors d\'un échange téléphonique ou en visio : quels créneaux vous conviendraient ?',
      horsPerimetre: 'Nous préférons vous le dire clairement plutôt que de vous laisser sans réponse.',
      horsPerimetreCloture: 'Si vous avez un projet dans l\'un de ces domaines, n\'hésitez pas à nous écrire.'
    },
    sobre: {
      libelle: 'Sobre et direct',
      accuse: function (d) { return 'Nous accusons réception de votre message du ' + d + '.'; },
      accuseRelance: function (d) { return 'Nous accusons réception de votre relance du ' + d + ' et vous prions de nous excuser pour ce délai.'; },
      accuseComplement: function (d) { return 'Nous accusons réception de votre message du ' + d + ', qui complète votre demande précédente.'; },
      retard: function (d) { return 'Nous avons bien reçu votre message du ' + d + ', auquel nous n\'avons pas encore répondu. Nous vous prions de nous en excuser.'; },
      retardPlusieurs: function (liste) { return 'Nous avons bien reçu vos messages du ' + liste + ', auxquels nous n\'avons pas encore répondu. Nous vous prions de nous en excuser.'; },
      introQuestions: 'Afin de préparer notre réponse, merci de nous indiquer :',
      clotureQuestions: 'Dans l\'attente de votre retour.',
      clotureSans: 'Nous restons à votre disposition pour en échanger par téléphone ou en visio.',
      horsPerimetre: 'Nous vous le précisons afin que vous puissiez vous adresser ailleurs sans attendre.',
      horsPerimetreCloture: 'Pour tout projet dans l\'un de ces domaines, vous pouvez nous écrire.'
    }
  };

  function ton(ctx) { return TONS[ctx.agence.ton] || TONS.chaleureux; }

  function parId(emails) {
    var m = {};
    (emails || []).forEach(function (e) { m[e.id] = e; });
    return m;
  }

  /** Relevé d'un champ pour un message : s'il est absent, on reprend celui du message auquel il répond (jamais une valeur déduite). */
  function releveEffectif(email, champ, index) {
    var courant = email;
    var garde = 0;
    while (courant && garde++ < 20) {
      var r = courant.releves[champ];
      if (r && r.statut !== 'absent') return { releve: r, heritee: courant !== email, de: courant.id };
      courant = courant.en_reponse_a && index ? index[courant.en_reponse_a] : null;
    }
    return { releve: { statut: 'absent', valeur: null, passage: null }, heritee: false, de: null };
  }

  function prenomNom(nom) {
    var t = String(nom || '').trim();
    var i = t.indexOf(' ');
    return i < 0 ? { prenom: t, nom: '' } : { prenom: t.slice(0, i), nom: t.slice(i + 1) };
  }

  /** Signature de l'agence pour une personne de l'équipe (modèle avec {prenom}, {nom}, {role}). */
  function signature(ctx, responsableId) {
    var p = Ctx.personne(ctx, responsableId) || Ctx.personne(ctx, ctx.parametres.responsable_par_defaut) || ctx.equipe[0];
    var pn = prenomNom(p ? p.nom : '');
    return String(ctx.agence.signature)
      .replace(/\{prenom\}/g, pn.prenom).replace(/\{nom\}/g, pn.nom).replace(/\{role\}/g, p ? p.role : '');
  }

  function listeLibelles(ctx) { return ctx.services.map(function (s) { return Fmt.premiereMinuscule(s.libelle); }).join(', '); }

  function question(champ, texte, pourquoi, origine) {
    return { champ: champ, texte: texte, pourquoi: pourquoi, origine: origine || 'champ' };
  }

  /** Une question pour chaque champ absent ou à vérifier ; les questions types du service complètent le besoin à préciser. */
  function questionsChamps(ctx, eff, serviceId, options) {
    var q = [];
    var st = function (c) { return eff[c].releve.statut; };
    var nomService = serviceId && serviceId !== 'hors_catalogue' ? Ctx.service(ctx, serviceId) : null;

    if (st('besoin') === 'absent') {
      if (nomService) {
        nomService.questions.forEach(function (t) { q.push(question('besoin', t, 'Besoin : absent du message (questions types du service)', 'catalogue')); });
      } else {
        q.push(question('besoin', 'Pouvez-vous nous décrire en quelques lignes ce que vous souhaitez réaliser ?', 'Besoin : absent du message'));
      }
    } else if (st('besoin') === 'a_verifier') {
      if (nomService) {
        nomService.questions.forEach(function (t) { q.push(question('besoin', t, 'Besoin : à vérifier (questions types du service)', 'catalogue')); });
      } else {
        q.push(question('besoin', 'Pour être sûrs d\'avoir bien compris, quel est l\'objectif principal de votre demande ?', 'Besoin : à vérifier'));
      }
    }

    if (st('service') === 'absent') {
      q.push(question('service', 'Parmi nos domaines d\'intervention (' + listeLibelles(ctx) + '), lequel correspond à votre demande ?', 'Service : absent du message'));
    } else if (st('service') === 'a_verifier') {
      var v = eff.service.releve.valeur;
      q.push(question('service', v && v !== 'hors_catalogue'
        ? 'Nous avons compris que votre demande relève de : ' + Fmt.premiereMinuscule(Ctx.libelleService(ctx, v)) + '. Est-ce bien le cas, ou souhaitez-vous commencer par un autre service ?'
        : 'Votre message évoque plusieurs sujets : par quel service souhaitez-vous commencer ?', 'Service : à vérifier'));
    }

    if (st('budget') === 'absent') {
      q.push(question('budget', 'Avez-vous une enveloppe budgétaire en tête, même approximative ?', 'Budget : absent du message'));
    } else if (st('budget') === 'a_verifier') {
      q.push(question('budget', 'Vous écrivez « ' + eff.budget.releve.passage + ' » : pouvez-vous nous confirmer le montant à retenir et la période qu\'il couvre ?', 'Budget : à vérifier'));
    }

    if (st('delai') === 'absent') {
      q.push(question('delai', 'Pour quand souhaitez-vous disposer du résultat, ou quelle échéance devons-nous respecter ?', 'Délai : absent du message'));
    } else if (st('delai') === 'a_verifier') {
      q.push(question('delai', 'Vous écrivez « ' + eff.delai.releve.passage + ' » : pouvez-vous nous confirmer la date à retenir ?', 'Délai : à vérifier'));
    }

    if (st('entreprise') === 'absent') {
      q.push(question('entreprise', 'Pour quelle entreprise ou organisation faites-vous cette demande ?', 'Entreprise : absente du message'));
    } else if (st('entreprise') === 'a_verifier') {
      q.push(question('entreprise', 'Pouvez-vous nous confirmer le nom de l\'entreprise ou de l\'organisation concernée ?', 'Entreprise : à vérifier'));
    }

    if (st('contact') === 'absent') {
      q.push(question('contact', 'À quel nom et à quelle adresse pouvons-nous vous répondre pour la suite ?', 'Contact : absent du message'));
    } else if (st('contact') === 'a_verifier') {
      q.push(question('contact', 'Pouvez-vous nous confirmer la personne à contacter pour la suite (nom et adresse) ?', 'Contact : à vérifier'));
    }

    if (options && options.questionsService && nomService && !q.some(function (x) { return x.origine === 'catalogue'; })) {
      nomService.questions.forEach(function (t) { q.push(question('service_type', t, 'Option : questions types du service', 'catalogue')); });
    }
    return q;
  }

  /** Questions liées aux cas particuliers (appel, pièce jointe, plusieurs services, agence en copie, transfert). */
  function questionsRevue(email, eff, dejaService) {
    var q = [];
    var revue = email.revue || [];
    if (revue.indexOf('demande_appel') >= 0 || (email.marqueurs || []).indexOf('appel_urgent') >= 0) {
      q.push(question('revue', 'Vous souhaitez être rappelé : à quels moments de la journée pouvons-nous vous joindre ?', 'Demande d\'appel', 'revue'));
    }
    if (revue.indexOf('piece_jointe_non_lue') >= 0 && email.pieces_jointes && email.pieces_jointes.length) {
      q.push(question('revue', 'Votre message mentionne une pièce jointe (' + email.pieces_jointes.join(', ') + ') : pouvez-vous en résumer l\'essentiel dans votre réponse ?', 'Pièce jointe non lue', 'revue'));
    }
    if (revue.indexOf('plusieurs_services') >= 0 && !dejaService) {
      q.push(question('revue', 'Votre message porte sur plusieurs services : par lequel souhaitez-vous commencer ?', 'Plusieurs services demandés', 'revue'));
    }
    if (revue.indexOf('agence_en_copie') >= 0) {
      q.push(question('revue', 'Souhaitez-vous que notre agence prenne en charge cette demande, et avec quel interlocuteur échanger ?', 'Agence en copie', 'revue'));
    }
    return q;
  }

  function destinataire(email, eff) {
    var marq = email.marqueurs || [];
    var c = eff.contact.releve;
    if ((marq.indexOf('transfere') >= 0 || marq.indexOf('agence_en_copie') >= 0) && c.valeur && c.valeur.email) {
      return { nom: c.valeur.nom, adresse: c.valeur.email };
    }
    return { nom: email.de.nom, adresse: email.de.adresse };
  }

  function sujetReponse(objet) { return /^re\s?:/i.test(objet) ? objet : 'Re : ' + objet; }

  function recapitulatif(eff, ctx) {
    var l = [];
    var b = eff.besoin.releve, s = eff.service.releve, bu = eff.budget.releve, d = eff.delai.releve;
    if (b.statut === 'releve' && b.valeur) l.push('Besoin : ' + b.valeur);
    if (s.statut === 'releve' && s.valeur && s.valeur !== 'hors_catalogue') l.push('Service : ' + Ctx.libelleService(ctx, s.valeur));
    if (bu.statut === 'releve' && bu.valeur) l.push('Budget que vous avez indiqué : ' + Fmt.budgetMontant(bu.valeur));
    if (d.statut === 'releve' && d.valeur) l.push('Délai : ' + d.valeur.texte);
    return l;
  }

  /**
   * Brouillon de réponse pour un message.
   * opts : { emails (messages du jeu, pour retrouver le fil), mode: 'reponse' | 'relance', dates (dates de réception des messages sans réponse), questionsService }.
   * Renvoie { applicable, motif, texte, questions, destinataire, objet, responsable, recap }.
   */
  function construire(email, ctx, opts) {
    opts = opts || {};
    var index = parId(opts.emails);
    if (SANS_BROUILLON.indexOf(email.categorie) >= 0) {
      return { applicable: false, motif: 'Aucune réponse n\'est attendue pour ce type de message (catégorie « ' + email.categorie + ' »).', texte: '', questions: [], recap: [] };
    }
    if (email.traitement.statut === 'doublon' || email.doublon_de) {
      return { applicable: false, motif: 'Ce message est un doublon' + (email.doublon_de ? ' du message ' + email.doublon_de : '') + ' : aucune réponse à préparer.', texte: '', questions: [], recap: [] };
    }

    var eff = {};
    ['besoin', 'service', 'budget', 'delai', 'entreprise', 'contact'].forEach(function (c) { eff[c] = releveEffectif(email, c, index); });
    var T = ton(ctx);
    var marq = email.marqueurs || [];
    var revue = email.revue || [];
    var dest = destinataire(email, eff);
    var responsable = email.traitement.responsable || ctx.parametres.responsable_par_defaut;
    var serviceId = eff.service.releve.valeur && eff.service.releve.statut !== 'absent' ? eff.service.releve.valeur : null;
    var horsPerimetre = email.categorie === 'hors_perimetre' || serviceId === 'hors_catalogue';
    var d = Dates.fmtDate(email.date);
    var para = [];

    /* Salutation */
    var cv = eff.contact.releve.valeur;
    var nomSalut = marq.indexOf('transfere') >= 0 || marq.indexOf('agence_en_copie') >= 0 ? dest.nom : (cv && cv.nom ? cv.nom : email.de.nom);
    para.push('Bonjour ' + nomSalut + ',');

    /* Accusé de réception */
    var accuse;
    if (opts.mode === 'relance') {
      var dates = (opts.dates && opts.dates.length ? opts.dates : [email.date]).map(Dates.fmtDate);
      accuse = dates.length > 1 ? T.retardPlusieurs(dates.slice(0, -1).join(', ') + ' et du ' + dates[dates.length - 1]) : T.retard(dates[0]);
    } else if (marq.indexOf('agence_en_copie') >= 0) {
      accuse = email.de.nom + ' nous a mis en copie de son message du ' + d + '.';
    } else if (marq.indexOf('transfere') >= 0) {
      accuse = 'Votre demande nous a été transmise par ' + email.de.nom + ' le ' + d + '.';
    } else if (marq.indexOf('relance') >= 0) {
      accuse = T.accuseRelance(d);
    } else if (marq.indexOf('reponse_fil') >= 0) {
      accuse = T.accuseComplement(d);
    } else {
      accuse = T.accuse(d);
    }
    var intro = [accuse];
    if (revue.indexOf('urgence') >= 0) intro.push('Nous avons bien noté le caractère urgent de votre demande.');
    if (serviceId && serviceId !== 'hors_catalogue' && eff.service.releve.statut === 'releve') {
      intro.push('Nous avons bien noté votre demande : ' + Fmt.premiereMinuscule(Ctx.libelleService(ctx, serviceId)) + '.');
    }
    para.push(intro.join(' '));

    var recap = recapitulatif(eff, ctx);
    var questions = [];

    if (horsPerimetre) {
      if (recap.length) para.push('Ce que nous avons noté :\n' + recap.map(function (x) { return '- ' + x; }).join('\n'));
      para.push('Cette demande concerne un domaine que l\'agence ne propose pas, et nous ne pourrons donc pas y répondre nous-mêmes. ' + T.horsPerimetre);
      para.push('Nous intervenons dans les domaines suivants : ' + listeLibelles(ctx) + '. ' + T.horsPerimetreCloture);
    } else {
      if (recap.length) para.push('Ce que nous avons noté de votre message :\n' + recap.map(function (x) { return '- ' + x; }).join('\n'));
      questions = questionsChamps(ctx, eff, serviceId, opts);
      var dejaService = questions.some(function (x) { return x.champ === 'service'; });
      questions = questions.concat(questionsRevue(email, eff, dejaService));
      if (questions.length) {
        para.push(T.introQuestions + '\n' + questions.map(function (x) { return '- ' + x.texte; }).join('\n'));
        para.push(T.clotureQuestions);
      } else {
        para.push(T.clotureSans);
      }
    }

    para.push(signature(ctx, responsable));

    return {
      applicable: true, motif: null, texte: para.join('\n\n'), questions: questions, recap: recap,
      destinataire: dest, objet: sujetReponse(email.objet), responsable: responsable, horsPerimetre: horsPerimetre
    };
  }

  /** Texte de relance pour une demande en retard (élément de demandes.relances) : même règles, avec excuses pour le retard. */
  function relance(item, ctx, emails) {
    return construire(item.cible, ctx, {
      emails: emails, mode: 'relance',
      dates: item.sansReponse.map(function (m) { return m.date; })
    });
  }

  return {
    MENTION: MENTION, TONS: TONS, SANS_BROUILLON: SANS_BROUILLON,
    construire: construire, relance: relance, signature: signature, releveEffectif: releveEffectif, prenomNom: prenomNom
  };
});
