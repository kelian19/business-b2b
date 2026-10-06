/* Tests statiques de la passe P4 : impression A4 du rapport, mode présentation, raccourcis, aide, glossaire, mode cabinet, accessibilité de la coque. */
'use strict';

var H = require('./harness');
var assert = H.assert;
var test = H.test;

function sansCommentaires(t) { return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1'); }

test('impression : @page A4 avec les marges prévues, couleurs exactes, une page par feuille', function () {
  var css = H.lire('styles/print.css');
  assert.ok(/@page\s*\{[^}]*size:\s*A4;[^}]*margin:\s*16mm 14mm 20mm/.test(css));
  assert.ok(/print-color-adjust:\s*exact/.test(css));
  assert.ok(/break-after:\s*page/.test(css));
  assert.ok(/#parcours > \[role="tabpanel"\]:not\(#panel-report\)\s*\{\s*display:\s*none/.test(css));
  assert.ok(/#panel-report\[hidden\][^{]*\{\s*display:\s*block/.test(css) || /#panel-report\[hidden\]/.test(css));
  assert.ok(/\.no-print/.test(css) && /dialog/.test(css));
});

test('impression : l\'aperçu à l\'écran est une feuille A4 de 210 mm', function () {
  var css = H.lire('styles/report.css');
  assert.ok(/\.feuille\s*\{[^}]*width:\s*210mm/.test(css));
  assert.ok(/box-shadow/.test(css));
  assert.ok(/thead\s*\{\s*display:\s*table-header-group/.test(css));
  assert.ok(/break-inside:\s*avoid/.test(css));
});

test('impression : print.css est chargé pour l\'impression seulement et report.css pour tous les médias', function () {
  var html = H.lire('index.html');
  assert.ok(/<link rel="stylesheet" href="styles\/print\.css" media="print">/.test(html));
  assert.ok(/<link rel="stylesheet" href="styles\/report\.css">/.test(html));
});

test('rapport : textContent seulement, titre, mentions imposées et toutes les sections', function () {
  var t = H.lire('js/views/view-report.js');
  assert.ok(/Synthèse de direction/.test(t) && /5 actions prioritaires/.test(t) && /Annexes/.test(t));
  assert.ok(/A\. Corrections et anomalies du fichier tiers/.test(t) && /B\. Modèles de factures/.test(t) && /C\. Organisation/.test(t) && /D\. Trésorerie/.test(t));
  assert.ok(/window\.print|root\.print/.test(t));
  assert.ok(/maxlength:\s*String\(L\.CONST\.MAX_NOM\)/.test(t));
  assert.ok(/Imprimer \/ enregistrer en PDF/.test(t));
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML/.test(t));
});

test('rapport : aucun texte de bouton ni de commande dans les feuilles imprimées', function () {
  var t = sansCommentaires(H.lire('js/views/view-report.js'));
  var feuilles = t.slice(t.indexOf('function couverture'), t.indexOf('function render'));
  assert.ok(!/Mode présentation|Charger |Imprimer/.test(feuilles));
  assert.ok(!/Annexe/.test(t.slice(t.indexOf('function couverture'), t.indexOf('function synthese'))), 'pas de mot « Annexe » avant les annexes');
  assert.ok(!/Annexe/.test(t.slice(t.indexOf('function synthese'), t.indexOf('function planAction'))));
});

test('présentation : classe body.presentation, polices +12 %, éléments secondaires masqués, pastille', function () {
  var css = H.lire('styles/presentation.css');
  assert.ok(/body\.presentation \.secondary/.test(css) && /display:\s*none\s*!important/.test(css));
  assert.ok(/html\.is-presentation\s*\{\s*font-size:\s*112%/.test(css));
  assert.ok(/\.kpi/.test(css) && /\.cdr-n/.test(css));
  var app = H.lire('js/app.js');
  assert.ok(/classList\.toggle\('presentation'/.test(app));
  assert.ok(/requestFullscreen/.test(app) && /try\s*\{[^}]*requestFullscreen/.test(app));
  assert.ok(/4000/.test(app));
  var html = H.lire('index.html');
  assert.ok(/Mode présentation — Échap pour quitter/.test(html));
  assert.ok(/id="pastille"[^>]*role="status"/.test(html));
  assert.ok(/Évitez de charger un fichier réel pendant un partage d'écran\./.test(html));
});

test('raccourcis : jamais dans un champ, ni avec Ctrl, Alt ou Méta ; désactivables ; 1 à 5, flèches, F, P, ?, Échap', function () {
  var app = sansCommentaires(H.lire('js/app.js'));
  assert.ok(/ctrlKey \|\| e\.altKey \|\| e\.metaKey/.test(app));
  assert.ok(/dansChamp\(e\.target\)/.test(app));
  assert.ok(/Prefs\.get\('raccourcis'\)/.test(app));
  ['ArrowRight', 'ArrowLeft', "k === 'f'", "k === 'p'", "k === '?'", "'Escape'"].forEach(function (k) { assert.ok(app.indexOf(k) >= 0, k); });
  var aide = H.lire('js/ui/aide.js');
  ['1 à 5', '← →', 'F', 'P', '?', 'Échap'].forEach(function (k) { assert.ok(aide.indexOf("touche: '" + k + "'") >= 0, k); });
  var help = H.lire('js/views/view-help.js');
  assert.ok(/Activer les raccourcis clavier/.test(help));
});

test('aide : dialogue natif <dialog>, retour du focus sur le bouton Aide', function () {
  var d = H.lire('js/ui/dialog.js');
  assert.ok(/h\('dialog'/.test(d) && /showModal/.test(d));
  assert.ok(/retourFocus: U\.\$\('btn-aide'\)/.test(H.lire('js/views/view-help.js')));
});

test('aide contextuelle : boutons « ? » sur indice, exposition, plan, import et corrections, panneaux non modaux', function () {
  var a = H.lire('js/ui/aide.js');
  ['indice', 'exposition', 'plan', 'import', 'corrections'].forEach(function (k) { assert.ok(new RegExp('\\b' + k + ': \\{\\s*titre').test(a), k); });
  assert.ok(/aria-expanded/.test(a) && /aria-controls/.test(a) && /role: 'region'/.test(a));
  assert.ok(/aide\.bouton\('corrections'\)/.test(H.lire('js/views/view-tiers.js')));
  assert.ok(/aide\.bouton\('import'\)/.test(H.lire('js/ui/import-wizard.js')));
  var d = H.lire('js/views/view-dashboard.js');
  ['indice', 'exposition', 'plan'].forEach(function (k) { assert.ok(d.indexOf("'" + k + "');") >= 0, k); });
});

test('glossaire : SIREN, SIRET, TVA intracommunautaire, plateforme agréée, mentions obligatoires ; aucune autre obligation', function () {
  var a = H.lire('js/ui/aide.js');
  ['SIREN', 'SIRET', 'TVA intracommunautaire', 'Plateforme agréée', 'Mentions obligatoires'].forEach(function (k) { assert.ok(a.indexOf("terme: '" + k + "'") >= 0, k); });
  var g = a.slice(a.indexOf('var GLOSSAIRE'), a.indexOf('/** Bouton'));
  assert.ok(!/e-reporting|annuaire|Factur-X|UBL|Chorus|PDP|\bOD\b/i.test(g));
  (g.match(/(\d{1,2}(?:er)? (?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) \d{4})/g) || []).forEach(function (d) {
    assert.ok(d === '1er septembre 2026' || d === '1er septembre 2027', d);
  });
  assert.ok(/ne constitue pas un conseil fiscal/.test(H.lire('js/ui/ui.js')) && /mentionConseil/.test(H.lire('js/views/view-help.js')));
});

test('visite guidée : 4 étapes, sautable, état dans les préférences', function () {
  var t = H.lire('js/views/view-help.js');
  var etapes = t.slice(t.indexOf('var ETAPES_VISITE'), t.indexOf('];', t.indexOf('var ETAPES_VISITE')));
  assert.strictEqual((etapes.match(/titre:/g) || []).length, 4);
  assert.ok(/Passer la visite/.test(t) && /Prefs\.set\('accueilVu', true\)/.test(t));
  assert.ok(/accueilVu/.test(H.lire('js/ui/prefs.js')));
});

test('cabinet : tri par colonne avec aria-sort, filtre, export CSV, plafonds, avertissement permanent, état vide', function () {
  var t = H.lire('js/views/view-cabinet.js');
  assert.ok(/aria-sort/.test(t) && /portefeuilleToCsv/.test(t) && /verifierPlafonds/.test(t) && /MESSAGE_CONFIDENTIALITE/.test(t));
  assert.ok(/Aucun dossier dans le portefeuille/.test(t) && /Effacer toutes les données de cette session/.test(t));
  assert.ok(/multiple: true/.test(t));
  assert.ok(!/localStorage|sessionStorage|indexedDB/.test(t), 'le portefeuille n\'est jamais stocké');
});

test('coque : écrans cabinet et aide, lien d\'évitement, langue, un seul h1, scripts P4 chargés dans l\'ordre', function () {
  var html = H.lire('index.html');
  assert.ok(/id="screen-cabinet"/.test(html) && /id="screen-aide"/.test(html) && /id="btn-cabinet"/.test(html));
  assert.ok(/class="skip"/.test(html) && /<html lang="fr">/.test(html));
  assert.strictEqual((html.match(/<h1[ >]/g) || []).length, 1);
  var srcs = (html.match(/<script[^>]*\ssrc="([^"]+)"/g) || []).map(function (s) { return /src="([^"]+)"/.exec(s)[1]; });
  var o = function (p) { return srcs.indexOf(p); };
  assert.ok(o('js/core/portfolio.js') > 0 && o('js/core/portfolio.js') < o('js/core/logic.js'));
  assert.ok(o('js/core/rapport.js') < o('js/core/logic.js'));
  assert.ok(o('js/ui/aide.js') < o('js/views/view-dashboard.js'));
  assert.ok(o('js/views/view-help.js') > o('js/views/view-dashboard.js') && o('js/views/view-help.js') < o('js/app.js'));
});

test('accessibilité : cibles de 44 px, focus visible, mouvement réduit, cases et boutons nommés', function () {
  var comp = H.lire('styles/components.css');
  assert.ok(/min-height:\s*44px/.test(comp));
  assert.ok(/:focus-visible/.test(H.lire('styles/base.css')));
  assert.ok(/prefers-reduced-motion:\s*reduce/.test(H.lire('styles/base.css')));
  assert.ok(/min-width:\s*44px;\s*min-height:\s*44px/.test(H.lire('styles/aide.css')));
});

/* ---------- Documentation : chiffres identiques à l'outil, fichiers cités existants, garde-fous ---------- */

var L = require('../js/core/logic.js');
var D = require('../js/data.js');

function docs() { return ['README.md', 'GUIDE-LIVRAISON.md', 'script-demo.md'].map(function (f) { return { f: f, t: H.lire(f) }; }); }

test('documentation : les trois documents existent et ne contiennent ni prix, ni employeur, ni stage, ni actuariat, ni cyber', function () {
  docs().forEach(function (d) {
    assert.ok(d.t.length > 1500, d.f);
    assert.ok(!/actuari|cyber|employeur|\bstage\b|\btarifs?\b|\bgarantie\b|ENSAE|ESSEC/i.test(d.t), d.f);
    assert.ok(!/\d\s?(€|euros?)\s*(HT|TTC|par mois|\/ ?mois)/i.test(d.t.replace(/50 €|15 000 €|7 500 €/g, '')), d.f + ' : prix');
  });
});

test('documentation : chaque fichier ou dossier cité entre accents graves existe', function () {
  var racine = require('path').join(H.RACINE, '..', '..');
  var attendus = ['index.html', 'GUIDE-LIVRAISON.md', 'script-demo.md', 'tests/make-fixtures.js', 'livrables/registre-cli/verifier.js', 'livrables/registre-cli/tests/test-cli.js',
    'prospection/suivi.md', 'livrables/demo-appel/', 'livrables/registre-cli/'];
  attendus.forEach(function (f) {
    var ok = H.fs.existsSync(H.path.join(H.RACINE, f)) || H.fs.existsSync(H.path.join(racine, f));
    assert.ok(ok, f);
  });
  docs().forEach(function (d) {
    (d.t.match(/`([A-Za-z0-9_\-./]+\.(?:js|css|html|md))`/g) || []).forEach(function (m) {
      var nom = m.slice(1, -1);
      var trouve = [H.RACINE, racine, H.path.join(H.RACINE, 'js'), H.path.join(H.RACINE, 'js/core'), H.path.join(H.RACINE, 'js/ui'), H.path.join(H.RACINE, 'js/views'),
        H.path.join(H.RACINE, 'styles'), H.path.join(H.RACINE, 'tests')].some(function (b) { return H.fs.existsSync(H.path.join(b, nom)); });
      assert.ok(trouve, d.f + ' cite un fichier introuvable : ' + nom);
    });
  });
});

test('documentation : les chiffres du script de démonstration sont ceux de l\'outil à la date 06/10/2026', function () {
  var d = L.dossierDemo(D, { maintenant: '2026-10-06T08:00:00.000Z' });
  var tranche = L.trancheVersLignes(D.tiersParClient, L.rowsToThirdParties(D.tiers));
  var syn = L.syntheseDossier(d, '2026-10-06', { tranche: tranche });
  var script = H.lire('script-demo.md');
  assert.strictEqual(L.joursRestants('2026-10-06', '2027-09-01'), 330);
  assert.strictEqual(syn.indice.indice, 46);
  assert.strictEqual(Math.round(syn.partCa.bloquant.part * 1000) / 10, 11.2);
  assert.strictEqual(Math.round(syn.partCa.aCorriger.part * 1000) / 10, 5.3);
  assert.strictEqual(L.nbFactures12Mois(L.evaluerTable(d.donnees.factures, 'factures').records, '2026-10-06'), 150);
  assert.strictEqual(L.expositionAmende(150).plafonne, 7500);
  assert.strictEqual(syn.plan.length, 10);
  ['330 jours', '46 sur 100', '7 500 €', '11,2 %', '150 factures', '5,3 %', '10 actions'].forEach(function (k) { assert.ok(script.indexOf(k) >= 0, k); });
  assert.ok(/40 % × 50 \+ 30 % × 60 \+ 30 % × 25/.test(script));
});

test('documentation : les durées du script totalisent entre 5 et 7 minutes', function () {
  var script = H.lire('script-demo.md');
  var deroule = script.slice(script.indexOf('## Déroulé'), script.indexOf('## Comment présenter la valeur'));
  var total = 0;
  (deroule.match(/^### \d+\. .*$/gm) || []).forEach(function (titre) {
    var r = /\((?:(\d+) minutes?(?: (\d+))?|(\d+) secondes)\)\s*$/.exec(titre);
    assert.ok(r, 'durée absente : ' + titre);
    total += r[3] ? +r[3] : (+r[1] || 0) * 60 + (+r[2] || 0);
  });
  assert.ok(total >= 300 && total <= 420, 'durée totale : ' + total + ' s');
});

test('documentation : le README liste les 5 étapes, les raccourcis, le mode cabinet, l\'impression et les limites ; le prix n\'est pas affiché', function () {
  var r = H.lire('README.md');
  ['Tableau de bord', 'Fichier tiers', 'Mentions', 'Trésorerie et reporting', 'Rapport'].forEach(function (k) { assert.ok(r.indexOf(k) >= 0, k); });
  ['`1` à `5`', '`←` `→`', '`F`', '`P`', '`?`', '`Échap`'].forEach(function (k) { assert.ok(r.indexOf(k) >= 0, k); });
  assert.ok(/le prix n'est pas affiché dans l'outil/.test(r));
  assert.ok(/L'indice de préparation est une estimation/.test(r) && /pondération[^.]*hypothèse/.test(r) && /pas de vérification au registre dans l'outil web/.test(r));
  assert.ok(/Mode cabinet/.test(r) && /Enregistrer au format PDF/.test(r) && /Évitez de charger un fichier réel pendant un partage d'écran/.test(r));
});

test('documentation : le guide de livraison couvre la procédure complète et le RGPD', function () {
  var g = H.lire('GUIDE-LIVRAISON.md');
  ['Collecte des exports', 'Import dans l\'outil', 'Vérification au registre', 'Revue des corrections', 'Modèles de factures et organisation', 'Version, rapport et PDF', 'Remise', 'Suppression des données'].forEach(function (k) { assert.ok(g.indexOf(k) >= 0, k); });
  assert.ok(/article 28/.test(g) && /Ne jamais prendre de capture d'écran avec des données réelles|jamais prendre de capture d'écran avec des données réelles/.test(g) && /n'envoie rien/.test(g));
});
