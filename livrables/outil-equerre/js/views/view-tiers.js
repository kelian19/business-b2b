/* Équerre : étape 2, fichier clients et fournisseurs.
 * Qualité du fichier, répartition des anomalies (filtres), recherche et tri, tableau paginé, panneau de détail latéral
 * avec « valeur actuelle → correction proposée », décisions (accepter, refuser, modifier, annuler), exports.
 * Aucune règle métier ici : les propositions, les décisions et les exports viennent d'EquerreLogic. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var L = root.EquerreLogic;
  var S = E.ui.store;
  var Der = E.ui.derived;
  var IO = E.ui.io;
  var Wiz = E.ui.importWizard;
  var Pager = E.ui.pager;

  var etat = { cleDossier: '', cleGrid: '', filtre: 'toutes', recherche: '', tri: { cle: 'ligne', sens: 1 }, selection: null, focusFk: null,
    cleDonnees: '', lignes: null, liste: [], pageVers: null, edition: null, erreurs: {}, grid: null };
  var pager = null;
  var refs = {};

  var COLONNES = [
    { cle: 'ligne', libelle: 'Ligne', num: true },
    { cle: 'type', libelle: 'Type' },
    { cle: 'nom', libelle: 'Nom' },
    { cle: 'siren', libelle: 'SIREN' },
    { cle: 'anomalies', libelle: 'Anomalies' },
    { cle: 'ca', libelle: 'CA 12 mois', num: true }
  ];
  var LIBELLE_TRI = { ligne: 'Ligne', type: 'Type', nom: 'Nom', siren: 'SIREN', anomalies: 'Anomalies', ca: 'CA 12 mois' };

  /* ---------- État et données de la vue ---------- */

  function reinitialiserSiNouveau() {
    var s = S.state.session;
    var cd = s.gen + ':' + s.rev.tiers;
    if (etat.cleDossier !== cd) {
      etat = { cleDossier: cd, cleGrid: '', filtre: 'toutes', recherche: '', tri: { cle: 'ligne', sens: 1 }, selection: null, focusFk: null,
        cleDonnees: '', lignes: null, liste: [], pageVers: null, edition: null, erreurs: {}, grid: null };
    }
    var cg = cd + ':' + s.rev.registre;
    if (etat.cleGrid !== cg) { etat.cleGrid = cg; etat.grid = null; }
  }

  function normaliserTexte(v) {
    return L.stripAccents(String(v || '')).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /** Lignes de la vue : une par ligne du fichier d'origine, avec état effectif, propositions et CA. */
  function construire(t) {
    var s = S.state.session;
    var cle = [s.gen, s.rev.tiers, s.rev.registre, s.rev.corrections, s.rev.factures, s.rev.refDate].join(':');
    if (etat.cleDonnees === cle && etat.lignes) return etat.lignes;
    var eff = new Map();
    t.analysis.items.forEach(function (it) { eff.set(it.ligne, it); });
    var exclues = new Set(t.exclues);
    var ca = Der.caTiers();
    var corr = S.dossier().corrections;
    var lignes = t.origine.items.map(function (it) {
      var r = it.row;
      var e = eff.get(it.ligne);
      var props = t.propositions.parLigne.get(it.ligne) || [];
      var nom = normaliserTexte(r.nom);
      var chiffres = (L.cleanId(r.siren) + ' ' + L.cleanId(r.siret) + ' ' + L.cleanId(r.tva)).toLowerCase();
      var appliquees = 0;
      props.forEach(function (p) { var c = corr[p.cle]; if (c && c.decision !== 'refusee') appliquees++; });
      return {
        ligne: it.ligne, row: r, origine: it, eff: e || null, exclue: exclues.has(it.ligne),
        anomalies: e ? e.anomalies : [], props: props, ca: ca.get(it.ligne) || null, appliquees: appliquees,
        registre: it.registre || null, nomN: nom,
        texte: nom + ' ' + normaliserTexte(r.ville) + ' ' + normaliserTexte(r.code_postal) + ' ' + normaliserTexte(r.type) + ' ' + chiffres,
        chiffres: chiffres
      };
    });
    etat.cleDonnees = cle;
    etat.lignes = lignes;
    return lignes;
  }

  function nbAnomalies(lv) { var n = 0; lv.anomalies.forEach(function (a) { if (a.severity === 'anomalie') n++; }); return n; }

  function correspond(lv, q) {
    if (!q) return true;
    var qd = q.replace(/[\s.\-]/g, '');
    if (/^\d+$/.test(qd)) return lv.chiffres.replace(/[\s.\-]/g, '').indexOf(qd) >= 0 || lv.texte.indexOf(q) >= 0;
    var jetons = q.split(' ');
    for (var i = 0; i < jetons.length; i++) { if (lv.texte.indexOf(jetons[i]) < 0) return false; }
    return true;
  }

  function filtrerTrier() {
    var q = normaliserTexte(etat.recherche);
    var f = etat.filtre;
    var out = [];
    for (var i = 0; i < etat.lignes.length; i++) {
      var lv = etat.lignes[i];
      if (f === 'avec') { if (!nbAnomalies(lv)) continue; }
      else if (f !== 'toutes') { if (!lv.anomalies.some(function (a) { return a.code === f; })) continue; }
      if (!correspond(lv, q)) continue;
      out.push(lv);
    }
    var t = etat.tri;
    var sens = t.sens;
    out.sort(function (a, b) {
      var c = 0;
      if (t.cle === 'ligne') c = a.ligne - b.ligne;
      else if (t.cle === 'nom') c = a.nomN < b.nomN ? -1 : a.nomN > b.nomN ? 1 : 0;
      else if (t.cle === 'type') { var ta = a.row.type; var tb = b.row.type; c = ta < tb ? -1 : ta > tb ? 1 : 0; }
      else if (t.cle === 'siren') { var sa = L.cleanId(a.row.siren); var sb = L.cleanId(b.row.siren); c = sa < sb ? -1 : sa > sb ? 1 : 0; }
      else if (t.cle === 'anomalies') c = nbAnomalies(a) - nbAnomalies(b);
      else if (t.cle === 'ca') {
        if (!a.ca && !b.ca) c = 0; else if (!a.ca) return 1; else if (!b.ca) return -1; else c = a.ca.ca - b.ca.ca;
      }
      return c !== 0 ? c * sens : a.ligne - b.ligne;
    });
    return out;
  }

  /* ---------- Rendu général ---------- */

  function render(container) {
    reinitialiserSiNouveau();
    U.clear(container);
    refs = {};
    var d = S.dossier();
    var t = Der.tiers();
    var table = d.donnees.tiers;

    var source = d.mode === 'demo' ? 'Source : données fictives de démonstration'
      : (table ? 'Source : votre fichier (' + table.source.nomFichier + ')' : 'Source : aucun fichier importé');
    container.appendChild(h('div', { class: 'panel-top' }, [
      h('div', null, [
        h('h2', { text: 'Fichier clients et fournisseurs' }),
        h('p', { class: 'lead secondary', text: 'Une ligne par client ou fournisseur : l\'outil repère ce qui bloquerait ou fausserait vos factures (SIREN, TVA, adresses, doublons), propose des corrections et vous laisse décider ligne par ligne.' })
      ]),
      h('p', { class: 'source' + (d.mode === 'client' ? ' own' : ''), text: source })
    ]));

    if (!etat.grid) {
      etat.grid = h('div', { class: 'import-grid secondary' }, d.mode === 'demo'
        ? [Wiz.carte('tiers').el]
        : [Wiz.carte('tiers').el, Wiz.carte('registre').el]);
    }
    if (!t) container.appendChild(etat.grid);

    if (!t) {
      container.appendChild(h('div', { class: 'card vide' }, [
        h('p', { text: 'Aucun fichier tiers importé.' }),
        h('p', { class: 'small', text: 'Importez votre fichier clients et fournisseurs ci-dessus : l\'analyse apparaît ici.' })
      ]));
      return;
    }

    construire(t);
    var a = t.analysis;

    container.appendChild(carteQualite(t, a));
    container.appendChild(carteDecisions(t, d));
    container.appendChild(barreRecherche());

    refs.layout = h('div', { class: 'tt-layout' });
    refs.main = h('div', { class: 'tt-main' });
    refs.layout.appendChild(refs.main);
    container.appendChild(refs.layout);

    refs.corps = h('tbody', { id: 'tiers-body' });
    var avecRegistre = !!t.registre;
    refs.entetes = {};
    var ths = COLONNES.map(function (c) {
      var btn = h('button', { type: 'button', class: 'th-tri', 'data-fk': 'tri-' + c.cle, onclick: function () { trierPar(c.cle); } }, [
        h('span', { text: c.libelle }), U.icon('fleche', 'ic-tri')
      ]);
      var th = h('th', { scope: 'col', class: ((c.num ? 'num' : '') + (c.cle === 'type' || c.cle === 'ca' ? ' col-sec' : '')).trim() || null, 'aria-sort': 'none' }, [btn]);
      refs.entetes[c.cle] = th;
      return th;
    });
    if (avecRegistre) {
      ths.push(h('th', { scope: 'col', text: 'État au registre' }));
      ths.push(h('th', { scope: 'col', class: 'col-sec', text: 'Vérifié le' }));
    }
    ths.push(h('th', { scope: 'col' }, [h('span', { class: 'visually-hidden', text: 'Détail' })]));
    refs.table = h('table', { class: 'table tt-table', id: 'tiers-table' }, [
      h('caption', { class: 'visually-hidden', text: 'Lignes du fichier clients et fournisseurs avec leurs anomalies' }),
      h('thead', null, [h('tr', null, ths)]),
      refs.corps
    ]);
    refs.main.appendChild(h('div', { class: 'table-wrap' }, [refs.table]));
    pager = Pager.creer({ onChange: function () { remplir(); } });
    refs.main.appendChild(pager.el);
    refs.main.appendChild(h('p', { class: 'small', text: 'Ligne = numéro de ligne dans le fichier (l\'en-tête est la ligne 1). Le CA 12 mois est le chiffre d\'affaires HT des factures importées ' + Der.fenetre12Texte() + ' (estimation fondée sur le rapprochement des noms et SIREN).' }));
    refs.main.appendChild(h('p', { class: 'note', text: 'Ici, « SIREN valide » veut dire : 9 chiffres et clé de contrôle correcte. Cela ne prouve pas que l\'entreprise existe : la vérification au registre fait partie de la prestation. ' }));
    refs.main.appendChild(U.mentionConseil('Les corrections proposées sont des aides à la saisie, pas une attestation de conformité.'));
    container.appendChild(etat.grid);

    actualiser(true);
    majPanneau(false);
    if (etat.pageVers !== null) {
      var idx = -1;
      for (var i = 0; i < etat.liste.length; i++) { if (etat.liste[i].ligne === etat.pageVers) { idx = i; break; } }
      var vers = etat.pageVers;
      etat.pageVers = null;
      if (idx >= 0) {
        pager.allerA(pager.pageDe(idx));
        remplir();
        setTimeout(function () {
          var tr = refs.corps && refs.corps.querySelector('[data-ligne="' + vers + '"]');
          if (tr && tr.scrollIntoView) tr.scrollIntoView({ block: 'center', behavior: U.mediaReduit() ? 'auto' : 'smooth' });
        }, 0);
      }
    }
    if (etat.focusFk) {
      var fk = etat.focusFk;
      etat.focusFk = null;
      var cibles = container.querySelectorAll('[data-fk]');
      for (var k = 0; k < cibles.length; k++) { if (cibles[k].getAttribute('data-fk') === fk) { U.focus(cibles[k]); break; } }
    }
  }

  /* ---------- Qualité du fichier et répartition ---------- */

  var MOTIFS = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];

  function carteQualite(t, a) {
    var d = S.dossier();
    var types = L.ANOMALY_TYPES.concat(a.avecRegistre ? L.TYPES_REGISTRE : []);
    var segments = [];
    var total = 0;
    types.forEach(function (ty) { if (a.counts[ty.code] > 0) total += a.counts[ty.code]; });
    types.forEach(function (ty, i) {
      var n = a.counts[ty.code];
      if (!n) return;
      segments.push(h('button', {
        type: 'button', class: 'seg ' + MOTIFS[i % MOTIFS.length] + (ty.severity === 'note' ? ' seg-note' : ''), 'aria-pressed': etat.filtre === ty.code ? 'true' : 'false',
        'data-fk': 'seg-' + ty.code, style: 'flex-grow:' + n, onclick: function () { choisirFiltre(ty.code); }
      }, [
        h('span', { class: 'seg-bar', 'aria-hidden': 'true' }),
        h('span', { class: 'seg-lab' }, [h('span', { text: ty.label }), ' ', h('span', { class: 'seg-n', text: '(' + n + ')' })])
      ]));
    });
    var chips = [
      chip('avec', 'Avec anomalie', a.withAnomaly),
      chip('toutes', 'Toutes les lignes', t.origine.total)
    ];
    var fusion = t.exclues.length ? h('p', { class: 'small', text: U.pluriel(t.exclues.length, 'ligne fusionnée écartée', 'lignes fusionnées écartées') + ' de la copie de travail (fichier d\'origine intact).' }) : null;
    return h('div', { class: 'score-row' }, [
      h('div', { class: 'card score', id: 'tt-qualite' }, [
        h('p', { class: 'label', text: 'Qualité du fichier' }),
        h('p', { class: 'score-val' }, [h('span', { id: 'tt-score', text: a.score === null ? '–' : String(a.score) }), h('span', { class: 'unit', text: U.NBSP + '%' })]),
        h('div', { class: 'bar', 'aria-hidden': 'true' }, [h('span', { style: 'width:' + (a.score || 0) + '%' })]),
        h('p', { class: 'small', id: 'tt-propres', text: a.total ? U.pluriel(a.clean, 'ligne', 'lignes') + ' sur ' + U.fmtNum(a.total) + ' sans anomalie' + (d.mode === 'demo' ? ' (exemple fictif)' : '') + '.' : 'Aucune ligne à analyser.' }),
        fusion,
        a.doublons && a.doublons.plafonnes ? h('p', { class: 'small', text: a.doublons.plafonnes + ' groupe(s) de doublons de plus de ' + L.CONST.MAX_GROUPE_DOUBLONS + ' lignes : les rapprochements sont plafonnés.' }) : null
      ]),
      h('div', { class: 'card filters-card' }, [
        h('p', { class: 'label', id: 'filters-label', text: 'Répartition des anomalies : cliquez un type pour filtrer' }),
        segments.length ? h('div', { class: 'segs', id: 'tt-segs', role: 'group', 'aria-labelledby': 'filters-label' }, segments)
          : h('p', { class: 'small', text: 'Aucune anomalie détectée par les contrôles de l\'outil.' }),
        h('div', { class: 'chips', id: 'tiers-chips', role: 'group', 'aria-label': 'Filtres généraux' }, chips),
        h('p', { class: 'small', text: 'Le score est la part des lignes sans anomalie. Une adresse de livraison différente est une note, pas une anomalie.' + (a.avecRegistre ? ' Les écarts avec le registre sont à vérifier : aucune valeur du registre n\'est appliquée automatiquement.' : '') })
      ])
    ]);
  }

  function chip(cle, libelle, n) {
    return h('button', {
      type: 'button', class: 'chip', 'data-fk': 'chip-' + cle, 'aria-pressed': etat.filtre === cle ? 'true' : 'false',
      onclick: function () { choisirFiltre(cle); }
    }, [libelle, ' ', h('span', { class: 'n', text: '(' + n + ')' })]);
  }

  function choisirFiltre(cle) {
    etat.filtre = etat.filtre === cle && cle !== 'toutes' ? 'toutes' : cle;
    Array.prototype.forEach.call(document.querySelectorAll('#panel-tiers .seg, #panel-tiers .chip'), function (b) {
      var k = (b.getAttribute('data-fk') || '').replace(/^(seg|chip)-/, '');
      b.setAttribute('aria-pressed', k === etat.filtre ? 'true' : 'false');
    });
    actualiser(true);
  }

  /* ---------- Décisions et exports ---------- */

  function carteDecisions(t, d) {
    var pr = L.compterDecisions(t.propositions, d.corrections);
    var pct = pr.total ? Math.round(100 * pr.decisions / pr.total) : 0;
    var nomBase = L.slug(d.entreprise.nom, 'dossier');
    var aideCorr = E.ui.aide.bouton('corrections');
    return h('div', { class: 'card tt-decisions secondary' }, [
      h('div', { class: 'tt-dec-tete' }, [
        h('div', { class: 'titre-aide' }, [h('p', { class: 'label', text: 'Vos décisions' }), aideCorr.btn]),
        h('p', { class: 'tt-progress', id: 'tt-progress', role: 'status', text: U.pluriel(pr.decisions, 'décision', 'décisions') + ' sur ' + pr.total })
      ]),
      aideCorr.panneau,
      h('div', { class: 'bar', 'aria-hidden': 'true' }, [h('span', { style: 'width:' + pct + '%' })]),
      h('p', { class: 'small', text: pr.total ? 'Chaque proposition attend votre décision : accepter, refuser ou modifier. Rien n\'est appliqué sans vous, et votre fichier d\'origine n\'est jamais écrasé : les exports sont de nouveaux fichiers.' : 'Aucune proposition de correction pour ce fichier.' }),
      h('div', { class: 'toolbar' }, [
        U.bouton('Exporter le fichier fiabilisé (CSV)', { icone: 'telecharger', id: 'btn-export-fiabilise', onclick: function () {
          IO.telechargerCsv(nomBase + '-fichier-tiers-fiabilise.csv', L.buildFiabilise(S.dossier().donnees.tiers, { analysis: t.analysis, corrections: S.dossier().corrections, exclues: t.exclues }));
        } }),
        U.bouton('Exporter le journal des corrections (CSV)', { icone: 'telecharger', id: 'btn-export-journal', onclick: function () {
          IO.telechargerCsv(nomBase + '-journal-des-corrections.csv', L.buildJournal(S.dossier().journal, { rows: t.rows }));
        } }),
        U.bouton('Exporter les anomalies (CSV)', { icone: 'telecharger', id: 'btn-export-anomalies', onclick: function () { IO.telechargerCsv('anomalies-fichier-tiers.csv', L.anomaliesToCsv(t.analysis)); } })
      ])
    ]);
  }

  /* ---------- Recherche et tri ---------- */

  function barreRecherche() {
    var champ = h('input', { type: 'search', class: 'champ', id: 'tt-recherche', 'data-fk': 'tt-recherche', autocomplete: 'off', value: etat.recherche, placeholder: 'Nom, ville ou SIREN' });
    champ.addEventListener('input', function () { etat.recherche = champ.value; actualiser(true); });
    refs.compteur = h('p', { class: 'tt-compteur', id: 'tt-compteur', role: 'status', 'aria-live': 'polite' });
    refs.annonceTri = h('p', { class: 'visually-hidden', id: 'tt-tri-live', role: 'status', 'aria-live': 'polite' });
    var sel = h('select', { class: 'champ tt-tri-select', id: 'tt-tri-select', 'aria-label': 'Trier par' }, [
      h('option', { value: 'ligne:1', text: 'Trier par : ligne' }),
      h('option', { value: 'nom:1', text: 'Nom (A à Z)' }),
      h('option', { value: 'nom:-1', text: 'Nom (Z à A)' }),
      h('option', { value: 'anomalies:-1', text: 'Anomalies (les plus nombreuses)' }),
      h('option', { value: 'ca:-1', text: 'CA 12 mois (le plus élevé)' })
    ]);
    sel.addEventListener('change', function () {
      var p = sel.value.split(':');
      etat.tri = { cle: p[0], sens: +p[1] };
      actualiser(true);
    });
    return h('div', { class: 'tt-barre' }, [
      h('div', { class: 'tt-recherche' }, [h('label', { for: 'tt-recherche', text: 'Rechercher un nom ou un SIREN' }), champ]),
      sel,
      refs.compteur,
      refs.annonceTri
    ]);
  }

  function trierPar(cle) {
    if (etat.tri.cle === cle) etat.tri = { cle: cle, sens: -etat.tri.sens };
    else etat.tri = { cle: cle, sens: cle === 'ca' || cle === 'anomalies' ? -1 : 1 };
    actualiser(true, true);
  }

  function actualiser(reset, annonceTri) {
    etat.liste = filtrerTrier();
    Object.keys(refs.entetes || {}).forEach(function (c) {
      refs.entetes[c].setAttribute('aria-sort', etat.tri.cle === c ? (etat.tri.sens > 0 ? 'ascending' : 'descending') : 'none');
    });
    var total = etat.lignes.length;
    refs.compteur.textContent = U.pluriel(etat.liste.length, 'ligne affichée', 'lignes affichées') + ' sur ' + total;
    if (annonceTri) refs.annonceTri.textContent = 'Trié par ' + LIBELLE_TRI[etat.tri.cle] + ', ordre ' + (etat.tri.sens > 0 ? 'croissant' : 'décroissant') + '.';
    pager.setTotal(etat.liste.length, !reset);
    remplir();
  }

  /* ---------- Tableau ---------- */

  function celluleCa(lv) {
    if (!lv.ca) return h('td', { class: 'num col-sec', 'data-label': 'CA 12 mois' }, [h('span', { 'aria-hidden': 'true', text: '–' }), h('span', { class: 'visually-hidden', text: 'sans objet' })]);
    return h('td', { class: 'num col-sec', 'data-label': 'CA 12 mois', text: U.fmtEur(lv.ca.ca) });
  }

  function badgesAnomalies(lv) {
    if (lv.exclue) return [U.statusBadge('note', 'Fusionnée')];
    var badges = lv.anomalies.map(function (x) {
      var cls = 'badge' + (x.severity === 'anomalie' ? '' : ' note-b');
      return h('span', { class: cls, text: x.label + (x.source === 'registre' ? ' (à vérifier)' : '') });
    });
    if (!badges.length) {
      // Une ligne corrigée n'affiche que le badge « Corrigée » : « Aucune » à côté serait trompeur pour une ligne qui avait une anomalie
      if (lv.appliquees) badges.push(U.statusBadge('ok', 'Corrigée, plus d\'anomalie'));
      else badges.push(h('span', { class: 'small', text: 'Aucune' }));
    }
    return badges;
  }

  /** État au registre : « Active » seulement quand l'état est explicitement reconnu (active, actif, A) ; sinon la valeur brute, ou « – ». */
  function libelleEtat(etat) {
    var brut = String(etat === null || etat === undefined ? '' : etat).trim();
    if (!brut) return '–';
    return ['active', 'actif', 'a', 'en activite', 'en activité'].indexOf(brut.toLowerCase()) >= 0 ? 'Active' : brut;
  }

  function celluleRegistre(lv) {
    var r = lv.registre;
    if (!r) return [h('td', { 'data-label': 'État au registre', text: '–' }), h('td', { class: 'col-sec', 'data-label': 'Vérifié le', text: '–' })];
    var etatTxt;
    if (r.verifie === false) {
      return [h('td', { 'data-label': 'État au registre' }, [U.statusBadge('note', 'Non vérifié')]), h('td', { class: 'col-sec', 'data-label': 'Vérifié le', text: '–' })];
    }
    var introuvable = lv.anomalies.some(function (a) { return a.code === 'siren_introuvable'; });
    var cesse = lv.anomalies.some(function (a) { return a.code === 'etat_cesse'; });
    if (introuvable) etatTxt = U.statusBadge('a_corriger', 'Introuvable : à vérifier');
    else if (cesse) etatTxt = U.statusBadge('a_corriger', 'Cessée : à vérifier');
    else etatTxt = h('span', { text: libelleEtat(r.etat) });
    return [h('td', { 'data-label': 'État au registre' }, [etatTxt]), h('td', { class: 'col-sec', 'data-label': 'Vérifié le', text: r.dateVerification ? U.fmtDate(r.dateVerification) : '–' })];
  }

  function remplir() {
    var corps = refs.corps;
    if (!corps) return;
    U.clear(corps);
    var debut = pager.debut();
    var fin = pager.fin();
    var avecRegistre = !!(Der.tiers() && Der.tiers().registre);
    for (var i = debut; i < fin; i++) {
      var lv = etat.liste[i];
      var a = lv.row;
      var peutOuvrir = lv.props.length > 0 || lv.anomalies.length > 0 || lv.exclue;
      var btn = peutOuvrir ? h('button', {
        type: 'button', class: 'toggle tt-open', 'aria-expanded': etat.selection === lv.ligne ? 'true' : 'false', 'data-ligne': String(lv.ligne),
        'data-fk': 'open-' + lv.ligne, onclick: ouvrirDepuis(lv.ligne)
      }, ['Détail', h('span', { class: 'visually-hidden', text: ' ligne ' + lv.ligne + ' : ' + a.nom })]) : null;
      var cells = [
        h('td', { class: 'num tt-ligne', 'data-label': 'Ligne', text: String(lv.ligne) }),
        h('td', { class: 'col-sec', 'data-label': 'Type', text: a.type }),
        h('th', { scope: 'row', class: 'tt-nom', text: a.nom }),
        h('td', { class: 'mono tt-siren', 'data-label': 'SIREN', text: U.groupSiren(a.siren) || '–' }),
        h('td', { class: 'tt-anom', 'data-label': 'Anomalies' }, badgesAnomalies(lv)),
        celluleCa(lv)
      ];
      if (avecRegistre) cells = cells.concat(celluleRegistre(lv));
      cells.push(h('td', { class: 'tt-act' }, [btn]));
      corps.appendChild(h('tr', { 'data-ligne': String(lv.ligne), class: 'tt-row' + (etat.selection === lv.ligne ? ' sel' : '') + (lv.exclue ? ' exclue' : '') }, cells));
    }
    if (!etat.liste.length) corps.appendChild(h('tr', { class: 'empty-row' }, [h('td', { colspan: avecRegistre ? '9' : '7', text: 'Aucune ligne pour ce filtre ou cette recherche.' })]));
  }

  function ouvrirDepuis(ligne) {
    return function () { ouvrir(ligne); };
  }

  /* ---------- Panneau de détail (non modal) ---------- */

  function ouvrir(ligne) {
    etat.selection = ligne;
    etat.edition = null;
    majPanneau(true);
    Array.prototype.forEach.call(refs.corps.querySelectorAll('tr.tt-row'), function (tr) {
      tr.classList.toggle('sel', tr.getAttribute('data-ligne') === String(ligne));
    });
    Array.prototype.forEach.call(refs.corps.querySelectorAll('.tt-open'), function (b) {
      b.setAttribute('aria-expanded', b.getAttribute('data-ligne') === String(ligne) ? 'true' : 'false');
    });
  }

  function fermer(rendreFocus) {
    var ligne = etat.selection;
    etat.selection = null;
    etat.edition = null;
    majPanneau(false);
    if (refs.corps) {
      Array.prototype.forEach.call(refs.corps.querySelectorAll('tr.tt-row'), function (tr) { tr.classList.remove('sel'); });
      Array.prototype.forEach.call(refs.corps.querySelectorAll('.tt-open'), function (b) { b.setAttribute('aria-expanded', 'false'); });
      if (rendreFocus && ligne !== null) {
        var b = refs.corps.querySelector('[data-fk="open-' + ligne + '"]');
        if (b) U.focus(b);
      }
    }
  }

  function majPanneau(focus) {
    if (!refs.layout) return;
    if (refs.panneau && refs.panneau.parentNode) refs.panneau.parentNode.removeChild(refs.panneau);
    refs.panneau = null;
    refs.layout.classList.toggle('has-panel', etat.selection !== null);
    if (etat.selection === null) return;
    var lv = null;
    for (var i = 0; i < etat.lignes.length; i++) { if (etat.lignes[i].ligne === etat.selection) { lv = etat.lignes[i]; break; } }
    if (!lv) { etat.selection = null; refs.layout.classList.remove('has-panel'); return; }
    refs.panneau = panneau(lv);
    refs.layout.appendChild(refs.panneau);
    if (etat.panneauScroll) { refs.panneau.scrollTop = etat.panneauScroll; etat.panneauScroll = 0; }
    if (focus) { var tt = refs.panneau.querySelector('#tt-panel-titre'); if (tt) U.focus(tt); }
  }

  function ligneIdentite(lv) {
    var r = lv.eff ? lv.eff.row : lv.row;
    var items = [
      ['Type', r.type], ['SIREN', U.groupSiren(r.siren) || '–'], ['SIRET', r.siret || '–'], ['TVA', r.tva || '–'],
      ['Adresse', [r.adresse, [r.code_postal, r.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '–']
    ];
    if (r.livraison_adresse) items.push(['Livraison', [r.livraison_adresse, [r.livraison_code_postal, r.livraison_ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')]);
    return h('dl', { class: 'infos tt-ident' }, items.map(function (x) { return h('div', null, [h('dt', { text: x[0] }), h('dd', { text: x[1] })]); }));
  }

  function panneau(lv) {
    var d = S.dossier();
    var corps = [];
    var codesRestants = {};
    lv.anomalies.forEach(function (a) { codesRestants[a.code] = true; });
    var traitees = {};

    corps.push(h('div', { class: 'tt-panel-tete' }, [
      h('h3', { id: 'tt-panel-titre', tabindex: '-1', text: 'Ligne ' + lv.ligne + ' : ' + lv.row.nom }),
      h('button', { type: 'button', class: 'btn btn-petit', 'aria-label': 'Fermer le panneau de détail', onclick: function () { fermer(true); } }, [U.icon('fermer'), h('span', { text: 'Fermer' })])
    ]));
    corps.push(ligneIdentite(lv));

    if (lv.exclue) {
      corps.push(h('p', { class: 'notice' }, [U.icon('info'), ' Cette ligne est écartée de la copie de travail : doublon fusionné selon votre décision.']));
    } else if (!lv.anomalies.length && lv.props.length === 0) {
      corps.push(h('p', { class: 'notice' }, [U.icon('check-cercle'), ' Aucune anomalie sur cette ligne selon les contrôles de l\'outil.']));
    }

    // Anomalies d'origine, chacune avec ses propositions
    lv.origine.anomalies.forEach(function (a) {
      var resolue = !codesRestants[a.code] || lv.exclue;
      var props = lv.props.filter(function (p) { return p.code === a.code; });
      props.forEach(function (p) { traitees[p.cle] = true; });
      corps.push(h('section', { class: 'tt-anom-bloc' + (resolue ? ' resolue' : ''), 'aria-label': a.label }, [
        h('h4', null, [h('span', { text: a.label }), ' ',
          a.severity === 'note' ? U.statusBadge('note') : (resolue ? U.statusBadge('ok', 'Résolue par vos décisions') : (a.source === 'registre' ? U.statusBadge('a_corriger', 'À vérifier') : null))]),
        h('p', { class: 'small', text: a.detail }),
        h('p', { class: 'todo small', text: 'À faire : ' + a.action }),
        props.map(function (p) { return blocProposition(p, lv); })
      ]));
    });

    // Propositions sans anomalie associée (mise en forme)
    var libres = lv.props.filter(function (p) { return !traitees[p.cle]; });
    if (libres.length) {
      corps.push(h('section', { class: 'tt-anom-bloc', 'aria-label': 'Mise en forme' }, [
        h('h4', { text: 'Mise en forme proposée' }),
        h('p', { class: 'small', text: 'Simple note : elle n\'entre pas dans le score.' }),
        libres.map(function (p) { return blocProposition(p, lv); })
      ]));
    }

    if (lv.registre) {
      var rg = lv.registre;
      if (rg.verifie === false) {
        corps.push(h('section', { class: 'tt-anom-bloc', 'aria-label': 'Données du registre' }, [
          h('h4', { text: 'Ce que dit le registre' }),
          h('p', { class: 'notice' }, [U.icon('info'), h('span', { text: 'Cette ligne n\'a pas été vérifiée au registre' + (rg.statut ? ' (statut du fichier : « ' + rg.statut + ' »)' : ' (statut absent)') + '. Aucune donnée du registre n\'est affichée ni comparée. Relancez la vérification pour ce SIREN.' })])
        ]));
      } else corps.push(h('section', { class: 'tt-anom-bloc', 'aria-label': 'Données du registre' }, [
        h('h4', { text: 'Ce que dit le registre' }),
        h('dl', { class: 'infos tt-ident' }, [
          ['Dénomination', rg.denomination || '–'], ['État administratif', rg.etat || '–'],
          ['Adresse du siège', [rg.adresse, [rg.codePostal, rg.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '–'],
          ['Vérifié le', rg.dateVerification ? U.fmtDate(rg.dateVerification) : '–']
        ].map(function (x) { return h('div', null, [h('dt', { text: x[0] }), h('dd', { text: x[1] })]); })),
        h('p', { class: 'small', text: 'Ces valeurs sont données pour information : aucune valeur du registre n\'est appliquée automatiquement.' })
      ]));
    }

    corps.push(h('p', { class: 'notice tt-aucune' }, [U.icon('info'),
      ' Aucune donnée n\'est modifiée dans votre fichier d\'origine : vos décisions s\'appliquent à une copie de travail, et vous exportez le fichier fiabilisé quand vous le souhaitez.']));
    void d;
    return h('aside', { class: 'tt-panel', id: 'tt-panel', role: 'complementary', 'aria-labelledby': 'tt-panel-titre' }, corps);
  }

  var CHAMP_LIB = L.CHAMP_LIBELLES;

  function etiquetteCertitude(c) {
    var lib = L.CERTITUDE_LIBELLES[c] || c;
    return h('span', { class: 'cert cert-' + c }, [U.icon(c === 'calculee' ? 'check-cercle' : (c === 'saisie' ? 'crayon' : 'aide')), h('span', { text: lib })]);
  }

  function blocProposition(p, lv) {
    var d = S.dossier();
    var dec = d.corrections[p.cle] || null;
    var fk = 'dec-' + p.cle;
    var champLib = p.code === 'normalisation' ? 'SIREN : mise en forme' : (CHAMP_LIB[p.champ] || p.champ);
    var vide = p.valeurProposee === null;
    var diff = h('div', { class: 'prop-diff' }, [
      h('div', { class: 'prop-avant' }, [h('span', { class: 'inv-k', text: 'Valeur actuelle' }), h('span', { class: 'prop-val', text: p.valeurActuelle || '(vide)' })]),
      U.icon('fleche', 'prop-fleche'),
      h('div', { class: 'prop-apres' + (vide ? ' vide' : '') }, [h('span', { class: 'inv-k', text: 'Correction proposée' }),
        h('span', { class: 'prop-val', text: vide ? 'Aucune valeur proposée' : p.valeurProposee })])
    ]);
    var haut = h('div', { class: 'prop-tete' }, [h('p', { class: 'prop-champ', text: champLib }), etiquetteCertitude(p.certitude)]);
    var libelle = h('p', { class: 'prop-libelle', text: p.libelle });
    var explication = h('p', { class: 'small', text: p.explication });
    var exclusif = p.exclusif ? d.corrections[p.exclusif] : null;
    var bloquerExclusif = exclusif && exclusif.decision !== 'refusee';
    var zone;
    if (p.informative) {
      zone = null;
    } else if (dec) {
      var texte = dec.decision === 'acceptee' ? 'Acceptée : ' + dec.apres
        : dec.decision === 'modifiee' ? 'Modifiée : ' + dec.apres + ' (valeur saisie)'
          : (p.registre ? 'Marquée comme vérifiée : aucun changement' : 'Refusée : aucun changement');
      zone = h('div', { class: 'prop-dec' }, [
        h('p', { class: 'prop-etat', role: 'status', text: texte }),
        h('button', { type: 'button', class: 'btn btn-petit', 'data-fk': fk + '-annuler', onclick: function () {
          memoriserDefilement();
          etat.focusFk = fk + '-accepter';
          var r = S.commit('annulerDecision', { cle: p.cle });
          if (r.refuse) etat.focusFk = null;
          else U.annoncer('Décision annulée.');
        } }, [U.icon('historique'), h('span', { text: 'Annuler la décision' }), h('span', { class: 'visually-hidden', text: ' : ' + champLib })])
      ]);
    } else {
      var boutons = [];
      if (p.appliquable) {
        boutons.push(h('button', { type: 'button', class: 'btn btn-petit btn-primary', 'data-fk': fk + '-accepter', disabled: bloquerExclusif ? true : null,
          onclick: function () { decider(p, lv, 'acceptee', null); } }, [U.icon('check'), h('span', { text: 'Accepter' }), h('span', { class: 'visually-hidden', text: ' : ' + champLib })]));
      }
      boutons.push(h('button', { type: 'button', class: 'btn btn-petit', 'data-fk': fk + '-refuser',
        onclick: function () { decider(p, lv, 'refusee', null); } }, [U.icon('fermer'), h('span', { text: p.registre ? 'Marquer comme vérifié' : 'Refuser' }), h('span', { class: 'visually-hidden', text: ' : ' + champLib })]));
      if (p.editable) {
        boutons.push(h('button', { type: 'button', class: 'btn btn-petit', 'data-fk': fk + '-modifier', 'aria-expanded': etat.edition === p.cle ? 'true' : 'false',
          onclick: function () { etat.edition = etat.edition === p.cle ? null : p.cle; majPanneau(false); var f = refs.panneau && refs.panneau.querySelector('[data-fk="' + fk + '-saisie"]'); if (f) U.focus(f); } },
        [U.icon('crayon'), h('span', { text: 'Modifier' }), h('span', { class: 'visually-hidden', text: ' : ' + champLib })]));
      }
      zone = h('div', { class: 'prop-dec' }, [h('div', { class: 'prop-boutons' }, boutons)]);
      if (bloquerExclusif) zone.appendChild(h('p', { class: 'small', text: 'L\'autre hypothèse est déjà retenue : annulez-la d\'abord, les deux s\'excluent.' }));
      if (etat.edition === p.cle) zone.appendChild(formulaireSaisie(p, lv, fk));
    }
    return h('div', { class: 'prop prop-' + p.certitude + (dec ? ' decidee' : ''), 'data-cle': p.cle }, [haut, libelle, diff, explication, zone]);
  }

  function formulaireSaisie(p, lv, fk) {
    var champ = h('input', { type: 'text', class: 'champ', id: fk + '-saisie', 'data-fk': fk + '-saisie', autocomplete: 'off', maxlength: '200',
      'aria-describedby': fk + '-err', value: p.valeurProposee || '' });
    var err = h('p', { class: 'alert', role: 'alert', id: fk + '-err', hidden: true });
    function valider() {
      var r = S.commit('decider', { proposition: p, decision: 'modifiee', saisie: champ.value, row: lv.eff ? lv.eff.row : lv.row });
      return r;
    }
    function soumettre() {
      memoriserDefilement();
      etat.focusFk = fk + '-annuler';
      var r = valider();
      if (r.refuse) { etat.focusFk = null; U.showMsg(err, r.message); champ.setAttribute('aria-invalid', 'true'); U.focus(champ); } else { etat.edition = null; U.annoncer('Valeur saisie enregistrée comme décision.'); }
    }
    champ.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); soumettre(); }
    });
    champ.addEventListener('input', function () { champ.removeAttribute('aria-invalid'); });
    return h('div', { class: 'prop-saisie' }, [
      h('label', { for: fk + '-saisie', text: 'Valeur à retenir (le contrôle du champ s\'applique)' }),
      champ, err,
      h('div', { class: 'prop-boutons' }, [
        h('button', { type: 'button', class: 'btn btn-petit btn-primary', onclick: soumettre }, ['Valider la saisie']),
        h('button', { type: 'button', class: 'btn btn-petit', onclick: function () { etat.edition = null; majPanneau(false); var b = refs.panneau && refs.panneau.querySelector('[data-fk="' + fk + '-modifier"]'); if (b) U.focus(b); } }, ['Annuler la saisie'])
      ])
    ]);
  }

  function memoriserDefilement() { etat.panneauScroll = refs.panneau ? refs.panneau.scrollTop : 0; }

  function decider(p, lv, decision, saisie) {
    memoriserDefilement();
    etat.focusFk = 'dec-' + p.cle + '-annuler';
    var r = S.commit('decider', { proposition: p, decision: decision, saisie: saisie, row: lv.eff ? lv.eff.row : lv.row });
    if (r.refuse) { etat.focusFk = null; U.annoncer(r.message); return; }
    U.annoncer(decision === 'acceptee' ? 'Correction acceptée.' : 'Décision enregistrée.');
  }

  /* ---------- Ouverture d'une fiche depuis un autre écran ---------- */

  /** Ouvre l'étape 2 sur la fiche d'une ligne (filtres remis à zéro, ligne visible, défilement respectant prefers-reduced-motion). */
  function ouvrirFiche(ligne) {
    reinitialiserSiNouveau();
    etat.filtre = 'toutes';
    etat.recherche = '';
    etat.tri = { cle: 'ligne', sens: 1 };
    etat.selection = ligne;
    etat.pageVers = ligne;
    if (E.app) { E.app.rafraichir('tiers'); E.app.allerEtape(1, { focus: false }); }
  }

  // Échap ferme le panneau de détail et rend le focus à son bouton d'ouverture.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.defaultPrevented || etat.selection === null) return;
    var p = document.getElementById('panel-tiers');
    if (!p || p.hidden || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    fermer(true);
  });

  /** Oublie les lignes, la sélection et le tri (effacement de la session). */
  function reinitialiser() {
    etat.cleDossier = ''; etat.cleGrid = ''; etat.filtre = 'toutes'; etat.recherche = ''; etat.tri = { cle: 'ligne', sens: 1 };
    etat.selection = null; etat.focusFk = null; etat.cleDonnees = ''; etat.lignes = null; etat.liste = []; etat.pageVers = null;
    etat.edition = null; etat.erreurs = {}; etat.grid = null;
    pager = null; refs = {};
  }

  E.views.tiers = { render: render, ouvrirFiche: ouvrirFiche, reinitialiser: reinitialiser };
})(typeof self !== 'undefined' ? self : this);
