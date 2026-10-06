/* Équerre : étape 3, mentions des factures.
 * Facture dessinée comme une feuille avec quatre zones numérotées (les 4 nouvelles mentions), liste synchronisée,
 * modèles guidés (1 à 5) avec preuve et note, et contrôle automatique de l'export des lignes de factures. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var L = root.EquerreLogic;
  var S = E.ui.store;
  var Der = E.ui.derived;
  var D = root.EquerreData;
  var Wiz = E.ui.importWizard;
  var Pager = E.ui.pager;
  var RG = E.ui.radiogroup;
  var Dlg = E.ui.dialog;

  var etat = { modeleId: null, sel: null, grid: null, cle: '', pagerLignes: null };

  var BADGE = {
    present: { type: 'ok', texte: 'Présent' },
    absent: { type: 'bloquant', texte: 'Manquant' },
    a_verifier: { type: 'a_corriger', texte: 'À vérifier' },
    sans_objet: { type: 'note', texte: 'Sans objet' },
    non_controle: { type: 'note', texte: 'Non contrôlé' }
  };
  var ZONE_ICONE = { present: 'check-cercle', absent: 'croix-cercle', a_verifier: 'aide', sans_objet: 'info', non_controle: 'aide' };
  var ZONE_TEXTE = { present: 'présent', absent: 'non renseigné', a_verifier: 'à vérifier', sans_objet: 'sans objet', non_controle: 'non contrôlé' };

  function badge(statut) { var b = BADGE[statut] || BADGE.non_controle; return U.statusBadge(b.type, b.texte); }

  function factureDemo(modele) {
    var d = S.dossier();
    if (d.mode !== 'demo' || !D) return null;
    var m = /^m([1-3])$/.exec(modele.id);
    return m ? D.factures[+m[1] - 1] : null;
  }

  function nomCourt(modele) {
    var f = factureDemo(modele);
    if (f) { var n = /^Facture (\d+)/.exec(modele.nom); return n ? 'Facture ' + n[1] : modele.nom; }
    return modele.nom;
  }

  function indicateur(modele) {
    var abs = 0;
    var ver = 0;
    var nc = 0;
    L.LISTE_NOUVELLES.forEach(function (m) {
      var s = L.controleDe(modele, m.id).statut;
      if (s === 'absent') abs++; else if (s === 'a_verifier') ver++; else if (s === 'non_controle') nc++;
    });
    if (nc === L.LISTE_NOUVELLES.length) return { icone: 'aide', texte: 'Non contrôlé' };
    if (abs + ver === 0) return { icone: 'check-cercle', texte: '0 manquante' };
    if (ver === 0) return { icone: 'croix-cercle', texte: abs + (abs > 1 ? ' manquantes' : ' manquante') };
    return { icone: 'alerte', texte: (abs + ver) + ' à vérifier ou manquantes' };
  }

  function enteteModele(modele, compte) {
    var f = factureDemo(modele);
    var nom = f ? 'Facture ' + f.numero : 'Modèle « ' + modele.nom + ' »';
    var n = compte.nouvelles;
    if (!n.total) return nom + ' : aucune mention contrôlée pour l\'instant';
    return nom + ' : ' + n.ok + (n.ok > 1 ? ' mentions' : ' mention') + ' sur ' + n.total + (n.ok > 1 ? ' présentes' : ' présente');
  }

  /* ---------- Rendu général ---------- */

  function render(container) {
    var d = S.dossier();
    var s = S.state.session;
    var cle = s.gen + ':' + s.rev.lignes;
    if (etat.cle !== cle) { etat.cle = cle; etat.grid = null; etat.pagerLignes = null; }
    if (etat.gen !== s.gen) { etat.gen = s.gen; etat.modeleId = null; etat.sel = null; }
    U.clear(container);
    var modeles = d.modeles;
    var modele = modeles.filter(function (m) { return m.id === etat.modeleId; })[0];
    if (!modele) { modele = modeles[0]; etat.modeleId = modele.id; }

    container.appendChild(h('div', { class: 'panel-top' }, [
      h('div', null, [
        h('h2', { text: 'Mentions des factures' }),
        h('p', { class: 'lead secondary', text: 'Contrôlez jusqu\'à cinq modèles de factures face aux 4 nouvelles mentions obligatoires à compter du 1er septembre 2026, puis face à une liste de mentions courantes (non exhaustive).' })
      ]),
      h('p', { class: 'source' + (d.mode === 'client' ? ' own' : ''), text: d.mode === 'demo' ? 'Source : factures fictives de démonstration' : 'Source : votre dossier' })
    ]));

    container.appendChild(selecteur(modeles, modele));
    var zone = h('div', { class: 'mn-zone' });
    container.appendChild(zone);
    contenuModele(zone, modele);
    container.appendChild(sectionLignes(d));
    container.appendChild(h('p', { class: 'note', text: L.NOTE_NON_EXHAUSTIVE }));
    container.appendChild(U.mentionConseil('Ce contrôle ne garantit pas la conformité d\'une facture.'));
  }

  /* ---------- Sélecteur de modèles ---------- */

  function selecteur(modeles, modele) {
    var d = S.dossier();
    var comptes = Der.modeles();
    var cum = comptes.cumule.nouvelles;
    var boutons = modeles.map(function (m) {
      var ind = indicateur(m);
      return h('button', {
        type: 'button', class: 'seg-modele', 'aria-pressed': m.id === modele.id ? 'true' : 'false', 'data-fk': 'mod-' + m.id,
        onclick: function () { etat.modeleId = m.id; etat.sel = null; S.emit('modeles'); }
      }, [h('span', { class: 'seg-modele-nom', text: nomCourt(m) }),
        h('span', { class: 'seg-modele-ind' }, [U.icon(ind.icone), h('span', { text: ind.texte })])]);
    });
    var f = factureDemo(modele);
    var sous = f ? f.numero + ' : ' + f.titre : 'Modèle guidé : indiquez, mention par mention, ce que vous constatez sur votre modèle de facture.';
    var actions = [];
    if (modeles.length < L.CONST.MAX_MODELES) {
      actions.push(U.bouton('Ajouter un modèle', { icone: 'plus', classe: 'btn-petit', id: 'btn-ajout-modele', onclick: function () {
        var r = S.commit('majModele', { op: 'ajouter' });
        if (r.refuse) U.annoncer(r.message);
        else if (r.modele) { etat.modeleId = r.modele.id; etat.sel = null; S.emit('modeles'); U.annoncer('Modèle ajouté.'); }
      } }));
    } else {
      actions.push(h('p', { class: 'small', id: 'mn-plafond', text: 'Cinq modèles au maximum : supprimez-en un pour en ajouter un autre.' }));
    }
    if (modeles.length > 1) {
      actions.push(U.bouton('Supprimer ce modèle', { icone: 'corbeille', classe: 'btn-petit', id: 'btn-suppr-modele', onclick: function () {
        Dlg.confirmer('Supprimer ce modèle ?', 'Le modèle « ' + modele.nom + ' » et ses preuves et notes seront retirés du dossier.', { ok: 'Supprimer', danger: true }).then(function (ok) {
          if (!ok) return;
          var r = S.commit('majModele', { op: 'supprimer', id: modele.id });
          if (!r.refuse) { etat.modeleId = null; etat.sel = null; S.emit('modeles'); U.annoncer('Modèle supprimé.'); }
        });
      } }));
    }
    var renommer = null;
    if (!f) {
      var champ = h('input', { type: 'text', class: 'champ', id: 'mn-nom-modele', 'data-fk': 'mn-nom-modele', maxlength: String(L.CONST.MAX_NOM_MODELE), value: modele.nom, 'aria-label': 'Nom du modèle' });
      champ.addEventListener('change', function () {
        var v = champ.value;
        setTimeout(function () { var r = S.commit('majModele', { op: 'renommer', id: modele.id, nom: v }); if (r.refuse) U.annoncer(r.message); }, 0);
      });
      renommer = h('div', { class: 'mn-renommer' }, [h('label', { for: 'mn-nom-modele', class: 'small', text: 'Nom du modèle' }), champ]);
    }
    return h('div', { class: 'mn-selecteur' }, [
      h('div', { class: 'mn-ligne1' }, [
        h('div', { class: 'seg-modeles', role: 'group', 'aria-label': 'Choisir une facture ou un modèle' }, boutons),
        h('div', { class: 'toolbar secondary mn-actions' }, [renommer].concat(actions))
      ]),
      h('div', { class: 'mn-meta' }, [
        h('p', { class: 'small mn-sous', text: sous }),
        h('p', { class: 'small mn-cumul', id: 'mn-cumul', role: 'status', text: 'Cumul : ' + cum.ok + (cum.ok > 1 ? ' mentions nouvelles présentes' : ' mention nouvelle présente') + ' sur ' + cum.total + ' contrôlées (' + U.pluriel(modeles.length, 'modèle', 'modèles') + ').' })
      ])
    ]);
  }

  /* ---------- Facture et liste synchronisées ---------- */

  function contenuModele(zoneEl, modele) {
    var f = factureDemo(modele);
    var compte = L.compterModele(modele);
    var auto = f ? L.checkInvoiceMentions(f) : null;
    var zones = {};
    var items = {};

    function lier(id, on) {
      if (zones[id]) zones[id].classList.toggle('linked', on);
      if (items[id]) items[id].classList.toggle('linked', on);
    }
    function majSelection() {
      L.LISTE_NOUVELLES.forEach(function (m) {
        var actif = etat.sel === m.id;
        [zones[m.id], items[m.id]].forEach(function (el) {
          if (!el) return;
          if (actif) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
        });
        lier(m.id, actif);
      });
    }
    function bloc(id) { return blocEdition(modele, id, f, auto); }
    function selectionner(id, vers) {
      etat.sel = id;
      majSelection();
      majEdition();
      var cible = vers === 'zone' ? zones[id] : items[id];
      if (cible && cible.scrollIntoView) cible.scrollIntoView({ block: 'nearest', behavior: U.mediaReduit() ? 'auto' : 'smooth' });
      var m = L.mentionDe(id);
      U.annoncer('Mention sélectionnée : ' + m.label + '.');
    }
    function majEdition() {
      U.clear(edition);
      if (etat.sel && L.mentionDe(etat.sel)) edition.appendChild(bloc(etat.sel));
      else edition.appendChild(h('p', { class: 'small', text: 'Sélectionnez une mention (clic ou Entrée) pour saisir une preuve ou une note.' }));
    }
    function annotations(id, n) {
      var m = L.mentionDe(id);
      var statut = L.controleDe(modele, id).statut;
      return { m: m, statut: statut, nom: 'Mention ' + n + ' sur 4 : ' + m.label + ', ' + (ZONE_TEXTE[statut] || statut) };
    }

    var edition = h('div', { class: 'mn-edition card', id: 'mn-edition', 'aria-live': 'polite' });

    function zone(id, n, valeurTexte, sansObjetTexte) {
      var a = annotations(id, n);
      var contenu = a.statut === 'absent' ? 'non renseigné'
        : (a.statut === 'present' && valeurTexte ? valeurTexte
          : (a.statut === 'sans_objet' ? 'sans objet' + (sansObjetTexte ? ' : ' + sansObjetTexte : '') : ZONE_TEXTE[a.statut]));
      var el = h('div', {
        class: 'zone z-' + a.statut, tabindex: '0', role: 'button', 'data-mention': id, 'aria-label': a.nom, 'data-fk': 'zone-' + id,
        onmouseenter: function () { lier(id, true); }, onmouseleave: function () { lier(id, etat.sel === id); },
        onfocus: function () { lier(id, true); }, onblur: function () { lier(id, etat.sel === id); },
        onclick: function () { selectionner(id, 'item'); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectionner(id, 'item'); } }
      }, [
        h('span', { class: 'zone-num', 'aria-hidden': 'true', text: String(n) }),
        h('span', { class: 'zone-corps', 'aria-hidden': 'true' }, [
          h('span', { class: 'zone-lib', text: a.m.label.replace(/ \(si elle diffère de la facturation\)/, '').replace(/ \(biens, services ou les deux\)/, '') }),
          h('span', { class: 'zone-val' }, [U.icon(ZONE_ICONE[a.statut]), h('span', { text: contenu })])
        ])
      ]);
      zones[id] = el;
      return el;
    }

    var sheet = f ? feuilleDemo(f, zone) : feuilleGuidee(zone);

    var liste = h('ul', { class: 'mn-liste' }, L.LISTE_NOUVELLES.map(function (m, i) {
      var a = annotations(m.id, i + 1);
      var exp = auto ? auto.items.filter(function (x) { return x.id === m.id; })[0] : null;
      var btn = h('button', {
        type: 'button', class: 'mn-item s-' + a.statut, 'data-mention': m.id, 'aria-label': a.nom, 'data-fk': 'item-' + m.id,
        onmouseenter: function () { lier(m.id, true); }, onmouseleave: function () { lier(m.id, etat.sel === m.id); },
        onfocus: function () { lier(m.id, true); }, onblur: function () { lier(m.id, etat.sel === m.id); },
        onclick: function () { selectionner(m.id, 'zone'); },
        onkeydown: function (e) {
          var k = e.key;
          if (k !== 'ArrowDown' && k !== 'ArrowUp') return;
          e.preventDefault();
          var ordre = L.LISTE_NOUVELLES.map(function (x) { return items[x.id]; });
          var j = ordre.indexOf(btn) + (k === 'ArrowDown' ? 1 : -1);
          if (j >= 0 && j < ordre.length) ordre[j].focus();
        }
      }, [
        h('span', { class: 'zone-num', 'aria-hidden': 'true', text: String(i + 1) }),
        h('span', { class: 'mn-item-txt', 'aria-hidden': 'true' }, [h('strong', { text: m.label }), h('span', { class: 'small', text: exp ? exp.explication : m.aide })]),
        h('span', { class: 'mn-item-badge', 'aria-hidden': 'true' }, [badge(a.statut)])
      ]);
      items[m.id] = btn;
      return h('li', null, [btn]);
    }));

    var courantes = h('details', { class: 'mn-courantes' }, [
      h('summary', { text: 'Mentions courantes (' + L.LISTE_COURANTES.length + ') : liste non exhaustive, ' + compte.courantes.ok + ' présentes sur ' + compte.courantes.total + ' contrôlées' }),
      h('ul', { class: 'mn-liste mn-liste-c' }, L.LISTE_COURANTES.map(function (m) {
        var statut = L.controleDe(modele, m.id).statut;
        return h('li', null, [h('button', {
          type: 'button', class: 'mn-item mn-item-c s-' + statut, 'data-fk': 'itemc-' + m.id, 'aria-pressed': etat.sel === m.id ? 'true' : 'false',
          onclick: function () { etat.sel = m.id; majSelection(); majEdition(); }
        }, [h('span', { class: 'mn-item-txt' }, [h('strong', { text: m.label })]), h('span', { class: 'mn-item-badge' }, [badge(statut)])])]);
      }))
    ]);
    if (etat.sel && L.mentionDe(etat.sel) && L.mentionDe(etat.sel).groupe === 'classique') courantes.setAttribute('open', '');

    zoneEl.appendChild(h('h3', { class: 'mn-entete', id: 'mn-entete', text: enteteModele(modele, compte) }));
    zoneEl.appendChild(h('div', { class: 'mn-grid' }, [
      h('div', { class: 'mn-gauche' }, [sheet]),
      h('div', { class: 'mn-droite' }, [
        h('h4', { class: 'label', text: 'Les 4 nouvelles mentions (à compter du 1er septembre 2026)' }),
        liste,
        h('p', { class: 'small mn-legende' }, ['Les zones numérotées de la facture et cette liste sont liées : survolez, ou sélectionnez avec Entrée ; Échap retire la sélection. L\'état est toujours écrit, jamais indiqué par la seule couleur.']),
        edition,
        courantes
      ])
    ]));
    majSelection();
    majEdition();

    zoneEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !etat.sel) return;
      e.preventDefault();
      etat.sel = null;
      majSelection();
      majEdition();
    });
  }

  function feuilleDemo(f, zone) {
    var cl = f.client;
    return h('article', { class: 'sheet', 'aria-label': 'Facture fictive ' + f.numero }, [
      h('div', { class: 'sheet-tete' }, [
        h('div', null, [h('p', { class: 'sheet-vendeur', text: f.vendeur.nom }), h('p', { class: 'small', text: f.vendeur.adresse }), h('p', { class: 'small', text: 'SIREN ' + U.groupSiren(f.vendeur.siren) + ' · TVA ' + f.vendeur.tva })]),
        h('div', { class: 'sheet-ref' }, [h('p', { class: 'sheet-titre', text: 'FACTURE ' + f.numero }), h('p', { class: 'small', text: 'Émise le ' + U.fmtDate(f.dateEmission) }), h('p', { class: 'small', text: 'Échéance le ' + U.fmtDate(f.dateEcheance) })])
      ]),
      h('div', { class: 'sheet-blocs' }, [
        h('div', { class: 'sheet-bloc' }, [h('span', { class: 'inv-k', text: 'Client' }), h('p', { class: 'sheet-nom', text: cl.nom }), h('p', { class: 'small', text: cl.adresse }),
          zone('siren_client', 1, 'SIREN ' + (cl.siren ? U.groupSiren(cl.siren) : ''))]),
        h('div', { class: 'sheet-bloc' }, [h('span', { class: 'inv-k', text: 'Livraison' }),
          zone('adresse_livraison', 2, f.adresseLivraison, 'identique à la facturation')])
      ]),
      h('table', { class: 'table sheet-lignes' }, [
        h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Désignation' }), h('th', { scope: 'col', class: 'num', text: 'Qté' }), h('th', { scope: 'col', class: 'num', text: 'PU HT' }), h('th', { scope: 'col', class: 'num', text: 'TVA' })])]),
        h('tbody', null, f.lignes.map(function (l) {
          return h('tr', null, [h('td', { text: l.designation }), h('td', { class: 'num', text: String(l.quantite) }), h('td', { class: 'num', text: U.fmtEur2(l.prixUnitaireHT) }), h('td', { class: 'num', text: l.tauxTVA + U.NBSP + '%' })]);
        }))
      ]),
      h('p', { class: 'sheet-totaux', text: 'Total HT ' + U.fmtEur2(f.totalHT) + ' · TVA ' + U.fmtEur2(f.totalTVA) + ' · Total TTC ' + U.fmtEur2(f.totalTTC) }),
      h('div', { class: 'sheet-pied' }, [
        zone('nature_operation', 3, f.natureOperation),
        zone('option_debits', 4, f.optionDebits)
      ])
    ]);
  }

  function feuilleGuidee(zone) {
    return h('article', { class: 'sheet sheet-guidee', 'aria-label': 'Schéma de votre modèle de facture' }, [
      h('div', { class: 'sheet-tete' }, [
        h('div', null, [h('p', { class: 'sheet-vendeur', text: 'Votre entreprise' }), h('p', { class: 'small', text: 'Adresse, SIREN, TVA' })]),
        h('div', { class: 'sheet-ref' }, [h('p', { class: 'sheet-titre', text: 'FACTURE' }), h('p', { class: 'small', text: 'Schéma de votre modèle' })])
      ]),
      h('div', { class: 'sheet-blocs' }, [
        h('div', { class: 'sheet-bloc' }, [h('span', { class: 'inv-k', text: 'Client' }), h('p', { class: 'small', text: 'Nom et adresse du client' }), zone('siren_client', 1, 'SIREN du client présent')]),
        h('div', { class: 'sheet-bloc' }, [h('span', { class: 'inv-k', text: 'Livraison' }), zone('adresse_livraison', 2, 'Adresse de livraison présente')])
      ]),
      h('div', { class: 'sheet-lignes-vides', 'aria-hidden': 'true' }, [h('span'), h('span'), h('span')]),
      h('p', { class: 'small sheet-totaux', text: 'Lignes, totaux HT, TVA et TTC' }),
      h('div', { class: 'sheet-pied' }, [zone('nature_operation', 3, 'Nature de l\'opération présente'), zone('option_debits', 4, 'Option TVA présente')])
    ]);
  }

  /* ---------- Saisie guidée d'une mention (statut, preuve, note) ---------- */

  function blocEdition(modele, id, factureD, auto) {
    var m = L.mentionDe(id);
    var c = L.controleDe(modele, id);
    var lectureSeule = !!factureD;
    var uid = 'mn-ed';
    var enf = [h('h4', { text: (m.groupe === 'nouvelle' ? 'Mention ' + (L.LISTE_NOUVELLES.indexOf(m) + 1) + ' : ' : '') + m.label })];
    if (m.aide) enf.push(h('p', { class: 'small', text: m.aide }));
    if (lectureSeule) {
      enf.push(h('p', { class: 'small' }, [badge(c.statut), ' Statut établi par le contrôle automatique de la démonstration : non modifiable. Vous pouvez ajouter une preuve et une note.']));
    } else {
      var rg = RG.creer({
        id: uid + '-statut', labelId: uid + '-statut-lib', valeur: c.statut, classe: 'radios-statut',
        options: L.STATUTS_CONTROLE.map(function (s) { return { valeur: s, libelle: L.STATUT_LIBELLES[s] }; }),
        onChange: function (v) { var r = S.commit('majModele', { op: 'controle', id: modele.id, mention: id, statut: v }); if (r.refuse) U.annoncer(r.message); }
      });
      enf.push(h('p', { class: 'label', id: uid + '-statut-lib', text: 'Ce que vous constatez sur votre modèle' }));
      enf.push(rg.el);
    }
    var preuve = h('input', { type: 'text', class: 'champ', id: uid + '-preuve', 'data-fk': uid + '-preuve', maxlength: String(L.CONST.MAX_PREUVE), value: c.preuve, placeholder: 'Ex. : page 1, bloc « Client »' });
    var note = h('textarea', { class: 'champ', id: uid + '-note', 'data-fk': uid + '-note', maxlength: String(L.CONST.MAX_NOTE_MENTION), rows: '2' });
    note.value = c.note;
    function enregistrer(champ, valeur) {
      // Différé : le focus a déjà changé de champ quand l'événement « change » part.
      setTimeout(function () {
        var p = { op: 'controle', id: modele.id, mention: id };
        p[champ] = valeur;
        var r = S.commit('majModele', p);
        if (r.refuse) U.annoncer(r.message);
      }, 0);
    }
    preuve.addEventListener('change', function () { enregistrer('preuve', preuve.value); });
    note.addEventListener('change', function () { enregistrer('note', note.value); });
    enf.push(h('div', { class: 'champ-groupe' }, [h('label', { for: uid + '-preuve', text: 'Preuve (200 caractères au plus)' }), preuve]));
    enf.push(h('div', { class: 'champ-groupe' }, [h('label', { for: uid + '-note', text: 'Note (300 caractères au plus)' }), note]));
    if (auto) {
      var it = auto.items.filter(function (x) { return x.id === id; })[0];
      if (it) enf.push(h('p', { class: 'small', text: it.explication }));
    }
    return h('div', { class: 'mn-edit-corps' }, enf);
  }

  /* ---------- Export des lignes de factures et contrôle automatique ---------- */

  var MENTION_COURT = { siren_client: 'SIREN du client', adresse_livraison: 'Adresse de livraison', nature_operation: 'Nature de l\'opération', option_debits: 'Option TVA d\'après les débits' };
  var STATUT_LIGNE = { present: 'present', manquant: 'absent', a_verifier: 'a_verifier', sans_objet: 'sans_objet', non_controle: 'non_controle' };

  function sectionLignes(d) {
    var wrap = h('section', { class: 'mn-lignes', 'aria-labelledby': 'mn-lignes-titre' });
    wrap.appendChild(h('h3', { id: 'mn-lignes-titre', text: 'Contrôle automatique des lignes de factures' }));
    if (d.mode === 'demo') {
      wrap.appendChild(h('p', { class: 'small', text: 'Créez un dossier client pour importer votre export des lignes de factures (facultatif) : l\'outil vérifie alors, facture par facture, la présence des champs correspondant aux 4 nouvelles mentions.' }));
    } else {
      if (!etat.grid) etat.grid = h('div', { class: 'import-grid secondary' }, [Wiz.carte('lignes').el]);
      wrap.appendChild(etat.grid);
    }
    var ctl = Der.lignesControle();
    var carte = h('div', { class: 'card', id: 'mn-controle-auto' });
    if (!ctl) {
      carte.appendChild(h('p', { class: 'small', text: 'Mentions non contrôlées : aucun export des lignes de factures n\'est importé (facultatif). Les contrôles ci-dessus, par modèle, restent valables.' }));
      carte.appendChild(tableMentions(null));
    } else {
      carte.appendChild(h('p', { role: 'status', text: U.pluriel(ctl.nbFactures, 'facture contrôlée', 'factures contrôlées') + ' : ' + ctl.ok + ' mentions présentes sur ' + ctl.total + ' contrôlées' + (ctl.total ? ' (' + U.fmtNum(100 * ctl.ok / ctl.total, 0) + U.NBSP + '%, estimation)' : '') + '.' }));
      carte.appendChild(tableMentions(ctl));
      carte.appendChild(listeConcernees(ctl));
      if (ctl.nbSansLignes) {
        carte.appendChild(h('p', { class: 'small', text: U.pluriel(ctl.nbSansLignes, 'facture de votre export de factures n\'a', 'factures de votre export de factures n\'ont') + ' aucune ligne dans ce fichier' + (ctl.facturesSansLignes.length < ctl.nbSansLignes ? ' (' + ctl.facturesSansLignes.length + ' premières : ' : ' : ') + ctl.facturesSansLignes.slice(0, 20).join(', ') + (ctl.facturesSansLignes.length > 20 ? '…' : '') + (ctl.facturesSansLignes.length < ctl.nbSansLignes ? ')' : '') + '.' }));
      }
    }
    wrap.appendChild(carte);
    return wrap;
  }

  function tableMentions(ctl) {
    return h('div', { class: 'table-wrap' }, [h('table', { class: 'table small-table', id: 'mn-table-auto' }, [
      h('caption', { class: 'visually-hidden', text: 'Résultat du contrôle automatique par mention' }),
      h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Mention' })].concat(ctl ? ['Présent', 'Manquant', 'À vérifier', 'Sans objet'].map(function (t) { return h('th', { scope: 'col', class: 'num', text: t }); }) : [h('th', { scope: 'col', text: 'État' })]))]),
      h('tbody', null, L.LISTE_NOUVELLES.map(function (m) {
        var pm = ctl && ctl.parMention[m.id];
        if (!ctl || !pm.controle) {
          return h('tr', null, [h('th', { scope: 'row', text: MENTION_COURT[m.id] })].concat(ctl ? [h('td', { colspan: '4' }, [badge('non_controle'), ' colonne absente du fichier'])] : [h('td', null, [badge('non_controle')])]));
        }
        return h('tr', null, [h('th', { scope: 'row', text: MENTION_COURT[m.id] }), h('td', { class: 'num', text: U.fmtNum(pm.present) }), h('td', { class: 'num', text: U.fmtNum(pm.manquant) }),
          h('td', { class: 'num', text: U.fmtNum(pm.aVerifier) }), h('td', { class: 'num', text: U.fmtNum(pm.sansObjet) })]);
      }))
    ])]);
  }

  function listeConcernees(ctl) {
    var bloc = h('div', { class: 'mn-concernees' });
    if (!ctl.nbConcernees) {
      bloc.appendChild(h('p', { class: 'small', text: 'Aucune facture n\'a de mention manquante ou à vérifier parmi les mentions contrôlées.' }));
      return bloc;
    }
    var liste = ctl.facturesConcernees;
    bloc.appendChild(h('h4', { text: 'Factures concernées : ' + liste.length + ' premières sur ' + U.fmtNum(ctl.nbConcernees) }));
    var corps = h('tbody');
    var pager = Pager.creer({ onChange: function () { remplir(); } });
    function remplir() {
      U.clear(corps);
      for (var i = pager.debut(); i < pager.fin(); i++) {
        var f = liste[i];
        corps.appendChild(h('tr', null, [h('th', { scope: 'row', text: f.numero }), h('td', { text: f.client || '–' })].concat(
          L.LISTE_NOUVELLES.map(function (m) { return h('td', null, [badge(STATUT_LIGNE[f.mentions[m.id]] || 'non_controle')]); }))));
      }
    }
    bloc.appendChild(h('div', { class: 'table-wrap' }, [h('table', { class: 'table small-table', id: 'mn-table-concernees' }, [
      h('caption', { class: 'visually-hidden', text: 'Factures dont au moins une mention est manquante ou à vérifier' }),
      h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Facture' }), h('th', { scope: 'col', text: 'Client' })].concat(L.LISTE_NOUVELLES.map(function (m) { return h('th', { scope: 'col', text: MENTION_COURT[m.id] }); })))]),
      corps
    ])]));
    bloc.appendChild(pager.el);
    pager.setTotal(liste.length);
    remplir();
    return bloc;
  }

  /** Oublie le modèle, la sélection et la grille (effacement de la session). */
  function reinitialiser() {
    etat.modeleId = null; etat.sel = null; etat.grid = null; etat.cle = ''; etat.pagerLignes = null; etat.gen = -1;
  }

  E.views.mentions = { render: render, reinitialiser: reinitialiser };
})(typeof self !== 'undefined' ? self : this);
