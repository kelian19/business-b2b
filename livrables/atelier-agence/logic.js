/* Calculs déterministes, partagés entre le navigateur et les tests Node. */
(function (root) {
  'use strict';
  const stages = ['À qualifier', 'Contacté', 'Rendez-vous', 'Devis', 'Signé', 'Perdu'];
  const offers = ['Flow Inbox', 'Préparation e-facture', 'Automatisation sur mesure'];
  function number(value, label, max = 1000000) {
    if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) throw Error(label + ' : valeur requise.');
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > max) throw Error(label + ' : valeur entre 0 et ' + max + ' attendue.');
    return n;
  }
  function money(value, label) {
    const n = number(value, label);
    if (Math.abs(n * 100 - Math.round(n * 100)) > 0.00001) throw Error(label + ' : deux décimales maximum.');
    return Math.round(n * 100);
  }
  function text(value, label, max, required = false) {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw Error(label + ' : texte invalide.');
    return value.trim();
  }
  function date(value) {
    if (value === '') return '';
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw Error('Date invalide.');
    return value;
  }
  function record(r) {
    if (!r || typeof r !== 'object') throw Error('Opportunité invalide.');
    if (!stages.includes(r.stage) || !offers.includes(r.offer)) throw Error('Offre ou étape inconnue.');
    const out = { id: text(r.id, 'Identifiant', 80, true), company: text(r.company, 'Entreprise', 100, true), offer: r.offer, stage: r.stage,
      next: text(r.next, 'Prochaine action', 300), due: date(r.due), note: text(r.note, 'Notes', 1500),
      proposed: money(r.proposed, 'Montant proposé') / 100, signed: money(r.signed, 'Montant signé') / 100,
      invoiced: money(r.invoiced, 'Montant facturé') / 100, collected: money(r.collected, 'Montant encaissé') / 100 };
    if (out.collected > out.invoiced || out.invoiced > out.signed) throw Error('L’encaissement doit être ≤ au montant facturé, lui-même ≤ au montant signé.');
    if (out.stage !== 'Signé' && (out.signed || out.invoiced || out.collected)) throw Error('Les montants engagés nécessitent l’étape Signé.');
    return out;
  }
  function restore(raw) {
    if (!raw || raw.format !== 'flow-atelier' || raw.version !== 1 || !Array.isArray(raw.records) || raw.records.length > 500 || typeof raw.demo !== 'boolean') throw Error('Sauvegarde incompatible (version 1, 500 opportunités maximum).');
    const records = raw.records.map(record);
    if (new Set(records.map(r => r.id)).size !== records.length) throw Error('Identifiants en double.');
    return {format: 'flow-atelier', version: 1, demo: raw.demo, records};
  }
  function summary(records, today) {
    date(today);
    const sum = key => records.reduce((n, r) => n + money(r[key], key), 0) / 100;
    return {count: records.length, proposed: sum('proposed'), signed: sum('signed'), invoiced: sum('invoiced'), collected: sum('collected'),
      due: records.filter(r => r.stage !== 'Perdu' && r.stage !== 'Signé' && r.due && r.due <= today).length};
  }
  function quote(q) {
    const price = money(q.price, 'Prix'), external = money(q.external, 'Coûts externes'), rate = money(q.rate, 'Coût horaire');
    // Le formulaire borne à 10 000 h ; la marge interne permet le scénario +30 %.
    const hours = number(q.hours, 'Heures', 20000), buffer = number(q.buffer, 'Aléas', 200), target = number(q.target, 'Marge cible', 95);
    const adjusted = hours * (1 + buffer / 100), labor = Math.round(adjusted * rate), cost = labor + external;
    return { hours: adjusted, labor: labor / 100, cost: cost / 100, margin: (price - cost) / 100,
      marginRate: price ? (price - cost) / price * 100 : null,
      recommended: Math.ceil(cost / (1 - target / 100)) / 100,
      cashBeforeLabor: (price - external) / 100 };
  }
  const api = {stages, offers, record, restore, summary, quote, date};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FlowAtelier = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
