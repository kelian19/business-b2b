/* Équerre : module J, mode cabinet. Plusieurs dossiers .equerre.json chargés EN MÉMOIRE seulement : tableau de portefeuille
 * (indice, part du CA à risque, actions ouvertes, anomalies bloquantes), tri, filtre, export CSV. Rien n'est jamais envoyé ni enregistré.
 * Toute valeur issue d'un fichier (nom de dossier, secteur, nom de fichier) est rendue par textContent. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var L = root.EquerreLogic;
  var S = E.ui.store;
  var Der = E.ui.derived;
  var IO = E.ui.io;
  var P = E.ui.perf;
  var DZ = E.ui.dropzone;

  var etat = { tri: { col: 'nom', sens: 'asc' }, filtre: '', erreurs: [], notes: [], occupe: false, file: [], dernierMessage: '' };
  var refs = {};

  function pf() { return S.state.session.portefeuille; }

  function noter(texte) { if (etat.notes.indexOf(texte) < 0) etat.notes.push(texte); }

  /* ---------- Chargement des fichiers ---------- */

  function lireDossier(fichier) {
    if (fichier.size > L.CONST.MAX_DOSSIER_OCTETS) return Promise.reject(new Error('ce fichier dépasse 60 Mo : il ne peut pas être un dossier Équerre.'));
    return IO.lireTexte(fichier).then(function (texte) {
      var obj;
      try { obj = JSON.parse(texte); } catch (e) { throw new Error('ce n\'est pas un JSON valide : ce n\'est pas un dossier Équerre.'); }
      var v = L.validateDossier(obj);
      if (!v.ok) throw new Error(v.erreurs.join(' '));
      return v;
    });
  }

  function message(texte) {
    etat.dernierMessage = texte;
    if (refs.statut) refs.statut.textContent = texte;
  }

  /** Traite les fichiers un par un : validation, plafonds, calcul du résumé par tranches avec progression. Un fichier en échec n'arrête pas les autres. */
  function traiter(fichiers) {
    etat.file = etat.file.concat(fichiers);
    if (etat.occupe) return Promise.resolve();
    etat.occupe = true;
    var total = etat.file.length;
    var fait = 0;
    var ok = 0;
    var barre = P.barre('Calcul des résumés');
    if (refs.progres) { U.clear(refs.progres); refs.progres.appendChild(barre.el); }
    function suite() {
      var f = etat.file.shift();
      if (!f) return Promise.resolve();
      total = Math.max(total, fait + 1 + etat.file.length);
      var etiquette = 'Dossier ' + (fait + 1) + ' sur ' + total;
      message(etiquette + ' : lecture de ' + f.name);
      barre.set(fait / total, etiquette);
      return lireDossier(f).then(function (v) {
        var plafonds = L.verifierPlafonds(pf(), v.dossier.id, f.size);
        if (!plafonds.ok) throw new Error(plafonds.message);
        message(etiquette + ' : calcul du résumé de ' + v.dossier.entreprise.nom);
        return Der.ligneCabinetAsync(v.dossier, function (frac) { barre.set((fait + frac) / total, etiquette); }).then(function (ligne) {
          ligne.dossier = v.dossier;
          var r = S.commit('cabinetAjouter', { ligne: ligne, octets: f.size });
          if (!r.ok) throw new Error(r.message);
          ok++;
          if (r.remplace) noter(f.name + ' : ' + r.message);
          if (v.avertissements && v.avertissements.length) noter(f.name + ' : ' + v.avertissements.join(' '));
        });
      }).catch(function (e) {
        if (!etat.erreurs.some(function (x) { return x.fichier === f.name && x.message === e.message; })) etat.erreurs.push({ fichier: f.name, message: e.message });
      }).then(function () { fait++; return suite(); });
    }
    return suite().then(function () {
      etat.occupe = false;
      barre.set(1, 'Calcul des résumés');
      if (refs.progres) U.clear(refs.progres);
      var ko = etat.erreurs.length;
      message(U.pluriel(ok, 'dossier chargé', 'dossiers chargés') + (ko ? ', ' + U.pluriel(ko, 'fichier en échec', 'fichiers en échec') : '') + '.');
      majMessages();
      majTable();
    });
  }

  /* ---------- Messages ---------- */

  function majMessages() {
    if (!refs.erreurs) return;
    U.clear(refs.erreurs);
    var ok = etat.erreurs.length > 0;
    refs.erreurs.hidden = !ok;
    if (ok) {
      refs.erreurs.appendChild(h('p', { class: 'cab-err-t', text: 'Ces fichiers n\'ont pas été chargés :' }));
      refs.erreurs.appendChild(h('ul', { class: 'cab-err-l' }, etat.erreurs.map(function (x) {
        return h('li', null, [h('strong', { text: x.fichier }), ' : ' + x.message]);
      })));
      refs.erreurs.appendChild(U.bouton('Masquer ces messages', { classe: 'btn-petit', onclick: function () { etat.erreurs = []; majMessages(); } }));
    }
    U.clear(refs.notes);
    refs.notes.hidden = !etat.notes.length;
    etat.notes.forEach(function (n) { refs.notes.appendChild(h('p', { text: n })); });
  }

  /* ---------- Actions sur un dossier ---------- */

  function ouvrir(ligne) {
    var home = E.views.home;
    home.confirmerPerte().then(function (ok) {
      if (!ok) return;
      var copie = JSON.parse(JSON.stringify(ligne.dossier));
      var barre = P.barre('Ouverture du dossier');
      U.clear(refs.progres);
      refs.progres.appendChild(barre.el);
      Der.preparerDossier(copie, function (f) { barre.set(f, 'Ouverture du dossier'); }).then(function (prepared) {
        S.commit('chargerJson', { dossier: copie, prepared: prepared });
        U.annoncer('Dossier ouvert : ' + copie.entreprise.nom + '.');
        root.location.hash = '#tableau-de-bord';
      }).catch(function (e) {
        U.clear(refs.progres);
        etat.erreurs.push({ fichier: ligne.nom, message: 'ouverture impossible : ' + e.message });
        majMessages();
      });
    });
  }

  function retirer(ligne) {
    S.commit('cabinetRetirer', { dossierId: ligne.dossierId });
    message('Dossier retiré du portefeuille : ' + ligne.nom + '.');
    majTable();
    U.focus(refs.titrePort);
  }

  /* ---------- Tableau ---------- */

  function triPar(col) {
    if (etat.tri.col === col) etat.tri.sens = etat.tri.sens === 'asc' ? 'desc' : 'asc';
    else { etat.tri.col = col; etat.tri.sens = 'asc'; }
    majTable();
    var c = L.COLONNES_CABINET.filter(function (x) { return x.id === col; })[0];
    message('Tableau trié par ' + c.libelle.toLowerCase() + ', ordre ' + (etat.tri.sens === 'asc' ? 'croissant' : 'décroissant') + '.');
  }

  function lignesAffichees() {
    return L.trierPortefeuille(L.filtrerPortefeuille(pf(), etat.filtre), etat.tri.col, etat.tri.sens);
  }

  function enteteTri() {
    // Le secteur est affiché sous le nom du dossier (une colonne de moins : le tableau tient à l'écran, boutons d'action compris)
    return L.COLONNES_CABINET.filter(function (c) { return c.id !== 'secteur'; }).map(function (c) {
      var actif = etat.tri.col === c.id;
      var th = h('th', { scope: 'col', class: c.type === 'nombre' ? 'num' : null, 'aria-sort': actif ? (etat.tri.sens === 'asc' ? 'ascending' : 'descending') : 'none' }, [
        h('button', { type: 'button', class: 'th-btn', 'data-col': c.id, 'data-fk': 'tri-' + c.id, onclick: function () { triPar(c.id); } }, [
          h('span', { text: c.id === 'nom' ? 'Dossier et secteur' : c.libelle }),
          h('span', { class: 'th-fleche', 'aria-hidden': 'true', text: actif ? (etat.tri.sens === 'asc' ? '▲' : '▼') : '↕' })
        ])
      ]);
      return th;
    }).concat([h('th', { scope: 'col', text: 'Actions' })]);
  }

  function ligneTable(l) {
    return h('tr', { 'data-dossier': l.dossierId }, [
      h('th', { scope: 'row', class: 'cab-nom' }, [
        h('span', { class: 'cab-nom-t', text: l.nom }),
        l.secteur ? h('span', { class: 'cab-sect small', text: l.secteur }) : null,
        U.statusBadge('note', l.mode === 'demo' ? 'Démonstration' : 'Dossier client')
      ]),
      h('td', { class: 'num' }, [h('strong', { text: String(l.indice) }), h('span', { class: 'small', text: ' / 100' }), l.partiel ? h('span', { class: 'chip-partiel', text: 'indice partiel' }) : null]),
      h('td', { class: 'num', text: l.partCa === null ? 'non calculable' : U.fmtPct(l.partCa, 1) }),
      h('td', { class: 'num' }, [h('span', { text: String(l.actionsOuvertes) }), h('span', { class: 'small', text: ' sur ' + l.nbActions })]),
      h('td', { class: 'num', text: String(l.anomaliesBloquantes) }),
      h('td', { text: U.fmtDate(l.date) }),
      h('td', { class: 'cab-actions' }, [
        U.bouton('Ouvrir ce dossier', { classe: 'btn-petit', aria: 'Ouvrir le dossier ' + l.nom, onclick: function () { ouvrir(l); } }),
        U.bouton('Retirer', { classe: 'btn-petit', icone: 'corbeille', aria: 'Retirer le dossier ' + l.nom + ' du portefeuille', onclick: function () { retirer(l); } })
      ])
    ]);
  }

  function majTable() {
    if (!refs.zoneTable) return;
    var tous = pf();
    var avert = root.document.getElementById('cab-confidentialite-t');
    if (avert) avert.textContent = tous.length ? L.MESSAGE_CONFIDENTIALITE : L.MESSAGE_CONFIDENTIALITE_VIDE;
    U.clear(refs.zoneTable);
    if (!tous.length) {
      refs.zoneTable.appendChild(h('div', { class: 'vide cab-vide' }, [
        U.icon('utilisateurs', 'cab-vide-ic'),
        h('h4', { text: 'Aucun dossier dans le portefeuille' }),
        h('p', { text: 'Le mode cabinet réunit plusieurs dossiers dans un seul tableau : indice de préparation (estimation), part du chiffre d\'affaires à risque, actions ouvertes et anomalies bloquantes de chaque client.' }),
        h('p', { class: 'small', text: 'Pour commencer, enregistrez chaque dossier depuis l\'écran « Dossier » (fichier .equerre.json), puis déposez les fichiers ci-dessus : vous pouvez en choisir plusieurs à la fois. Tout reste en mémoire dans ce navigateur.' })
      ]));
      refs.compteur.textContent = '';
      refs.outils.hidden = true;
      return;
    }
    refs.outils.hidden = false;
    var lignes = lignesAffichees();
    refs.compteur.textContent = lignes.length + ' ' + (lignes.length > 1 ? 'dossiers affichés' : 'dossier affiché') + ' sur ' + tous.length;
    var corps = lignes.length
      ? lignes.map(ligneTable)
      : [h('tr', { class: 'empty-row' }, [h('td', { colspan: String(L.COLONNES_CABINET.length + 1), text: 'Aucun dossier ne correspond à ce filtre.' })])];
    refs.zoneTable.appendChild(h('div', { class: 'table-wrap' }, [
      h('table', { class: 'table cab-table' }, [
        h('caption', { class: 'visually-hidden', text: 'Portefeuille de dossiers : indice de préparation (estimation), part du CA à risque, actions ouvertes, anomalies bloquantes' }),
        h('thead', null, [h('tr', null, enteteTri())]),
        h('tbody', null, corps)
      ])
    ]));
    // le focus d'un bouton de tri est conservé après la reconstruction de l'en-tête
    var fk = refs.focusTri;
    if (fk) {
      var b = refs.zoneTable.querySelector('[data-fk="' + fk + '"]');
      if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
      refs.focusTri = null;
    }
  }

  function exporter() {
    var lignes = lignesAffichees();
    if (!lignes.length) return;
    IO.telechargerCsv('portefeuille-cabinet.csv', L.portefeuilleToCsv(lignes));
    message('Export enregistré : ' + U.pluriel(lignes.length, 'dossier', 'dossiers') + ' (portefeuille-cabinet.csv). Ce fichier contient des données de vos clients : conservez-le dans un espace protégé.');
  }

  /* ---------- Vue ---------- */

  function render(container) {
    refs = {};
    var zone = DZ.creer({
      titre: 'Glissez vos dossiers .equerre.json ici',
      accept: '.json,.equerre.json,application/json',
      description: 'Plusieurs fichiers à la fois, ' + L.CONST.MAX_DOSSIERS_CABINET + ' dossiers et ' + Math.round(L.CONST.MAX_OCTETS_CABINET / 1048576) + ' Mo au maximum. Les fichiers sont lus dans votre navigateur, rien n\'est envoyé.',
      multiple: true,
      onFiles: function (fichiers) { traiter(fichiers); }
    });
    refs.statut = h('p', { class: 'small cab-statut', role: 'status', id: 'cab-statut', text: etat.dernierMessage });
    refs.progres = h('div', { class: 'cab-progres' });
    refs.erreurs = h('div', { class: 'alert cab-erreurs', role: 'alert', hidden: true });
    refs.notes = h('div', { class: 'notice cab-notes', role: 'status', hidden: true });
    refs.titrePort = h('h3', { id: 'cab-port-t', tabindex: '-1', text: 'Portefeuille' });
    refs.compteur = h('p', { class: 'small', role: 'status', id: 'cab-compteur' });
    var filtre = h('input', { type: 'search', id: 'cab-filtre', class: 'champ', autocomplete: 'off', value: etat.filtre, 'data-fk': 'cab-filtre' });
    filtre.addEventListener('input', function () { etat.filtre = filtre.value; majTable(); });
    refs.outils = h('div', { class: 'toolbar cab-outils' }, [
      h('div', { class: 'champ-groupe cab-filtre' }, [h('label', { for: 'cab-filtre', text: 'Filtrer les dossiers (nom ou secteur)' }), filtre]),
      U.bouton('Exporter en CSV', { icone: 'telecharger', id: 'cab-export', onclick: exporter }),
      U.bouton('Effacer toutes les données de cette session', { icone: 'corbeille', danger: true, id: 'cab-effacer', onclick: function () { E.views.home.effacer(); } })
    ]);
    refs.zoneTable = h('div', { id: 'cab-table' });
    // le focus clavier d'un bouton de tri est restitué après le tri
    refs.zoneTable.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.th-btn') : null;
      if (b) refs.focusTri = b.getAttribute('data-fk');
    }, true);

    U.clear(container);
    container.appendChild(h('div', { class: 'panel-top' }, [
      h('div', null, [
        h('h2', { id: 'cab-titre', tabindex: '-1', text: 'Mode cabinet' }),
        h('p', { class: 'lead', text: 'Chargez plusieurs dossiers de vos clients pour les comparer : indice de préparation, part du chiffre d\'affaires à risque, actions ouvertes. Aucune donnée n\'est envoyée ni enregistrée.' })
      ]),
      h('a', { class: 'btn', href: '#tableau-de-bord' }, [h('span', { text: 'Retour au parcours' }), U.icon('fleche')])
    ]));
    container.appendChild(h('p', { class: 'avertissement', role: 'note', id: 'cab-confidentialite' }, [U.icon('alerte'), h('span', { id: 'cab-confidentialite-t', text: pf().length ? L.MESSAGE_CONFIDENTIALITE : L.MESSAGE_CONFIDENTIALITE_VIDE })]));
    container.appendChild(h('section', { class: 'card cab-depot', 'aria-labelledby': 'cab-depot-t' }, [
      h('h3', { id: 'cab-depot-t', text: 'Charger des dossiers' }),
      zone.el, refs.progres, refs.statut, refs.erreurs, refs.notes
    ]));
    container.appendChild(h('section', { class: 'card', 'aria-labelledby': 'cab-port-t' }, [
      refs.titrePort, refs.compteur, refs.outils, refs.zoneTable,
      h('p', { class: 'small', text: 'L\'indice et la part du CA à risque sont des estimations calculées à partir de chaque dossier chargé (pondération conventionnelle, hypothèse). Les actions ouvertes sont celles qui ne sont pas au statut « fait ».' }),
      U.mentionConseil()
    ]));
    majMessages();
    majTable();
  }

  /** Vide les messages et le filtre (effacement de la session). */
  function reinitialiser() {
    etat.erreurs = []; etat.notes = []; etat.filtre = ''; etat.dernierMessage = ''; etat.file = []; etat.occupe = false;
  }

  E.views.cabinet = { render: render, traiter: traiter, reinitialiser: reinitialiser };
})(typeof self !== 'undefined' ? self : this);
