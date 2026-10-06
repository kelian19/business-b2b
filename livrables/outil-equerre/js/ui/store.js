/* Équerre : état unique de l'application. Le dossier est la seule source de vérité des données.
 * Mutations uniquement par Store.commit(nom, charge) (liste fermée) : applique, incrémente la révision du domaine,
 * pose « sale » (modifications non enregistrées) et notifie les abonnés. Les vues n'écrivent jamais dans l'état. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var L = root.EquerreLogic;
  var U = E.ui.ui;

  var state = {
    ui: { route: '', etape: 0, presentation: false },
    session: { dossier: null, rev: null, gen: 0, portefeuille: [], sale: false, importEnCours: false, cache: {} }
  };

  var abonnes = [];

  function nouvellesRevisions() {
    return { tiers: 0, factures: 0, lignes: 0, registre: 0, corrections: 0, modeles: 0, organisation: 0, plan: 0, refDate: 0, hypotheses: 0, entreprise: 0, versions: 0 };
  }

  /** S'abonne à des sujets (tableau de noms, ou '*') ; renvoie la fonction de désabonnement. */
  function on(sujets, fn) {
    var a = { sujets: Array.isArray(sujets) ? sujets : [sujets], fn: fn };
    abonnes.push(a);
    return function () { var i = abonnes.indexOf(a); if (i >= 0) abonnes.splice(i, 1); };
  }

  function emit(sujet) {
    abonnes.slice().forEach(function (a) {
      if (a.sujets.indexOf('*') >= 0 || a.sujets.indexOf(sujet) >= 0) {
        try { a.fn(sujet); } catch (e) { if (root.console) root.console.error(e); }
      }
    });
  }

  function dossier() { return state.session.dossier; }
  function estDemo() { return !!state.session.dossier && state.session.dossier.mode === 'demo'; }

  function attacher(d) {
    var s = state.session;
    s.dossier = d;
    s.rev = nouvellesRevisions();
    s.gen++;
    s.cache = {};
    s.sale = false;
    emit('dossier');
    emit('sale');
  }

  function bump(domaine, dejaIncremente) {
    var s = state.session;
    if (!dejaIncremente) s.rev[domaine]++;
    s.dossier.majLe = U.maintenantIso();
    // En démonstration, rien n'est à enregistrer : pas d'avertissement à la fermeture.
    var avant = s.sale;
    s.sale = s.dossier.mode === 'client';
    emit(domaine);
    if (avant !== s.sale) emit('sale');
  }

  function creerDemo() {
    var d = L.dossierDemo(root.EquerreData, { maintenant: U.maintenantIso() });
    return d;
  }

  function identifiantAleatoire() {
    try {
      var a = new Uint32Array(3);
      root.crypto.getRandomValues(a);
      return 'd' + a[0].toString(36) + a[1].toString(36) + a[2].toString(36);
    } catch (e) {
      return 'd' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
    }
  }

  var COMMITS = {
    creerDossier: function (c) {
      var nom = String(c.nom || '').trim();
      if (!nom) throw new Error('Une raison sociale est nécessaire.');
      var d = L.creerDossier({ nom: nom, secteur: c.secteur, taille: c.taille, logo: c.logo }, { maintenant: U.maintenantIso(), id: identifiantAleatoire() });
      attacher(d);
      // Un dossier neuf n'a encore rien d'enregistré : il est « à enregistrer ».
      state.session.sale = true;
      emit('sale');
      return { dossier: d };
    },
    ouvrirDemo: function () {
      attacher(creerDemo());
      return {};
    },
    chargerJson: function (c) {
      attacher(c.dossier);
      var prep = c.prepared || {};
      Object.keys(prep).forEach(function (k) { state.session.cache[k] = { rev: 0, prepared: prep[k] }; });
      return {};
    },
    importer: function (c) {
      var s = state.session;
      if (!s.dossier || s.dossier.mode !== 'client') throw new Error('Import refusé : créez d\'abord un dossier client (jamais de mélange entre démonstration et données réelles).');
      if (L.ORDRE_KINDS.indexOf(c.kind) < 0) throw new Error('Type de fichier inconnu.');
      s.dossier.donnees[c.kind] = c.table;
      if (c.kind === 'tiers') { s.dossier.corrections = {}; s.dossier.journal = []; s.rev.corrections++; }
      s.rev[c.kind]++;
      s.cache[c.kind] = { rev: s.rev[c.kind], prepared: c.prepared || null };
      bump(c.kind, true);
      return {};
    },
    nommerEntreprise: function (c) {
      var nom = String(c.nom || '').trim().slice(0, L.CONST.MAX_NOM);
      if (!nom) return { refuse: true };
      state.session.dossier.entreprise.nom = nom;
      bump('entreprise');
      return {};
    },
    majEntreprise: function (c) {
      var e = state.session.dossier.entreprise;
      if (c.secteur !== undefined) e.secteur = String(c.secteur).trim().slice(0, L.CONST.MAX_SECTEUR);
      if (c.taille !== undefined && L.CONST.TAILLES.indexOf(c.taille) >= 0) e.taille = c.taille;
      if (c.logo !== undefined) e.logo = c.logo;
      bump('entreprise');
      return {};
    },
    setRefDate: function (c) {
      var iso = c.iso === null ? null : L.parseDate(c.iso);
      if (c.iso !== null && !iso) return { refuse: true };
      state.session.dossier.refDate = iso;
      bump('refDate');
      return {};
    },
    decider: function (c) {
      var r = L.enregistrerDecision(state.session.dossier, { proposition: c.proposition, decision: c.decision, saisie: c.saisie, note: c.note, row: c.row }, U.maintenantIso());
      if (!r.ok) return { refuse: true, message: r.message };
      bump('corrections');
      return { entree: r.entree, supprimees: r.supprimees };
    },
    annulerDecision: function (c) {
      var r = L.annulerDecision(state.session.dossier, c.cle, U.maintenantIso());
      if (!r.ok) return { refuse: true, message: r.message };
      bump('corrections');
      return {};
    },
    majModele: function (c) {
      var d = state.session.dossier;
      var r;
      if (c.op === 'ajouter') r = L.ajouterModele(d.modeles, c.nom);
      else if (c.op === 'supprimer') r = L.supprimerModele(d.modeles, c.id);
      else if (c.op === 'renommer') r = L.renommerModele(d.modeles, c.id, c.nom);
      else if (c.op === 'controle') {
        var m = d.modeles.filter(function (x) { return x.id === c.id; })[0];
        r = m ? L.majControle(m, c.mention, { statut: c.statut, preuve: c.preuve, note: c.note }) : { ok: false, message: 'Modèle introuvable.' };
      } else r = { ok: false, message: 'Opération inconnue.' };
      if (!r.ok) return { refuse: true, message: r.message };
      bump('modeles');
      return { modele: r.modele || null };
    },
    repondreOrganisation: function (c) {
      var o = state.session.dossier.organisation;
      if (['plateforme', 'responsable', 'logiciel', 'procedure'].indexOf(c.cle) < 0 || ['oui', 'non', 'nsp'].indexOf(c.valeur) < 0) return { refuse: true, message: 'Réponse inconnue.' };
      o[c.cle] = c.valeur;
      bump('organisation');
      return {};
    },
    cibleOrganisation: function (c) {
      var o = state.session.dossier.organisation;
      if (['plateforme', 'responsable', 'logiciel', 'procedure', 'test'].indexOf(c.cle) < 0) return { refuse: true, message: 'Étape inconnue.' };
      var iso = c.iso === null || c.iso === '' ? null : L.parseDate(c.iso);
      if (c.iso !== null && c.iso !== '' && !iso) return { refuse: true, message: 'Date non valide : choisissez une date existante.' };
      o.cibles[c.cle] = iso;
      bump('organisation');
      return {};
    },
    reinitialiserOrganisation: function () {
      var d = state.session.dossier;
      var o = L.organisationVide();
      if (d.mode === 'demo' && root.EquerreData && root.EquerreData.organisationDefaut) {
        ['plateforme', 'responsable', 'logiciel', 'procedure'].forEach(function (k) { o[k] = root.EquerreData.organisationDefaut[k]; });
      }
      d.organisation = o;
      bump('organisation');
      return {};
    },
    majPlan: function (c) {
      var r = L.appliquerPlan(state.session.dossier.plan, c.id, c);
      if (!r.ok) return { refuse: true, message: r.message };
      bump('plan');
      return {};
    },
    setHypothese: function (c) {
      var d = state.session.dossier;
      if (c.nbFactures12m === null) d.hypotheses.nbFactures12m = null;
      else {
        var v = L.validerNbFactures(c.nbFactures12m);
        if (!v.ok) return { refuse: true, message: v.message };
        d.hypotheses.nbFactures12m = v.valeur;
      }
      bump('hypotheses');
      return {};
    },
    enregistrerVersion: function (c) {
      var d = state.session.dossier;
      var r = L.ajouterVersion(d, { libelle: c.libelle, note: c.note, maintenant: U.maintenantIso(), resume: c.resume });
      bump('versions');
      return r;
    },
    marquerEnregistre: function () {
      state.session.sale = false;
      emit('sale');
      return {};
    },
    cabinetAjouter: function (c) {
      var s = state.session;
      var r = L.ajouterAuPortefeuille(s.portefeuille, c.ligne, c.octets);
      if (r.ok) emit('portefeuille');
      return r;
    },
    cabinetRetirer: function (c) {
      var ok = L.retirerDuPortefeuille(state.session.portefeuille, c.dossierId);
      if (ok) emit('portefeuille');
      return { ok: ok };
    },
    effacerSession: function () {
      var s = state.session;
      s.portefeuille = [];
      emit('portefeuille');
      if (E.ui.io) E.ui.io.revoquerTout();
      attacher(creerDemo());
      emit('effacement');
      return {};
    }
  };

  /** Seul point d'écriture dans l'état de session. */
  function commit(nom, charge) {
    if (!Object.prototype.hasOwnProperty.call(COMMITS, nom)) throw new Error('Mutation inconnue : ' + nom);
    return COMMITS[nom](charge || {}) || {};
  }

  /** État d'interface (route, étape, présentation) : hors données du dossier. */
  function setUi(patch) {
    Object.keys(patch).forEach(function (k) { state.ui[k] = patch[k]; });
    emit('ui');
  }

  E.ui.store = { state: state, on: on, emit: emit, commit: commit, setUi: setUi, dossier: dossier, estDemo: estDemo, noms: Object.keys(COMMITS) };
})(typeof self !== 'undefined' ? self : this);
