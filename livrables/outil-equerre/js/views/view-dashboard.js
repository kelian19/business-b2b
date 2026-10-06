/* Équerre : étape 1, tableau de bord de direction. Tout est calculé par EquerreLogic (via les dérivés) : cette vue ne contient
 * aucune règle de calcul. Toute estimation est étiquetée « estimation » ; aucun gain, aucune promesse de conformité. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var S = E.ui.store;
  var Der = E.ui.derived;
  var L = root.EquerreLogic;
  var Org = E.ui.organisationForm;
  var Ch = E.ui.charts;
  var IO = E.ui.io;

  var etat = { gen: -1, prevIndice: null, infos: {}, refs: {}, trace: null };

  var STATUT_ETAPE = { fait: 'Fait', en_cours: 'En cours', a_faire: 'À faire' };
  var ICONE_PRIO = { P1: 'alerte', P2: 'horloge', P3: 'calendrier' };
  var SOURCE = { 'fait verifie': 'Obligation vérifiée', 'bonne pratique': 'Bonne pratique' };

  /** Carte du tableau de bord. aideCle : clé d'une aide contextuelle (bouton « ? » à côté du titre, panneau non modal sous le titre). */
  function carte(titre, id, classe, enfants, tete, aideCle) {
    var aide = aideCle ? E.ui.aide.bouton(aideCle) : null;
    return h('section', { class: 'card dash-card' + (classe ? ' ' + classe : ''), 'aria-labelledby': id }, [
      h('div', { class: 'dash-tete' }, [h('div', { class: 'titre-aide' }, [h('h3', { id: id, text: titre }), aide ? aide.btn : null]), tete || null]),
      aide ? aide.panneau : null,
      enfants
    ]);
  }

  function modeTexte(d) { return d.mode === 'demo' ? 'de la démo' : 'de l\'outil'; }

  function defiler(el) {
    if (!el) return;
    try { el.scrollIntoView({ behavior: U.mediaReduit() ? 'auto' : 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(); }
    var f = el.querySelector('input, select, button, [tabindex="0"]');
    if (f) { try { f.focus({ preventScroll: true }); } catch (e2) { f.focus(); } }
  }

  /* ---------- En-tête ---------- */

  function entete(d, ref) {
    var champ = h('input', { type: 'date', id: 'ref-date-dash', class: 'champ', value: ref, 'data-fk': 'ref-date-dash' });
    champ.addEventListener('change', function () {
      var v = L.parseDate(champ.value);
      if (v) S.commit('setRefDate', { iso: v }); else champ.value = Der.refDate();
    });
    return h('div', { class: 'panel-top dash-top' }, [
      h('div', null, [
        h('h2', { text: 'Tableau de bord de direction' }),
        h('p', { class: 'dash-sous', text: 'Situation au ' + U.fmtDate(ref) + ' · ' + d.entreprise.nom })
      ]),
      h('div', { class: 'dash-top-d' }, [
        h('label', { class: 'date-field', for: 'ref-date-dash' }, ['Date de référence', champ]),
        h('p', { class: 'source' + (d.mode === 'client' ? ' own' : ''), text: d.mode === 'demo' ? 'Source : données fictives de démonstration' : 'Source : votre dossier' })
      ])
    ]);
  }

  /* ---------- Rangée 1 : indice, compte à rebours, part du CA à risque ---------- */

  function carteIndice(syn, d) {
    var ind = syn.indice;
    var aria = 'Indice de préparation : ' + ind.indice + ' sur 100, estimation' + (ind.partiel ? ', indice partiel' : '');
    var g = Ch.jauge({ valeur: ind.indice, precedent: etat.prevIndice, aria: aria });
    var minis = h('ul', { class: 'minis', role: 'list' }, ind.composantes.map(function (c) {
      return h('li', { class: 'mini' }, [
        h('span', { class: 'mini-l', text: c.label }),
        h('span', { class: 'mini-v', text: c.evalue ? String(c.valeur) : 'non évalué' }),
        h('span', { class: 'mini-piste', 'aria-hidden': 'true' }, [h('span', { class: 'mini-b', style: 'width:' + (c.evalue ? c.valeur : 0) + '%' })])
      ]);
    }));
    return carte('Indice de préparation', 'dash-indice-t', 'dash-r1-c', [
      g.el,
      h('p', { class: 'gauge-cap' }, [
        'Estimation ' + modeTexte(d) + ', pas une note officielle',
        ind.partiel ? h('span', { class: 'chip-partiel', text: 'indice partiel' }) : null
      ]),
      minis
    ], null, 'indice');
  }

  function carteCompte(ref) {
    var c = L.compteARebours(ref);
    var grand;
    var sous;
    if (c.phase === 'avant_emission') {
      grand = h('p', { class: 'cdr-n', text: U.fmtJours(c.joursAvantEmission) });
      sous = 'avant l\'obligation d\'émettre vos factures sous forme électronique (1er septembre 2027, PME, TPE et micro-entreprises)';
    } else if (c.phase === 'echeance_atteinte') {
      grand = h('p', { class: 'cdr-n', text: U.fmtJours(0) });
      sous = 'Échéance atteinte aujourd\'hui : l\'émission sous forme électronique est obligatoire à cette date pour les PME, TPE et micro-entreprises (1er septembre 2027).';
    } else if (c.phase === 'echeance_depassee') {
      grand = h('p', { class: 'cdr-t', text: 'Échéance dépassée de ' + U.fmtJours(c.joursDepassement) });
      sous = 'L\'émission sous forme électronique est obligatoire depuis le 1er septembre 2027 pour les PME, TPE et micro-entreprises.';
    } else {
      grand = h('p', { class: 'cdr-t', text: 'La réception sera obligatoire dans ' + U.fmtJours(c.joursAvantReception) });
      sous = 'L\'émission sera ensuite obligatoire pour les PME, TPE et micro-entreprises le 1er septembre 2027 (dans ' + U.fmtJours(c.joursAvantEmission) + ').';
    }
    var sec = c.phase === 'avant_reception' ? null
      : 'Réception obligatoire depuis le 1er septembre 2026 : ' + (c.joursDepuisReception === 0 ? 'depuis aujourd\'hui' : 'il y a ' + U.fmtJours(c.joursDepuisReception));
    return carte('Compte à rebours', 'dash-cdr-t', 'dash-r1-c', [
      grand, h('p', { class: 'cdr-s', text: sous }), sec ? h('p', { class: 'cdr-sec small', text: sec }) : null
    ]);
  }

  function causeVide(d) {
    if (!d.donnees.factures) return 'facture';
    if (!d.donnees.tiers) return 'tiers';
    return 'noms';
  }

  var MESSAGES_VIDE = {
    facture: 'Part du CA à risque non calculable : chargez aussi un export de factures dans l\'étape 4.',
    tiers: 'Part du CA à risque non calculable : chargez aussi un fichier tiers dans l\'étape 2.',
    noms: 'Part du CA à risque non calculable : aucun client de l\'export n\'a pu être rapproché d\'une fiche du fichier tiers (vérifiez les noms ou ajoutez la colonne siren_client).'
  };

  function cartePartCa(syn, d) {
    var pc = syn.partCa;
    if (!pc || !pc.calculable) {
      return carte('Part du CA à risque', 'dash-ca-t', 'dash-r1-c', [h('p', { class: 'vide-bloc' }, [U.icon('info'), h('span', { text: MESSAGES_VIDE[causeVide(d)] })])]);
    }
    return carte('Part du CA à risque', 'dash-ca-t', 'dash-r1-c', [
      h('p', { class: 'ca-n' }, [U.icon('croix-cercle'), h('span', { text: U.fmtPct(pc.bloquant.part, 1) })]),
      h('p', { class: 'cdr-s', text: 'du CA HT des 12 derniers mois est facturé à des clients dont la fiche bloquerait une facture électronique (SIREN manquant ou invalide)' }),
      h('p', { class: 'cdr-sec small', text: U.fmtPct(pc.aCorriger.part, 1) + ' supplémentaires : fiches à corriger (TVA, adresse...)' }),
      h('p', { class: 'cdr-sec small', text: 'Période : ' + Der.fenetre12Texte() + '.' })
    ]);
  }

  /* ---------- Rangée 2 : frise des jalons ---------- */

  function noeudIcone(statut) {
    return h('span', { class: 'tl-node tl-' + statut, 'aria-hidden': 'true' }, [statut === 'fait' ? U.icon('check') : statut === 'en_cours' ? U.icon('horloge') : null]);
  }

  function frise(syn, ref) {
    var jal = L.jalons(ref);
    var recu = jal.joursDepuisReception >= 0;
    var emisPasse = jal.joursDepuisReception > jal.totalJours;
    var emisAtteint = jal.joursDepuisReception === jal.totalJours;
    var reg1 = h('li', { class: 'tl-item tl-reg ' + (recu ? 'passe' : 'avenir') }, [
      h('span', { class: 'tl-node ' + (recu ? 'tl-fait' : 'tl-reg-av'), 'aria-hidden': 'true' }, [recu ? U.icon('check') : U.icon('calendrier')]),
      h('strong', { class: 'tl-date', text: U.fmtDate(jal.dateReception) }),
      h('span', { class: 'tl-nom', text: 'Réception obligatoire' }),
      h('span', { class: 'tl-tag', text: recu ? 'Passé' : 'À venir' })
    ]);
    var reg2 = h('li', { class: 'tl-item tl-reg avenir' }, [
      h('span', { class: 'tl-node tl-reg-av', 'aria-hidden': 'true' }, [U.icon('calendrier')]),
      h('strong', { class: 'tl-date', text: U.fmtDate(jal.dateEmission) }),
      h('span', { class: 'tl-nom', text: 'Émission obligatoire (PME, TPE, micro-entreprises)' }),
      h('span', { class: 'tl-tag', text: emisPasse ? 'Dépassée' : emisAtteint ? 'Atteinte' : 'À venir' })
    ]);
    var steps = syn.etapes.map(function (e) {
      var lien;
      if (e.id === 'fichier') lien = h('a', { class: 'tl-titre', href: '#tiers', text: e.titre });
      else if (e.id === 'modeles') lien = h('a', { class: 'tl-titre', href: '#mentions', text: e.titre });
      else {
        lien = h('button', { type: 'button', class: 'tl-titre tl-lien', text: e.titre, onclick: function () {
          defiler(root.document.getElementById('plan-row-' + e.id) || root.document.getElementById('org-' + e.id));
        } });
      }
      return h('li', { class: 'tl-item tl-step' }, [
        noeudIcone(e.statut), lien,
        h('span', { class: 'tl-statut', text: STATUT_ETAPE[e.statut] }),
        e.cible ? h('span', { class: 'tl-cible small', text: 'cible interne : ' + U.fmtDate(e.cible) }) : null
      ]);
    });
    var today = h('li', { class: 'tl-today', style: '--p:' + jal.position.toFixed(4) }, [h('span', { class: 'tl-flag', text: 'Aujourd\'hui' })]);
    var liste = [reg1].concat(steps, [reg2]);
    if (jal.avant) liste.unshift(today);
    else if (jal.apres) liste.push(today);
    else liste.splice(1, 0, today);
    return h('section', { class: 'card timeline', 'aria-labelledby': 'dash-frise-t' }, [
      h('div', { class: 'dash-tete' }, [
        h('h3', { id: 'dash-frise-t', text: 'Frise des jalons' }),
        h('p', { class: 'small tl-echelle', text: 'Échelle non respectée entre les jalons' })
      ]),
      h('ol', { class: 'tl-list' }, liste),
      h('p', { class: 'small tl-note', text: 'Ordre conseillé, sans échéance réglementaire' }),
      U.mentionConseil()
    ]);
  }

  /* ---------- Rangée 3 : composition de l'indice et questions d'organisation ---------- */

  function phraseCalcul(ind) {
    var termes = ind.termes.map(function (t) { return t.poidsPct + U.NBSP + '% × ' + t.valeur; }).join(' + ');
    if (ind.partiel) return 'Indice partiel = (' + termes + ') ÷ ' + ind.poidsEvaluesPct + U.NBSP + '% = ' + ind.indice;
    return 'Indice = ' + termes + ' = ' + ind.indice;
  }

  function boutonInfo(c) {
    var id = 'info-' + c.id;
    var ouvert = !!etat.infos[c.id];
    var panneau = h('p', { id: id, class: 'info-panel small', role: 'region', 'aria-label': 'Règle de calcul : ' + c.label, hidden: !ouvert, text: L.REGLES_COMPOSANTES[c.id] });
    var btn = h('button', { type: 'button', class: 'info-btn', 'aria-expanded': ouvert ? 'true' : 'false', 'aria-controls': id, 'aria-label': 'Règle de calcul : ' + c.label, 'data-fk': 'info-btn-' + c.id, text: '?' });
    btn.addEventListener('click', function () {
      etat.infos[c.id] = !etat.infos[c.id];
      btn.setAttribute('aria-expanded', etat.infos[c.id] ? 'true' : 'false');
      panneau.hidden = !etat.infos[c.id];
    });
    return [btn, panneau];
  }

  function carteComposition(syn, d) {
    var ind = syn.indice;
    var lignes = ind.composantes.map(function (c) {
      return h('tr', null, [
        h('th', { scope: 'row' }, [h('span', { class: 'comp-nom', text: c.label })].concat(boutonInfo(c))),
        h('td', { class: 'num', text: c.poidsPct + U.NBSP + '%' }),
        h('td', { class: 'num comp-val' }, [
          h('span', { text: c.evalue ? String(c.valeur) : 'non évalué' }),
          c.evalue ? h('span', { class: 'mini-piste', 'aria-hidden': 'true' }, [h('span', { class: 'mini-b', style: 'width:' + c.valeur + '%' })]) : null
        ]),
        h('td', { class: 'comp-det', text: c.detail })
      ]);
    });
    var table = h('table', { class: 'table comp-table' }, [
      h('caption', { class: 'visually-hidden', text: 'Composition de l\'indice de préparation (estimation)' }),
      h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Composante' }), h('th', { scope: 'col', class: 'num', text: 'Poids' }), h('th', { scope: 'col', class: 'num', text: 'Valeur sur 100' }), h('th', { scope: 'col', text: 'Détail' })])]),
      h('tbody', null, lignes),
      h('tfoot', null, [
        h('tr', null, [h('th', { scope: 'row', text: 'Total des poids' }), h('td', { class: 'num', text: ind.poidsTotalPct + U.NBSP + '%' }), h('td', { class: 'num' }), h('td', { class: 'small', text: ind.partiel ? 'Poids des composantes évaluées : ' + ind.poidsEvaluesPct + U.NBSP + '%' : '' })]),
        h('tr', null, [h('th', { scope: 'row', text: 'Indice de préparation (estimation)' }), h('td'), h('td', { class: 'num comp-indice', text: String(ind.indice) }), h('td', { class: 'small', text: ind.partiel ? 'indice partiel' : '' })])
      ])
    ]);
    var gauche = h('div', { class: 'comp-g' }, [
      h('div', { class: 'table-wrap' }, [table]),
      h('p', { class: 'formule', role: 'status', text: phraseCalcul(ind) }),
      h('p', { class: 'small', text: 'Pondération conventionnelle ' + modeTexte(d) + ' (hypothèse), pas une norme ; l\'indice est une estimation.' })
    ]);
    var droite = h('div', { class: 'comp-d' }, [
      h('h4', { text: 'Et si… ? Modifiez vos réponses' }),
      Org.creer({ libelleReinit: 'Réinitialiser le scénario' }).el
    ]);
    return carte('Comment se compose votre indice', 'dash-compo-t', 'dash-r3', h('div', { class: 'comp-grille' }, [gauche, droite]));
  }

  /* ---------- Rangée 4 : exposition théorique et clients classés par impact ---------- */

  function carteExposition(d) {
    var ex = Der.exposition();
    var calc = ex.calcul;
    var err = h('p', { class: 'alert alert-champ', role: 'alert', hidden: true });
    var saisieValide = ex.n === null ? '' : String(ex.n);
    var champ = h('input', { type: 'text', inputmode: 'numeric', id: 'expo-input', class: 'champ champ-nb', 'data-fk': 'expo-input', autocomplete: 'off', value: saisieValide, 'aria-describedby': 'expo-aide' });
    champ.addEventListener('input', function () {
      var v = L.validerNbFactures(champ.value);
      if (!v.ok) { U.showMsg(err, v.message); champ.setAttribute('aria-invalid', 'true'); return; }
      U.showMsg(err, '');
      champ.removeAttribute('aria-invalid');
      if (v.valeur !== Der.exposition().n) S.commit('setHypothese', { nbFactures12m: v.valeur });
    });
    champ.addEventListener('change', function () {
      var v = L.validerNbFactures(champ.value);
      if (!v.ok) { var cur = Der.exposition().n; champ.value = cur === null ? '' : String(cur); champ.removeAttribute('aria-invalid'); }
    });
    var retour = U.bouton('Revenir à la valeur déduite de l\'export', {
      classe: 'btn-petit', id: 'expo-reset', desactive: ex.saisi === null || ex.deduit === null,
      onclick: function () { S.commit('setHypothese', { nbFactures12m: null }); }
    });
    retour.setAttribute('data-fk', 'expo-reset');
    var origine = ex.saisi !== null ? 'saisi par vous' : ex.deduit !== null ? 'déduit de l\'export, modifiable' : 'à saisir';
    var corps = [];
    if (calc) {
      corps.push(h('div', { class: 'formule-lignes' }, [
        h('p', { class: 'fl-1' }, [
          h('span', { class: 'fl-nb', text: U.fmtNum(calc.nbFactures) + ' ' + (calc.nbFactures > 1 ? 'factures' : 'facture') + ' sur 12 mois' }),
          h('span', { class: 'fl-op', text: ' × ' + U.fmtEur(calc.unitaire) + ' = ' + U.fmtEur(calc.brut) })
        ]),
        h('p', { class: 'fl-2 small', text: 'Plafond : ' + U.fmtEur(calc.plafond) + ' par année civile (article 1737 du CGI)' }),
        ex.saisi === null && ex.deduit !== null ? h('p', { class: 'fl-2 small', text: 'Factures émises ' + Der.fenetre12Texte() + '.' }) : null
      ]));
      corps.push(h('p', { class: 'expo-n' }, [h('span', { text: U.fmtEur(calc.plafonne) }), h('span', { class: 'expo-l', text: calc.plafondAtteint ? 'plafond atteint' : 'plafond non atteint' })]));
    } else {
      corps.push(h('p', { class: 'vide-bloc' }, [U.icon('info'), h('span', { text: 'Chargez un export de factures dans l\'étape 4 pour déduire le nombre de factures sur 12 mois, ou saisissez-le ci-dessous.' })]));
    }
    corps.push(h('div', { class: 'expo-saisie' }, [
      h('label', { for: 'expo-input', class: 'expo-lab', text: 'Factures sur 12 mois' }),
      champ,
      h('span', { id: 'expo-aide', class: 'small', text: '(' + origine + ')' })
    ]));
    corps.push(err);
    corps.push(h('div', { class: 'toolbar' }, [retour]));
    corps.push(h('p', { class: 'expo-fixe small', text: 'Plafond théorique si les factures restent non électroniques après le 1er septembre 2027 ; estimation, ne constitue pas un conseil fiscal.' }));
    var c = carte('Exposition théorique aux amendes', 'dash-expo-t', 'dash-expo', corps, null, 'exposition');
    return c;
  }

  function liensFiche(ligne, nom) {
    var a = h('a', { class: 'lien-fiche', href: '#tiers', 'aria-label': 'Voir la fiche de ' + nom }, [h('span', { text: 'voir la fiche' }), U.icon('fleche')]);
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (E.views.tiers && E.views.tiers.ouvrirFiche) E.views.tiers.ouvrirFiche(ligne);
    });
    return a;
  }

  function carteImpact(syn, d) {
    var rap = syn.rapprochement;
    var pc = syn.partCa;
    var corps = [];
    if (!d.donnees.factures) corps.push(h('p', { class: 'vide-bloc' }, [U.icon('info'), h('span', { text: 'Chargez un export de factures pour pondérer par le chiffre d\'affaires.' })]));
    else if (!d.donnees.tiers) corps.push(h('p', { class: 'vide-bloc' }, [U.icon('info'), h('span', { text: 'Chargez un fichier tiers (étape 2) pour classer les clients par impact.' })]));
    else if (!pc || !pc.calculable) corps.push(h('p', { class: 'vide-bloc' }, [U.icon('info'), h('span', { text: MESSAGES_VIDE.noms })]));
    else {
      var segs = [
        { id: 'bloquant', valeur: pc.bloquant.part, motif: 'plein-rouge', legende: 'Bloquant ' + U.fmtPct(pc.bloquant.part, 1) },
        { id: 'a_corriger', valeur: pc.aCorriger.part, motif: 'hach', legende: 'À corriger ' + U.fmtPct(pc.aCorriger.part, 1) },
        { id: 'ok', valeur: pc.ok.part, motif: 'points', legende: 'Sans anomalie ' + U.fmtPct(pc.ok.part, 1) }
      ];
      var horsRisque = pc.nonRapproche.part + pc.homonymes.part;
      if (horsRisque > 0) segs.push({ id: 'hors', valeur: horsRisque, motif: 'croix', legende: 'Non rapproché ' + U.fmtPct(horsRisque, 1) });
      var aria = 'Répartition du chiffre d\'affaires HT des 12 derniers mois : ' + segs.map(function (x) { return x.legende.charAt(0).toLowerCase() + x.legende.slice(1); }).join(', ');
      corps.push(Ch.barreEmpilee({ id: 'impact', segments: segs, ariaLabel: aria }).el);
      var liste = L.prioriteParImpact(rap);
      if (!liste.length) {
        corps.push(h('p', { class: 'vide-bloc' }, [U.icon('check-cercle'), h('span', { text: 'Aucun client de l\'export n\'a de fiche bloquante : bonne nouvelle pour ce fichier, hors vérification au registre.' })]));
      } else {
        corps.push(h('div', { class: 'table-wrap' }, [h('table', { class: 'table impact-table' }, [
          h('caption', { class: 'visually-hidden', text: 'Clients dont la fiche pose un problème, classés par impact' }),
          h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Client' }), h('th', { scope: 'col', class: 'num', text: 'CA HT 12 mois' }), h('th', { scope: 'col', text: 'Problème' }), h('th', { scope: 'col', text: 'Action' })])]),
          h('tbody', null, liste.map(function (r) {
            return h('tr', { 'data-ligne': String(r.ligne) }, [
              h('th', { scope: 'row', class: 'imp-nom', text: r.nom }),
              h('td', { class: 'num' }, [h('span', { text: U.fmtEur(r.ca) }), h('span', { class: 'imp-part small', text: U.fmtPct(r.part, 1) })]),
              h('td', null, [U.statusBadge(r.statut), h('span', { class: 'imp-pb', text: r.libelles.join(', ') })]),
              h('td', null, [liensFiche(r.ligne, r.nom)])
            ]);
          }))
        ])]));
      }
      if (pc.homonymes.nbClients > 0) corps.push(h('p', { class: 'small', text: U.pluriel(pc.homonymes.nbClients, 'client non rapproché (homonyme)', 'clients non rapprochés (homonymes)') + ', exclus du calcul' }));
      if (pc.nonRapproche.nbClients > 0) corps.push(h('p', { class: 'small', text: U.pluriel(pc.nonRapproche.nbClients, 'client absent du fichier tiers', 'clients absents du fichier tiers') + ', exclus du calcul' }));
      var co = L.CONST.COEF_IMPACT;
      corps.push(h('p', { class: 'small', text: 'Le CA ne concerne que les clients ; les fournisseurs n\'ont pas de CA. Pondération par impact : bloquant ×' + U.fmtNum(co.bloquant, 0) + ', à corriger ×' + U.fmtNum(co.aCorriger, 1) + ' (hypothèse).' }));
    }
    return carte('Par où commencer : clients classés par impact', 'dash-impact-t', 'dash-impact', corps);
  }

  /* ---------- Rangée 5 : plan d'action ---------- */

  function texteResumePlan(r) {
    return U.pluriel(r.nb, 'action', 'actions') + ' · ' + U.pluriel(r.faites, 'faite', 'faites') + ' · effort total estimé : ' + r.effortLabel + ' (estimation)';
  }

  function lignePlan(t) {
    var idc = 'plan-' + t.id;
    var resp = h('input', {
      type: 'text', class: 'champ champ-plan', id: idc + '-resp', 'data-fk': idc + '-resp', maxlength: String(L.CONST.MAX_RESPONSABLE), list: 'plan-roles',
      value: t.responsable, placeholder: 'ex. ' + t.parDefautResponsable, 'aria-label': 'Responsable pour : ' + t.titre, autocomplete: 'off'
    });
    resp.addEventListener('change', function () {
      var r = S.commit('majPlan', { id: t.id, responsable: resp.value });
      if (r.refuse) { U.annoncer(r.message); resp.value = Der.plan().taches.filter(function (x) { return x.id === t.id; })[0].responsable; }
    });
    var icone = h('span', { class: 'plan-st-ic', 'aria-hidden': 'true' });
    function majIcone(v) { U.clear(icone); if (v === 'fait') icone.appendChild(U.icon('check-cercle')); else if (v === 'en_cours') icone.appendChild(U.icon('horloge')); }
    majIcone(t.statut);
    var sel = h('select', { class: 'champ champ-plan', id: idc + '-st', 'data-fk': idc + '-st', 'aria-label': 'Statut de : ' + t.titre }, L.STATUTS_PLAN.map(function (v) {
      return h('option', { value: v, selected: v === t.statut ? true : null, text: L.STATUTS_PLAN_LIBELLES[v] });
    }));
    sel.addEventListener('change', function () { majIcone(sel.value); S.commit('majPlan', { id: t.id, statut: sel.value }); });
    var ech = h('input', { type: 'date', class: 'champ champ-plan', id: idc + '-ech', 'data-fk': idc + '-ech', value: t.echeance || '', 'aria-label': 'Échéance de : ' + t.titre });
    ech.addEventListener('change', function () {
      var r = S.commit('majPlan', { id: t.id, echeance: ech.value || null });
      if (r.refuse) { U.annoncer(r.message); ech.value = ''; }
    });
    return h('tr', { id: 'plan-row-' + t.id, class: 'plan-row' }, [
      h('td', { class: 'pl-n num', 'data-label': '#', text: String(t.ordre) }),
      h('td', { 'data-label': 'Priorité' }, [h('span', { class: 'prio prio-' + t.priorite }, [U.icon(ICONE_PRIO[t.priorite]), h('span', { text: t.priorite + ' ' + L.PRIORITES[t.priorite] })])]),
      h('th', { scope: 'row', class: 'pl-act', 'data-label': 'Action', text: t.titre }),
      h('td', { class: 'pl-why', 'data-label': 'Pourquoi' }, [h('span', { text: t.pourquoi }), h('span', { class: 'src src-' + (t.sourcePourquoi === 'fait verifie' ? 'fv' : 'bp'), text: SOURCE[t.sourcePourquoi] })]),
      h('td', { class: 'pl-eff', 'data-label': 'Effort', text: t.effortLabel }),
      h('td', { 'data-label': 'Responsable' }, [resp]),
      h('td', { 'data-label': 'Statut' }, [h('span', { class: 'plan-st' }, [icone, sel])]),
      h('td', { 'data-label': 'Échéance' }, [ech])
    ]);
  }

  function cartePlan(d) {
    var pl = Der.plan();
    var corps = [];
    var resume = h('p', { class: 'plan-resume', role: 'status', text: texteResumePlan(pl.resume) });
    etat.refs.planResume = resume;
    if (!pl.taches.length) {
      corps.push(h('p', { class: 'vide-bloc' }, [U.icon('info'), h('span', { text: 'Aucune action à planifier d\'après ces données.' })]));
    } else {
      corps.push(resume);
      corps.push(h('datalist', { id: 'plan-roles' }, L.CONST.ROLES_PROPOSES.map(function (r) { return h('option', { value: r }); })));
      corps.push(h('div', { class: 'table-wrap plan-wrap' }, [h('table', { class: 'table plan-table' }, [
        h('caption', { class: 'visually-hidden', text: 'Plan d\'action généré à partir de vos données et de vos réponses' }),
        h('thead', null, [h('tr', null, ['#', 'Priorité', 'Action', 'Pourquoi', 'Effort', 'Responsable', 'Statut', 'Échéance'].map(function (x) { return h('th', { scope: 'col', text: x }); }))]),
        h('tbody', null, pl.taches.map(lignePlan))
      ])]));
      corps.push(h('div', { class: 'toolbar' }, [
        U.bouton('Exporter le plan (CSV)', { icone: 'telecharger', id: 'btn-export-plan', primaire: false, onclick: function () {
          IO.telechargerCsv('plan-action.csv', L.planToCsv(Der.synthese().plan, S.dossier().plan));
        } })
      ]));
    }
    corps.push(h('p', { class: 'small', text: 'Les statuts et responsables restent dans votre navigateur ; rien n\'est envoyé.' + (d.mode === 'client' ? ' Ils sont inclus dans le fichier du dossier que vous enregistrez.' : '') + ' L\'indice se calcule à partir des données et des réponses, pas des statuts. Les efforts sont des estimations à confirmer sur votre fichier.' }));
    corps.push(U.mentionConseil());
    return carte('Plan d\'action', 'dash-plan-t', 'dash-plan', corps, null, 'plan');
  }

  /* ---------- Rangée 6 : trésorerie et pilotage ---------- */

  function carteTresorerie(d) {
    var tr = Der.tresorerie();
    var corps = [];
    if (!tr) {
      corps.push(h('p', { class: 'vide-bloc' }, [U.icon('info'), h('span', { text: 'Aucun export de factures : chargez-le dans l\'étape 4 pour voir les encaissements attendus, les retards et les alertes.' })]));
      return carte('Trésorerie : encaissements attendus', 'dash-tres-t', 'dash-tres', corps);
    }
    var enc = tr.encaissements;
    var rap = tr.rapport;
    var gauche = [];
    if (enc.nbNonPayees === 0) {
      gauche.push(h('p', { class: 'vide-bloc' }, [U.icon('check-cercle'), h('span', { text: 'Aucune facture non payée à la date de référence' })]));
    } else {
      var box = h('div', { id: 'tres-chart', class: 'chart tres-chart' });
      etat.refs.tresBox = box;
      etat.refs.tresItems = enc.tranches.filter(function (t) { return t.visible; }).map(function (t) { return { id: t.id, label: t.label, valeur: t.total, nb: t.nb, alerte: t.id === 'echu' }; });
      gauche.push(box);
      gauche.push(h('p', { class: 'tres-total' }, [h('strong', { text: 'Encours non payé : ' + U.fmtEur(enc.total) + ' TTC' }), h('span', { class: 'small', text: ' (' + U.pluriel(enc.nbNonPayees, 'facture', 'factures') + ')' })]));
      if (enc.sansEcheance.nb > 0) {
        gauche.push(h('p', { class: 'small', text: U.pluriel(enc.sansEcheance.nb, 'facture sans échéance exclue', 'factures sans échéance exclues') + ' des tranches (' + U.fmtEur(enc.sansEcheance.total) + ' TTC, comprise' + (enc.sansEcheance.nb > 1 ? 's' : '') + ' dans l\'encours).' }));
      }
    }
    var conc = tr.concentration;
    var pilot = h('div', { class: 'pilot' }, [
      h('h4', { text: 'Pilotage' }),
      h('dl', { class: 'pilot-l' }, [
        h('div', { class: 'pilot-i' }, [h('dt', { text: 'Délai moyen de paiement' }), h('dd', { text: rap.delaiMoyenPaiement === null ? 'non disponible' : U.fmtJours(rap.delaiMoyenPaiement) })]),
        h('div', { class: 'pilot-i' }, [h('dt', { text: 'Part des 5 premiers clients' }), h('dd', null, [
          h('span', { text: U.fmtPct(conc.part, 0) + ' du CA HT' }),
          conc.elevee ? h('span', { class: 'chip-alerte' }, [U.icon('alerte'), h('span', { text: 'Concentration élevée' })]) : null,
          h('span', { class: 'small pilot-seuil', text: 'seuil : ' + U.fmtPct(conc.seuil, 0) + ' (hypothèse)' })
        ])]),
        h('div', { class: 'pilot-i' }, [h('dt', { text: 'Factures échues' }), h('dd', { text: rap.echues.nb + ', soit ' + U.fmtEur(rap.echues.total) })])
      ])
    ]);
    var al = tr.alertes;
    var items = [];
    if (al.echuesPlus60.nb > 0) {
      var cl = al.echuesPlus60.clients;
      var qui = cl.length === 1 ? ', toutes sur ' + cl[0] : ', sur ' + U.pluriel(cl.length, 'client', 'clients') + ' dont ' + cl[0];
      items.push(U.pluriel(al.echuesPlus60.nb, 'facture échue', 'factures échues') + ' depuis plus de 60 jours (' + U.fmtEur(al.echuesPlus60.total) + ')' + qui);
    }
    if (al.clientLePlusExpose) {
      items.push('Client le plus exposé : ' + al.clientLePlusExpose.nom + ', ' + U.fmtEur(al.clientLePlusExpose.encours) + ' TTC non payés (' + U.fmtPct(al.clientLePlusExpose.part, 1) + ' de l\'encours)');
    }
    var alertes = h('div', { class: 'alertes' }, [
      h('h4', { text: 'Alertes' }),
      items.length
        ? h('ul', { class: 'alertes-l', role: 'list' }, items.map(function (t) { return h('li', null, [U.icon('alerte'), h('span', { text: t })]); }))
        : h('p', { class: 'small', text: 'Aucune alerte à la date de référence.' })
    ]);
    corps.push(h('div', { class: 'tres-grille' }, [h('div', { class: 'tres-g' }, gauche), pilot]));
    corps.push(alertes);
    corps.push(h('a', { class: 'lien-etape', href: '#reporting' }, [h('span', { text: 'Voir le reporting détaillé' }), U.icon('fleche')]));
    return carte('Trésorerie : encaissements attendus', 'dash-tres-t', 'dash-tres', corps);
  }

  /* ---------- Rangée 7 : contenu du dossier ---------- */

  function carteDossier(d) {
    var nbModeles = d.mode === 'demo' ? 'de ' + d.modeles.length + ' de vos modèles de factures' : 'de vos modèles de factures (jusqu\'à ' + L.CONST.MAX_MODELES + ')';
    var puces = [
      ['tableau', 'Votre fichier tiers fiabilisé : SIREN, clés de TVA, doublons, adresses, vérification au registre'],
      ['document', 'Le contrôle ' + nbModeles + ' face aux 4 nouvelles mentions'],
      ['imprimante', 'Un rapport de préparation de direction, comme celui de l\'étape 5'],
      ['calendrier', 'Une mise à niveau optionnelle avant la bascule de septembre 2027']
    ];
    return h('section', { class: 'card dash-card dash-dossier', 'aria-labelledby': 'dash-dossier-t' }, [
      h('h3', { id: 'dash-dossier-t', text: 'Ce que comprend votre dossier' }),
      h('ul', { class: 'dossier-l', role: 'list' }, puces.map(function (p) { return h('li', null, [U.icon(p[0]), h('span', { text: p[1] })]); })),
      h('p', { class: 'small', text: d.mode === 'demo'
        ? 'Ce tableau de bord est une démonstration sur données fictives ; votre dossier est traité sur votre export, sans noms de contacts.'
        : 'Ce tableau de bord est calculé sur les fichiers de votre dossier, uniquement dans ce navigateur.' }),
      h('p', { class: 'au-dela', text: 'Au-delà : Le Décodeur cartographie vos tâches répétitives.' })
    ]);
  }

  /* ---------- Rendu ---------- */

  function render(container) {
    var s = S.state.session;
    if (etat.gen !== s.gen) { etat.gen = s.gen; etat.prevIndice = null; etat.infos = {}; }
    var d = S.dossier();
    var syn = Der.synthese();
    var ref = Der.refDate();
    U.clear(container);
    etat.refs = {};
    container.appendChild(entete(d, ref));
    container.appendChild(h('div', { class: 'dash-r1' }, [carteIndice(syn, d), carteCompte(ref), cartePartCa(syn, d)]));
    container.appendChild(frise(syn, ref));
    container.appendChild(carteComposition(syn, d));
    var ex = carteExposition(d);
    etat.refs.expo = ex;
    container.appendChild(h('div', { class: 'dash-r4' }, [ex, carteImpact(syn, d)]));
    container.appendChild(cartePlan(d));
    container.appendChild(carteTresorerie(d));
    container.appendChild(carteDossier(d));
    container.appendChild(h('div', { class: 'secondary' }, [U.mentionConseil()]));
    etat.prevIndice = syn.indice.indice;
    dessiner();
  }

  /** Dessine les graphiques qui dépendent de la largeur (appelé après le rendu, à l'activation et au redimensionnement). */
  function dessiner() {
    var b = etat.refs.tresBox;
    if (!b || !b.isConnected || !b.offsetParent) return;
    Ch.barresEncaissements(b, etat.refs.tresItems, { ariaLabel: 'Encaissements attendus par tranche d\'échéance, montants TTC' });
  }

  /** Mise à jour en place du plan (statut, responsable, échéance) : conserve le focus du clavier. */
  function majPlan() {
    if (!etat.refs.planResume || !etat.refs.planResume.isConnected) return;
    etat.refs.planResume.textContent = texteResumePlan(Der.plan().resume);
  }

  /** Mise à jour en place de la carte d'exposition (nombre de factures) : conserve le focus et la position du curseur. */
  function majExposition() {
    var vieux = etat.refs.expo;
    if (!vieux || !vieux.isConnected) return;
    var a = root.document.activeElement;
    var fk = a && a.getAttribute ? a.getAttribute('data-fk') : null;
    var pos = fk === 'expo-input' ? [a.selectionStart, a.selectionEnd] : null;
    var neuf = carteExposition(S.dossier());
    vieux.replaceWith(neuf);
    etat.refs.expo = neuf;
    if (fk && vieux.contains(a)) {
      var c = neuf.querySelector('[data-fk="' + fk + '"]');
      if (c && !c.disabled) {
        try { c.focus({ preventScroll: true }); } catch (e) { c.focus(); }
        if (pos && c.setSelectionRange) { try { c.setSelectionRange(pos[0], pos[1]); } catch (e2) { /* sans effet */ } }
      }
    }
  }

  /** Oublie les références au DOM et les valeurs précédentes (effacement de la session). */
  function reinitialiser() {
    etat.gen = -1; etat.prevIndice = null; etat.infos = {}; etat.refs = {}; etat.trace = null;
  }

  E.views.dashboard = { render: render, dessiner: dessiner, majPlan: majPlan, majExposition: majExposition, reinitialiser: reinitialiser };
})(typeof self !== 'undefined' ? self : this);
