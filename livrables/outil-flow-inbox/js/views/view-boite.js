/* Flow Inbox : écran A, boîte de réception (liste des messages, filtres avec compteurs, recherche, tri). */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var S = FI.ui.store;
  var C = FI.ui.composants;
  var Dem = FI.core.demandes;
  var Dates = FI.core.dates;
  var Ind = FI.core.indicateurs;
  var Fmt = FI.core.format;
  var Data = root.FlowData;

  function lien(id) { return '#message/' + id; }

  function ligne(e, nbFil) {
    var jours = S.jours();
    var retard = Dem.enRetard(e, S.ref(), S.delai(), jours);
    var nbRevue = e.revue.length;
    var tr = h('tr', { class: 'ligne-msg' + (retard ? ' en-retard' : ''), 'data-id': e.id, onclick: function (ev) {
      if (ev.target.closest && ev.target.closest('a,button')) return;
      root.location.hash = lien(e.id);
    } });
    tr.appendChild(h('td', { 'data-label': 'Expéditeur', class: 'c-exp' }, [h('strong', { text: e.de.nom }), h('span', { class: 'sous', text: e.de.adresse })]));
    tr.appendChild(h('td', { 'data-label': 'Objet', class: 'c-objet' }, [
      h('a', { href: lien(e.id), class: 'lien-msg', 'data-fk': 'msg-' + e.id }, [e.objet, h('span', { class: 'visually-hidden', text: ' (message ' + e.id + ')' })]),
      h('span', { class: 'marques' }, [
        nbRevue ? h('span', { class: 'marque-revue' }, [U.icon('oeil'), h('span', { text: nbRevue + (nbRevue > 1 ? ' raisons de revue' : ' raison de revue') })]) : null,
        e.pieces_jointes.length ? h('span', { class: 'marque-pj' }, [U.icon('document'), h('span', { text: 'Pièce jointe non lue' })]) : null,
        nbFil > 1 ? h('span', { class: 'marque-fil' }, [U.icon('fil'), h('span', { text: 'Fil de ' + nbFil + ' messages' })]) : null
      ])
    ]));
    tr.appendChild(h('td', { 'data-label': 'Extrait', class: 'c-extrait' }, [h('span', { class: 'extrait', text: Fmt.extrait(e.corps, 150) })]));
    tr.appendChild(h('td', { 'data-label': 'Reçu le', class: 'c-date' }, [
      h('span', { text: Dates.fmtCourt(e.date) }),
      Dates.estWeekEnd(e.date) ? h('span', { class: 'sous', text: 'Reçu un week-end' }) : null
    ]));
    tr.appendChild(h('td', { 'data-label': 'Catégorie', class: 'c-cat' }, [C.pastilleCategorie(e.categorie)]));
    tr.appendChild(h('td', { 'data-label': 'Statut', class: 'c-statut' }, [C.pastilleStatut(e.traitement.statut)]));
    tr.appendChild(h('td', { 'data-label': 'Ancienneté', class: 'c-anc' }, [
      h('span', { text: C.ancienneteTexte(e, S.ref(), jours) }),
      retard ? C.pastilleRetard(Dem.anciennete(e, S.ref(), jours)) : null
    ]));
    return tr;
  }

  function render(c) {
    var st = S.etat.boite;
    var tous = S.emails();
    var nbParFil = {};
    tous.forEach(function (e) { nbParFil[e.fil] = (nbParFil[e.fil] || 0) + 1; });

    var debut = tous[0].date, fin = tous[tous.length - 1].date;
    var titre = h('h1', { id: 'titre-vue', tabindex: '-1', text: 'Boîte de réception' });
    var intro = h('p', { class: 'lead' }, [
      Data.agence.adresse_boite + ' · ' + tous.length + ' messages reçus du ' + Dates.fmtJourLong(debut) + ' au ' + Dates.fmtJourLong(fin) + '. ',
      'Situation au ' + Dates.fmtJourLong(S.ref()) + ', ' + Dates.fmtHeure(S.ref()) + ' (date de référence fixe de la démonstration).'
    ]);

    var chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrer les messages' });
    var statut = h('p', { class: 'statut-liste', role: 'status', 'aria-live': 'polite' });
    var corps = h('tbody');
    var table = h('table', { class: 'table liste' });

    function majChips() {
      U.clear(chips);
      var n = Dem.compteurs(S.emails());
      Dem.FILTRES.forEach(function (f) {
        chips.appendChild(h('button', {
          type: 'button', class: 'chip', 'aria-pressed': st.filtre === f.id ? 'true' : 'false', 'data-fk': 'chip-' + f.id, title: f.aide,
          onclick: function () {
            st.filtre = f.id; majChips(); majListe();
            var b = chips.querySelector('[data-fk="chip-' + f.id + '"]');
            if (b) b.focus();
          }
        }, [f.libelle, h('span', { class: 'n', text: ' ' + n[f.id] })]));
      });
    }

    function surTri(cle) {
      if (st.tri === cle) st.sens = st.sens === 'asc' ? 'desc' : 'asc';
      else { st.tri = cle; st.sens = Dem.CLES_TRI[cle].sens; }
      majListe();
      majTri();
      var b = table.querySelector('[data-fk="tri-' + cle + '"]');
      if (b) b.focus();
    }

    function majTri() {
      var sel = document.getElementById('tri-boite');
      if (sel) sel.value = st.tri;
      var sens = document.getElementById('sens-boite');
      if (sens) sens.textContent = st.sens === 'asc' ? 'Ordre croissant' : 'Ordre décroissant';
    }

    function enTete() {
      var thead = h('thead');
      var tr = h('tr');
      tr.appendChild(C.thTri('Expéditeur', 'expediteur', st, surTri));
      tr.appendChild(C.thTri('Objet', 'objet', st, surTri));
      tr.appendChild(h('th', { scope: 'col', class: 'c-extrait', text: 'Extrait' }));
      tr.appendChild(C.thTri('Reçu le', 'date', st, surTri));
      tr.appendChild(C.thTri('Catégorie', 'categorie', st, surTri));
      tr.appendChild(C.thTri('Statut', 'statut', st, surTri));
      tr.appendChild(C.thTri('Ancienneté', 'anciennete', st, surTri));
      thead.appendChild(tr);
      return thead;
    }

    function majListe() {
      var tous2 = S.emails();
      var liste = Dem.trier(Dem.rechercher(Dem.filtrer(tous2, st.filtre), st.q), st.tri, st.sens, {
        ref: S.ref(), jours: S.jours(), categories: Data.categories, statuts: Data.statutsTraitement
      });
      var semChoisie = st.semaine !== '' ? S.semaines()[parseInt(st.semaine, 10)] : null;
      if (semChoisie) liste = liste.filter(function (e) { return Ind.dansSemaine(e.date, semChoisie); });
      st.liste = liste.map(function (e) { return e.id; });
      U.clear(corps);
      if (!liste.length) {
        corps.appendChild(h('tr', { class: 'vide' }, [h('td', { colspan: '7' }, [
          'Aucun message ne correspond à ce filtre et à cette recherche. ',
          U.bouton('Tout afficher', { discret: true, onclick: function () { st.filtre = 'toutes'; st.q = ''; st.semaine = ''; recherche.value = ''; selSem.value = ''; majChips(); majListe(); } })
        ])]));
      } else {
        liste.forEach(function (e) { corps.appendChild(ligne(e, nbParFil[e.fil])); });
      }
      statut.textContent = liste.length + (liste.length > 1 ? ' messages affichés' : ' message affiché') + ' sur ' + tous2.length +
        ' · filtre « ' + Dem.filtre(st.filtre).libelle + ' »' + (semChoisie ? ' · ' + semChoisie.libelle.toLowerCase() : '') + (st.q ? ' · recherche « ' + st.q + ' »' : '');
      // Les en-têtes se redessinent pour refléter le tri courant.
      var ancien = table.querySelector('thead');
      var neuf = enTete();
      if (ancien) table.replaceChild(neuf, ancien);
    }

    var recherche = h('input', {
      type: 'search', id: 'recherche-boite', class: 'champ', autocomplete: 'off', value: st.q, 'data-fk': 'recherche',
      placeholder: 'Nom, objet, texte, entreprise…',
      oninput: function () { st.q = recherche.value; majListe(); }
    });
    var selSem = h('select', { id: 'sem-boite', class: 'champ', 'data-fk': 'sem-boite', onchange: function () { st.semaine = this.value; majListe(); } },
      [h('option', { value: '', text: 'Toutes les semaines' })].concat(S.semaines().map(function (w) { return h('option', { value: String(w.index), text: w.libelle }); })));
    selSem.value = st.semaine;
    var selTri = h('select', { id: 'tri-boite', class: 'champ', onchange: function () {
      st.tri = this.value; st.sens = Dem.CLES_TRI[st.tri].sens; majListe(); majTri();
    } }, Object.keys(Dem.CLES_TRI).map(function (k) { return h('option', { value: k, text: Dem.CLES_TRI[k].libelle }); }));
    selTri.value = st.tri;
    var sens = h('button', { type: 'button', id: 'sens-boite', class: 'btn btn-petit', onclick: function () {
      st.sens = st.sens === 'asc' ? 'desc' : 'asc'; majListe(); majTri();
    } });

    var barre = h('div', { class: 'toolbar barre-boite' }, [
      h('div', { class: 'champ-groupe' }, [h('label', { for: 'recherche-boite', text: 'Rechercher' }), recherche]),
      h('div', { class: 'champ-groupe' }, [h('label', { for: 'sem-boite', text: 'Semaine de réception' }), selSem]),
      h('div', { class: 'champ-groupe' }, [h('label', { for: 'tri-boite', text: 'Trier par' }), selTri]),
      h('div', { class: 'champ-groupe' }, [h('span', { class: 'label-vide', 'aria-hidden': 'true', text: ' ' }), sens])
    ]);

    table.appendChild(h('caption', { class: 'visually-hidden', text: 'Messages de la boîte de réception' }));
    table.appendChild(enTete());
    table.appendChild(corps);

    U.clear(c);
    c.appendChild(h('section', { 'aria-labelledby': 'titre-vue', class: 'vue-boite' }, [
      titre, intro, chips, barre, statut,
      h('div', { class: 'table-wrap table-liste' }, [table]),
      h('p', { class: 'note', text: 'Les catégories, statuts et informations relevées de cette démonstration sont fournis avec les données fictives. Ils ne mesurent aucune précision de classement.' })
    ]));
    majChips();
    majListe();
    majTri();
  }

  FI.views.boite = { render: render, titre: 'Boîte de réception' };
})(typeof self !== 'undefined' ? self : this);
