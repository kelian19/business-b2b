'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import useReduced from '@/lib/useReduced';
import { LEDGER, SITE } from '@/lib/site';

// Coche de pointage : elle se trace pendant le défilement, l'une après l'autre.
function Tick({ progress, i, reduced }) {
  const a = 0.5 + i * 0.1;
  const len = useTransform(progress, [a, a + 0.1], [0, 1]);
  return (
    <svg viewBox="0 0 24 24">
      <motion.path d="M4 12.5l5 5L20 6" style={reduced ? { pathLength: 1 } : { pathLength: len }} />
    </svg>
  );
}

// Ouverture : la carte bleu nuit s'agrandit jusqu'au plein écran pendant que le titre grossit.
// Carte et titre utilisent exactement la même plage de défilement (ZOOM) pour rester synchronisés.
const ZOOM = [0, 0.5];

export default function Hero() {
  const ref = useRef(null);
  const reduced = useReduced();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const clip = useTransform(p, ZOOM, ['inset(9% 4% 9% 4% round 28px)', 'inset(0% 0% 0% 0% round 0px)']);
  const titleScale = useTransform(p, ZOOM, [0.66, 1]);
  const subOpacity = useTransform(p, [0.5, 0.68], [0, 1]);
  const subY = useTransform(p, [0.5, 0.68], [24, 0]);
  const ledgerOpacity = useTransform(p, [0, 0.25], [0, 1]);
  const ledgerY = useTransform(p, [0, 0.5], [40, 0]);
  const hintOpacity = useTransform(p, [0, 0.15], [1, 0]);

  const s = reduced ? { clipPath: 'none' } : { clipPath: clip };
  const t = reduced ? {} : { scale: titleScale };
  const sub = reduced ? {} : { opacity: subOpacity, y: subY };
  const led = reduced ? {} : { opacity: ledgerOpacity, y: ledgerY };

  return (
    <section ref={ref} className="hero-scroll" aria-labelledby="h1" style={reduced ? { height: 'auto' } : undefined}>
      <div className={reduced ? 'hero-stick static' : 'hero-stick'}>
        <motion.div className="hero-card" style={s}>
          <div className="hero-inner">
            <p className="hero-tag" aria-hidden="true">{SITE.name} · Facture électronique et IA pour PME</p>
            <div className="hero-grid">
              <div>
                <motion.div className="hero-title" style={t}>
                  <h1 id="h1"><span className="h1-l">Facture électronique : sachez quoi corriger.</span>{' '}<span className="h1-l">IA : sachez où elle sert.</span></h1>
                </motion.div>
                <motion.div style={sub}>
                  <p className="sub">Pour les dirigeants et DAF de PME : un dossier à prix fixe pour savoir quoi corriger dans vos fichiers et vos factures avant septembre 2027, et Le Décodeur pour savoir quelles tâches répétitives automatiser.</p>
                  <div className="cta">
                    <a className="btn btn-cta" href="#appel">Nous écrire</a>
                    <a className="btn btn-ghost" href="#services">Voir les deux offres</a>
                  </div>
                </motion.div>
              </div>
              <motion.div className="ledger" style={led} aria-hidden="true">
                {LEDGER.map((l, i) => <div key={l}><span>{l}</span><Tick progress={p} i={i} reduced={reduced} /></div>)}
              </motion.div>
            </div>
            {!reduced && <motion.p className="hero-hint" style={{ opacity: hintOpacity }} aria-hidden="true">Défiler ↓</motion.p>}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
