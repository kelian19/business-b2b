/* Équerre : lectures et téléchargements locaux (File → ArrayBuffer, Blob → <a download>). Aucune requête réseau. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var L = root.EquerreLogic;
  var urls = [];

  /** Lit un fichier en octets (Uint8Array), avec progression. */
  function lireOctets(file, onProgress) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(new Uint8Array(fr.result)); };
      fr.onerror = function () { reject(new Error('Lecture impossible. Le fichier n\'a pas été modifié ni envoyé.')); };
      fr.onprogress = function (e) { if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total); };
      fr.readAsArrayBuffer(file);
    });
  }

  /** Lit un fichier texte (UTF-8). */
  function lireTexte(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result)); };
      fr.onerror = function () { reject(new Error('Lecture impossible. Le fichier n\'a pas été modifié ni envoyé.')); };
      fr.readAsText(file, 'UTF-8');
    });
  }

  function nomSur(nom) {
    var s = String(nom).replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '-');
    return s || 'fichier';
  }

  /** Téléchargement local d'un Blob ; l'URL d'objet est révoquée après usage. */
  function telechargerBlob(nom, blob) {
    var url = URL.createObjectURL(blob);
    urls.push(url);
    var a = document.createElement('a');
    a.href = url;
    a.download = nomSur(nom);
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { revoquer(url); }, 30000);
  }

  function revoquer(url) {
    try { URL.revokeObjectURL(url); } catch (e) { /* sans effet */ }
    var i = urls.indexOf(url);
    if (i >= 0) urls.splice(i, 1);
  }

  /** CSV : UTF-8 avec BOM, séparateur « ; » (déjà dans le texte), CRLF. */
  function telechargerCsv(nom, texte) {
    telechargerBlob(nom, new Blob(['﻿' + texte], { type: 'text/csv;charset=utf-8' }));
  }

  function telechargerJson(nom, texte) {
    telechargerBlob(nom, new Blob([texte], { type: 'application/json;charset=utf-8' }));
  }

  /** Révoque toutes les URL d'objet encore actives (effacement de session). */
  function revoquerTout() {
    urls.slice().forEach(revoquer);
  }

  function nomDossierFichier(nomEntreprise) {
    return L.slug(nomEntreprise, 'dossier') + '.equerre.json';
  }

  E.ui.io = {
    lireOctets: lireOctets, lireTexte: lireTexte, telechargerBlob: telechargerBlob, telechargerCsv: telechargerCsv,
    telechargerJson: telechargerJson, revoquerTout: revoquerTout, nomDossierFichier: nomDossierFichier,
    urlsActives: function () { return urls.length; }
  };
})(typeof self !== 'undefined' ? self : this);
