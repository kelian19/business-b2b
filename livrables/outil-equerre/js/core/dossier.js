/* Équerre : modèle de données du dossier (versionné), création, validation à l'ouverture, migration, sérialisation.
 * Le dossier est la seule chose enregistrée dans le fichier .equerre.json. Aucune préférence, aucun dérivé,
 * aucune donnée de portefeuille n'y figure. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./constants.js'), require('./util.js'), require('./import-kinds.js'), require('./mentions.js'));
  } else {
    var c = root.Equerre.core;
    c.dossier = factory(c.constants, c.util, c.importKinds, c.mentions);
  }
})(typeof self !== 'undefined' ? self : this, function (C, U, IK, M) {
  'use strict';

  var FORMAT = 'equerre-dossier';
  var KINDS_TABLES = ['tiers', 'factures', 'lignes', 'registre'];
  var DECISIONS = ['acceptee', 'refusee', 'modifiee'];
  var CERTITUDES = ['calculee', 'a_verifier', 'saisie'];
  var ACTIONS_JOURNAL = ['accepter', 'refuser', 'modifier', 'annuler'];
  var STATUTS_CONTROLE = ['present', 'absent', 'a_verifier', 'sans_objet', 'non_controle'];
  var STATUTS_PLAN = ['a_faire', 'en_cours', 'fait'];
  var REPONSES = ['oui', 'non', 'nsp'];
  var CLES_ORG = ['plateforme', 'responsable', 'logiciel', 'procedure'];
  var MODES = ['demo', 'client'];

  /* ------------------------------------------------------------------ */
  /* Création                                                            */
  /* ------------------------------------------------------------------ */

  function identifiantDe(nom, maintenant, ctx) {
    if (ctx && ctx.id) return ctx.id;
    return 'd' + U.fnv1a32(String(nom) + '|' + String(maintenant)) + U.fnv1a32(String(maintenant) + String(nom).length);
  }

  function organisationVide() {
    return {
      plateforme: 'nsp', responsable: 'nsp', logiciel: 'nsp', procedure: 'nsp',
      cibles: { plateforme: null, responsable: null, logiciel: null, procedure: null, test: null }
    };
  }

  function tablesVides() { return { tiers: null, factures: null, lignes: null, registre: null }; }

  /** Nouveau dossier client, sans donnée. params : { nom, secteur, taille, logo }.
   *  ctx : { maintenant (ISO, obligatoire), id (facultatif) } : aucune date implicite dans le noyau. */
  function creerDossier(params, ctx) {
    ctx = ctx || {};
    var maintenant = ctx.maintenant || '';
    var nom = U.trim(params && params.nom).slice(0, C.MAX_NOM);
    return {
      format: FORMAT,
      schemaVersion: C.SCHEMA_VERSION,
      appVersion: C.APP_VERSION,
      id: identifiantDe(nom, maintenant, ctx),
      mode: ctx.mode === 'demo' ? 'demo' : 'client',
      creeLe: maintenant,
      majLe: maintenant,
      entreprise: {
        nom: nom,
        secteur: U.trim(params && params.secteur).slice(0, C.MAX_SECTEUR),
        taille: params && C.TAILLES.indexOf(params.taille) >= 0 ? params.taille : 'autre',
        logo: params && params.logo ? params.logo : null
      },
      refDate: null,
      donnees: tablesVides(),
      corrections: {},
      journal: [],
      modeles: [{ id: 'm1', nom: 'Modèle 1', controles: {} }],
      organisation: organisationVide(),
      plan: {},
      hypotheses: { nbFactures12m: null },
      versions: [],
      integrite: { somme: '' }
    };
  }

  function tableDepuisMatrice(entetes, objets, nomFichier, maintenant) {
    return {
      source: { nomFichier: nomFichier, importeLe: maintenant, encodage: '', separateur: ';', nbLues: objets.length, nbRetenues: objets.length },
      entetes: entetes.slice(),
      mapping: entetes.slice(),
      lignes: objets.map(function (o) { return entetes.map(function (h) { return o[h] === undefined ? '' : String(o[h]); }); }),
      numerosLigne: objets.map(function (o, i) { return i + 2; }),
      rapport: { ignorees: [], totauxParRaison: {}, avertissements: [] }
    };
  }

  var STATUT_CONTROLE_DE = { ok: 'present', manquant: 'absent', a_verifier: 'a_verifier', na: 'sans_objet' };

  /** Dossier de démonstration à partir des données fictives (EquerreData). Mode « demo ». */
  function dossierDemo(D, ctx) {
    ctx = ctx || {};
    var d = creerDossier({ nom: D.entreprise, secteur: 'Industrie (exemple fictif)', taille: '50-99' },
      { maintenant: ctx.maintenant || '', id: ctx.id || 'demo', mode: 'demo' });
    var nomFic = 'Données fictives de démonstration';
    d.donnees.tiers = tableDepuisMatrice(IK.KINDS.tiers.entetes, D.tiers, nomFic, d.creeLe);
    d.donnees.factures = tableDepuisMatrice(IK.FACTURES_HEADERS, D.exportFacturation, nomFic, d.creeLe);
    d.refDate = D.referenceDate;
    d.organisation.plateforme = D.organisationDefaut.plateforme;
    d.organisation.responsable = D.organisationDefaut.responsable;
    d.organisation.logiciel = D.organisationDefaut.logiciel;
    d.organisation.procedure = D.organisationDefaut.procedure;
    d.modeles = D.factures.map(function (f, i) {
      var res = M.checkInvoiceMentions(f);
      var controles = {};
      res.items.forEach(function (it) {
        controles[it.id] = { statut: STATUT_CONTROLE_DE[it.statut] || 'non_controle', preuve: '', note: '' };
      });
      return { id: 'm' + (i + 1), nom: 'Facture ' + (i + 1) + ' (' + f.numero + ')', controles: controles };
    });
    return d;
  }

  /* ------------------------------------------------------------------ */
  /* Journal                                                             */
  /* ------------------------------------------------------------------ */

  /** Ajoute une entrée au journal (ajout seulement, plafonné : la plus ancienne est supprimée). Renvoie { supprimees }. */
  function ajouterJournal(dossier, entree) {
    dossier.journal.push(entree);
    var trop = dossier.journal.length - C.MAX_JOURNAL;
    if (trop > 0) { dossier.journal.splice(0, trop); return { supprimees: trop }; }
    return { supprimees: 0 };
  }

  /* ------------------------------------------------------------------ */
  /* Validation                                                          */
  /* ------------------------------------------------------------------ */

  var CLES_INTERDITES = ['__proto__', 'constructor', 'prototype'];

  function ctxErreurs() {
    var e = { erreurs: [], avertissements: [] };
    e.err = function (m) { if (e.erreurs.length < 30) e.erreurs.push(m); };
    e.warn = function (m) { if (e.avertissements.length < 30) e.avertissements.push(m); };
    return e;
  }

  /** Cherche une clé dangereuse (parcours itératif, profondeur limitée). Renvoie le chemin ou null. */
  function cleDangereuse(valeur) {
    var pile = [[valeur, '', 0]];
    while (pile.length) {
      var cur = pile.pop();
      var v = cur[0];
      if (v === null || typeof v !== 'object') continue;
      if (cur[2] > 12) return cur[1] + ' (trop imbriqué)';
      if (Array.isArray(v)) {
        for (var i = 0; i < v.length; i++) {
          var x = v[i];
          if (x !== null && typeof x === 'object') pile.push([x, cur[1] + '[' + i + ']', cur[2] + 1]);
        }
        continue;
      }
      var keys = Object.keys(v);
      for (var k = 0; k < keys.length; k++) {
        if (CLES_INTERDITES.indexOf(keys[k]) >= 0) return cur[1] + '.' + keys[k];
        var y = v[keys[k]];
        if (y !== null && typeof y === 'object') pile.push([y, cur[1] + '.' + keys[k], cur[2] + 1]);
      }
    }
    return null;
  }

  function estObjet(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

  function texte(v, chemin, max, e, defaut) {
    if (v === undefined && defaut !== undefined) return defaut;
    if (typeof v !== 'string') { e.err(chemin + ' : un texte est attendu.'); return defaut === undefined ? '' : defaut; }
    if (v.length > max) { e.err(chemin + ' : trop long (' + max + ' caractères au maximum).'); return v.slice(0, max); }
    return v;
  }

  function enumere(v, liste, chemin, e, defaut) {
    if (v === undefined && defaut !== undefined) return defaut;
    if (liste.indexOf(v) < 0) { e.err(chemin + ' : valeur non reconnue.'); return defaut === undefined ? liste[0] : defaut; }
    return v;
  }

  function dateIsoOuNull(v, chemin, e) {
    if (v === null || v === undefined) return null;
    if (typeof v !== 'string' || U.parseDate(v) !== v) { e.err(chemin + ' : date AAAA-MM-JJ attendue.'); return null; }
    return v;
  }

  function horodatage(v, chemin, e) {
    if (typeof v !== 'string' || v.length > 40 || (v !== '' && U.parseDate(v.slice(0, 10)) === null)) {
      e.err(chemin + ' : horodatage invalide.');
      return '';
    }
    return v;
  }

  function entier(v, chemin, e, min, max) {
    if (typeof v !== 'number' || Math.floor(v) !== v || v < min || v > max) { e.err(chemin + ' : entier de ' + min + ' à ' + max + ' attendu.'); return min; }
    return v;
  }

  function validerTable(t, nom, e) {
    if (t === null || t === undefined) return null;
    if (!estObjet(t)) { e.err('donnees.' + nom + ' : objet attendu.'); return null; }
    var kind = IK.KINDS[nom];
    var chemin = 'donnees.' + nom;
    if (!Array.isArray(t.entetes) || t.entetes.length > C.MAX_COLONNES) { e.err(chemin + '.entetes : tableau attendu.'); return null; }
    var entetes = t.entetes.map(function (h, i) { return texte(h, chemin + '.entetes[' + i + ']', 200, e); });
    if (!Array.isArray(t.mapping) || t.mapping.length !== entetes.length) { e.err(chemin + '.mapping : une valeur par colonne est attendue.'); return null; }
    var mapping = t.mapping.map(function (m, i) {
      if (m === null) return null;
      if (typeof m !== 'string' || kind.entetes.indexOf(m) < 0) { e.err(chemin + '.mapping[' + i + '] : colonne canonique inconnue.'); return null; }
      return m;
    });
    if (!Array.isArray(t.lignes) || t.lignes.length > C.MAX_LIGNES_TABLE) { e.err(chemin + '.lignes : tableau de lignes attendu (500 000 lignes au maximum).'); return null; }
    if (!Array.isArray(t.numerosLigne) || t.numerosLigne.length !== t.lignes.length) { e.err(chemin + '.numerosLigne : un numéro par ligne est attendu.'); return null; }
    var lignes = t.lignes;
    for (var i = 0; i < lignes.length; i++) {
      var row = lignes[i];
      if (!Array.isArray(row) || row.length > C.MAX_COLONNES * 2) { e.err(chemin + '.lignes[' + i + '] : tableau de valeurs attendu.'); return null; }
      for (var j = 0; j < row.length; j++) {
        if (typeof row[j] !== 'string' || row[j].length > C.MAX_CELLULE) { e.err(chemin + '.lignes[' + i + '][' + j + '] : texte attendu (' + C.MAX_CELLULE + ' caractères au maximum).'); return null; }
      }
      if (typeof t.numerosLigne[i] !== 'number' || t.numerosLigne[i] < 1 || Math.floor(t.numerosLigne[i]) !== t.numerosLigne[i]) { e.err(chemin + '.numerosLigne[' + i + '] : entier positif attendu.'); return null; }
    }
    var s = estObjet(t.source) ? t.source : {};
    var rap = estObjet(t.rapport) ? t.rapport : {};
    var totaux = {};
    if (estObjet(rap.totauxParRaison)) Object.keys(rap.totauxParRaison).forEach(function (k) {
      if (typeof rap.totauxParRaison[k] === 'number' && k.length < 40) totaux[k] = rap.totauxParRaison[k];
    });
    var ignorees = [];
    if (Array.isArray(rap.ignorees)) rap.ignorees.slice(0, C.MAX_IGNOREES_RAPPORT).forEach(function (x) {
      if (estObjet(x) && typeof x.ligne === 'number' && typeof x.raison === 'string') {
        ignorees.push({ ligne: x.ligne, raison: x.raison.slice(0, 40), extrait: typeof x.extrait === 'string' ? x.extrait.slice(0, 120) : '' });
      }
    });
    var avert = Array.isArray(rap.avertissements) ? rap.avertissements.filter(function (x) { return typeof x === 'string'; }).map(function (x) { return x.slice(0, 300); }).slice(0, 20) : [];
    return {
      source: {
        nomFichier: texte(s.nomFichier === undefined ? '' : s.nomFichier, chemin + '.source.nomFichier', 200, e),
        importeLe: texte(s.importeLe === undefined ? '' : s.importeLe, chemin + '.source.importeLe', 40, e),
        encodage: texte(s.encodage === undefined ? '' : s.encodage, chemin + '.source.encodage', 40, e),
        separateur: texte(s.separateur === undefined ? ';' : s.separateur, chemin + '.source.separateur', 2, e),
        nbLues: typeof s.nbLues === 'number' ? s.nbLues : lignes.length,
        nbRetenues: typeof s.nbRetenues === 'number' ? s.nbRetenues : lignes.length
      },
      entetes: entetes,
      mapping: mapping,
      lignes: lignes,
      numerosLigne: t.numerosLigne,
      rapport: { ignorees: ignorees, totauxParRaison: totaux, avertissements: avert }
    };
  }

  function validerResume(r, chemin, e) {
    if (!estObjet(r)) { e.err(chemin + ' : objet attendu.'); return {}; }
    var out = {};
    out.indice = typeof r.indice === 'number' ? r.indice : null;
    out.partiel = r.partiel === true;
    out.composantes = Array.isArray(r.composantes) ? r.composantes.slice(0, 10).map(function (c) {
      return { id: texte(c && c.id, chemin + '.composantes.id', 30, e, ''), valeur: c && typeof c.valeur === 'number' ? c.valeur : null, poids: c && typeof c.poids === 'number' ? c.poids : 0 };
    }) : [];
    out.nbTiers = typeof r.nbTiers === 'number' ? r.nbTiers : 0;
    out.nbAnomalies = {};
    if (estObjet(r.nbAnomalies)) Object.keys(r.nbAnomalies).slice(0, 30).forEach(function (k) { if (typeof r.nbAnomalies[k] === 'number') out.nbAnomalies[k] = r.nbAnomalies[k]; });
    out.partCaARisque = estObjet(r.partCaARisque) ? r.partCaARisque : null;
    out.mentions = estObjet(r.mentions) && typeof r.mentions.ok === 'number' && typeof r.mentions.total === 'number' ? { ok: r.mentions.ok, total: r.mentions.total } : null;
    out.organisation = {};
    if (estObjet(r.organisation)) CLES_ORG.forEach(function (k) { if (REPONSES.indexOf(r.organisation[k]) >= 0) out.organisation[k] = r.organisation[k]; });
    out.actions = {};
    if (estObjet(r.actions)) Object.keys(r.actions).slice(0, 100).forEach(function (k) { if (STATUTS_PLAN.indexOf(r.actions[k]) >= 0) out.actions[k] = r.actions[k]; });
    out.titresActions = {};
    if (estObjet(r.titresActions)) Object.keys(r.titresActions).slice(0, 100).forEach(function (k) { if (typeof r.titresActions[k] === 'string') out.titresActions[k] = r.titresActions[k].slice(0, 200); });
    out.anomalies = Array.isArray(r.anomalies) ? r.anomalies.filter(function (x) { return typeof x === 'string'; }).slice(0, 20000).map(function (x) { return x.slice(0, 200); }) : [];
    out.refDate = typeof r.refDate === 'string' && U.parseDate(r.refDate) === r.refDate ? r.refDate : null;
    return out;
  }

  /** Migre un objet d'une version antérieure vers le schéma courant (ne modifie pas l'objet reçu). */
  var MIGRATIONS = {
    // 0 → 1 : ajoute les domaines apparus avec le schéma 1
    0: function (d) {
      var o = U.copie(d);
      if (o.journal === undefined) o.journal = [];
      if (o.versions === undefined) o.versions = [];
      if (o.hypotheses === undefined) o.hypotheses = { nbFactures12m: null };
      if (o.corrections === undefined) o.corrections = {};
      if (o.plan === undefined) o.plan = {};
      if (o.modeles === undefined) o.modeles = [];
      if (o.organisation === undefined) o.organisation = organisationVide();
      o.schemaVersion = 1;
      return o;
    }
  };

  function migrate(obj) {
    var v = obj.schemaVersion;
    var cur = obj;
    while (typeof v === 'number' && v < C.SCHEMA_VERSION) {
      if (!MIGRATIONS[v]) break;
      cur = MIGRATIONS[v](cur);
      v = cur.schemaVersion;
    }
    return cur;
  }

  /** Somme d'intégrité : FNV-1a 32 bits de la forme canonique (hors le champ integrite). */
  function sommeIntegrite(dossier) {
    var copie = {};
    Object.keys(dossier).forEach(function (k) { if (k !== 'integrite' && k !== 'rev') copie[k] = dossier[k]; });
    return U.fnv1a32(U.stableStringify(copie));
  }

  /** Valide un objet lu depuis un fichier. Renvoie { ok, dossier, erreurs, avertissements, schemaTropRecent }.
   *  Structure et types stricts, longueurs maximales, clés __proto__ / constructor refusées, champs inconnus ignorés. */
  function validateDossier(obj) {
    var e = ctxErreurs();
    var fin = function (extra) {
      var r = { ok: false, dossier: null, erreurs: e.erreurs, avertissements: e.avertissements, schemaTropRecent: false };
      if (extra) Object.keys(extra).forEach(function (k) { r[k] = extra[k]; });
      return r;
    };
    if (!estObjet(obj)) { e.err('Le fichier ne contient pas un dossier Équerre.'); return fin(); }
    var danger = cleDangereuse(obj);
    if (danger) { e.err('Le fichier contient une clé refusée (' + danger + ').'); return fin(); }
    if (obj.format !== FORMAT) { e.err('Ce fichier n\'est pas un dossier Équerre (format non reconnu).'); return fin(); }
    if (typeof obj.schemaVersion !== 'number' || Math.floor(obj.schemaVersion) !== obj.schemaVersion || obj.schemaVersion < 0) {
      e.err('Version de schéma illisible.'); return fin();
    }
    if (obj.schemaVersion > C.SCHEMA_VERSION) {
      e.err('Ce dossier a été enregistré par une version plus récente d\'Équerre (schéma ' + obj.schemaVersion + ') : ouvrez-le avec la version correspondante.');
      return fin({ schemaTropRecent: true });
    }
    var d = migrate(obj);
    if (d.schemaVersion !== C.SCHEMA_VERSION) { e.err('Ce dossier est trop ancien pour être ouvert.'); return fin(); }

    var out = {};
    out.format = FORMAT;
    out.schemaVersion = C.SCHEMA_VERSION;
    out.appVersion = texte(d.appVersion, 'appVersion', 20, e, C.APP_VERSION);
    var id = texte(d.id, 'id', 64, e);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) { e.err('id : identifiant invalide.'); id = 'd0'; }
    out.id = id;
    out.mode = enumere(d.mode, MODES, 'mode', e);
    out.creeLe = horodatage(d.creeLe, 'creeLe', e);
    out.majLe = horodatage(d.majLe, 'majLe', e);

    var ent = estObjet(d.entreprise) ? d.entreprise : (e.err('entreprise : objet attendu.'), {});
    var logo = ent.logo === undefined ? null : ent.logo;
    if (logo !== null) {
      if (typeof logo !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(logo) || logo.length > C.MAX_LOGO_CHARS) {
        e.warn('Le logo n\'est pas lisible : il est ignoré.'); logo = null;
      }
    }
    out.entreprise = {
      nom: texte(ent.nom, 'entreprise.nom', C.MAX_NOM, e),
      secteur: texte(ent.secteur, 'entreprise.secteur', C.MAX_SECTEUR, e, ''),
      taille: enumere(ent.taille, C.TAILLES, 'entreprise.taille', e, 'autre'),
      logo: logo
    };
    out.refDate = dateIsoOuNull(d.refDate, 'refDate', e);

    var don = estObjet(d.donnees) ? d.donnees : (e.err('donnees : objet attendu.'), {});
    out.donnees = {};
    KINDS_TABLES.forEach(function (k) { out.donnees[k] = validerTable(don[k], k, e); });

    out.corrections = {};
    if (d.corrections !== undefined) {
      if (!estObjet(d.corrections)) e.err('corrections : objet attendu.');
      else {
        var cles = Object.keys(d.corrections);
        if (cles.length > 50000) e.err('corrections : trop d\'entrées.');
        else cles.forEach(function (k) {
          var c = d.corrections[k];
          var ch = 'corrections.' + k;
          if (k.length > 100 || !estObjet(c)) { e.err(ch + ' : entrée invalide.'); return; }
          out.corrections[k] = {
            ligne: entier(c.ligne, ch + '.ligne', e, 1, 10000000),
            champ: texte(c.champ, ch + '.champ', 40, e),
            avant: texte(c.avant, ch + '.avant', 500, e),
            propose: c.propose === null || c.propose === undefined ? null : texte(c.propose, ch + '.propose', 500, e),
            apres: texte(c.apres, ch + '.apres', 500, e),
            decision: enumere(c.decision, DECISIONS, ch + '.decision', e),
            certitude: enumere(c.certitude, CERTITUDES, ch + '.certitude', e),
            code: texte(c.code, ch + '.code', 40, e),
            note: texte(c.note, ch + '.note', C.MAX_NOTE, e, ''),
            decideLe: horodatage(c.decideLe, ch + '.decideLe', e)
          };
        });
      }
    }

    out.journal = [];
    if (d.journal !== undefined) {
      if (!Array.isArray(d.journal)) e.err('journal : tableau attendu.');
      else {
        var jr = d.journal;
        if (jr.length > C.MAX_JOURNAL) { e.warn('Le journal dépasse ' + C.MAX_JOURNAL + ' entrées : les plus anciennes sont écartées.'); jr = jr.slice(jr.length - C.MAX_JOURNAL); }
        jr.forEach(function (x, i) {
          if (!estObjet(x)) { e.err('journal[' + i + '] : entrée invalide.'); return; }
          out.journal.push({
            t: horodatage(x.t, 'journal[' + i + '].t', e),
            action: enumere(x.action, ACTIONS_JOURNAL, 'journal[' + i + '].action', e),
            cle: texte(x.cle, 'journal[' + i + '].cle', 100, e),
            avant: texte(x.avant, 'journal[' + i + '].avant', 500, e, ''),
            apres: texte(x.apres, 'journal[' + i + '].apres', 500, e, '')
          });
        });
      }
    }

    out.modeles = [];
    if (d.modeles !== undefined) {
      if (!Array.isArray(d.modeles) || d.modeles.length > 5) e.err('modeles : 5 modèles au maximum.');
      else d.modeles.forEach(function (m, i) {
        var ch = 'modeles[' + i + ']';
        if (!estObjet(m)) { e.err(ch + ' : objet attendu.'); return; }
        var ctl = {};
        if (estObjet(m.controles)) Object.keys(m.controles).slice(0, 60).forEach(function (k) {
          var c = m.controles[k];
          if (!estObjet(c)) { e.err(ch + '.controles.' + k + ' : objet attendu.'); return; }
          ctl[k] = {
            statut: enumere(c.statut, STATUTS_CONTROLE, ch + '.controles.' + k + '.statut', e),
            preuve: texte(c.preuve, ch + '.controles.' + k + '.preuve', 200, e, ''),
            note: texte(c.note, ch + '.controles.' + k + '.note', 300, e, '')
          };
        });
        out.modeles.push({ id: texte(m.id, ch + '.id', 40, e), nom: texte(m.nom, ch + '.nom', 60, e), controles: ctl });
      });
    }

    var org = d.organisation === undefined ? organisationVide() : d.organisation;
    if (!estObjet(org)) { e.err('organisation : objet attendu.'); org = organisationVide(); }
    out.organisation = {};
    CLES_ORG.forEach(function (k) { out.organisation[k] = enumere(org[k], REPONSES, 'organisation.' + k, e, 'nsp'); });
    var cib = estObjet(org.cibles) ? org.cibles : {};
    out.organisation.cibles = {};
    CLES_ORG.concat(['test']).forEach(function (k) { out.organisation.cibles[k] = dateIsoOuNull(cib[k], 'organisation.cibles.' + k, e); });

    out.plan = {};
    if (d.plan !== undefined) {
      if (!estObjet(d.plan)) e.err('plan : objet attendu.');
      else Object.keys(d.plan).slice(0, 200).forEach(function (k) {
        var p = d.plan[k];
        if (!estObjet(p)) { e.err('plan.' + k + ' : objet attendu.'); return; }
        out.plan[k] = {
          responsable: texte(p.responsable, 'plan.' + k + '.responsable', 60, e, ''),
          statut: enumere(p.statut, STATUTS_PLAN, 'plan.' + k + '.statut', e, 'a_faire'),
          echeance: dateIsoOuNull(p.echeance, 'plan.' + k + '.echeance', e)
        };
      });
    }

    var hyp = estObjet(d.hypotheses) ? d.hypotheses : {};
    out.hypotheses = { nbFactures12m: hyp.nbFactures12m === null || hyp.nbFactures12m === undefined ? null : entier(hyp.nbFactures12m, 'hypotheses.nbFactures12m', e, 0, 100000) };

    out.versions = [];
    if (d.versions !== undefined) {
      if (!Array.isArray(d.versions)) e.err('versions : tableau attendu.');
      else {
        var vs = d.versions;
        if (vs.length > C.MAX_VERSIONS) { e.warn('Plus de ' + C.MAX_VERSIONS + ' versions : les plus anciennes sont écartées.'); vs = vs.slice(vs.length - C.MAX_VERSIONS); }
        vs.forEach(function (v, i) {
          var ch = 'versions[' + i + ']';
          if (!estObjet(v)) { e.err(ch + ' : objet attendu.'); return; }
          out.versions.push({
            id: texte(v.id, ch + '.id', 40, e),
            numero: entier(v.numero, ch + '.numero', e, 1, 100000),
            libelle: texte(v.libelle, ch + '.libelle', C.MAX_LIBELLE_VERSION, e),
            creeLe: horodatage(v.creeLe, ch + '.creeLe', e),
            note: texte(v.note, ch + '.note', C.MAX_NOTE, e, ''),
            resume: validerResume(v.resume, ch + '.resume', e)
          });
        });
      }
    }

    if (e.erreurs.length) return fin();
    out.integrite = { somme: sommeIntegrite(out) };
    var recue = estObjet(obj.integrite) && typeof obj.integrite.somme === 'string' ? obj.integrite.somme : '';
    var r = { ok: true, dossier: out, erreurs: [], avertissements: e.avertissements, schemaTropRecent: false, integriteOk: true };
    if (obj.schemaVersion === C.SCHEMA_VERSION) {
      if (!recue) { r.integriteOk = false; r.avertissements.push('La somme d\'intégrité est absente : le fichier a peut-être été modifié.'); }
      else if (recue !== out.integrite.somme) { r.integriteOk = false; r.avertissements.push('La somme d\'intégrité ne correspond pas : le fichier a peut-être été modifié ou corrompu. Vérifiez les données.'); }
    }
    return r;
  }

  /* ------------------------------------------------------------------ */
  /* Sérialisation                                                       */
  /* ------------------------------------------------------------------ */

  /** Projection dans l'ordre canonique des champs (les champs d'exécution comme « rev » sont écartés). */
  function ordonner(d, sansLignes) {
    var o = {};
    ['format', 'schemaVersion', 'appVersion', 'id', 'mode', 'creeLe', 'majLe', 'entreprise', 'refDate'].forEach(function (k) { o[k] = d[k]; });
    o.donnees = {};
    KINDS_TABLES.forEach(function (k) { o.donnees[k] = sansLignes && k === 'lignes' ? null : (d.donnees[k] || null); });
    ['corrections', 'journal', 'modeles', 'organisation', 'plan', 'hypotheses', 'versions'].forEach(function (k) { o[k] = d[k]; });
    return o;
  }

  /** Texte JSON du dossier avec somme d'intégrité. opts.sansLignes : n'enregistre pas les lignes de factures (plus léger).
   *  Sans indentation au-dessus de 5 Mo. */
  function serialiserDossier(dossier, opts) {
    var o = ordonner(dossier, opts && opts.sansLignes);
    o.integrite = { somme: sommeIntegrite(o) };
    var compact = JSON.stringify(o);
    return compact.length > 5 * 1024 * 1024 ? compact : JSON.stringify(o, null, 1);
  }

  return {
    FORMAT: FORMAT,
    creerDossier: creerDossier,
    dossierDemo: dossierDemo,
    organisationVide: organisationVide,
    ajouterJournal: ajouterJournal,
    validateDossier: validateDossier,
    migrate: migrate,
    sommeIntegrite: sommeIntegrite,
    serialiserDossier: serialiserDossier,
    ordonner: ordonner,
    cleDangereuse: cleDangereuse
  };
});
