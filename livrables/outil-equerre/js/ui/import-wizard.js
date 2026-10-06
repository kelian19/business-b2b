/* Équerre : import assisté en 5 étapes (dépôt, aperçu, colonnes, vérification, confirmation).
 * Aucune règle métier ici : décodage, analyse, reconnaissance des colonnes et rapport viennent de EquerreLogic.
 * Tout texte issu d'un fichier (nom, cellules, colonnes) est rendu par textContent. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var L = root.EquerreLogic;
  var S = E.ui.store;
  var P = E.ui.perf;
  var IO = E.ui.io;
  var DZ = E.ui.dropzone;
  var Dlg = E.ui.dialog;
  var Der = E.ui.derived;

  var ETAPES = ['Dépôt', 'Aperçu', 'Colonnes', 'Vérification', 'Confirmation'];
  var compteur = 0;

  var DESCRIPTIONS = {
    tiers: 'Une ligne par client ou fournisseur. Colonnes attendues : nom et SIREN (obligatoires), puis SIRET, TVA, adresses.',
    factures: 'Un export de vos factures de vente : client, date d\'émission, montant HT, et le statut de paiement ou, à défaut, le solde restant dû (payée si le solde est nul). La date d\'échéance est facultative : sans elle, l\'ancienneté des impayés n\'est pas évaluable. Un SIREN du client permet un rapprochement exact.',
    lignes: 'Facultatif. Une ligne par ligne de facture : le contrôle automatique des 4 nouvelles mentions s\'appuie sur ces données (présent, manquant, à vérifier ou sans objet, facture par facture).',
    registre: 'Facultatif. Le fichier produit par l\'outil de vérification au registre (SIREN, état administratif, adresse). Les écarts apparaissent dans l\'étape 2, à vérifier : aucune valeur du registre n\'est appliquée automatiquement.'
  };

  function guideExport() {
    return h('details', { class: 'guide' }, [
      h('summary', { text: 'Comment exporter en CSV depuis Excel ou votre logiciel ?' }),
      h('div', { class: 'guide-corps' }, [
        h('p', { class: 'small', text: 'Un fichier CSV est un tableau enregistré en texte simple. Il ne faut pas enregistrer en .xlsx ni en .xls.' }),
        h('h4', { text: 'Depuis Excel' }),
        h('ol', null, [
          h('li', { text: 'Ouvrez votre tableau, puis choisissez Fichier > Enregistrer sous.' }),
          h('li', { text: 'Dans « Type de fichier », choisissez « CSV UTF-8 (séparateur : point-virgule) » ou, à défaut, « CSV (séparateur : point-virgule) ».' }),
          h('li', { text: 'Enregistrez, puis déposez ce fichier ici. Une seule feuille est enregistrée : celle qui est affichée.' })
        ]),
        h('h4', { text: 'Depuis votre logiciel de facturation ou de comptabilité' }),
        h('ol', null, [
          h('li', { text: 'Cherchez une fonction « Exporter », « Export tableur » ou « Export CSV » dans la liste de vos clients, de vos factures ou de vos lignes de factures.' }),
          h('li', { text: 'Gardez les en-têtes de colonnes sur la première ligne et n\'en renommez aucun : l\'assistant reconnaît les noms usuels et vous laisse corriger les autres.' }),
          h('li', { text: 'Si les accents sont illisibles après dépôt, réexportez le fichier en UTF-8.' })
        ]),
        h('p', { class: 'small', text: 'Dates : JJ/MM/AAAA, JJ/MM/AA (années 00 à 69 lues comme 2000 à 2069, 70 à 99 comme 1970 à 1999) ou AAAA-MM-JJ. Montants : la virgule ou le point décimal sont acceptés ; un montant avec un seul séparateur suivi de 3 chiffres (1.234 ou 1,234) est lu comme un nombre décimal (1,234) et signalé dans le rapport. Les dates enregistrées comme un nombre (par exemple 45000) ne sont pas lisibles : formatez la colonne en date avant d\'enregistrer.' })
      ])
    ]);
  }

  function texteStatut(c) {
    if (c.statut === 'reconnue') return 'Reconnue';
    if (c.statut === 'synonyme') return 'Reconnue par synonyme (' + c.brut + ' → ' + c.canonique + ')';
    if (c.statut === 'choisie') return 'Choisie par vous';
    return 'Ignorée';
  }
  function iconeStatut(c) {
    if (c.statut === 'reconnue' || c.statut === 'synonyme') return 'check-cercle';
    if (c.statut === 'choisie') return 'crayon';
    return 'info';
  }

  function badge(icone, texte, classe) {
    return h('span', { class: 'status ' + (classe || ''), }, [U.icon(icone), h('span', { text: texte })]);
  }

  /** Résumé d'un fichier déjà importé (depuis la table du dossier) : nom, date, compteurs, lignes ignorées. */
  function resumeFichier(table, kindId) {
    var s = table.source;
    var rap = table.rapport || { ignorees: [], totauxParRaison: {}, avertissements: [] };
    var nbIgn = Math.max(0, s.nbLues - s.nbRetenues);
    var raisons = Object.keys(rap.totauxParRaison || {});
    var infos = [
      h('p', null, [h('strong', { text: s.nomFichier || 'Fichier importé' }), h('span', { class: 'small', text: s.importeLe ? ' · importé le ' + U.fmtHeure(s.importeLe) : '' })]),
      h('p', { class: 'small', text: U.pluriel(s.nbLues, 'ligne lue', 'lignes lues') + ' · ' + U.pluriel(s.nbRetenues, 'retenue', 'retenues') + ' · ' + U.pluriel(nbIgn, 'ignorée', 'ignorées') +
        (s.encodage ? ' · encodage ' + s.encodage : '') + (s.separateur ? ' · séparateur « ' + (s.separateur === '\t' ? 'tabulation' : s.separateur) + ' »' : '') })
    ];
    if (raisons.length || (rap.avertissements && rap.avertissements.length)) {
      var det = [];
      if (raisons.length) {
        det.push(h('table', { class: 'table small-table' }, [
          h('caption', { class: 'visually-hidden', text: 'Lignes ignorées par raison' }),
          h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Raison' }), h('th', { scope: 'col', class: 'num', text: 'Lignes' })])]),
          h('tbody', null, raisons.map(function (r) { return h('tr', null, [h('td', { text: L.RAISONS[r] || r }), h('td', { class: 'num', text: U.fmtNum(rap.totauxParRaison[r]) })]); }))
        ]));
        if (rap.ignorees && rap.ignorees.length) {
          det.push(h('p', { class: 'small', text: 'Premières lignes ignorées (numéro de ligne du fichier) :' }));
          det.push(h('ul', { class: 'liste-simple' }, rap.ignorees.slice(0, 20).map(function (x) {
            return h('li', { text: 'Ligne ' + x.ligne + ' : ' + (L.RAISONS[x.raison] || x.raison) + (x.extrait ? ' (' + x.extrait + ')' : '') });
          })));
        }
      }
      (rap.avertissements || []).forEach(function (a) { det.push(h('p', { class: 'small', text: 'Point d\'attention : ' + a + '.' })); });
      infos.push(h('details', { class: 'guide' }, [h('summary', { text: 'Voir le rapport d\'import' }), h('div', { class: 'guide-corps' }, det)]));
    }
    return infos;
  }

  /** Carte d'import pour un type de fichier. opts : { description, titre }. Renvoie { el }. */
  function carte(kindId, opts) {
    opts = opts || {};
    var kind = L.KINDS[kindId];
    var uid = 'imp-' + kindId + '-' + (++compteur);
    var racine = h('section', { class: 'card import-card', 'aria-labelledby': uid + '-t', 'data-kind': kindId });
    var ouvert = false;      // assistant ouvert alors qu'un fichier est déjà importé
    var w = null;            // état de l'assistant

    var alerte = h('div', { class: 'alert', role: 'alert', hidden: true });
    var statut = h('p', { class: 'notice', role: 'status', hidden: true });
    var corps = h('div', { class: 'wiz-corps' });

    function dossier() { return S.dossier(); }
    function table() { var d = dossier(); return d ? d.donnees[kindId] : null; }

    function effacerMessages() { alerte.hidden = true; U.clear(alerte); statut.hidden = true; statut.textContent = ''; }
    function montrerProblemes(liste) {
      U.clear(alerte);
      liste.forEach(function (p) { alerte.appendChild(h('p', { text: p.message })); });
      alerte.hidden = !liste.length;
    }
    function montrerErreur(texte) { montrerProblemes([{ message: texte }]); }
    function montrerInfo(texte) { U.showMsg(statut, texte); }

    /* ----- Enveloppe ----- */

    function entete() {
      var aide = E.ui.aide.bouton('import');
      return h('div', { class: 'card-entete' }, [
        h('div', { class: 'card-tete' }, [
          U.icon(kindId === 'tiers' || kindId === 'registre' ? 'tableau' : 'document', 'card-ic'),
          h('div', null, [
            h('div', { class: 'titre-aide' }, [h('h3', { id: uid + '-t', text: opts.titre || kind.libelle }), aide.btn]),
            h('p', { class: 'small', text: opts.description || DESCRIPTIONS[kindId] })
          ])
        ]),
        aide.panneau
      ]);
    }

    function pied() {
      return h('div', { class: 'toolbar no-print import-outils' }, [
        U.bouton('Télécharger le modèle CSV vide', { icone: 'telecharger', onclick: function () { IO.telechargerCsv(kind.modeleNom, L.modeleCsv(kindId)); } })
      ]);
    }

    function refresh() {
      U.clear(racine);
      racine.appendChild(entete());
      if (S.estDemo()) {
        racine.appendChild(h('div', { class: 'empty-demo' }, [
          h('p', { text: 'Créez un dossier client pour importer vos fichiers.' }),
          h('p', { class: 'small', text: 'La démonstration reste séparée des données réelles : rien n\'est jamais mélangé.' }),
          h('a', { class: 'btn btn-primary', href: '#accueil' }, [h('span', { text: 'Créer un dossier client' })])
        ]));
        return;
      }
      var t = table();
      if (t && !ouvert) {
        racine.appendChild(h('div', { class: 'import-etat' }, [h('div', { class: 'import-ok' }, [badge('check-cercle', 'Fichier importé', 'status-ok')]), h('div', null, resumeFichier(t, kindId))]));
        racine.appendChild(h('div', { class: 'toolbar no-print' }, [
          U.bouton('Remplacer le fichier', { icone: 'upload', onclick: function () { ouvert = true; w = null; refresh(); } }),
          U.bouton('Télécharger le modèle CSV vide', { icone: 'telecharger', onclick: function () { IO.telechargerCsv(kind.modeleNom, L.modeleCsv(kindId)); } })
        ]));
        return;
      }
      racine.appendChild(alerte);
      racine.appendChild(statut);
      racine.appendChild(corps);
      if (!w) w = { step: 1 };
      rendre();
    }

    /* ----- Étapes ----- */

    function stepper(n) {
      return h('ol', { class: 'wiz-etapes', 'aria-label': 'Étapes de l\'import' }, ETAPES.map(function (nom, i) {
        return h('li', { class: i + 1 === n ? 'en-cours' : (i + 1 < n ? 'fait' : ''), 'aria-current': i + 1 === n ? 'step' : null }, [
          h('span', { class: 'wiz-num', text: String(i + 1) }), h('span', { text: nom })
        ]);
      }));
    }

    function titreEtape(n, texte) {
      return h('h4', { class: 'wiz-titre', tabindex: '-1', id: uid + '-h', text: 'Étape ' + n + ' sur 5 : ' + texte });
    }

    function pasDeRetour() { return h('button', { type: 'button', class: 'btn', onclick: annuler }, ['Annuler']); }

    function annuler() {
      effacerMessages();
      w = { step: 1 };
      ouvert = false;
      refresh();
    }

    function aller(n, focusSel) {
      w.step = n;
      rendre();
      var cible = focusSel ? racine.querySelector(focusSel) : racine.querySelector('.wiz-titre');
      if (cible) U.focus(cible);
    }

    function rendre() {
      racine.classList.toggle('large', w.step > 1);
      U.clear(corps);
      corps.appendChild(stepper(w.step));
      if (w.step === 1) etape1();
      else if (w.step === 2) etape2();
      else if (w.step === 3) etape3();
      else if (w.step === 4) etape4();
      else etape5();
    }

    /* Étape 1 : dépôt */
    function etape1() {
      corps.appendChild(titreEtape(1, 'déposer votre fichier'));
      var zone = DZ.creer({
        titre: 'Glissez votre fichier CSV ici',
        onFile: traiter,
        onMessage: montrerInfo
      });
      corps.appendChild(zone.el);
      corps.appendChild(h('p', { class: 'small aide-depot', text: 'Charger votre propre fichier (CSV) : glissez-le dans la zone ou utilisez « Choisir un fichier ».' }));
      corps.appendChild(pied());
      corps.appendChild(guideExport());
      if (table()) corps.appendChild(h('div', { class: 'toolbar' }, [pasDeRetour()]));
    }

    function traiter(fichier) {
      effacerMessages();
      if (L.extensionNonCsv(fichier.name)) { montrerErreur(L.MESSAGES.binaire); return; }
      if (fichier.size > L.CONST.MAX_FICHIER_OCTETS) { montrerErreur(L.MESSAGES.trop_gros); return; }
      var barre = P.barre('Lecture du fichier');
      U.clear(corps);
      corps.appendChild(stepper(1));
      corps.appendChild(titreEtape(1, 'lecture de ' + fichier.name));
      corps.appendChild(barre.el);
      barre.set(0, 'Lecture du fichier');
      IO.lireOctets(fichier, function (f) { barre.set(f * 0.2, 'Lecture du fichier'); }).then(function (octets) {
        barre.set(0.2, 'Décodage du fichier');
        return P.yieldToUi().then(function () {
          var dec = L.decodeBytes(octets);
          if (dec.suspectBinaire) { var e = new Error(L.MESSAGES.binaire); e.affichable = true; throw e; }
          var sep = L.detectSeparator(dec.texte);
          return P.analyserCsv(dec.texte, sep, function (f) { barre.set(0.25 + f * 0.75, 'Analyse du fichier'); }).then(function (parsed) {
            return { dec: dec, parsed: parsed };
          });
        });
      }).then(function (r) {
        var insp = L.inspectParsed(r.parsed, kindId, { bom: r.dec.bom, caracteresRemplaces: r.dec.caracteresRemplaces, encodage: r.dec.encodage });
        var problemes = L.diagnostiquer(insp);
        var fatal = problemes.filter(function (p) { return p.code !== 'colonnes' && p.code !== 'accents' && p.bloquant; });
        if (fatal.length) { w = { step: 1 }; rendre(); montrerProblemes(fatal); return; }
        w = { step: 2, nomFichier: fichier.name, dec: r.dec, parsed: r.parsed, overrides: [], table: null, prepared: null, rapport: null, vuIgn: 20 };
        aller(2);
      }).catch(function (e) {
        w = { step: 1 };
        rendre();
        montrerErreur(e && e.affichable ? e.message : (e && e.message) || 'Lecture impossible. Le fichier n\'a pas été modifié ni envoyé.');
      });
    }

    function mapping() { return L.suggestMapping(w.parsed.headers, kindId, w.overrides); }

    function problemesActuels() {
      var sm = mapping();
      var insp = L.inspectParsed(w.parsed, kindId, { bom: w.dec.bom, caracteresRemplaces: w.dec.caracteresRemplaces, encodage: w.dec.encodage }, w.overrides);
      void sm;
      return L.diagnostiquer(insp);
    }

    /* Étape 2 : aperçu */
    function etape2() {
      corps.appendChild(titreEtape(2, 'aperçu de ' + w.nomFichier));
      montrerProblemes(problemesActuels());
      var p = w.parsed;
      var sepTxt = p.separator === '\t' ? 'tabulation' : p.separator;
      corps.appendChild(h('ul', { class: 'infos-fichier' }, [
        h('li', { text: U.pluriel(p.rows.length, 'ligne de données', 'lignes de données') }),
        h('li', { text: 'Séparateur « ' + sepTxt + ' »' }),
        h('li', { text: 'Encodage ' + w.dec.encodage + (w.dec.bom ? ', BOM retiré' : '') })
      ]));
      corps.appendChild(h('h5', { text: 'Aperçu des ' + L.CONST.APERCU_LIGNES + ' premières lignes' }));
      var apercu = p.rows.slice(0, L.CONST.APERCU_LIGNES);
      corps.appendChild(h('div', { class: 'table-wrap' }, [h('table', { class: 'table apercu' }, [
        h('caption', { class: 'visually-hidden', text: 'Aperçu des premières lignes du fichier' }),
        h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Ligne' })].concat(p.headers.map(function (c) { return h('th', { scope: 'col', text: c || '(sans nom)' }); })))]),
        h('tbody', null, apercu.map(function (r, i) {
          return h('tr', null, [h('td', { class: 'num', text: String(p.lines[i]) })].concat(p.headers.map(function (c, j) { var v = r[j] === undefined ? '' : r[j]; return h('td', { text: v, title: v.length > 24 ? v : null }); })));
        }))
      ])]));
      corps.appendChild(h('p', { class: 'small', text: 'Évitez de charger un fichier réel pendant un partage d\'écran.' }));
      corps.appendChild(h('div', { class: 'wiz-nav' }, [
        pasDeRetour(),
        U.bouton('Continuer vers les colonnes', { primaire: true, icone: 'fleche', onclick: function () { aller(3); } })
      ]));
    }

    /* Étape 3 : colonnes */
    function etape3(focusKey) {
      corps.appendChild(titreEtape(3, 'vérifier les colonnes'));
      var sm = mapping();
      var pbs = problemesActuels();
      montrerProblemes(pbs);
      var optionsCibles = kind.entetes.map(function (c) { return { v: c, l: (kind.libelles[c] || c) + (kind.obligatoires.indexOf(c) >= 0 ? ' (obligatoire)' : '') }; });
      var lignes = w.parsed.headers.map(function (brut, j) {
        var c = sm.colonnes[j];
        var cur = w.overrides[j] === undefined ? 'auto' : w.overrides[j];
        var sel = h('select', {
          class: 'champ', 'data-key': 'sel-' + j, 'aria-label': 'Reconnaître la colonne « ' + (brut || 'sans nom') + ' » comme',
          onchange: function (e) {
            var v = e.target.value;
            w.overrides[j] = v === 'auto' ? undefined : v;
            U.clear(corps);
            corps.appendChild(stepper(3));
            etape3('[data-key="sel-' + j + '"]');
          }
        }, [h('option', { value: 'auto', text: 'Automatique' }), h('option', { value: '', text: 'Ignorer cette colonne' })]
          .concat(optionsCibles.map(function (o) { return h('option', { value: o.v, text: o.l }); })));
        sel.value = cur;
        return h('tr', null, [
          h('th', { scope: 'row', class: 'col-nom', text: brut || '(sans nom)' }),
          h('td', { text: c.canonique ? (kind.libelles[c.canonique] || c.canonique) : '–' }),
          h('td', null, [badge(iconeStatut(c), texteStatut(c), 'statut-' + c.statut)]),
          h('td', null, [sel])
        ]);
      });
      corps.appendChild(h('div', { class: 'table-wrap' }, [h('table', { class: 'table mappage' }, [
        h('caption', { class: 'visually-hidden', text: 'Correspondance entre les colonnes du fichier et les colonnes attendues' }),
        h('thead', null, [h('tr', null, ['Colonne du fichier', 'Reconnue comme', 'Statut', 'Votre choix'].map(function (t) { return h('th', { scope: 'col', text: t }); }))]),
        h('tbody', null, lignes)
      ])]));
      if (sm.conflits.length) {
        corps.appendChild(h('p', { class: 'small', text: 'Colonnes écartées car la cible était déjà prise : ' + sm.conflits.map(function (x) { return x.colonne + ' (déjà ' + x.retenue + ')'; }).join(', ') + '.' }));
      }
      corps.appendChild(h('h5', { text: 'Colonnes attendues' }));
      corps.appendChild(h('ul', { class: 'cibles' }, sm.cibles.map(function (c) {
        var etat;
        if (c.colonne >= 0) etat = badge('check-cercle', 'Trouvée : ' + (w.parsed.headers[c.colonne] || '(sans nom)'), 'status-ok');
        else if (c.obligatoire) etat = badge('croix-cercle', 'Obligatoire manquante', 'status-bloquant');
        else etat = badge('info', 'Facultative, absente : contrôle non réalisé', 'status-note');
        return h('li', null, [h('span', { class: 'cible-nom', text: c.libelle + (c.obligatoire ? ' *' : '') }), etat]);
      })));
      var bloque = sm.manquantes.length > 0;
      corps.appendChild(h('div', { class: 'wiz-nav' }, [
        h('button', { type: 'button', class: 'btn', onclick: function () { aller(2); } }, ['Précédent']),
        pasDeRetour(),
        h('button', { type: 'button', class: 'btn btn-primary', disabled: bloque, 'aria-describedby': bloque ? uid + '-bloc' : null, onclick: function () { aller(4); } }, [U.icon('fleche'), h('span', { text: 'Vérifier le fichier' })])
      ]));
      if (bloque) corps.appendChild(h('p', { class: 'small', id: uid + '-bloc', text: 'Choisissez, dans la colonne « Votre choix », la colonne du fichier qui correspond aux colonnes obligatoires manquantes.' }));
      if (focusKey) { var f = corps.querySelector(focusKey); if (f) U.focus(f); }
    }

    /* Étape 4 : vérification et rapport */
    function etape4() {
      corps.appendChild(titreEtape(4, 'vérification du fichier'));
      var sm = mapping();
      var sig = JSON.stringify(sm.mapping);
      if (w.prepared && w.sig === sig) { rapport(); return; }
      w.sig = sig;
      w.prepared = null;
      w.table = L.tableDepuisParse(w.parsed, sm.mapping, { nomFichier: w.nomFichier, encodage: w.dec.encodage, maintenant: U.maintenantIso() });
      var barre = P.barre('Vérification du fichier');
      corps.appendChild(barre.el);
      barre.set(0, 'Vérification du fichier');
      var table4 = w.table;
      Der.preparerTable(kindId, table4, function (f) { barre.set(f, kindId === 'tiers' ? 'Vérification et analyse du fichier' : 'Vérification du fichier'); }).then(function (prepared) {
        if (w.table !== table4 || w.step !== 4) return;
        w.prepared = prepared;
        w.rapport = L.finaliserTable(table4, prepared.eval, kindId);
        if (kindId === 'factures') {
          var refD = Der.refDate();
          var apres = prepared.eval.records.filter(function (inv) { return inv.dateEmission > refD; }).length;
          if (apres) w.rapport.avertissements.push(U.pluriel(apres, 'facture émise', 'factures émises') + ' après la date de référence du dossier (' + U.fmtDate(refD) + ') : ' + (apres > 1 ? 'elles sont comptées' : 'elle est comptée') + ' dans le chiffre d\'affaires et les échéances à venir ; vérifiez la date de référence');
        }
        U.clear(corps);
        corps.appendChild(stepper(4));
        corps.appendChild(titreEtape(4, 'rapport de vérification'));
        rapport();
        U.focus(corps.querySelector('.wiz-titre'));
        U.annoncer('Vérification terminée : ' + w.rapport.retenues + ' lignes retenues sur ' + w.rapport.lues + '.');
      });
    }

    function rerendreRapport() {
      U.clear(corps);
      corps.appendChild(stepper(4));
      corps.appendChild(titreEtape(4, 'rapport de vérification'));
      rapport();
      var plus = corps.querySelector('.wiz-titre');
      if (plus) U.focus(plus);
    }

    function rapport() {
      var r = w.rapport;
      var nbIgn = r.lues - r.retenues;
      corps.appendChild(h('div', { class: 'stats-import' }, [
        h('div', { class: 'stat' }, [h('p', { class: 'v', text: U.fmtNum(r.lues) }), h('p', { class: 'label', text: 'Lignes lues' })]),
        h('div', { class: 'stat' }, [h('p', { class: 'v', text: U.fmtNum(r.retenues) }), h('p', { class: 'label', text: 'Lignes retenues' })]),
        h('div', { class: 'stat' + (nbIgn ? ' stat-alerte' : '') }, [h('p', { class: 'v', text: U.fmtNum(nbIgn) }), h('p', { class: 'label', text: 'Lignes ignorées' })])
      ]));
      var raisons = Object.keys(r.totauxParRaison);
      if (raisons.length) {
        corps.appendChild(h('h5', { text: 'Lignes ignorées, par raison' }));
        corps.appendChild(h('table', { class: 'table small-table' }, [
          h('caption', { class: 'visually-hidden', text: 'Lignes ignorées par raison' }),
          h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Raison' }), h('th', { scope: 'col', class: 'num', text: 'Lignes' })])]),
          h('tbody', null, raisons.map(function (k) { return h('tr', null, [h('td', { text: L.RAISONS[k] || k }), h('td', { class: 'num', text: U.fmtNum(r.totauxParRaison[k]) })]); }))
        ]));
        var vus = Math.min(w.vuIgn, r.ignorees.length);
        corps.appendChild(h('h5', { text: 'Détail des lignes ignorées (numéro de ligne du fichier)' }));
        corps.appendChild(h('div', { class: 'table-wrap' }, [h('table', { class: 'table small-table' }, [
          h('caption', { class: 'visually-hidden', text: 'Lignes ignorées' }),
          h('thead', null, [h('tr', null, ['Ligne', 'Raison', 'Extrait'].map(function (t, i) { return h('th', { scope: 'col', class: i === 0 ? 'num' : '', text: t }); }))]),
          h('tbody', null, r.ignorees.slice(0, vus).map(function (x) {
            return h('tr', null, [h('td', { class: 'num', text: String(x.ligne) }), h('td', { text: L.RAISONS[x.raison] || x.raison }), h('td', { class: 'extrait', text: x.extrait || '' })]);
          }))
        ])]));
        var reste = r.ignorees.length - vus;
        if (reste > 0) {
          corps.appendChild(h('button', { type: 'button', class: 'btn btn-petit', onclick: function () { w.vuIgn += 40; rerendreRapport(); } }, ['Afficher ' + Math.min(40, reste) + ' lignes de plus']));
        }
        if (nbIgn > r.ignorees.length) {
          corps.appendChild(h('p', { class: 'small', text: 'Seules les ' + L.CONST.MAX_IGNOREES_RAPPORT + ' premières lignes sont détaillées ; les totaux ci-dessus portent sur toutes les lignes.' }));
        }
      }
      r.avertissements.forEach(function (a) { corps.appendChild(h('p', { class: 'notice', text: 'Point d\'attention : ' + a + '.' })); });
      if (r.colonnesIgnorees.length) corps.appendChild(h('p', { class: 'small', text: 'Colonnes non utilisées (conservées dans le dossier) : ' + r.colonnesIgnorees.join(', ') + '.' }));
      if (kindId === 'tiers' && r.colonnesAbsentes.length) {
        corps.appendChild(h('p', { class: 'notice', text: 'Contrôles non réalisés : colonnes absentes (' + r.colonnesAbsentes.join(', ') + ').' }));
      } else if (r.colonnesAbsentes.length) {
        corps.appendChild(h('p', { class: 'small', text: 'Colonnes facultatives absentes : ' + r.colonnesAbsentes.join(', ') + '.' }));
      }
      var vide = r.retenues === 0;
      if (vide) {
        montrerErreur('Aucune ligne exploitable dans ce fichier : consultez la raison des lignes ignorées ci-dessus, puis corrigez le fichier ou les colonnes.');
      }
      corps.appendChild(h('div', { class: 'wiz-nav' }, [
        h('button', { type: 'button', class: 'btn', onclick: function () { aller(3); } }, ['Précédent']),
        pasDeRetour(),
        h('button', { type: 'button', class: 'btn btn-primary', disabled: vide, onclick: function () { aller(5); } }, [U.icon('fleche'), h('span', { text: 'Continuer' })])
      ]));
    }

    /* Étape 5 : confirmation */
    function etape5() {
      effacerMessages();
      corps.appendChild(titreEtape(5, 'confirmer l\'import'));
      var r = w.rapport;
      corps.appendChild(h('p', { text: 'Prêt à analyser ' + U.pluriel(r.retenues, 'ligne retenue', 'lignes retenues') + ' sur ' + U.fmtNum(r.lues) + ' du fichier « ' + w.nomFichier + ' ». ' +
        (r.lues - r.retenues ? U.pluriel(r.lues - r.retenues, 'ligne ignorée', 'lignes ignorées') + ' (voir le rapport).' : 'Aucune ligne ignorée.') }));
      corps.appendChild(h('p', { class: 'small', text: 'Le fichier est lu et conservé dans ce navigateur uniquement : rien n\'est envoyé.' }));
      corps.appendChild(h('div', { class: 'wiz-nav' }, [
        h('button', { type: 'button', class: 'btn', onclick: function () { aller(4); } }, ['Précédent']),
        pasDeRetour(),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: confirmer }, [U.icon('check-cercle'), h('span', { text: 'Analyser ce fichier' })])
      ]));
    }

    function confirmer() {
      var existant = table();
      var avant = Promise.resolve('sans');
      if (existant) {
        var nomAncien = existant.source.nomFichier || 'fichier précédent';
        avant = Dlg.ouvrir({
          titre: 'Remplacer le fichier déjà importé ?',
          corps: h('div', null, [
            h('p', { text: 'Le fichier « ' + nomAncien + ' » sera remplacé par « ' + w.nomFichier + ' ».' }),
            h('p', { class: 'small', text: 'Une version ne conserve qu\'un résumé (indice, anomalies, avancement), pas les lignes du fichier précédent.' })
          ]),
          boutons: [
            { id: 'annuler', libelle: 'Annuler' },
            { id: 'sans', libelle: 'Remplacer sans version' },
            { id: 'avec', libelle: 'Enregistrer une version puis remplacer', primaire: true }
          ],
          annulerId: 'annuler'
        });
      }
      avant.then(function (choix) {
        if (choix === 'annuler') return;
        if (choix === 'avec') {
          try {
            S.commit('enregistrerVersion', { libelle: ('Avant remplacement : ' + kind.libelleCourt).slice(0, L.CONST.MAX_LIBELLE_VERSION), note: 'Créée avant l\'import de ' + w.nomFichier, resume: Der.resume() });
          } catch (e) { montrerErreur('La version n\'a pas pu être enregistrée : ' + e.message); return; }
        }
        var rap = w.rapport;
        S.commit('importer', { kind: kindId, table: w.table, prepared: w.prepared });
        U.annoncer('Fichier importé : ' + rap.retenues + ' lignes retenues.');
        w = null;
        ouvert = false;
        if (opts.onTermine) opts.onTermine(rap);
        refresh();
      });
    }

    refresh();
    return { el: racine, refresh: refresh };
  }

  E.ui.importWizard = { carte: carte, resumeFichier: resumeFichier };
})(typeof self !== 'undefined' ? self : this);
