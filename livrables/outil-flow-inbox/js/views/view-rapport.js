/* Flow Inbox : rapport hebdomadaire imprimable (A4) pour le dirigeant de l'agence. Trois feuilles : page de garde, synthèse de la semaine,
 * demandes à relancer et points de vigilance. La semaine est sélectionnable ; la situation est reconstituée à la clôture de la semaine.
 * Pied de page « Données fictives de démonstration » ; aucune promesse de gain. La mise en page d'impression est dans styles/print.css. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var S = FI.ui.store;
  var Dates = FI.core.dates;
  var Ind = FI.core.indicateurs;
  var Ctx = FI.core.contexte;
  var Data = root.FlowData;

  var NNBSP = ' ';

  function pl(n, un, plusieurs) { return n + ' ' + (n > 1 ? plusieurs : un); }
  function pct(n, total) { return total > 0 ? Math.round(100 * n / total) + NNBSP + '%' : '0' + NNBSP + '%'; }

  function piedTexte(r) {
    return 'Données fictives de démonstration · Flow Inbox · ' + Data.agence.nom + ' · Semaine du ' + Dates.fmtDate(r.semaine.debut) + ' au ' + Dates.fmtDate(r.semaine.fin);
  }

  /** Une feuille A4 : contenu + pied de page. */
  function feuille(classe, num, total, r, enfants) {
    return h('article', { class: 'feuille ' + classe, 'aria-label': 'Feuille ' + num + ' sur ' + total }, [
      h('div', { class: 'feuille-corps' }, enfants),
      h('p', { class: 'feuille-pied' }, [h('span', { text: piedTexte(r) }), h('span', { class: 'feuille-num', text: 'Feuille ' + num + ' sur ' + total })])
    ]);
  }

  function entete(r, titre) {
    return h('div', { class: 'r-entete' }, [
      h('span', { class: 'r-marque-p', text: 'flow Inbox' }),
      h('span', { text: titre + ' · ' + Dates.fmtDateCourte(r.semaine.debut) + ' au ' + Dates.fmtDateCourte(r.semaine.fin) })
    ]);
  }

  function chiffre(valeur, libelle, precision) {
    return h('div', { class: 'r-chiffre' }, [
      h('p', { class: 'r-chiffre-n', text: valeur }),
      h('p', { class: 'r-chiffre-lib', text: libelle }),
      precision ? h('p', { class: 'r-chiffre-prec', text: precision }) : null
    ]);
  }

  function tableau(caption, entetes, lignes, classe) {
    return h('table', { class: 'r-table ' + (classe || '') }, [
      h('caption', { class: 'visually-hidden', text: caption }),
      h('thead', null, [h('tr', null, entetes.map(function (e, i) { return h('th', { scope: 'col', class: i ? 'num' : null, text: e }); }))]),
      h('tbody', null, lignes.map(function (l) {
        return h('tr', null, l.map(function (c, i) { return i === 0 ? h('th', { scope: 'row', text: c }) : h('td', { class: 'num', text: c }); }));
      }))
    ]);
  }

  function pageGarde(r) {
    var s = r.semaine;
    var dirigeant = Ctx.personne(S.ctx, 'camille');
    return feuille('feuille-couverture', 1, 3, r, [
      h('p', { class: 'r-marque' }, [h('span', { text: 'flow ' }), h('span', { class: 'r-marque-sous', text: 'Inbox' })]),
      h('div', { class: 'r-centre' }, [
        h('p', { class: 'r-surtitre', text: 'Rapport hebdomadaire' }),
        h('h2', { class: 'r-titre', text: 'Les demandes reçues par e-mail' }),
        h('p', { class: 'r-entreprise', text: Data.agence.nom }),
        h('dl', { class: 'r-meta' }, [
          h('div', null, [h('dt', { text: 'Semaine' }), h('dd', { text: 'du ' + Dates.fmtJourLong(s.debut) + ' au ' + Dates.fmtJourLong(s.fin) })]),
          h('div', null, [h('dt', { text: 'Situation arrêtée' }), h('dd', { text: 'au ' + Dates.fmtDateHeure(r.cloture) + (r.enCours ? ' (date de référence de la démonstration)' : '') })]),
          h('div', null, [h('dt', { text: 'Destinataire' }), h('dd', { text: dirigeant ? dirigeant.nom + ', ' + dirigeant.role.toLowerCase() + ' (personnes fictives)' : 'Dirigeant de l\'agence' })]),
          h('div', null, [h('dt', { text: 'Contenu' }), h('dd', { text: 'Synthèse de la semaine, demandes à relancer, répartition par service et par catégorie, points de vigilance' })])
        ])
      ]),
      h('div', { class: 'r-cadre' }, [
        h('strong', { text: 'Données fictives de démonstration' }),
        h('span', { text: 'Ce rapport est calculé sur des e-mails inventés, à la date de référence fixe de la démonstration. Aucune boîte réelle n\'a été lue, rien n\'a été envoyé. Les chiffres décrivent ces données fictives : ils ne mesurent aucune performance et ne promettent aucun résultat.' })
      ])
    ]);
  }

  function pageSynthese(r) {
    var c = r.completude;
    var medianTexte = r.delaiMedian === null ? 'Aucune réponse' : Ind.fmtDuree(r.delaiMedian) + ' ouvrées';
    var services = r.services.length
      ? tableau('Demandes reçues dans la semaine par service demandé', ['Service demandé', 'Demandes', 'Part'], r.services.map(function (x) { return [x.libelle, String(x.n), pct(x.n, r.recues)]; }), 'r-t-serv')
      : h('p', { class: 'r-vide' }, [U.icon('info'), h('span', { text: 'Aucune demande reçue cette semaine.' })]);
    var cats = r.categories.length
      ? tableau('Messages reçus dans la semaine par catégorie', ['Catégorie', 'Messages', 'Part'], r.categories.map(function (x) { return [x.libelle, String(x.n), pct(x.n, r.messages)]; }), 'r-t-cat')
      : h('p', { class: 'r-vide' }, [U.icon('info'), h('span', { text: 'Aucun message reçu cette semaine.' })]);
    return feuille('feuille-synthese', 2, 3, r, [
      entete(r, 'Synthèse'),
      h('h3', { class: 'r-h', text: 'Synthèse de la semaine' }),
      h('div', { class: 'r-chiffres' }, [
        chiffre(String(r.recues), r.recues > 1 ? 'demandes reçues' : 'demande reçue', pl(r.messages, 'message', 'messages') + ' au total'),
        chiffre(String(r.traitees), r.traitees > 1 ? 'demandes traitées' : 'demande traitée', 'première réponse donnée dans la semaine'),
        chiffre(String(r.enAttente), r.enAttente > 1 ? 'demandes en attente' : 'demande en attente', 'sans réponse à la clôture'),
        chiffre(medianTexte, 'délai médian de première réponse', r.delaiN ? 'sur ' + pl(r.delaiN, 'demande répondue', 'demandes répondues') + ' dans la semaine' : null)
      ]),
      h('p', { class: 'r-petit', text: '« Traitées » : demandes dont la première réponse de l\'agence date de la semaine. « En attente » : demandes, de cette semaine ou plus anciennes, qui n\'avaient reçu aucune réponse à la clôture de la semaine. Délai en heures ouvrées (lundi au vendredi, 9 h à 18 h), calculé sur les dates fictives.' }),
      h('h4', { class: 'r-h2', text: 'État des demandes reçues cette semaine' }),
      c.base
        ? h('p', { class: 'r-resume', text: pl(c.completes, 'complète', 'complètes') + ' · ' + pl(c.incompletes, 'incomplète', 'incomplètes') + ' · ' + c.enRevue + ' en revue, sur ' + pl(c.base, 'demande', 'demandes') + ' dans le périmètre de l\'agence' + (c.horsPerimetre ? ' (' + pl(c.horsPerimetre, 'hors périmètre exclue', 'hors périmètre exclues') + ')' : '') + '.' })
        : h('p', { class: 'r-resume', text: 'Aucune demande dans le périmètre cette semaine.' }),
      h('h4', { class: 'r-h2', text: 'Répartition par service demandé' }),
      services,
      h('h4', { class: 'r-h2', text: 'Répartition des messages par catégorie' }),
      cats
    ]);
  }

  function pageRelances(r) {
    var lignes = r.relances.map(function (x) {
      return [x.entreprise + ' : ' + x.objet, Dates.fmtDateCourte(x.recu), Dates.fmtJoursOuvres(x.anciennete)].concat(r.enCours ? [x.responsable ? Ctx.nomPersonne(S.ctx, x.responsable) : 'Non attribué'] : []);
    });
    var entetes = ['Demande', 'Reçue le', 'Ancienneté'].concat(r.enCours ? ['Responsable'] : []);
    var relances = r.relances.length
      ? h('table', { class: 'r-table r-t-rel' }, [
        h('caption', { class: 'visually-hidden', text: 'Demandes sans réponse au-delà du délai convenu à la clôture de la semaine' }),
        h('thead', null, [h('tr', null, entetes.map(function (e, i) { return h('th', { scope: 'col', class: i > 0 ? 'num' : null, text: e }); }))]),
        h('tbody', null, lignes.map(function (l) {
          return h('tr', null, l.map(function (cel, i) { return i === 0 ? h('th', { scope: 'row', text: cel }) : h('td', { class: 'num', text: cel }); }));
        }))
      ])
      : h('p', { class: 'r-vide' }, [U.icon('check-cercle'), h('span', { text: 'Aucune demande n\'avait dépassé le délai convenu à la clôture de cette semaine.' })]);
    var niveaux = { haut: 'Priorité haute', moyen: 'Priorité moyenne', bas: 'À noter' };
    var vigilance = r.vigilance.length
      ? h('ul', { class: 'r-alertes' }, r.vigilance.map(function (v) {
        return h('li', { class: 'r-niv-' + v.niveau }, [U.icon(v.niveau === 'haut' ? 'alerte' : 'oeil'), h('span', null, [h('strong', { text: niveaux[v.niveau] + ' : ' }), v.texte])]);
      }))
      : h('p', { class: 'r-vide' }, [U.icon('check-cercle'), h('span', { text: 'Aucun point de vigilance pour cette semaine.' })]);
    return feuille('feuille-plan', 3, 3, r, [
      entete(r, 'À relancer et vigilance'),
      h('h3', { class: 'r-h', text: 'Demandes à relancer' }),
      h('p', { class: 'r-resume', text: pl(r.aRelancer, 'demande sans réponse', 'demandes sans réponse') + ' au-delà de ' + Dates.pluriel(S.delai(), 'jour ouvré', 'jours ouvrés') + ' à la clôture de la semaine' + (r.aSurveiller ? ' ; ' + r.aSurveiller + ' autres encore dans le délai.' : '.') }),
      relances,
      h('p', { class: 'r-petit', text: 'Le texte de relance est préparé à relire dans l\'écran Relances de l\'outil. Il n\'est jamais envoyé automatiquement : une personne le relit et décide.' }),
      h('h3', { class: 'r-h', text: 'Points de vigilance' }),
      vigilance,
      h('h4', { class: 'r-h2', text: 'Comment lire ce rapport' }),
      h('ul', { class: 'r-notes' }, [
        h('li', { text: 'Les chiffres viennent de ' + pl(S.emails().length, 'e-mail fictif', 'e-mails fictifs') + ' et de la date de référence fixe de la démonstration, jamais de l\'horloge d\'un ordinateur.' }),
        h('li', { text: 'Une information absente d\'un message reste absente : l\'outil ne la devine pas. Les cas ambigus passent en revue, une personne tranche.' }),
        h('li', { text: 'Ce rapport décrit une situation ; il ne promet aucun résultat et ne remplace pas le jugement de l\'équipe.' })
      ])
    ]);
  }

  function render(c) {
    var sems = S.semaines();
    var courantIdx = S.etat.rapport.semaine === null ? sems.length - 1 : Math.min(S.etat.rapport.semaine, sems.length - 1);
    var r = S.rapportSemaine(courantIdx);

    var sel = h('select', { id: 'sel-semaine', class: 'champ', 'data-fk': 'sel-semaine', onchange: function () {
      S.setSemaineRapport(parseInt(this.value, 10));
      render(c);
      var s2 = U.$('sel-semaine');
      if (s2) s2.focus();
      U.annoncer('Rapport de la ' + S.semaines()[S.etat.rapport.semaine].libelle.toLowerCase() + '.');
    } }, sems.map(function (s) { return h('option', { value: String(s.index), text: s.libelle }); }));
    sel.value = String(courantIdx);

    U.clear(c);
    c.appendChild(h('section', { class: 'vue-rapport', 'aria-labelledby': 'titre-vue' }, [
      h('div', { class: 'r-ecran' }, [
        h('h1', { id: 'titre-vue', tabindex: '-1', text: 'Rapport hebdomadaire' }),
        h('p', { class: 'lead', text: 'Un rapport de trois feuilles A4 pour le dirigeant de l\'agence : synthèse de la semaine, demandes à relancer, répartition par service et par catégorie, points de vigilance. Choisissez la semaine, puis imprimez ou enregistrez en PDF.' }),
        h('div', { class: 'toolbar' }, [
          h('div', { class: 'champ-groupe' }, [h('label', { for: 'sel-semaine', text: 'Semaine du rapport' }), sel]),
          U.bouton('Imprimer / enregistrer en PDF', { primaire: true, icone: 'document', id: 'btn-imprimer', fk: 'imprimer', onclick: function () { root.print(); } })
        ]),
        h('p', { class: 'small', text: 'Format A4. Dans la fenêtre d\'impression, choisissez « Enregistrer au format PDF » comme destination ; décochez « En-têtes et pieds de page » du navigateur pour garder uniquement le pied de page du rapport. Rien n\'est envoyé : le fichier est créé sur cet ordinateur.' })
      ]),
      h('div', { class: 'feuilles' }, [pageGarde(r), pageSynthese(r), pageRelances(r)])
    ]));
  }

  FI.views.rapport = { render: render, titre: 'Rapport hebdomadaire' };
})(typeof self !== 'undefined' ? self : this);
