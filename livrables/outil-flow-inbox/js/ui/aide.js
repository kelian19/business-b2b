/* Flow Inbox : aide. Boîte de dialogue native (raccourcis + glossaire, touche « ? »), boutons « Comment est-ce calculé ? » à panneau non modal. */
(function (root) {
  'use strict';

  var FI = root.FlowInbox;
  var U = FI.ui.ui;
  var h = U.h;
  var K = FI.ui.contenus;
  var compteur = 0;

  function glossaire(classe) {
    return h('dl', { class: 'glossaire ' + (classe || '') }, K.GLOSSAIRE.map(function (g) {
      return h('div', { class: 'glossaire-item' }, [h('dt', { text: g.terme }), h('dd', { text: g.definition })]);
    }));
  }

  function tableauRaccourcis() {
    return h('table', { class: 'table petit-tableau table-raccourcis' }, [
      h('caption', { class: 'visually-hidden', text: 'Raccourcis clavier' }),
      h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'Touche' }), h('th', { scope: 'col', text: 'Action' })])]),
      h('tbody', null, K.RACCOURCIS.map(function (r) {
        return h('tr', null, [h('th', { scope: 'row' }, [h('kbd', { text: r.touche })]), h('td', { text: r.action })]);
      }))
    ]);
  }

  /** Bouton « ? » et panneau non modal. Renvoie { btn, panneau } ; Échap referme le panneau (géré par l'application). */
  function bouton(cle) {
    var a = K.AIDE_CTX[cle];
    var id = 'aide-ctx-' + cle + '-' + (++compteur);
    var panneau = h('div', { id: id, class: 'aide-panneau', role: 'region', 'aria-label': 'Aide : ' + a.titre, hidden: true }, [
      h('p', { class: 'aide-panneau-t', text: 'Comment est-ce calculé ? ' + a.titre }),
      h('p', { text: a.texte })
    ]);
    var btn = h('button', { type: 'button', class: 'aide-btn', 'aria-expanded': 'false', 'aria-controls': id, 'aria-label': 'Comment est-ce calculé ? ' + a.titre }, [
      h('span', { 'aria-hidden': 'true', text: '?' })
    ]);
    btn.addEventListener('click', function () {
      var ouvrir = panneau.hidden;
      panneau.hidden = !ouvrir;
      btn.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
    });
    return { btn: btn, panneau: panneau };
  }

  /** Ferme tous les panneaux d'aide ouverts ; renvoie vrai s'il y en avait un. */
  function fermerPanneaux() {
    var ouverts = document.querySelectorAll('.aide-panneau:not([hidden])');
    var avait = false;
    for (var i = 0; i < ouverts.length; i++) {
      avait = true;
      ouverts[i].hidden = true;
      var b = document.querySelector('[aria-controls="' + ouverts[i].id + '"]');
      if (b) { b.setAttribute('aria-expanded', 'false'); if (document.activeElement === document.body || ouverts[i].contains(document.activeElement)) b.focus(); }
    }
    return avait;
  }

  var dialogue = null;

  function dialogueOuvert() { return !!(dialogue && dialogue.isConnected && dialogue.open); }

  function fermerDialogue() { if (dialogueOuvert()) dialogue.close(); }

  /** Ouvre l'aide (raccourcis et glossaire) dans une boîte de dialogue native : focus piégé et Échap gérés par le navigateur. */
  function ouvrirDialogue() {
    if (dialogueOuvert()) return;
    var ouvreur = document.activeElement;
    var dlg = h('dialog', { class: 'dlg', 'aria-labelledby': 'dlg-aide-titre' });
    var fermer = U.bouton('Fermer', { primaire: true, icone: 'croix', fk: 'aide-fermer', onclick: function () { dlg.close(); } });
    dlg.appendChild(h('div', { class: 'dlg-tete' }, [h('h2', { id: 'dlg-aide-titre', text: 'Aide : raccourcis et glossaire' }), fermer]));
    dlg.appendChild(h('div', { class: 'dlg-corps' }, [
      h('p', { class: 'lead', text: 'Cette démonstration est locale et fictive : rien n\'est envoyé, rien n\'est enregistré. Les raccourcis ne s\'appliquent pas pendant une saisie dans un champ.' }),
      h('h3', { text: 'Raccourcis clavier' }),
      tableauRaccourcis(),
      h('h3', { text: 'Glossaire' }),
      glossaire(),
      h('p', { class: 'small' }, ['Le parcours complet est expliqué dans l\'écran ', h('a', { href: '#comment', onclick: function () { dlg.close(); }, text: 'Comment ça marche' }), '.'])
    ]));
    document.body.appendChild(dlg);
    dlg.addEventListener('close', function () {
      if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
      dialogue = null;
      if (ouvreur && ouvreur.focus && document.contains(ouvreur)) { try { ouvreur.focus(); } catch (e) { /* sans effet */ } }
    });
    dialogue = dlg;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    fermer.focus();
  }

  FI.ui.aide = { bouton: bouton, fermerPanneaux: fermerPanneaux, ouvrirDialogue: ouvrirDialogue, fermerDialogue: fermerDialogue, dialogueOuvert: dialogueOuvert, glossaire: glossaire, tableauRaccourcis: tableauRaccourcis };
})(typeof self !== 'undefined' ? self : this);
