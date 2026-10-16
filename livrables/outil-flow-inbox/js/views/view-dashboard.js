/* Flow Inbox : écran d'ouverture, tableau de bord. Quatre repères lisibles de loin, puis les répartitions (semaine, complétude, catégorie, service),
 * le délai de première réponse, les budgets DÉCLARÉS et l'activité par responsable. Tout est calculé à la date de référence fixe de la démonstration,
 * à partir des données fictives : ce sont des indicateurs sur données fictives, pas des mesures de performance. Rien n'est envoyé. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var S = FI.ui.store;
  var G = FI.ui.graphiques;
  var A = FI.ui.aide;
  var TT = FI.ui.tooltip;
  var Ind = FI.core.indicateurs;
  var Dates = FI.core.dates;
  var Fmt = FI.core.format;
  var Data = root.FlowData;

  var NNBSP = ' ';

  function pl(n, un, plusieurs) { return n + ' ' + (n > 1 ? plusieurs : un); }

  function eur(n) { return Fmt.fmtEuros(n); }

  /** Carte d'un graphique : titre, bouton d'aide, mention « données fictives », corps. */
  function carte(id, titre, aideCle, enfants, classe) {
    var aide = aideCle ? A.bouton(aideCle) : null;
    return h('section', { class: 'card carte-dash ' + (classe || ''), 'aria-labelledby': id }, [
      h('div', { class: 'carte-entete' }, [
        h('h2', { id: id, text: titre }),
        aide ? aide.btn : null,
        h('span', { class: 'tag-fictif', text: 'Données fictives' })
      ]),
      aide ? aide.panneau : null
    ].concat(enfants));
  }

  function allerBoite(filtre) {
    S.etat.boite.filtre = filtre;
    S.etat.boite.q = '';
    S.etat.boite.semaine = '';
  }

  /** Repère : grand chiffre, libellé en toutes lettres, précision ; le lien couvre toute la carte. */
  function repere(o) {
    var lien = o.href
      ? h('a', { href: o.href, class: 'repere-lien', 'data-fk': 'kpi-' + o.cle, onclick: o.onclick }, [
        h('span', { class: 'repere-n', text: String(o.nombre) }), h('span', { class: 'repere-lib', text: o.libelle })
      ])
      : h('button', { type: 'button', class: 'repere-lien', 'data-fk': 'kpi-' + o.cle, onclick: o.onclick }, [
        h('span', { class: 'repere-n', text: String(o.nombre) }), h('span', { class: 'repere-lib', text: o.libelle })
      ]);
    var aide = A.bouton(o.aide);
    return h('article', { class: 'repere' + (o.alerte ? ' repere-alerte' : ''), 'data-repere': o.cle }, [
      h('div', { class: 'repere-tete' }, [
        o.alerte ? h('span', { class: 'repere-etiquette' }, [U.icon('alerte'), h('span', { text: 'À traiter en premier' })]) : h('span', { class: 'repere-etiquette neutre', text: o.etiquette }),
        aide.btn
      ]),
      lien,
      h('p', { class: 'repere-sous', text: o.sous }),
      o.liste || null,
      h('div', { class: 'repere-aide' }, [aide.panneau]),
      h('span', { class: 'repere-aller', 'aria-hidden': 'true' }, [h('span', { text: o.action }), U.icon('fleche')])
    ]);
  }

  /* ---------- Cartes ---------- */

  function carteSemaines(T) {
    var items = T.parSemaine.map(function (w) {
      return {
        libelle: w.libelle, sous: w.enCours ? 'en cours' : '', valeur: w.demandes,
        infobulle: { titre: 'Semaine du ' + Dates.fmtDateCourte(w.debut) + ' au ' + Dates.fmtDateCourte(w.fin), lignes: [pl(w.demandes, 'demande reçue', 'demandes reçues'), pl(w.messages, 'message au total', 'messages au total')] }
      };
    });
    return carte('t-semaines', 'Demandes reçues par semaine', 'recues', [
      G.colonnes({
        nom: 'Demandes reçues par semaine', items: items,
        tableau: { entetes: ['Semaine', 'Demandes', 'Messages'], lignes: T.parSemaine.map(function (w) { return [w.libelle + (w.enCours ? ' (en cours)' : ''), String(w.demandes), String(w.messages)]; }) }
      }),
      h('p', { class: 'note-carte secondaire', text: 'Du lundi au dimanche ; la dernière semaine s\'arrête à la date de référence. ' + T.demandes + ' demandes pour ' + T.messages + ' messages.' })
    ]);
  }

  function carteCompletude(T) {
    var c = T.completude;
    return carte('t-completude', 'Demandes complètes, incomplètes, en revue', 'completude', [
      G.empile({
        nom: 'Part des demandes complètes, incomplètes et en revue', total: c.base,
        segments: [
          { libelle: 'Complètes', valeur: c.completes, infobulle: { titre: 'Complètes', lignes: [pl(c.completes, 'demande', 'demandes') + ' avec les six informations relevées'] } },
          { libelle: 'Incomplètes', valeur: c.incompletes, infobulle: { titre: 'Incomplètes', lignes: [pl(c.incompletes, 'demande', 'demandes') + ' avec au moins une information absente'] } },
          { libelle: 'En revue', valeur: c.enRevue, infobulle: { titre: 'En revue', lignes: [pl(c.enRevue, 'demande', 'demandes') + ' avec une information à vérifier', c.enRevueStatut + ' au statut « En revue » (comme dans la boîte)'] } }
        ]
      }),
      h('p', { class: 'note-carte' }, [
        'Sur ' + pl(c.base, 'demande', 'demandes') + ' dans le périmètre de l\'agence (', pl(c.horsPerimetre, 'demande hors périmètre exclue', 'demandes hors périmètre exclues'),
        '). « En revue » : au moins une information à vérifier, dont ' + c.enRevueStatut + ' au statut « En revue » dans la boîte.'
      ])
    ]);
  }

  function carteCategories(T) {
    var total = T.messages;
    return carte('t-categories', 'Répartition par catégorie', null, [
      G.barresH({
        nom: 'Messages par catégorie', total: total, colonnes: ['Catégorie', 'Messages'],
        items: T.categories.map(function (c) {
          return { libelle: c.libelle, valeur: c.n, infobulle: { titre: c.libelle, lignes: [pl(c.n, 'message', 'messages') + ' sur ' + total] } };
        })
      }),
      h('p', { class: 'note-carte secondaire', text: total + ' messages reçus, tous classés par catégorie ; seules les nouvelles demandes, clients existants, relances de prospects et demandes hors périmètre attendent une réponse.' })
    ]);
  }

  function carteServices(T) {
    var total = T.demandes;
    return carte('t-services', 'Répartition par service demandé', null, [
      G.barresH({
        nom: 'Demandes par service demandé', total: total, colonnes: ['Service', 'Demandes'],
        items: T.services.map(function (c) {
          return { libelle: c.libelle, valeur: c.n, infobulle: { titre: c.libelle, lignes: [pl(c.n, 'demande', 'demandes') + ' sur ' + total].concat(c.aVerifier ? [c.aVerifier + ' avec un service à vérifier'] : []) } };
        })
      }),
      h('p', { class: 'note-carte secondaire', text: 'Service relevé dans le message ; « Hors catalogue » : impression, informatique, traduction.' })
    ]);
  }

  function carteDelai(T) {
    var d = T.delaiReponse;
    return carte('t-delai', 'Délai de première réponse', 'delai', [
      d.n ? h('div', { class: 'delai-grand' }, [
        h('p', { class: 'delai-n' }, [Ind.fmtDuree(d.mediane), h('span', { class: 'delai-unite', text: ' ouvrées' })]),
        h('p', { class: 'delai-lib', text: 'Médiane en heures ouvrées (lundi au vendredi, ' + parseInt(Data.parametres.horaires.debut, 10) + ' h à ' + parseInt(Data.parametres.horaires.fin, 10) + ' h' + '), sur ' + pl(d.n, 'demande répondue', 'demandes répondues') + '.' })
      ]) : G.vide('Aucune demande n\'a encore reçu de réponse.'),
      d.n ? G.barresH({
        nom: 'Répartition des délais de première réponse', total: d.n, colonnes: ['Délai', 'Demandes'],
        items: d.tranches.map(function (t) {
          return { libelle: t.libelle, valeur: t.n, infobulle: { titre: t.libelle, lignes: [pl(t.n, 'demande', 'demandes') + ' sur ' + d.n] } };
        })
      }) : null,
      h('p', { class: 'note-carte' }, [
        d.n ? 'Du plus rapide (' + Ind.fmtDuree(d.min) + ' ouvrées) au plus lent (' + Ind.fmtDuree(d.max) + ' ouvrées). ' : '',
        pl(d.sansReponse, 'demande n\'a encore reçu aucune réponse', 'demandes n\'ont encore reçu aucune réponse') + ' : elles ne sont pas dans le calcul, qui ne porte donc que sur les demandes répondues. Dates fictives.'
      ])
    ]);
  }

  function lignePlage(libelle, g, unite) {
    var min = g.minCumule, max = g.maxCumule;
    var texte = !g.n ? 'aucun' : max < min ? 'au moins ' + eur(min) + (unite ? ' ' + unite : '') + ' (maximum non défini)' : 'de ' + eur(min) + ' à ' + eur(max) + (unite ? ' ' + unite : '');
    var plus = [];
    if (g.ouverts) plus.push(pl(g.ouverts, '« à partir de » sans plafond', '« à partir de » sans plafond') + ' (au moins ' + eur(g.seuilsOuverts) + ' de plus, non inclus au maximum)');
    if (g.plafonds) plus.push(pl(g.plafonds, 'plafond compté pour 0 au minimum', 'plafonds comptés pour 0 au minimum'));
    return h('li', null, [
      h('strong', { text: libelle + ' : ' }), texte,
      h('span', { class: 'sous', text: pl(g.n, 'demande', 'demandes') + (plus.length ? ' · ' + plus.join(' · ') : '') })
    ]);
  }

  function carteBudgets(T) {
    var b = T.budgets;
    var p = b.ponctuels;
    var rec = b.recurrents;
    var periodes = Object.keys(Ind.PERIODES).filter(function (k) { return rec[k].n; });
    var tranches = G.barresH({
      nom: 'Budgets ponctuels déclarés par tranche', total: p.n, colonnes: ['Tranche', 'Demandes'],
      items: b.tranches.map(function (t) {
        return { libelle: t.libelle, valeur: t.n, infobulle: { titre: t.libelle, lignes: [pl(t.n, 'demande', 'demandes') + ' sur ' + p.n, 'Classées selon le montant le plus bas annoncé, ou le plafond'] } };
      })
    });
    return carte('t-budgets', 'Budgets déclarés par les prospects', 'budgets', [
      h('p', { class: 'avertissement-budget' }, [U.icon('info'), h('span', { text: 'Déclarés par les prospects, non garantis : ce ne sont pas des prix de l\'agence, ni du chiffre d\'affaires.' })]),
      h('div', { class: 'budget-bornes' }, [
        h('div', { class: 'borne' }, [h('p', { class: 'borne-lib', text: 'Minimum déclaré' }), h('p', { class: 'borne-n', text: eur(p.minCumule) })]),
        h('div', { class: 'borne-sep', 'aria-hidden': 'true', text: 'à' }),
        h('div', { class: 'borne' }, [h('p', { class: 'borne-lib', text: 'Maximum déclaré' }), h('p', { class: 'borne-n', text: eur(p.maxCumule) })])
      ]),
      h('p', { class: 'note-carte' }, [
        'Budgets ponctuels de ' + pl(p.n, 'demande', 'demandes') + ' : le minimum additionne les montants bas annoncés, le maximum les montants hauts. ',
        p.ouverts ? pl(p.ouverts, 'budget « à partir de » n\'a pas de maximum', 'budgets « à partir de » n\'ont pas de maximum') + ' (au moins ' + eur(p.seuilsOuverts) + ' de plus, hors total). ' : '',
        p.plafonds ? pl(p.plafonds, 'plafond compte', 'plafonds comptent') + ' pour 0 au minimum. ' : '',
        'Ces deux bornes encadrent ce que les prospects ont écrit ; elles ne disent rien de ce qui serait signé.'
      ]),
      tranches,
      periodes.length ? h('div', { class: 'budgets-rec' }, [
        h('h3', { text: 'Budgets annoncés par période (non additionnés aux montants ponctuels)' }),
        h('ul', { class: 'liste-plain' }, periodes.map(function (k) { return lignePlage('Montants ' + Ind.PERIODES[k], rec[k], Ind.PERIODES[k]); }))
      ]) : null,
      h('p', { class: 'note-carte' }, [
        pl(b.sansMontant, 'demande sans montant utilisable', 'demandes sans montant utilisable') + ' (budget absent ou à confirmer sans chiffre) sur ' + b.n + ' dans le périmètre. ',
        p.aVerifier ? pl(p.aVerifier, 'budget ponctuel est', 'budgets ponctuels sont') + ' marqué « à vérifier ».' : ''
      ])
    ], 'carte-large');
  }

  function carteResponsables(T) {
    var max = Math.max.apply(null, T.responsables.map(function (r) { return r.demandes; }).concat([1]));
    var corps = T.responsables.map(function (r) {
      var svg = document.createElementNS(U.SVGNS, 'svg');
      svg.setAttribute('class', 'mini-barre'); svg.setAttribute('viewBox', '0 0 100 10'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
      var piste = document.createElementNS(U.SVGNS, 'rect'); piste.setAttribute('class', 'barre-piste'); piste.setAttribute('width', '100'); piste.setAttribute('height', '10');
      var rect = document.createElementNS(U.SVGNS, 'rect'); rect.setAttribute('class', 'barre-rect'); rect.setAttribute('width', String(r.demandes / max * 100)); rect.setAttribute('height', '10');
      svg.appendChild(piste); svg.appendChild(rect);
      return h('tr', { class: r.enRetard ? 'a-relancer' : null }, [
        h('th', { scope: 'row', text: r.libelle }),
        h('td', { class: 'num' }, [h('span', { class: 'mini-n', text: String(r.demandes) }), svg]),
        h('td', { class: 'num', text: String(r.repondues) }),
        h('td', { class: 'num', text: String(r.aTraiter) }),
        h('td', { class: 'num' }, [r.enRetard ? h('span', { class: 'retard petit' }, [U.icon('alerte'), h('span', { text: String(r.enRetard) })]) : '0'])
      ]);
    });
    return carte('t-resp', 'Activité par responsable', 'responsable', [
      h('div', { class: 'table-wrap' }, [h('table', { class: 'table petit-tableau table-resp' }, [
        h('caption', { class: 'visually-hidden', text: 'Demandes par responsable : attribuées, répondues, à traiter, sans réponse au-delà du délai' }),
        h('thead', null, [h('tr', null, [
          h('th', { scope: 'col', text: 'Responsable' }), h('th', { scope: 'col', class: 'num', text: 'Demandes' }), h('th', { scope: 'col', class: 'num', text: 'Répondues' }),
          h('th', { scope: 'col', class: 'num', text: 'À traiter' }), h('th', { scope: 'col', class: 'num', text: 'Sans réponse au-delà du délai' })
        ])]),
        h('tbody', null, corps)
      ])]),
      h('p', { class: 'note-carte secondaire', text: 'Une demande compte pour la personne qui en est responsable ; « Non attribué » regroupe celles qui n\'ont pas encore de responsable. Équipe fictive.' })
    ], 'carte-large');
  }

  function sectionManquantes(T) {
    var c = T.completude;
    var details = h('details', { class: 'detail-manquantes', id: 'manquantes' }, [
      h('summary', { 'data-fk': 'manquantes-resume', text: 'Quelles demandes ? ' + pl(c.manquantes, 'demande avec', 'demandes avec') + ' au moins une information absente' }),
      c.liste.length ? h('div', { class: 'table-wrap' }, [h('table', { class: 'table petit-tableau' }, [
        h('caption', { class: 'visually-hidden', text: 'Demandes avec informations manquantes' }),
        h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Demande' }), h('th', { scope: 'col', text: 'Informations absentes' })])]),
        h('tbody', null, c.liste.map(function (l) {
          return h('tr', null, [
            h('th', { scope: 'row' }, [h('a', { href: '#message/' + l.id, text: l.entreprise })]),
            h('td', { text: l.champs.map(function (k) { return Ind.CHAMPS_LIBELLES[k]; }).join(', ') })
          ]);
        }))
      ])]) : G.vide('Aucune demande n\'a d\'information manquante.')
    ]);
    return details;
  }

  /* ---------- Écran ---------- */

  function render(c) {
    var T = S.tableauDeBord();
    var delai = T.delai;
    var retard = T.sansReponse;
    var cp = T.completude;
    var sems = T.semaines;
    var debut = sems[0].debut, fin = sems[sems.length - 1].fin;

    var liste = h('ul', { class: 'repere-liste' }, retard.items.map(function (i) {
      return h('li', null, [h('span', { class: 'repere-nom', text: i.entreprise }), h('span', { class: 'repere-age', text: Dates.fmtJoursOuvres(i.anciennete) })]);
    }));

    var reperes = h('div', { class: 'reperes', role: 'group', 'aria-label': 'Quatre repères du jour' }, [
      repere({
        cle: 'recues', aide: 'recues', etiquette: 'Reçues', nombre: T.demandes, libelle: 'demandes reçues sur 4 semaines',
        sous: T.messages + ' messages au total · ' + T.horsPerimetre + ' hors périmètre · du ' + Dates.fmtDateCourte(debut) + ' au ' + Dates.fmtDateCourte(fin),
        href: '#boite', action: 'Ouvrir la boîte de réception', onclick: function () { allerBoite('toutes'); }
      }),
      repere({
        cle: 'atraiter', aide: 'atraiter', etiquette: 'En cours', nombre: T.aTraiter.n, libelle: T.aTraiter.n > 1 ? 'demandes à traiter' : 'demande à traiter',
        sous: pl(T.aTraiter.messages, 'message', 'messages') + ' au statut « À traiter » dans la boîte',
        href: '#boite', action: 'Voir les messages à traiter', onclick: function () { allerBoite('a_traiter'); }
      }),
      repere({
        cle: 'retard', aide: 'retard', alerte: true, nombre: retard.n, libelle: (retard.n > 1 ? 'demandes sans réponse' : 'demande sans réponse') + ' au-delà de ' + Dates.pluriel(delai, 'jour ouvré', 'jours ouvrés'),
        sous: pl(retard.messages, 'message', 'messages') + ' · ' + retard.aSurveiller + ' autres à surveiller dans le délai',
        liste: liste, href: '#relances', action: 'Ouvrir les relances'
      }),
      repere({
        cle: 'manquantes', aide: 'manquantes', etiquette: 'À compléter', nombre: cp.manquantes, libelle: cp.manquantes > 1 ? 'demandes avec informations manquantes' : 'demande avec informations manquantes',
        sous: 'sur ' + cp.base + ' demandes dans le périmètre · budget absent dans ' + cp.parChamp.budget + ', délai dans ' + cp.parChamp.delai,
        action: 'Voir lesquelles',
        onclick: function () {
          var d = U.$('manquantes');
          if (d) { d.open = true; d.scrollIntoView({ block: 'center', behavior: U.mediaReduit() ? 'auto' : 'smooth' }); var r = d.querySelector('summary'); if (r) r.focus({ preventScroll: true }); }
        }
      })
    ]);

    U.clear(c);
    c.appendChild(h('section', { class: 'vue-dashboard', 'aria-labelledby': 'titre-vue' }, [
      h('div', { class: 'dash-tete' }, [
        h('div', null, [
          h('h1', { id: 'titre-vue', tabindex: '-1', text: 'Tableau de bord' }),
          h('p', { class: 'lead lead-garde' }, [
            'Situation au ' + Dates.fmtJourLong(S.ref()) + ', ' + Dates.fmtHeure(S.ref()) + ' (date de référence fixe de la démonstration). ',
            'Ce sont des indicateurs calculés sur des données fictives, pas des mesures de performance.'
          ])
        ]),
        h('div', { class: 'dash-actions' }, [
          h('a', { href: '#rapport', class: 'btn', 'data-fk': 'vers-rapport' }, [U.icon('document'), h('span', { text: 'Rapport de la semaine' })])
        ])
      ]),
      reperes,
      h('p', { class: 'ligne-garantie', role: 'status' }, [U.icon('check-cercle'), h('strong', { text: 'Rien n\'a été envoyé automatiquement.' }), h('span', { class: 'secondaire', text: ' L\'outil prépare, une personne relit et décide.' })]),
      sectionManquantes(T),
      h('div', { class: 'grille-dash' }, [
        carteSemaines(T), carteCompletude(T), carteCategories(T), carteServices(T), carteDelai(T), carteBudgets(T), carteResponsables(T)
      ])
    ]));
    TT.masquer();
  }

  FI.views.dashboard = { render: render, titre: 'Tableau de bord' };
})(typeof self !== 'undefined' ? self : this);
