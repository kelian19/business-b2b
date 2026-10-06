'use client';
import { useState } from 'react';

const QUESTIONS = [
  "Émettez-vous des factures à d'autres entreprises (B2B) ?",
  "Le SIREN et l'adresse de livraison de chacun de vos clients sont-ils tous renseignés et vérifiés dans votre fichier ?",
  'Avez-vous déjà contrôlé vos modèles de factures au regard des 4 nouvelles mentions ?',
  'Une tâche répétitive vous prend-elle du temps chaque semaine ?',
  'Savez-vous déjà quel outil ou quel script la traiterait ?',
];

// Orientation (pas un audit) : oui = 1, non = 0.
function verdict(q) {
  const ef = q[0] === '1' && (q[1] === '0' || q[2] === '0');
  const dec = q[3] === '1' && q[4] === '0';
  const decAlt = q[3] === '1' && q[4] === '1';
  if (ef && (dec || decAlt)) return ['Les deux offres peuvent vous concerner', "Un dossier facture électronique pour fiabiliser vos fichiers et contrôler vos modèles de factures, et Le Décodeur pour cartographier vos tâches répétitives. On peut commencer par celle qui vous presse le plus."];
  if (ef) return ['Le dossier facture électronique semble le plus utile', "Votre fichier clients ou vos modèles de factures méritent un contrôle avant le 1er septembre 2027 : fichier fiabilisé, 3 modèles contrôlés, rapport des points à corriger."];
  if (dec) return ['Le Décodeur semble le plus utile', "Vous avez une tâche répétitive mais pas encore de solution identifiée : le Décodeur la cartographie, recommande une solution chiffrée et construit un prototype sur la plus utile."];
  if (decAlt) return ['Le Décodeur peut quand même servir', "Vous avez déjà une idée de solution : le Décodeur peut la confirmer, la chiffrer, ou conclure qu'un outil existant suffit. Ce n'est pas urgent."];
  return ['Pas maintenant', "Rien n'indique un besoin pressant à ce stade. Revenez quand une échéance ou une tâche vous pèse : un e-mail suffit pour en reparler."];
}

// Auto-diagnostic : 5 questions oui/non, tout se passe dans le navigateur.
export default function Diagnostic() {
  const [ans, setAns] = useState(Array(QUESTIONS.length).fill(null));
  const needed = ans[3] === '0' ? 4 : 5;
  const r = ans.slice(0, needed).every((x) => x !== null) ? verdict(ans) : null;
  return (
    <form className="panel" onSubmit={(e) => e.preventDefault()}>
      {QUESTIONS.map((q, i) => (i === 4 && ans[3] !== '1') ? null : (
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
            <p style={{ fontSize: 14, color: 'var(--mut)', marginBottom: 16 }}>Cette orientation ne constitue ni un audit, ni un conseil juridique, ni une promesse de conformité.</p>
            <a className="btn btn-cta btn-sm" href="#appel">Nous écrire</a>
          </>
        )}
      </div>
    </form>
  );
}
