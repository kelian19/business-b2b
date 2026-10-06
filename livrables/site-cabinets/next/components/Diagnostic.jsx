'use client';
import { useState } from 'react';

const QUESTIONS = [
  "L'équipe utilise-t-elle déjà l'IA ?",
  'Existe-t-il des règles écrites sur son usage ?',
  'Une tâche revient-elle chaque mois ?',
  'Vos clients posent-ils des questions sur la facture électronique ?',
  'Avez-vous des exports réguliers ?',
];

function verdict(q) {
  const a = (q[0] === '1' ? 1 : 0) + (q[1] === '0' ? 1 : 0);
  const b = (q[2] === '1' ? 1 : 0) + (q[3] === '1' ? 1 : 0) + (q[4] === '1' ? 1 : 0);
  if (a >= 1 && b >= 2) return ['Les deux services peuvent vous concerner', "Votre équipe gagnerait à se donner des règles d'usage de l'IA (service A), et vous avez des tâches qui reviennent et pourraient être allégées (service B). On peut commencer par celui qui vous presse le plus."];
  if (a >= 1) return ['Le service A semble le plus utile', "Un cadre écrit sur l'usage de l'IA au cabinet vous aiderait : atelier d'équipe, charte, attestations."];
  if (b >= 2) return ['Le service B semble le plus utile', 'Vous avez des tâches ou des exports qui reviennent. Un diagnostic permettrait de choisir celle à supprimer en premier.'];
  return ['Pas de besoin évident à ce stade', 'Un appel de 15 minutes permet de le confirmer, sans engagement.'];
}

// Auto-diagnostic : 5 questions oui/non, tout se passe dans le navigateur.
export default function Diagnostic() {
  const [ans, setAns] = useState(Array(5).fill(null));
  const r = ans.every((x) => x !== null) ? verdict(ans) : null;
  return (
    <form className="panel" onSubmit={(e) => e.preventDefault()}>
      {QUESTIONS.map((q, i) => (
        <fieldset className="q" key={q}>
          <legend>{q}</legend>
          <div className="yn">
            {[['1', 'Oui'], ['0', 'Non']].map(([val, lab]) => (
              <label key={val}>
                <input type="radio" name={'q' + (i + 1)} value={val} checked={ans[i] === val} onChange={() => setAns((a) => a.map((x, j) => (j === i ? val : x)))} />
                <span>{lab}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="result-box" aria-live="polite" hidden={!r}>
        {r && (
          <>
            <h3>{r[0]}</h3>
            <p style={{ marginBottom: 16, color: 'var(--mut)' }}>{r[1]}</p>
            <p style={{ fontSize: 14, color: 'var(--mut)', marginBottom: 16 }}>Cette orientation ne constitue ni un audit ni une promesse de conformité.</p>
            <a className="btn btn-cta btn-sm" href="#appel">Réserver un appel de 15 min</a>
          </>
        )}
      </div>
    </form>
  );
}
