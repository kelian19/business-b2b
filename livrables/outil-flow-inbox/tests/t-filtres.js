/* Tests de la boîte de réception : filtres et compteurs, recherche, tri, extraits, passages surlignés. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var D = require('../js/data.js');
var Dem = require('../js/core/demandes.js');
var Fmt = require('../js/core/format.js');
var P = require('../js/core/passages.js');

var TOUS = D.emails;
var OPTS = { ref: D.dateReference, categories: D.categories, statuts: D.statutsTraitement };

function ids(l) { return l.map(function (e) { return e.id; }); }

test('filtres : les six filtres existent et leurs compteurs sont calculés à partir des données', function () {
  assert.deepStrictEqual(Dem.FILTRES.map(function (f) { return f.id; }), ['a_traiter', 'qualifiees', 'en_revue', 'hors_perimetre', 'ignorees', 'toutes']);
  var n = Dem.compteurs(TOUS);
  assert.strictEqual(n.toutes, TOUS.length);
  assert.strictEqual(n.a_traiter, TOUS.filter(function (e) { return e.traitement.statut === 'a_traiter'; }).length);
  assert.strictEqual(n.a_traiter, 10, 'situation de la conception : 10 demandes à traiter');
  assert.strictEqual(n.en_revue, 1);
  assert.strictEqual(n.hors_perimetre, 3);
  assert.strictEqual(n.ignorees, 7, '6 messages classés + 1 doublon');
  assert.strictEqual(n.qualifiees, 36);
  Dem.FILTRES.forEach(function (f) { assert.strictEqual(Dem.filtrer(TOUS, f.id).length, n[f.id], f.id); });
  assert.strictEqual(Dem.filtrer(TOUS, 'inconnu').length, TOUS.length, 'un filtre inconnu retombe sur « Toutes »');
});

test('filtres : « Qualifiées » exclut revue, doublons, classés et hors périmètre', function () {
  Dem.filtrer(TOUS, 'qualifiees').forEach(function (e) {
    assert.ok(Dem.CATEGORIES_DEMANDE.indexOf(e.categorie) >= 0, e.id);
    assert.ok(['en_revue', 'doublon', 'classe_sans_suite'].indexOf(e.traitement.statut) < 0, e.id);
  });
});

test('compteurs : ils suivent les actions de la session (revue, ignoré) sans modifier les données', function () {
  var apres = Dem.appliquerEtat(TOUS, { m19: { statut: 'en_revue' }, m47: { statut: 'classe_sans_suite' } });
  var n = Dem.compteurs(apres);
  assert.strictEqual(n.a_traiter, 8);
  assert.strictEqual(n.en_revue, 2);
  assert.strictEqual(n.ignorees, 8);
  assert.strictEqual(n.toutes, 47);
  assert.strictEqual(TOUS.filter(function (e) { return e.traitement.statut === 'en_revue'; }).length, 1, 'les données d\'origine ne changent pas');
  assert.strictEqual(Dem.appliquerEtat(TOUS, { m19: { responsable: 'camille' } })[18].traitement.responsable, 'camille');
});

test('recherche : insensible à la casse et aux accents, tous les mots requis', function () {
  assert.ok(ids(Dem.rechercher(TOUS, 'boulangerie')).indexOf('m01') >= 0);
  assert.deepStrictEqual(ids(Dem.rechercher(TOUS, 'BOULANGERIE')), ids(Dem.rechercher(TOUS, 'boulangerie')));
  assert.deepStrictEqual(ids(Dem.rechercher(TOUS, 'hotel glycines')), ids(Dem.rechercher(TOUS, 'Hôtel Glycines')));
  assert.ok(ids(Dem.rechercher(TOUS, 'hotel glycines')).indexOf('m19') >= 0);
  assert.strictEqual(Dem.rechercher(TOUS, '').length, TOUS.length);
  assert.strictEqual(Dem.rechercher(TOUS, '   ').length, TOUS.length);
  assert.strictEqual(Dem.rechercher(TOUS, 'xyzintrouvable').length, 0);
  var a = ids(Dem.rechercher(TOUS, 'site')), ab = ids(Dem.rechercher(TOUS, 'site budget'));
  assert.ok(ab.length <= a.length && ab.every(function (i) { return a.indexOf(i) >= 0; }));
  assert.ok(ids(Dem.rechercher(TOUS, 'contact@brasserie-trois-cuves.example')).indexOf('m03') >= 0);
});

test('tri : par date, expéditeur, objet, catégorie, statut, ancienneté ; stable et dans les deux sens', function () {
  var parDate = Dem.trier(TOUS, 'date', 'desc', OPTS);
  assert.strictEqual(parDate[0].id, 'm47');
  assert.strictEqual(parDate[parDate.length - 1].id, 'm01');
  assert.deepStrictEqual(ids(Dem.trier(TOUS, 'date', 'asc', OPTS)), ids(parDate).slice().reverse());
  Object.keys(Dem.CLES_TRI).forEach(function (cle) {
    var asc = Dem.trier(TOUS, cle, 'asc', OPTS);
    assert.strictEqual(asc.length, TOUS.length, cle);
    assert.strictEqual(new Set(ids(asc)).size, TOUS.length, cle + ' : aucun doublon');
    assert.deepStrictEqual(ids(Dem.trier(TOUS, cle, 'asc', OPTS)), ids(asc), cle + ' : déterministe');
  });
  var exp = Dem.trier(TOUS, 'expediteur', 'asc', OPTS).map(function (e) { return Fmt.norm(e.de.nom); });
  for (var i = 1; i < exp.length; i++) assert.ok(exp[i - 1] <= exp[i], 'expéditeurs non triés : ' + exp[i - 1] + ' > ' + exp[i]);
  var anc = Dem.trier(TOUS, 'anciennete', 'desc', OPTS).map(function (e) { return Dem.anciennete(e, D.dateReference); });
  for (var j = 1; j < anc.length; j++) assert.ok(anc[j - 1] >= anc[j], 'ancienneté non décroissante');
  var cat = Dem.trier(TOUS, 'categorie', 'asc', OPTS).map(function (e) { return Fmt.norm(D.categories[e.categorie]); });
  for (var k = 1; k < cat.length; k++) assert.ok(cat[k - 1] <= cat[k]);
  var st = Dem.trier(TOUS, 'statut', 'desc', OPTS).map(function (e) { return Fmt.norm(D.statutsTraitement[e.traitement.statut]); });
  for (var s = 1; s < st.length; s++) assert.ok(st[s - 1] >= st[s]);
  assert.strictEqual(TOUS[0].id, 'm01', 'le tri ne modifie pas le tableau d\'origine');
});

test('extrait : sans salutation ni citation, coupé proprement', function () {
  var x = Fmt.extrait(D.parId('m01').corps, 100);
  assert.ok(x.length <= 101 && !/^Bonjour/.test(x), x);
  D.emails.forEach(function (e) { assert.ok(!/^>/.test(Fmt.extrait(e.corps, 200)), e.id); });
});

test('passages : chaque passage relevé est retrouvé dans le corps, hors citations, et le découpage recompose le texte', function () {
  var total = 0;
  TOUS.forEach(function (e) {
    var ivs = P.intervalles(e);
    var attendus = D.champs.filter(function (c) { return e.releves[c].statut !== 'absent'; });
    assert.strictEqual(ivs.length, attendus.length, e.id + ' : un champ relevé n\'a pas de passage retrouvé');
    ivs.forEach(function (iv) {
      assert.strictEqual(e.corps.slice(iv.debut, iv.fin), e.releves[iv.champ].passage, e.id + '.' + iv.champ);
      total++;
    });
    var recompose = P.segmenter(e.corps, ivs).map(function (l) { return l.segments.map(function (s) { return s.texte; }).join(''); }).join('\n');
    assert.strictEqual(recompose, e.corps, e.id + ' : le découpage doit recomposer le corps');
    D.champs.filter(function (c) { return e.releves[c].statut === 'absent'; }).forEach(function (c) {
      assert.ok(!ivs.some(function (iv) { return iv.champ === c; }), e.id + '.' + c);
    });
  });
  assert.ok(total > 150, 'passages : ' + total);
});

test('format : budgets avec leur type conservé, délais sans date inventée', function () {
  assert.strictEqual(Fmt.budgetCellule(D.parId('m02').releves.budget), 'Non indiqué');
  assert.strictEqual(Fmt.budgetCellule(D.parId('m01').releves.budget).replace(/\s/g, ' '), '3 000 à 4 000 € · fourchette');
  assert.ok(/à vérifier/.test(Fmt.budgetCellule(D.parId('m27').releves.budget)), 'budget flou : à vérifier');
  D.emails.forEach(function (e) {
    var b = e.releves.budget;
    if (b.valeur) assert.ok(Fmt.budgetCellule(b).indexOf(Fmt.budgetType(b.valeur).toLowerCase()) >= 0, e.id + ' : type absent');
    var d = e.releves.delai;
    if (d.valeur && d.valeur.precision === 'vague') assert.ok(/vague/.test(Fmt.delaiCellule(d)) && !/\d{2}\/\d{2}\/\d{4}/.test(Fmt.delaiCellule(d)), e.id);
  });
});
