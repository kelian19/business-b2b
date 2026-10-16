/* Tests des données fictives de la démonstration Flow Inbox. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var D = require('../js/data.js');

var EMAILS = D.emails;
var U = D.utilitaires;
var REF = D.dateReference;

function cles(o) { return Object.keys(o); }
function jourSemaine(iso) { return new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay(); }
function ms(iso) { return Date.parse(iso); }
/** Corps sans les lignes citées (« > ... »). */
function sansCitations(corps) { return corps.split('\n').filter(function (l) { return l.charAt(0) !== '>'; }).join('\n'); }
function listePersonnes(l) { return l.map(function (x) { return x.nom + ' ' + x.adresse; }); }
function texteComplet(e) {
  return [e.objet, e.corps, e.de.nom, e.de.adresse, e.traitement.note || ''].concat(listePersonnes(e.a), listePersonnes(e.cc), e.pieces_jointes).join('\n');
}
var MOIS = { janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12 };
function dateCitee(a, mois, jour, h, m) { return a + '-' + ('0' + MOIS[mois]).slice(-2) + '-' + ('0' + jour).slice(-2) + 'T' + h + ':' + m; }

test('volume : entre 40 et 55 e-mails, majorité de nouvelles demandes', function () {
  assert.ok(EMAILS.length >= 40 && EMAILS.length <= 55, 'nombre : ' + EMAILS.length);
  var n = EMAILS.filter(function (e) { return e.categorie === 'nouvelle_demande'; }).length;
  assert.ok(n > EMAILS.length / 2, n + ' nouvelles demandes sur ' + EMAILS.length);
});

test('identifiants : e-mails, identifiants de message et fils cohérents et uniques', function () {
  var ids = {}, mids = {};
  EMAILS.forEach(function (e) {
    assert.ok(!ids[e.id], 'id en double : ' + e.id); ids[e.id] = true;
    assert.ok(!mids[e.message_id], 'message_id en double : ' + e.message_id); mids[e.message_id] = true;
    assert.ok(/^m\d{2}$/.test(e.id), e.id);
    assert.ok(/^fil-\d{4}$/.test(e.fil), e.fil);
  });
  EMAILS.forEach(function (e) {
    if (e.en_reponse_a) {
      assert.ok(ids[e.en_reponse_a], e.id + ' : parent inconnu');
      assert.strictEqual(D.parId(e.en_reponse_a).fil, e.fil, e.id + ' : le fil doit être celui du parent');
    }
    if (e.doublon_de) assert.ok(ids[e.doublon_de], e.id + ' : original inconnu');
  });
});

test('listes autorisées : catégories, services, statuts, champs, raisons de revue, responsables', function () {
  var cats = cles(D.categories);
  assert.deepStrictEqual(cats.slice().sort(), ['candidature', 'client_existant', 'demarchage', 'fournisseur', 'hors_perimetre', 'indesirable', 'nouvelle_demande', 'relance_prospect']);
  var resp = D.equipe.map(function (p) { return p.id; });
  assert.ok(D.equipe.length >= 3 && D.equipe.length <= 6);
  assert.ok(D.servicesIds.indexOf('hors_catalogue') >= 0 && D.services.length === 9);
  EMAILS.forEach(function (e) {
    assert.ok(cats.indexOf(e.categorie) >= 0, e.id + ' catégorie ' + e.categorie);
    assert.ok(cles(D.statutsTraitement).indexOf(e.traitement.statut) >= 0, e.id + ' statut ' + e.traitement.statut);
    assert.ok(e.traitement.responsable === null || resp.indexOf(e.traitement.responsable) >= 0, e.id + ' responsable');
    assert.deepStrictEqual(cles(e.releves), D.champs, e.id + ' champs');
    D.champs.forEach(function (c) { assert.ok(cles(D.statutsChamp).indexOf(e.releves[c].statut) >= 0, e.id + '.' + c + ' statut'); });
    var s = e.releves.service;
    if (s.valeur !== null) assert.ok(D.servicesIds.indexOf(s.valeur) >= 0, e.id + ' service ' + s.valeur);
    e.revue.forEach(function (r) { assert.ok(D.raisonsRevue[r], e.id + ' raison inconnue ' + r); });
  });
});

test('couverture : chaque catégorie, service, type de budget et cas particulier demandé est représenté', function () {
  cles(D.categories).forEach(function (c) {
    assert.ok(EMAILS.some(function (e) { return e.categorie === c; }), 'catégorie sans exemple : ' + c);
  });
  ['transfere', 'reponse_fil', 'relance', 'double_envoi', 'agence_en_copie', 'appel_urgent'].forEach(function (m) {
    assert.ok(EMAILS.some(function (e) { return e.marqueurs.indexOf(m) >= 0; }), 'marqueur absent : ' + m);
  });
  D.services.forEach(function (s) {
    assert.ok(EMAILS.some(function (e) { return e.releves.service.valeur === s.id; }), 'service jamais demandé : ' + s.id);
  });
  ['fourchette', 'a_partir_de', 'plafond', 'exact', 'approximatif'].forEach(function (t) {
    assert.ok(EMAILS.some(function (e) { return e.releves.budget.valeur && e.releves.budget.valeur.type === t; }), 'type de budget absent : ' + t);
  });
  assert.ok(EMAILS.some(function (e) { return e.releves.budget.statut === 'absent' && e.categorie === 'nouvelle_demande'; }), 'budget absent');
  assert.ok(EMAILS.some(function (e) { return e.releves.budget.statut === 'a_verifier'; }), 'budget à vérifier');
  assert.ok(EMAILS.some(function (e) { return e.releves.delai.statut === 'absent' && e.categorie === 'nouvelle_demande'; }), 'délai absent');
  assert.ok(EMAILS.some(function (e) { return e.releves.delai.valeur && e.releves.delai.valeur.precision === 'precise'; }), 'délai précis');
  assert.ok(EMAILS.some(function (e) { return e.releves.delai.valeur && e.releves.delai.valeur.precision === 'vague'; }), 'délai vague');
});

test('passages : chaque passage relevé existe mot pour mot dans le corps (hors citations)', function () {
  var n = 0;
  EMAILS.forEach(function (e) {
    var libre = sansCitations(e.corps);
    D.champs.forEach(function (c) {
      var r = e.releves[c];
      if (r.statut === 'absent') {
        assert.strictEqual(r.passage, null, e.id + '.' + c + ' : absent mais passage renseigné');
        assert.strictEqual(r.valeur, null, e.id + '.' + c + ' : absent mais valeur renseignée');
      } else {
        assert.ok(typeof r.passage === 'string' && r.passage.length > 0, e.id + '.' + c + ' : passage manquant');
        assert.ok(e.corps.indexOf(r.passage) >= 0, e.id + '.' + c + ' : passage introuvable « ' + r.passage + ' »');
        assert.ok(libre.indexOf(r.passage) >= 0, e.id + '.' + c + ' : passage pris dans une citation « ' + r.passage + ' »');
        n++;
      }
    });
  });
  assert.ok(n > 150, 'passages vérifiés : ' + n);
});

test('valeurs : budgets, délais et contacts cohérents avec leur passage', function () {
  EMAILS.forEach(function (e) {
    var b = e.releves.budget;
    if (b.valeur) {
      assert.ok(b.valeur.min !== null || b.valeur.max !== null || b.statut === 'a_verifier', e.id + ' budget sans montant');
      if (b.valeur.min !== null && b.valeur.max !== null) assert.ok(b.valeur.min <= b.valeur.max, e.id + ' min > max');
      if (!/k/.test(b.passage)) {
        var chiffres = b.passage.replace(/\s/g, '');
        [b.valeur.min, b.valeur.max].forEach(function (v) {
          if (v !== null) assert.ok(chiffres.indexOf(String(v)) >= 0, e.id + ' montant ' + v + ' absent du passage « ' + b.passage + ' »');
        });
      }
    }
    var d = e.releves.delai;
    if (d.valeur) {
      assert.ok(['precise', 'vague'].indexOf(d.valeur.precision) >= 0, e.id + ' précision');
      if (d.valeur.precision === 'precise') {
        assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(d.valeur.date), e.id + ' date ISO attendue');
        assert.ok(!isNaN(Date.parse(d.valeur.date)), e.id + ' date invalide');
      } else {
        assert.strictEqual(d.valeur.date, null, e.id + ' délai vague : pas de date inventée');
      }
    }
    var ct = e.releves.contact;
    if (ct.valeur) assert.ok(/^[^@\s]+@[^@\s]+\.example$/.test(ct.valeur.email), e.id + ' e-mail du contact');
  });
});

test('revue : tout champ à vérifier ou statut en revue s\'explique par une raison de revue', function () {
  EMAILS.forEach(function (e) {
    var averifier = D.champs.some(function (c) { return e.releves[c].statut === 'a_verifier'; });
    if (averifier) assert.ok(e.revue.length > 0, e.id + ' : champ à vérifier sans raison de revue');
    if (e.traitement.statut === 'en_revue') assert.ok(e.revue.length > 0, e.id + ' : statut en revue sans raison');
  });
});

test('adresses : aucune adresse hors du domaine réservé .example, aucun lien, téléphones fictifs seulement', function () {
  var nb = 0;
  var estAgence = function (p) { return /@agence-exemple-fictive\.example$/.test(p.adresse); };
  EMAILS.forEach(function (e) {
    var t = texteComplet(e);
    (t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g) || []).forEach(function (a) {
      nb++;
      assert.ok(/\.example$/.test(a), e.id + ' adresse hors .example : ' + a);
    });
    assert.ok(!/https?:|www\./i.test(t), e.id + ' : lien');
    (t.match(/(?:\+33|0)\s?[1-9](?:[\s.]?\d{2}){4}/g) || []).forEach(function (p) {
      assert.ok(['01 23 45 67 89', '06 12 34 56 78'].indexOf(p) >= 0, e.id + ' téléphone non fictif : ' + p);
    });
    [e.de].concat(e.a, e.cc).forEach(function (p) { assert.ok(/^[^@\s]+@[^@\s]+\.example$/.test(p.adresse), e.id + ' ' + p.adresse); });
    assert.ok(e.a.concat(e.cc).some(estAgence), e.id + ' : l\'agence n\'est ni destinataire ni en copie');
    if (e.marqueurs.indexOf('agence_en_copie') >= 0) {
      assert.ok(e.cc.some(estAgence), e.id + ' : copie attendue');
      assert.ok(!e.a.some(estAgence), e.id + ' : l\'agence ne doit pas être en destinataire');
    }
  });
  D.equipe.forEach(function (p) { assert.ok(/\.example$/.test(p.adresse)); });
  assert.ok(nb > 80, 'adresses vérifiées : ' + nb);
  assert.ok(/\.example$/.test(D.agence.adresse_boite));
});

test('fictivité : aucune marque courante, aucun mot exclu, aucune promesse de gain', function () {
  var interdits = /instagram|facebook|linkedin|google|wordpress|shopify|tiktok|youtube|canva|mailchimp|whatsapp|gmail|outlook|zoom|amazon|microsoft|apple|twitter|snapchat|pinterest|wix|paypal|actuar|cyber|stage\b|employeur/i;
  var promesses = /garanti[ts]?\b|\bx ?10\b|résultats? assurés?|gagnez|doubler|multiplier/i;
  EMAILS.forEach(function (e) {
    var t = texteComplet(e);
    var m = interdits.exec(t) || promesses.exec(t);
    assert.ok(!m, e.id + ' : terme interdit « ' + (m && m[0]) + ' »');
  });
  assert.ok(/fictive|fictif/i.test(D.agence.nom + D.avertissement));
});

test('dates : valides, dans la fenêtre de 4 semaines, avant la référence, ordre croissant', function () {
  assert.strictEqual(jourSemaine(REF), 5, 'la date de référence doit être un vendredi');
  var prec = '';
  EMAILS.forEach(function (e) {
    assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+02:00$/.test(e.date), e.id + ' format ' + e.date);
    assert.ok(!isNaN(ms(e.date)));
    assert.ok(ms(e.date) >= ms(D.dateDebut), e.id + ' avant le début');
    assert.ok(ms(e.date) < ms(REF), e.id + ' après la date de référence');
    assert.ok(e.date >= prec, e.id + ' hors ordre chronologique');
    prec = e.date;
  });
  var jours = U.joursOuvres(D.dateDebut, REF);
  assert.ok(jours >= 19 && jours <= 20, 'fenêtre en jours ouvrés : ' + jours);
  assert.ok(EMAILS.some(function (e) { return jourSemaine(e.date) === 6; }), 'aucun e-mail un samedi');
  assert.ok(EMAILS.some(function (e) { return jourSemaine(e.date) === 0; }), 'aucun e-mail un dimanche');
});

test('réponses : après réception, un jour ouvré, en heures de bureau, statut cohérent', function () {
  EMAILS.forEach(function (e) {
    var t = e.traitement;
    var avec = D.statutsAvecReponse.indexOf(t.statut) >= 0;
    assert.strictEqual(!!t.premiere_reponse, avec, e.id + ' : statut ' + t.statut + ' et première réponse incohérents');
    if (t.statut === 'a_traiter') assert.strictEqual(t.responsable, null, e.id + ' : demande non attribuée attendue');
    if (!t.premiere_reponse) return;
    assert.ok(ms(t.premiere_reponse) > ms(e.date), e.id + ' : réponse avant réception');
    assert.ok(ms(t.premiere_reponse) < ms(REF), e.id + ' : réponse après la date de référence');
    var j = jourSemaine(t.premiere_reponse);
    assert.ok(j >= 1 && j <= 5, e.id + ' : réponse un week-end');
    var h = t.premiere_reponse.slice(11, 16);
    assert.ok(h >= '08:30' && h <= '19:00', e.id + ' : réponse hors heures de bureau ' + h);
    assert.ok(t.responsable, e.id + ' : réponse sans responsable');
    assert.ok(U.joursOuvres(e.date, t.premiere_reponse) <= 2, e.id + ' : première réponse à plus de 2 jours ouvrés');
  });
});

test('fils : réponses après le message d\'origine, citations aux dates exactes, doublons identiques', function () {
  var nb = 0;
  EMAILS.forEach(function (e) {
    if (e.marqueurs.indexOf('reponse_fil') >= 0) assert.ok(e.en_reponse_a, e.id + ' : réponse sans parent');
    if (!e.en_reponse_a) return;
    var p = D.parId(e.en_reponse_a);
    assert.ok(ms(e.date) > ms(p.date), e.id + ' : réponse avant son parent');
    if (p.traitement.premiere_reponse) assert.ok(ms(e.date) > ms(p.traitement.premiere_reponse), e.id + ' : réponse du prospect avant celle de l\'agence');
    var q = /^Le (\d{1,2}) (\S+) (\d{4}) à (\d{2}):(\d{2}), (.+) a écrit :$/m.exec(e.corps);
    assert.ok(q, e.id + ' : en-tête de citation manquant');
    var attendu = p.traitement.premiere_reponse || p.date;
    assert.strictEqual(dateCitee(q[3], q[2], q[1], q[4], q[5]), attendu.slice(0, 16), e.id + ' : date citée différente de l\'historique');
    nb++;
  });
  assert.ok(nb >= 4, 'fils vérifiés : ' + nb);
  EMAILS.filter(function (e) { return e.doublon_de; }).forEach(function (e) {
    var o = D.parId(e.doublon_de);
    assert.strictEqual(e.corps, o.corps, e.id + ' : doublon au texte différent');
    assert.strictEqual(e.de.adresse, o.de.adresse);
    assert.ok(ms(e.date) > ms(o.date) && ms(e.date) - ms(o.date) < 3600000, e.id + ' : doublon trop éloigné');
    assert.strictEqual(e.traitement.statut, 'doublon');
  });
});

test('transferts : le message d\'origine transféré est présent et antérieur au transfert', function () {
  var tr = EMAILS.filter(function (e) { return e.marqueurs.indexOf('transfere') >= 0; });
  assert.ok(tr.length >= 2);
  tr.forEach(function (e) {
    assert.ok(/---------- Message transféré ----------/.test(e.corps), e.id);
    assert.ok(e.revue.indexOf('message_transfere') >= 0, e.id);
    var m = /Date : \S+ (\d{1,2}) (\S+) (\d{4}) à (\d{2}):(\d{2})/.exec(e.corps);
    assert.ok(m, e.id + ' : date du message transféré');
    assert.ok(dateCitee(m[3], m[2], m[1], m[4], m[5]) < e.date.slice(0, 16), e.id + ' : message transféré postérieur au transfert');
  });
});

test('catégories : cohérence avec le traitement attendu', function () {
  EMAILS.forEach(function (e) {
    if (['fournisseur', 'candidature', 'demarchage', 'indesirable'].indexOf(e.categorie) >= 0) {
      assert.strictEqual(e.traitement.statut, 'classe_sans_suite', e.id);
      assert.ok(!U.reponseAttendue(e), e.id);
      assert.strictEqual(e.releves.service.valeur, null, e.id + ' : pas de service pour un message hors demande');
    }
    if (e.categorie === 'hors_perimetre') {
      assert.strictEqual(e.releves.service.valeur, 'hors_catalogue', e.id);
      assert.ok(e.revue.indexOf('hors_perimetre') >= 0, e.id);
    }
    if (['nouvelle_demande', 'client_existant', 'relance_prospect'].indexOf(e.categorie) >= 0 && e.traitement.statut !== 'doublon') {
      assert.notStrictEqual(e.releves.besoin.statut, 'absent', e.id + ' : besoin absent dans une demande');
    }
  });
});

test('relances : au moins 5 demandes (fils) sans réponse au-delà de 2 jours ouvrés à la date de référence', function () {
  var retard = EMAILS.filter(function (e) { return U.sansReponseEnRetard(e, REF, 2); });
  var fils = {};
  retard.forEach(function (e) { fils[e.fil] = true; });
  assert.ok(cles(fils).length >= 5, 'fils en retard : ' + cles(fils).length);
  assert.strictEqual(D.parametres.delai_relance_jours_ouvres, 2);
  // Cas limites : reçu mercredi 21 octobre = 2 jours ouvrés (pas encore en retard) ; reçu mardi 20 = 3 jours ; samedi puis lundi = 1.
  assert.strictEqual(U.joursOuvres('2026-10-21T09:15:00+02:00', REF), 2);
  assert.strictEqual(U.joursOuvres('2026-10-20T08:05:00+02:00', REF), 3);
  assert.strictEqual(U.joursOuvres('2026-10-17T11:05:00+02:00', '2026-10-19T09:00:00+02:00'), 1);
  // Des demandes récentes sans réponse, encore dans le délai, alimentent la zone « à surveiller ».
  var recentes = EMAILS.filter(function (e) { return U.reponseAttendue(e) && !e.traitement.premiere_reponse && !U.sansReponseEnRetard(e, REF, 2); });
  assert.ok(recentes.length >= 3, 'demandes récentes sans réponse : ' + recentes.length);
  // Un brouillon prêt mais non envoyé, ou une demande en revue, reste « sans réponse ».
  assert.ok(retard.some(function (e) { return e.traitement.statut === 'brouillon_pret'; }));
  assert.ok(retard.some(function (e) { return e.traitement.statut === 'en_revue'; }));
});

test('équipe, agence et services : renseignés sans tarif inventé', function () {
  assert.ok(D.agence.effectif >= 3 && D.agence.effectif <= 15);
  assert.ok(D.agence.signature.indexOf('{prenom}') >= 0);
  D.services.forEach(function (s) {
    assert.ok(s.id && s.libelle && s.description && s.questions.length >= 3, s.id);
    assert.ok(!/\d\s?€|euros?/i.test(s.description + s.questions.join(' ')), s.id + ' : pas de tarif dans le catalogue');
  });
  var ids = D.equipe.map(function (p) { return p.id; });
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('déterminisme : deux chargements du module donnent les mêmes données', function () {
  var chemin = require.resolve('../js/data.js');
  var avant = JSON.stringify(D.emails);
  delete require.cache[chemin];
  var D2 = require('../js/data.js');
  assert.strictEqual(JSON.stringify(D2.emails), avant);
});
