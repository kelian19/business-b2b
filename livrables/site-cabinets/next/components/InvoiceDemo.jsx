'use client';
import { useEffect, useRef, useState } from 'react';
import { INVOICE as I, QR } from '@/lib/site';

const KEYS = ['fournisseur', 'client', 'numero', 'date', 'echeance', 'lignes', 'ht', 'tva', 'ttc', 'iban'];
const nf = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n) => nf.format(n) + ' €';
const LABEL = {
  fournisseur: ['Fournisseur', I.fournisseur], client: ['Client', I.client], numero: ['Numéro', I.numero],
  date: ['Date', I.date], echeance: ['Échéance', I.echeance], lignes: ['Lignes', `${I.lignes.length} lignes détectées`],
  ht: ['Total HT', money(I.ht)], tva: ['TVA 20 %', money(I.tva)], ttc: ['Total TTC', money(I.ttc)], iban: ['IBAN', I.iban],
};
const Tick = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6" /></svg>;

// Contrôles calculés à partir des données de la facture, pas écrits en dur.
function computeChecks() {
  const lines = I.lignes.map(([, q, pu]) => q * pu);
  const sum = lines.reduce((a, b) => a + b, 0);
  return [
    { ok: Math.abs(sum - I.ht) < 0.005, txt: lines.map((x) => nf.format(x)).join(' + ') + ' = ' + money(sum) },
    { ok: Math.abs(I.ht + I.tva - I.ttc) < 0.005, txt: nf.format(I.ht) + ' + ' + nf.format(I.tva) + ' = ' + money(I.ttc) },
    { ok: Math.abs(I.ht * 0.2 - I.tva) < 0.005, txt: '20 % de ' + nf.format(I.ht) + ' = ' + money(I.ht * 0.2) },
  ];
}

export default function InvoiceDemo() {
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [ex, setEx] = useState([]);   // champs en cours de lecture
  const [got, setGot] = useState([]); // champs extraits
  const [nChecks, setNChecks] = useState(0);
  const [dur, setDur] = useState(0);
  const timers = useRef([]);
  const resetBtn = useRef(null);
  const goBtn = useRef(null);
  const results = computeChecks();

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const at = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  function run() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const d = reduced ? 0 : 380, t = KEYS.length * d;
    setPhase('running'); setDur(d ? t + 300 : 0);
    KEYS.forEach((k, i) => {
      at(() => setEx((s) => [...s, k]), i * d);
      at(() => { setEx((s) => s.filter((x) => x !== k)); setGot((s) => [...s, k]); }, i * d + (d ? 300 : 0));
    });
    const base = t + (d ? 250 : 0), step = d ? 420 : 0;
    results.forEach((_, j) => at(() => setNChecks(j + 1), base + j * step));
    at(() => { setPhase('done'); setDur(0); setTimeout(() => resetBtn.current && resetBtn.current.focus(), 0); }, base + results.length * step + (d ? 200 : 0));
  }
  function reset() {
    timers.current.forEach(clearTimeout); timers.current = [];
    setPhase('idle'); setEx([]); setGot([]); setNChecks(0); setDur(0);
    setTimeout(() => goBtn.current && goBtn.current.focus(), 0);
  }
  const f = (k) => 'f' + (ex.includes(k) ? ' ex' : '') + (got.includes(k) ? ' got' : '');
  const allOk = results.every((r) => r.ok);

  return (
    <div className="iv">
      <div className="paperwrap">
        <span className="fict">Document fictif, démo</span>
        <div className="paper" role="img" aria-label="Facture fictive de Zorglub et Fils, numéro F-2026-0417, datée du 14 septembre 2026, trois lignes pour 1 250 euros hors taxes, 250 euros de TVA, 1 500 euros toutes taxes comprises">
          <div className={'pscan' + (phase === 'running' && dur ? ' go' : '')} style={{ '--dur': dur + 'ms' }} aria-hidden="true" />
          <div className="wm" aria-hidden="true">FICTIF</div>
          <div className="ph">
            <div className="sup">
              <svg viewBox="0 0 44 44" aria-hidden="true"><path d="M22 3L39 12.5V31.5L22 41L5 31.5V12.5Z" fill="none" stroke="#0F1E3D" strokeWidth="3" /><path d="M14 28L22 12L30 28" fill="none" stroke="#0F1E3D" strokeWidth="3" /><circle cx="22" cy="28" r="3" fill="#C8200E" /></svg>
              <div><b className={f('fournisseur')} data-tag="Fournisseur">{I.fournisseur}</b><small>Fournitures techniques</small><small>12 rue des Exemples, 00000 Ville</small></div>
            </div>
            <div className="meta">
              <span className="big">FACTURE</span>
              <div><span>N°</span><b className={f('numero')} data-tag="Numéro">{I.numero}</b></div>
              <div><span>Date</span><b className={f('date')} data-tag="Date">{I.date}</b></div>
              <div><span>Échéance</span><b className={f('echeance')} data-tag="Échéance">{I.echeance}</b></div>
            </div>
          </div>
          <div className="client"><span>Facturé à</span><b className={f('client')} data-tag="Client">{I.client}</b><small>3 avenue des Tests, 00000 Ville</small></div>
          <div className={f('lignes') + ' lw'} data-tag="3 lignes détectées">
            <table className="lt">
              <thead><tr><th>Désignation</th><th>Qté</th><th>PU HT</th><th>Total HT</th></tr></thead>
              <tbody>
                {I.lignes.map(([n, q, pu]) => <tr key={n}><td>{n}</td><td>{q}</td><td>{nf.format(pu)}</td><td>{nf.format(q * pu)}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="tt">
            <div><span>Total HT</span><b className={f('ht')} data-tag="Total HT">{money(I.ht)}</b></div>
            <div><span>TVA 20 %</span><b className={f('tva')} data-tag="TVA">{money(I.tva)}</b></div>
            <div className="ttc"><span>Total TTC</span><b className={f('ttc')} data-tag="Total TTC">{money(I.ttc)}</b></div>
          </div>
          <div className="foot">
            <div><small>Règlement par virement sous 30 jours</small><small>IBAN (fictif)</small><b className={f('iban')} data-tag="IBAN">{I.iban}</b></div>
            <div className="qr" aria-hidden="true">{QR.map((o, i) => <i key={i} className={o ? 'o' : ''} />)}</div>
          </div>
        </div>
      </div>

      <div className="panel dp">
        <div className="dph">Données extraites</div>
        <ul className="rows">
          {KEYS.map((k) => {
            const done = got.includes(k);
            return (
              <li key={k} className={done ? 'done' : ''}>
                <span className="k">{LABEL[k][0]}</span>
                <span className={'v' + (done ? '' : ' sk')}>{done ? LABEL[k][1] : ''}</span>
                <span className="st">{done && <Tick />}</span>
              </li>
            );
          })}
        </ul>
        <div className="dph" style={{ marginTop: 20 }}>Contrôles automatiques</div>
        <ul className="checks">
          {['Somme des lignes = Total HT', 'HT + TVA = TTC', 'TVA = 20 % du HT'].map((c, j) => {
            const done = nChecks > j;
            return (
              <li key={c} className={done ? 'done' : ''}>
                <span className={'ci' + (done ? '' : ' ring')}>{done && (results[j].ok ? <Tick /> : '!')}</span>
                <span>{c}<small>{done ? (results[j].ok ? '' : 'Écart : ') + results[j].txt : ''}</small></span>
              </li>
            );
          })}
        </ul>
        <div className={'final2' + (phase === 'done' && allOk ? ' ok' : '')} aria-live="polite">
          {phase === 'idle' && "En attente d'extraction"}
          {phase === 'running' && 'Lecture en cours'}
          {phase === 'done' && (allOk ? <><Tick /><span>3 contrôles réussis. À relire et valider par votre équipe.</span></> : 'Écart détecté : à vérifier par votre équipe.')}
        </div>
        <div className="actions">
          {phase !== 'done' && <button ref={goBtn} className="btn btn-ghost btn-sm" type="button" disabled={phase === 'running'} onClick={run}>Extraire</button>}
          {phase === 'done' && <button ref={resetBtn} className="btn btn-ghost btn-sm" type="button" onClick={reset}>Recommencer</button>}
        </div>
      </div>
    </div>
  );
}
