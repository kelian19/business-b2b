'use client';
import { useState } from 'react';

const fmt = (n) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const FIELDS = [
  ['Nombre de fois où la tâche revient par mois', 'exemple : 200'],
  ['Minutes par occurrence', 'exemple : 4'],
  ['Part que vous jugez automatisable (%)', 'exemple : 50'],
];

// Calculateur « temps récupérable » : aucune valeur par défaut, tout vient des saisies du visiteur.
export default function Calculator() {
  const [v, setV] = useState(['', '', '']);
  const set = (i, val) => setV((a) => a.map((x, j) => (j === i ? val : x)));
  let bad = null, out = null;
  const num = (x) => (/^\d+([.,]\d+)?$/.test(x.trim()) ? Number(x.trim().replace(',', '.')) : NaN);
  v.forEach((x, i) => {
    if (x.trim() === '' || bad) return;
    const n = num(x);
    if (!isFinite(n)) bad = { i, m: 'Entrez un nombre positif ou nul.' };
    else if (i === 2 && n > 100) bad = { i, m: 'La part automatisable ne peut pas dépasser 100 %.' };
  });
  if (!bad && v.every((x) => x.trim() !== '')) {
    const n = v.map(num);
    const month = ((n[0] * n[1]) / 60) * (n[2] / 100);
    out = { month, year: month * 12 };
  }
  return (
    <form className="panel" noValidate onSubmit={(e) => e.preventDefault()}>
      {FIELDS.map(([label, ph], i) => (
        <div className="field" key={label}>
          <label htmlFor={'c' + (i + 1)}>{label}</label>
          <input id={'c' + (i + 1)} inputMode="decimal" placeholder={ph} autoComplete="off" value={v[i]}
            aria-invalid={bad && bad.i === i ? 'true' : undefined} onChange={(e) => set(i, e.target.value)} />
        </div>
      ))}
      <div className="err" role="alert">{bad ? bad.m : ''}</div>
      <div className="out" aria-live="polite">
        {out ? (
          <>
            <div className="big">{fmt(out.month)} h par mois</div>
            <div className="big" style={{ marginTop: 6 }}>{fmt(out.year)} h par an</div>
            <div className="hint">Estimation calculée à partir de vos saisies.</div>
          </>
        ) : <div className="hint">{bad ? 'Corrigez la saisie pour voir le résultat.' : 'Renseignez les trois champs pour voir le résultat.'}</div>}
      </div>
    </form>
  );
}
