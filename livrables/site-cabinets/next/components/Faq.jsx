'use client';
import { useState } from 'react';
import Reveal from './Reveal';

// Accordéon : les réponses restent dans le HTML même fermées (grille 0fr → 1fr, pas de démontage).
export default function Faq({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <Reveal className="faq acc">
      {items.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <div className={'acc-item' + (isOpen ? ' open' : '')} key={q}>
            <h3>
              <button type="button" className="acc-btn" aria-expanded={isOpen} aria-controls={`faq-${i}`} id={`faq-b-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                {q}<span className="acc-icon" aria-hidden="true" />
              </button>
            </h3>
            <div className="acc-panel" id={`faq-${i}`} role="region" aria-labelledby={`faq-b-${i}`}>
              <div><p className="ans">{a}</p></div>
            </div>
          </div>
        );
      })}
    </Reveal>
  );
}
