/* Équerre : zone de dépôt de fichier (glisser-déposer, bouton « Choisir un fichier » atteignable au clavier).
 * La fenêtre entière neutralise dragover/drop : lâcher un fichier à côté d'une zone ne l'ouvre jamais dans le navigateur. */
(function (root) {
  'use strict';

  var E = root.Equerre;
  var U = E.ui.ui;
  var h = U.h;
  var L = root.EquerreLogic;
  var protege = false;
  var compteur = 0;

  function transporteFichiers(e) {
    var t = e.dataTransfer;
    if (!t) return false;
    if (t.types) { for (var i = 0; i < t.types.length; i++) { if (t.types[i] === 'Files') return true; } }
    return !!(t.files && t.files.length);
  }

  /** À appeler une fois : empêche l'ouverture accidentelle d'un fichier lâché hors d'une zone. */
  function proteger() {
    if (protege) return;
    protege = true;
    root.addEventListener('dragover', function (e) {
      if (!transporteFichiers(e)) return;
      e.preventDefault();
      var dansZone = e.target && e.target.closest && e.target.closest('.dropzone');
      if (!dansZone && e.dataTransfer) e.dataTransfer.dropEffect = 'none';
    });
    root.addEventListener('drop', function (e) {
      if (transporteFichiers(e)) e.preventDefault();
    });
  }

  /** Crée une zone. opts : { titre, description, accept, onFile(file), onMessage(texte), ariaLabel, multiple, onFiles(fichiers) }.
   *  Avec multiple, tous les fichiers déposés ou choisis sont transmis à onFiles ; sinon seul le premier est lu. */
  function creer(opts) {
    proteger();
    var id = 'dz-' + (++compteur);
    var input = h('input', { type: 'file', class: 'visually-hidden', accept: opts.accept || '.csv,.txt,text/csv', tabindex: '-1', 'aria-hidden': 'true', id: id + '-input', multiple: opts.multiple ? true : null });
    var consigne = h('p', { class: 'dz-titre', id: id + '-t', text: opts.titre || 'Glissez votre fichier CSV ici' });
    var survol = h('p', { class: 'dz-survol', 'aria-hidden': 'true', text: 'Relâchez pour charger' });
    var bouton = h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { input.click(); } }, [U.icon('upload'), h('span', { text: opts.multiple ? 'Choisir des fichiers' : 'Choisir un fichier' })]);
    var sous = h('p', { class: 'dz-sous small', text: opts.description || 'Le fichier reste dans votre navigateur, rien n\'est envoyé. Séparateur point-virgule ou virgule, encodage UTF-8 ou Windows.' });
    var zone = h('div', { class: 'dropzone', role: 'group', 'aria-labelledby': id + '-t', 'data-etat': 'repos' }, [
      U.icon('upload', 'dz-ic'), consigne, survol, bouton, sous, input
    ]);

    var profondeur = 0;
    function etat(e) { zone.setAttribute('data-etat', e); }

    zone.addEventListener('dragenter', function (e) {
      if (!transporteFichiers(e)) return;
      e.preventDefault();
      profondeur++;
      zone.classList.add('over');
    });
    zone.addEventListener('dragover', function (e) {
      if (!transporteFichiers(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      zone.classList.add('over');
    });
    zone.addEventListener('dragleave', function () {
      profondeur = Math.max(0, profondeur - 1);
      if (!profondeur) zone.classList.remove('over');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      profondeur = 0;
      zone.classList.remove('over');
      var fichiers = e.dataTransfer && e.dataTransfer.files;
      if (!fichiers || !fichiers.length) return;
      if (opts.multiple && opts.onFiles) { opts.onFiles(Array.prototype.slice.call(fichiers)); return; }
      opts.onFile(fichiers[0]);
      if (fichiers.length > 1 && opts.onMessage) opts.onMessage(L.MESSAGES.plusieurs);
    });
    input.addEventListener('change', function () {
      if (opts.multiple && opts.onFiles) {
        var tous = input.files ? Array.prototype.slice.call(input.files) : [];
        input.value = '';
        if (tous.length) opts.onFiles(tous);
        return;
      }
      var f = input.files && input.files[0];
      input.value = '';
      if (f) opts.onFile(f);
    });

    return { el: zone, input: input, bouton: bouton, etat: etat };
  }

  E.ui.dropzone = { creer: creer, proteger: proteger };
})(typeof self !== 'undefined' ? self : this);
