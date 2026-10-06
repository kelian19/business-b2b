#!/usr/bin/env node
/* Vérification des tiers au registre public : outil facultatif en ligne de commande, lancé par le consultant (jamais par l'application web).
 * Lit un CSV de tiers, valide les SIREN localement, n'envoie QUE les SIREN valides (jamais un nom ni une adresse),
 * limite le débit, reprend après une interruption grâce à un cache local de résultats publics et écrit le fichier « registre »
 * à importer dans l'étape 2 d'Équerre. Node 18 ou plus, aucune dépendance. */
'use strict';

var fs = require('fs');
var readline = require('readline');
var Client = require('./lib/registre-client.js');
var Sortie = require('./lib/sortie.js');

var AIDE = [
  'Usage : node verifier.js --tiers <tiers.csv> [--sortie <registre.csv>] [options]',
  '',
  'Options :',
  '  --tiers <fichier>     CSV des tiers (colonne SIREN obligatoire). Lu localement.',
  '  --sortie <fichier>    CSV « registre » écrit (défaut : registre.csv, ou registre-simule.csv avec --simuler).',
  '  --base-url <url>      Adresse du service (défaut : ' + Client.BASE_DEFAUT + '). https obligatoire ; http n\'est accepté que pour 127.0.0.1 ou localhost (essais).',
  '  --delai-ms <n>        Délai entre deux requêtes (défaut ' + Client.DELAI_DEFAUT_MS + ' ms, minimum ' + Client.DELAI_MIN_MS + ' ms : environ 6 appels par seconde au plus, sous la limite officielle de 7).',
  '  --cache <fichier>     Cache local des résultats publics (défaut : registre-cache.json). Permet de reprendre après une interruption.',
  '  --sans-cache          Ne lit ni n\'écrit de cache.',
  '  --simuler, --dry-run  Aucun appel réseau : écrit un fichier d\'essai (statut « simule ») que l\'application REFUSE à l\'import : ce n\'est jamais une vérification.',
  '  --oui                 Confirme l\'accord du client et la lecture de l\'avertissement (sinon, confirmation demandée).',
  '  --force               Écrase le fichier de sortie s\'il existe.',
  '  --aide                Affiche cette aide.',
  '',
  'Codes de sortie : 0 tout est vérifié, 1 certains SIREN n\'ont pas pu l\'être (relancer : le cache évite de refaire les autres),',
  '2 erreur d\'usage ou confirmation absente, 3 arrêt demandé (--arret-apres), 130 interruption au clavier.',
  '',
  'Confidentialité : seuls des SIREN sont envoyés au service public, avec l\'adresse IP du poste. N\'utilisez l\'outil qu\'avec l\'accord du client.'
].join('\n');

var AVERTISSEMENT = [
  'AVERTISSEMENT',
  '- Seuls les SIREN valides sont envoyés au service public du registre ; aucun nom, adresse ni montant ne quitte le poste.',
  '- Le service reçoit toutefois l\'adresse IP du poste et la liste des SIREN consultés : n\'utilisez l\'outil qu\'avec l\'accord du client.',
  '- Les entrepreneurs individuels sont des personnes physiques : leur SIREN peut identifier une personne. Vérifiez que le contrat de sous-traitance',
  '  (article 28 du RGPD) le permet avant d\'envoyer ces numéros.'
].join('\n');

function analyserArguments(argv) {
  var o = { tiers: null, sortie: null, baseUrl: null, delaiMs: Client.DELAI_DEFAUT_MS, cache: 'registre-cache.json', sansCache: false, simuler: false, oui: false, force: false, aide: false, arretApres: 0, attenteMs: undefined };
  for (var i = 0; i < argv.length; i++) {
    var a = argv[i];
    function val() { if (i + 1 >= argv.length) throw new Error('Valeur manquante pour ' + a + '.'); return argv[++i]; }
    if (a === '--tiers') o.tiers = val();
    else if (a === '--sortie') o.sortie = val();
    else if (a === '--base-url') o.baseUrl = val();
    else if (a === '--delai-ms') { o.delaiMs = parseInt(val(), 10); if (isNaN(o.delaiMs) || o.delaiMs < 0) throw new Error('--delai-ms attend un nombre de millisecondes.'); }
    else if (a === '--cache') o.cache = val();
    else if (a === '--sans-cache') o.sansCache = true;
    else if (a === '--simuler' || a === '--dry-run') o.simuler = true;
    else if (a === '--oui') o.oui = true;
    else if (a === '--force') o.force = true;
    else if (a === '--aide' || a === '-h' || a === '--help') o.aide = true;
    else if (a === '--arret-apres') { o.arretApres = parseInt(val(), 10); if (isNaN(o.arretApres) || o.arretApres < 1) throw new Error('--arret-apres attend un entier positif.'); }
    else if (a === '--attente-ms') { o.attenteMs = parseInt(val(), 10); }
    else throw new Error('Option inconnue : ' + a + '.');
  }
  return o;
}

function demander(question, entree) {
  return new Promise(function (resolve) {
    if (!entree.isTTY) { resolve(''); return; }
    var rl = readline.createInterface({ input: entree, output: process.stderr });
    rl.question(question, function (r) { rl.close(); resolve(String(r || '').trim().toLowerCase()); });
  });
}

/** https partout ; http seulement pour une machine locale (serveur d'essai). Évite d'envoyer des SIREN en clair ou ailleurs que vers un service choisi en connaissance de cause. */
function baseUrlAutorisee(texte) {
  var u;
  try { u = new URL(String(texte)); } catch (e) { return false; }
  if (u.protocol === 'https:') return true;
  return u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '[::1]');
}

function aujourdhui() {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

/** Exécute l'outil. io : { out(texte), err(texte), entree }. Renvoie le code de sortie. */
function executer(argv, io) {
  var o;
  try { o = analyserArguments(argv); } catch (e) { io.err(e.message + '\n' + AIDE); return Promise.resolve(2); }
  if (o.aide) { io.out(AIDE); return Promise.resolve(0); }
  if (!o.tiers) { io.err('Indiquez le fichier des tiers avec --tiers.\n' + AIDE); return Promise.resolve(2); }
  if (!fs.existsSync(o.tiers)) { io.err('Fichier introuvable : ' + o.tiers); return Promise.resolve(2); }
  var sortie = o.sortie || (o.simuler ? 'registre-simule.csv' : 'registre.csv');
  if (fs.existsSync(sortie) && !o.force) { io.err(sortie + ' existe déjà : ajoutez --force pour l\'écraser.'); return Promise.resolve(2); }
  if (!o.simuler && !baseUrlAutorisee(o.baseUrl || Client.BASE_DEFAUT)) { io.err('--base-url doit commencer par https:// (http:// n\'est accepté que pour 127.0.0.1 ou localhost) : des SIREN ne sont jamais envoyés en clair vers un autre serveur.'); return Promise.resolve(2); }

  var tiers;
  try { tiers = Sortie.lireTiers(o.tiers); } catch (e) { io.err('Lecture impossible : ' + e.message); return Promise.resolve(2); }
  io.out(tiers.sirens.length + ' SIREN valides à vérifier sur ' + tiers.nbLignes + ' lignes (' + tiers.ignores.vides + ' sans SIREN, ' + tiers.ignores.invalides + ' invalides, ' + tiers.ignores.doublons + ' en double : jamais envoyés).');

  if (o.simuler) {
    io.out('SIMULATION : aucun appel réseau. Le fichier écrit est un essai (statut « simule ») : l\'application Équerre le refuse à l\'import, car ce n\'est pas une vérification. Pour une vraie vérification, relancez sans --simuler.');
    var date = aujourdhui();
    var lignes = tiers.sirens.map(function (s) {
      return Sortie.ligneSortie(s, { statut: 'simule', donnees: { denomination: tiers.noms[s], etat: 'active' }, date: date });
    });
    Sortie.ecrireCsv(sortie, lignes);
    io.out('Fichier écrit : ' + sortie);
    return Promise.resolve(0);
  }

  io.err(AVERTISSEMENT);
  if (tiers.possiblesEI.length) io.err('Parmi les SIREN à envoyer, ' + tiers.possiblesEI.length + ' ont un nom sans forme juridique (entrepreneurs individuels possibles).');

  var confirmation = o.oui ? Promise.resolve('oui') : demander('Tapez « oui » pour confirmer l\'accord du client et lancer les requêtes : ', io.entree);
  return confirmation.then(function (rep) {
    if (rep !== 'oui' && rep !== 'o') {
      io.err('Aucune requête envoyée : confirmation absente. Relancez avec --oui si le client a donné son accord.');
      return 2;
    }
    var cache = o.sansCache ? {} : Sortie.lireCache(o.cache);
    var client = Client.creerClient({ base: o.baseUrl, delaiMs: o.delaiMs, attenteMs: o.attenteMs });
    var resultats = {};
    var envoyes = 0;
    var nonVerifies = 0;
    var reprises = 0;
    var interrompu = false;
    var i = 0;
    function suite() {
      if (i >= tiers.sirens.length) return Promise.resolve();
      var s = tiers.sirens[i++];
      if (cache[s] && cache[s].statut !== 'non_verifie') { resultats[s] = cache[s]; reprises++; return suite(); }
      if (o.arretApres && envoyes >= o.arretApres) { interrompu = true; return Promise.resolve(); }
      envoyes++;
      return client.verifier(s).then(function (r) {
        if (r.statut === 'erreur') {
          nonVerifies++;
          io.err('SIREN ' + s + ' non vérifié : ' + r.message);
          resultats[s] = { statut: 'non_verifie', donnees: null, date: '' };
        } else {
          resultats[s] = { statut: r.statut, donnees: r.donnees, date: aujourdhui() };
          cache[s] = resultats[s];
          if (!o.sansCache) Sortie.ecrireCache(o.cache, cache);
        }
        return suite();
      });
    }
    return suite().then(function () {
      var lignes = tiers.sirens.filter(function (s) { return resultats[s]; }).map(function (s) { return Sortie.ligneSortie(s, resultats[s]); });
      Sortie.ecrireCsv(sortie, lignes);
      io.out(envoyes + ' requête' + (envoyes > 1 ? 's' : '') + ' envoyée' + (envoyes > 1 ? 's' : '') + ', ' + reprises + ' reprise' + (reprises > 1 ? 's' : '') + ' du cache. Fichier écrit : ' + sortie + ' (' + lignes.length + ' lignes).');
      if (interrompu) { io.err('Arrêt demandé après ' + o.arretApres + ' requêtes : relancez la même commande pour reprendre.'); return 3; }
      if (nonVerifies) { io.err(nonVerifies + ' SIREN non vérifiés : relancez la même commande, le cache évite de refaire les autres.'); return 1; }
      return 0;
    });
  });
}

module.exports = { executer: executer, analyserArguments: analyserArguments, baseUrlAutorisee: baseUrlAutorisee, AIDE: AIDE, AVERTISSEMENT: AVERTISSEMENT };

if (require.main === module) {
  process.on('SIGINT', function () { process.stderr.write('\nInterruption : le cache est déjà enregistré, relancez la même commande pour reprendre.\n'); process.exit(130); });
  executer(process.argv.slice(2), {
    out: function (t) { process.stdout.write(t + '\n'); },
    err: function (t) { process.stderr.write(t + '\n'); },
    entree: process.stdin
  }).then(function (code) { process.exitCode = code; }, function (e) { process.stderr.write('Erreur : ' + e.message + '\n'); process.exitCode = 1; });
}
