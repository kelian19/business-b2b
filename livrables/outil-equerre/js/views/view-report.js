/* Équerre : étape 5, rapport de livraison (module H). Aperçu à l'écran en feuilles A4 ; à l'impression, seule cette section est
 * imprimée, quelle que soit l'étape affichée (voir styles/print.css). Toute saisie (nom d'entreprise, responsables, noms de fichier,
 * noms de modèles) est rendue par textContent. Aucune règle de calcul ici : tout vient de EquerreLogic via les dérivés.
 * Toute estimation est étiquetée « estimation » ; le rapport ne promet aucun gain ni aucune conformité. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var S = E.ui.store;
  var Der = E.ui.derived;
  var L = root.EquerreLogic;
  var Ch = E.ui.charts;
  var T = L.TEXTES_RAPPORT;

  var racine = null;
  var nomLocal = null;   // saisie vide en cours : le rapport affiche « Votre entreprise » sans toucher au dossier

  function nomCourant() {
    return nomLocal !== null ? L.nomAffiche(nomLocal) : L.nomAffiche(S.dossier().entreprise.nom);
  }

  function spanNom(classe) { return h('span', { class: 'r-nom' + (classe ? ' ' + classe : ''), text: nomCourant() }); }

  /** Met à jour en place tout ce qui affiche le nom d'entreprise (couverture, en-têtes des feuilles) : le champ de saisie garde le focus. */
  function majNom() {
    if (!racine) return;
    var nom = nomCourant();
    Array.prototype.forEach.call(racine.querySelectorAll('.r-nom'), function (n) { n.textContent = nom; });
    var logo = racine.querySelector('.r-logo');
    if (logo) logo.setAttribute('alt', 'Logo de ' + nom);
  }

  /* ---------- Briques ---------- */

  function tableau(classe, caption, entetes, lignes) {
    return h('table', { class: 'r-table ' + classe }, [
      h('caption', { class: 'visually-hidden', text: caption }),
      h('thead', null, [h('tr', null, entetes.map(function (e) {
        var o = typeof e === 'string' ? { t: e } : e;
        return h('th', { scope: 'col', class: o.num ? 'num' : null, text: o.t });
      }))]),
      h('tbody', null, lignes)
    ]);
  }

  function vide(texte) { return h('p', { class: 'r-vide' }, [U.icon('info'), h('span', { text: texte })]); }

  function enteteFeuille(d, ref) {
    return h('div', { class: 'r-entete' }, [
      h('span', { class: 'r-marque-p', text: 'flow' }),
      h('span', { class: 'r-entete-nom' }, [spanNom(), ' · Situation au ' + U.fmtDate(ref)])
    ]);
  }

  function pieds(d) {
    var p = L.piedDePage(d.mode, d);
    return { texte: p.texte, version: p.version };
  }

  /** Une feuille A4 : contenu + pied de page de l'aperçu à l'écran (à l'impression, le pied répété est unique et fixe). */
  function feuille(id, classe, titreId, enfants, d) {
    var p = pieds(d);
    return h('section', { class: 'feuille ' + classe, id: id, 'aria-labelledby': titreId }, [
      h('div', { class: 'feuille-corps' }, enfants),
      h('p', { class: 'r-ecran-seul feuille-pied' }, [h('span', { text: p.texte }), ' · ', h('span', { text: p.version })])
    ]);
  }

  /* ---------- Page 1 : couverture ---------- */

  function couverture(d, ref) {
    var v = L.versionDossier(d);
    var logo = d.entreprise.logo ? h('img', { class: 'r-logo', src: d.entreprise.logo, alt: 'Logo de ' + nomCourant() }) : null;
    var cadre = d.mode === 'demo'
      ? h('div', { class: 'r-cadre r-cadre-demo', role: 'note' }, [
        h('strong', { text: T.demo }),
        h('span', { text: 'Les noms d\'entreprises sont inventés et les SIREN sont générés : ils ne correspondent à aucune entreprise réelle.' })
      ])
      : h('div', { class: 'r-cadre r-cadre-client', role: 'note' }, [h('strong', { text: T.clientBandeau }), h('span', { text: T.confidentialite.replace(T.clientBandeau + '. ', '') })]);
    return feuille('rapport-couverture', 'feuille-couverture', 'r-titre', [
      h('p', { class: 'r-marque', text: 'flow' }),
      h('div', { class: 'r-centre' }, [
        logo,
        h('h3', { id: 'r-titre', class: 'r-titre', text: T.titre }),
        h('p', { class: 'r-entreprise' }, [spanNom()]),
        h('dl', { class: 'r-meta' }, [
          h('div', null, [h('dt', { text: 'Date de situation' }), h('dd', { text: U.fmtDate(ref) })]),
          h('div', null, [h('dt', { text: 'Version du dossier' }), h('dd', { text: v.long })]),
          h('div', null, [h('dt', { text: 'Secteur' }), h('dd', { text: d.entreprise.secteur || 'non renseigné' })])
        ])
      ]),
      cadre,
      h('p', { class: 'r-estim', text: T.estimations })
    ], d);
  }

  /* ---------- Page 2 : synthèse de direction ---------- */

  function texteCompte(ref) {
    var c = L.compteARebours(ref);
    if (c.phase === 'avant_emission') return { grand: U.fmtJours(c.joursAvantEmission) + ' avant le 1er septembre 2027', sous: 'Date à laquelle l\'émission des factures sous forme électronique devient obligatoire pour les PME, TPE et micro-entreprises.' };
    if (c.phase === 'echeance_atteinte') return { grand: 'Échéance du 1er septembre 2027 atteinte aujourd\'hui', sous: 'L\'émission sous forme électronique est obligatoire à cette date pour les PME, TPE et micro-entreprises.' };
    if (c.phase === 'echeance_depassee') return { grand: 'Échéance du 1er septembre 2027 dépassée de ' + U.fmtJours(c.joursDepassement), sous: 'L\'émission sous forme électronique est obligatoire depuis le 1er septembre 2027 pour les PME, TPE et micro-entreprises.' };
    return { grand: 'La réception sera obligatoire dans ' + U.fmtJours(c.joursAvantReception), sous: 'Réception obligatoire à partir du 1er septembre 2026 ; émission pour les PME, TPE et micro-entreprises le 1er septembre 2027.' };
  }

  function phraseExposition(ex) {
    var c = ex.calcul;
    if (!c) return 'Exposition théorique non calculable : le nombre de factures sur 12 mois n\'est pas renseigné.';
    return 'jusqu\'à ' + U.fmtEur(c.plafonne) + ' (' + U.fmtNum(c.nbFactures) + ' ' + (c.nbFactures > 1 ? 'factures' : 'facture') + ' × ' + U.fmtEur(c.unitaire) +
      ', plafond ' + U.fmtEur(c.plafond) + ' par an' + (c.plafondAtteint ? ', plafond atteint' : '') + '), estimation' +
      (ex.saisi === null && ex.deduit !== null ? ' ; factures émises ' + Der.fenetre12Texte() : '');
  }

  function ligneAction(t, i) {
    return h('li', { class: 'r-action' }, [
      h('span', { class: 'r-n', text: (i + 1) + '.' }),
      h('div', { class: 'r-action-corps' }, [
        h('strong', { class: 'r-action-titre', text: t.titre }),
        h('span', { class: 'r-action-meta', text: t.priorite + ' ' + L.PRIORITES[t.priorite] + ' · Statut : ' + L.STATUTS_PLAN_LIBELLES[t.statut] + ' · Responsable : ' + (t.responsable || 'non renseigné') })
      ])
    ]);
  }

  function synthese(d, ref, syn, plan, ex) {
    var ind = syn.indice;
    var aria = 'Indice de préparation : ' + ind.indice + ' sur 100, estimation' + (ind.partiel ? ', indice partiel' : '');
    var g = Ch.jauge({ valeur: ind.indice, precedent: null, aria: aria });
    var compos = h('ul', { class: 'r-compos', role: 'list' }, ind.composantes.map(function (c) {
      return h('li', null, [
        h('span', { class: 'r-compos-nom', text: c.label }),
        h('span', { class: 'r-compos-poids', text: c.poidsPct + U.NBSP + '% du total' }),
        h('span', { class: 'r-compos-val', text: c.evalue ? c.valeur + ' / 100' : 'non évalué' })
      ]);
    }));
    var cdr = texteCompte(ref);
    var pc = syn.partCa;
    var partCa;
    if (pc && pc.calculable) {
      partCa = [
        h('p', { class: 'r-gros r-gros-rouge', text: U.fmtPct(pc.bloquant.part, 1) + ' bloquant, ' + U.fmtPct(pc.aCorriger.part, 1) + ' à corriger' }),
        h('p', { class: 'r-petit', text: 'du CA HT des 12 derniers mois est facturé à des clients dont la fiche bloquerait une facture électronique (SIREN manquant ou invalide), ou doit être corrigée (' + U.fmtEur(pc.bloquant.ca) + ' HT pour les fiches bloquantes). Période : ' + Der.fenetre12Texte() + '.' })
      ];
    } else {
      partCa = [h('p', { class: 'r-petit', text: 'Part du CA à risque non calculable : il manque un fichier tiers ou un export de factures rapprochables.' })];
    }
    var cinq = plan.taches.slice(0, 5);
    var actions = cinq.length
      ? h('ol', { class: 'r-actions' }, cinq.map(ligneAction))
      : h('p', { class: 'r-petit', text: 'Aucune action à planifier d\'après ces données.' });
    return feuille('rapport-synthese', 'feuille-synthese', 'r-synth-t', [
      enteteFeuille(d, ref),
      h('h3', { id: 'r-synth-t', class: 'r-h', text: 'Synthèse de direction' }),
      h('div', { class: 'r-synth-haut' }, [
        h('div', { class: 'r-bloc r-bloc-indice' }, [
          h('h4', { text: 'Indice de préparation' }),
          g.el,
          h('p', { class: 'r-indice-phrase', text: 'Indice de préparation : ' + ind.indice + ' sur 100 (estimation' + (ind.partiel ? ', indice partiel' : '') + ')' }),
          compos,
          h('p', { class: 'r-petit', text: 'Pondération conventionnelle (hypothèse), pas une norme.' })
        ]),
        h('div', { class: 'r-colonne' }, [
          h('div', { class: 'r-bloc' }, [
            h('h4', { text: 'Compte à rebours' }),
            h('p', { class: 'r-gros', text: cdr.grand }),
            h('p', { class: 'r-petit', text: cdr.sous })
          ]),
          h('div', { class: 'r-bloc' }, [
            h('h4', { text: 'Exposition théorique aux amendes' }),
            h('p', { class: 'r-gros', text: phraseExposition(ex) }),
            h('p', { class: 'r-petit', text: 'Plafond théorique si les factures restent non électroniques après le 1er septembre 2027 (article 1737 du CGI) ; ' + T.conseil + '.' })
          ]),
          h('div', { class: 'r-bloc' }, [h('h4', { text: 'Part du chiffre d\'affaires à risque' })].concat(partCa))
        ])
      ]),
      h('div', { class: 'r-bloc r-bloc-actions' }, [h('h4', { text: '5 actions prioritaires' }), actions]),
      h('p', { class: 'r-ligne-finale', text: 'Réception obligatoire à compter du 1er septembre 2026 ; 4 nouvelles mentions obligatoires entre entreprises assujetties (SIREN du client, adresse de livraison si elle diffère, nature de l\'opération, option pour le paiement de la TVA d\'après les débits).' }),
      h('p', { class: 'r-petit', text: 'Les chiffres de ce rapport sont des estimations ; ils ne constituent ni un conseil fiscal ni une promesse de conformité.' })
    ], d);
  }

  /* ---------- Page 3 : plan d'action ---------- */

  function planAction(d, ref, plan) {
    var r = plan.resume;
    var corps;
    if (!plan.taches.length) corps = vide('Aucune action à planifier d\'après ces données.');
    else {
      corps = tableau('r-t-plan', 'Plan d\'action', ['#', 'Priorité', 'Action', 'Pourquoi', 'Effort (estimation)', 'Responsable', 'Statut', 'Échéance'],
        plan.taches.map(function (t) {
          return h('tr', null, [
            h('td', { class: 'num', text: String(t.ordre) }),
            h('td', { text: t.priorite + ' ' + L.PRIORITES[t.priorite] }),
            h('th', { scope: 'row', text: t.titre }),
            h('td', null, [h('span', { text: t.pourquoi }), h('em', { class: 'r-source', text: t.sourcePourquoi === 'fait verifie' ? 'Obligation vérifiée' : 'Bonne pratique' })]),
            h('td', { text: t.effortLabel }),
            h('td', { text: t.responsable || 'non renseigné' }),
            h('td', { text: L.STATUTS_PLAN_LIBELLES[t.statut] }),
            h('td', { text: t.echeance ? U.fmtDate(t.echeance) : '–' })
          ]);
        }));
    }
    return feuille('rapport-plan', 'feuille-plan', 'r-plan-t', [
      enteteFeuille(d, ref),
      h('h3', { id: 'r-plan-t', class: 'r-h', text: 'Plan d\'action' }),
      plan.taches.length ? h('p', { class: 'r-resume', text: U.pluriel(r.nb, 'action', 'actions') + ' · ' + U.pluriel(r.faites, 'faite', 'faites') + ' · effort total estimé : ' + r.effortLabel + ' (estimation)' }) : null,
      corps,
      h('p', { class: 'r-petit', text: 'Les efforts sont des estimations à confirmer sur votre fichier. Les statuts et responsables sont ceux saisis dans l\'outil ; l\'indice se calcule à partir des données et des réponses, pas des statuts.' })
    ], d);
  }

  /* ---------- Annexe A : anomalies du fichier tiers ---------- */

  function annexeA(d, ref) {
    var t = Der.tiers();
    var corps = [];
    if (!t) {
      corps.push(vide('Aucun fichier tiers dans ce dossier : cette annexe est vide.'));
    } else {
      var res = L.anomaliesImpactantes(t.origine, t.propositions, Der.caTiers(), d.corrections, L.CONST.MAX_ANNEXE_ANOMALIES);
      if (!res.total) corps.push(vide('Aucune anomalie dans le fichier tiers.'));
      else {
        corps.push(h('p', { class: 'r-petit', text: U.pluriel(res.total, 'anomalie', 'anomalies') + ' sur ' + U.pluriel(t.analysis.total, 'fiche', 'fiches') + (res.tronque
          ? ' : les ' + res.max + ' plus impactantes sont listées (ordre : chiffre d\'affaires HT sur 12 mois × coefficient, hypothèse). Le fichier fiabilisé (CSV, étape 2) contient toutes les lignes.'
          : ', classées par impact (chiffre d\'affaires HT sur 12 mois × coefficient, hypothèse).') }));
        corps.push(tableau('r-t-anom', 'Anomalies du fichier tiers et corrections proposées', ['Ligne', 'Nom', 'Anomalie', 'Valeur actuelle → correction proposée', 'Décision'],
          res.lignes.map(function (x) {
            var cert = x.certitude ? ' (' + (L.CERTITUDE_LIBELLES[x.certitude] || x.certitude).toLowerCase() + ')' : '';
            return h('tr', null, [
              h('td', { class: 'num', text: String(x.ligne) }),
              h('th', { scope: 'row', text: x.nom || '(sans nom)' }),
              h('td', null, [U.statusBadge(x.gravite, x.anomalie)]),
              h('td', { text: (x.valeurActuelle ? x.valeurActuelle + ' → ' : '') + (x.correction || 'à examiner') + cert }),
              h('td', { text: x.decision || 'à décider' })
            ]);
          })));
        corps.push(h('p', { class: 'r-petit', text: 'Aucune donnée n\'est modifiée par l\'outil : chaque correction proposée reste à valider ligne par ligne. Les corrections « à vérifier » ne contiennent jamais de SIREN inventé.' }));
      }
    }
    return feuille('rapport-annexe-a', 'feuille-annexe', 'r-annexes-t', [
      enteteFeuille(d, ref),
      h('h3', { id: 'r-annexes-t', class: 'r-h', text: 'Annexes' }),
      h('h4', { class: 'r-h2', text: 'A. Corrections et anomalies du fichier tiers' })
    ].concat(corps), d);
  }

  /* ---------- Annexe B : modèles de factures ---------- */

  var ICONE_STATUT = { present: 'check-cercle', absent: 'croix-cercle', a_verifier: 'info', sans_objet: null, non_controle: null };

  function celluleStatut(statut) {
    return h('td', { class: 'r-st r-st-' + statut }, [ICONE_STATUT[statut] ? U.icon(ICONE_STATUT[statut]) : null, h('span', { text: L.STATUT_LIBELLES[statut] })]);
  }

  function annexeB(d, ref, syn) {
    var modeles = d.modeles;
    var cpt = Der.modeles();
    var nv = cpt.cumule.nouvelles;
    var lignes = [];
    function groupe(titre, liste) {
      lignes.push(h('tr', { class: 'r-groupe' }, [h('th', { scope: 'colgroup', colspan: String(modeles.length + 1), text: titre })]));
      liste.forEach(function (m) {
        lignes.push(h('tr', null, [h('th', { scope: 'row', text: m.label })].concat(modeles.map(function (mod) { return celluleStatut(L.controleDe(mod, m.id).statut); }))));
      });
    }
    groupe('Les 4 nouvelles mentions (à compter du 1er septembre 2026)', L.LISTE_NOUVELLES);
    groupe('Mentions courantes (liste non exhaustive)', L.LISTE_COURANTES);
    var table = tableau('r-t-modeles', 'Mentions contrôlées par modèle de facture', [{ t: 'Mention' }].concat(modeles.map(function (m) { return { t: m.nom }; })), lignes);

    var notes = [];
    modeles.forEach(function (mod) {
      L.LISTE_MODELE.forEach(function (m) {
        var c = L.controleDe(mod, m.id);
        if (c.preuve || c.note) notes.push(h('li', null, [h('strong', { text: mod.nom + ' : ' + m.label }), c.preuve ? ' · preuve : ' + c.preuve : '', c.note ? ' · note : ' + c.note : '']));
      });
    });

    var lc = syn.lignesControle;
    var auto;
    if (lc && lc.controle) {
      auto = [
        h('h5', { class: 'r-h3', text: 'Contrôle automatique des lignes de factures' }),
        h('p', { class: 'r-petit', text: U.pluriel(lc.nbFactures, 'facture contrôlée', 'factures contrôlées') + ' : ' + lc.ok + ' mentions présentes sur ' + lc.total + ' contrôlées.' }),
        tableau('r-t-auto', 'Contrôle automatique des lignes de factures', ['Mention', { t: 'Présentes', num: true }, { t: 'Manquantes', num: true }, { t: 'À vérifier', num: true }, { t: 'Sans objet', num: true }],
          L.LISTE_NOUVELLES.map(function (m) {
            var pm = lc.parMention[m.id];
            if (!pm || !pm.controle) return h('tr', null, [h('th', { scope: 'row', text: m.label }), h('td', { colspan: '4', text: 'Colonne absente de l\'export : non contrôlé' })]);
            return h('tr', null, [h('th', { scope: 'row', text: m.label }), h('td', { class: 'num', text: String(pm.present) }), h('td', { class: 'num', text: String(pm.manquant) }), h('td', { class: 'num', text: String(pm.aVerifier) }), h('td', { class: 'num', text: String(pm.sansObjet) })]);
          }))
      ];
    } else {
      auto = [h('p', { class: 'r-petit', text: 'Export des lignes de factures non fourni : le contrôle automatique n\'a pas été réalisé.' })];
    }

    return feuille('rapport-annexe-b', 'feuille-annexe', 'r-annexe-b-t', [
      enteteFeuille(d, ref),
      h('h4', { id: 'r-annexe-b-t', class: 'r-h2', text: 'B. Modèles de factures et mentions' }),
      nv.total ? h('p', { class: 'r-resume', text: nv.ok + ' des ' + nv.total + ' mentions nouvelles contrôlées sont présentes (' + U.pluriel(modeles.length, 'modèle', 'modèles') + ').' })
        : h('p', { class: 'r-resume', text: 'Aucune mention nouvelle contrôlée sur les modèles de factures.' }),
      table,
      h('p', { class: 'r-petit', text: L.NOTE_NON_EXHAUSTIVE }),
      notes.length ? h('div', null, [h('h5', { class: 'r-h3', text: 'Preuves et notes' }), h('ul', { class: 'r-notes' }, notes)]) : null
    ].concat(auto), d);
  }

  /* ---------- Annexes C et D : organisation et trésorerie ---------- */

  var REPONSES = { oui: 'Oui', non: 'Non', nsp: 'Ne sait pas' };

  function annexeC(d) {
    var Q = E.ui.organisationForm.QUESTIONS;
    var org = d.organisation;
    var lignes = Q.map(function (q) {
      return h('tr', null, [
        h('th', { scope: 'row', text: q.texte }),
        h('td', { text: REPONSES[org[q.cle]] || '–' }),
        h('td', { text: org.cibles[q.cle] ? U.fmtDate(org.cibles[q.cle]) : 'non fixée' })
      ]);
    });
    lignes.push(h('tr', null, [h('th', { scope: 'row', text: 'Test avant la bascule' }), h('td', { text: '–' }), h('td', { text: org.cibles.test ? U.fmtDate(org.cibles.test) : 'non fixée' })]));
    return [
      h('h4', { class: 'r-h2', id: 'r-annexe-c-t', text: 'C. Organisation' }),
      tableau('r-t-org', 'Réponses d\'organisation et dates cibles internes', ['Question', 'Réponse', 'Date cible interne'], lignes),
      h('p', { class: 'r-petit', text: 'Les dates cibles sont des repères internes choisis par l\'entreprise : ce ne sont pas des échéances réglementaires.' })
    ];
  }

  function annexeD(d) {
    var tr = Der.tresorerie();
    if (!tr) {
      return [h('h4', { class: 'r-h2', id: 'r-annexe-d-t', text: 'D. Trésorerie' }), vide('Aucun export de factures dans ce dossier : la trésorerie n\'est pas présentée.')];
    }
    var enc = tr.encaissements;
    var visibles = enc.tranches.filter(function (x) { return x.visible; });
    var max = Math.max.apply(null, visibles.map(function (x) { return x.total; }).concat([1]));
    var lignes = visibles.map(function (x) {
      return h('tr', null, [
        h('th', { scope: 'row', text: x.label }),
        h('td', { class: 'num', text: U.pluriel(x.nb, 'facture', 'factures') }),
        h('td', { class: 'num', text: U.fmtEur(x.total) }),
        h('td', { class: 'r-barre-cell' }, [h('span', { class: 'r-barre' + (x.id === 'echu' ? ' r-barre-alerte' : ''), style: 'width:' + Math.round(100 * x.total / max) + '%' })])
      ]);
    });
    if (enc.sansEcheance.nb) lignes.push(h('tr', null, [h('th', { scope: 'row', text: 'Sans date d\'échéance' }), h('td', { class: 'num', text: U.pluriel(enc.sansEcheance.nb, 'facture', 'factures') }), h('td', { class: 'num', text: U.fmtEur(enc.sansEcheance.total) }), h('td')]));
    var rap = tr.rapport;
    var conc = tr.concentration;
    var al = tr.alertes;
    var alertes = [];
    if (al.echuesPlus60.nb > 0) {
      var cl = al.echuesPlus60.clients;
      alertes.push(U.pluriel(al.echuesPlus60.nb, 'facture échue', 'factures échues') + ' depuis plus de 60 jours (' + U.fmtEur(al.echuesPlus60.total) + ')' + (cl.length === 1 ? ', toutes sur ' + cl[0] : ', sur ' + U.pluriel(cl.length, 'client', 'clients')));
    }
    if (al.clientLePlusExpose) alertes.push('Client le plus exposé : ' + al.clientLePlusExpose.nom + ', ' + U.fmtEur(al.clientLePlusExpose.encours) + ' TTC non payés (' + U.fmtPct(al.clientLePlusExpose.part, 1) + ' de l\'encours)');
    return [
      h('h4', { class: 'r-h2', id: 'r-annexe-d-t', text: 'D. Trésorerie : encaissements attendus' }),
      enc.nbNonPayees ? tableau('r-t-treso', 'Encaissements attendus par tranche d\'échéance, montants TTC', ['Tranche', { t: 'Factures', num: true }, { t: 'Montant TTC', num: true }, { t: 'Répartition' }], lignes)
        : vide('Aucune facture non payée à la date de référence.'),
      enc.nbNonPayees ? h('p', { class: 'r-resume', text: 'Encours non payé : ' + U.fmtEur(enc.total) + ' TTC (' + U.pluriel(enc.nbNonPayees, 'facture', 'factures') + ').' }) : null,
      h('ul', { class: 'r-pilotage' }, [
        h('li', { text: 'Délai moyen de paiement : ' + (rap.delaiMoyenPaiement === null ? 'non disponible' : U.fmtJours(rap.delaiMoyenPaiement)) }),
        h('li', { text: 'Part des 5 premiers clients : ' + U.fmtPct(conc.part, 0) + ' du CA HT' + (conc.elevee ? ' (concentration élevée, seuil ' + U.fmtPct(conc.seuil, 0) + ', hypothèse)' : ' (seuil ' + U.fmtPct(conc.seuil, 0) + ', hypothèse)') }),
        h('li', { text: 'Factures échues : ' + rap.echues.nb + ', soit ' + U.fmtEur(rap.echues.total) })
      ]),
      alertes.length ? h('ul', { class: 'r-alertes' }, alertes.map(function (t) { return h('li', null, [U.icon('alerte'), h('span', { text: t })]); })) : h('p', { class: 'r-petit', text: 'Aucune alerte à la date de référence.' })
    ];
  }

  function annexeCD(d, ref) {
    return feuille('rapport-annexe-cd', 'feuille-annexe', 'r-annexe-c-t', [enteteFeuille(d, ref)].concat(annexeC(d), annexeD(d)), d);
  }

  /* ---------- Rendu ---------- */

  function render(container) {
    racine = container;
    nomLocal = null;
    var d = S.dossier();
    var ref = Der.refDate();
    var syn = Der.synthese();
    var plan = Der.plan();
    var ex = Der.exposition();
    var p = pieds(d);
    U.clear(container);

    var champ = h('input', { type: 'text', id: 'rapport-nom', class: 'champ r-champ-nom', maxlength: String(L.CONST.MAX_NOM), autocomplete: 'off', value: d.entreprise.nom, 'data-fk': 'rapport-nom' });
    champ.addEventListener('input', function () {
      var v = champ.value;
      if (v.trim()) { nomLocal = null; S.commit('nommerEntreprise', { nom: v }); }
      else { nomLocal = ''; majNom(); }
    });
    champ.addEventListener('blur', function () {
      nomLocal = null;
      champ.value = S.dossier().entreprise.nom;
      majNom();
    });

    container.appendChild(h('div', { class: 'panel-top r-ecran-seul' }, [
      h('div', null, [
        h('h2', { text: 'Rapport de livraison' }),
        h('p', { class: 'lead secondary', text: 'Aperçu du rapport remis au client : couverture, synthèse de direction, plan d\'action et annexes. Il s\'imprime en A4 ; l\'impression ne contient que ce rapport, quelle que soit l\'étape affichée.' })
      ]),
      h('p', { class: 'source' + (d.mode === 'client' ? ' own' : ''), text: d.mode === 'demo' ? 'Source : données fictives de démonstration' : 'Source : votre dossier' })
    ]));
    container.appendChild(h('section', { class: 'card r-outils r-ecran-seul', 'aria-labelledby': 'r-outils-t' }, [
      h('h3', { id: 'r-outils-t', class: 'visually-hidden', text: 'Impression du rapport' }),
      h('div', { class: 'r-outils-ligne' }, [
        h('div', { class: 'champ-groupe' }, [h('label', { for: 'rapport-nom', text: 'Nom de l\'entreprise (partagé avec l\'en-tête)' }), champ]),
        U.bouton('Imprimer / enregistrer en PDF', { icone: 'imprimante', id: 'btn-imprimer', primaire: true, onclick: function () { imprimer(); } })
      ]),
      h('p', { class: 'small', text: T.noteImpression })
    ]));

    var feuilles = h('div', { class: 'feuilles', id: 'rapport-feuilles' }, [
      couverture(d, ref),
      synthese(d, ref, syn, plan, ex),
      planAction(d, ref, plan),
      annexeA(d, ref),
      annexeB(d, ref, syn),
      annexeCD(d, ref)
    ]);
    container.appendChild(feuilles);
    container.appendChild(h('div', { class: 'r-pied-print', 'aria-hidden': 'true' }, [h('span', { class: 'r-pied-texte', text: p.texte }), ' · ', h('span', { class: 'r-pied-version', text: p.version })]));
    container.appendChild(h('div', { class: 'secondary r-ecran-seul' }, [U.mentionConseil()]));
    pagePied(container, p.texte + ' · ' + p.version);
  }

  /** Pied de page répété sur chaque page imprimée, dans les marges de page (@page) : texte selon le mode, version du dossier, numéro de page.
   *  Sans prise en charge des marges de page, le pied fixe de repli (sans numéro de page) prend le relais. */
  function pagePied(conteneur, texte) {
    var marges = typeof root.CSSMarginRule !== 'undefined';
    conteneur.classList.toggle('pied-repli', !marges);
    var style = root.document.getElementById('rapport-pied-style');
    if (!marges) { if (style && style.parentNode) style.parentNode.removeChild(style); return; }
    if (!style) {
      style = root.document.createElement('style');
      style.id = 'rapport-pied-style';
      root.document.head.appendChild(style);
    }
    // Texte constant du pied de page : guillemets, barres obliques inverses et retours à la ligne sont remplacés par des espaces.
    var echappe = String(texte).split(String.fromCharCode(34)).join(' ').split(String.fromCharCode(92)).join(' ').split(String.fromCharCode(10)).join(' ');
    var police = 'font: 8pt "Segoe UI", system-ui, Arial, sans-serif; color: #111111; vertical-align: top; padding-top: 3mm;';
    style.textContent = '@page { @bottom-left { content: "' + echappe + '"; ' + police + ' width: 80%; text-align: left; border-top: .3mm solid #193D36; margin-top: 2mm; }' +
      ' @bottom-right { content: "Page " counter(page) " sur " counter(pages); ' + police + ' width: 20%; text-align: right; } }';
  }

  function imprimer() {
    try { root.print(); } catch (e) { U.annoncer('L\'impression n\'est pas disponible dans ce navigateur.'); }
  }

  /** Oublie la racine et la saisie locale du nom (effacement de la session). */
  function reinitialiser() { racine = null; nomLocal = null; }

  E.views.report = { render: render, majNom: majNom, imprimer: imprimer, reinitialiser: reinitialiser };
})(typeof self !== 'undefined' ? self : this);
