'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// Titre dont chaque mot monte depuis un masque quand il entre dans l'écran.
// On observe le titre entier (pas les mots, qui sont rognés par leur masque et ne seraient jamais « visibles »).
export default function SplitTitle({ text, as: Tag = 'h2', id, style, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const words = text.split(' ');
  return (
    <Tag ref={ref} id={id} style={style} className={className}>
      {words.map((w, i) => (
        <span key={i}>
          <span className="mask">
            <motion.span
              className="mask-in"
              initial={false}
              animate={{ y: inView ? '0%' : '110%' }}
              transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}
