/* Lecture du CSV des tiers (mêmes modules que l'application, pour des règles identiques) et écriture du fichier « registre »
 * au format attendu par l'assistant d'import d'Équerre. Cache local de résultats publics pour reprendre après une interruption. */
'use strict';

var fs = require('fs');
var path = require('path');
var L = require('../../outil-equerre/js/core/logic.js');

var ENTETES = L.KINDS.registre.entetes;   // siren;statut_verification;denomination_registre;etat_administratif;adresse_registre;code_postal_registre;ville_registre;date_verification
var FORMES = /\b(SARL|SAS|SASU|SA|EURL|SNC|SCI|SELARL|GIE|ASSOCIATION|GMBH|SRL|LTD)\b/i;

/** Lit le CSV des tiers. Renvoie { sirens (valides, sans doublon, ordre du fichier), ignores:{vides, invalides, doublons}, noms (SIREN → nom, pour la simulation),
 *  possiblesEI (SIREN dont le nom n'a pas de forme juridique) }. Les noms ne quittent jamais le poste. */
function lireTiers(chemin) {
  var octets = fs.readFileSync(chemin);
  var dec = L.decodeBytes(new Uint8Array(octets));
  if (dec.suspectBinaire) throw new Error('Ce fichier n\'est pas un CSV texte.');
  var parsed = L.parseCsv(dec.texte);
  var cm = L.canonicalizeCsv(parsed, 'tiers');
  if (cm.columns.indexOf('siren') < 0) throw new Error('Colonne SIREN introuvable (colonnes lues : ' + parsed.headers.join(', ') + ').');
  var vus = new Set();
  var sirens = [];
  var noms = {};
  var possiblesEI = [];
  var ign = { vides: 0, invalides: 0, doublons: 0 };
  cm.records.forEach(function (r) {
    var s = L.cleanId(r.siren);
    if (!s) { ign.vides++; return; }
    if (!L.isValidSiren(s)) { ign.invalides++; return; }
    if (vus.has(s)) { ign.doublons++; return; }
    vus.add(s);
    sirens.push(s);
    noms[s] = r.nom || '';
    if (r.nom && !FORMES.test(r.nom)) possiblesEI.push(s);
  });
  return { sirens: sirens, ignores: ign, noms: noms, possiblesEI: possiblesEI, nbLignes: cm.records.length };
}

function lireCache(chemin) {
  try {
    var o = JSON.parse(fs.readFileSync(chemin, 'utf8'));
    return o && o.format === 'equerre-registre-cache' && o.resultats && typeof o.resultats === 'object' ? o.resultats : {};
  } catch (e) { return {}; }
}

function ecrireCache(chemin, resultats) {
  var tmp = chemin + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ format: 'equerre-registre-cache', note: 'Données publiques du registre pour les SIREN consultés. À supprimer en fin de mission.', resultats: resultats }), 'utf8');
  fs.renameSync(tmp, chemin);
}

/** Une ligne du fichier registre pour un résultat { statut, donnees, date }. statut_verification : trouve | introuvable | non_verifie | simule. */
function ligneSortie(siren, res) {
  var d = res.donnees || {};
  return [siren, res.statut, d.denomination || '', d.etat || '', d.adresse || '', d.codePostal || '', d.ville || '', res.date || ''];
}

/** Écrit le CSV : UTF-8 avec BOM, séparateur « ; », fins de ligne CRLF (comme les exports de l'application). */
function ecrireCsv(chemin, lignes) {
  var dossier = path.dirname(chemin);
  if (dossier && !fs.existsSync(dossier)) fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(chemin, Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(L.toCsv(ENTETES, lignes), 'utf8')]));
}

module.exports = { ENTETES: ENTETES, lireTiers: lireTiers, lireCache: lireCache, ecrireCache: ecrireCache, ligneSortie: ligneSortie, ecrireCsv: ecrireCsv };
