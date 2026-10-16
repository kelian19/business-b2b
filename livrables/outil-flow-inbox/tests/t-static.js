/* Contrôles statiques de l'application : 100 % locale, aucun réseau, scripts classiques, aucun bouton d'envoi, textes sans employeur. */
'use strict';

var fs = require('fs');
var path = require('path');
var H = require('./harness');
var assert = H.assert;
var test = H.test;

var RACINE = path.join(__dirname, '..');

function lire(rel) { return fs.readFileSync(path.join(RACINE, rel), 'utf8'); }
function listerFichiers(dir, ext) {
  var res = [];
  fs.readdirSync(path.join(RACINE, dir)).forEach(function (f) {
    var rel = dir + '/' + f;
    if (fs.statSync(path.join(RACINE, rel)).isDirectory()) res = res.concat(listerFichiers(rel, ext));
    else if (ext.test(f)) res.push(rel);
  });
  return res;
}

var JS = listerFichiers('js', /\.js$/);
var CSS = listerFichiers('styles', /\.css$/);
var HTML = lire('index.html');

test('index.html : chaque script et feuille de style référencé existe, chemins relatifs, ordre sans modules ES', function () {
  var refs = [];
  HTML.replace(/<script src="([^"]+)"/g, function (m, s) { refs.push(s); return m; });
  HTML.replace(/<link rel="stylesheet" href="([^"]+)"/g, function (m, s) { refs.push(s); return m; });
  assert.ok(refs.length >= 15, 'ressources : ' + refs.length);
  refs.forEach(function (r) {
    assert.ok(!/^(https?:)?\/\//.test(r) && r.charAt(0) !== '/', 'chemin non relatif : ' + r);
    assert.ok(fs.existsSync(path.join(RACINE, r)), 'fichier manquant : ' + r);
  });
  assert.ok(!/type="module"/.test(HTML), 'aucun module ES');
  // Tous les scripts du dossier js/ sont chargés par la page.
  JS.forEach(function (f) { assert.ok(refs.indexOf(f) >= 0, 'script non référencé : ' + f); });
  CSS.forEach(function (f) { assert.ok(refs.indexOf(f) >= 0, 'feuille non référencée : ' + f); });
  assert.ok(/Content-Security-Policy/.test(HTML) && /connect-src 'none'/.test(HTML), 'politique de sécurité restrictive');
});

test('aucune requête réseau, aucune URL externe, aucune police distante', function () {
  var interdit = /\bfetch\s*\(|XMLHttpRequest|\bWebSocket\b|sendBeacon|EventSource|importScripts|\bimport\s*\(|@import|@font-face|\bnavigator\.serviceWorker/;
  JS.concat(CSS).forEach(function (f) {
    var src = lire(f);
    var m = interdit.exec(src);
    assert.ok(!m, f + ' : « ' + (m && m[0]) + ' »');
  });
  JS.concat(CSS, ['index.html']).forEach(function (f) {
    var src = lire(f).replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
    var m = /https?:\/\/[^\s'")]+/.exec(src);
    assert.ok(!m, f + ' : URL externe ' + (m && m[0]));
  });
  assert.ok(!/<link[^>]+href="https?:/.test(HTML) && !/<script[^>]+src="https?:/.test(HTML) && !/<img/i.test(HTML));
});

test('scripts classiques : aucun import/export ES, tous les fichiers en mode strict', function () {
  JS.forEach(function (f) {
    var src = lire(f);
    assert.ok(!/^\s*(import|export)\s/m.test(src), f + ' : syntaxe de module');
    assert.ok(/'use strict'/.test(src), f + ' : mode strict manquant');
  });
});

test('aucun bouton, lien ni action d\'envoi ; la mention de brouillon est présente', function () {
  var vues = listerFichiers('js/views', /\.js$/).concat(listerFichiers('js/ui', /\.js$/), ['index.html']);
  vues.forEach(function (f) {
    var src = lire(f);
    // Libellés passés à bouton() / textes de boutons et de liens.
    (src.match(/bouton\(\s*'([^']*)'/g) || []).forEach(function (b) {
      assert.ok(!/envoy|poster|publier|expédi/i.test(b), f + ' : libellé de bouton d\'envoi ' + b);
    });
    (src.match(/h\('(button|a)'[^\n]*text: '([^']*)'/g) || []).forEach(function (b) {
      assert.ok(!/envoyer|envoyez/i.test(b), f + ' : ' + b);
    });
    assert.ok(!/type:\s*'submit'|<form\b/i.test(src), f + ' : formulaire');
  });
  assert.ok(/Brouillon : jamais envoyé automatiquement\. Copiez le texte dans votre messagerie\./.test(lire('js/core/brouillon.js')));
  assert.ok(/mentionBrouillon/.test(lire('js/views/view-brouillon.js')));
  assert.ok(/Démonstration : données fictives ; extraction préparée pour la démo ; rien n'est envoyé/.test(HTML));
});

test('textes : pas d\'employeur, de stage, d\'actuariat ni de cyber-risque, aucun prix d\'offre ni promesse de gain', function () {
  var tout = JS.concat(CSS, ['index.html']).map(function (f) { return f === 'js/data.js' ? '' : lire(f); }).join('\n');
  assert.ok(!/employeur|\bstage\b|stagiaire|actuari|cyber/i.test(tout), 'terme exclu : ' + (/employeur|\bstage\b|stagiaire|actuari|cyber/i.exec(tout) || [''])[0]);
  assert.ok(!/\b790\b|\b149\b|abonnement|forfait|tarif de l'agence/i.test(tout), 'prix d\'offre');
  assert.ok(!/gain de temps|gagnez|économis|x ?10\b|\d+ ?% de (gain|temps)|conversion|retour sur investissement/i.test(tout), 'promesse de gain');
});

test('accessibilité : langue, repère principal, région vivante, mouvement réduit, focus visible', function () {
  assert.ok(/<html lang="fr">/.test(HTML));
  assert.ok(/<main[^>]*id="contenu"/.test(HTML) && /class="skip"/.test(HTML));
  assert.ok(/aria-live="polite"/.test(HTML));
  var css = CSS.map(lire).join('\n');
  assert.ok(/prefers-reduced-motion: reduce/.test(css));
  assert.ok(/:focus-visible/.test(css));
  // Aucune taille de police inférieure à 12 px (0,75 rem à 16 px).
  (css.match(/font-size:\s*[\d.]+(rem|px)/g) || []).forEach(function (d) {
    var v = parseFloat(/[\d.]+/.exec(d)[0]);
    var px = /rem/.test(d) ? v * 16 : v;
    assert.ok(px >= 12, 'taille trop petite : ' + d);
  });
});
