/* Client du service public « Recherche d'entreprises » (API ouverte, sans clé).
 * Documentation officielle consultée : la page du service sur data.gouv.fr indique l'adresse de base
 * https://recherche-entreprises.api.gouv.fr, le point d'accès /search (paramètre q) et une limite de 7 appels par seconde,
 * l'administration pouvant la réduire en cas de surcharge. L'outil reste volontairement en dessous (4 appels par seconde par défaut,
 * environ 6,7 au plus avec le délai minimal de 150 ms) et reprend après un refus (429) ou une erreur du serveur.
 *
 * Confidentialité : seuls des SIREN (numéros publics) sont envoyés, jamais un nom, une adresse ou un montant.
 * Zéro dépendance : modules http et https de Node. Seul composant du projet autorisé à utiliser le réseau. */
'use strict';

var http = require('http');
var https = require('https');

var BASE_DEFAUT = 'https://recherche-entreprises.api.gouv.fr';
var DELAI_DEFAUT_MS = 250;
var DELAI_MIN_MS = 150;   // environ 6,7 appels par seconde au plus (1000 / 150), sous la limite officielle de 7
var TENTATIVES_DEFAUT = 3;
var ATTENTE_DEFAUT_MS = 1000;
var ATTENTE_MAX_MS = 60000;

function pause(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/** Extrait de la réponse du service les seules informations publiques utiles. */
function lireResultat(json, siren) {
  var liste = json && Array.isArray(json.results) ? json.results : [];
  var trouve = null;
  for (var i = 0; i < liste.length; i++) { if (String(liste[i].siren) === siren) { trouve = liste[i]; break; } }
  if (!trouve) return { statut: 'introuvable', donnees: null };
  var siege = trouve.siege || {};
  var voie = [siege.numero_voie, siege.indice_repetition, siege.type_voie, siege.libelle_voie].filter(function (x) { return x; }).join(' ');
  if (!voie && siege.adresse) {
    voie = String(siege.adresse).replace(String(siege.code_postal || ''), '').replace(String(siege.libelle_commune || ''), '').replace(/\s+/g, ' ').replace(/[ ,]+$/, '').trim();
  }
  var etat = String(trouve.etat_administratif || siege.etat_administratif || '').toUpperCase();
  return {
    statut: 'trouve',
    donnees: {
      denomination: String(trouve.nom_complet || trouve.nom_raison_sociale || ''),
      etat: etat === 'C' ? 'cessée' : (etat === 'A' ? 'active' : ''),
      adresse: voie,
      codePostal: String(siege.code_postal || ''),
      ville: String(siege.libelle_commune || '')
    }
  };
}

function requete(urlTexte, timeoutMs) {
  return new Promise(function (resolve, reject) {
    var u = new URL(urlTexte);
    var mod = u.protocol === 'https:' ? https : http;
    var req = mod.request(u, { method: 'GET', headers: { Accept: 'application/json', 'User-Agent': 'equerre-registre-cli/1.0' }, timeout: timeoutMs }, function (res) {
      var morceaux = [];
      res.on('data', function (c) { morceaux.push(c); });
      res.on('end', function () { resolve({ statut: res.statusCode, entetes: res.headers, corps: Buffer.concat(morceaux).toString('utf8') }); });
    });
    req.on('timeout', function () { req.destroy(new Error('délai dépassé')); });
    req.on('error', reject);
    req.end();
  });
}

/** Crée un client. opts : { base, delaiMs, tentatives, attenteMs, timeoutMs }. */
function creerClient(opts) {
  opts = opts || {};
  var base = String(opts.base || BASE_DEFAUT).replace(/\/+$/, '');
  var delai = Math.max(DELAI_MIN_MS, opts.delaiMs === undefined ? DELAI_DEFAUT_MS : opts.delaiMs);
  var tentatives = opts.tentatives || TENTATIVES_DEFAUT;
  var attente = opts.attenteMs === undefined ? ATTENTE_DEFAUT_MS : opts.attenteMs;
  var timeoutMs = opts.timeoutMs || 15000;
  var dernier = 0;
  var nbRequetes = 0;

  /** Interroge un SIREN (9 chiffres). Renvoie { statut: trouve|introuvable|erreur, donnees, message, essais }. */
  function verifier(siren) {
    if (!/^\d{9}$/.test(siren)) return Promise.resolve({ statut: 'erreur', donnees: null, message: 'SIREN non valide : aucune requête envoyée.', essais: 0 });
    var url = base + '/search?q=' + siren + '&page=1&per_page=1';
    var essai = 0;
    function boucle() {
      essai++;
      var attendre = Math.max(0, dernier + delai - Date.now());
      return pause(attendre).then(function () {
        dernier = Date.now();
        nbRequetes++;
        return requete(url, timeoutMs);
      }).then(function (rep) {
        if (rep.statut === 200) {
          var json;
          try { json = JSON.parse(rep.corps); } catch (e) { return { statut: 'erreur', donnees: null, message: 'Réponse illisible du service.', essais: essai }; }
          var r = lireResultat(json, siren);
          r.essais = essai;
          return r;
        }
        if ((rep.statut === 429 || rep.statut >= 500) && essai < tentatives) {
          var ra = parseFloat(rep.entetes['retry-after']);
          var ms = isNaN(ra) ? attente * Math.pow(2, essai - 1) : ra * 1000;
          return pause(Math.min(ms, ATTENTE_MAX_MS)).then(boucle);
        }
        return { statut: 'erreur', donnees: null, message: 'Le service a répondu ' + rep.statut + '.', essais: essai };
      }, function (err) {
        if (essai < tentatives) return pause(Math.min(attente * Math.pow(2, essai - 1), ATTENTE_MAX_MS)).then(boucle);
        return { statut: 'erreur', donnees: null, message: 'Service injoignable : ' + err.message, essais: essai };
      });
    }
    return boucle();
  }

  return { verifier: verifier, base: base, delaiMs: delai, nbRequetes: function () { return nbRequetes; } };
}

module.exports = { creerClient: creerClient, lireResultat: lireResultat, BASE_DEFAUT: BASE_DEFAUT, DELAI_DEFAUT_MS: DELAI_DEFAUT_MS, DELAI_MIN_MS: DELAI_MIN_MS };
