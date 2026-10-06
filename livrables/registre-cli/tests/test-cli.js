/* Tests de l'outil de vérification au registre. Aucun accès à Internet : un petit serveur local (127.0.0.1) joue le rôle du service public.
 * Lancer : node livrables/registre-cli/tests/test-cli.js */
'use strict';

var assert = require('assert');
var http = require('http');
var fs = require('fs');
var os = require('os');
var path = require('path');
var spawn = require('child_process').spawn;

var VERIFIER = path.join(__dirname, '..', 'verifier.js');
var L = require('../../outil-equerre/js/core/logic.js');
var Client = require('../lib/registre-client.js');

var tests = [];
function test(nom, fn) { tests.push({ nom: nom, fn: fn }); }

/* ---------- Serveur simulant le registre ---------- */

var REPONSES = {
  '844083246': { nom_complet: 'NEGOCE DEMO ALPHA', etat_administratif: 'A', siege: { numero_voie: '12', type_voie: 'RUE', libelle_voie: 'DE L\'EXEMPLE', code_postal: '69003', libelle_commune: 'LYON' } },
  '600217426': { nom_complet: 'ATELIER EXEMPLE CHARLIE', etat_administratif: 'A', siege: { adresse: '5 AVENUE DE LA DEMO 31000 TOULOUSE', code_postal: '31000', libelle_commune: 'TOULOUSE' } },
  '172853038': { nom_complet: 'DISTRIBUTION FICTIVE DELTA', etat_administratif: 'C', siege: { numero_voie: '40', type_voie: 'BD', libelle_voie: 'IMAGINAIRE', code_postal: '59000', libelle_commune: 'LILLE' } }
};

function demarrerServeur(options) {
  options = options || {};
  var journal = [];
  var vus429 = {};
  var srv = http.createServer(function (req, res) {
    var u = new URL(req.url, 'http://127.0.0.1');
    journal.push({ methode: req.method, chemin: u.pathname, q: u.searchParams.get('q'), params: Array.from(u.searchParams.keys()), brut: req.url, entetes: req.headers, t: Date.now() });
    var q = u.searchParams.get('q');
    if (options.toujours429) { res.writeHead(429, { 'Retry-After': '0' }); res.end('{}'); return; }
    if (q === '600217426' && !vus429[q]) { vus429[q] = true; res.writeHead(429, { 'Retry-After': '0' }); res.end('{"message":"Too Many Requests"}'); return; }
    var r = REPONSES[q];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(r ? { results: [Object.assign({ siren: q }, r)], total_results: 1 } : { results: [], total_results: 0 }));
  });
  return new Promise(function (resolve) {
    srv.listen(0, '127.0.0.1', function () {
      resolve({ url: 'http://127.0.0.1:' + srv.address().port, journal: journal, fermer: function () { return new Promise(function (r) { srv.close(r); }); } });
    });
  });
}

function dossierTemp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'equerre-cli-')); }

var TIERS = 'type;nom;siren;ville\r\n' +
  'client;Négoce Démo Alpha SAS;844083246;Lyon\r\n' +
  'client;Fournitures Fictives Bravo SARL;172408825;Pessac\r\n' +
  'client;Atelier Exemple Charlie SAS;600217426;Toulouse\r\n' +
  'client;Distribution Fictive Delta SA;172 853 038;Lille\r\n' +
  'client;Doublon Alpha SAS;844083246;Lyon\r\n' +
  'client;Siren Faux SAS;123456789;Paris\r\n' +
  'client;Sans SIREN SAS;;Nantes\r\n' +
  'fournisseur;Martin Dupont;732829320;Lille\r\n';

function lancer(args, opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    var p = spawn(process.execPath, [VERIFIER].concat(args), { cwd: opts.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    var out = '';
    var err = '';
    p.stdout.on('data', function (c) { out += c; });
    p.stderr.on('data', function (c) { err += c; });
    p.on('close', function (code) { resolve({ code: code, out: out, err: err }); });
  });
}

function preparer(dir, contenu) {
  var f = path.join(dir, 'tiers.csv');
  fs.writeFileSync(f, contenu || TIERS, 'utf8');
  return f;
}

function lireSortie(f) {
  var txt = fs.readFileSync(f, 'utf8').replace(/^﻿/, '');
  var p = L.parseCsv(txt);
  return { headers: p.headers, rows: p.rows, brut: fs.readFileSync(f) };
}

/* ---------- Tests ---------- */

test('aide : --aide affiche l\'usage et sort en code 0, sans rien lire', function () {
  return lancer(['--aide']).then(function (r) {
    assert.strictEqual(r.code, 0);
    assert.ok(/Usage : node verifier\.js/.test(r.out));
    assert.ok(/--simuler/.test(r.out) && /--base-url/.test(r.out) && /--delai-ms/.test(r.out) && /--tiers/.test(r.out) && /--sortie/.test(r.out));
  });
});

test('usage : option inconnue, fichier absent et --tiers manquant sortent en code 2', function () {
  return Promise.all([lancer(['--bidon']), lancer(['--tiers', 'nexiste-pas.csv']), lancer([])]).then(function (rs) {
    rs.forEach(function (r) { assert.strictEqual(r.code, 2); });
  });
});

test('adresse par défaut : le service public officiel, jamais une autre adresse', function () {
  assert.strictEqual(Client.BASE_DEFAUT, 'https://recherche-entreprises.api.gouv.fr');
  assert.ok(Client.DELAI_DEFAUT_MS >= 143, 'moins de 7 appels par seconde (limite officielle)');
  assert.ok(Client.DELAI_MIN_MS >= 143, 'plancher sous la limite de 7 appels par seconde');
});

test('requêtes : SIREN trouvé, SIREN introuvable, entreprise cessée ; sortie au format registre avec BOM', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir);
  var sortie = path.join(dir, 'registre.csv');
  return demarrerServeur().then(function (srv) {
    return lancer(['--tiers', tiers, '--sortie', sortie, '--base-url', srv.url, '--delai-ms', '150', '--oui', '--sans-cache', '--attente-ms', '10']).then(function (r) {
      return srv.fermer().then(function () {
        assert.strictEqual(r.code, 0, r.err + r.out);
        var s = lireSortie(sortie);
        assert.deepStrictEqual(s.brut.slice(0, 3), Buffer.from([0xEF, 0xBB, 0xBF]));
        assert.deepStrictEqual(s.headers, L.KINDS.registre.entetes);
        var parSiren = {};
        s.rows.forEach(function (row) { parSiren[row[0]] = row; });
        assert.strictEqual(parSiren['844083246'][1], 'trouve');
        assert.strictEqual(parSiren['844083246'][2], 'NEGOCE DEMO ALPHA');
        assert.strictEqual(parSiren['844083246'][3], 'active');
        assert.strictEqual(parSiren['844083246'][4], '12 RUE DE L\'EXEMPLE');
        assert.strictEqual(parSiren['844083246'][5], '69003');
        assert.strictEqual(parSiren['844083246'][6], 'LYON');
        assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(parSiren['844083246'][7]));
        assert.strictEqual(parSiren['172408825'][1], 'introuvable');
        assert.strictEqual(parSiren['172853038'][3], 'cessée');
        assert.strictEqual(parSiren['600217426'][4], '5 AVENUE DE LA DEMO', 'adresse sans code postal ni ville');
        assert.strictEqual(s.rows.length, 5);
      });
    });
  });
});

test('confidentialité : seuls des SIREN valides, une seule fois chacun, jamais un nom ni une adresse', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir);
  return demarrerServeur().then(function (srv) {
    return lancer(['--tiers', tiers, '--sortie', path.join(dir, 'r.csv'), '--base-url', srv.url, '--oui', '--sans-cache', '--attente-ms', '10']).then(function () {
      return srv.fermer().then(function () {
        var sirens = srv.journal.map(function (j) { return j.q; });
        assert.deepStrictEqual(sirens.filter(function (s, i) { return sirens.indexOf(s) === i; }).sort(), ['172408825', '172853038', '600217426', '732829320', '844083246']);
        srv.journal.forEach(function (j) {
          assert.strictEqual(j.methode, 'GET');
          assert.strictEqual(j.chemin, '/search');
          assert.ok(/^\d{9}$/.test(j.q));
          assert.deepStrictEqual(j.params.sort(), ['page', 'per_page', 'q']);
          assert.ok(!/Alpha|Bravo|Dupont|Lyon|Lille|Paris|Charlie/i.test(j.brut), 'aucun nom ni ville dans l\'adresse demandée');
          assert.ok(!j.entetes.cookie && !j.entetes.authorization, 'aucun cookie ni jeton');
        });
        assert.ok(!sirens.some(function (s) { return s === '123456789' || s === ''; }), 'SIREN invalide ou vide jamais envoyé');
        assert.strictEqual(sirens.filter(function (s) { return s === '844083246'; }).length, 1, 'doublon envoyé une seule fois');
      });
    });
  });
});

test('validation locale : le compte rendu indique les SIREN vides, invalides et en double non envoyés', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir);
  return lancer(['--tiers', tiers, '--simuler', '--sortie', path.join(dir, 's.csv')]).then(function (r) {
    assert.ok(/5 SIREN valides à vérifier sur 8 lignes \(1 sans SIREN, 1 invalides, 1 en double/.test(r.out), r.out);
  });
});

test('reprise : une réponse 429 est retentée (Retry-After respecté) et finit par réussir', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir, 'nom;siren\r\nAtelier Exemple Charlie SAS;600217426\r\n');
  var sortie = path.join(dir, 'r.csv');
  return demarrerServeur().then(function (srv) {
    return lancer(['--tiers', tiers, '--sortie', sortie, '--base-url', srv.url, '--delai-ms', '150', '--oui', '--sans-cache']).then(function (r) {
      return srv.fermer().then(function () {
        assert.strictEqual(r.code, 0, r.err);
        assert.strictEqual(srv.journal.length, 2, 'une requête refusée puis une requête réussie');
        assert.strictEqual(lireSortie(sortie).rows[0][1], 'trouve');
      });
    });
  });
});

test('reprise : un service qui refuse toujours laisse le SIREN « non_verifie » (code 1), jamais « introuvable »', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir, 'nom;siren\r\nAtelier Exemple Charlie SAS;600217426\r\n');
  var sortie = path.join(dir, 'r.csv');
  return demarrerServeur({ toujours429: true }).then(function (srv) {
    return lancer(['--tiers', tiers, '--sortie', sortie, '--base-url', srv.url, '--delai-ms', '150', '--oui', '--sans-cache', '--attente-ms', '5']).then(function (r) {
      return srv.fermer().then(function () {
        assert.strictEqual(r.code, 1);
        assert.strictEqual(srv.journal.length, 3, 'trois essais au plus');
        assert.strictEqual(lireSortie(sortie).rows[0][1], 'non_verifie');
        assert.ok(/non vérifié/.test(r.err));
      });
    });
  });
});

test('interruption et reprise : le cache évite de refaire les SIREN déjà vérifiés', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir);
  var sortie = path.join(dir, 'r.csv');
  var cache = path.join(dir, 'cache.json');
  var args = ['--tiers', tiers, '--sortie', sortie, '--cache', cache, '--delai-ms', '150', '--oui', '--force', '--attente-ms', '5'];
  return demarrerServeur().then(function (srv) {
    return lancer(args.concat(['--base-url', srv.url, '--arret-apres', '2'])).then(function (r1) {
      assert.strictEqual(r1.code, 3);
      var apres1 = srv.journal.length;
      assert.strictEqual(apres1, 2);
      assert.strictEqual(Object.keys(JSON.parse(fs.readFileSync(cache, 'utf8')).resultats).length, 2);
      return lancer(args.concat(['--base-url', srv.url])).then(function (r2) {
        return srv.fermer().then(function () {
          assert.strictEqual(r2.code, 0, r2.err);
          var deja = ['844083246', '172408825'];
          var apresReprise = srv.journal.slice(apres1).map(function (j) { return j.q; });
          deja.forEach(function (s) { assert.ok(apresReprise.indexOf(s) < 0, s + ' ne doit pas être redemandé'); });
          assert.ok(/2 reprises du cache/.test(r2.out), r2.out);
          assert.strictEqual(lireSortie(sortie).rows.length, 5);
        });
      });
    });
  });
});

test('avertissement : sans --oui et sans terminal, l\'avertissement s\'affiche et aucune requête n\'est envoyée (code 2)', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir);
  return demarrerServeur().then(function (srv) {
    return lancer(['--tiers', tiers, '--sortie', path.join(dir, 'r.csv'), '--base-url', srv.url, '--sans-cache']).then(function (r) {
      return srv.fermer().then(function () {
        assert.strictEqual(r.code, 2);
        assert.strictEqual(srv.journal.length, 0);
        assert.ok(/entrepreneurs individuels sont des personnes physiques/.test(r.err));
        assert.ok(/article 28 du RGPD/.test(r.err));
        assert.ok(/Aucune requête envoyée/.test(r.err));
        assert.ok(!fs.existsSync(path.join(dir, 'r.csv')));
      });
    });
  });
});

test('avertissement : les noms sans forme juridique sont comptés comme entrepreneurs individuels possibles', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir);
  return lancer(['--tiers', tiers, '--sortie', path.join(dir, 'r.csv'), '--base-url', 'http://127.0.0.1:9']).then(function (r) {
    assert.ok(/1 ont un nom sans forme juridique/.test(r.err), r.err);
  });
});

test('--simuler : aucun appel réseau (serveur jamais sollicité, adresse injoignable ignorée), fichier marqué « simule »', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir);
  var sortie = path.join(dir, 'sim.csv');
  return demarrerServeur().then(function (srv) {
    return lancer(['--tiers', tiers, '--sortie', sortie, '--simuler', '--base-url', srv.url]).then(function (r) {
      return srv.fermer().then(function () {
        assert.strictEqual(r.code, 0, r.err);
        assert.strictEqual(srv.journal.length, 0);
        assert.ok(/SIMULATION : aucun appel réseau/.test(r.out));
        var s = lireSortie(sortie);
        assert.strictEqual(s.rows.length, 5);
        s.rows.forEach(function (row) { assert.strictEqual(row[1], 'simule'); });
      });
    });
  });
});

test('--simuler : n\'utilise pas le module réseau (aucune ouverture de connexion)', function () {
  var src = fs.readFileSync(VERIFIER, 'utf8');
  var iSim = src.indexOf('if (o.simuler) {');
  var iFin = src.indexOf('io.err(AVERTISSEMENT)');
  assert.ok(iSim > 0 && iFin > iSim);
  assert.ok(!/creerClient|http|fetch/.test(src.slice(iSim, iFin)));
});

test('sortie : refuse d\'écraser un fichier existant sans --force', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir);
  var sortie = path.join(dir, 'existe.csv');
  fs.writeFileSync(sortie, 'x');
  return lancer(['--tiers', tiers, '--sortie', sortie, '--simuler']).then(function (r) {
    assert.strictEqual(r.code, 2);
    assert.strictEqual(fs.readFileSync(sortie, 'utf8'), 'x');
    return lancer(['--tiers', tiers, '--sortie', sortie, '--simuler', '--force']);
  }).then(function (r2) { assert.strictEqual(r2.code, 0); assert.notStrictEqual(fs.readFileSync(sortie, 'utf8'), 'x'); });
});

test('débit : l\'intervalle entre deux requêtes respecte le délai demandé (plancher de 150 ms)', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir);
  return demarrerServeur().then(function (srv) {
    return lancer(['--tiers', tiers, '--sortie', path.join(dir, 'r.csv'), '--base-url', srv.url, '--delai-ms', '10', '--oui', '--sans-cache', '--attente-ms', '5']).then(function () {
      return srv.fermer().then(function () {
        for (var i = 1; i < srv.journal.length; i++) {
          assert.ok(srv.journal[i].t - srv.journal[i - 1].t >= 140, 'intervalle ' + (srv.journal[i].t - srv.journal[i - 1].t) + ' ms');
        }
        assert.ok(srv.journal.length >= 5);
      });
    });
  });
});

test('import : le fichier produit est lu sans erreur par l\'assistant d\'import de l\'application (type « registre »)', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir);
  var sortie = path.join(dir, 'r.csv');
  return demarrerServeur().then(function (srv) {
    return lancer(['--tiers', tiers, '--sortie', sortie, '--base-url', srv.url, '--oui', '--sans-cache', '--attente-ms', '5']).then(function () {
      return srv.fermer().then(function () {
        var octets = fs.readFileSync(sortie);
        var dec = L.decodeBytes(new Uint8Array(octets));
        assert.strictEqual(dec.suspectBinaire, false);
        assert.strictEqual(dec.bom, true);
        var insp = L.inspectCsv(dec.texte, 'registre');
        assert.strictEqual(insp.vide, false);
        assert.deepStrictEqual(insp.manquantes, []);
        assert.strictEqual(L.diagnostiquer(insp).filter(function (p) { return p.bloquant; }).length, 0);
        var cm = L.canonicalizeCsv(L.parseCsv(dec.texte), 'registre');
        assert.deepStrictEqual(cm.missing, []);
        var recs = cm.records.map(function (r, i) { return L.KINDS.registre.normaliser(r, i + 2); });
        assert.ok(recs.every(function (r) { return r.ok; }));
        var analyse = L.analyseEffective(L.rowsToThirdParties([{ type: 'client', nom: 'Distribution Fictive Delta SA', siren: '172853038', adresse: '40 boulevard Imaginaire', code_postal: '59000', ville: 'Lille', pays: 'FR' }]),
          { registre: recs.map(function (r) { return r.valeur; }) });
        assert.strictEqual(analyse.analysis.counts.etat_cesse, 1, 'l\'état « cessée » est reconnu par l\'outil web');
        assert.strictEqual(analyse.analysis.counts.ecart_nom, 0);
      });
    });
  });
});

test('import : le fichier simulé est lui aussi importable', function () {
  var dir = dossierTemp();
  var tiers = preparer(dir);
  var sortie = path.join(dir, 's.csv');
  return lancer(['--tiers', tiers, '--sortie', sortie, '--simuler']).then(function () {
    var dec = L.decodeBytes(new Uint8Array(fs.readFileSync(sortie)));
    var insp = L.inspectCsv(dec.texte, 'registre');
    assert.deepStrictEqual(insp.manquantes, []);
    assert.strictEqual(L.diagnostiquer(insp).filter(function (p) { return p.bloquant; }).length, 0);
  });
});

test('lecture : tiers en Windows-1252 avec séparateur virgule et colonne « N° SIREN » reconnus', function () {
  var dir = dossierTemp();
  var f = path.join(dir, 't.csv');
  fs.writeFileSync(f, Buffer.from('Raison sociale,N\xB0 SIREN\r\nSoci\xE9t\xE9 Fictive,844083246\r\n', 'latin1'));
  return lancer(['--tiers', f, '--sortie', path.join(dir, 's.csv'), '--simuler']).then(function (r) {
    assert.strictEqual(r.code, 0, r.err);
    assert.ok(/1 SIREN valides à vérifier/.test(r.out), r.out);
  });
});

test('lecture : fichier sans colonne SIREN ou fichier binaire refusé (code 2)', function () {
  var dir = dossierTemp();
  var f = path.join(dir, 't.csv');
  fs.writeFileSync(f, 'nom;ville\r\nA;B\r\n');
  var g = path.join(dir, 'x.csv');
  fs.writeFileSync(g, Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00]));
  return Promise.all([lancer(['--tiers', f, '--simuler', '--sortie', path.join(dir, 'a.csv')]), lancer(['--tiers', g, '--simuler', '--sortie', path.join(dir, 'b.csv')])]).then(function (rs) {
    assert.strictEqual(rs[0].code, 2);
    assert.ok(/Colonne SIREN introuvable/.test(rs[0].err));
    assert.strictEqual(rs[1].code, 2);
  });
});

test('client : lireResultat ne retient que des informations publiques et gère l\'absence de siège', function () {
  assert.deepStrictEqual(Client.lireResultat({ results: [] }, '844083246'), { statut: 'introuvable', donnees: null });
  assert.strictEqual(Client.lireResultat({ results: [{ siren: '111111111' }] }, '844083246').statut, 'introuvable', 'un autre SIREN n\'est jamais pris pour le bon');
  var r = Client.lireResultat({ results: [{ siren: '844083246', nom_complet: 'X', etat_administratif: 'A' }] }, '844083246');
  assert.strictEqual(r.statut, 'trouve');
  assert.strictEqual(r.donnees.adresse, '');
});

test('client : un SIREN invalide n\'est jamais envoyé (aucune requête)', function () {
  var c = Client.creerClient({ base: 'http://127.0.0.1:9' });
  return c.verifier('12345').then(function (r) { assert.strictEqual(r.statut, 'erreur'); assert.strictEqual(c.nbRequetes(), 0); });
});

test('statique : l\'application web n\'importe jamais l\'outil en ligne de commande et ne contient aucun appel réseau', function () {
  var racine = path.join(__dirname, '..', '..', 'outil-equerre');
  (function parcourir(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
      if (d.name === 'tests' || d.name.charAt(0) === '.') return;
      var p = path.join(dir, d.name);
      if (d.isDirectory()) return parcourir(p);
      if (!/\.(js|html)$/.test(d.name)) return;
      var t = fs.readFileSync(p, 'utf8');
      assert.ok(!/registre-cli|require\(['"]https?['"]\)/.test(t), p);
    });
  })(racine);
});

/* ---------- Lanceur ---------- */

var reussis = 0;
var echecs = 0;
tests.reduce(function (chaine, t) {
  return chaine.then(function () {
    return Promise.resolve().then(t.fn).then(function () { reussis++; }, function (e) { echecs++; console.error('ÉCHEC : ' + t.nom + '\n  ' + (e && e.message ? e.message.split('\n')[0] : e)); });
  });
}, Promise.resolve()).then(function () {
  console.log(reussis + ' test' + (reussis > 1 ? 's' : '') + ' réussi' + (reussis > 1 ? 's' : '') + (echecs ? ', ' + echecs + ' échec' + (echecs > 1 ? 's' : '') : ''));
  process.exit(echecs ? 1 : 0);
});
