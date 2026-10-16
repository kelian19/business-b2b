/* Flow Inbox : réglages modifiables de l'agence (catalogue et questions types, signature, ton, responsables, délai de relance).
 * creer() renvoie une copie profonde des réglages d'origine : les données fictives ne sont jamais modifiées. Logique pure. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };
    FI.core.contexte = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function copie(x) { return JSON.parse(JSON.stringify(x)); }

  /** Réglages d'origine tirés de FlowData : agence, services (avec questions), équipe, paramètres. */
  function creer(donnees) {
    return {
      agence: {
        nom: donnees.agence.nom,
        adresse_boite: donnees.agence.adresse_boite,
        signature: donnees.agence.signature,
        ton: 'chaleureux',
        description_ton: donnees.agence.ton
      },
      services: copie(donnees.services),
      equipe: copie(donnees.equipe),
      parametres: {
        delai_relance_jours_ouvres: donnees.parametres.delai_relance_jours_ouvres,
        jours_ouvres: donnees.parametres.jours_ouvres.slice(),
        responsable_par_defaut: donnees.parametres.responsable_par_defaut
      }
    };
  }

  function service(ctx, id) {
    for (var i = 0; i < ctx.services.length; i++) if (ctx.services[i].id === id) return ctx.services[i];
    return null;
  }

  function personne(ctx, id) {
    for (var i = 0; i < ctx.equipe.length; i++) if (ctx.equipe[i].id === id) return ctx.equipe[i];
    return null;
  }

  /** Libellé du service : le catalogue, « Hors catalogue » pour hors_catalogue, « Non indiqué » sinon. */
  function libelleService(ctx, id) {
    if (id === 'hors_catalogue') return 'Hors catalogue';
    var s = id ? service(ctx, id) : null;
    return s ? s.libelle : 'Non indiqué';
  }

  function nomPersonne(ctx, id) {
    var p = id ? personne(ctx, id) : null;
    return p ? p.nom : 'Non attribué';
  }

  return { creer: creer, copie: copie, service: service, personne: personne, libelleService: libelleService, nomPersonne: nomPersonne };
});
