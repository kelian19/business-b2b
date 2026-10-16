/* Contrastes WCAG AA calculés à partir des jetons de styles/tokens.css et des couleurs des pastilles (components.css) :
 * 4,5:1 pour le texte courant, 3:1 pour le texte large et les éléments d'interface (anneau de focus). */
'use strict';

var fs = require('fs');
var path = require('path');
var H = require('./harness');
var assert = H.assert;
var test = H.test;

var RACINE = path.join(__dirname, '..');
var TOKENS = fs.readFileSync(path.join(RACINE, 'styles/tokens.css'), 'utf8');

function jeton(nom) {
  var m = new RegExp('--' + nom + ':\\s*(#[0-9A-Fa-f]{6})').exec(TOKENS);
  assert.ok(m, 'jeton introuvable : ' + nom);
  return m[1];
}

function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum(hex) {
  var n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
function ratio(a, b) {
  var x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** Couleur semi-transparente (hex + alpha) posée sur un fond. */
function melange(fg, alpha, bg) {
  var f = parseInt(fg.slice(1), 16), b = parseInt(bg.slice(1), 16);
  function ch(s) { var cf = (f >> s) & 255, cb = (b >> s) & 255; return Math.round(cf * alpha + cb * (1 - alpha)); }
  var v = (ch(16) << 16) | (ch(8) << 8) | ch(0);
  return '#' + ('000000' + v.toString(16)).slice(-6);
}

var paper = jeton('paper'), night = jeton('night'), surface = jeton('surface'), orange = jeton('orange'), white = jeton('white');
var muted = jeton('muted'), alerte = jeton('alerte'), alerteFond = jeton('alerte-fond'), okFond = jeton('ok-fond'), ok = jeton('ok');
var verif = jeton('verif'), passage = jeton('passage'), passageActif = jeton('passage-actif'), night90 = jeton('night-90');
var orangeTint = melange(orange, 0.09, paper);
var night06 = melange(night, 0.06, paper);

var TEXTE = [
  ['encre sur crème', night, paper], ['encre sur surface', night, surface], ['encre sur blanc', night, white],
  ['texte discret sur crème', muted, paper], ['texte discret sur surface', muted, surface], ['texte discret sur blanc', muted, white], ['texte discret sur fond de survol', muted, night06],
  ['crème sur encre (en-tête, boutons, bulle)', paper, night], ['crème sur encre 90 % (survol des boutons)', paper, night90],
  ['bandeau : blanc sur orange', white, orange], ['pastille de retard : blanc sur orange', white, orange],
  ['lien orange au survol, sur crème', orange, paper], ['lien orange au survol, sur surface', orange, surface],
  ['rouge d\'alerte sur surface', alerte, surface], ['rouge d\'alerte sur fond d\'alerte', alerte, alerteFond], ['rouge d\'alerte sur crème', alerte, paper],
  ['blanc sur rouge d\'alerte (pastille du menu actif)', white, alerte],
  ['vert « ok » sur surface', ok, surface],
  ['encre sur passage relevé', night, passage], ['encre sur passage actif', night, passageActif], ['encre sur passage à vérifier', night, verif],
  ['texte de la pastille « à traiter » sur teinte orange', '#8A3412', orangeTint],
  ['catégorie nouvelle demande', '#14513F', '#E1EFE6'], ['catégorie client existant', '#124659', '#DCEBF1'], ['catégorie relance de prospect', '#8A3412', '#FBE6DA'],
  ['catégorie fournisseur', '#4B4A38', '#ECE8DB'], ['catégorie candidature', '#44306B', '#E9E2F2'], ['catégorie démarchage', '#6B4A0F', '#F3EAD0'],
  ['catégorie hors périmètre', '#8A3412', surface], ['catégorie indésirable', '#3B3B3B', '#E7E7E7'],
  ['statut perdu', '#5B2A2A', '#F3E3E3'], ['encre sur fond « relevé »', night, okFond], ['encre sur avertissement jaune', night, verif],
  ['texte du menu actif : encre sur crème', night, paper], ['texte du pied de page : crème sur encre', paper, night], ['nom de l\'agence dans l\'en-tête', '#D9E3DC', night],
  ['étape « personne » : blanc sur orange', white, orange]
];

TEXTE.forEach(function (c) {
  test('contraste AA du texte (4,5:1) : ' + c[0], function () {
    var r = ratio(c[1], c[2]);
    assert.ok(r >= 4.5, c[1] + ' sur ' + c[2] + ' : ' + r.toFixed(2) + ':1');
  });
});

test('contraste des éléments d\'interface (3:1) : anneau de focus orange sur crème, sur surface et sur blanc', function () {
  [paper, surface, white].forEach(function (f) { assert.ok(ratio(orange, f) >= 3, 'orange sur ' + f + ' : ' + ratio(orange, f).toFixed(2)); });
});

test('contraste des éléments d\'interface (3:1) : bordures d\'entrée et motifs de graphique', function () {
  assert.ok(ratio(night, surface) >= 3);
  assert.ok(ratio(night, alerteFond) >= 3, 'trait encre sur fond d\'alerte');
  assert.ok(ratio(alerte, alerteFond) >= 3, 'hachures rouges sur fond d\'alerte');
});

test('contraste : les jetons de charte restent ceux de la maquette (crème, encre, orange)', function () {
  assert.strictEqual(paper.toUpperCase(), '#F7F4EC');
  assert.strictEqual(night.toUpperCase(), '#193D36');
  assert.strictEqual(orange.toUpperCase(), '#BD481E');
});
