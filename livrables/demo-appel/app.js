/* Équerre : interface de la démonstration. Scripts classiques, aucune requête réseau.
 * Les données saisies ou chargées ne sont jamais envoyées : tout se passe dans le navigateur. */
(function () {
  'use strict';

  var L = window.EquerreLogic;
  var D = window.EquerreData;
  var MAX_ROWS_SHOWN = 300;
  var MAX_FILE_BYTES = 10 * 1024 * 1024;

  var state = {
    tiers: { own: false, name: '', columns: null, analysis: null, filter: 'avec', open: {} },
    rep: { own: false, name: '', invoices: null, warnings: null, refDate: D.referenceDate },
    inv: 0
  };

  /* ---------- Petits outils DOM ---------- */

  function $(id) { return document.getElementById(id); }

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  var eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var eur2 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var num1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  var pct0 = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 });
  var pct1 = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 });

  function fmtDate(iso) {
    var p = String(iso || '').split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
  }

  function groupSiren(s) {
    var c = L.cleanId(s);
    return /^\d{9}$/.test(c) ? c.slice(0, 3) + ' ' + c.slice(3, 6) + ' ' + c.slice(6) : String(s || '');
  }

  function showMsg(el, text) {
    if (!text) { el.hidden = true; el.textContent = ''; return; }
    el.textContent = text;
    el.hidden = false;
  }

  /* ---------- Téléchargements locaux (Blob) ---------- */

  function download(filename, text) {
    var blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- Lecture locale d'un fichier ---------- */

  function readFile(file, done, fail) {
    if (file.size > MAX_FILE_BYTES) { fail('Fichier trop volumineux pour la démonstration (10 Mo maximum).'); return; }
    function read(encoding, cb) {
      var fr = new FileReader();
      fr.onload = function () { cb(String(fr.result)); };
      fr.onerror = function () { fail('Lecture impossible. Le fichier n\'a pas été modifié ni envoyé.'); };
      fr.readAsText(file, encoding);
    }
    read('UTF-8', function (text) {
      if (text.indexOf('�') >= 0) read('windows-1252', done); else done(text);
    });
  }

  /* ---------- Bandeau ---------- */

  function updateBanner() {
    var own = [];
    if (state.tiers.own) own.push('fichier clients et fournisseurs');
    if (state.rep.own) own.push('reporting');
    $('banner-main').textContent = own.length
      ? 'Démonstration : votre fichier est affiché'
      : 'Données fictives de démonstration';
    $('banner-extra').textContent = own.length
      ? 'Onglets concernés : ' + own.join(', ') + ' (traité dans votre navigateur, rien n\'est envoyé).'
      : '';
    var printHead = document.querySelector('.print-head');
    if (printHead) {
      printHead.textContent = own.length
        ? 'Équerre : rapport de démonstration. Contient des données chargées par l\'utilisateur.'
        : 'Équerre : rapport de démonstration. Données fictives.';
    }
  }

  /* ---------- Onglets ---------- */

  var TABS = ['tiers', 'mentions', 'reporting'];

  function selectTab(name, focus) {
    TABS.forEach(function (t) {
      var tab = $('tab-' + t);
      var panel = $('panel-' + t);
      var on = t === name;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      panel.hidden = !on;
      if (on && focus) tab.focus();
    });
    if (name === 'reporting') renderChart();
    try { history.replaceState(null, '', '#' + name); } catch (e) { /* file:// restrictif : sans effet */ }
  }

  function initTabs() {
    TABS.forEach(function (t, i) {
      $('tab-' + t).addEventListener('click', function () { selectTab(t, false); });
      $('tab-' + t).addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % TABS.length;
        else if (e.key === 'ArrowLeft') j = (i + TABS.length - 1) % TABS.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = TABS.length - 1;
        if (j !== null) { e.preventDefault(); selectTab(TABS[j], true); }
      });
    });
    var start = (location.hash || '').replace('#', '');
    if (TABS.indexOf(start) >= 0) selectTab(start, false);
  }

  /* ---------- Onglet 1 : fichier de tiers ---------- */

  function tiersData() {
    if (!state.tiers.analysis) {
      state.tiers.columns = null;
      state.tiers.analysis = L.analyzeThirdParties(L.rowsToThirdParties(D.tiers));
    }
    return state.tiers.analysis;
  }

  function filteredItems(a) {
    var f = state.tiers.filter;
    return a.items.filter(function (it) {
      if (f === 'toutes') return true;
      if (f === 'avec') return it.anomalies.some(function (x) { return x.severity === 'anomalie'; });
      return it.anomalies.some(function (x) { return x.code === f; });
    });
  }

  function renderTiers(focusKey) {
    var a = tiersData();
    var st = state.tiers;
    var src = $('tiers-source');
    src.textContent = st.own ? 'Source : votre fichier (' + st.name + ')' : 'Source : données fictives de démonstration';
    src.className = 'source' + (st.own ? ' own' : '');
    $('reset-tiers').hidden = !st.own;

    $('tiers-score').textContent = a.score === null ? '–' : String(a.score);
    $('tiers-bar').style.width = (a.score || 0) + '%';
    $('tiers-score-text').textContent = a.total
      ? a.clean + ' ligne' + (a.clean > 1 ? 's' : '') + ' sur ' + a.total + ' sans anomalie.'
      : 'Aucune ligne à analyser.';

    var chips = $('tiers-chips');
    clear(chips);
    function chip(key, label, n) {
      chips.appendChild(h('button', {
        type: 'button', class: 'chip', 'data-key': 'chip-' + key, 'aria-pressed': st.filter === key ? 'true' : 'false',
        onclick: function () { st.filter = key; renderTiers('chip-' + key); }
      }, [label, h('span', { class: 'n', text: '(' + n + ')' })]));
    }
    chip('avec', 'Avec anomalie', a.withAnomaly);
    chip('toutes', 'Toutes les lignes', a.total);
    L.ANOMALY_TYPES.forEach(function (t) { if (a.counts[t.code] > 0) chip(t.code, t.label, a.counts[t.code]); });

    var items = filteredItems(a);
    var body = $('tiers-body');
    clear(body);
    items.slice(0, MAX_ROWS_SHOWN).forEach(function (it) {
      var isOpen = !!st.open[it.ligne];
      var badges = it.anomalies.map(function (x) {
        return h('span', { class: 'badge' + (x.severity === 'anomalie' ? '' : ' note-b'), text: x.label });
      });
      var btn = it.anomalies.length ? h('button', {
        type: 'button', class: 'toggle', 'data-key': 'row-' + it.ligne, 'aria-expanded': isOpen ? 'true' : 'false',
        onclick: function () { st.open[it.ligne] = !st.open[it.ligne]; renderTiers('row-' + it.ligne); }
      }, [isOpen ? 'Masquer' : 'Détail', h('span', { class: 'visually-hidden', text: ' ligne ' + it.ligne })]) : null;
      body.appendChild(h('tr', null, [
        h('td', { class: 'num', text: String(it.ligne) }),
        h('td', { text: it.row.type }),
        h('td', { text: it.row.nom }),
        h('td', { class: 'mono col-siren', text: groupSiren(it.row.siren) }),
        h('td', null, badges.length ? badges : [h('span', { class: 'small', text: 'Aucune' })]),
        h('td', null, [btn])
      ]));
      if (isOpen && it.anomalies.length) {
        body.appendChild(h('tr', { class: 'detail' }, [h('td', { colspan: '6' }, [
          h('ul', { class: 'anom-list' }, it.anomalies.map(function (x) {
            return h('li', { class: x.severity === 'anomalie' ? '' : 'note-li' }, [
              h('strong', { text: x.label + ' : ' }), x.detail,
              h('span', { class: 'todo', text: 'À faire : ' + x.action })
            ]);
          }))
        ])]));
      }
    });
    if (!items.length) {
      body.appendChild(h('tr', { class: 'empty-row' }, [h('td', { colspan: '6', text: 'Aucune ligne pour ce filtre.' })]));
    }
    $('tiers-count').textContent = items.length > MAX_ROWS_SHOWN
      ? items.length + ' lignes correspondent ; les ' + MAX_ROWS_SHOWN + ' premières sont affichées. L\'export CSV contient toutes les anomalies.'
      : items.length + ' ligne' + (items.length > 1 ? 's' : '') + ' affichée' + (items.length > 1 ? 's' : '') + ' sur ' + a.total + '.';
    updateBanner();
    if (focusKey) {
      var again = document.querySelector('[data-key="' + focusKey + '"]');
      if (again) again.focus();
    }
  }

  function loadTiersFile(file) {
    var msg = $('tiers-msg');
    readFile(file, function (text) {
      var parsed = L.parseCsv(text);
      var c = L.canonicalizeCsv(parsed, 'tiers');
      if (!parsed.rows.length) { showMsg(msg, 'Le fichier ne contient aucune ligne de données.'); return; }
      if (c.missing.length) {
        showMsg(msg, 'Colonnes obligatoires introuvables : ' + c.missing.join(', ') + '. Téléchargez le modèle CSV pour voir les en-têtes attendus.');
        return;
      }
      var rows = L.rowsToThirdParties(c.records);
      state.tiers.own = true;
      state.tiers.name = file.name;
      state.tiers.columns = c.columns;
      state.tiers.analysis = L.analyzeThirdParties(rows, { columns: c.columns });
      state.tiers.filter = 'avec';
      state.tiers.open = {};
      var info = parsed.rows.length + ' ligne' + (parsed.rows.length > 1 ? 's' : '') + ' lue' + (parsed.rows.length > 1 ? 's' : '') + ' localement, rien n\'a été envoyé.';
      var absentes = L.TIERS_HEADERS.filter(function (x) { return c.columns.indexOf(x) < 0; });
      if (absentes.length) info += ' Colonnes absentes (contrôles correspondants non réalisés) : ' + absentes.join(', ') + '.';
      if (c.ignored.length) info += ' Colonnes ignorées : ' + c.ignored.join(', ') + '.';
      showMsg(msg, info);
      renderTiers();
    }, function (m) { showMsg(msg, m); });
  }

  function initTiers() {
    $('file-tiers').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) loadTiersFile(f);
      e.target.value = '';
    });
    $('tpl-tiers').addEventListener('click', function () { download('modele-fichier-tiers.csv', L.templateCsv('tiers')); });
    $('export-tiers').addEventListener('click', function () {
      download('anomalies-fichier-tiers.csv', L.anomaliesToCsv(tiersData()));
    });
    $('reset-tiers').addEventListener('click', function () {
      state.tiers = { own: false, name: '', columns: null, analysis: null, filter: 'avec', open: {} };
      showMsg($('tiers-msg'), '');
      openFirst();
      renderTiers();
    });
    openFirst();
  }

  function openFirst() {
    var a = tiersData();
    var first = a.items.filter(function (it) { return it.anomalies.some(function (x) { return x.severity === 'anomalie'; }); })[0];
    if (first) state.tiers.open[first.ligne] = true;
  }

  /* ---------- Onglet 2 : mentions des factures ---------- */

  var STATUS = {
    ok: { ico: '✓', txt: 'Présent' },
    manquant: { ico: '✗', txt: 'Manquant' },
    a_verifier: { ico: '?', txt: 'À vérifier' },
    na: { ico: '–', txt: 'Sans objet' }
  };

  function missingSpan() { return h('span', { class: 'missing', text: 'non renseigné' }); }

  function renderInvoiceCard(inv) {
    var card = $('inv-card');
    clear(card);
    var cl = inv.client;
    var linesTable = h('table', { class: 'table inv-lines' }, [
      h('thead', null, [h('tr', null, [
        h('th', { scope: 'col', text: 'Désignation' }), h('th', { scope: 'col', class: 'num', text: 'Qté' }),
        h('th', { scope: 'col', class: 'num', text: 'PU HT' }), h('th', { scope: 'col', class: 'num', text: 'TVA' })
      ])]),
      h('tbody', null, inv.lignes.map(function (l) {
        return h('tr', null, [
          h('td', { text: l.designation }), h('td', { class: 'num', text: String(l.quantite) }),
          h('td', { class: 'num', text: eur2.format(l.prixUnitaireHT) }), h('td', { class: 'num', text: l.tauxTVA + ' %' })
        ]);
      }))
    ]);
    card.appendChild(h('div', { class: 'inv-head' }, [
      h('div', null, [h('h3', { text: 'Facture ' + inv.numero }), h('p', { class: 'small', text: 'Facture fictive de démonstration' })]),
      h('div', null, [
        h('p', null, [h('span', { class: 'inv-k', text: 'Émise le' }), fmtDate(inv.dateEmission)]),
        h('p', null, [h('span', { class: 'inv-k', text: 'Échéance' }), fmtDate(inv.dateEcheance)])
      ])
    ]));
    card.appendChild(h('div', { class: 'inv-parties' }, [
      h('div', null, [
        h('span', { class: 'inv-k', text: 'Vendeur' }), h('p', { text: inv.vendeur.nom }), h('p', { text: inv.vendeur.adresse }),
        h('p', { text: 'SIREN ' + groupSiren(inv.vendeur.siren) }), h('p', { text: 'TVA ' + inv.vendeur.tva })
      ]),
      h('div', null, [
        h('span', { class: 'inv-k', text: 'Client' }), h('p', { text: cl.nom }), h('p', { text: cl.adresse }),
        h('p', null, ['SIREN ', cl.siren ? groupSiren(cl.siren) : missingSpan()])
      ])
    ]));
    card.appendChild(linesTable);
    card.appendChild(h('div', { class: 'inv-totals' }, [
      h('p', { text: 'Total HT : ' + eur2.format(inv.totalHT) }),
      h('p', { text: 'TVA : ' + eur2.format(inv.totalTVA) }),
      h('p', null, [h('strong', { text: 'Total TTC : ' + eur2.format(inv.totalTTC) })])
    ]));
    var liv;
    if (!inv.livraisonDifferente) liv = 'Identique à l\'adresse de facturation';
    else liv = inv.adresseLivraison ? inv.adresseLivraison : missingSpan();
    card.appendChild(h('div', { class: 'inv-meta' }, [
      h('p', null, [h('span', { class: 'inv-k', text: 'Adresse de livraison' }), liv]),
      h('p', null, [h('span', { class: 'inv-k', text: 'Nature de l\'opération' }), inv.natureOperation ? inv.natureOperation : missingSpan()]),
      h('p', null, [h('span', { class: 'inv-k', text: 'Option TVA d\'après les débits' }), inv.optionDebits ? inv.optionDebits : missingSpan()])
    ]));
    if (inv.livraisonDifferente) {
      card.appendChild(h('p', { class: 'small', text: 'Dans cet exemple, la marchandise est livrée à une autre adresse que celle de facturation.' }));
    }
  }

  function checkGroup(title, items) {
    return h('div', null, [
      h('h4', { class: 'label', text: title }),
      h('ul', { class: 'check-list' }, items.map(function (it) {
        var s = STATUS[it.statut];
        return h('li', { class: 's-' + it.statut }, [
          h('span', { class: 'ico', 'aria-hidden': 'true', text: s.ico }),
          h('div', null, [
            h('p', null, [h('span', { class: 'st', text: s.txt }), h('strong', { text: it.label })]),
            h('p', { class: 'why', text: it.explication })
          ])
        ]);
      }))
    ]);
  }

  function renderMentions() {
    var pick = $('inv-pick');
    clear(pick);
    D.factures.forEach(function (f, i) {
      pick.appendChild(h('button', {
        type: 'button', class: 'chip', 'data-key': 'inv-' + i, 'aria-pressed': state.inv === i ? 'true' : 'false',
        onclick: function () { state.inv = i; renderMentions(); var again = document.querySelector('[data-key="inv-' + i + '"]'); if (again) again.focus(); }
      }, [f.titre]));
    });
    var inv = D.factures[state.inv];
    renderInvoiceCard(inv);
    var res = L.checkInvoiceMentions(inv);
    var box = $('inv-check');
    clear(box);
    box.appendChild(h('h3', { text: 'Ce que la démo relève' }));
    box.appendChild(h('p', { class: 'summary', text:
      'Parmi les mentions contrôlées par la démo : nouvelles mentions présentes ' + res.nouvelles.ok + ' sur ' + res.nouvelles.total + ' ; ' +
      'mentions courantes présentes ' + res.classiques.ok + ' sur ' + res.classiques.total + '.' }));
    box.appendChild(checkGroup('Les 4 nouvelles mentions (depuis le 1er septembre 2026)',
      res.items.filter(function (x) { return x.groupe === 'nouvelle'; })));
    box.appendChild(checkGroup('Mentions courantes (liste non exhaustive)',
      res.items.filter(function (x) { return x.groupe === 'classique'; })));
    box.appendChild(h('p', { class: 'small', text: res.noteClassiques + ' Ce contrôle ne constitue pas un conseil fiscal et ne garantit pas la conformité d\'une facture.' }));
  }

  /* ---------- Onglet 3 : reporting ---------- */

  function repData() {
    if (!state.rep.invoices) {
      var n = L.normalizeInvoices(D.exportFacturation);
      state.rep.invoices = n.invoices;
      state.rep.warnings = n.warnings;
    }
    return L.computeReporting(state.rep.invoices, state.rep.refDate);
  }

  var lastReport = null;

  function kpi(label, value, sub, alert) {
    return h('div', { class: 'kpi' + (alert ? ' alert' : '') }, [
      h('p', { class: 'label', text: label }), h('p', { class: 'v', text: value }),
      sub ? h('p', { class: 's', text: sub }) : null
    ]);
  }

  function renderReporting() {
    var st = state.rep;
    var r = repData();
    lastReport = r;
    var src = $('rep-source');
    src.textContent = st.own ? 'Source : votre fichier (' + st.name + ')' : 'Source : export de factures fictif';
    src.className = 'source' + (st.own ? ' own' : '');
    $('reset-rep').hidden = !st.own;
    $('ref-date').value = st.refDate;

    var w = st.warnings;
    var ttcNote = w && w.sansTTC > 0 ? ' (HT pour ' + w.sansTTC + ' facture' + (w.sansTTC > 1 ? 's' : '') + ' sans TTC)' : '';
    var cards = $('rep-cards');
    clear(cards);
    cards.appendChild(kpi('Chiffre d\'affaires HT', eur0.format(r.caHT), r.nbFactures + ' factures émises, ' + r.nbClients + ' clients'));
    cards.appendChild(kpi('Encours non payé', eur0.format(r.encours), r.nbImpayees + ' facture' + (r.nbImpayees > 1 ? 's' : '') + ', TTC' + ttcNote));
    cards.appendChild(kpi('Factures échues', eur0.format(r.echues.total), r.echues.nb + ' facture' + (r.echues.nb > 1 ? 's' : '') + ' au ' + fmtDate(r.refDate), r.echues.nb > 0));
    cards.appendChild(kpi('Délai moyen de paiement', r.delaiMoyenPaiement === null ? 'n.d.' : num1.format(r.delaiMoyenPaiement) + ' jours',
      'de l\'émission au paiement, ' + r.nbPayeesDatees + ' facture' + (r.nbPayeesDatees > 1 ? 's' : '') + ' payée' + (r.nbPayeesDatees > 1 ? 's' : '') + ' datée' + (r.nbPayeesDatees > 1 ? 's' : '')));
    cards.appendChild(kpi('Payées en retard', r.partPayeesEnRetard === null ? 'n.d.' : pct0.format(r.partPayeesEnRetard),
      r.nbPayeesEnRetard + ' sur ' + r.nbPayeesDatees + ' payées après l\'échéance'));
    cards.appendChild(kpi('Part des 5 premiers clients', pct0.format(r.topPart), 'du chiffre d\'affaires HT'));

    // Premiers clients
    var top = $('top-table');
    clear(top);
    top.appendChild(h('thead', null, [h('tr', null, [
      h('th', { scope: 'col', text: 'Client' }), h('th', { scope: 'col', class: 'num', text: 'CA HT' }), h('th', { scope: 'col', class: 'num', text: 'Part' })
    ])]));
    top.appendChild(h('tbody', null, r.topClients.map(function (c) {
      return h('tr', null, [
        h('td', { text: c.client }), h('td', { class: 'num', text: eur0.format(c.ht) }),
        h('td', { class: 'num' }, [
          h('span', { class: 'share', style: 'width:' + Math.max(2, Math.round(c.part * 80)) + 'px', 'aria-hidden': 'true' }),
          pct1.format(c.part)
        ])
      ]);
    })));
    if (r.nbClients > 5) {
      top.appendChild(h('tfoot', null, [h('tr', null, [
        h('td', { text: 'Autres clients (' + (r.nbClients - 5) + ')' }), h('td', { class: 'num', text: eur0.format(r.autresHT) }),
        h('td', { class: 'num', text: pct1.format(r.autresPart) })
      ])]));
    }

    // Échues par ancienneté
    var ag = $('aging-table');
    clear(ag);
    ag.appendChild(h('thead', null, [h('tr', null, [
      h('th', { scope: 'col', text: 'Retard' }), h('th', { scope: 'col', class: 'num', text: 'Factures' }),
      h('th', { scope: 'col', class: 'num', text: 'Montant' }), h('th', { scope: 'col', class: 'num', text: 'Part de l\'encours' })
    ])]));
    ag.appendChild(h('tbody', null, r.echues.tranches.map(function (t) {
      return h('tr', null, [
        h('td', { text: t.label }), h('td', { class: 'num', text: String(t.nb) }),
        h('td', { class: 'num', text: eur0.format(t.total) }), h('td', { class: 'num', text: pct0.format(t.part) })
      ]);
    }).concat([
      h('tr', null, [
        h('td', { text: 'Pas encore échues' }), h('td', { class: 'num', text: String(r.aEchoir.nb) }),
        h('td', { class: 'num', text: eur0.format(r.aEchoir.total) }), h('td', { class: 'num', text: r.encours ? pct0.format(r.aEchoir.total / r.encours) : '–' })
      ])
    ])));
    ag.appendChild(h('tfoot', null, [h('tr', null, [
      h('td', { text: 'Encours total' }), h('td', { class: 'num', text: String(r.nbImpayees) }),
      h('td', { class: 'num', text: eur0.format(r.encours) }), h('td', { class: 'num', text: r.encours ? '100 %' : '–' })
    ])]));
    var notes = ['Ancienneté = jours écoulés depuis la date d\'échéance, à la date de référence ' + fmtDate(r.refDate) + '.'];
    if (r.sansEcheance.nb) notes.push(r.sansEcheance.nb + ' facture(s) non payée(s) sans date d\'échéance, non classées (' + eur0.format(r.sansEcheance.total) + ').');
    $('aging-note').textContent = notes.join(' ');

    // Valeurs du graphique
    var ct = $('chart-table');
    clear(ct);
    ct.appendChild(h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Mois' }), h('th', { scope: 'col', class: 'num', text: 'CA HT' })])]));
    ct.appendChild(h('tbody', null, r.parMois.map(function (m) {
      return h('tr', null, [h('td', { text: monthLabel(m.mois, true) }), h('td', { class: 'num', text: eur0.format(m.ht) })]);
    })));

    renderChart();
    updateBanner();
    if (w && (w.ignorees || w.sansEcheance || w.payeesSansDate)) {
      var parts = [];
      if (w.ignorees) parts.push(w.ignorees + ' ligne(s) ignorée(s) (date d\'émission, montant HT ou client illisible)');
      if (w.sansEcheance) parts.push(w.sansEcheance + ' facture(s) sans date d\'échéance valide');
      if (w.payeesSansDate) parts.push(w.payeesSansDate + ' facture(s) payée(s) sans date de paiement (exclues du délai moyen)');
      var base = $('rep-msg').hidden ? '' : $('rep-msg').textContent + ' ';
      if (base.indexOf('Points d\'attention') < 0) showMsg($('rep-msg'), base + 'Points d\'attention : ' + parts.join(' ; ') + '.');
    }
  }

  var MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function monthLabel(ym, withYear) {
    var m = MONTHS[+ym.slice(5, 7) - 1];
    return withYear ? m + ' ' + ym.slice(0, 4) : m;
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
    var f = v / p;
    var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return n * p;
  }

  function compactEur(v) {
    if (v >= 1000) return num1.format(Math.round(v / 100) / 10) + ' k€';
    return Math.round(v) + ' €';
  }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, text) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function renderChart() {
    var box = $('chart');
    if (!lastReport || $('panel-reporting').hidden) return;
    var data = lastReport.parMois.slice(-24);
    clear(box);
    var title = 'Chiffre d\'affaires hors taxe par mois' + (lastReport.parMois.length > 24 ? ' (24 derniers mois)' : '');
    $('chart-title').textContent = title;
    if (!data.length) { box.appendChild(h('p', { class: 'small', text: 'Aucune donnée à afficher.' })); return; }

    var rem = (parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16) / 16;
    var W = Math.max(300, Math.round(box.clientWidth || 640));
    var narrow = W < 520;
    var H = Math.round((narrow ? 240 : 300) * rem);
    var m = { l: Math.round((narrow ? 44 : 56) * rem), r: 8, t: Math.round(22 * rem), b: Math.round(44 * rem) };
    var pw = W - m.l - m.r;
    var ph = H - m.t - m.b;
    var max = niceMax(Math.max.apply(null, data.map(function (d) { return d.ht; })));
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-labelledby': 'chart-title chart-desc', preserveAspectRatio: 'xMidYMid meet' });
    svg.appendChild(s('desc', { id: 'chart-desc' }, 'Histogramme du chiffre d\'affaires HT mensuel, de ' + monthLabel(data[0].mois, true) + ' à ' + monthLabel(data[data.length - 1].mois, true) + '. Les valeurs sont dans le tableau sous le graphique.'));
    var ticks = 4;
    for (var i = 0; i <= ticks; i++) {
      var val = (max * i) / ticks;
      var y = m.t + ph - (ph * i) / ticks;
      svg.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: i === 0 ? 'axis' : 'grid' }));
      svg.appendChild(s('text', { x: m.l - 6, y: y + 4, 'text-anchor': 'end', 'font-size': (narrow ? 11 : 13) * rem }, compactEur(val)));
    }
    var slot = pw / data.length;
    var bw = Math.max(8, slot * 0.62);
    var fs = (narrow ? 10 : 12) * rem;
    var showValues = W >= 640;
    data.forEach(function (d, k) {
      var bh = max ? (ph * d.ht) / max : 0;
      var x = m.l + slot * k + (slot - bw) / 2;
      var y2 = m.t + ph - bh;
      var g = s('g');
      g.appendChild(s('rect', { x: x, y: y2, width: bw, height: Math.max(0, bh), class: 'bar-r' }));
      g.appendChild(s('title', {}, monthLabel(d.mois, true) + ' : ' + eur0.format(d.ht)));
      svg.appendChild(g);
      if (showValues) svg.appendChild(s('text', { x: x + bw / 2, y: y2 - 5, 'text-anchor': 'middle', 'font-size': 11 * rem }, compactEur(d.ht)));
      var cx = x + bw / 2;
      svg.appendChild(s('text', { x: cx, y: H - m.b + 16 * rem, 'text-anchor': 'middle', 'font-size': fs }, monthLabel(d.mois, false).replace('.', '')));
      if (k === 0 || d.mois.slice(5, 7) === '01') {
        svg.appendChild(s('text', { x: cx, y: H - m.b + 31 * rem, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': '700' }, d.mois.slice(0, 4)));
      }
    });
    box.appendChild(svg);
  }

  function loadRepFile(file) {
    var msg = $('rep-msg');
    readFile(file, function (text) {
      var parsed = L.parseCsv(text);
      var c = L.canonicalizeCsv(parsed, 'factures');
      if (!parsed.rows.length) { showMsg(msg, 'Le fichier ne contient aucune ligne de données.'); return; }
      if (c.missing.length) {
        showMsg(msg, 'Colonnes obligatoires introuvables : ' + c.missing.join(', ') + '. Téléchargez le modèle CSV pour voir les en-têtes attendus.');
        return;
      }
      var n = L.normalizeInvoices(c.records);
      if (!n.invoices.length) { showMsg(msg, 'Aucune facture exploitable : vérifiez les formats de date (AAAA-MM-JJ ou JJ/MM/AAAA) et de montant.'); return; }
      state.rep.own = true;
      state.rep.name = file.name;
      state.rep.invoices = n.invoices;
      state.rep.warnings = n.warnings;
      var today = new Date();
      state.rep.refDate = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
      showMsg(msg, n.invoices.length + ' facture' + (n.invoices.length > 1 ? 's' : '') + ' lue' + (n.invoices.length > 1 ? 's' : '') + ' localement, rien n\'a été envoyé. Date de référence : aujourd\'hui (modifiable).');
      renderReporting();
    }, function (m) { showMsg(msg, m); });
  }

  function initReporting() {
    $('file-rep').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) loadRepFile(f);
      e.target.value = '';
    });
    $('tpl-rep').addEventListener('click', function () { download('modele-export-factures.csv', L.templateCsv('factures')); });
    $('reset-rep').addEventListener('click', function () {
      state.rep = { own: false, name: '', invoices: null, warnings: null, refDate: D.referenceDate };
      showMsg($('rep-msg'), '');
      renderReporting();
    });
    $('ref-date').addEventListener('change', function (e) {
      var v = L.parseDate(e.target.value);
      if (v) { state.rep.refDate = v; renderReporting(); }
    });
    var timer = null;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(renderChart, 120);
    });
  }

  /* ---------- Impression ---------- */

  function initPrint() {
    $('btn-print').addEventListener('click', function () { window.print(); });
    window.addEventListener('beforeprint', function () {
      var d = document.querySelector('.values');
      if (d) d.open = true;
      renderChart();
    });
  }

  /* ---------- Démarrage ---------- */

  initTabs();
  initTiers();
  initReporting();
  initPrint();
  renderTiers();
  renderMentions();
  renderReporting();
})();
