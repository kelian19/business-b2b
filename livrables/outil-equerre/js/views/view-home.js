/* Équerre : module A, accueil et dossiers (créer, ouvrir la démonstration, enregistrer et rouvrir un dossier,
 * historique des versions, effacement de la session). Aucune donnée n'est jamais envoyée. */
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
  var Dlg = E.ui.dialog;

  var AVERTISSEMENT_FICHIER = 'Ce fichier contient des données de votre client : conservez-le dans un espace protégé et supprimez-le quand il n\'est plus utile.';
  var AVERTISSEMENT_DEMO = 'Ce fichier contient des données fictives de démonstration : il ne contient aucune donnée réelle.';
  var MESSAGE_EFFACEMENT = 'Les données du dossier et du portefeuille ont été retirées de l\'application. La mémoire du navigateur est libérée à la fermeture de l\'onglet ; les fichiers que vous avez téléchargés restent sur votre disque et sont à supprimer par vos soins.';

  var SECTEURS = ['Industrie', 'Commerce de gros', 'Services aux entreprises', 'Bâtiment et travaux publics', 'Transport et logistique', 'Agroalimentaire', 'Autre'];

  // Messages persistants (la vue est reconstruite à chaque changement du dossier)
  var msg = { statut: '', alertes: [] };
  var racine = null;
  var logoEnCours = null;      // data:image/png prêt à être enregistré avec le nouveau dossier

  function majMessages() {
    if (!racine) return;
    var st = racine.querySelector('#home-statut');
    var al = racine.querySelector('#home-alerte');
    if (st) U.showMsg(st, msg.statut);
    if (al) {
      U.clear(al);
      msg.alertes.forEach(function (t) { al.appendChild(h('p', { text: t })); });
      al.hidden = !msg.alertes.length;
    }
  }
  function statut(t) { msg.statut = t; msg.alertes = []; majMessages(); if (t) U.annoncer(t); }
  function alerte(liste) { msg.alertes = Array.isArray(liste) ? liste : [liste]; msg.statut = ''; majMessages(); }

  function modeBadge(d) {
    return d.mode === 'demo' ? U.statusBadge('note', 'Démonstration') : U.statusBadge('ok', 'Dossier client');
  }

  function confirmerPerte() {
    if (!S.state.session.sale) return Promise.resolve(true);
    return Dlg.confirmer('Modifications non enregistrées',
      'Le dossier en cours contient des modifications non enregistrées. Si vous continuez, elles seront perdues. Vous pouvez d\'abord l\'enregistrer.',
      { ok: 'Continuer sans enregistrer', annuler: 'Annuler', danger: true });
  }

  /* ---------- Logo local (ré-encodé en PNG par canvas, SVG refusé) ---------- */

  function reencoderLogo(fichier) {
    return new Promise(function (resolve, reject) {
      if (/svg/i.test(fichier.type) || /\.svg$/i.test(fichier.name)) { reject(new Error('Le format SVG n\'est pas accepté pour le logo : utilisez une image PNG, JPEG ou WebP.')); return; }
      if (!/^image\/(png|jpeg|webp|gif)$/i.test(fichier.type)) { reject(new Error('Le logo doit être une image PNG, JPEG ou WebP.')); return; }
      if (fichier.size > 8 * 1024 * 1024) { reject(new Error('Ce logo est trop volumineux (8 Mo au maximum avant réduction).')); return; }
      var url = URL.createObjectURL(fichier);
      var img = new Image();
      img.onload = function () {
        try {
          var essais = [L.CONST.LOGO_MAX_PX, 192, 128, 96, 64];
          for (var i = 0; i < essais.length; i++) {
            var max = essais[i];
            var echelle = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
            var cv = document.createElement('canvas');
            cv.width = Math.max(1, Math.round(img.naturalWidth * echelle));
            cv.height = Math.max(1, Math.round(img.naturalHeight * echelle));
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
            var data = cv.toDataURL('image/png');
            if (data.length <= L.CONST.MAX_LOGO_CHARS) { URL.revokeObjectURL(url); resolve(data); return; }
          }
          URL.revokeObjectURL(url);
          reject(new Error('Ce logo reste trop lourd après réduction : choisissez une image plus simple.'));
        } catch (e) { URL.revokeObjectURL(url); reject(new Error('Ce logo n\'a pas pu être lu.')); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Ce fichier n\'est pas une image lisible.')); };
      img.src = url;
    });
  }

  /* ---------- Cartes ---------- */

  function champ(id, libelle, el, aide) {
    return h('div', { class: 'champ-groupe' }, [
      h('label', { for: id, text: libelle }), el, aide ? h('p', { class: 'small', id: id + '-aide', text: aide }) : null
    ]);
  }

  function carteCreer() {
    var nom = h('input', { type: 'text', id: 'f-nom', class: 'champ', maxlength: String(L.CONST.MAX_NOM), required: true, autocomplete: 'off', 'aria-describedby': 'f-nom-aide' });
    var secteur = h('input', { type: 'text', id: 'f-secteur', class: 'champ', maxlength: String(L.CONST.MAX_SECTEUR), list: 'f-secteurs', autocomplete: 'off' });
    var liste = h('datalist', { id: 'f-secteurs' }, SECTEURS.map(function (s) { return h('option', { value: s }); }));
    var taille = h('select', { id: 'f-taille', class: 'champ' }, L.CONST.TAILLES.map(function (t) { return h('option', { value: t, text: L.CONST.TAILLES_LIBELLES[t] }); }));
    var logo = h('input', { type: 'file', id: 'f-logo-input', class: 'visually-hidden', tabindex: '-1', 'aria-hidden': 'true', accept: 'image/png,image/jpeg,image/webp' });
    var logoBtn = h('button', { type: 'button', class: 'btn', id: 'f-logo', 'aria-describedby': 'f-logo-aide', onclick: function () { logo.click(); } }, [U.icon('upload'), h('span', { text: 'Choisir un fichier' })]);
    var logoMsg = h('p', { class: 'small', id: 'f-logo-msg', role: 'status' });
    logo.addEventListener('change', function () {
      logoEnCours = null;
      logoMsg.textContent = '';
      var f = logo.files && logo.files[0];
      if (!f) return;
      reencoderLogo(f).then(function (data) {
        logoEnCours = data;
        logoMsg.textContent = 'Logo « ' + String(f.name).slice(0, 60) + ' » prêt (ré-encodé localement en PNG, ' + Math.round(data.length / 1.37 / 1024) + ' Ko environ).';
      }).catch(function (e) { logo.value = ''; alerte(e.message); });
    });
    var form = h('form', { class: 'form', novalidate: true, 'aria-labelledby': 'creer-t' }, [
      champ('f-nom', 'Raison sociale', nom, 'Obligatoire, ' + L.CONST.MAX_NOM + ' caractères au maximum. Elle apparaît dans le rapport.'),
      champ('f-secteur', 'Secteur d\'activité', secteur),
      liste,
      champ('f-taille', 'Taille de l\'entreprise', taille),
      champ('f-logo', 'Logo (facultatif)', h('div', { class: 'champ-logo' }, [logoBtn, logo]), 'Reste dans votre navigateur ; réduit à 256 pixels et ré-encodé en PNG. Les images SVG sont refusées.'),
      logoMsg,
      h('div', { class: 'toolbar' }, [h('button', { type: 'submit', class: 'btn btn-primary' }, [U.icon('plus'), h('span', { text: 'Créer le dossier client' })])])
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = nom.value.trim();
      if (!n) { alerte('La raison sociale est obligatoire.'); U.focus(nom); return; }
      if (n.length > L.CONST.MAX_NOM) { alerte('La raison sociale est limitée à ' + L.CONST.MAX_NOM + ' caractères.'); U.focus(nom); return; }
      confirmerPerte().then(function (ok) {
        if (!ok) return;
        S.commit('creerDossier', { nom: n, secteur: secteur.value, taille: taille.value, logo: logoEnCours });
        logoEnCours = null;
        msg = { statut: '', alertes: [] };
        U.annoncer('Dossier client créé : ' + n + '. Étape suivante : le fichier tiers.');
        root.location.hash = '#tiers';
      });
    });
    return h('section', { class: 'card', 'aria-labelledby': 'creer-t' }, [
      h('div', { class: 'card-tete' }, [U.icon('plus', 'card-ic'), h('div', null, [h('h3', { id: 'creer-t', text: 'Créer un dossier client' }), h('p', { class: 'small', text: 'Un dossier regroupe les fichiers d\'un client. Il reste dans ce navigateur jusqu\'à son enregistrement.' })])]),
      form
    ]);
  }

  function carteCourant(d) {
    var infos = [
      ['Raison sociale', d.entreprise.nom], ['Secteur', d.entreprise.secteur || '–'], ['Taille', L.CONST.TAILLES_LIBELLES[d.entreprise.taille] || '–'],
      ['Créé le', U.fmtHeure(d.creeLe) || '–'], ['Modifié le', U.fmtHeure(d.majLe) || '–']
    ];
    var logo = d.entreprise.logo ? h('img', { class: 'logo-dossier', src: d.entreprise.logo, alt: 'Logo de ' + d.entreprise.nom, width: '64' }) : null;
    var etat = S.state.session.sale
      ? U.statusBadge('a_corriger', 'Modifications non enregistrées')
      : U.statusBadge('ok', d.mode === 'demo' ? 'Rien à enregistrer' : 'Enregistré');
    return h('section', { class: 'card', 'aria-labelledby': 'courant-t' }, [
      h('div', { class: 'card-tete' }, [U.icon('dossier', 'card-ic'), h('div', null, [h('h3', { id: 'courant-t', text: 'Dossier en cours' }), h('div', { class: 'badges' }, [modeBadge(d), etat])])]),
      logo,
      h('dl', { class: 'infos' }, infos.map(function (x) { return h('div', null, [h('dt', { text: x[0] }), h('dd', { text: x[1] })]); })),
      h('div', { class: 'toolbar' }, [
        U.bouton('Enregistrer le dossier (.equerre.json)', { primaire: true, icone: 'telecharger', id: 'btn-enregistrer', onclick: enregistrer }),
        U.bouton('Ouvrir la démonstration', { icone: 'ecran', id: 'btn-demo', onclick: ouvrirDemo }),
        U.bouton('Effacer toutes les données de cette session', { icone: 'corbeille', danger: true, id: 'btn-effacer', onclick: effacer })
      ])
    ]);
  }

  function ouvrirDemo() {
    confirmerPerte().then(function (ok) {
      if (!ok) return;
      S.commit('ouvrirDemo');
      msg = { statut: '', alertes: [] };
      statut('La démonstration est ouverte : ses données sont fictives.');
      root.location.hash = '#tableau-de-bord';
    });
  }

  function effacer() {
    Dlg.confirmer('Effacer toutes les données de cette session ?',
      h('div', null, [
        h('p', { text: 'Le dossier en cours et le portefeuille seront retirés de l\'application, puis la démonstration sera rouverte.' }),
        h('p', { class: 'small', text: 'Les fichiers que vous avez téléchargés restent sur votre disque : l\'outil ne peut pas les supprimer.' })
      ]), { ok: 'Effacer', annuler: 'Annuler', danger: true }
    ).then(function (ok) {
      if (!ok) return;
      S.commit('effacerSession');
      msg = { statut: '', alertes: [] };
      logoEnCours = null;
      root.location.hash = '#accueil';
      statut(MESSAGE_EFFACEMENT);
    });
  }

  function enregistrer() {
    var d = S.dossier();
    var aLignes = !!d.donnees.lignes;
    var case_ = h('input', { type: 'checkbox', id: 'sans-lignes' });
    var corps = h('div', null, [
      h('p', { class: 'avertissement', role: 'note' }, [U.icon('alerte'), h('span', { text: d.mode === 'demo' ? AVERTISSEMENT_DEMO : AVERTISSEMENT_FICHIER })]),
      h('p', { class: 'small', text: 'Fichier : ' + IO.nomDossierFichier(d.entreprise.nom) + '. Il est enregistré dans votre dossier de téléchargements, sans aucun envoi.' }),
      aLignes ? h('label', { class: 'case', for: 'sans-lignes' }, [case_, h('span', { text: 'Enregistrer sans les lignes de factures (fichier plus léger)' })]) : null
    ]);
    Dlg.ouvrir({
      titre: 'Enregistrer le dossier',
      corps: corps,
      boutons: [{ id: 'annuler', libelle: 'Annuler' }, { id: 'ok', libelle: 'Télécharger le dossier', primaire: true }],
      annulerId: 'annuler'
    }).then(function (choix) {
      if (choix !== 'ok') return;
      var texte;
      try { texte = L.serialiserDossier(d, { sansLignes: aLignes && case_.checked }); }
      catch (e) { alerte('Le dossier n\'a pas pu être enregistré : ' + e.message); return; }
      if (texte.length > L.CONST.MAX_DOSSIER_OCTETS) { alerte('Ce dossier dépasse 60 Mo : enregistrez-le sans les lignes de factures.'); return; }
      IO.telechargerJson(IO.nomDossierFichier(d.entreprise.nom), texte);
      S.commit('marquerEnregistre');
      statut('Dossier enregistré dans vos téléchargements (' + IO.nomDossierFichier(d.entreprise.nom) + ').');
    });
  }

  /* ---------- Rouvrir un dossier ---------- */

  function ouvrirFichier(fichier) {
    msg = { statut: '', alertes: [] };
    majMessages();
    if (fichier.size > L.CONST.MAX_DOSSIER_OCTETS) { alerte('Ce fichier dépasse 60 Mo : il ne peut pas être un dossier Équerre.'); return; }
    var barre = P.barre('Lecture du dossier');
    var zone = racine && racine.querySelector('#ouvrir-progres');
    if (zone) { U.clear(zone); zone.appendChild(barre.el); }
    IO.lireTexte(fichier).then(function (texte) {
      var obj;
      try { obj = JSON.parse(texte); } catch (e) { throw new Error('Ce fichier n\'est pas un JSON valide : ce n\'est pas un dossier Équerre.'); }
      var v = L.validateDossier(obj);
      if (!v.ok) throw new Error(v.erreurs.join(' '));
      return confirmerPerte().then(function (ok) {
        if (!ok) return null;
        barre.set(0.1, 'Préparation du dossier');
        return Der.preparerDossier(v.dossier, function (f) { barre.set(0.1 + f * 0.9, 'Préparation du dossier'); }).then(function (prepared) {
          S.commit('chargerJson', { dossier: v.dossier, prepared: prepared });
          var d = S.dossier();
          msg = { statut: '', alertes: [] };
          var txt = 'Dossier ouvert : ' + d.entreprise.nom + ' (' + (d.mode === 'demo' ? 'démonstration' : 'dossier client') + ', ' + U.pluriel(d.versions.length, 'version', 'versions') + ').';
          if (v.avertissements.length) txt += ' Attention : ' + v.avertissements.join(' ');
          statut(txt);
        });
      });
    }).catch(function (e) {
      if (zone) U.clear(zone);
      alerte(e.message);
    });
  }

  function carteOuvrir() {
    var zone = DZ.creer({
      titre: 'Glissez un dossier .equerre.json ici',
      accept: '.json,.equerre.json,application/json',
      description: 'Le dossier est lu dans votre navigateur, rien n\'est envoyé.',
      onFile: ouvrirFichier,
      onMessage: function (t) { statut(t); }
    });
    return h('section', { class: 'card', 'aria-labelledby': 'ouvrir-t' }, [
      h('div', { class: 'card-tete' }, [U.icon('upload', 'card-ic'), h('div', null, [h('h3', { id: 'ouvrir-t', text: 'Rouvrir un dossier enregistré' }), h('p', { class: 'small', text: 'Choisissez un fichier .equerre.json enregistré précédemment.' })])]),
      zone.el,
      h('div', { id: 'ouvrir-progres' })
    ]);
  }

  /* ---------- Versions ---------- */

  function lignesResume(res) {
    var out = [];
    out.push(['Fichier tiers', res.nbTiers ? U.pluriel(res.nbTiers, 'ligne', 'lignes') + (res.composantes[0] && res.composantes[0].valeur !== null ? ', ' + res.composantes[0].valeur + U.NBSP + '% sans anomalie (estimation)' : '') : 'Non importé']);
    var anom = L.ANOMALY_TYPES.filter(function (t) { return res.nbAnomalies[t.code] > 0; }).map(function (t) { return t.label + ' : ' + res.nbAnomalies[t.code]; });
    out.push(['Anomalies', anom.length ? anom.join(' ; ') : 'Aucune']);
    out.push(['Mentions contrôlées', res.mentions ? res.mentions.ok + ' sur ' + res.mentions.total + ' présentes' : 'Non contrôlées']);
    var rep = { oui: 'oui', non: 'non', nsp: 'ne sait pas' };
    out.push(['Organisation', ['plateforme', 'responsable', 'logiciel', 'procedure'].map(function (k) { return k + ' : ' + (rep[res.organisation[k]] || '–'); }).join(' ; ')]);
    out.push(['Date de référence', res.refDate ? U.fmtDate(res.refDate) : '–']);
    return out;
  }

  function rouvrirResume(v) {
    Dlg.ouvrir({
      titre: 'Version ' + v.numero + ' : ' + v.libelle,
      corps: h('div', null, [
        h('p', { class: 'small', text: 'Enregistrée le ' + U.fmtHeure(v.creeLe) + (v.note ? ' · ' + v.note : '') }),
        h('dl', { class: 'infos' }, lignesResume(v.resume).map(function (x) { return h('div', null, [h('dt', { text: x[0] }), h('dd', { text: x[1] })]); })),
        h('p', { class: 'small', text: 'Une version ne contient qu\'un résumé : elle ne permet pas de restaurer les fichiers importés.' })
      ]),
      boutons: [{ id: 'ok', libelle: 'Fermer', primaire: true }], annulerId: 'ok'
    });
  }

  function carteVersions(d) {
    var libelle = h('input', { type: 'text', id: 'v-libelle', class: 'champ', maxlength: String(L.CONST.MAX_LIBELLE_VERSION), required: true, autocomplete: 'off' });
    var note = h('input', { type: 'text', id: 'v-note', class: 'champ', maxlength: String(L.CONST.MAX_NOTE), autocomplete: 'off' });
    var form = h('form', { class: 'form', novalidate: true }, [
      champ('v-libelle', 'Nom de la version', libelle, L.CONST.MAX_LIBELLE_VERSION + ' caractères au maximum, par exemple « Avant correction du fichier ».'),
      champ('v-note', 'Note (facultatif)', note),
      h('div', { class: 'toolbar' }, [h('button', { type: 'submit', class: 'btn' }, [U.icon('historique'), h('span', { text: 'Enregistrer une version' })])])
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var l = libelle.value.trim();
      if (!l) { alerte('Le nom de la version est obligatoire.'); U.focus(libelle); return; }
      var r;
      try { r = S.commit('enregistrerVersion', { libelle: l, note: note.value, resume: Der.resume() }); }
      catch (err) { alerte('La version n\'a pas pu être enregistrée : ' + err.message); return; }
      msg = { statut: '', alertes: [] };
      var txt = 'Version « ' + l + ' » enregistrée.';
      if (r.supprimee) txt += ' La plus ancienne (version ' + r.supprimee.numero + ') a été supprimée : ' + L.CONST.MAX_VERSIONS + ' versions au maximum.';
      statut(txt);
    });
    var liste = d.versions.slice().reverse().map(function (v) {
      return h('li', { class: 'version' }, [
        h('div', null, [h('strong', { text: 'Version ' + v.numero + ' : ' + v.libelle }), h('p', { class: 'small', text: U.fmtHeure(v.creeLe) + (v.note ? ' · ' + v.note : '') })]),
        U.bouton('Rouvrir le résumé', { onclick: function () { rouvrirResume(v); }, aria: 'Rouvrir le résumé de la version ' + v.numero + ' : ' + v.libelle })
      ]);
    });
    return h('section', { class: 'card', 'aria-labelledby': 'versions-t' }, [
      h('div', { class: 'card-tete' }, [U.icon('historique', 'card-ic'), h('div', null, [h('h3', { id: 'versions-t', text: 'Historique des versions' }),
        h('p', { class: 'small', text: 'Une version conserve un résumé (indice partiel, nombre d\'anomalies, avancement), pas vos fichiers : elle ne permet pas de restaurer les données. « Rouvrir le résumé » affiche ses informations.' })])]),
      form,
      d.versions.length >= L.CONST.MAX_VERSIONS ? h('p', { class: 'notice', text: L.CONST.MAX_VERSIONS + ' versions au maximum : la plus ancienne sera supprimée à la prochaine version.' }) : null,
      liste.length ? h('ul', { class: 'versions' }, liste) : h('p', { class: 'small', text: 'Aucune version enregistrée.' })
    ]);
  }

  /* ---------- Vue ---------- */

  function render(container) {
    racine = container;
    var d = S.dossier();
    U.clear(container);
    container.appendChild(h('div', { class: 'panel-top' }, [
      h('div', null, [
        h('h2', { id: 'home-titre', tabindex: '-1', text: 'Accueil et dossiers' }),
        h('p', { class: 'lead', text: 'Créez un dossier pour votre client, enregistrez-le sur votre poste, rouvrez-le plus tard. Tout reste dans ce navigateur.' })
      ]),
      h('a', { class: 'btn', href: '#tableau-de-bord' }, [h('span', { text: 'Retour au parcours' }), U.icon('fleche')])
    ]));
    if (E.views.help && !E.ui.prefs.get('accueilVu')) {
      container.appendChild(h('section', { class: 'card accueil-visite', 'aria-labelledby': 'visite-inv-t' }, [
        h('h3', { id: 'visite-inv-t', text: 'Nouveau ici ?' }),
        h('p', { text: 'Une visite guidée de 4 étapes présente le parcours, les modes et les raccourcis. Vous pouvez la passer.' }),
        E.views.help.boutonVisite()
      ]));
    }
    container.appendChild(h('p', { class: 'notice', id: 'home-statut', role: 'status', hidden: true }));
    container.appendChild(h('div', { class: 'alert', id: 'home-alerte', role: 'alert', hidden: true }));
    container.appendChild(h('div', { class: 'home-grid' }, [
      h('div', { class: 'col' }, [carteCourant(d), carteCreer()]),
      h('div', { class: 'col' }, [carteOuvrir(), carteVersions(d)])
    ]));
    majMessages();
  }

  /** Oublie les messages, le logo en attente et la racine (effacement de la session). */
  function reinitialiser() {
    msg = { statut: '', alertes: [] }; logoEnCours = null; racine = null;
  }

  E.views.home = { reinitialiser: reinitialiser, render: render, confirmerPerte: confirmerPerte, effacer: effacer, AVERTISSEMENT_FICHIER: AVERTISSEMENT_FICHIER, MESSAGE_EFFACEMENT: MESSAGE_EFFACEMENT, reencoderLogo: reencoderLogo };
})(typeof self !== 'undefined' ? self : this);
