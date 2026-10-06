/* Équerre : indicateurs de reporting à partir de factures normalisées, avec filtres (période, client) et comparaison
 * avec la période précédente de même durée. Logique pure : la date de référence est toujours un paramètre. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./util.js'), require('./csv.js'));
  } else {
    root.Equerre.core.reporting = factory(root.Equerre.core.util, root.Equerre.core.csv);
  }
})(typeof self !== 'undefined' ? self : this, function (U, CSV) {
  'use strict';

  var pad = U.pad;
  var daysBetween = U.daysBetween;

  function cents(x) { return Math.round(x * 100); }
  function eur(c) { return c / 100; }

  function monthRange(first, last) {
    var out = [];
    var y = +first.slice(0, 4);
    var m = +first.slice(5, 7);
    var ly = +last.slice(0, 4);
    var lm = +last.slice(5, 7);
    while (y < ly || (y === ly && m <= lm)) {
      out.push(pad(y, 4) + '-' + pad(m, 2));
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return out;
  }

  var AGE_BUCKETS = [
    { id: '1-30', label: '1 à 30 jours', min: 1, max: 30 },
    { id: '31-60', label: '31 à 60 jours', min: 31, max: 60 },
    { id: '60+', label: 'Plus de 60 jours', min: 61, max: Infinity }
  ];

  /** Indicateurs de reporting à partir de factures normalisées et d'une date de référence (AAAA-MM-JJ).
   *  Montants en euros. Le CA est le total HT de toutes les factures émises (payées ou non).
   *  L'encours et les échues sont en TTC (HT lorsque le TTC n'est pas fourni). */
  function calculer(invoices, refDate) {
    var totalHT = 0;
    var byMonth = {};
    var byClient = {};
    var firstMonth = null;
    var lastMonth = null;
    var encours = 0;
    var encoursHT = 0;
    var nbImpayees = 0;
    var buckets = AGE_BUCKETS.map(function (b) { return { id: b.id, label: b.label, nb: 0, c: 0 }; });
    var aEchoir = { nb: 0, c: 0 };
    var sansEcheance = { nb: 0, c: 0 };
    var delaiTotal = 0;
    var nbPayeesDatees = 0;
    var nbEnRetard = 0;
    var nbPaiementsAnterieurs = 0;   // paiement daté avant l'émission : écarté du délai moyen
    var nbApresReference = 0;        // facture émise après la date de référence : comptée dans le CA, signalée

    invoices.forEach(function (inv) {
      var htC = cents(inv.ht);
      var dueC = inv.ttc === null || inv.ttc === undefined ? htC : cents(inv.ttc);
      totalHT += htC;
      var mois = inv.dateEmission.slice(0, 7);
      byMonth[mois] = (byMonth[mois] || 0) + htC;
      byClient[inv.client] = (byClient[inv.client] || 0) + htC;
      if (!firstMonth || mois < firstMonth) firstMonth = mois;
      if (!lastMonth || mois > lastMonth) lastMonth = mois;
      if (inv.dateEmission > refDate) nbApresReference++;

      if (!inv.paid) {
        nbImpayees++;
        encours += dueC;
        encoursHT += htC;
        if (!inv.dateEcheance) { sansEcheance.nb++; sansEcheance.c += dueC; return; }
        var age = daysBetween(inv.dateEcheance, refDate);
        if (age <= 0) { aEchoir.nb++; aEchoir.c += dueC; return; }
        for (var k = 0; k < AGE_BUCKETS.length; k++) {
          if (age >= AGE_BUCKETS[k].min && age <= AGE_BUCKETS[k].max) {
            buckets[k].nb++;
            buckets[k].c += dueC;
            break;
          }
        }
      } else if (inv.datePaiement) {
        var delai = daysBetween(inv.dateEmission, inv.datePaiement);
        if (delai < 0) { nbPaiementsAnterieurs++; return; }
        nbPayeesDatees++;
        delaiTotal += delai;
        if (inv.dateEcheance && daysBetween(inv.dateEcheance, inv.datePaiement) > 0) nbEnRetard++;
      }
    });

    var parMois = [];
    if (firstMonth) {
      monthRange(firstMonth, lastMonth).forEach(function (m) { parMois.push({ mois: m, ht: eur(byMonth[m] || 0) }); });
    }

    var clients = Object.keys(byClient).map(function (name) { return { client: name, c: byClient[name] }; });
    clients.sort(function (a, b) { return b.c - a.c || (a.client < b.client ? -1 : 1); });
    var top = clients.slice(0, 5).map(function (x) {
      return { client: x.client, ht: eur(x.c), part: totalHT ? x.c / totalHT : 0 };
    });
    var topC = clients.slice(0, 5).reduce(function (s, x) { return s + x.c; }, 0);

    var nbEchues = buckets.reduce(function (s, b) { return s + b.nb; }, 0);
    var echuesC = buckets.reduce(function (s, b) { return s + b.c; }, 0);

    return {
      refDate: refDate,
      nbFactures: invoices.length,
      caHT: eur(totalHT),
      parMois: parMois,
      nbClients: clients.length,
      topClients: top,
      topPart: totalHT ? topC / totalHT : 0,
      autresPart: totalHT ? (totalHT - topC) / totalHT : 0,
      autresHT: eur(totalHT - topC),
      nbImpayees: nbImpayees,
      encours: eur(encours),
      encoursHT: eur(encoursHT),
      echues: {
        nb: nbEchues,
        total: eur(echuesC),
        tranches: buckets.map(function (b) {
          return { id: b.id, label: b.label, nb: b.nb, total: eur(b.c), part: encours ? b.c / encours : 0 };
        })
      },
      aEchoir: { nb: aEchoir.nb, total: eur(aEchoir.c) },
      sansEcheance: { nb: sansEcheance.nb, total: eur(sansEcheance.c) },
      nbPayeesDatees: nbPayeesDatees,
      nbPaiementsAnterieurs: nbPaiementsAnterieurs,
      nbApresReference: nbApresReference,
      delaiMoyenPaiement: nbPayeesDatees ? Math.round((10 * delaiTotal) / nbPayeesDatees) / 10 : null,
      nbPayeesEnRetard: nbEnRetard,
      partPayeesEnRetard: nbPayeesDatees ? nbEnRetard / nbPayeesDatees : null
    };
  }

  /** Factures de la période [du, au] (bornes incluses, facultatives) et du client (nom exact, facultatif). */
  function filtrer(invoices, opts) {
    opts = opts || {};
    var du = opts.du || null;
    var au = opts.au || null;
    var client = opts.client || null;
    if (!du && !au && !client) return invoices;
    var out = [];
    for (var i = 0; i < invoices.length; i++) {
      var inv = invoices[i];
      if (du && inv.dateEmission < du) continue;
      if (au && inv.dateEmission > au) continue;
      if (client && inv.client !== client) continue;
      out.push(inv);
    }
    return out;
  }

  /** Période précédente de même durée, juste avant [du, au] : { du, au, nbJours } ou null. */
  function periodePrecedente(du, au) {
    if (!du || !au) return null;
    var n = U.daysBetween(du, au) + 1;
    if (n < 1) return null;
    return { du: U.addDays(du, -n), au: U.addDays(du, -1), nbJours: n };
  }

  /** Écart en valeur et en part ; null quand l'une des valeurs manque, jamais de division par zéro. */
  function ecart(actuel, precedent) {
    if (actuel === null || actuel === undefined || precedent === null || precedent === undefined) {
      return { actuel: actuel === undefined ? null : actuel, precedent: precedent === undefined ? null : precedent, ecart: null, ecartPct: null };
    }
    return { actuel: actuel, precedent: precedent, ecart: actuel - precedent, ecartPct: precedent ? (actuel - precedent) / Math.abs(precedent) : null };
  }

  function bornes(invoices) {
    var min = null;
    var max = null;
    for (var i = 0; i < invoices.length; i++) {
      var d = invoices[i].dateEmission;
      if (!min || d < min) min = d;
      if (!max || d > max) max = d;
    }
    return { min: min, max: max };
  }

  /** Indicateurs de reporting avec filtres facultatifs et comparaison avec la période précédente de même durée.
   *  opts : { du, au, client }. Tous les indicateurs portent sur les factures filtrées. Une période se choisit en fixant du et/ou au
   *  (la borne absente est celle des données) ; sans période, aucune comparaison. */
  function computeReporting(invoices, refDate, opts) {
    opts = opts || {};
    var parClient = filtrer(invoices, { client: opts.client });
    var sel = filtrer(parClient, { du: opts.du, au: opts.au });
    var r = calculer(sel, refDate);
    var nb = r.parMois.length;
    r.moyenneMensuelle = nb ? Math.round(r.caHT * 100 / nb) / 100 : null;
    var max = null;
    var min = null;
    r.parMois.forEach(function (m) {
      if (!max || m.ht > max.ht) max = m;
      if (!min || m.ht < min.ht) min = m;
    });
    r.moisMax = max;
    r.moisMin = min;
    r.periode = { du: opts.du || null, au: opts.au || null, client: opts.client || null, filtre: !!(opts.du || opts.au || opts.client) };
    r.comparaison = null;
    if (opts.du || opts.au) {
      var b = bornes(parClient);
      var du = opts.du || b.min;
      var au = opts.au || b.max;
      var prec = du && au ? periodePrecedente(du, au) : null;
      if (prec) {
        var p = calculer(filtrer(parClient, { du: prec.du, au: prec.au }), refDate);
        r.comparaison = {
          periode: { du: du, au: au, nbJours: prec.nbJours }, precedente: { du: prec.du, au: prec.au },
          videActuel: r.nbFactures === 0, videPrecedent: p.nbFactures === 0,
          caHT: ecart(r.caHT, p.caHT), nbFactures: ecart(r.nbFactures, p.nbFactures), encours: ecart(r.encours, p.encours),
          delaiMoyenPaiement: ecart(r.delaiMoyenPaiement, p.delaiMoyenPaiement)
        };
      }
    }
    return r;
  }

  /** Liste triée des clients distincts d'un ensemble de factures (pour le filtre par client). */
  function listeClients(invoices) {
    var vus = new Set();
    var out = [];
    for (var i = 0; i < invoices.length; i++) {
      var c = invoices[i].client;
      if (!vus.has(c)) { vus.add(c); out.push(c); }
    }
    out.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
    return out;
  }

  function n1(x) { return x === null || x === undefined ? '' : (Math.round(x * 10) / 10).toFixed(1).replace('.', ','); }
  function n2(x) { return x === null || x === undefined ? '' : (Math.round(x * 100) / 100).toFixed(2).replace('.', ','); }
  function ent(x) { return x === null || x === undefined ? '' : String(x); }
  function pct(x) { return x === null || x === undefined ? '' : n1(x * 100); }
  function jour(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }

  /** CSV du reporting filtré (fichier plat : section, libellé, valeur, complément). Montants en euros, parts en %. */
  function reportingToCsv(r) {
    var rows = [];
    function add(section, libelle, valeur, complement) { rows.push([section, libelle, valeur, complement || '']); }
    add('Filtre', 'Date de référence', jour(r.refDate), '');
    add('Filtre', 'Période', r.periode.du || r.periode.au ? (jour(r.periode.du) || 'début des données') + ' au ' + (jour(r.periode.au) || 'fin des données') : 'Toutes les factures', '');
    add('Filtre', 'Client', r.periode.client || 'Tous les clients', '');
    add('Indicateur', 'Chiffre d\'affaires HT', n2(r.caHT), 'euros ; ' + r.nbFactures + ' factures, ' + r.nbClients + ' clients');
    add('Indicateur', 'Encours non payé TTC', n2(r.encours), 'euros ; ' + r.nbImpayees + ' factures');
    add('Indicateur', 'Factures échues TTC', n2(r.echues.total), 'euros ; ' + r.echues.nb + ' factures');
    add('Indicateur', 'Délai moyen de paiement', n1(r.delaiMoyenPaiement), 'jours');
    add('Indicateur', 'Payées en retard', pct(r.partPayeesEnRetard), '% des factures payées datées');
    add('Indicateur', 'Part des 5 premiers clients', pct(r.topPart), '% du CA HT');
    add('Indicateur', 'Moyenne mensuelle du CA HT', n2(r.moyenneMensuelle), 'euros');
    r.parMois.forEach(function (m) { add('CA mensuel', m.mois, n2(m.ht), 'euros HT'); });
    r.topClients.forEach(function (c) { add('Cinq premiers clients', c.client, n2(c.ht), pct(c.part) + ' % du CA HT'); });
    r.echues.tranches.forEach(function (t) { add('Encours par ancienneté', t.label, n2(t.total), t.nb + ' factures, TTC'); });
    add('Encours par ancienneté', 'Pas encore échues', n2(r.aEchoir.total), r.aEchoir.nb + ' factures, TTC');
    if (r.sansEcheance.nb) add('Encours par ancienneté', 'Sans date d\'échéance', n2(r.sansEcheance.total), r.sansEcheance.nb + ' factures, TTC');
    if (r.comparaison) {
      var c = r.comparaison;
      add('Comparaison', 'Période précédente', jour(c.precedente.du) + ' au ' + jour(c.precedente.au), 'même durée');
      [['Chiffre d\'affaires HT', c.caHT, n2], ['Nombre de factures', c.nbFactures, ent], ['Encours non payé TTC', c.encours, n2], ['Délai moyen de paiement', c.delaiMoyenPaiement, n1]].forEach(function (x) {
        var e = x[1];
        add('Comparaison', x[0], x[2](e.actuel), 'précédente : ' + x[2](e.precedent) + ' ; écart : ' + (e.ecart === null ? 'non calculable' : x[2](e.ecart)) +
          (e.ecartPct === null ? '' : ' ; ' + pct(e.ecartPct) + ' %'));
      });
    }
    return CSV.toCsv(['section', 'libelle', 'valeur', 'complement'], rows);
  }

  return {
    AGE_BUCKETS: AGE_BUCKETS,
    filtrer: filtrer,
    periodePrecedente: periodePrecedente,
    computeReporting: computeReporting,
    listeClients: listeClients,
    reportingToCsv: reportingToCsv
  };
});
