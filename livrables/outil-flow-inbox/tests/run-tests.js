/* Lanceur : charge tous les t-*.js du dossier. Code de sortie 0 si tout passe, 1 sinon.
 * Lancer : node livrables/outil-flow-inbox/tests/run-tests.js */
'use strict';

var fs = require('fs');
var path = require('path');
var H = require('./harness');

fs.readdirSync(__dirname)
  .filter(function (f) { return /^t-.*\.js$/.test(f); })
  .sort()
  .forEach(function (f) { require(path.join(__dirname, f)); });

process.exit(H.bilan());
