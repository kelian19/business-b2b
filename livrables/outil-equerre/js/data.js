/* Équerre : données de démonstration, ENTIÈREMENT FICTIVES et déterministes.
 *
 * - Les noms d'entreprises sont inventés (ils contiennent « Démo », « Exemple » ou « Fictif »).
 * - Les SIREN sont GÉNÉRÉS pour la démo (9 chiffres avec clé de Luhn valide) : ils ne correspondent
 *   pas aux entreprises affichées. Par hasard, un numéro généré pourrait coïncider avec celui d'une
 *   entreprise réelle sans aucun lien avec elle.
 * - Aucune donnée réelle, aucun client, aucun résultat.
 * Format UMD : module.exports sous Node, variable globale EquerreData dans le navigateur.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EquerreData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Outils de génération (déterministes) ---------- */

  function luhnValid(digits) {
    var sum = 0;
    var alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var n = digits.charCodeAt(i) - 48;
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  /** SIREN fictif : 8 chiffres de base + clé de Luhn. */
  function sirenFromBase(base8) {
    for (var d = 0; d < 10; d++) {
      var s = base8 + d;
      if (luhnValid(s)) return s;
    }
    return null;
  }

  /** SIRET fictif : SIREN + NIC de 5 chiffres (4 chiffres + clé). */
  function siretFrom(siren, nic4) {
    for (var d = 0; d < 10; d++) {
      var s = siren + nic4 + d;
      if (luhnValid(s)) return s;
    }
    return null;
  }

  function tvaKey(siren) {
    var k = (12 + 3 * (parseInt(siren, 10) % 97)) % 97;
    return (k < 10 ? '0' : '') + k;
  }

  function tvaFor(siren) { return 'FR' + tvaKey(siren) + siren; }

  /** Générateur pseudo-aléatoire déterministe (mulberry32). */
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function isoFromDay(dayNumber) {
    var d = new Date(dayNumber * 86400000);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }

  function dayOf(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / 86400000); }

  /* ---------- 1. Fichier de tiers (40 lignes, anomalies injectées) ---------- */

  var rngT = makeRng(20261006);
  function nextBase() {
    var n = 10000000 + Math.floor(rngT() * 89999999);
    return String(n);
  }
  function nextSiren() { return sirenFromBase(nextBase()); }

  var rows = [];
  function tp(type, nom, siren, adresse, cp, ville, extra) {
    var e = extra || {};
    var r = {
      type: type,
      nom: nom,
      siren: e.siren !== undefined ? e.siren : (siren || ''),
      siret: e.siret !== undefined ? e.siret : (siren ? siretFrom(siren, '0001') : ''),
      tva: e.tva !== undefined ? e.tva : (siren ? tvaFor(siren) : ''),
      adresse: adresse,
      code_postal: cp,
      ville: ville,
      pays: e.pays || 'FR',
      livraison_adresse: e.liv ? e.liv[0] : '',
      livraison_code_postal: e.liv ? e.liv[1] : '',
      livraison_ville: e.liv ? e.liv[2] : ''
    };
    rows.push(r);
    return r;
  }

  function grouped(s) { return s.slice(0, 3) + ' ' + s.slice(3, 6) + ' ' + s.slice(6); }
  function wrongDigit(s) {
    // Même longueur, dernier chiffre modifié : la clé de contrôle devient fausse.
    var last = (parseInt(s.slice(-1), 10) + 1) % 10;
    return s.slice(0, -1) + last;
  }

  var s;

  // Clients
  tp('client', 'Négoce Démo Alpha SAS', nextSiren(), '12 rue de l\'Exemple', '69003', 'Lyon');
  s = nextSiren();
  tp('client', 'Fournitures Fictives Bravo SARL', s, 'Zone artisanale Les Tests', '33600', 'Pessac',
    { liv: ['8 chemin du Dépôt', '33610', 'Cestas'] });
  tp('client', 'Atelier Exemple Charlie SAS', nextSiren(), '5 avenue de la Démo', '31000', 'Toulouse');
  tp('client', 'Distribution Fictive Delta SA', nextSiren(), '40 boulevard Imaginaire', '59000', 'Lille');
  tp('client', 'Menuiserie Démo Echo SARL', nextSiren(), '3 impasse du Test', '44000', 'Nantes');
  s = nextSiren();
  tp('client', 'Papeterie Exemple Foxtrot SAS', s, '18 rue Factice', '67000', 'Strasbourg',
    { siren: grouped(s) });                                   // SIREN saisi avec espaces : valide après nettoyage
  tp('client', 'Mécanique Fictive Golf SARL', '', '27 rue des Essais', '38000', 'Grenoble',
    { siren: '', tva: '', siret: '' });                      // SIREN manquant
  s = nextSiren();
  tp('client', 'Plasturgie Démo Hotel SAS', s, '9 allée Fictive', '35000', 'Rennes',
    { siren: grouped(wrongDigit(s)), siret: '', tva: '' });  // SIREN invalide (clé fausse)
  s = nextSiren();
  tp('client', 'Emballages Exemple India SAS', s, '61 quai du Modèle', '76000', 'Rouen',
    { tva: 'FR' + ('0' + ((parseInt(tvaKey(s), 10) + 1) % 97)).slice(-2) + s });  // clé de TVA fausse
  tp('client', 'Matériaux Fictifs Juliett SARL', nextSiren(), '14 route de la Carrière', '', 'Dijon'); // CP manquant
  tp('client', 'Logistique Démo Kilo SAS', nextSiren(), '2 rue du Port Fictif', '13002', 'Marseille',
    { liv: ['Plateforme Sud, 120 avenue du Fret', '13016', 'Marseille'] });
  tp('client', 'Textile Exemple Lima SAS', '', '7 rue de la Maille', '59100', 'Roubaix',
    { siren: '', tva: '', siret: '' });                      // SIREN manquant
  s = nextSiren();
  tp('client', 'Outillage Fictif Mike SARL', s, '33 rue de l\'Atelier', '42000', 'Saint-Étienne',
    { siren: s.slice(0, 3) + '.' + s.slice(3, 6) + '.' + s.slice(6) }); // saisi avec points : valide
  tp('client', 'Peinture Démo November SAS', nextSiren(), '1 place du Pinceau', '21000', 'Dijon');
  var autre = nextSiren();
  tp('client', 'Câblage Exemple Oscar SAS', nextSiren(), '88 rue du Courant', '37000', 'Tours',
    { tva: tvaFor(autre) });                                  // TVA valide mais d'un autre SIREN
  s = nextSiren();
  tp('client', 'Quincaillerie Fictive Papa SARL', s, '4 rue de la Vis', '63000', 'Clermont-Ferrand',
    { siren: s.slice(0, 8), siret: '', tva: '' });          // SIREN à 8 chiffres
  var sQuebec = nextSiren();
  tp('client', 'Agro Démo Quebec SAS', sQuebec, '210 chemin des Champs Fictifs', '49000', 'Angers');
  tp('client', 'AGRO DEMO QUÉBEC SARL', sQuebec, '210 chemin des Champs Fictifs', '49000', 'Angers'); // doublon (même SIREN)
  tp('client', 'Chaudronnerie Exemple Romeo SAS', nextSiren(), '16 rue du Métal', '6200', 'Nice'); // CP à 4 chiffres
  var sSierra = nextSiren();
  tp('client', 'Charpente Fictive Sierra SARL', sSierra, '25 rue du Bois', '72000', 'Le Mans');
  tp('client', 'SARL Charpente Fictive Sierra', '', '25 rue du Bois', '72000', 'Le Mans',
    { siren: '', tva: '', siret: '' });                      // doublon (même nom et même code postal) + SIREN manquant
  tp('client', 'Imprimerie Démo Tango SAS', nextSiren(), '11 rue de l\'Encre', '51100', 'Reims',
    { liv: ['Entrepôt 4, rue du Papier', '51430', 'Bezannes'] });
  tp('client', 'Serrurerie Exemple Uniform SARL', nextSiren(), '6 rue de la Clé', '45000', 'Orléans');
  s = nextSiren();
  tp('client', 'Verrerie Fictive Victor SAS', s, '19 avenue du Verre', '57000', 'Metz',
    { siret: siretFrom(nextSiren(), '0001') });              // SIRET d'un autre SIREN
  s = nextSiren();
  tp('client', 'Fonderie Démo Whiskey SA', s, '50 rue de la Coulée', '25000', 'Besançon',
    { siret: s + '00018' === siretFrom(s, '0001') ? s + '00019' : s + '00018' }); // SIRET à clé fausse
  tp('client', 'Brasserie Exemple Xray SAS', nextSiren(), '22 rue du Houblon', '80000', '',   // ville manquante
    { liv: ['Cave Nord, 3 rue du Fût', '80090', 'Amiens'] });
  // Même nom que la ligne 1 mais autre ville, autre SIREN : n'est PAS un doublon.
  tp('client', 'Négoce Démo Alpha SAS', nextSiren(), '90 rue de Charonne', '75011', 'Paris');

  // Fournisseurs
  tp('fournisseur', 'Acier Démo Yankee SAS', nextSiren(), '100 route de l\'Usine', '54000', 'Nancy');
  tp('fournisseur', 'Transports Fictifs Zulu SARL', nextSiren(), '5 rue du Camion', '69800', 'Saint-Priest');
  tp('fournisseur', 'Énergie Exemple Un SAS', nextSiren(), '1 rue du Watt', '92400', 'Courbevoie');
  tp('fournisseur', 'Informatique Démo Deux SAS', nextSiren(), '17 rue du Code', '34000', 'Montpellier');
  tp('fournisseur', 'Nettoyage Fictif Trois SARL', '', '30 rue de la Serpillière', '31200', 'Toulouse',
    { siren: '', tva: '', siret: '' });                      // SIREN manquant
  tp('fournisseur', 'Emballages Exemple Quatre SAS', nextSiren(), '8 rue du Carton', '62000', 'Arras',
    { tva: 'FR12 ABC' });                                     // TVA mal formée
  var sCinq = nextSiren();
  tp('fournisseur', 'Fournitures Démo Cinq SARL', sCinq, '41 rue du Stock', '87000', 'Limoges');
  tp('fournisseur', 'Fournitures Demo Cinq', sCinq, '41 rue du Stock', '87000', 'Limoges');          // doublon (même SIREN)
  tp('fournisseur', 'Maintenance Fictive Six SAS', nextSiren(), '', '29200', 'Brest');                // adresse manquante
  tp('fournisseur', 'Palettes Exemple Sept SAS', nextSiren(), '13 rue du Bois Fictif', '68000', 'Colmar');
  tp('fournisseur', 'Matières Démo Huit SRL', '', '12 Rue Exemple', '1000', 'Bruxelles',
    { pays: 'BE', siren: '', siret: '', tva: 'BE0123456789' });                                     // étranger : contrôles français sans objet
  tp('fournisseur', 'Location Exemple Dix SAS', nextSiren(), '3 rue du Chariot', '35000', 'Rennes');
  tp('fournisseur', 'Werkzeug Demo Neun GmbH', '', 'Beispielstraße 5', '80331', 'München',
    { pays: 'DE', siren: '', siret: '', tva: 'DE123456789' });

  var tiersRecords = rows;

  /* ---------- 2. Trois factures fictives ---------- */

  var sVendeur = nextSiren();
  var vendeur = {
    nom: 'Société Démo Fournitures SAS',
    siren: sVendeur,
    tva: tvaFor(sVendeur),
    adresse: '10 rue de la Maquette, 69002 Lyon'
  };
  function sirenDe(nom) {
    for (var i = 0; i < tiersRecords.length; i++) { if (tiersRecords[i].nom === nom) return tiersRecords[i].siren; }
    return '';
  }
  // Même SIREN que dans le fichier de tiers pour une même société fictive (cohérence entre les onglets).
  var sC1 = sirenDe('Atelier Exemple Charlie SAS');
  var sC2 = nextSiren();
  var sC3 = sirenDe('Logistique Démo Kilo SAS');

  var factures = [
    {
      id: 'F-DEMO-001',
      titre: 'Facture 1 : aucune mention absente parmi celles contrôlées',
      numero: 'F-DEMO-001',
      dateEmission: '2026-09-15',
      dateEcheance: '2026-10-15',
      vendeur: vendeur,
      client: { nom: 'Atelier Exemple Charlie SAS', siren: sC1, adresse: '5 avenue de la Démo, 31000 Toulouse' },
      livraisonDifferente: false,
      adresseLivraison: '',
      natureOperation: 'Livraison de biens',
      optionDebits: 'Option pour le paiement de la TVA d\'après les débits : oui',
      lignes: [
        { designation: 'Rouleau de tissu technique, 50 m', quantite: 4, prixUnitaireHT: 310.0, tauxTVA: 20 },
        { designation: 'Kit de fixation (lot de 100)', quantite: 10, prixUnitaireHT: 24.5, tauxTVA: 20 }
      ],
      totalHT: 1485.0,
      totalTVA: 297.0,
      totalTTC: 1782.0
    },
    {
      id: 'F-DEMO-002',
      titre: 'Facture 2 : SIREN client et nature de l\'opération absents',
      numero: 'F-DEMO-002',
      dateEmission: '2026-09-18',
      dateEcheance: '2026-10-18',
      vendeur: vendeur,
      client: { nom: 'Distribution Fictive Delta SA', siren: '', adresse: '40 boulevard Imaginaire, 59000 Lille' },
      livraisonDifferente: false,
      adresseLivraison: '',
      natureOperation: '',
      optionDebits: 'Option pour le paiement de la TVA d\'après les débits : oui',
      lignes: [
        { designation: 'Prestation de conditionnement, lot de septembre', quantite: 1, prixUnitaireHT: 2200.0, tauxTVA: 20 }
      ],
      totalHT: 2200.0,
      totalTVA: 440.0,
      totalTTC: 2640.0
    },
    {
      id: 'F-DEMO-003',
      titre: 'Facture 3 : livraison ailleurs non indiquée, option débits absente',
      numero: 'F-DEMO-003',
      dateEmission: '2026-09-22',
      dateEcheance: '2026-10-22',
      vendeur: vendeur,
      client: { nom: 'Logistique Démo Kilo SAS', siren: sC3, adresse: '2 rue du Port Fictif, 13002 Marseille' },
      livraisonDifferente: true,
      adresseLivraison: '',
      natureOperation: 'Livraison de biens et prestation de services',
      optionDebits: '',
      lignes: [
        { designation: 'Palettes de transport (lot de 20)', quantite: 3, prixUnitaireHT: 180.0, tauxTVA: 20 },
        { designation: 'Installation sur site', quantite: 1, prixUnitaireHT: 350.0, tauxTVA: 20 }
      ],
      totalHT: 890.0,
      totalTVA: 178.0,
      totalTTC: 1068.0
    }
  ];
  // sC2 réservé pour garder la séquence de génération stable si une facture est ajoutée.
  void sC2;

  /* ---------- 3. Export de facturation sur 12 mois (150 factures, 10 clients fictifs) ---------- */

  var referenceDate = '2026-10-06';

  var clientsFact = [
    { nom: 'Négoce Démo Alpha SAS', poids: 20, terme: 30, delai: 33, ecart: 6, moy: 4200 },
    { nom: 'Fournitures Fictives Bravo SARL', poids: 16, terme: 30, delai: 28, ecart: 5, moy: 3100 },
    { nom: 'Atelier Exemple Charlie SAS', poids: 14, terme: 45, delai: 50, ecart: 8, moy: 2600 },
    { nom: 'Distribution Fictive Delta SA', poids: 12, terme: 60, delai: 58, ecart: 10, moy: 5200 },
    { nom: 'Menuiserie Démo Echo SARL', poids: 10, terme: 30, delai: 44, ecart: 12, moy: 1800 },
    { nom: 'Papeterie Exemple Foxtrot SAS', poids: 8, terme: 30, delai: 30, ecart: 4, moy: 1200 },
    { nom: 'Mécanique Fictive Golf SARL', poids: 7, terme: 30, delai: 70, ecart: 15, moy: 2400 },
    { nom: 'Plasturgie Démo Hotel SAS', poids: 5, terme: 30, delai: 36, ecart: 8, moy: 3600 },
    { nom: 'Emballages Exemple India SAS', poids: 4, terme: 45, delai: 47, ecart: 6, moy: 900 },
    { nom: 'Matériaux Fictifs Juliett SARL', poids: 4, terme: 30, delai: 95, ecart: 20, moy: 2000, jamaisPaye: 0.4 }
  ];

  function buildExport() {
    var rng = makeRng(777);
    var totalPoids = clientsFact.reduce(function (a, c) { return a + c.poids; }, 0);
    var invoices = [];
    var monthList = [];
    for (var m = 10; m <= 12; m++) monthList.push([2025, m]);
    for (var m2 = 1; m2 <= 9; m2++) monthList.push([2026, m2]);
    var refDay = dayOf(2026, 10, 6);

    monthList.forEach(function (ym, idx) {
      var count = idx % 2 === 0 ? 13 : 12;         // 6 mois à 13 factures, 6 mois à 12 : 150 au total
      for (var k = 0; k < count; k++) {
        var pick = rng() * totalPoids;
        var c = clientsFact[0];
        var acc = 0;
        for (var j = 0; j < clientsFact.length; j++) {
          acc += clientsFact[j].poids;
          if (pick < acc) { c = clientsFact[j]; break; }
        }
        var day = 1 + Math.floor(rng() * 28);
        var emission = dayOf(ym[0], ym[1], day);
        var ht = Math.round((c.moy * (0.4 + rng() * 1.2)) * 100) / 100;
        var ttc = Math.round(ht * 1.2 * 100) / 100;
        var echeance = emission + c.terme;
        var delai = Math.max(3, Math.round(c.delai + (rng() - 0.5) * 2 * c.ecart));
        var jamais = c.jamaisPaye && rng() < c.jamaisPaye;
        var paiement = emission + delai;
        var payee = !jamais && paiement <= refDay;
        invoices.push({
          emission: emission, echeance: echeance, client: c.nom, ht: ht, ttc: ttc,
          payee: payee, paiement: paiement
        });
      }
    });

    invoices.sort(function (a, b) { return a.emission - b.emission; });
    return invoices.map(function (inv, i) {
      return {
        numero: 'F-' + ('0000' + (i + 1)).slice(-4),
        client: inv.client,
        date_emission: isoFromDay(inv.emission),
        date_echeance: isoFromDay(inv.echeance),
        montant_ht: inv.ht.toFixed(2),
        montant_ttc: inv.ttc.toFixed(2),
        statut: inv.payee ? 'payée' : 'non payée',
        date_paiement: inv.payee ? isoFromDay(inv.paiement) : ''
      };
    });
  }

  var exportFacturation = buildExport();

  /* ---------- 4. Entreprise fictive, organisation par défaut, rôles, rapprochement des clients ---------- */

  // Indice de la fiche de tiers (type client) à retenir pour chaque client de l'export : tranche explicitement
  // l'homonyme « Négoce Démo Alpha SAS » (deux fiches, Lyon et Paris, SIREN différents) en faveur de la fiche de Lyon.
  function indexClient(nom) {
    for (var i = 0; i < tiersRecords.length; i++) {
      if (tiersRecords[i].type === 'client' && tiersRecords[i].nom === nom) return i;
    }
    return -1;
  }
  var tiersParClient = {};
  clientsFact.forEach(function (c) { tiersParClient[c.nom] = indexClient(c.nom); });

  return {
    avertissement: 'Données entièrement fictives. Les SIREN sont générés pour la démo et ne correspondent pas aux entreprises affichées.',
    referenceDate: referenceDate,
    entreprise: 'Société Exemple Fictive SAS',
    organisationDefaut: { plateforme: 'non', responsable: 'non', logiciel: 'oui', procedure: 'non' },
    rolesProposes: ['Direction financière', 'Comptabilité', 'Expert-comptable', 'Informatique', 'À désigner'],
    tiersParClient: tiersParClient,
    tiers: tiersRecords,
    factures: factures,
    exportFacturation: exportFacturation
  };
});
