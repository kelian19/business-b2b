/* Équerre : étape 4, trésorerie et reporting mensuel (import de l'export des factures, indicateurs, graphique mensuel, filtres,
 * comparaison avec la période précédente, export CSV). Aucun calcul métier ici : tout vient de EquerreLogic. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var L = root.EquerreLogic;
  var S = E.ui.store;
  var Der = E.ui.derived;
  var Wiz = E.ui.importWizard;
  var Ch = E.ui.charts;
  var IO = E.ui.io;

  var etat = { cle: '', grid: null, filtres: { du: null, au: null, client: null }, importOuvert: false, msg: '' };
  var dernier = null;      // { box, parMois, titre, opts }

  function kpi(label, valeur, sous, alerte) {
    return h('div', { class: 'kpi' + (alerte ? ' alert' : '') }, [
      h('p', { class: 'label', text: label }), h('p', { class: 'v', text: valeur }), sous ? h('p', { class: 's', text: sous }) : null
    ]);
  }

  function tableTop(r) {
    var maxPart = r.topClients.length ? r.topClients[0].part : 0;
    var corps = h('tbody', null, r.topClients.map(function (c) {
      var largeur = maxPart ? (c.part / maxPart) * 100 : 0;
      return h('tr', null, [
        h('td', { text: c.client }), h('td', { class: 'num', text: U.fmtEur(c.ht) }),
        h('td', { class: 'part-cell' }, [
          h('span', { class: 'part-txt', text: U.fmtPct(c.part, 1) }),
          h('span', { class: 'share-piste share-pleine', 'aria-hidden': 'true' }, [h('span', { class: 'share', style: 'width:' + largeur.toFixed(2) + '%' })])
        ])
      ]);
    }));
    var t = h('table', { class: 'table top-table' }, [
      h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Client' }), h('th', { scope: 'col', class: 'num', text: 'CA HT' }), h('th', { scope: 'col', text: 'Part du CA' })])]),
      corps
    ]);
    if (r.nbClients > 5) {
      t.appendChild(h('tfoot', null, [h('tr', null, [h('td', { text: 'Autres clients (' + (r.nbClients - 5) + ')' }), h('td', { class: 'num', text: U.fmtEur(r.autresHT) }), h('td', { text: U.fmtPct(r.autresPart, 1) })])]));
    }
    return t;
  }

  /** Barre empilée de l'encours par ancienneté et tableau équivalent. */
  function carteAnciennete(r) {
    var corps = [];
    if (!(r.encours > 0)) {
      corps.push(h('p', { class: 'vide-bloc' }, [U.icon('check-cercle'), h('span', { text: 'Aucune facture non payée à la date de référence' })]));
    } else {
      var segs = [{ id: 'a-echoir', label: 'Pas encore échues', montant: r.aEchoir.total, nb: r.aEchoir.nb, motif: 'points' }];
      var motifs = { '1-30': 'hach', '31-60': 'croix', '60+': 'plein-rouge' };
      r.echues.tranches.forEach(function (x) { segs.push({ id: x.id, label: x.label, montant: x.total, nb: x.nb, motif: motifs[x.id] }); });
      if (r.sansEcheance.nb) segs.push({ id: 'sans', label: 'Sans date d\'échéance', montant: r.sansEcheance.total, nb: r.sansEcheance.nb, motif: 'plein-nuit' });
      segs.forEach(function (x) {
        x.valeur = x.montant;
        x.part = r.encours ? x.montant / r.encours : 0;
        x.legende = x.label + ' : ' + U.fmtEur(x.montant) + ' (' + U.pluriel(x.nb, 'facture', 'factures') + ', ' + U.fmtPct(x.part, 0) + ')';
        x.aria = x.legende + ', TTC';
      });
      corps.push(Ch.barreEmpilee({
        id: 'anc', segments: segs, focusable: true,
        ariaLabel: 'Encours non payé par ancienneté, ' + U.fmtEur(r.encours) + ' TTC au total',
        tooltip: function (x) { return { titre: x.label, lignes: [U.fmtEur(x.montant) + ' TTC', U.pluriel(x.nb, 'facture', 'factures'), U.fmtPct(x.part, 1) + ' de l\'encours'] }; }
      }).el);
    }
    var notes = ['Ancienneté = jours écoulés depuis la date d\'échéance, à la date de référence ' + U.fmtDate(r.refDate) + '.'];
    if (r.sansEcheance.nb) notes.push(U.pluriel(r.sansEcheance.nb, 'facture non payée sans date d\'échéance', 'factures non payées sans date d\'échéance') + ' (' + U.fmtEur(r.sansEcheance.total) + '), non classée(s) par ancienneté.');
    if (r.nbApresReference) notes.push(U.pluriel(r.nbApresReference, 'facture est émise', 'factures sont émises') + ' après la date de référence : ' + (r.nbApresReference > 1 ? 'elles sont comptées' : 'elle est comptée') + ' dans le chiffre d\'affaires et les échéances à venir (vérifiez la date de référence).');
    if (r.nbPaiementsAnterieurs) notes.push(U.pluriel(r.nbPaiementsAnterieurs, 'paiement daté', 'paiements datés') + ' avant l\'émission de la facture : écarté(s) du délai moyen.');
    var tableau = h('table', { class: 'table small-table' }, [
      h('thead', null, [h('tr', null, ['Ancienneté', 'Factures', 'Montant TTC', 'Part de l\'encours'].map(function (x, i) { return h('th', { scope: 'col', class: i ? 'num' : '', text: x }); }))]),
      h('tbody', null, [h('tr', null, [h('td', { text: 'Pas encore échues' }), h('td', { class: 'num', text: String(r.aEchoir.nb) }), h('td', { class: 'num', text: U.fmtEur(r.aEchoir.total) }), h('td', { class: 'num', text: r.encours ? U.fmtPct(r.aEchoir.total / r.encours, 0) : '–' })])]
        .concat(r.echues.tranches.map(function (x) {
          return h('tr', null, [h('td', { text: x.label }), h('td', { class: 'num', text: String(x.nb) }), h('td', { class: 'num', text: U.fmtEur(x.total) }), h('td', { class: 'num', text: U.fmtPct(x.part, 0) })]);
        }))),
      h('tfoot', null, [h('tr', null, [h('td', { text: 'Encours total' }), h('td', { class: 'num', text: String(r.nbImpayees) }), h('td', { class: 'num', text: U.fmtEur(r.encours) }), h('td', { class: 'num', text: r.encours ? '100' + U.NBSP + '%' : '–' })])])
    ]);
    corps.push(h('details', { class: 'values' }, [h('summary', { text: 'Voir le tableau équivalent' }), h('div', { class: 'table-wrap' }, [tableau])]));
    corps.push(h('p', { class: 'small', text: notes.join(' ') }));
    return h('section', { class: 'card', 'aria-labelledby': 'rep-anc-t' }, [h('h3', { id: 'rep-anc-t', text: 'Encours par ancienneté' })].concat(corps));
  }

  /** Comparaison avec la période précédente de même durée (écart en valeur et en %, états vides). */
  function carteComparaison(r) {
    var c = r.comparaison;
    var corps = [];
    if (!c) {
      corps.push(h('p', { class: 'vide-bloc' }, [U.icon('info'), h('span', { text: 'Choisissez une période (début et fin) dans les filtres pour la comparer à la période précédente de même durée.' })]));
    } else if (c.videPrecedent) {
      corps.push(h('p', { class: 'vide-bloc' }, [U.icon('info'), h('span', { text: 'Aucune facture sur la période précédente (' + U.fmtDate(c.precedente.du) + ' au ' + U.fmtDate(c.precedente.au) + ') : comparaison impossible, aucun écart n\'est calculé.' })]));
    } else if (c.videActuel) {
      corps.push(h('p', { class: 'vide-bloc' }, [U.icon('info'), h('span', { text: 'Aucune facture sur la période choisie : comparaison impossible.' })]));
    } else {
      var lignes = [
        ['Chiffre d\'affaires HT', c.caHT, U.fmtEur, U.fmtEurSigne],
        ['Nombre de factures', c.nbFactures, function (x) { return U.fmtNum(x); }, function (x) { return U.fmtNumSigne(x, 0); }],
        ['Encours non payé (TTC)', c.encours, U.fmtEur, U.fmtEurSigne],
        ['Délai moyen de paiement', c.delaiMoyenPaiement, function (x) { return x === null ? 'n.d.' : U.fmtNum(x, 1) + ' j'; }, function (x) { return x === null ? 'n.d.' : U.fmtNumSigne(x, 1) + ' j'; }]
      ];
      corps.push(h('div', { class: 'table-wrap' }, [h('table', { class: 'table cmp-table' }, [
        h('caption', { class: 'visually-hidden', text: 'Comparaison avec la période précédente de même durée' }),
        h('thead', null, [h('tr', null, [
          h('th', { scope: 'col', text: 'Indicateur' }),
          h('th', { scope: 'col', class: 'num', text: 'Période choisie (' + U.fmtDate(c.periode.du) + ' au ' + U.fmtDate(c.periode.au) + ')' }),
          h('th', { scope: 'col', class: 'num', text: 'Période précédente (' + U.fmtDate(c.precedente.du) + ' au ' + U.fmtDate(c.precedente.au) + ')' }),
          h('th', { scope: 'col', class: 'num', text: 'Écart' }), h('th', { scope: 'col', class: 'num', text: 'Écart en %' })
        ])]),
        h('tbody', null, lignes.map(function (l) {
          var e = l[1];
          return h('tr', null, [
            h('th', { scope: 'row', text: l[0] }),
            h('td', { class: 'num', text: e.actuel === null ? 'n.d.' : l[2](e.actuel) }),
            h('td', { class: 'num', text: e.precedent === null ? 'n.d.' : l[2](e.precedent) }),
            h('td', { class: 'num', text: e.ecart === null ? 'n.d.' : l[3](e.ecart) }),
            h('td', { class: 'num', text: e.ecartPct === null ? 'n.d.' : U.fmtPctSigne(e.ecartPct, 1) })
          ]);
        }))
      ])]));
    }
    return h('section', { class: 'card', 'aria-labelledby': 'rep-cmp-t' }, [
      h('h3', { id: 'rep-cmp-t', text: 'Comparaison avec la période précédente' })
    ].concat(corps, [h('p', { class: 'small', text: 'Écarts calculés sur les factures émises dans chaque période (même durée, même client). Estimations de gestion, sans valeur de prévision.' })]));
  }

  /* ---------- Filtres ---------- */

  function filtresCarte(clients, r) {
    var f = etat.filtres;
    var err = h('p', { class: 'alert alert-champ', role: 'alert', hidden: !etat.msg, text: etat.msg });
    var du = h('input', { type: 'date', id: 'rep-du', class: 'champ', value: f.du || '', 'data-fk': 'rep-du' });
    var au = h('input', { type: 'date', id: 'rep-au', class: 'champ', value: f.au || '', 'data-fk': 'rep-au' });
    var cl = h('input', { type: 'text', id: 'rep-client', class: 'champ champ-client', value: f.client || '', list: 'rep-clients', 'data-fk': 'rep-client', autocomplete: 'off', placeholder: 'Tous les clients' });
    var dl = h('datalist', { id: 'rep-clients' }, clients.map(function (c) { return h('option', { value: c }); }));
    function appliquer(patch, message) {
      var nouveau = Object.assign({}, etat.filtres, patch);
      if (nouveau.du && nouveau.au && nouveau.du > nouveau.au) {
        etat.msg = 'La date de début doit précéder la date de fin.';
        U.showMsg(err, etat.msg);
        du.value = etat.filtres.du || ''; au.value = etat.filtres.au || '';
        return;
      }
      etat.msg = message || '';
      etat.filtres = nouveau;
      if (E.app) E.app.actualiser('reporting');
    }
    du.addEventListener('change', function () { appliquer({ du: L.parseDate(du.value) }); });
    au.addEventListener('change', function () { appliquer({ au: L.parseDate(au.value) }); });
    cl.addEventListener('change', function () {
      var v = cl.value.trim();
      if (!v) { appliquer({ client: null }); return; }
      if (clients.indexOf(v) < 0) { etat.msg = 'Client inconnu : choisissez un nom dans la liste.'; U.showMsg(err, etat.msg); cl.value = etat.filtres.client || ''; return; }
      appliquer({ client: v });
    });
    var reinit = U.bouton('Réinitialiser les filtres', { classe: 'btn-petit', icone: 'filtre', id: 'rep-reinit', desactive: !(f.du || f.au || f.client), onclick: function () { appliquer({ du: null, au: null, client: null }); } });
    reinit.setAttribute('data-fk', 'rep-reinit');
    var exp = U.bouton('Exporter le reporting (CSV)', { classe: 'btn-petit', icone: 'telecharger', id: 'btn-export-reporting', desactive: !r, onclick: function () {
      var cur = Der.reportingFiltre(etat.filtres);
      if (cur) IO.telechargerCsv(cur.periode.filtre ? 'reporting-filtre.csv' : 'reporting.csv', L.reportingToCsv(cur));
    } });
    return h('section', { class: 'card rep-filtres no-print', 'aria-labelledby': 'rep-filtres-t' }, [
      h('h3', { id: 'rep-filtres-t', class: 'visually-hidden', text: 'Filtres du reporting' }),
      h('div', { class: 'rep-f-ligne' }, [
        h('label', { class: 'date-field', for: 'rep-du' }, ['Du', du]),
        h('label', { class: 'date-field', for: 'rep-au' }, ['Au', au]),
        h('label', { class: 'date-field', for: 'rep-client' }, ['Client', cl]),
        dl, reinit, exp
      ]),
      err
    ]);
  }

  function resumeFiltres(r) {
    var p = r.periode;
    if (!p.filtre) return 'Toutes les factures de l\'export.';
    var parts = [];
    if (p.du || p.au) parts.push('période du ' + (p.du ? U.fmtDate(p.du) : 'début des données') + ' au ' + (p.au ? U.fmtDate(p.au) : 'fin des données'));
    if (p.client) parts.push('client : ' + p.client);
    return 'Filtres appliqués : ' + parts.join(' ; ') + '.';
  }

  /* ---------- Rendu ---------- */

  function render(container) {
    var d = S.dossier();
    var s = S.state.session;
    var cle = s.gen + ':' + s.rev.factures;
    if (etat.cle !== cle) { etat.cle = cle; etat.grid = null; etat.filtres = { du: null, au: null, client: null }; etat.msg = ''; }
    U.clear(container);
    var r = Der.reportingFiltre(etat.filtres);
    var f = Der.factures();
    var table = d.donnees.factures;
    var source = d.mode === 'demo' ? 'Source : export de factures fictif' : (table ? 'Source : votre fichier (' + table.source.nomFichier + ')' : 'Source : aucun fichier importé');

    var champ = h('input', { type: 'date', id: 'ref-date-rep', class: 'champ', value: Der.refDate(), 'data-fk': 'ref-date-rep' });
    champ.addEventListener('change', function () {
      var v = L.parseDate(champ.value);
      if (v) S.commit('setRefDate', { iso: v }); else champ.value = Der.refDate();
    });
    container.appendChild(h('div', { class: 'panel-top dash-top' }, [
      h('div', null, [
        h('h2', { text: 'Trésorerie et reporting mensuel' })
      ]),
      h('div', { class: 'dash-top-d' }, [
        h('label', { class: 'date-field', for: 'ref-date-rep' }, ['Date de référence', champ]),
        h('p', { class: 'source' + (d.mode === 'client' ? ' own' : ''), text: source })
      ])
    ]));

    if (!etat.grid) etat.grid = h('div', { class: 'import-grid secondary' }, [Wiz.carte('factures').el]);

    if (!r) {
      container.appendChild(etat.grid);
      container.appendChild(h('div', { class: 'card vide' }, [
        h('p', { text: 'Aucun export de factures importé.' }),
        h('p', { class: 'small', text: 'Importez votre export de factures ci-dessus : les indicateurs apparaissent ici.' })
      ]));
      dernier = null;
      return;
    }

    container.appendChild(filtresCarte(Der.clients(), r));

    if (r.nbFactures === 0) {
      container.appendChild(h('div', { class: 'card vide' }, [
        h('p', { text: 'Aucune facture ne correspond à ces filtres.' }),
        h('p', { class: 'small', text: resumeFiltres(r) + ' Modifiez la période ou le client, ou réinitialisez les filtres.' })
      ]));
      dernier = null;
      container.appendChild(importation(d, true));
      return;
    }

    var w = f.warnings;
    var sansTTC = w && w.sansTTC > 0 ? ' (HT pour ' + w.sansTTC + ' facture' + (w.sansTTC > 1 ? 's' : '') + ' sans TTC)' : '';
    container.appendChild(h('div', { class: 'cards' }, [
      kpi('Chiffre d\'affaires HT', U.fmtEur(r.caHT), r.nbFactures + ' factures émises, ' + r.nbClients + ' ' + (r.nbClients > 1 ? 'clients' : 'client')),
      kpi('Encours non payé', U.fmtEur(r.encours), U.pluriel(r.nbImpayees, 'facture', 'factures') + ', TTC' + sansTTC),
      kpi('Factures échues', U.fmtEur(r.echues.total), U.pluriel(r.echues.nb, 'facture', 'factures') + ' au ' + U.fmtDate(r.refDate), r.echues.nb > 0),
      kpi('Délai moyen de paiement', r.delaiMoyenPaiement === null ? 'n.d.' : U.fmtNum(r.delaiMoyenPaiement, 1) + ' jours',
        'de l\'émission au paiement, ' + U.pluriel(r.nbPayeesDatees, 'facture payée datée', 'factures payées datées')),
      kpi('Payées en retard', r.partPayeesEnRetard === null ? 'n.d.' : U.fmtPct(r.partPayeesEnRetard, 0), r.nbPayeesEnRetard + ' sur ' + r.nbPayeesDatees + ' payées après l\'échéance'),
      kpi('Part des 5 premiers clients', U.fmtPct(r.topPart, 0), 'du chiffre d\'affaires HT')
    ]));

    var titre = h('h3', { id: 'chart-title', text: 'Chiffre d\'affaires hors taxe par mois' });
    var box = h('div', { id: 'chart', class: 'chart' });
    var tbl = h('table', { class: 'table small-table' }, [
      h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Mois' }), h('th', { scope: 'col', class: 'num', text: 'CA HT' })])]),
      h('tbody', null, r.parMois.map(function (m) { return h('tr', null, [h('td', { text: Ch.monthLabel(m.mois, true) }), h('td', { class: 'num', text: U.fmtEur(m.ht) })]); }))
    ]);
    container.appendChild(h('div', { class: 'card chart-card' }, [
      titre, r.periode.filtre ? h('p', { class: 'small chart-filtre', text: resumeFiltres(r) }) : null, box,
      h('details', { class: 'values' }, [h('summary', { text: 'Voir les valeurs du graphique' }), tbl])
    ]));
    dernier = { box: box, parMois: r.parMois, titre: titre, opts: { moyenne: r.moyenneMensuelle, moisMax: r.moisMax, moisMin: r.moisMin } };

    container.appendChild(h('div', { class: 'two-col' }, [
      carteAnciennete(r),
      h('section', { class: 'card', 'aria-labelledby': 'rep-top-t' }, [h('h3', { id: 'rep-top-t', text: 'Cinq premiers clients' }), h('div', { class: 'table-wrap' }, [tableTop(r)])])
    ]));
    container.appendChild(carteComparaison(r));

    var ap = table && table.rapport ? table.rapport : null;
    var pts = [];
    if (ap && ap.avertissements) pts = ap.avertissements.slice();
    if (table && table.source && table.source.nbLues > table.source.nbRetenues) pts.unshift((table.source.nbLues - table.source.nbRetenues) + ' ligne(s) ignorée(s) au chargement, voir le rapport d\'import');
    if (pts.length && d.mode === 'client') container.appendChild(h('p', { class: 'notice', text: 'Points d\'attention : ' + pts.join(' ; ') + '.' }));
    container.appendChild(importation(d, false));

    dessiner();
  }

  /** Zone d'import de l'export de factures : repliée quand des factures sont déjà chargées. */
  function importation(d, ouvert) {
    var det = h('details', { class: 'import-details secondary' }, [
      h('summary', { text: 'Importer ou remplacer l\'export de factures' }), etat.grid
    ]);
    det.open = ouvert || etat.importOuvert;
    det.addEventListener('toggle', function () { etat.importOuvert = det.open; });
    return det;
  }

  /** Redessine le graphique (appelé quand le panneau devient visible et au redimensionnement). */
  function dessiner() {
    if (!dernier || !dernier.box.isConnected || !dernier.box.offsetParent) return;
    Ch.histogrammeMensuel(dernier.box, dernier.parMois, { titre: dernier.titre, titreId: 'chart-title', descId: 'chart-desc' }, dernier.opts);
  }

  /** Oublie les filtres, la grille et le dernier graphique (effacement de la session). */
  function reinitialiser() {
    etat.cle = ''; etat.grid = null; etat.filtres = { du: null, au: null, client: null }; etat.importOuvert = false; etat.msg = '';
    dernier = null;
  }

  E.views.reporting = { render: render, dessiner: dessiner, reinitialiser: reinitialiser };
})(typeof self !== 'undefined' ? self : this);
