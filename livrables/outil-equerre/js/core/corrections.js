/* Équerre : contrôles et corrections du fichier tiers (module C).
 * Propositions de correction calculables, décisions de l'utilisateur (accepter, refuser, modifier), tiers effectifs,
 * anomalies issues du fichier de vérification au registre, journal, exports du fichier fiabilisé et du journal.
 *
 * Règles de fond :
 * - aucune donnée du fichier d'origine n'est jamais modifiée : les décisions sont appliquées à une copie de travail ;
 * - aucun SIREN n'est inventé : sans source dans la ligne, la proposition est « à vérifier au registre (incluse dans le dossier) » ;
 * - une valeur issue du registre n'est jamais appliquée automatiquement : l'écart est signalé « à vérifier » ;
 * - seules les propositions acceptées ou saisies par l'utilisateur sont appliquées. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./constants.js'), require('./util.js'), require('./identifiers.js'), require('./csv.js'), require('./tiers.js'));
  } else {
    var c = root.Equerre.core;
    c.corrections = factory(c.constants, c.util, c.identifiers, c.csv, c.tiers);
  }
})(typeof self !== 'undefined' ? self : this, function (C, U, I, CSV, T) {
  'use strict';

  var trim = U.trim;
  var cleanId = I.cleanId;

  /** Champs du fichier tiers sur lesquels une décision peut porter. */
  var CHAMPS_EDITABLES = ['siren', 'siret', 'tva', 'adresse', 'code_postal', 'ville', 'livraison_adresse', 'livraison_code_postal', 'livraison_ville'];
  var CHAMP_DOUBLON = 'doublon';
  var A_VERIFIER_REGISTRE = 'à vérifier au registre (incluse dans le dossier)';
  var A_COMPLETER = 'à compléter auprès du client';

  var CERTITUDE_LIBELLES = { calculee: 'Calculée', a_verifier: 'À vérifier', saisie: 'Saisie' };
  var DECISION_LIBELLES = { acceptee: 'Acceptée', refusee: 'Refusée', modifiee: 'Modifiée' };
  var ACTION_LIBELLES = { accepter: 'acceptée', refuser: 'refusée', modifier: 'modifiée', annuler: 'annulée' };
  var CHAMP_LIBELLES = {
    siren: 'SIREN', siret: 'SIRET', tva: 'TVA intracommunautaire', adresse: 'Adresse', code_postal: 'Code postal', ville: 'Ville',
    livraison_adresse: 'Adresse de livraison', livraison_code_postal: 'Code postal de livraison', livraison_ville: 'Ville de livraison',
    doublon: 'Doublon', etat_cesse: 'État au registre', ecart_nom: 'Nom au registre', ecart_adresse: 'Adresse au registre', siren_introuvable: 'SIREN au registre'
  };

  /** Anomalies issues du fichier de vérification au registre. Toujours « à vérifier » : jamais bloquantes. */
  var TYPES_REGISTRE = [
    { code: 'etat_cesse', label: 'Entreprise cessée au registre', severity: 'anomalie', source: 'registre' },
    { code: 'ecart_nom', label: 'Nom différent du registre', severity: 'anomalie', source: 'registre' },
    { code: 'ecart_adresse', label: 'Adresse différente du registre', severity: 'anomalie', source: 'registre' },
    { code: 'siren_introuvable', label: 'SIREN introuvable au registre', severity: 'anomalie', source: 'registre' }
  ];
  var CODES_REGISTRE = TYPES_REGISTRE.map(function (t) { return t.code; });

  function estRegistre(champ) { return CODES_REGISTRE.indexOf(champ) >= 0; }

  /* ------------------------------------------------------------------ */
  /* Utilitaires                                                         */
  /* ------------------------------------------------------------------ */

  function sirenDeTva(tva) {
    var t = cleanId(tva);
    var m = /^FR(\d{2})(\d{9})$/.exec(t);
    if (!m || I.tvaKey(m[2]) !== m[1] || !I.isValidSiren(m[2])) return null;
    return m[2];
  }

  function sirenDeSiret(siret) {
    var t = cleanId(siret);
    if (!I.isValidSiret(t)) return null;
    return I.isValidSiren(t.slice(0, 9)) ? t.slice(0, 9) : null;
  }

  function groupeSiren(s) { return s.slice(0, 3) + ' ' + s.slice(3, 6) + ' ' + s.slice(6); }

  /** Nombre de champs renseignés d'une ligne de tiers (« la plus complète »). */
  function completude(row) {
    var n = 0;
    T.TIERS_HEADERS.forEach(function (h) { if (trim(row[h]) !== '') n++; });
    return n;
  }

  function nomCourt(row) { return trim(row.nom) || '(sans nom)'; }

  /** Composantes connexes de la relation de doublon : tableaux d'indices de lignes (3 groupes sur la démonstration). */
  function composantesDoublons(rows) {
    return T.buildDuplicateIndex(rows).groupes;
  }

  /** Contexte de proposition pour une analyse : groupes de doublons par ligne physique. */
  function creerContexte(analysis) {
    var items = analysis.items;
    var groupes = analysis.groupesDoublons || composantesDoublons(items.map(function (it) { return it.row; }));
    var parLigne = new Map();
    groupes.forEach(function (g) {
      var membres = g.map(function (i) { return items[i]; });
      var meilleur = membres[0];
      membres.forEach(function (m) {
        var cm = completude(m.row);
        var cb = completude(meilleur.row);
        if (cm > cb || (cm === cb && m.ligne < meilleur.ligne)) meilleur = m;
      });
      membres.forEach(function (m) { parLigne.set(m.ligne, { membres: membres, meilleur: meilleur }); });
    });
    return { groupeDe: function (ligne) { return parLigne.get(ligne) || null; } };
  }

  /* ------------------------------------------------------------------ */
  /* Propositions de correction (T1)                                     */
  /* ------------------------------------------------------------------ */

  /** Propositions pour une ligne analysée { ligne, row, anomalies }. ctx : creerContexte(analysis) (facultatif : sans lui,
   *  la proposition de doublon n'est pas calculée).
   *  Chaque proposition : { cle, ligne, champ, code, valeurActuelle, valeurProposee|null, libelle, certitude: calculee|a_verifier,
   *  explication, appliquable, comptee, editable, exclusif, hypothese, registre }. */
  function proposerCorrections(item, ctx) {
    var r = item.row;
    var ligne = item.ligne;
    var out = [];
    var codes = {};
    item.anomalies.forEach(function (a) { codes[a.code] = a; });
    var sirenPropre = cleanId(r.siren);
    var sirenOk = I.isValidSiren(sirenPropre);

    function ajouter(p) {
      p.ligne = ligne;
      p.cle = ligne + '|' + p.champ;
      if (p.comptee === undefined) p.comptee = true;
      p.editable = CHAMPS_EDITABLES.indexOf(p.champ) >= 0;
      p.registre = estRegistre(p.champ);
      p.exclusif = p.exclusif || null;
      p.informative = !!p.informative;
      p.hypothese = p.hypothese || null;
      p.appliquable = p.valeurProposee !== null && p.valeurProposee !== undefined;
      if (!p.appliquable) p.valeurProposee = null;
      out.push(p);
    }

    // Normalisation des espaces et points d'un SIREN valide : simple note, non comptée dans le score.
    if (sirenOk && trim(r.siren) !== sirenPropre) {
      ajouter({
        champ: 'siren', code: 'normalisation', valeurActuelle: trim(r.siren), valeurProposee: sirenPropre, certitude: 'calculee', comptee: false,
        libelle: trim(r.siren) + ' → ' + sirenPropre,
        explication: 'Le SIREN est écrit avec des espaces ou des points. Il est reconnu tel quel ; l\'écrire en 9 chiffres facilite les rapprochements. Simple mise en forme : elle n\'entre pas dans le score.'
      });
    }

    if (codes.siren_manquant) {
      var lu = sirenDeTva(r.tva);
      var origine = 'la TVA';
      if (!lu) { lu = sirenDeSiret(r.siret); origine = 'le SIRET'; }
      if (lu) {
        ajouter({
          champ: 'siren', code: 'siren_manquant', valeurActuelle: '', valeurProposee: lu, certitude: 'a_verifier',
          libelle: 'SIREN lu dans ' + origine + ' : ' + groupeSiren(lu) + ', à confirmer au registre',
          explication: 'Le SIREN est repris des 9 chiffres contenus dans ' + origine + ' de la même ligne, dont le format et la clé sont corrects. Rien ne prouve encore que ce numéro est le bon : à confirmer au registre.'
        });
      } else {
        ajouter({
          champ: 'siren', code: 'siren_manquant', valeurActuelle: '', valeurProposee: null, certitude: 'a_verifier',
          libelle: A_VERIFIER_REGISTRE,
          explication: 'Aucun SIREN n\'est proposé : ni la TVA ni le SIRET de cette ligne n\'en contiennent un valide. Un numéro deviné serait un risque ; le retrouver au registre fait partie de la vérification incluse dans le dossier.'
        });
      }
    }

    if (codes.siren_invalide) {
      var sc = I.checkSiren(r.siren);
      var pourquoi = sc.code === 'longueur' && sc.length === 8
        ? 'Le SIREN a 8 chiffres (un zéro initial a peut-être été perdu dans un tableur) : il n\'est jamais complété automatiquement.'
        : 'Le SIREN ne passe pas le contrôle : il n\'est jamais corrigé automatiquement.';
      ajouter({
        champ: 'siren', code: 'siren_invalide', valeurActuelle: trim(r.siren), valeurProposee: null, certitude: 'a_verifier',
        libelle: A_VERIFIER_REGISTRE,
        explication: pourquoi + ' Aucun SIREN n\'est proposé : la bonne valeur se retrouve au registre (vérification incluse dans le dossier).'
      });
    }

    if (codes.tva_incoherente) {
      var tc = I.checkTva(r.tva, r.siren);
      var tvaPropre = tc.clean;
      var mt = /^FR([0-9A-Z]{2})(\d{9})$/.exec(tvaPropre);
      var attendu = sirenOk ? I.expectedTva(sirenPropre) : null;
      if (tc.code === 'format') {
        if (attendu) {
          ajouter({
            champ: 'tva', code: 'tva_incoherente', valeurActuelle: trim(r.tva), valeurProposee: attendu, certitude: 'a_verifier',
            libelle: trim(r.tva) + ' → ' + attendu + ' (déduite du SIREN, à confirmer)',
            explication: 'Le numéro saisi n\'a pas la forme d\'un numéro de TVA français. Le numéro proposé est déduit du SIREN de la ligne par la formule officielle de la clé ; à confirmer avant de l\'utiliser.'
          });
        } else {
          ajouter({
            champ: 'tva', code: 'tva_incoherente', valeurActuelle: trim(r.tva), valeurProposee: null, certitude: 'a_verifier',
            libelle: A_VERIFIER_REGISTRE,
            explication: 'Le numéro n\'a pas la forme d\'un numéro de TVA français et le SIREN de la ligne n\'est pas utilisable pour le déduire.'
          });
        }
      } else if (tc.code === 'cle' && mt && (!sirenOk || mt[2] === sirenPropre)) {
        if (sirenOk) {
          ajouter({
            champ: 'tva', code: 'tva_incoherente', valeurActuelle: trim(r.tva), valeurProposee: attendu, certitude: 'calculee',
            libelle: trim(r.tva) + ' → ' + attendu,
            explication: 'Le SIREN de la ligne est valide et le numéro de TVA le contient, mais sa clé est fausse. La clé se recalcule à partir du SIREN : calculée.'
          });
        } else {
          ajouter({
            champ: 'tva', code: 'tva_incoherente', valeurActuelle: trim(r.tva), valeurProposee: tc.expected, certitude: 'a_verifier',
            libelle: trim(r.tva) + ' → ' + tc.expected + ' (clé recalculée, à confirmer)',
            explication: 'La clé du numéro de TVA est fausse par rapport au SIREN qu\'il contient. Comme le SIREN de la ligne n\'est pas utilisable pour confirmer, la correction reste à vérifier.'
          });
        }
      } else if (sirenOk) {
        // Le numéro de TVA correspond à un autre SIREN : deux hypothèses qui s'excluent.
        var autre = mt ? mt[2] : null;
        var cleA = ligne + '|tva';
        var cleB = ligne + '|siren';
        ajouter({
          champ: 'tva', code: 'tva_incoherente', hypothese: 'A', exclusif: cleB, valeurActuelle: trim(r.tva), valeurProposee: attendu, certitude: 'a_verifier',
          libelle: 'Hypothèse A, le SIREN est juste : ' + trim(r.tva) + ' → ' + attendu,
          explication: 'La TVA ne correspond pas au SIREN de la ligne : l\'un des deux est faux. Hypothèse A : le SIREN est juste et la TVA est à remplacer par celle qui en découle. À vérifier au registre.'
        });
        ajouter({
          champ: 'siren', code: 'tva_incoherente', hypothese: 'B', exclusif: cleA, valeurActuelle: trim(r.siren),
          valeurProposee: autre && I.isValidSiren(autre) ? autre : null, certitude: 'a_verifier',
          libelle: autre && I.isValidSiren(autre)
            ? 'Hypothèse B, la TVA est juste : SIREN ' + trim(r.siren) + ' → ' + groupeSiren(autre)
            : 'Hypothèse B, la TVA est juste : ' + A_VERIFIER_REGISTRE,
          explication: 'Hypothèse B : le numéro de TVA est juste et c\'est le SIREN de la ligne qui est faux. Les deux hypothèses s\'excluent : n\'en retenez qu\'une, après vérification au registre.'
        });
      } else {
        ajouter({
          champ: 'tva', code: 'tva_incoherente', valeurActuelle: trim(r.tva), valeurProposee: null, certitude: 'a_verifier',
          libelle: A_VERIFIER_REGISTRE,
          explication: 'Le numéro de TVA est incohérent et le SIREN de la ligne n\'est pas utilisable pour le recalculer.'
        });
      }
    }

    if (codes.siret_incoherent) {
      ajouter({
        champ: 'siret', code: 'siret_incoherent', valeurActuelle: trim(r.siret), valeurProposee: null, certitude: 'a_verifier',
        libelle: A_VERIFIER_REGISTRE,
        explication: 'Les 5 derniers chiffres d\'un SIRET (numéro d\'établissement) ne se calculent pas : seul le registre permet de les confirmer. Aucune valeur n\'est proposée.'
      });
    }

    if (codes.adresse_incomplete) {
      var traiter = function (prefixe, adr) {
        var chk = T.checkAddress(adr);
        chk.problems.forEach(function (p) {
          var champ = prefixe + p.champ;
          var actuel = trim(adr[p.champ]);
          if (p.champ === 'code_postal' && p.code === 'format' && /^\d{4}$/.test(actuel)) {
            ajouter({
              champ: champ, code: 'adresse_incomplete', valeurActuelle: actuel, valeurProposee: '0' + actuel, certitude: 'calculee',
              libelle: actuel + ' → 0' + actuel,
              explication: 'Un code postal français a 5 chiffres : le zéro initial a probablement été perdu (tableur). Écrit avec un zéro devant, il redevient un code postal valide.'
            });
          } else if (p.code === 'format') {
            ajouter({
              champ: champ, code: 'adresse_incomplete', valeurActuelle: actuel, valeurProposee: null, certitude: 'a_verifier',
              libelle: 'à vérifier auprès du client',
              explication: 'Le code postal n\'a pas 5 chiffres et ne peut pas être complété de façon sûre.'
            });
          } else {
            ajouter({
              champ: champ, code: 'adresse_incomplete', valeurActuelle: '', valeurProposee: null, certitude: 'a_verifier',
              libelle: A_COMPLETER,
              explication: 'Cette information manque dans le fichier : elle ne peut pas se déduire, il faut la demander au client ou au fournisseur.'
            });
          }
        });
      };
      traiter('', { adresse: r.adresse, code_postal: r.code_postal, ville: r.ville, pays: r.pays });
      if (trim(r.livraison_adresse) || trim(r.livraison_code_postal) || trim(r.livraison_ville)) {
        traiter('livraison_', { adresse: r.livraison_adresse, code_postal: r.livraison_code_postal, ville: r.livraison_ville, pays: r.pays });
      }
    }

    if (codes.doublon) {
      var g = ctx && ctx.groupeDe ? ctx.groupeDe(ligne) : null;
      if (g) {
        var best = g.meilleur;
        if (best.ligne === ligne) {
          ajouter({
            champ: CHAMP_DOUBLON, code: 'doublon', informative: true, valeurActuelle: 'ligne ' + ligne, valeurProposee: null, certitude: 'calculee',
            libelle: 'Ligne la plus complète du groupe : à conserver',
            explication: 'Parmi les lignes à rapprocher (' + g.membres.map(function (m) { return m.ligne; }).join(', ') + '), celle-ci est la plus renseignée. Les autres sont à fusionner dans celle-ci.'
          });
        } else {
          ajouter({
            champ: CHAMP_DOUBLON, code: 'doublon', valeurActuelle: 'ligne ' + ligne + ' (' + nomCourt(r) + ')', valeurProposee: 'fusionnée dans la ligne ' + best.ligne, certitude: 'calculee',
            libelle: 'conserver la ligne la plus complète : ligne ' + best.ligne + ' (' + nomCourt(best.row) + ')',
            explication: 'Cette ligne est un doublon possible de la ligne ' + best.ligne + ', plus complète. L\'accepter écarte cette ligne de la copie de travail (le fichier d\'origine n\'est pas touché). À vérifier par vous : deux entreprises distinctes peuvent se ressembler.'
          });
        }
      } else {
        ajouter({
          champ: CHAMP_DOUBLON, code: 'doublon', valeurActuelle: 'ligne ' + ligne, valeurProposee: null, certitude: 'a_verifier',
          libelle: 'conserver la ligne la plus complète',
          explication: 'À rapprocher d\'une autre ligne du fichier : conserver la plus complète.'
        });
      }
    }

    // Anomalies issues du registre : toujours « à vérifier », aucune valeur du registre appliquée automatiquement.
    TYPES_REGISTRE.forEach(function (t) {
      var a = codes[t.code];
      if (!a) return;
      var actuel = t.code === 'ecart_nom' ? trim(r.nom)
        : t.code === 'ecart_adresse' ? [trim(r.adresse), trim(r.code_postal), trim(r.ville)].filter(Boolean).join(', ')
          : t.code === 'siren_introuvable' ? trim(r.siren) : 'active dans votre fichier (aucune information)';
      ajouter({
        champ: t.code, code: t.code, valeurActuelle: actuel, valeurProposee: null, certitude: 'a_verifier',
        libelle: a.label + ' : à vérifier',
        explication: a.detail + ' Aucune valeur du registre n\'est appliquée automatiquement : une fois vérifié (appel au client, extrait Kbis), marquez l\'écart comme vérifié.'
      });
    });

    return out;
  }

  /** Propositions de toute l'analyse : { liste, parLigne (Map ligne → propositions), total }. */
  function proposerToutes(analysis) {
    var ctx = creerContexte(analysis);
    var liste = [];
    var parLigne = new Map();
    analysis.items.forEach(function (it) {
      var p = proposerCorrections(it, ctx);
      if (p.length) { parLigne.set(it.ligne, p); for (var i = 0; i < p.length; i++) liste.push(p[i]); }
    });
    return { liste: liste, parLigne: parLigne, total: liste.length };
  }

  /* ------------------------------------------------------------------ */
  /* Validation d'une saisie (bouton « Modifier »)                       */
  /* ------------------------------------------------------------------ */

  /** Valide une valeur saisie pour un champ : { ok, valeur, message }. Le contrôle est celui du champ. */
  function validerSaisie(champ, valeur, row) {
    var v = trim(valeur);
    row = row || {};
    function non(m) { return { ok: false, valeur: v, message: m }; }
    if (CHAMPS_EDITABLES.indexOf(champ) < 0) return non('Ce champ ne se modifie pas ici.');
    if (v.length > 200) return non('La valeur est trop longue (200 caractères au maximum).');
    if (champ === 'siren') {
      var s = I.checkSiren(v);
      if (s.ok) return { ok: true, valeur: s.clean, message: '' };
      return non(s.code === 'vide' ? 'Saisissez un SIREN.'
        : s.code === 'caracteres' ? 'Un SIREN ne contient que des chiffres.'
          : s.code === 'longueur' ? 'Un SIREN a 9 chiffres ; vous en avez saisi ' + s.length + '.'
            : 'Ce SIREN ne passe pas le contrôle de clé : vérifiez la saisie.');
    }
    if (champ === 'siret') {
      var t = I.checkSiret(v, row.siren);
      if (t.ok) return { ok: true, valeur: t.clean, message: '' };
      return non(t.code === 'vide' ? 'Saisissez un SIRET.'
        : t.code === 'format' ? 'Un SIRET a 14 chiffres.'
          : t.code === 'cle' ? 'Ce SIRET ne passe pas le contrôle de clé : vérifiez la saisie.'
            : 'Ce SIRET commence par le SIREN ' + t.sirenDuSiret + ', qui n\'est pas celui de la ligne.');
    }
    if (champ === 'tva') {
      var tv = I.checkTva(v, row.siren);
      if (tv.ok) return { ok: true, valeur: tv.clean, message: '' };
      return non(tv.code === 'vide' ? 'Saisissez un numéro de TVA.'
        : tv.code === 'format' ? 'Un numéro de TVA français a la forme FR, 2 chiffres de clé, puis le SIREN.'
          : tv.code === 'cle' ? 'La clé de ce numéro est incorrecte (attendu : ' + tv.expected + ').'
            : 'Ce numéro ne correspond pas au SIREN de la ligne (attendu : ' + tv.expected + ').');
    }
    if (champ === 'code_postal' || champ === 'livraison_code_postal') {
      if (!v) return non('Saisissez un code postal.');
      if (T.isFrance(row.pays) && !/^\d{5}$/.test(v)) return non('Un code postal français a 5 chiffres.');
      return { ok: true, valeur: v, message: '' };
    }
    if (!v) return non('Saisissez une valeur.');
    return { ok: true, valeur: v, message: '' };
  }

  /* ------------------------------------------------------------------ */
  /* Décisions et journal                                                */
  /* ------------------------------------------------------------------ */

  function coupe(s, n) { s = s === null || s === undefined ? '' : String(s); return s.length > n ? s.slice(0, n) : s; }

  /** Enregistre une décision dans le dossier (corrections + journal). p : { proposition, decision, saisie, note }.
   *  Renvoie { ok, message, entree }. maintenant : horodatage ISO fourni par l'appelant (aucune horloge implicite). */
  function enregistrerDecision(dossier, p, maintenant) {
    var prop = p.proposition;
    var row = p.row || {};
    var decision = p.decision;
    if (!prop || !prop.cle) return { ok: false, message: 'Proposition inconnue.' };
    var apres = '';
    var certitude = prop.certitude;
    var action;
    if (decision === 'acceptee') {
      if (!prop.appliquable || prop.valeurProposee === null) return { ok: false, message: 'Cette proposition n\'a pas de valeur à appliquer : modifiez-la ou refusez-la.' };
      apres = prop.valeurProposee;
      action = 'accepter';
    } else if (decision === 'refusee') {
      action = 'refuser';
    } else if (decision === 'modifiee') {
      if (!prop.editable) return { ok: false, message: 'Ce point ne se modifie pas ici.' };
      var v = validerSaisie(prop.champ, p.saisie, row);
      if (!v.ok) return { ok: false, message: v.message };
      apres = v.valeur;
      certitude = 'saisie';
      action = 'modifier';
    } else {
      return { ok: false, message: 'Décision inconnue.' };
    }
    if (prop.exclusif && decision !== 'refusee') {
      var autre = dossier.corrections[prop.exclusif];
      if (autre && autre.decision !== 'refusee') return { ok: false, message: 'L\'autre hypothèse est déjà retenue : annulez-la d\'abord (les deux hypothèses s\'excluent).' };
    }
    dossier.corrections[prop.cle] = {
      ligne: prop.ligne, champ: prop.champ, avant: coupe(prop.valeurActuelle, 500), propose: prop.valeurProposee === null ? null : coupe(prop.valeurProposee, 500),
      apres: coupe(apres, 500), decision: decision, certitude: certitude, code: coupe(prop.code, 40), note: coupe(p.note, C.MAX_NOTE), decideLe: maintenant
    };
    var entree = { t: maintenant, action: action, cle: prop.cle, avant: coupe(prop.valeurActuelle, 500), apres: coupe(apres, 500) };
    dossier.journal.push(entree);
    var trop = dossier.journal.length - C.MAX_JOURNAL;
    var supprimees = 0;
    if (trop > 0) { dossier.journal.splice(0, trop); supprimees = trop; }
    return { ok: true, message: '', entree: entree, supprimees: supprimees };
  }

  /** Annule une décision : l'état d'origine est restitué et l'annulation est ajoutée au journal. */
  function annulerDecision(dossier, cle, maintenant) {
    var c = dossier.corrections[cle];
    if (!c) return { ok: false, message: 'Aucune décision à annuler.' };
    delete dossier.corrections[cle];
    var entree = { t: maintenant, action: 'annuler', cle: cle, avant: coupe(c.decision === 'refusee' ? '(refusée)' : c.apres, 500), apres: coupe(c.avant, 500) };
    dossier.journal.push(entree);
    var trop = dossier.journal.length - C.MAX_JOURNAL;
    if (trop > 0) dossier.journal.splice(0, trop);
    return { ok: true, message: '', entree: entree };
  }

  /** Tiers effectifs : copie de travail avec les décisions acceptées ou modifiées appliquées.
   *  Les lignes dont la fusion de doublon est acceptée sont écartées. Le fichier d'origine n'est jamais modifié. */
  function applyDecisions(rows, corrections) {
    var parLigne = new Map();
    var nb = 0;
    Object.keys(corrections || {}).forEach(function (k) {
      var c = corrections[k];
      if (!c || c.decision === 'refusee') return;
      var l = parLigne.get(c.ligne);
      if (l) l.push(c); else parLigne.set(c.ligne, [c]);
    });
    var out = [];
    var exclues = [];
    if (!parLigne.size) return { rows: rows.slice(), exclues: exclues, nbAppliquees: 0 };
    rows.forEach(function (r) {
      var l = parLigne.get(r.ligne);
      if (!l) { out.push(r); return; }
      var copie = {};
      Object.keys(r).forEach(function (k) { copie[k] = r[k]; });
      var fusion = false;
      l.forEach(function (c) {
        if (c.champ === CHAMP_DOUBLON) { fusion = true; nb++; } else if (CHAMPS_EDITABLES.indexOf(c.champ) >= 0) { copie[c.champ] = c.apres; nb++; }
      });
      if (fusion) exclues.push(r.ligne); else out.push(copie);
    });
    return { rows: out, exclues: exclues, nbAppliquees: nb };
  }

  /** Progression : décisions prises sur propositions disponibles. */
  function compterDecisions(propositions, corrections) {
    var n = 0;
    var liste = (propositions.liste || propositions).filter(function (p) { return !p.informative; });
    liste.forEach(function (p) { if (corrections && corrections[p.cle]) n++; });
    return { decisions: n, total: liste.length };
  }

  /* ------------------------------------------------------------------ */
  /* Registre : anomalies issues du fichier de vérification              */
  /* ------------------------------------------------------------------ */

  var MOTS_VOIE = ['RUE', 'AVENUE', 'AV', 'BD', 'BOULEVARD', 'CHEMIN', 'ALLEE', 'IMPASSE', 'ROUTE', 'PLACE', 'QUAI', 'ZONE', 'DE', 'DU', 'DES', 'LA', 'LE', 'LES', 'D', 'L', 'ZA', 'ZI', 'ET'];

  function jetons(s) {
    return U.stripAccents(trim(s)).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(' ').filter(function (w) { return w; });
  }

  function sousEnsemble(a, b) {
    return a.length > 0 && a.every(function (x) { return b.indexOf(x) >= 0; });
  }

  function nomsCompatibles(a, b) {
    var na = T.normalizeName(a);
    var nb = T.normalizeName(b);
    if (!na || !nb) return true;
    if (na === nb) return true;
    var ja = na.split(' ');
    var jb = nb.split(' ');
    return sousEnsemble(ja, jb) || sousEnsemble(jb, ja);
  }

  function villeNormalisee(v) {
    return U.stripAccents(trim(v)).toUpperCase().replace(/\bCEDEX\b.*$/, '').replace(/\b\d+\s*(ER|E|EME)?\b/g, '').replace(/\bARRONDISSEMENT\b/g, '')
      .replace(/\bST\b/g, 'SAINT').replace(/\bSTE\b/g, 'SAINTE').replace(/[^A-Z]+/g, ' ').trim();
  }

  function voieCompatible(a, b) {
    var ja = jetons(a).filter(function (w) { return MOTS_VOIE.indexOf(w) < 0; });
    var jb = jetons(b).filter(function (w) { return MOTS_VOIE.indexOf(w) < 0; });
    if (!ja.length || !jb.length) return true;
    return sousEnsemble(ja, jb) || sousEnsemble(jb, ja);
  }

  function etatCesse(etat) {
    var e = U.normalizeHeader(etat);
    return e === 'c' || /^cess/.test(e) || /^ferm/.test(e) || e === 'radiee' || e === 'radie';
  }

  function statutIntrouvable(statut) {
    var s = U.normalizeHeader(statut);
    return s === 'introuvable' || s === 'siren_introuvable' || s === 'non_trouve' || s === 'inconnu';
  }

  /** Index du fichier de vérification : SIREN → enregistrement (le plus récent en cas de répétition). */
  function indexerRegistre(records) {
    var m = new Map();
    (records || []).forEach(function (r) {
      var cur = m.get(r.siren);
      if (!cur || (r.dateVerification || '') >= (cur.dateVerification || '')) m.set(r.siren, r);
    });
    return m;
  }

  /** Anomalies « à vérifier » d'une ligne au vu de l'enregistrement du registre. Aucune valeur n'est appliquée. */
  function anomaliesRegistre(row, rec) {
    var out = [];
    if (!rec) return out;
    var date = rec.dateVerification ? ' (consultation du ' + rec.dateVerification.slice(8, 10) + '/' + rec.dateVerification.slice(5, 7) + '/' + rec.dateVerification.slice(0, 4) + ')' : '';
    if (statutIntrouvable(rec.statut)) {
      out.push({ code: 'siren_introuvable', severity: 'anomalie', source: 'registre', label: 'SIREN introuvable au registre',
        detail: 'Le registre ne connaît pas le SIREN « ' + trim(row.siren) + ' »' + date + '.', action: 'Vérifier le SIREN auprès du client ou dans un extrait Kbis.' });
      return out;
    }
    if (rec.etat && etatCesse(rec.etat)) {
      out.push({ code: 'etat_cesse', severity: 'anomalie', source: 'registre', label: 'Entreprise cessée au registre',
        detail: 'Le registre indique que cette entreprise est cessée' + date + '.', action: 'Vérifier avec le client que l\'entreprise est toujours en activité avant d\'émettre des factures.' });
    }
    if (rec.denomination && !nomsCompatibles(row.nom, rec.denomination)) {
      out.push({ code: 'ecart_nom', severity: 'anomalie', source: 'registre', label: 'Nom différent du registre',
        detail: 'Votre fichier indique « ' + trim(row.nom) + ' », le registre « ' + rec.denomination + ' »' + date + '. Un écart peut être normal (enseigne, sigle) : à vérifier.', action: 'Confirmer la raison sociale exacte auprès du client.' });
    }
    var ecarts = [];
    if (rec.codePostal && trim(row.code_postal) && rec.codePostal.replace(/\s/g, '') !== trim(row.code_postal).replace(/\s/g, '')) ecarts.push('code postal ' + trim(row.code_postal) + ' contre ' + rec.codePostal);
    if (rec.ville && trim(row.ville)) {
      var v1 = villeNormalisee(row.ville);
      var v2 = villeNormalisee(rec.ville);
      if (v1 && v2 && v1 !== v2 && v1.indexOf(v2) < 0 && v2.indexOf(v1) < 0) ecarts.push('ville ' + trim(row.ville) + ' contre ' + rec.ville);
    }
    if (rec.adresse && trim(row.adresse) && !voieCompatible(row.adresse, rec.adresse)) ecarts.push('adresse « ' + trim(row.adresse) + ' » contre « ' + rec.adresse + ' »');
    if (ecarts.length) {
      out.push({ code: 'ecart_adresse', severity: 'anomalie', source: 'registre', label: 'Adresse différente du registre',
        detail: 'Écart avec l\'adresse du siège au registre' + date + ' : ' + ecarts.join(' ; ') + '. Le registre donne l\'adresse du siège : un tiers facturé à l\'adresse d\'un établissement est signalé à tort.', action: 'Vérifier l\'adresse de facturation auprès du client.' });
    }
    return out;
  }

  /** Complète une analyse avec les anomalies issues du fichier registre. Renvoie une nouvelle analyse (l'originale est inchangée).
   *  Les écarts marqués « vérifiés » (décision refusée sur le point correspondant) ne sont plus comptés.
   *  Sans fichier registre, l'analyse est renvoyée telle quelle. */
  function ajouterRegistre(analysis, registreRecords, corrections) {
    if (!registreRecords || !registreRecords.length) return analysis;
    var idx = indexerRegistre(registreRecords);
    var counts = {};
    Object.keys(analysis.counts).forEach(function (k) { counts[k] = analysis.counts[k]; });
    TYPES_REGISTRE.forEach(function (t) { counts[t.code] = 0; });
    var clean = 0;
    var avec = 0;
    var items = analysis.items.map(function (it) {
      var rec = idx.get(cleanId(it.row.siren));
      var sup = anomaliesRegistre(it.row, rec).filter(function (a) {
        var c = corrections && corrections[it.ligne + '|' + a.code];
        return !(c && c.decision === 'refusee');
      });
      var anomalies = sup.length ? it.anomalies.concat(sup) : it.anomalies;
      var seen = {};
      var compte = false;
      sup.forEach(function (a) { if (!seen[a.code]) { counts[a.code]++; seen[a.code] = true; } });
      anomalies.forEach(function (a) { if (a.severity === 'anomalie') compte = true; });
      if (compte) avec++; else clean++;
      return { ligne: it.ligne, row: it.row, anomalies: anomalies, registre: rec || null };
    });
    return {
      items: items, total: items.length, clean: clean, withAnomaly: avec, counts: counts,
      score: T.readinessScore(items.length, clean), doublons: analysis.doublons, groupesDoublons: analysis.groupesDoublons, avecRegistre: true
    };
  }

  /** Analyse des tiers effectifs : décisions appliquées puis anomalies du registre.
   *  Renvoie { analysis, exclues, nbAppliquees }. */
  function analyseEffective(rows, opts) {
    opts = opts || {};
    var eff = applyDecisions(rows, opts.corrections);
    var a = T.analyzeThirdParties(eff.rows, { columns: opts.columns });
    a = ajouterRegistre(a, opts.registre, opts.corrections);
    return { analysis: a, exclues: eff.exclues, nbAppliquees: eff.nbAppliquees };
  }

  /* ------------------------------------------------------------------ */
  /* CA des 12 derniers mois par fiche de tiers                          */
  /* ------------------------------------------------------------------ */

  function moisAvant(iso, n) {
    var p = iso.split('-');
    var y = +p[0];
    var m = +p[1] - 1 - n;
    var d = +p[2];
    y += Math.floor(m / 12);
    m = ((m % 12) + 12) % 12;
    var dmax = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return U.pad(y, 4) + '-' + U.pad(m + 1, 2) + '-' + U.pad(Math.min(d, dmax), 2);
  }

  /** CA HT des 12 derniers mois par ligne physique de tiers client : factures émises du premier jour du mois situé 12 mois avant la date
   *  de référence jusqu'à cette date incluse (le mois de départ est pris en entier).
   *  Rapprochement : SIREN valide puis nom normalisé ; les homonymes non tranchés et les clients non rapprochés n'ont pas de CA.
   *  Renvoie Map ligne → { ca, nbFactures }. Linéaire. */
  function caParTiers(invoices, rows, refIso, tranche) {
    var debut = moisAvant(refIso, 12).slice(0, 8) + '01';
    var idx = T.indexerTiers(rows);
    var out = new Map();
    for (var i = 0; i < invoices.length; i++) {
      var inv = invoices[i];
      if (!(inv.dateEmission >= debut && inv.dateEmission <= refIso)) continue;
      var cand = inv.sirenClient && I.isValidSiren(inv.sirenClient) ? idx.parSiren.get(inv.sirenClient) : null;
      if (!cand) cand = idx.parNom.get(T.normalizeName(inv.client));
      var index = null;
      if (cand && cand.length === 1) index = cand[0];
      else if (cand && cand.length > 1) {
        var voulu = tranche && tranche[inv.client];
        if (voulu !== undefined && cand.indexOf(voulu) >= 0) index = voulu;
      }
      if (index === null) continue;
      var ligne = rows[index].ligne;
      var cur = out.get(ligne);
      if (cur) { cur.ca += inv.ht; cur.nbFactures++; } else out.set(ligne, { ca: inv.ht, nbFactures: 1 });
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Exports                                                             */
  /* ------------------------------------------------------------------ */

  function libelleCertitude(c) { return CERTITUDE_LIBELLES[c] || c; }

  /** CSV des anomalies : une ligne par anomalie, avec valeur actuelle, correction proposée et certitude. */
  function anomaliesToCsv(analysis) {
    var headers = ['ligne', 'type', 'nom', 'siren', 'anomalie', 'gravite', 'detail', 'action_suggeree', 'valeur_actuelle', 'correction_proposee', 'certitude'];
    var ctx = creerContexte(analysis);
    var rows = [];
    analysis.items.forEach(function (it) {
      if (!it.anomalies.length) return;
      var props = proposerCorrections(it, ctx);
      it.anomalies.forEach(function (a) {
        var liees = props.filter(function (p) { return p.code === a.code && p.comptee; });
        rows.push([it.ligne, it.row.type, it.row.nom, it.row.siren, a.label, a.severity === 'anomalie' ? 'anomalie' : 'à noter', a.detail, a.action,
          liees.map(function (p) { return p.valeurActuelle; }).join(' | '),
          liees.map(function (p) { return p.valeurProposee !== null ? p.valeurProposee : p.libelle; }).join(' | '),
          liees.map(function (p) { return libelleCertitude(p.certitude).toLowerCase(); }).join(' | ')]);
      });
    });
    return CSV.toCsv(headers, rows);
  }

  /** Fichier fiabilisé (CSV) : colonnes d'origine, puis une colonne <champ>_corrige par champ présent dans le fichier,
   *  puis statut_ligne et anomalies_restantes. Le fichier d'origine n'est jamais écrasé.
   *  opts : { analysis (tiers effectifs), corrections, exclues (lignes fusionnées) }. */
  function buildFiabilise(table, opts) {
    opts = opts || {};
    var corrections = opts.corrections || {};
    var effectif = new Map();
    if (opts.analysis) opts.analysis.items.forEach(function (it) { effectif.set(it.ligne, it); });
    var exclues = new Set(opts.exclues || []);
    var colonne = {};
    table.mapping.forEach(function (m, j) { if (m && colonne[m] === undefined) colonne[m] = j; });
    var champs = CHAMPS_EDITABLES.filter(function (c) { return colonne[c] !== undefined; });
    var entetes = table.entetes.concat(champs.map(function (c) { return c + '_corrige'; }), ['statut_ligne', 'anomalies_restantes']);
    var decisionsParLigne = new Map();
    Object.keys(corrections).forEach(function (k) {
      var c = corrections[k];
      if (c.decision === 'refusee') return;
      var l = decisionsParLigne.get(c.ligne);
      if (l) l.push(c); else decisionsParLigne.set(c.ligne, [c]);
    });
    var n = table.entetes.length;
    var lignes = table.lignes.map(function (row, i) {
      var ligne = table.numerosLigne[i];
      var cells = [];
      for (var j = 0; j < n; j++) cells.push(row[j] === undefined ? '' : row[j]);
      var decs = decisionsParLigne.get(ligne) || [];
      var parChamp = {};
      decs.forEach(function (d) { parChamp[d.champ] = d; });
      champs.forEach(function (c) { cells.push(parChamp[c] ? parChamp[c].apres : ''); });
      var it = effectif.get(ligne);
      var restantes = it ? it.anomalies.filter(function (a) { return a.severity === 'anomalie'; }).map(function (a) { return a.label; }) : [];
      var statut;
      if (exclues.has(ligne)) statut = 'fusionnee';
      else if (!it) statut = 'non_analysee';
      else if (restantes.length) statut = 'a_corriger';
      else if (decs.length) statut = 'corrigee';
      else statut = 'sans_anomalie';
      cells.push(statut);
      cells.push(restantes.join(' | '));
      return cells;
    });
    return CSV.toCsv(entetes, lignes);
  }

  /** Journal des corrections (CSV) : une ligne par événement (acceptation, refus, modification, annulation). */
  function buildJournal(journal, opts) {
    opts = opts || {};
    var noms = new Map();
    (opts.rows || []).forEach(function (r) { noms.set(r.ligne, r.nom); });
    var headers = ['date_heure', 'action', 'ligne', 'champ', 'nom', 'valeur_avant', 'valeur_apres'];
    var rows = (journal || []).map(function (e) {
      var p = String(e.cle).split('|');
      var ligne = p[0];
      return [e.t, ACTION_LIBELLES[e.action] || e.action, ligne, p.slice(1).join('|'), noms.get(+ligne) || '', e.avant, e.apres];
    });
    return CSV.toCsv(headers, rows);
  }

  return {
    CHAMPS_EDITABLES: CHAMPS_EDITABLES,
    CHAMP_DOUBLON: CHAMP_DOUBLON,
    TYPES_REGISTRE: TYPES_REGISTRE,
    CODES_REGISTRE: CODES_REGISTRE,
    CERTITUDE_LIBELLES: CERTITUDE_LIBELLES,
    DECISION_LIBELLES: DECISION_LIBELLES,
    CHAMP_LIBELLES: CHAMP_LIBELLES,
    A_VERIFIER_REGISTRE: A_VERIFIER_REGISTRE,
    proposerCorrections: proposerCorrections,
    proposerToutes: proposerToutes,
    creerContexte: creerContexte,
    composantesDoublons: composantesDoublons,
    validerSaisie: validerSaisie,
    enregistrerDecision: enregistrerDecision,
    annulerDecision: annulerDecision,
    applyDecisions: applyDecisions,
    compterDecisions: compterDecisions,
    indexerRegistre: indexerRegistre,
    anomaliesRegistre: anomaliesRegistre,
    ajouterRegistre: ajouterRegistre,
    analyseEffective: analyseEffective,
    caParTiers: caParTiers,
    moisAvant: moisAvant,
    anomaliesToCsv: anomaliesToCsv,
    buildFiabilise: buildFiabilise,
    buildJournal: buildJournal
  };
});
