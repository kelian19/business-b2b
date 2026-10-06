'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import useReduced from '@/lib/useReduced';
import { MANIFESTO } from '@/lib/site';

function Word({ children, progress, range }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return <motion.span style={{ opacity }}>{children}</motion.span>;
}

// Manifeste : le texte s'allume mot après mot au défilement.
export default function Manifesto() {
  const ref = useRef(null);
  const reduced = useReduced();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.55'] });
  const words = MANIFESTO.split(' ');
  return (
    <section ref={ref} className="manifesto" aria-label="Manifeste">
      <p className="manifesto-text">
        {words.map((w, i) => {
          const a = i / words.length;
          const b = Math.min(1, a + 1.6 / words.length);
          return reduced
            ? <span key={i}>{w} </span>
            : <span key={i}><Word progress={scrollYProgress} range={[a, b]}>{w}</Word>{' '}</span>;
        })}
      </p>
    </section>
  );
}
