/* Flow Inbox : écran D, tableau de suivi (aspect tableur : une ligne par demande, tri, filtres, export CSV, aperçu du tableau Google Sheets). */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var S = FI.ui.store;
  var C = FI.ui.composants;
  var Suivi = FI.core.suivi;
  var Dates = FI.core.dates;
  var Fmt = FI.core.format;
  var Data = root.FlowData;

  var NOM_FICHIER = 'flow-inbox-suivi-demonstration.csv';

  function options(select, valeurs, courant) {
    valeurs.forEach(function (v) { select.appendChild(h('option', { value: v[0], text: v[1] })); });
    select.value = courant;
  }

  function render(c) {
    var st = S.etat.suivi;
    var toutes = Suivi.lignes(S.emails(), S.ctx, { ref: S.ref(), delai: S.delai(), jours: S.jours(), inclureClasses: st.classes });

    var titre = h('h1', { id: 'titre-vue', tabindex: '-1', text: 'Tableau de suivi' });
    var statut = h('p', { class: 'statut-liste', role: 'status', 'aria-live': 'polite' });
    var corps = h('tbody');
    var table = h('table', { class: 'table tableur' });
    var apercu = h('div', { class: 'apercu-sheets' });
    var messageExport = h('p', { class: 'statut-action', role: 'status', 'aria-live': 'polite' });

    var statutsPresents = {};
    toutes.forEach(function (r) { statutsPresents[r.statutId] = true; });
    var selStatut = h('select', { id: 'f-statut', class: 'champ', onchange: function () { st.statut = this.value; majTable(); } });
    options(selStatut, [['', 'Tous les statuts']].concat(Object.keys(Data.statutsTraitement).filter(function (k) { return statutsPresents[k]; }).map(function (k) { return [k, Data.statutsTraitement[k]]; })), st.statut);
    var selService = h('select', { id: 'f-service', class: 'champ', onchange: function () { st.service = this.value; majTable(); } });
    options(selService, [['', 'Tous les services'], ['aucun', 'Service non indiqué']].concat(S.ctx.services.map(function (s) { return [s.id, s.libelle]; })).concat([['hors_catalogue', 'Hors catalogue']]), st.service);
    var selResp = h('select', { id: 'f-resp', class: 'champ', onchange: function () { st.responsable = this.value; majTable(); } });
    options(selResp, [['', 'Tous les responsables'], ['aucun', 'Non attribué']].concat(S.ctx.equipe.map(function (p) { return [p.id, p.nom]; })), st.responsable);
    var texte = h('input', { type: 'search', id: 'f-texte', class: 'champ', value: st.texte, autocomplete: 'off', placeholder: 'Entreprise, contact, budget…', 'data-fk': 'f-texte', oninput: function () { st.texte = texte.value; majTable(); } });
    var caseClasses = h('input', { type: 'checkbox', id: 'f-classes', onchange: function () { st.classes = this.checked; S.emettre(); } });
    caseClasses.checked = st.classes;

    function lignesAffichees() {
      var f = Suivi.filtrer(toutes, { statut: st.statut, service: st.service, responsable: st.responsable, texte: st.texte });
      return Suivi.trier(f, st.tri, st.sens, Data.statutsTraitement);
    }

    function surTri(cle) {
      if (st.tri === cle) st.sens = st.sens === 'asc' ? 'desc' : 'asc';
      else { st.tri = cle; st.sens = cle === 'recu' || cle === 'reponse' ? 'desc' : 'asc'; }
      majTable();
      var b = table.querySelector('[data-fk="tri-' + cle + '"]');
      if (b) b.focus();
    }

    function enTete() {
      var tr = h('tr');
      Suivi.COLONNES.forEach(function (col, i) {
        tr.appendChild(C.thTri(col.libelle, col.id, st, surTri, { classe: 'col-' + col.id + (i < 2 ? ' fixe fixe-' + (i + 1) : '') }));
      });
      return h('thead', null, [tr]);
    }

    function cellule(r, col) {
      switch (col) {
        case 'recu': return [h('span', { text: Dates.fmtDate(r.recu) }), h('span', { class: 'sous', text: Dates.fmtHeure(r.recu) })];
        case 'entreprise': return [h('a', { href: '#message/' + r.id, text: r.entreprise, 'data-fk': 'ligne-' + r.id })];
        case 'contact': return [h('span', { text: r.contact }), h('span', { class: 'sous', text: r.contactMail })];
        case 'service': return [r.service];
        case 'budget': return [h('span', { text: r.budget })];
        case 'delai': return [h('span', { text: r.delai })];
        case 'statut': return [C.pastilleStatut(r.statutId)];
        case 'responsable': return [r.responsable];
        case 'reponse': return [r.reponse ? Dates.fmtDateHeure(r.reponse) : h('span', { class: 'aucune', text: 'Aucune' })];
        case 'relance':
          return [r.relanceEtat === 'retard'
            ? h('span', { class: 'retard' }, [U.icon('alerte'), h('span', { text: r.relance })])
            : h('span', { class: r.relanceEtat === 'surveiller' ? 'surveiller' : 'sans-objet', text: r.relance })];
      }
      return [];
    }

    function majApercu(rows) {
      U.clear(apercu);
      var a = Suivi.apercuSheets(rows, Data.statutsTraitement, 5);
      var t = h('table', { class: 'sheets' }, [
        h('caption', { class: 'visually-hidden', text: 'Aperçu des premières lignes qui seraient écrites dans le tableau Google Sheets' }),
        h('thead', null, [h('tr', null, [h('th', { scope: 'col', class: 'coin', text: '' })].concat(a.lettres.map(function (l) { return h('th', { scope: 'col', class: 'lettre', text: l }); })))]),
        h('tbody', null, [
          h('tr', { class: 'entete-sheets' }, [h('th', { scope: 'row', class: 'num', text: '1' })].concat(a.entetes.map(function (x) { return h('td', { text: x }); })))
        ].concat(a.lignes.map(function (l, i) {
          return h('tr', null, [h('th', { scope: 'row', class: 'num', text: String(i + 2) })].concat(l.map(function (x) { return h('td', { text: x }); })));
        })))
      ]);
      apercu.appendChild(h('div', { class: 'table-wrap' }, [t]));
      apercu.appendChild(h('p', { class: 'small', text: a.restantes > 0 ? '… et ' + a.restantes + ' ligne' + (a.restantes > 1 ? 's' : '') + ' de plus.' : 'Toutes les lignes affichées sont montrées.' }));
    }

    function majTable() {
      var rows = lignesAffichees();
      U.clear(corps);
      if (!rows.length) {
        corps.appendChild(h('tr', { class: 'vide' }, [h('td', { colspan: String(Suivi.COLONNES.length) }, 'Aucune demande ne correspond à ces filtres.')]));
      }
      rows.forEach(function (r) {
        var tr = h('tr', { class: r.relanceEtat === 'retard' ? 'en-retard' : null });
        Suivi.COLONNES.forEach(function (col, i) {
          tr.appendChild(h('td', { class: 'col-' + col.id + (i < 2 ? ' fixe fixe-' + (i + 1) : ''), 'data-label': col.libelle }, cellule(r, col.id)));
        });
        corps.appendChild(tr);
      });
      statut.textContent = rows.length + (rows.length > 1 ? ' demandes affichées' : ' demande affichée') + ' sur ' + toutes.length +
        ' (une ligne par demande ; un fil de plusieurs messages compte pour une ligne).';
      var ancien = table.querySelector('thead');
      if (ancien) table.replaceChild(enTete(), ancien);
      majApercu(rows);
    }

    var exporter = U.bouton('Exporter en CSV', { primaire: true, icone: 'telecharger', fk: 'export-csv', onclick: function () {
      var rows = lignesAffichees();
      U.telecharger(NOM_FICHIER, Suivi.versCsv(rows, Data.statutsTraitement), 'text/csv;charset=utf-8');
      messageExport.textContent = 'Fichier « ' + NOM_FICHIER + ' » préparé : ' + rows.length + ' ligne' + (rows.length > 1 ? 's' : '') + '. Il est créé sur cet ordinateur ; rien n\'est envoyé. Les cellules commençant par =, +, - ou @ sont neutralisées.';
      U.annoncer(messageExport.textContent);
    } });

    table.appendChild(h('caption', { class: 'visually-hidden', text: 'Une ligne par demande' }));
    table.appendChild(enTete());
    table.appendChild(corps);

    var barre = h('div', { class: 'toolbar barre-filtres', role: 'group', 'aria-label': 'Filtres du tableau' }, [
      h('div', { class: 'champ-groupe' }, [h('label', { for: 'f-texte', text: 'Rechercher' }), texte]),
      h('div', { class: 'champ-groupe' }, [h('label', { for: 'f-statut', text: 'Statut' }), selStatut]),
      h('div', { class: 'champ-groupe' }, [h('label', { for: 'f-service', text: 'Service' }), selService]),
      h('div', { class: 'champ-groupe' }, [h('label', { for: 'f-resp', text: 'Responsable' }), selResp])
    ]);

    U.clear(c);
    c.appendChild(h('section', { class: 'vue-suivi', 'aria-labelledby': 'titre-vue' }, [
      titre,
      h('p', { class: 'lead', text: 'Une ligne par demande qualifiée ou en revue, au ' + Dates.fmtDate(S.ref()) + '. Les budgets sont ceux que les prospects ont déclarés, avec leur type : ils ne sont pas garantis et ne sont pas des prix de l\'agence.' }),
      barre,
      h('div', { class: 'toolbar' }, [
        h('div', { class: 'case-option' }, [caseClasses, h('label', { for: 'f-classes', text: 'Inclure les messages classés sans suite (fournisseurs, candidatures, démarchages, indésirables, ignorés)' })]),
        exporter
      ]),
      messageExport,
      statut,
      h('div', { class: 'table-wrap table-tableur', role: 'region', 'aria-label': 'Tableau de suivi, défilement horizontal au clavier', tabindex: '0' }, [table]),
      h('details', { class: 'apercu-details' }, [
        h('summary', { text: 'Aperçu : ce qui serait écrit dans le tableau Google Sheets du pilote' }),
        h('p', { class: 'small', text: 'Simulation locale : aucune connexion à Google, aucun tableau n\'est créé ni modifié. Voici les premières lignes, avec les mêmes cellules que le fichier CSV.' }),
        apercu
      ])
    ]));
    majTable();
  }

  FI.views.suivi = { render: render, titre: 'Tableau de suivi' };
})(typeof self !== 'undefined' ? self : this);
