/* Tests de « Essayer avec un e-mail fictif » : relevé par règles simples (montants, dates, service, entreprise, contact),
 * cas pièges, information absente qui reste absente, passages exacts, brouillon correspondant, exemples. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var D = require('../js/data.js');
var E = require('../js/core/essai.js');
var Ctx = require('../js/core/contexte.js');

var CTX = Ctx.creer(D);
var REF = D.dateReference; // 23 octobre 2026

function rel(texte) { return E.relever(texte, CTX, REF); }
function budget(texte) { return rel(texte).champs.budget; }
function delai(texte) { return rel(texte).champs.delai; }

function budgetEgal(b, statut, attendu) {
  assert.strictEqual(b.statut, statut, 'statut ' + b.statut + ' ' + JSON.stringify(b.valeur));
  if (attendu === null) { assert.strictEqual(b.valeur, null); return; }
  ['min', 'max', 'type', 'periode'].forEach(function (k) {
    if (attendu[k] !== undefined) assert.strictEqual(b.valeur[k], attendu[k], k + ' : ' + JSON.stringify(b.valeur));
  });
}

/* ---------- Montants ---------- */

var MONTANTS = [
  // [nom, texte, statut, attendu]
  ['montant exact « 5 000 € »', 'Notre budget est de 5 000 € pour ce projet.', 'releve', { min: 5000, max: 5000, type: 'exact' }],
  ['« 5000€ » collé', 'Budget 5000€ ferme.', 'releve', { min: 5000, max: 5000, type: 'exact' }],
  ['« 5k€ »', 'On prévoit 5k€ pour le logo.', 'releve', { min: 5000, max: 5000, type: 'exact' }],
  ['« 2,5 k€ » avec virgule', 'Un budget de 2,5 k€ nous paraît raisonnable.', 'releve', { min: 2500, max: 2500 }],
  ['séparateur de milliers par un point « 5.000 euros »', 'Nous avons 5.000 euros à y consacrer.', 'releve', { min: 5000, max: 5000 }],
  ['décimales « 1 500,50 € »', 'Le budget est de 1 500,50 € pour le tout.', 'releve', { min: 1500.5, max: 1500.5 }],
  ['fourchette « entre 3 et 5 k€ » : l\'unité s\'applique aux deux nombres', 'Notre budget se situe entre 3 et 5 k€.', 'releve', { min: 3000, max: 5000, type: 'fourchette' }],
  ['fourchette « entre 3 000 et 5 000 euros »', 'Nous avons entre 3 000 et 5 000 euros.', 'releve', { min: 3000, max: 5000, type: 'fourchette' }],
  ['fourchette avec tiret « 3-5 k€ »', 'Budget 3-5 k€ selon le périmètre.', 'releve', { min: 3000, max: 5000, type: 'fourchette' }],
  ['« à partir de 2000 euros »', 'Nous partons à partir de 2000 euros.', 'releve', { min: 2000, max: null, type: 'a_partir_de' }],
  ['« plus de 10 000 € » est un « à partir de »', 'Il faut compter plus de 10 000 € pour ce projet.', 'releve', { min: 10000, max: null, type: 'a_partir_de' }],
  ['plafond « jusqu\'à 4 500 € »', 'Nous irons jusqu\'à 4 500 € au maximum.', 'releve', { min: null, max: 4500, type: 'plafond' }],
  ['plafond « 1 800 € maximum »', 'Prévoyez 1 800 € maximum.', 'releve', { min: null, max: 1800, type: 'plafond' }],
  ['plafond mensuel « ne pas dépasser 500 € par mois »', 'Nous ne pouvons pas dépasser 500 € par mois.', 'releve', { min: null, max: 500, type: 'plafond', periode: 'mensuel' }],
  ['approximatif « environ 6 k€ »', 'Nous pensons à environ 6 k€ au total.', 'releve', { min: 6000, max: 6000, type: 'approximatif' }],
  ['période annuelle « 5 000 € HT par an »', 'Budget de 5 000 € HT par an.', 'releve', { min: 5000, max: 5000, periode: 'annuel' }],
  ['même montant répété : pas d\'ambiguïté', 'Le budget est de 5 000 €, soit bien 5 000 € comme convenu.', 'releve', { min: 5000, max: 5000 }],
  ['ancien coût exclu, budget actuel retenu', 'Notre ancien site nous a coûté 2 000 €, nous prévoyons 5 000 € cette fois.', 'releve', { min: 5000, max: 5000 }],
  ['formulation incertaine : « peut-être 5 000 € »', 'Nous pourrions peut-être aller à 5 000 €.', 'a_verifier', { min: 5000, type: 'incertain' }],
  ['deux montants différents : à vérifier, aucune valeur choisie', 'Budget : 5 000 € ou 3 000 €.', 'a_verifier', null],
  ['« 2 500 € par mois, soit 7 500 € au total » : deux bases, à vérifier', 'Prévoir 2 500 € par mois, soit 7 500 € au total.', 'a_verifier', null],
  ['premier nombre sans unité « entre 3 et 5 000 € » : à vérifier', 'Nous avons entre 3 et 5 000 € pour cela.', 'a_verifier', { min: 3000, max: 5000, type: 'fourchette' }],
  ['devise autre que l\'euro : à vérifier, pas de valeur', 'Nous avons 5 000 $ de budget.', 'a_verifier', null],
  ['nombre nu après « budget » : devise non indiquée, à vérifier', 'Notre budget de 5000 est limité.', 'a_verifier', { min: 5000, max: 5000 }],
  ['« 5k » sans « budget » (abonnés) : absent', 'Notre compte compte déjà 5k abonnés.', 'absent', null],
  ['chiffre d\'affaires exclu : absent', 'Notre chiffre d\'affaires est de 2 M€ par an.', 'absent', null],
  ['effectif et téléphone ne sont pas des montants : absent', 'Nous sommes 12 salariés, appelez-nous au 01 23 45 67 89.', 'absent', null],
  ['rien d\'écrit sur le budget : absent', 'Nous aimerions un site pour notre boutique.', 'absent', null],
  ['nombre collé à l\'année « En 2026 5 000 € » : le montant est 5 000', 'En 2026 5 000 € sont prévus.', 'releve', { min: 5000, max: 5000 }]
];

MONTANTS.forEach(function (c) {
  test('montant : ' + c[0], function () {
    var b = budget(c[1]);
    budgetEgal(b, c[2], c[3]);
    if (b.statut === 'absent') assert.ok(b.valeur === null && b.passage === null, 'absent : ni valeur ni passage');
    else assert.ok(c[1].indexOf(b.passage) >= 0, 'passage exact : ' + b.passage);
  });
});

test('montant : le passage inclut les mots qui précisent le type (« à partir de », « environ », période)', function () {
  assert.ok(/à partir de 2000 euros/.test(budget('Nous partons à partir de 2000 euros.').passage));
  assert.ok(/environ 6 k€/.test(budget('Nous pensons à environ 6 k€ au total.').passage));
  assert.ok(/500 € par mois/.test(budget('Nous ne pouvons pas dépasser 500 € par mois.').passage));
});

/* ---------- Dates et délais ---------- */

var DELAIS = [
  // [nom, texte, statut, precision, date]
  ['date complète « pour le 15/12/2026 »', 'Mise en ligne pour le 15/12/2026.', 'releve', 'precise', '2026-12-15'],
  ['date sur deux chiffres d\'année « avant le 15/11/26 »', 'Il nous la faut avant le 15/11/26.', 'releve', 'precise', '2026-11-15'],
  ['date en lettres « avant le 15 novembre » : année de la date de référence', 'Merci de livrer avant le 15 novembre.', 'releve', 'precise', '2026-11-15'],
  ['« pour le 1er décembre 2026 »', 'Nous visons pour le 1er décembre 2026.', 'releve', 'precise', '2026-12-01'],
  ['« jj/mm » avec préposition « pour le 20/11 »', 'Livraison pour le 20/11 si possible.', 'releve', 'precise', '2026-11-20'],
  ['tirets avec année « 15-11-2026 »', 'Échéance le 15-11-2026.', 'releve', 'precise', '2026-11-15'],
  ['date ISO « 2026-11-15 »', 'Date souhaitée : 2026-11-15.', 'releve', 'precise', '2026-11-15'],
  ['« fin janvier » : vague, aucune date inventée', 'Nous aimerions un lancement fin janvier.', 'releve', 'vague', null],
  ['« début mars 2027 » : vague', 'Ouverture début mars 2027.', 'releve', 'vague', null],
  ['« mi-novembre » : vague', 'Plutôt mi-novembre.', 'releve', 'vague', null],
  ['« au plus vite » : vague', 'Nous voulons cela au plus vite.', 'releve', 'vague', null],
  ['« dans 3 semaines » : vague, sans calcul de date', 'Il nous le faut dans 3 semaines.', 'releve', 'vague', null],
  ['« d\'ici la fin du mois » : vague', 'Nous aimerions avancer d\'ici la fin du mois.', 'releve', 'vague', null],
  ['« vendredi prochain » : ambigu, à vérifier, aucune date', 'Il faudrait que ce soit prêt avant vendredi prochain.', 'a_verifier', 'vague', null],
  ['deux dates différentes : à vérifier', 'Réunion le 12/11 ou le 19/11/2026 selon vos disponibilités, mise en ligne le 05/12/2026.', 'a_verifier', null, null],
  ['période « du 12 au 15 novembre » : pas une date unique', 'Nous serons disponibles du 12 au 15 novembre.', 'a_verifier', 'vague', null],
  ['date déjà passée à la date de référence : à vérifier', 'C\'était prévu pour le 15 septembre.', 'a_verifier', 'vague', null],
  ['date impossible « 31/02/2026 » : à vérifier', 'Livraison pour le 31/02/2026.', 'a_verifier', 'vague', null],
  ['« disponible 24/7 » n\'est pas une date : absent', 'Notre service est disponible 24/7 pour vos clients.', 'absent', null, null],
  ['fraction « pour 3/4 des clients » : absent', 'Le site servira pour 3/4 des clients.', 'absent', null, null],
  ['numéro de téléphone avec points : absent', 'Appelez-moi au 01.23.45.67.89 quand vous voulez.', 'absent', null, null],
  ['date dans un en-tête transféré ignorée : absent', 'Bonjour,\n\nEnvoyé : lundi 26 octobre 2026\nObjet : logo\n\nMerci.', 'absent', null, null],
  ['« mais » n\'est pas « mai » : absent', 'Nous voulons un site mais nous hésitons.', 'absent', null, null],
  ['rien d\'écrit sur le délai : absent', 'Nous cherchons un logo pour notre cabinet.', 'absent', null, null]
];

DELAIS.forEach(function (c) {
  test('délai : ' + c[0], function () {
    var d = delai(c[1]);
    assert.strictEqual(d.statut, c[2], 'statut ' + d.statut + ' ' + JSON.stringify(d.valeur) + ' | ' + d.passage);
    if (c[2] === 'absent') { assert.ok(d.valeur === null && d.passage === null); return; }
    assert.ok(c[1].indexOf(d.passage) >= 0, 'passage exact : ' + d.passage);
    if (c[3]) assert.strictEqual(d.valeur.precision, c[3]);
    if (c[3] === 'precise') assert.strictEqual(d.valeur.date, c[4]);
    if (c[3] === 'vague') assert.strictEqual(d.valeur.date, null, 'aucune date inventée');
    if (c[2] === 'a_verifier') assert.ok(rel(c[1]).revue.indexOf('delai_ambigu') >= 0, 'raison de revue');
  });
});

test('délai : jamais de date déduite de l\'horloge (même résultat avec une autre date de référence)', function () {
  var t = 'Merci de livrer avant le 15 novembre.';
  assert.strictEqual(E.relever(t, CTX, '2027-02-01T10:00:00+01:00').champs.delai.valeur.date, '2027-11-15');
  assert.strictEqual(E.relever(t, CTX, REF).champs.delai.valeur.date, '2026-11-15');
});

/* ---------- Service, besoin, entreprise, contact ---------- */

test('service : un mot du catalogue donne le service, un autre sujet reste absent', function () {
  var s = rel('Bonjour, nous voulons un logo pour notre cabinet.').champs.service;
  assert.strictEqual(s.statut, 'releve');
  assert.strictEqual(s.valeur, 'identite');
  assert.strictEqual(rel('Bonjour, nous voulons échanger avec vous.').champs.service.statut, 'absent');
  assert.strictEqual(rel('Nous voulons une newsletter mensuelle.').champs.service.valeur, 'newsletter');
  assert.strictEqual(rel('Nous cherchons un stand pour le salon de mars.').champs.service.valeur, 'evenementiel');
});

test('service : hors catalogue (impression, traduction) donne une raison de revue « hors périmètre »', function () {
  var r = rel('Bonjour, nous cherchons une imprimerie pour nos flyers.');
  assert.strictEqual(r.champs.service.valeur, 'hors_catalogue');
  assert.ok(r.revue.indexOf('hors_perimetre') >= 0);
  assert.strictEqual(E.versEmail(r, CTX, REF).categorie, 'hors_perimetre');
});

test('service : plusieurs services ou négation maladroite passent en revue, sans choix de l\'outil', function () {
  var a = rel('Nous voulons refaire notre site internet et améliorer notre référencement.');
  assert.strictEqual(a.champs.service.statut, 'a_verifier');
  assert.strictEqual(a.champs.service.valeur, null);
  assert.ok(a.revue.indexOf('plusieurs_services') >= 0);
  var b = rel('Nous n\'avons pas besoin d\'un site web mais d\'un logo.');
  assert.strictEqual(b.champs.service.statut, 'a_verifier', 'les règles simples ne comprennent pas la négation : la personne tranche');
});

test('besoin : la phrase de demande est reprise telle quelle, sans salutation ; sans demande claire il reste absent', function () {
  var b = rel('Bonjour, nous aurions besoin d\'un logo pour notre cabinet. Merci.').champs.besoin;
  assert.strictEqual(b.statut, 'releve');
  assert.strictEqual(b.passage, 'nous aurions besoin d\'un logo pour notre cabinet.');
  assert.strictEqual(rel('Merci de votre retour.').champs.besoin.statut, 'absent');
});

test('entreprise : trouvée dans la phrase ou la signature, jamais l\'agence elle-même', function () {
  assert.strictEqual(rel('Nous sommes la Boulangerie Dupré, quatre boutiques.').champs.entreprise.valeur, 'Boulangerie Dupré');
  assert.strictEqual(rel('Bonjour,\nje voudrais un logo.\n\nCordialement,\nMarc Aubin\nGérant, Menuiserie Aubin').champs.entreprise.valeur, 'Menuiserie Aubin');
  assert.strictEqual(rel('Bonjour Agence Exemple Fictive, nous voulons un logo. Merci.').champs.entreprise.statut, 'absent');
  assert.strictEqual(rel('Bonjour, nous voulons un logo.').champs.entreprise.statut, 'absent');
});

test('contact : nom de la signature, adresse et téléphone ; une adresse sans nom reste à vérifier', function () {
  var c = rel('Bonjour, je voudrais un logo.\n\nCordialement,\nMarion Lambert\nmarion@patisserie-lambert.example\n06 12 34 56 78').champs.contact;
  assert.strictEqual(c.statut, 'releve');
  assert.strictEqual(c.valeur.nom, 'Marion Lambert');
  assert.strictEqual(c.valeur.email, 'marion@patisserie-lambert.example');
  assert.strictEqual(c.valeur.telephone, '06 12 34 56 78');
  var d = rel('Bonjour, je voudrais un logo. Écrivez-moi à x.y@exemple-asso.example merci.').champs.contact;
  assert.strictEqual(d.statut, 'a_verifier');
  assert.strictEqual(d.valeur.nom, null);
  assert.strictEqual(rel('Bonjour, je voudrais un logo.').champs.contact.statut, 'absent');
  assert.strictEqual(rel('Bonjour, je voudrais un logo.\ncontact@agence-exemple-fictive.example').champs.contact.statut, 'absent', 'l\'adresse de l\'agence n\'est pas un contact');
});

/* ---------- Revue, absence, alertes ---------- */

test('revue : urgence, appel, pièce jointe, transfert et relance donnent leur raison', function () {
  var r = rel('URGENT. Rappelez-moi, le cahier des charges est en pièce jointe. Je me permets de relancer ma demande.\n--- Message transféré ---\nBonjour');
  ['urgence', 'demande_appel', 'piece_jointe_non_lue', 'message_transfere', 'relance_prospect'].forEach(function (x) { assert.ok(r.revue.indexOf(x) >= 0, x); });
  assert.ok(r.enRevue);
});

test('absence : un texte sans information laisse les six champs absents, sans valeur ni passage', function () {
  var r = rel('Bonjour, merci pour votre retour. À bientôt.');
  E.CHAMPS.forEach(function (c) {
    var f = r.champs[c];
    assert.strictEqual(f.statut, 'absent', c);
    assert.ok(f.valeur === null && f.passage === null, c);
  });
  assert.strictEqual(r.nbAbsents + r.nbReleves + r.nbAVerifier, 6);
});

test('texte vide ou espaces : relevé vide, aucun champ', function () {
  [ '', '   \n  ', null, undefined ].forEach(function (t) {
    var r = rel(t);
    assert.ok(r.vide);
    assert.strictEqual(r.nbAbsents, 6);
  });
});

test('texte très long : tronqué à la limite et signalé', function () {
  var r = rel(new Array(1000).join('Bonjour nous voulons un logo. ') );
  assert.ok(r.tropLong);
  assert.strictEqual(r.texte.length, E.LONGUEUR_MAX);
  assert.ok(r.revue.indexOf('texte_confus') >= 0);
});

test('alerte : adresse ou numéro qui semblent réels sont signalés (texte fictif uniquement)', function () {
  assert.strictEqual(rel('Écrivez à jean@gmail.com ou au 04 56 78 90 12.').alertes.length, 2);
  assert.strictEqual(rel('Écrivez à jean@exemple.example ou au 01 23 45 67 89.').alertes.length, 0);
});

test('relevé : déterministe et sans effet de bord (même texte, même résultat, texte d\'origine inchangé)', function () {
  var t = E.EXEMPLES[2].texte;
  var copie = t.slice();
  assert.deepStrictEqual(rel(t), rel(t));
  assert.strictEqual(t, copie);
});

/* ---------- Exemples et brouillon ---------- */

test('exemples : trois exemples fictifs, domaines .example, passages exacts, champs absents sans valeur', function () {
  assert.strictEqual(E.EXEMPLES.length, 3);
  E.EXEMPLES.forEach(function (x) {
    var r = rel(x.texte);
    assert.ok(!r.vide);
    assert.deepStrictEqual(r.alertes, [], x.id);
    (x.texte.match(/[\w.+-]+@[\w.-]+/g) || []).forEach(function (a) { assert.ok(/\.example$/.test(a), a); });
    E.CHAMPS.forEach(function (c) {
      var f = r.champs[c];
      if (f.statut === 'absent') assert.ok(f.valeur === null && f.passage === null);
      else assert.ok(x.texte.indexOf(f.passage) >= 0, x.id + ' ' + c + ' : ' + f.passage);
    });
  });
});

test('exemple « complet » : budget, délai et service relevés, rien à vérifier', function () {
  var r = rel(E.EXEMPLES[0].texte);
  assert.strictEqual(r.nbReleves, 6);
  assert.strictEqual(r.champs.budget.valeur.type, 'fourchette');
  assert.strictEqual(r.champs.delai.valeur.date, '2026-12-15');
  assert.deepStrictEqual(r.revue, []);
  assert.ok(!r.enRevue);
});

test('exemple « très court » : budget et délai absents', function () {
  var r = rel(E.EXEMPLES[1].texte);
  assert.strictEqual(r.champs.budget.statut, 'absent');
  assert.strictEqual(r.champs.delai.statut, 'absent');
  assert.strictEqual(r.champs.service.valeur, 'identite');
});

test('exemple « piégé » : budget, délai et service à vérifier, raisons de revue en clair', function () {
  var r = rel(E.EXEMPLES[2].texte);
  assert.strictEqual(r.champs.budget.statut, 'a_verifier');
  assert.strictEqual(r.champs.delai.statut, 'a_verifier');
  assert.strictEqual(r.champs.service.statut, 'a_verifier');
  ['budget_ambigu', 'delai_ambigu', 'plusieurs_services', 'urgence', 'demande_appel', 'piece_jointe_non_lue'].forEach(function (x) {
    assert.ok(r.revue.indexOf(x) >= 0, x);
    assert.ok(D.raisonsRevue[x], 'libellé en clair pour ' + x);
  });
  assert.ok(r.enRevue);
});

test('brouillon : l\'exemple très court demande le budget et le délai absents, signe au nom de l\'agence, ne promet rien', function () {
  var r = rel(E.EXEMPLES[1].texte);
  var b = E.brouillon(r, CTX, REF).brouillon;
  assert.ok(b.applicable);
  assert.ok(/enveloppe budgétaire/.test(b.texte), 'question sur le budget');
  assert.ok(/Pour quand souhaitez-vous/.test(b.texte), 'question sur le délai');
  assert.ok(/Agence Exemple Fictive/.test(b.texte), 'signature');
  assert.ok(!/(garanti|promettons|sous \d+ jours|tarif de|prix de|nous vous offrons)/i.test(b.texte), 'aucune promesse');
  assert.ok(b.texte.indexOf('Paul Martin') >= 0, 'salutation au nom relevé');
});

test('brouillon : cas piégé, les informations à vérifier donnent des questions, le texte collé n\'est pas modifié', function () {
  var x = E.EXEMPLES[2];
  var r = rel(x.texte);
  var b = E.brouillon(r, CTX, REF).brouillon;
  assert.ok(b.applicable && b.questions.length >= 3);
  assert.ok(/pouvez-vous nous confirmer le montant/.test(b.texte), 'le budget ambigu est reposé');
  assert.strictEqual(r.texte, x.texte.replace(/\r\n?/g, '\n'));
});

test('brouillon : une demande hors catalogue reçoit la réponse « hors périmètre » du catalogue', function () {
  var r = rel('Bonjour, nous cherchons une imprimerie pour nos flyers.\n\nCordialement,\nLéa Moreau');
  var b = E.brouillon(r, CTX, REF).brouillon;
  assert.ok(b.horsPerimetre);
  assert.ok(/ne proposons pas|ne propose pas/.test(b.texte));
});

test('essai : le module ne lit jamais l\'horloge ni le réseau', function () {
  var src = require('fs').readFileSync(require('path').join(__dirname, '../js/core/essai.js'), 'utf8');
  assert.ok(!/Date\.now|new Date\(\s*\)|performance\.now|fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/.test(src));
});
