/* Équerre : module I, mise à niveau. Comparaison de deux états d'un dossier (deux versions enregistrées, l'état actuel ou un second
 * fichier .json) : évolution de l'indice et de ses composantes, anomalies résolues et nouvelles, actions passées à « fait ».
 * Seuls des résumés sont comparés (aucune donnée brute). Toute valeur est une estimation ; aucun résultat n'est promis. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var L = root.EquerreLogic;
  var S = E.ui.store;
  var Der = E.ui.derived;
  var IO = E.ui.io;
  var DZ = E.ui.dropzone;

  var etat = { gen: -1, fichiers: [], compteur: 0, avant: null, apres: null, erreur: '', statut: '' };

  function sources() {
    var d = S.dossier();
    var out = [];
    d.versions.forEach(function (v) {
      out.push({ id: 'v:' + v.id, libelle: 'Version ' + v.numero + ' : ' + v.libelle + (v.creeLe ? ' (' + U.fmtHeure(v.creeLe) + ')' : ''), resume: v.resume });
    });
    out.push({ id: 'courant', libelle: 'État actuel du dossier (non enregistré)', resume: Der.resume() });
    etat.fichiers.forEach(function (f) {
      out.push({ id: f.id + ':etat', libelle: 'Fichier ' + f.nom + ' : état enregistré', resume: f.resume });
      f.versions.forEach(function (v) {
        out.push({ id: f.id + ':v:' + v.id, libelle: 'Fichier ' + f.nom + ' : version ' + v.numero + ' : ' + v.libelle, resume: v.resume });
      });
    });
    return out;
  }

  function trouver(liste, id) {
    for (var i = 0; i < liste.length; i++) { if (liste[i].id === id) return liste[i]; }
    return null;
  }

  function actualiser() { if (E.app) E.app.actualiser('upgrade'); }

  function chargerFichier(fichier) {
    etat.erreur = '';
    etat.statut = '';
    if (fichier.size > L.CONST.MAX_DOSSIER_OCTETS) { etat.erreur = 'Ce fichier dépasse 60 Mo : il ne peut pas être un dossier Équerre.'; actualiser(); return; }
    IO.lireTexte(fichier).then(function (texte) {
      var obj;
      try { obj = JSON.parse(texte); } catch (e) { throw new Error('Ce fichier n\'est pas un JSON valide : ce n\'est pas un dossier Équerre.'); }
      var v = L.validateDossier(obj);
      if (!v.ok) throw new Error(v.erreurs.join(' '));
      var gen = S.state.session.gen;
      etat.statut = 'Préparation du fichier ' + String(fichier.name).slice(0, 80) + ' en cours…';
      U.annoncer(etat.statut);
      actualiser();
      // Préparation par tranches (comme le mode cabinet) : l'interface reste utilisable pendant le calcul
      return Der.resumeAutreDossierAsync(v.dossier).then(function (resume) {
        if (S.state.session.gen !== gen) return;   // la session a été effacée ou le dossier remplacé entre-temps
        var id = 'f' + (++etat.compteur);
        etat.fichiers.push({ id: id, nom: String(fichier.name).slice(0, 80), resume: resume, versions: v.dossier.versions });
        if (etat.fichiers.length > 4) etat.fichiers.shift();
        etat.apres = id + ':etat';
        etat.statut = 'Fichier chargé pour comparaison : ' + String(fichier.name).slice(0, 80) + '. Il n\'a pas été ouvert comme dossier et rien n\'a été envoyé.';
        U.annoncer(etat.statut);
        actualiser();
      });
    }).catch(function (e) { etat.erreur = e.message; actualiser(); });
  }

  /* ---------- Rendu des résultats ---------- */

  function cartesResume(cmp) {
    var ind = cmp.indice;
    var fleche = ind.avant === null || ind.apres === null ? 'non comparable' : ind.avant + ' → ' + ind.apres;
    return h('div', { class: 'upg-kpis' }, [
      h('div', { class: 'kpi' }, [
        h('p', { class: 'label', text: 'Indice de préparation (estimation)' }),
        h('p', { class: 'v', text: fleche }),
        h('p', { class: 's', text: ind.delta === null ? 'Écart non calculable' : 'Écart : ' + U.fmtNumSigne(ind.delta, 0) + ' (estimation)' })
      ]),
      h('div', { class: 'kpi' }, [
        h('p', { class: 'label', text: 'Anomalies résolues' }), h('p', { class: 'v', text: String(cmp.anomaliesResolues.length) }),
        h('p', { class: 's', text: 'présentes avant, absentes après' })
      ]),
      h('div', { class: 'kpi' + (cmp.anomaliesNouvelles.length ? ' alert' : '') }, [
        h('p', { class: 'label', text: 'Nouvelles anomalies' }), h('p', { class: 'v', text: String(cmp.anomaliesNouvelles.length) }),
        h('p', { class: 's', text: 'absentes avant, présentes après' })
      ]),
      h('div', { class: 'kpi' }, [
        h('p', { class: 'label', text: 'Actions passées à « fait »' }), h('p', { class: 'v', text: String(cmp.actionsFaites.length) }),
        h('p', { class: 's', text: 'd\'après le suivi du plan d\'action' })
      ])
    ]);
  }

  function carteIndice(cmp) {
    var ind = cmp.indice;
    var lignes = cmp.composantes.map(function (c) {
      return h('tr', null, [
        h('th', { scope: 'row', text: c.label }),
        h('td', { class: 'num', text: c.avant === null ? 'non évalué' : String(c.avant) }),
        h('td', { class: 'num', text: c.apres === null ? 'non évalué' : String(c.apres) }),
        h('td', { class: 'num', text: c.delta === null ? '–' : U.fmtNumSigne(c.delta, 0) })
      ]);
    });
    lignes.push(h('tr', { class: 'upg-total' }, [
      h('th', { scope: 'row', text: 'Indice de préparation (estimation)' }),
      h('td', { class: 'num', text: ind.avant === null ? '–' : String(ind.avant) + (ind.partielAvant ? ' (partiel)' : '') }),
      h('td', { class: 'num', text: ind.apres === null ? '–' : String(ind.apres) + (ind.partielApres ? ' (partiel)' : '') }),
      h('td', { class: 'num', text: ind.delta === null ? '–' : U.fmtNumSigne(ind.delta, 0) })
    ]));
    var extra = [];
    if (cmp.mentions.avant && cmp.mentions.apres) extra.push('Mentions présentes sur les modèles contrôlés : ' + cmp.mentions.avant.ok + ' sur ' + cmp.mentions.avant.total + ' → ' + cmp.mentions.apres.ok + ' sur ' + cmp.mentions.apres.total + '.');
    if (cmp.partBloquant.avant !== null && cmp.partBloquant.apres !== null) extra.push('Part du CA facturée à des clients à fiche bloquante : ' + U.fmtPct(cmp.partBloquant.avant, 1) + ' → ' + U.fmtPct(cmp.partBloquant.apres, 1) + ' (estimation).');
    return h('section', { class: 'card', 'aria-labelledby': 'upg-ind-t' }, [
      h('h3', { id: 'upg-ind-t', text: 'Évolution de l\'indice' }),
      h('div', { class: 'table-wrap' }, [h('table', { class: 'table' }, [
        h('caption', { class: 'visually-hidden', text: 'Évolution de l\'indice de préparation et de ses composantes (estimation)' }),
        h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Composante' }), h('th', { scope: 'col', class: 'num', text: 'Avant' }), h('th', { scope: 'col', class: 'num', text: 'Après' }), h('th', { scope: 'col', class: 'num', text: 'Écart' })])]),
        h('tbody', null, lignes)
      ])]),
      !ind.comparable ? h('p', { class: 'notice', text: 'Les deux indices n\'ont pas la même composition (l\'un est partiel : une composante n\'était pas évaluable) : lisez l\'écart avec prudence.' }) : null,
      extra.length ? h('p', { class: 'small', text: extra.join(' ') }) : null
    ]);
  }

  function listeAnomalies(titre, id, entrees, classe) {
    var max = L.CONST.MAX_LIGNES_COMPARAISON;
    var vue = entrees.slice(0, max);
    var corps;
    if (!entrees.length) corps = h('p', { class: 'small', text: 'Aucune.' });
    else {
      corps = h('ul', { class: 'upg-list ' + classe, role: 'list' }, vue.map(function (x) {
        var d = L.decrireAnomalie(x);
        return h('li', null, [U.icon(classe === 'upg-res' ? 'check-cercle' : 'alerte'), h('span', null, [h('strong', { text: d.identifiant }), ' : ' + d.libelle])]);
      }));
    }
    return h('section', { class: 'card', 'aria-labelledby': id }, [
      h('h3', { id: id, text: titre + ' (' + entrees.length + ')' }),
      corps,
      entrees.length > max ? h('p', { class: 'small', text: 'Affichage limité aux ' + max + ' premières lignes sur ' + U.fmtNum(entrees.length) + ' : exportez le CSV pour la liste complète.' }) : null
    ]);
  }

  function carteActions(cmp) {
    function liste(titre, items, vide) {
      return h('div', null, [h('h4', { text: titre + ' (' + items.length + ')' }),
        items.length ? h('ul', { class: 'upg-list', role: 'list' }, items.map(function (a) { return h('li', null, [U.icon('check-cercle'), h('span', { text: a.titre })]); })) : h('p', { class: 'small', text: vide })]);
    }
    var blocs = [liste('Passées à « fait »', cmp.actionsFaites, 'Aucune action n\'est passée à « fait » entre ces deux états.')];
    if (cmp.actionsRouvertes.length) blocs.push(liste('Repassées à faire ou en cours', cmp.actionsRouvertes, ''));
    if (cmp.actionsSansObjet.length) blocs.push(liste('N\'ont plus lieu d\'être d\'après les données', cmp.actionsSansObjet, ''));
    if (cmp.actionsNouvelles.length) blocs.push(liste('Nouvelles actions', cmp.actionsNouvelles, ''));
    return h('section', { class: 'card', 'aria-labelledby': 'upg-act-t' }, [h('h3', { id: 'upg-act-t', text: 'Actions du plan' })].concat(blocs));
  }

  function carteParCode(cmp) {
    if (!cmp.parCode.length) return null;
    return h('section', { class: 'card', 'aria-labelledby': 'upg-code-t' }, [
      h('h3', { id: 'upg-code-t', text: 'Anomalies par type' }),
      h('div', { class: 'table-wrap' }, [h('table', { class: 'table small-table' }, [
        h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Type' }), h('th', { scope: 'col', class: 'num', text: 'Avant' }), h('th', { scope: 'col', class: 'num', text: 'Après' }), h('th', { scope: 'col', class: 'num', text: 'Écart' })])]),
        h('tbody', null, cmp.parCode.map(function (x) {
          return h('tr', null, [h('th', { scope: 'row', text: x.libelle }), h('td', { class: 'num', text: String(x.avant) }), h('td', { class: 'num', text: String(x.apres) }), h('td', { class: 'num', text: U.fmtNumSigne(x.apres - x.avant, 0) })]);
        }))
      ])])
    ]);
  }

  /* ---------- Vue ---------- */

  function render(container) {
    var s = S.state.session;
    if (etat.gen !== s.gen) { etat.gen = s.gen; etat.fichiers = []; etat.avant = null; etat.apres = null; etat.erreur = ''; etat.statut = ''; }
    var d = S.dossier();
    var liste = sources();
    var nouveauChoix = !trouver(liste, etat.avant) || !trouver(liste, etat.apres);
    if (!trouver(liste, etat.apres)) etat.apres = 'courant';
    if (!trouver(liste, etat.avant)) {
      var nv = d.versions.length;
      etat.avant = nv ? 'v:' + d.versions[nv - 1].id : null;
      // L'état actuel est identique à la dernière version : on compare plutôt les deux dernières versions.
      if (nv >= 2 && etat.apres === 'courant' && JSON.stringify(trouver(liste, 'courant').resume) === JSON.stringify(d.versions[nv - 1].resume)) {
        etat.avant = 'v:' + d.versions[nv - 2].id;
        etat.apres = 'v:' + d.versions[nv - 1].id;
      }
    }
    void nouveauChoix;
    U.clear(container);

    container.appendChild(h('div', { class: 'panel-top' }, [
      h('div', null, [
        h('h2', { id: 'upg-titre', tabindex: '-1', text: 'Mise à niveau : avant et après' }),
        h('p', { class: 'lead', text: 'Comparez deux états du dossier (deux versions enregistrées, l\'état actuel ou un second fichier .json) : indice de préparation, anomalies résolues et nouvelles, actions passées à « fait ».' })
      ]),
      h('a', { class: 'btn', href: '#tableau-de-bord' }, [h('span', { text: 'Retour au parcours' }), U.icon('fleche')])
    ]));
    container.appendChild(h('p', { class: 'notice' }, ['Les valeurs sont des estimations. Cette comparaison décrit ce qui a changé entre deux états du dossier ; elle ne promet aucun résultat et ne garantit aucune conformité. Seuls des résumés sont comparés : aucune donnée brute n\'est affichée ni envoyée.']));

    var infos = [];
    if (etat.erreur) infos.push(h('p', { class: 'alert', role: 'alert', text: etat.erreur }));
    if (etat.statut) infos.push(h('p', { class: 'notice', role: 'status', text: etat.statut }));
    infos.forEach(function (x) { container.appendChild(x); });

    function selecteur(id, libelle, valeur, onChange) {
      var sel = h('select', { id: id, class: 'champ upg-sel', 'data-fk': id }, liste.map(function (x) { return h('option', { value: x.id, selected: x.id === valeur ? true : null, text: x.libelle }); }));
      sel.addEventListener('change', function () { onChange(sel.value); actualiser(); });
      return h('div', { class: 'champ-groupe' }, [h('label', { for: id, text: libelle }), sel]);
    }
    var zone = DZ.creer({
      titre: 'Glissez un second dossier .equerre.json ici',
      accept: '.json,.equerre.json,application/json',
      description: 'Le fichier est lu dans votre navigateur, rien n\'est envoyé. Il sert seulement à la comparaison : il n\'est pas ouvert comme dossier.',
      onFile: chargerFichier,
      onMessage: function (t) { etat.statut = t; U.annoncer(t); }
    });
    container.appendChild(h('section', { class: 'card', 'aria-labelledby': 'upg-choix-t' }, [
      h('h3', { id: 'upg-choix-t', text: 'Choisir les deux états à comparer' }),
      d.versions.length ? null : h('p', { class: 'notice', text: 'Aucune version enregistrée dans ce dossier : enregistrez une version « avant » depuis l\'écran Dossier, puis revenez ici. Vous pouvez aussi charger un second fichier .json.' }),
      h('div', { class: 'upg-choix' }, [
        selecteur('upg-avant', 'Avant', etat.avant, function (v) { etat.avant = v; }),
        selecteur('upg-apres', 'Après', etat.apres, function (v) { etat.apres = v; })
      ]),
      h('details', { class: 'values' }, [h('summary', { text: 'Comparer avec un second fichier .json' }), zone.el])
    ]));

    var a = trouver(liste, etat.avant);
    var b = trouver(liste, etat.apres);
    if (!a || !b) {
      container.appendChild(h('div', { class: 'card vide' }, [h('p', { text: 'Choisissez un état « avant » pour afficher la comparaison.' })]));
      return;
    }
    if (a.id === b.id) {
      container.appendChild(h('div', { class: 'card vide' }, [h('p', { text: 'Choisissez deux états différents pour voir ce qui a changé.' })]));
      return;
    }
    var cmp = L.comparerResumes(a.resume, b.resume);
    container.appendChild(h('div', { id: 'upg-resultat' }, [
      cartesResume(cmp),
      h('div', { class: 'toolbar' }, [
        U.bouton('Exporter la comparaison (CSV)', { icone: 'telecharger', id: 'btn-export-upg', onclick: function () { IO.telechargerCsv('mise-a-niveau.csv', L.comparaisonToCsv(cmp)); } })
      ]),
      carteIndice(cmp),
      carteParCode(cmp),
      h('div', { class: 'two-col' }, [
        listeAnomalies('Anomalies résolues', 'upg-res-t', cmp.anomaliesResolues, 'upg-res'),
        listeAnomalies('Nouvelles anomalies', 'upg-nou-t', cmp.anomaliesNouvelles, 'upg-nou')
      ]),
      carteActions(cmp),
      h('p', { class: 'small', text: 'Chaque fiche est repérée par son SIREN s\'il est valide, sinon par son nom et son code postal : quand un SIREN est corrigé, les autres anomalies de la même fiche peuvent apparaître comme résolues puis nouvelles.' }),
      U.mentionConseil()
    ]));
  }

  /** Oublie les fichiers chargés pour comparaison et les choix (effacement de la session). */
  function reinitialiser() {
    etat.gen = -1; etat.fichiers = []; etat.avant = null; etat.apres = null; etat.erreur = ''; etat.statut = '';
  }

  E.views.upgrade = { render: render, reinitialiser: reinitialiser, etat: etat };
})(typeof self !== 'undefined' ? self : this);
