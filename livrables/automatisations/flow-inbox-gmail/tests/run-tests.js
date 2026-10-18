'use strict';
// Tests sans dépendance : node livrables/automatisations/flow-inbox-gmail/tests/run-tests.js
// Les services Google (Gmail, Sheets, verrou, déclencheurs) sont simulés en mémoire.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const dossier = path.join(__dirname, '..');
const sources = ['logique.gs', 'Code.gs'].map(f => fs.readFileSync(path.join(dossier, f), 'utf8'));

let reussis = 0;
const echecs = [];
function test(nom, fn) {
  try { fn(); reussis++; } catch (e) { echecs.push(nom + '\n    ' + (e.stack || e).toString().split('\n').slice(0, 3).join('\n    ')); }
}

// ---------------------------------------------------------------------------
// Simulation Google
// ---------------------------------------------------------------------------
function creerEnvironnement(options) {
  options = options || {};
  const BOITE = 'contact@agence.example';
  const etat = { feuilles: {}, libelles: {}, fils: [], brouillons: [], envois: 0, declencheurs: [], echecBrouillon: 0 };

  class Plage {
    constructor(f, l, c, nl, nc) { Object.assign(this, { f, l, c, nl: nl || 1, nc: nc || 1 }); }
    getValues() {
      const out = [];
      for (let i = 0; i < this.nl; i++) {
        const ligne = [];
        for (let j = 0; j < this.nc; j++) {
          const v = (this.f.data[this.l - 1 + i] || [])[this.c - 1 + j];
          ligne.push(v === undefined ? '' : v);
        }
        out.push(ligne);
      }
      return out;
    }
    getValue() { return this.getValues()[0][0]; }
    setValues(v) { v.forEach((ligne, i) => ligne.forEach((x, j) => this.f.set(this.l + i, this.c + j, x))); return this; }
    setValue(x) { this.f.set(this.l, this.c, x); return this; }
  }
  class Feuille {
    constructor(nom) { this.nom = nom; this.data = []; }
    set(l, c, x) { while (this.data.length < l) this.data.push([]); this.data[l - 1][c - 1] = x; }
    getRange(l, c, nl, nc) { return new Plage(this, l, c, nl, nc); }
    getLastRow() { return this.data.length; }
    appendRow(v) { this.data.push(v.slice()); }
    setFrozenRows() {}
  }
  const classeur = {
    getSheetByName: n => etat.feuilles[n] || null,
    insertSheet: n => (etat.feuilles[n] = new Feuille(n))
  };

  let idSuivant = 1;
  function message(fil, d) {
    const m = {
      id: 'm' + (idSuivant++), fil, de: d.de, repondreA: d.repondreA || '', objet: d.objet || '(sans objet)',
      corps: d.corps || '', date: d.date || new Date('2026-10-01T09:00:00Z'), entetes: d.entetes || {}, brouillon: false,
      getId() { return this.id; }, getFrom() { return this.de; }, getReplyTo() { return this.repondreA; },
      getSubject() { return this.objet; }, getPlainBody() { return this.corps; }, getDate() { return this.date; },
      getHeader(n) { return this.entetes[n] || ''; }, isDraft() { return this.brouillon; }, getThread() { return this.fil; },
      createDraftReply(texte) {
        if (etat.echecBrouillon > 0) { etat.echecBrouillon--; throw new Error('Gmail indisponible (simulé)'); }
        const b = message(this.fil, { de: BOITE, objet: 'Re: ' + this.objet, corps: texte, date: new Date() });
        b.brouillon = true;
        this.fil.messages.push(b);
        etat.brouillons.push(b);
        return { getMessage: () => b };
      },
      reply() { etat.envois++; }, forward() { etat.envois++; }
    };
    return m;
  }
  function ajouterFil(d, libelles) {
    const fil = {
      id: 't' + (idSuivant++), messages: [], libelles: new Set(libelles || ['Flow Inbox/À traiter']),
      getId() { return this.id; }, getMessages() { return this.messages.slice(); },
      addLabel(l) { this.libelles.add(l.nom); return this; }
    };
    fil.messages.push(message(fil, d));
    etat.fils.push(fil);
    return fil;
  }
  function repondre(fil, date) {
    fil.messages.push(message(fil, { de: 'Équipe <' + BOITE + '>', objet: 'Re', corps: 'réponse', date }));
  }

  const GmailApp = {
    search(q, debut, max) {
      const inclus = /label:"([^"]+)"\s+-label:"([^"]+)"/.exec(q);
      return etat.fils.filter(f => f.libelles.has(inclus[1]) && !f.libelles.has(inclus[2])).slice(debut, debut + max);
    },
    getUserLabelByName: n => etat.libelles[n] || null,
    createLabel: n => (etat.libelles[n] = { nom: n }),
    getDrafts: () => etat.brouillons.map(b => ({ getMessage: () => b })),
    getMessageById: id => { for (const f of etat.fils) for (const m of f.messages) if (m.id === id) return m; return null; },
    sendEmail() { etat.envois++; }
  };
  const tz = 'Europe/Paris';
  const contexte = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => classeur, getUi: () => ({ createMenu: () => { const m = { addItem: () => m, addSeparator: () => m, addToUi: () => m }; return m; } }) },
    GmailApp,
    Session: { getEffectiveUser: () => ({ getEmail: () => BOITE }), getScriptTimeZone: () => tz },
    LockService: { getScriptLock: () => ({ tryLock: () => options.verrouOccupe ? false : true, releaseLock() {} }) },
    Utilities: { formatDate: (d, z) => new Intl.DateTimeFormat('sv-SE', { timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d) },
    ScriptApp: {
      newTrigger: nom => { const t = { timeBased: () => t, everyMinutes: () => t, everyHours: () => t, create: () => { etat.declencheurs.push({ getHandlerFunction: () => nom }); } }; return t; },
      getProjectTriggers: () => etat.declencheurs.slice(),
      deleteTrigger: t => { etat.declencheurs.splice(etat.declencheurs.indexOf(t), 1); }
    },
    Date
  };
  vm.createContext(contexte);
  sources.forEach((s, i) => vm.runInContext(s, contexte, { filename: ['logique.gs', 'Code.gs'][i] }));
  return { c: contexte, etat, ajouterFil, repondre, BOITE,
    suivi: () => etat.feuilles['Suivi'].data.slice(1),
    col: nom => contexte.FI_COLONNES.indexOf(nom),
    regler: (cle, valeur) => { const f = etat.feuilles['Réglages']; const l = f.data.findIndex(x => x[0] === cle); f.data[l][1] = valeur; } };
}

const SERVICES = creerEnvironnement().c.FI_SERVICES_DEFAUT.map(l => ({ code: l[0], libelle: l[1], mots: l[2].split(';').map(s => s.trim()) }));
const L = creerEnvironnement().c;
const REG = { adresse: 'contact@agence.example', max_caracteres: 20000, signature: 'L\'équipe' };
const qualifier = (corps, extra) => JSON.parse(JSON.stringify(L.fiQualifier(Object.assign({ de: 'client@pme.example', objet: 'Demande', texte: corps }, extra || {}), SERVICES, REG)));

// ---------------------------------------------------------------------------
// Montants
// ---------------------------------------------------------------------------
const budget = t => JSON.parse(JSON.stringify(L.fiReleverBudget(t)));
test('montant simple avec espace', () => { const b = budget('Notre budget est de 5 000 € HT.'); assert.strictEqual(b.budget.min, 5000); assert.strictEqual(b.budget.max, 5000); assert.ok(!b.ambigu); });
test('montant collé', () => assert.strictEqual(budget('budget 3500€').budget.min, 3500));
test('montant en euros écrit', () => assert.strictEqual(budget('environ 1200 euros').budget.max, 1200));
test('k€', () => assert.strictEqual(budget('autour de 8k€').budget.min, 8000));
test('k € avec espace', () => assert.strictEqual(budget('autour de 8 k€').budget.min, 8000));
test('décimales', () => assert.strictEqual(budget('2 500,50 €').budget.min, 2500.5));
test('plage entre … et … €', () => { const b = budget('entre 4 000 et 6 000 €').budget; assert.deepStrictEqual([b.min, b.max], [4000, 6000]); });
test('plage avec deux symboles', () => { const r = budget('entre 4 000 € et 6 000 €'); assert.deepStrictEqual([r.budget.min, r.budget.max], [4000, 6000]); assert.ok(!r.ambigu); });
test('plage de … à … k€', () => { const b = budget('de 5 à 8 k€').budget; assert.deepStrictEqual([b.min, b.max], [5000, 8000]); });
test('plage inversée refusée et signalée', () => { const r = budget('entre 6 000 et 4 000 €'); assert.strictEqual(r.budget, null); assert.ok(r.ambigu); });
test('plancher', () => { const b = budget('à partir de 2 000 €').budget; assert.strictEqual(b.min, 2000); assert.strictEqual(b.max, null); });
test('plafond', () => { const b = budget('maximum 3 000 €').budget; assert.strictEqual(b.min, null); assert.strictEqual(b.max, 3000); });
test('séparateur point = ambigu', () => { const r = budget('budget 5.000 €'); assert.strictEqual(r.budget, null); assert.ok(r.ambigu); });
test('mention vague = ambigu', () => { const r = budget('quelques milliers d\'euros'); assert.strictEqual(r.budget, null); assert.ok(r.ambigu); });
test('deux montants différents', () => assert.strictEqual(budget('site à 3 000 € et logo à 800 €').nombre, 2));
test('même montant répété = un seul', () => assert.strictEqual(budget('5 000 € ... je confirme 5 000 €').budget.min, 5000));
test('pas de montant', () => { const r = budget('Bonjour, nous voulons un site.'); assert.strictEqual(r.budget, null); assert.strictEqual(r.nombre, 0); assert.ok(!r.ambigu); });
test('téléphone non lu comme montant', () => assert.strictEqual(budget('Appelez le 06 12 34 56 78').nombre, 0));
test('pourcentage non lu', () => assert.strictEqual(budget('TVA 20 %').nombre, 0));

// ---------------------------------------------------------------------------
// Délais
// ---------------------------------------------------------------------------
const delai = t => L.fiReleverDelai(t);
test('date complète jj/mm/aaaa', () => assert.strictEqual(delai('livraison le 15/03/2027').date_iso, '2027-03-15'));
test('date impossible non convertie', () => { const d = delai('le 31/02/2027'); assert.strictEqual(d.date_iso, null); assert.ok(d.texte.includes('31/02/2027')); });
test('date en lettres avec année', () => assert.strictEqual(delai('pour le 1er avril 2027').date_iso, '2027-04-01'));
test('date en lettres sans année : pas d\'année inventée', () => { const d = delai('pour le 12 mars'); assert.strictEqual(d.date_iso, null); assert.strictEqual(d.texte, '12 mars'); });
test('jj/mm sans année', () => { const d = delai('avant le 15/12'); assert.strictEqual(d.date_iso, null); assert.ok(d.texte.includes('15/12')); });
test('fin de mois', () => assert.ok(/fin novembre/i.test(delai('en ligne d\'ici fin novembre').texte)));
test('février avec accent', () => assert.ok(/février/.test(delai('lancement en février').texte)));
test('en + mois', () => assert.strictEqual(delai('on vise en mars').texte, 'en mars'));
test('sous deux semaines', () => assert.ok(/sous deux semaines/.test(delai('il nous le faut sous deux semaines').texte)));
test('urgent', () => assert.strictEqual(delai('C\'est urgent.').texte.toLowerCase(), 'urgent'));
test('plusieurs expressions : texte gardé, pas de date', () => { const d = delai('maquette fin février, mise en ligne le 15/03/2027'); assert.strictEqual(d.date_iso, null); assert.ok(d.texte.includes(';')); });
test('aucun délai', () => assert.strictEqual(delai('Nous voulons un logo.'), null));

// ---------------------------------------------------------------------------
// Qualification
// ---------------------------------------------------------------------------
test('demande claire complète → brouillon', () => {
  const q = qualifier('Bonjour, nous souhaitons une refonte de notre site internet, budget 6 000 €, en ligne d\'ici fin janvier.');
  assert.strictEqual(q.perimetre, 'commercial'); assert.strictEqual(q.service.code, 'site');
  assert.deepStrictEqual(q.manquants, []); assert.ok(q.brouillon); assert.strictEqual(q.statut, 'Brouillon prêt');
});
test('budget absent → à demander', () => {
  const q = qualifier('Nous aimerions créer notre logo pour mars.');
  assert.deepStrictEqual(q.manquants, ['budget']); assert.ok(q.brouillon);
});
test('budget et délai absents', () => assert.deepStrictEqual(qualifier('Besoin d\'un devis pour du référencement naturel.').manquants, ['budget', 'delai']));
test('plusieurs services → à revoir', () => {
  const q = qualifier('Nous voulons un site vitrine et un logo, budget 4 000 €.');
  assert.ok(q.raisons.includes('PLUSIEURS_SERVICES')); assert.ok(!q.brouillon); assert.strictEqual(q.statut, 'À revoir');
});
test('demande commerciale sans service connu → à revoir', () => {
  const q = qualifier('Bonjour, nous avons un projet de traduction, pouvez-vous nous faire un devis ?');
  assert.ok(q.raisons.includes('SERVICE_INCONNU')); assert.ok(!q.brouillon);
});
test('candidature → hors périmètre', () => assert.strictEqual(qualifier('Veuillez trouver ma candidature et mon CV.').statut, 'Hors périmètre'));
test('candidature mentionnant un site → incertain', () => {
  const q = qualifier('Candidature : je crée des sites internet, voici mon CV.');
  assert.strictEqual(q.perimetre, 'incertain'); assert.strictEqual(q.statut, 'À revoir');
});
test('réponse automatique → hors', () => assert.strictEqual(qualifier('Merci pour votre devis de site.', { entetes: { auto_submitted: 'auto-replied' } }).statut, 'Hors périmètre'));
test('Auto-Submitted: no ignoré', () => assert.ok(qualifier('Refonte de site, budget 3 000 €, pour mars.', { entetes: { auto_submitted: 'no' } }).brouillon));
test('demande de newsletter = commerciale', () => assert.strictEqual(qualifier('Nous voulons lancer une newsletter mensuelle, budget 300 €.').service.code, 'emailing'));
test('arnaque au colis → hors', () => assert.strictEqual(qualifier('Votre colis est en attente, confirmez vos informations de paiement.').statut, 'Hors périmètre'));
test('liste de diffusion → hors', () => assert.strictEqual(qualifier('Nouveau : refonte de site', { entetes: { list_unsubscribe: '<mailto:x@y.example>' } }).statut, 'Hors périmètre'));
test('message de la boîte elle-même → hors', () => assert.strictEqual(qualifier('Projet de site', { de: 'contact@agence.example' }).statut, 'Hors périmètre'));
test('reply-to différent → à revoir', () => {
  const q = qualifier('Refonte de site, budget 3 000 €, pour mars.', { repondre_a: 'autre@ailleurs.example' });
  assert.ok(q.raisons.includes('REPONDRE_A_DIFFERENT')); assert.ok(!q.brouillon);
});
test('démarchage reçu → à revoir', () => {
  const q = qualifier('Je me permets de vous contacter : nous proposons du netlinking pour votre référencement.');
  assert.ok(q.raisons.includes('DEMARCHAGE_POSSIBLE')); assert.ok(!q.brouillon);
});
test('texte vide → à revoir', () => assert.ok(qualifier('', { objet: 'Devis site' }).raisons.includes('TEXTE_VIDE')));
test('texte trop long → à revoir', () => assert.ok(qualifier('refonte de site. ' + 'x'.repeat(20001)).raisons.includes('TEXTE_LONG')));
test('montant ambigu → à revoir, budget non demandé', () => {
  const q = qualifier('Refonte de site, budget 5.000 €, pour mars.');
  assert.ok(q.raisons.includes('BUDGET_A_VERIFIER')); assert.ok(!q.manquants.includes('budget')); assert.ok(!q.brouillon);
});
test('mot-clé inclus dans un autre mot ignoré', () => assert.strictEqual(qualifier('Nous préparons un parasite projet ?').service, null));
test('accents et majuscules tolérés', () => assert.strictEqual(qualifier('REFERENCEMENT NATUREL, devis svp').service.code, 'seo'));

// ---------------------------------------------------------------------------
// Brouillon et cellules
// ---------------------------------------------------------------------------
test('brouillon demande les manquants', () => {
  const t = L.fiTexteBrouillon(qualifier('Besoin d\'un devis pour du référencement naturel.'), REG);
  assert.ok(t.includes('l\'enveloppe budgétaire envisagée et l\'échéance souhaitée')); assert.ok(t.includes('votre référencement')); assert.ok(t.endsWith('L\'équipe'));
});
test('brouillon complet sans question', () => assert.ok(L.fiTexteBrouillon(qualifier('Refonte de site, budget 3 000 €, pour le 15/03/2027.'), REG).includes('revenons vers vous')));
test('question complémentaire ajoutée', () => assert.ok(L.fiTexteBrouillon(qualifier('Refonte de site, budget 3 000 €, pour mars.'), Object.assign({}, REG, { question: 'le nombre de pages ?' })).includes('préciser le nombre de pages ?')));
test('modèle personnalisé utilisé', () => assert.strictEqual(L.fiTexteBrouillon(qualifier('Refonte de site, budget 3 000 €, pour mars.'), Object.assign({}, REG, { modele: 'Salut. {questions}' })), 'Salut. Nous étudions votre demande et revenons vers vous pour convenir des prochaines étapes.'));
test('modèle sans {questions} ignoré', () => assert.ok(L.fiTexteBrouillon(qualifier('Refonte de site, budget 3 000 €, pour mars.'), Object.assign({}, REG, { modele: 'Salut' })).startsWith('Bonjour')));
test('brouillon refusé si non qualifié', () => assert.throws(() => L.fiTexteBrouillon(qualifier('Veuillez trouver ma candidature.'), REG), /BROUILLON_NON_QUALIFIE/));
test('cellule formule neutralisée', () => { assert.strictEqual(L.fiCelluleSure('=HYPERLINK("x")'), '\'=HYPERLINK("x")'); assert.strictEqual(L.fiCelluleSure(' +33'), '\' +33'); assert.strictEqual(L.fiCelluleSure('Bonjour'), 'Bonjour'); });
test('retard selon le délai', () => { assert.ok(L.fiEnRetard('Brouillon prêt', 0, 24 * 3600000, 24)); assert.ok(!L.fiEnRetard('Brouillon prêt', 0, 23 * 3600000, 24)); assert.ok(!L.fiEnRetard('Clos', 0, 1e12, 24)); });

// ---------------------------------------------------------------------------
// Parcours complet avec Gmail et Sheets simulés
// ---------------------------------------------------------------------------
function scenario() {
  const e = creerEnvironnement();
  e.c.installer();
  e.ajouterFil({ de: 'Marie <marie@pme.example>', objet: 'Refonte site', corps: 'Nous souhaitons une refonte de notre site internet, budget 6 000 €, d\'ici fin janvier.' });
  e.ajouterFil({ de: 'paul@pme.example', objet: 'Logo', corps: 'Nous aimerions créer notre logo.' });
  e.ajouterFil({ de: 'jobs@candidat.example', objet: 'Candidature', corps: 'Veuillez trouver ma candidature et mon CV.' });
  e.ajouterFil({ de: 'x@pme.example', objet: '=1+1', corps: 'Un site internet et un logo, budget 4 000 €.' });
  e.ajouterFil({ de: 'hors@pme.example', objet: 'Sans libellé', corps: 'Refonte de site' }, ['INBOX']);
  return e;
}

test('installation : onglets, réglages, libellés, mode Essai', () => {
  const e = creerEnvironnement(); const r = e.c.installer();
  ['Suivi', 'Réglages', 'Services', 'Journal'].forEach(n => assert.ok(e.etat.feuilles[n], n));
  assert.ok(e.etat.libelles['Flow Inbox/À traiter'] && e.etat.libelles['Flow Inbox/Traité']);
  assert.strictEqual(r.mode, 'Essai'); assert.strictEqual(r.adresse, e.BOITE);
});
test('réinstallation sans écraser les réglages', () => {
  const e = creerEnvironnement(); e.c.installer(); e.regler('Signature', 'Studio X'); e.c.installer();
  assert.strictEqual(e.c.fiLireReglages().signature, 'Studio X');
});
test('réglage invalide signalé', () => {
  const e = creerEnvironnement(); e.c.installer(); e.regler('Délai de réponse (heures)', 'abc');
  assert.throws(() => e.c.fiLireReglages(), /Délai de réponse/);
});
test('mode Essai : lignes sans brouillon', () => {
  const e = scenario(); const b = e.c.traiterNouvellesDemandes();
  assert.strictEqual(b.lignes, 4); assert.strictEqual(b.brouillons, 0); assert.strictEqual(e.etat.brouillons.length, 0);
  assert.strictEqual(e.suivi()[0][e.col('Statut')], '[essai] Brouillon possible');
});
test('mode Actif : brouillons pour les demandes claires seulement', () => {
  const e = scenario(); e.regler('Mode', 'Actif'); const b = e.c.traiterNouvellesDemandes();
  assert.strictEqual(b.lignes, 4); assert.strictEqual(b.brouillons, 2); assert.strictEqual(b.hors, 1); assert.strictEqual(b.a_revoir, 1);
  const statuts = e.suivi().map(l => l[e.col('Statut')]);
  assert.deepStrictEqual(statuts, ['Brouillon prêt', 'Brouillon prêt', 'Hors périmètre', 'À revoir']);
  assert.ok(e.etat.brouillons[1].corps.includes('l\'enveloppe budgétaire envisagée et l\'échéance souhaitée'));
});
test('aucun envoi, jamais', () => { const e = scenario(); e.regler('Mode', 'Actif'); e.c.traiterNouvellesDemandes(); e.c.verifierReponsesEtRetards(); assert.strictEqual(e.etat.envois, 0); });
test('le source ne contient aucun appel d\'envoi', () => {
  const code = sources.join('\n').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.ok(!/\.(sendEmail|reply|replyAll|forward|send|moveToTrash|moveToArchive|markRead)\s*\(/.test(code));
  assert.ok(!/UrlFetchApp|MailApp/.test(code));
});
test('fils hors libellé ignorés', () => { const e = scenario(); e.c.traiterNouvellesDemandes(); assert.ok(!e.suivi().some(l => l[e.col('Objet')] === 'Sans libellé')); });
test('colonnes remplies et formule neutralisée', () => {
  const e = scenario(); e.c.traiterNouvellesDemandes(); const l = e.suivi()[0];
  assert.strictEqual(l[e.col('Expéditeur')], 'marie@pme.example');
  assert.ok(l[e.col('Budget relevé')].startsWith('6 000 €'));
  assert.ok(/fin janvier/.test(l[e.col('Délai relevé')]));
  assert.ok(l[e.col('Lien Gmail')].includes('#all/t'));
  assert.strictEqual(e.suivi()[3][e.col('Objet')], '\'=1+1');
});
test('rejeu : aucun doublon de ligne ni de brouillon', () => {
  const e = scenario(); e.regler('Mode', 'Actif'); e.c.traiterNouvellesDemandes();
  e.etat.fils.forEach(f => f.libelles.delete('Flow Inbox/Traité'));
  const b = e.c.traiterNouvellesDemandes();
  assert.strictEqual(b.lignes, 0); assert.strictEqual(e.suivi().length, 4); assert.strictEqual(e.etat.brouillons.length, 2);
});
test('nouveau message dans un fil déjà traité ignoré', () => {
  const e = scenario(); e.c.traiterNouvellesDemandes(); e.repondre(e.etat.fils[0], new Date('2026-10-20T10:00:00Z'));
  assert.strictEqual(e.c.traiterNouvellesDemandes().lignes, 0);
});
test('interruption pendant le brouillon puis reprise : un seul brouillon', () => {
  const e = scenario(); e.regler('Mode', 'Actif'); e.etat.echecBrouillon = 1;
  assert.throws(() => e.c.traiterNouvellesDemandes(), /indisponible/);
  assert.strictEqual(e.suivi()[0][e.col('Statut')], 'En cours');
  const b = e.c.traiterNouvellesDemandes();
  assert.strictEqual(b.repris, 1); assert.strictEqual(e.suivi()[0][e.col('Statut')], 'Brouillon prêt');
  const parFil = {}; e.etat.brouillons.forEach(x => { parFil[x.fil.id] = (parFil[x.fil.id] || 0) + 1; });
  assert.ok(Object.values(parFil).every(n => n === 1)); assert.strictEqual(e.etat.brouillons.length, 2);
  assert.strictEqual(e.suivi().length, 4);
});
test('reprise d\'une ligne « En cours » dont le brouillon existe déjà', () => {
  const e = scenario(); e.regler('Mode', 'Actif'); e.c.traiterNouvellesDemandes();
  e.etat.feuilles['Suivi'].data[1][e.col('Statut')] = 'En cours';
  e.c.traiterNouvellesDemandes(); assert.strictEqual(e.etat.brouillons.length, 2);
});
test('limite par passage respectée', () => {
  const e = scenario(); e.regler('Nombre maximal par passage', '2');
  assert.strictEqual(e.c.traiterNouvellesDemandes().lignes, 2); assert.strictEqual(e.c.traiterNouvellesDemandes().lignes, 2);
});
test('verrou occupé : rien n\'est fait', () => { const e = creerEnvironnement({ verrouOccupe: true }); e.c.installer(); assert.strictEqual(e.c.traiterNouvellesDemandes(), null); });
test('réponse de l\'équipe repérée', () => {
  const e = scenario(); e.regler('Mode', 'Actif'); e.c.traiterNouvellesDemandes();
  e.repondre(e.etat.fils[0], new Date('2026-10-20T11:00:00Z'));
  const b = e.c.verifierReponsesEtRetards(); assert.strictEqual(b.repondus, 1);
  const l = e.suivi()[0]; assert.strictEqual(l[e.col('Statut')], 'Répondu'); assert.ok(l[e.col('Répondu le')].startsWith('2026-10-20'));
});
test('brouillon non compté comme réponse', () => {
  const e = scenario(); e.regler('Mode', 'Actif'); e.c.traiterNouvellesDemandes();
  assert.strictEqual(e.c.verifierReponsesEtRetards().repondus, 0);
});
test('demande sans réponse au-delà du délai → En retard', () => {
  const e = scenario(); e.c.traiterNouvellesDemandes();
  const b = e.c.verifierReponsesEtRetards();
  assert.strictEqual(b.en_retard, 3);
  assert.strictEqual(e.suivi()[0][e.col('En retard')], 'Oui');
  assert.strictEqual(e.suivi()[2][e.col('En retard')], '');
});
test('ligne Clos non modifiée', () => {
  const e = scenario(); e.c.traiterNouvellesDemandes();
  e.etat.feuilles['Suivi'].data[1][e.col('Statut')] = 'Clos';
  e.repondre(e.etat.fils[0], new Date('2026-10-20T11:00:00Z')); e.c.verifierReponsesEtRetards();
  assert.strictEqual(e.suivi()[0][e.col('Statut')], 'Clos'); assert.strictEqual(e.suivi()[0][e.col('En retard')], '');
});
test('déclencheurs : activation puis arrêt, sans doublon', () => {
  const e = creerEnvironnement(); e.c.installer(); e.c.activerAutomatique(); e.c.activerAutomatique();
  assert.strictEqual(e.etat.declencheurs.length, 2); e.c.arreterAutomatique(); assert.strictEqual(e.etat.declencheurs.length, 0);
});
test('journal sans contenu d\'e-mail', () => {
  const e = scenario(); e.c.traiterNouvellesDemandes();
  const journal = JSON.stringify(e.etat.feuilles['Journal'].data);
  assert.ok(!/marie|refonte|candidature/i.test(journal));
});
test('services modifiables par le client', () => {
  const e = creerEnvironnement(); e.c.installer();
  e.etat.feuilles['Services'].data.push(['trad', 'votre projet de traduction', 'traduction; version anglaise']);
  e.regler('Mode', 'Actif');
  e.ajouterFil({ de: 'a@pme.example', objet: 'Traduction', corps: 'Nous aimerions une version anglaise du site vitrine, budget 2 000 €, pour juin.' });
  e.c.traiterNouvellesDemandes(); assert.strictEqual(e.suivi()[0][e.col('Statut')], 'À revoir');
  e.etat.feuilles['Services'].data = e.etat.feuilles['Services'].data.filter(l => l[0] !== 'site');
  e.ajouterFil({ de: 'b@pme.example', objet: 'Traduction', corps: 'Nous aimerions une traduction de notre plaquette commerciale, budget 900 €, pour juin.' });
  e.etat.feuilles['Services'].data = e.etat.feuilles['Services'].data.filter(l => l[0] !== 'print');
  e.c.traiterNouvellesDemandes(); assert.ok(e.etat.brouillons[0].corps.includes('votre projet de traduction'));
});

console.log(reussis + ' tests réussis, ' + echecs.length + ' échec(s)');
if (echecs.length) { echecs.forEach(x => console.log('ÉCHEC ' + x)); process.exit(1); }
