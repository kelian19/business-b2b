/* Flow Inbox : lignes du tableau de suivi (une ligne par demande, c'est-à-dire par fil), tri, filtres, export CSV, aperçu du tableau.
 * Le budget garde le type annoncé (exact, fourchette, à partir de, plafond, approximatif, incertain) : c'est un budget DÉCLARÉ, non garanti. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./dates.js'), require('./format.js'), require('./contexte.js'), require('./demandes.js'), require('./csv.js'));
  } else {
    var FI = root.FlowInbox = root.FlowInbox || { core: {}, ui: {}, views: {} };
    FI.core.suivi = factory(FI.core.dates, FI.core.format, FI.core.contexte, FI.core.demandes, FI.core.csv);
  }
})(typeof self !== 'undefined' ? self : this, function (Dates, Fmt, Ctx, Dem, Csv) {
  'use strict';

  var COLONNES = [
    { id: 'recu', libelle: 'Date de réception' },
    { id: 'entreprise', libelle: 'Entreprise' },
    { id: 'contact', libelle: 'Contact' },
    { id: 'service', libelle: 'Service' },
    { id: 'budget', libelle: 'Budget déclaré (non garanti)' },
    { id: 'delai', libelle: 'Délai' },
    { id: 'statut', libelle: 'Statut' },
    { id: 'responsable', libelle: 'Responsable' },
    { id: 'reponse', libelle: 'Première réponse' },
    { id: 'relance', libelle: 'Relance due' }
  ];

  /** Montant le plus parlant d'un budget relevé, pour le tri (null si absent ou illisible). */
  function montantTri(releve) {
    var v = releve && releve.valeur;
    if (!v) return null;
    return v.min !== null && v.min !== undefined ? v.min : v.max;
  }

  /** Texte de la colonne « Relance due » et état associé. */
  function relanceDe(item, retardsParFil, delai) {
    var r = retardsParFil[item.fil];
    if (!r) return { etat: 'sans_objet', texte: 'Sans objet', retard: 0 };
    if (r.enRetard) {
      return { etat: 'retard', retard: r.anciennete, texte: 'Oui, depuis le ' + Dates.fmtDate(r.dateRetard) + ' (' + Dates.fmtJoursOuvres(r.anciennete) + ' sans réponse)' };
    }
    return { etat: 'surveiller', retard: 0, texte: 'Pas encore : à partir du ' + Dates.fmtDate(r.dateRetard) };
  }

  /**
   * Lignes du tableau de suivi : une par demande (fil), hors doublons ; les messages classés sans suite
   * (fournisseurs, candidatures, démarchages, indésirables, messages ignorés) ne sont inclus qu'à la demande.
   * opts : { ref, delai, jours, inclureClasses }.
   */
  function lignes(emails, ctx, opts) {
    var delai = opts.delai;
    var rel = Dem.relances(emails, opts.ref, delai, opts.jours);
    var parFil = {};
    rel.enRetard.concat(rel.aSurveiller).forEach(function (it) { parFil[it.fil] = it; });
    var res = [];
    Dem.fils(emails).forEach(function (f) {
      var statut = Dem.statutFil(f.messages);
      if (f.messages.every(function (m) { return m.traitement.statut === 'doublon'; })) return;
      if (statut === 'classe_sans_suite' && !opts.inclureClasses) return;
      var contact = Dem.champFil(f.messages, 'contact', false);
      var service = Dem.champFil(f.messages, 'service', false);
      var budget = Dem.champFil(f.messages, 'budget', true);
      var delaiR = Dem.champFil(f.messages, 'delai', true);
      var resp = Dem.responsableFil(f.messages);
      var rep = Dem.premiereReponseFil(f.messages);
      var rl = relanceDe({ fil: f.fil }, parFil, delai);
      var nomContact = contact.statut !== 'absent' && contact.valeur ? contact.valeur.nom : f.lead.de.nom;
      var mailContact = contact.statut !== 'absent' && contact.valeur ? contact.valeur.email : f.lead.de.adresse;
      var serviceId = service.statut !== 'absent' ? service.valeur : null;
      res.push({
        fil: f.fil, id: f.lead.id, ids: f.messages.map(function (m) { return m.id; }),
        recu: f.lead.date,
        entreprise: Dem.entrepriseFil(f.messages),
        contact: nomContact, contactMail: mailContact,
        serviceId: serviceId, service: Ctx.libelleService(ctx, serviceId),
        budget: Fmt.budgetCellule(budget), budgetTri: montantTri(budget), budgetStatut: budget.statut,
        delai: Fmt.delaiCellule(delaiR), delaiTri: delaiR.valeur && delaiR.valeur.date ? delaiR.valeur.date : null,
        statutId: statut,
        responsableId: resp, responsable: Ctx.nomPersonne(ctx, resp),
        reponse: rep,
        relance: rl.texte, relanceEtat: rl.etat, relanceRetard: rl.retard
      });
    });
    return res;
  }

  /** Texte de chaque cellule telle qu'exportée (dates au format AAAA-MM-JJ hh:mm pour se trier dans un tableur). */
  function cellulesTexte(row, libellesStatut) {
    function iso(d) { return d ? d.slice(0, 10) + ' ' + d.slice(11, 16) : 'Aucune'; }
    return [
      iso(row.recu), row.entreprise, row.contact + ' <' + row.contactMail + '>', row.service, row.budget, row.delai,
      libellesStatut[row.statutId] || row.statutId, row.responsable, row.reponse ? iso(row.reponse) : 'Aucune', row.relance
    ];
  }

  function trier(rows, colonne, sens, libellesStatut) {
    var dir = sens === 'desc' ? -1 : 1;
    var cle = {
      recu: function (r) { return r.recu; },
      entreprise: function (r) { return Fmt.norm(r.entreprise); },
      contact: function (r) { return Fmt.norm(r.contact); },
      service: function (r) { return Fmt.norm(r.service); },
      budget: function (r) { return r.budgetTri; },
      delai: function (r) { return r.delaiTri; },
      statut: function (r) { return Fmt.norm(libellesStatut ? libellesStatut[r.statutId] : r.statutId); },
      responsable: function (r) { return Fmt.norm(r.responsable); },
      reponse: function (r) { return r.reponse; },
      relance: function (r) { return r.relanceEtat === 'retard' ? -r.relanceRetard : r.relanceEtat === 'surveiller' ? 1 : 2; }
    }[colonne] || function (r) { return r.recu; };
    return rows.slice().sort(function (a, b) {
      var x = cle(a), y = cle(b);
      var nx = x === null || x === undefined, ny = y === null || y === undefined;
      if (nx || ny) return nx && ny ? (a.recu < b.recu ? -1 : 1) : nx ? 1 : -1; // valeurs vides toujours en dernier
      var c = x < y ? -1 : x > y ? 1 : 0;
      return c ? c * dir : (a.recu < b.recu ? -1 : a.recu > b.recu ? 1 : 0);
    });
  }

  /** Filtres : statut, service, responsable (identifiants, « » = tous) et texte libre. */
  function filtrer(rows, f) {
    f = f || {};
    var mots = Fmt.norm(f.texte).split(/\s+/).filter(Boolean);
    return rows.filter(function (r) {
      if (f.statut && r.statutId !== f.statut) return false;
      if (f.service && (r.serviceId || 'aucun') !== f.service) return false;
      if (f.responsable && (r.responsableId || 'aucun') !== f.responsable) return false;
      if (mots.length) {
        var foin = Fmt.norm([r.entreprise, r.contact, r.contactMail, r.service, r.budget, r.delai, r.responsable].join(' '));
        return mots.every(function (m) { return foin.indexOf(m) >= 0; });
      }
      return true;
    });
  }

  function entetesCsv() { return COLONNES.map(function (c) { return c.libelle; }); }

  function versCsv(rows, libellesStatut) {
    return Csv.versCsv(entetesCsv(), rows.map(function (r) { return cellulesTexte(r, libellesStatut); }));
  }

  /** Aperçu de ce qui serait écrit dans le tableau Google Sheets : mêmes cellules que le CSV (formules neutralisées), premières lignes seulement. */
  function apercuSheets(rows, libellesStatut, n) {
    var max = n || 5;
    return {
      lettres: COLONNES.map(function (c, i) { return String.fromCharCode(65 + i); }),
      entetes: entetesCsv(),
      lignes: rows.slice(0, max).map(function (r) { return cellulesTexte(r, libellesStatut).map(Csv.neutraliser); }),
      restantes: Math.max(0, rows.length - max)
    };
  }

  return { COLONNES: COLONNES, lignes: lignes, trier: trier, filtrer: filtrer, cellulesTexte: cellulesTexte, entetesCsv: entetesCsv, versCsv: versCsv, apercuSheets: apercuSheets };
});
