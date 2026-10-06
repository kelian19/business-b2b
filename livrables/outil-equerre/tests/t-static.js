/* Garde-fous statiques (A1 applicable à la passe) : 100 % local, pas de réseau, pas de HTML construit depuis une saisie,
 * noyau pur, faits réglementaires limités, mots interdits, palette, contrastes, structure ARIA de la coque. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;
var fs = H.fs;
var path = H.path;

var FICHIERS = H.fichiersApp();
var CORE = FICHIERS.filter(function (f) { return /^js\/core\//.test(f); });
var VUES = FICHIERS.filter(function (f) { return /^js\/views\//.test(f); });
var JS = FICHIERS.filter(function (f) { return /\.js$/.test(f); });
var CSS = FICHIERS.filter(function (f) { return /\.css$/.test(f); });

function sansCommentaires(t) { return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1'); }

test('statique : la liste des fichiers de l\'application est complète', function () {
  assert.ok(FICHIERS.indexOf('index.html') >= 0);
  assert.ok(CORE.length >= 12, 'modules core : ' + CORE.length);
  assert.ok(CSS.length >= 6);
  assert.ok(FICHIERS.indexOf('js/app.js') >= 0);
});

test('statique : aucun appel réseau, module ES, import ou CSS distant dans aucun fichier', function () {
  FICHIERS.forEach(function (f) {
    var t = H.lire(f);
    assert.ok(!/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|\bimport\s*\(|navigator\.serviceWorker/.test(t), f + ' : appel réseau');
    assert.ok(!/^\s*import\s[^\n]*\sfrom\s/m.test(t), f + ' : import ES');
    assert.ok(!/@import/.test(t), f + ' : @import');
    assert.ok(!/(src|href|action)\s*=\s*["']https?:/i.test(t), f + ' : ressource distante');
    assert.ok(!/url\(\s*["']?https?:/i.test(t), f + ' : CSS distant');
    assert.ok(!/type\s*=\s*["']module["']/.test(t), f + ' : type=module');
  });
});

test('statique : la seule chaîne http tolérée est l\'espace de noms SVG', function () {
  FICHIERS.forEach(function (f) {
    var t = H.lire(f);
    var m = t.match(/https?:\/\/[^\s"'`)<>]+/g) || [];
    m.forEach(function (u) { assert.strictEqual(u, 'http://www.w3.org/2000/svg', f + ' : ' + u); });
  });
});

test('statique : jamais de HTML construit (innerHTML, outerHTML, insertAdjacentHTML, document.write, eval, new Function, setAttribute on…)', function () {
  JS.concat(['index.html']).forEach(function (f) {
    var t = sansCommentaires(H.lire(f));
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new\s+Function|setAttribute\(\s*['"]on/i.test(t), f);
  });
  // aucun écouteur en ligne dans le HTML
  assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(H.lire('index.html')), 'attribut on… dans index.html');
});

test('statique : stockage local uniquement dans prefs.js, chaque accès dans un try', function () {
  JS.forEach(function (f) {
    var lignes = H.lire(f).split('\n');
    lignes.forEach(function (l, i) {
      if (!/localStorage|sessionStorage|indexedDB/.test(l) || /^\s*(\/\*|\*|\/\/)/.test(l)) return;
      assert.strictEqual(f, 'js/ui/prefs.js', f + ' ligne ' + (i + 1) + ' : stockage hors prefs.js');
      var avant = lignes.slice(Math.max(0, i - 4), i + 1).join('\n');
      assert.ok(/\btry\s*\{/.test(avant), f + ' ligne ' + (i + 1) + ' : accès sans try');
    });
  });
});

test('statique : le noyau (js/core) ne touche ni au DOM, ni à la fenêtre, ni au stockage, ni à l\'horloge implicite', function () {
  CORE.forEach(function (f) {
    var t = H.lire(f);
    assert.ok(!/\b(document|window|localStorage|sessionStorage|navigator)\b/.test(t), f + ' : accès au navigateur');
    assert.ok(!/Date\.now|new Date\(\s*\)|Math\.random/.test(t), f + ' : horloge ou hasard implicite');
  });
  var fa = H.lire('js/core/logic.js');
  assert.ok(/module\.exports/.test(fa));
  CORE.forEach(function (f) {
    if (f === 'js/core/namespace.js') return;
    assert.ok(/module\.exports/.test(H.lire(f)), f + ' : format UMD attendu');
  });
});

test('statique : l\'interface (ui, views) ne contient aucune règle métier chiffrée (seuils, 50 €, 15 000 €, poids)', function () {
  FICHIERS.filter(function (f) { return /^js\/(ui|views)\//.test(f) || f === 'js/app.js'; }).forEach(function (f) {
    var t = sansCommentaires(H.lire(f));
    assert.ok(!/15\s?000|\b15000\b|AMENDE|0\.4\b.*0\.3|SEUIL_|POIDS_INDICE\s*=/.test(t), f);
    assert.ok(!/2026-09-01|2027-09-01/.test(t), f + ' : date réglementaire hors constants.js');
  });
});

test('statique : les vues n\'écrivent jamais dans l\'état du Store (mutations par commit seulement)', function () {
  VUES.concat(['js/app.js']).forEach(function (f) {
    var t = sansCommentaires(H.lire(f));
    assert.ok(!/\.state(\.[\w$]+|\[[^\]]+\])*\s*(=(?!=)|\+\+|--|\+=|-=)/.test(t) || f === 'js/app.js', f + ' : écriture directe dans state');
    assert.ok(!/\.state\.session\.(dossier|rev|cache|sale)[\w.\[\]']*\s*=(?!=)/.test(t), f + ' : écriture dans session');
    assert.ok(!/\.donnees\.[a-z]+\s*=(?!=)/.test(t), f + ' : écriture dans les données du dossier');
  });
});

test('statique : faits réglementaires limités (dates autorisées, aucune autre obligation ou sanction nommée)', function () {
  var ISO_OK = ['2026-09-01', '2027-09-01'];
  var FR_OK = ['01/09/2026', '01/09/2027'];
  var MOIS = 'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
  FICHIERS.concat(['README.md', 'GUIDE-LIVRAISON.md', 'script-demo.md'].filter(function (f) { return fs.existsSync(path.join(H.RACINE, f)); })).forEach(function (f) {
    if (f === 'js/data.js') return;
    var t = H.lire(f);
    (t.match(/\b\d{4}-\d{2}-\d{2}\b/g) || []).forEach(function (d) { assert.ok(ISO_OK.indexOf(d) >= 0 || /\.md$/.test(f), f + ' : date ' + d); });
    (t.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) || []).forEach(function (d) { assert.ok(FR_OK.indexOf(d) >= 0 || /\.md$/.test(f), f + ' : date ' + d); });
    var re = new RegExp('(\\d{1,2}(?:er)?)\\s+(' + MOIS + ')\\s+(\\d{4})', 'gi');
    var m;
    while ((m = re.exec(t))) {
      var texte = (m[1] + ' ' + m[2] + ' ' + m[3]).toLowerCase();
      assert.ok(['1er septembre 2026', '1er septembre 2027'].indexOf(texte) >= 0 || /\.md$/.test(f), f + ' : date « ' + texte + ' »');
    }
  });
});

test('statique : mots et notions interdits absents (autres obligations, noms de plateformes, actuariat, cyber, employeur, prix)', function () {
  var interdit = /e-reporting|annuaire|factur-x|\bUBL\b|\bCII\b|chorus|\bPDP\b|plateforme de dématérialisation partenaire|actuari|cyber|employeur|\bstage\b|\bk[eé]lian\b|\btarifs?\b|\bgarantie\b/i;
  FICHIERS.concat(['README.md', 'GUIDE-LIVRAISON.md', 'script-demo.md'].filter(function (f) { return fs.existsSync(path.join(H.RACINE, f)); })).forEach(function (f) {
    var t = H.lire(f);
    var m = interdit.exec(t);
    assert.ok(!m || /\.md$/.test(f), f + ' contient : ' + (m && m[0]));
    var prix = /\bprix\b(?!\s*unitaire|_unitaire)/i.exec(t);
    assert.ok(!prix || /\.md$/.test(f), f + ' : mot « prix »');
  });
});

test('statique : toute estimation est étiquetée et la mention de conseil fiscal est présente', function () {
  var tout = FICHIERS.map(function (f) { return H.lire(f); }).join('\n');
  assert.ok(/ne constitue pas un conseil fiscal/.test(tout));
  assert.ok(/estimation/.test(tout));
  assert.ok(/Données fictives de démonstration/.test(tout));
  assert.ok(/Dossier client : données confidentielles, traitées uniquement dans ce navigateur/.test(tout));
  assert.ok(/Ce fichier contient des données de votre client : conservez-le dans un espace protégé et supprimez-le quand il n'est plus utile\./.test(tout.replace(/\\'/g, '\'')));
});

test('statique : index.html (coque) : scripts relatifs existants dans le bon ordre, pas de module, CSP locale, langue', function () {
  var html = H.lire('index.html');
  assert.ok(/<html lang="fr">/.test(html));
  assert.ok(/Content-Security-Policy[^>]*connect-src 'none'/.test(html));
  var srcs = (html.match(/<script[^>]*\ssrc="([^"]+)"/g) || []).map(function (s) { return /src="([^"]+)"/.exec(s)[1]; });
  assert.ok(srcs.length >= 20);
  srcs.forEach(function (s) {
    assert.ok(!/^(\/|[a-z]+:)/i.test(s), 'chemin non relatif : ' + s);
    assert.ok(fs.existsSync(path.join(H.RACINE, s)), 'script introuvable : ' + s);
  });
  var ordre = function (p) { return srcs.indexOf(p); };
  assert.ok(ordre('js/core/namespace.js') === 0);
  assert.ok(ordre('js/core/logic.js') < ordre('js/data.js'));
  assert.ok(ordre('js/data.js') < ordre('js/ui/ui.js'));
  assert.ok(ordre('js/ui/store.js') < ordre('js/ui/derived.js'));
  assert.ok(ordre('js/ui/import-wizard.js') < ordre('js/views/view-tiers.js'));
  assert.strictEqual(srcs[srcs.length - 1], 'js/app.js');
  (html.match(/<link[^>]*href="([^"]+)"/g) || []).forEach(function (l) {
    var h = /href="([^"]+)"/.exec(l)[1];
    if (/^data:/.test(h)) return;
    assert.ok(fs.existsSync(path.join(H.RACINE, h)), 'feuille introuvable : ' + h);
  });
  // chaque fichier JS de l'application est chargé
  JS.forEach(function (f) { assert.ok(srcs.indexOf(f) >= 0, f + ' non chargé par index.html'); });
});

test('statique : coque ARIA (tablist, 5 onglets, 5 panneaux liés, lien d\'évitement, région live, icônes du sprite)', function () {
  var html = H.lire('index.html');
  assert.ok(/role="tablist"/.test(html));
  var tabs = html.match(/role="tab"[^>]*>/g) || [];
  assert.strictEqual(tabs.length, 5);
  assert.strictEqual((html.match(/aria-selected="true"/g) || []).length, 1);
  assert.strictEqual((html.match(/tabindex="0"/g) || []).length >= 1, true);
  ['dashboard', 'tiers', 'mentions', 'reporting', 'report'].forEach(function (id) {
    assert.ok(new RegExp('id="tab-' + id + '"[^>]*aria-controls="panel-' + id + '"').test(html), 'onglet ' + id);
    assert.ok(new RegExp('role="tabpanel" id="panel-' + id + '" aria-labelledby="tab-' + id + '"').test(html), 'panneau ' + id);
  });
  assert.ok(/<a class="skip"[^>]*>Aller au contenu<\/a>/.test(html));
  assert.ok(/aria-live="polite"/.test(html));
  ['horloge', 'jauge', 'bouclier', 'alerte', 'croix-cercle', 'check-cercle', 'document', 'tableau', 'calendrier', 'euro', 'fleche', 'imprimante',
    'ecran', 'clavier', 'aide', 'upload', 'filtre', 'fermer', 'dossier', 'telecharger', 'corbeille', 'info', 'plus', 'crayon', 'historique', 'utilisateurs'].forEach(function (n) {
    assert.ok(html.indexOf('id="ic-' + n + '"') >= 0, 'icône ' + n);
  });
  assert.strictEqual((html.match(/<h1[ >]/g) || []).length, 1);
  assert.ok(/id="banner"[^>]*role="status"/.test(html));
});

/* ---------- Palette et contrastes ---------- */

function jetons() {
  var css = H.lire('styles/tokens.css');
  var map = {};
  var re = /--([a-z0-9-]+):\s*([^;]+);/g;
  var m;
  while ((m = re.exec(css))) map[m[1]] = m[2].trim();
  return map;
}

function luminance(hex) {
  var h = hex.replace('#', '');
  var v = [0, 2, 4].map(function (i) {
    var c = parseInt(h.substr(i, 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contraste(a, b) {
  var la = luminance(a);
  var lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

test('palette : couleurs de la charte exactes dans tokens.css', function () {
  var j = jetons();
  assert.strictEqual(j.paper.toUpperCase(), '#E9E5D8');
  assert.strictEqual(j.night.toUpperCase(), '#0F1E3D');
  assert.strictEqual(j.ink.toUpperCase(), '#111111');
  assert.strictEqual(j.red.toUpperCase(), '#C8200E');
  ['--sp-1', '--sp-2', '--sp-3', '--sp-4', '--sp-6', '--sp-8', '--sp-12', '--r-1', '--r-2', '--r-3', '--sh1', '--sh2', '--grid-max', '--serif', '--sans'].forEach(function (k) {
    assert.ok(j[k.slice(2)] !== undefined, k);
  });
  assert.strictEqual(j['grid-max'], '1320px');
  assert.strictEqual(j['r-1'] + j['r-2'] + j['r-3'], '6px10px14px');
});

test('palette : aucune couleur hors charte et dérivés dans les feuilles de style', function () {
  var ok = ['#E9E5D8', '#0F1E3D', '#111111', '#111', '#C8200E', '#FFFFFF', '#FFF', '#000', '#000000', '#F6F3EA', '#FBF9F3', '#1F3158', '#3F4552'];
  var rgbaOk = [[15, 30, 61], [200, 32, 14], [17, 17, 17], [233, 229, 216], [255, 255, 255]];
  CSS.forEach(function (f) {
    var t = H.lire(f);
    (t.match(/#[0-9a-fA-F]{3,8}\b/g) || []).forEach(function (c) { assert.ok(ok.indexOf(c.toUpperCase()) >= 0 || ok.indexOf(c) >= 0, f + ' : ' + c); });
    var re = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/g;
    var m;
    while ((m = re.exec(t))) {
      assert.ok(rgbaOk.some(function (c) { return c[0] === +m[1] && c[1] === +m[2] && c[2] === +m[3]; }), f + ' : rgba(' + m[1] + ',' + m[2] + ',' + m[3] + ')');
    }
  });
});

test('contrastes : texte ≥ 4,5:1 et composants ≥ 3:1 pour ink/surface, muted/surface, night/paper, paper/night, white/red, red/surface', function () {
  var j = jetons();
  var couples = [['ink', 'surface'], ['muted', 'surface'], ['night', 'paper'], ['paper', 'night'], ['white', 'red'], ['red', 'surface'],
    ['ink', 'paper'], ['night', 'surface'], ['red', 'paper'], ['muted', 'paper'], ['paper', 'night-90']];
  couples.forEach(function (c) {
    var a = j[c[0]];
    var b = j[c[1]];
    assert.ok(/^#/.test(a) && /^#/.test(b), c.join('/'));
    var r = contraste(a, b);
    assert.ok(r >= 4.5, c.join('/') + ' : ' + r.toFixed(2));
  });
  assert.ok(contraste(j.night, j.surface) >= 3);
});

test('mouvement réduit : feuilles de style et script désactivent transitions et animations', function () {
  var base = H.lire('styles/base.css');
  assert.ok(/prefers-reduced-motion:\s*reduce[\s\S]*transition:\s*none\s*!important[\s\S]*animation:\s*none\s*!important/.test(base));
  assert.ok(/matchMedia\([^)]*prefers-reduced-motion/.test(H.lire('js/ui/ui.js')));
  assert.ok(/font-variant-numeric:\s*tabular-nums lining-nums/.test(H.lire('styles/views.css')));
  var tokens = H.lire('styles/tokens.css');
  assert.ok(/min-width: 1280px\) \{ html \{ font-size: 112\.5%/.test(tokens));
  assert.ok(/min-width: 1700px\) \{ html \{ font-size: 125%/.test(tokens));
});
