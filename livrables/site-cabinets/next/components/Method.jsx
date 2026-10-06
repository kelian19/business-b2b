'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import useReduced from '@/lib/useReduced';
import { METHOD } from '@/lib/site';
import SplitTitle from './SplitTitle';

function Step({ s, i, progress }) {
  const a = i / METHOD.length;
  const opacity = useTransform(progress, [a - 0.08, a + 0.12], [0.25, 1]);
  return (
    <motion.div className="step" style={{ opacity }}>
      <span className="n">{s.n}</span><span className="d">{s.d}</span><h3>{s.t}</h3><p>{s.p}</p>
    </motion.div>
  );
}

// Méthode : la ligne de temps se trace pendant le défilement, chaque étape s'allume à son tour.
export default function Method() {
  const ref = useRef(null);
  const reduced = useReduced();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.7'] });
  const line = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <section id="methode" aria-labelledby="mt" ref={ref}>
      <span className="label">Méthode</span>
      <SplitTitle id="mt" text="Trois étapes, sans engagement au départ" style={{ marginBottom: 40 }} />
      <div className="steps timeline">
        {!reduced && <motion.span className="tl-line" style={{ scaleX: line }} aria-hidden="true" />}
        {METHOD.map((s, i) => reduced
          ? <div className="step" key={s.n}><span className="n">{s.n}</span><span className="d">{s.d}</span><h3>{s.t}</h3><p>{s.p}</p></div>
          : <Step key={s.n} s={s} i={i} progress={scrollYProgress} />)}
      </div>
    </section>
  );
}
