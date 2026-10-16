/* Flow Inbox : petit harnais de tests sans dépendance (test, bilan, code de sortie). */
'use strict';

var assert = require('assert');
var etat = { reussis: 0, echecs: 0 };

function test(nom, fn) {
  try {
    fn();
    etat.reussis++;
  } catch (e) {
    etat.echecs++;
    console.error('ÉCHEC : ' + nom + '\n  ' + (e && e.message ? e.message.split('\n')[0] : e));
  }
}

function bilan() {
  console.log(etat.reussis + ' test' + (etat.reussis > 1 ? 's' : '') + ' réussi' + (etat.reussis > 1 ? 's' : '') +
    (etat.echecs ? ', ' + etat.echecs + ' échec' + (etat.echecs > 1 ? 's' : '') : ''));
  return etat.echecs ? 1 : 0;
}

module.exports = { test: test, assert: assert, bilan: bilan, etat: etat };
