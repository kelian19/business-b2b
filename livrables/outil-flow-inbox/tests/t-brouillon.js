/* Tests du brouillon généré par règles : aucune information inventée, une question par champ manquant, signature, ton, catalogue. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var D = require('../js/data.js');
var Ctx = require('../js/core/contexte.js');
var Br = require('../js/core/brouillon.js');
var Dem = require('../js/core/demandes.js');

function ctx() { return Ctx.creer(D); }
function brouillon(id, c, opts) {
  var o = opts || {};
  o.emails = D.emails;
  return Br.construire(D.parId(id), c || ctx(), o);
}
function sansEspaces(s) { return String(s).replace(/\s/g, ''); }
function aDeSignature(texte, c, resp) { return texte.indexOf(Br.signature(c, resp)) >= 0 && texte.slice(-Br.signature(c, resp).length) === Br.signature(c, resp); }

test('brouillon m02 : demande le budget et le délai absents, reprend le service, se termine par la signature de l\'agence', function () {
  var c = ctx();
  var b = brouillon('m02', c);
  assert.ok(b.applicable);
  var champs = b.questions.map(function (q) { return q.champ; });
  assert.deepStrictEqual(champs.sort(), ['budget', 'delai']);
  assert.ok(/enveloppe budgétaire/.test(b.texte) && /échéance/.test(b.texte));
  assert.ok(/identité visuelle/i.test(b.texte), 'le service demandé est repris');
  assert.ok(aDeSignature(b.texte, c, 'mathis'), 'le texte se termine par la signature');
  assert.ok(/Agence Exemple Fictive/.test(b.texte) && /Mathis Bellanger/.test(b.texte));
  assert.ok(b.texte.indexOf('Bonjour Paul Martin,') === 0);
  assert.strictEqual(b.objet, 'Re : logo');
});

test('brouillon : une question exactement pour chaque budget ou délai manquant, au moins une pour chaque autre champ manquant ou à vérifier', function () {
  var c = ctx();
  var index = {};
  D.emails.forEach(function (e) { index[e.id] = e; });
  var n = 0;
  D.emails.forEach(function (e) {
    var b = Br.construire(e, c, { emails: D.emails });
    if (!b.applicable || b.horsPerimetre) return;
    D.champs.forEach(function (champ) {
      var eff = Br.releveEffectif(e, champ, index).releve;
      var qs = b.questions.filter(function (q) { return q.champ === champ; });
      if (eff.statut === 'releve') assert.strictEqual(qs.length, 0, e.id + '.' + champ + ' : champ relevé redemandé');
      else {
        assert.ok(qs.length >= 1, e.id + '.' + champ + ' : aucune question pour un champ ' + eff.statut);
        if (champ === 'budget' || champ === 'delai') assert.strictEqual(qs.length, 1, e.id + '.' + champ);
        n++;
      }
    });
  });
  assert.ok(n > 20, 'champs manquants vérifiés : ' + n);
});

test('brouillon : une réponse dans un fil reprend les champs du message précédent au lieu de les redemander', function () {
  var b = brouillon('m45');
  assert.ok(b.questions.every(function (q) { return q.champ !== 'service'; }), 'le service du fil est connu');
  assert.ok(/boutique en ligne|création et refonte de site web/i.test(b.texte));
});

test('brouillon : aucune information inventée (tout chiffre vient du message, de la date de réception ou de la signature)', function () {
  var c = ctx();
  var nb = 0;
  D.emails.forEach(function (e) {
    var b = Br.construire(e, c, { emails: D.emails });
    if (!b.applicable) return;
    var sig = Br.signature(c, b.responsable);
    var corps = b.texte.slice(0, b.texte.lastIndexOf(sig));
    var autorise = sansEspaces(e.corps + ' ' + e.objet + ' ' + e.pieces_jointes.join(' ') + ' ' +
      require('../js/core/dates.js').fmtDate(e.date) + ' ' + JSON.stringify(e.releves));
    // Dans le fil, les valeurs reprises du message parent sont aussi autorisées.
    var p = e.en_reponse_a ? D.parId(e.en_reponse_a) : null;
    if (p) autorise += sansEspaces(p.corps + JSON.stringify(p.releves));
    (corps.match(/\d[\d\s  .,/]*\d|\d/g) || []).forEach(function (nombre) {
      var n = sansEspaces(nombre).replace(/[.,/]+$/, '');
      assert.ok(autorise.indexOf(n) >= 0, e.id + ' : nombre « ' + nombre + ' » absent du message');
      nb++;
    });
  });
  assert.ok(nb > 20, 'nombres vérifiés : ' + nb);
});

test('brouillon : aucune promesse de prix, de délai ni de résultat', function () {
  var c = ctx();
  var interdit = /garanti|\bsous \d|\bdans \d+ (jour|heure|semaine)|résultats? (assuré|garanti)|nous vous (livrerons|enverrons)|tarif|devis|gratuit|sans engagement/i;
  ['chaleureux', 'sobre'].forEach(function (ton) {
    c.agence.ton = ton;
    D.emails.forEach(function (e) {
      var b = Br.construire(e, c, { emails: D.emails });
      if (!b.applicable) return;
      // Le rappel « Besoin : ... » reprend les mots du prospect ; seul le texte de l'agence est contrôlé.
      var t = b.texte.split('\n').filter(function (l) { return !/^- Besoin :/.test(l); }).join('\n');
      assert.ok(!interdit.test(t), e.id + ' (' + ton + ') : promesse « ' + (interdit.exec(t) || [''])[0] + ' »');
    });
  });
});

test('brouillon : hors périmètre sans question, catégories sans réponse attendue sans brouillon, doublon sans brouillon', function () {
  var h = brouillon('m34');
  assert.ok(h.applicable && h.horsPerimetre && h.questions.length === 0);
  assert.ok(/ne propose pas/.test(h.texte));
  ['m05', 'm07', 'm09', 'm18'].forEach(function (id) { assert.ok(!brouillon(id).applicable, id); });
  assert.ok(!brouillon('m29').applicable, 'doublon');
});

test('brouillon : cas particuliers (agence en copie, transfert, appel, pièce jointe) donnent une question en clair', function () {
  assert.ok(/prenne en charge/.test(brouillon('m36').texte));
  assert.ok(/mis en copie/.test(brouillon('m36').texte) && brouillon('m36').destinataire.adresse === 'thomas.leroy@maison-leroy.example');
  assert.ok(/transmise par/.test(brouillon('m17').texte));
  assert.ok(/rappelé/.test(brouillon('m24').texte));
  assert.ok(/pièce jointe/.test(brouillon('m26').texte));
  assert.ok(/caractère urgent/.test(brouillon('m03').texte));
  assert.ok(/excuses pour l'attente/.test(brouillon('m32').texte));
});

test('brouillon : le catalogue, le ton et la signature modifiés se retrouvent dans le texte', function () {
  var c = ctx();
  var avant = brouillon('m04', c).texte;
  // m04 : besoin à vérifier, service web : les questions types du service web sont posées.
  assert.ok(avant.indexOf(c.services[0].questions[0]) >= 0);
  c.services[0].questions[0] = 'Question modifiée du catalogue ?';
  var apres = brouillon('m04', c).texte;
  assert.ok(apres.indexOf('Question modifiée du catalogue ?') >= 0 && apres.indexOf(D.services[0].questions[0]) < 0);
  assert.strictEqual(D.services[0].questions[0].indexOf('modifiée'), -1, 'les données d\'origine ne changent pas');
  // Ton
  c.agence.ton = 'sobre';
  assert.ok(/Nous accusons réception/.test(brouillon('m02', c).texte));
  c.agence.ton = 'chaleureux';
  assert.ok(/Merci pour votre message du 28\/09\/2026/.test(brouillon('m02', c).texte));
  // Signature et responsable
  c.agence.signature = 'À bientôt,\n{prenom} ({role})';
  var t = brouillon('m02', c).texte;
  assert.ok(/À bientôt,\nMathis \(Chargé de clientèle\)$/.test(t), t.slice(-60));
  c.parametres.responsable_par_defaut = 'ines';
  assert.ok(/Inès \(Cheffe de projet web\)$/.test(brouillon('m19', c).texte), 'demande non attribuée : responsable par défaut');
});

test('brouillon : option « questions types du service » ajoute les questions du catalogue', function () {
  var c = ctx();
  var sans = brouillon('m02', c);
  var avec = brouillon('m02', c, { questionsService: true });
  assert.ok(avec.questions.length === sans.questions.length + 3);
  assert.ok(avec.texte.indexOf(D.services.filter(function (s) { return s.id === 'identite'; })[0].questions[0]) >= 0);
});

test('relance : texte avec excuses pour le retard, mêmes règles, jamais envoyé', function () {
  var c = ctx();
  var rel = Dem.relances(D.emails, D.dateReference, 2);
  assert.strictEqual(rel.enRetard.length, 6);
  rel.enRetard.concat(rel.aSurveiller).forEach(function (it) {
    var r = Br.relance(it, c, D.emails);
    assert.ok(r.applicable, it.fil);
    assert.ok(/excuser/.test(r.texte), it.fil + ' : excuses attendues');
    assert.ok(r.texte.indexOf('Cordialement') >= 0);
    assert.ok(!/envoy[ée]/i.test(r.texte), it.fil + ' : le texte ne parle pas d\'envoi');
  });
  var hotel = rel.enRetard.filter(function (i) { return i.sansReponse.length === 2; })[0];
  assert.ok(hotel && /Vos messages du 07\/10\/2026 et du 14\/10\/2026/.test(Br.relance(hotel, c, D.emails).texte));
  assert.ok(/jamais envoyé/.test(Br.MENTION));
});
