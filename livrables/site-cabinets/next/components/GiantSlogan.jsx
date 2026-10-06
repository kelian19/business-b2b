'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import useReduced from '@/lib/useReduced';

// Slogan géant : les deux lignes glissent en sens opposés en grossissant pendant le défilement.
export default function GiantSlogan({ lines, id }) {
  const ref = useRef(null);
  const reduced = useReduced();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const x1 = useTransform(p, [0, 1], ['14%', '0%']);
  const x2 = useTransform(p, [0, 1], ['-14%', '0%']);
  const sc = useTransform(p, [0, 1], [0.9, 1]);
  const op = useTransform(p, [0, 0.4], [0.2, 1]);
  const s1 = reduced ? {} : { x: x1, scale: sc, opacity: op, transformOrigin: 'right center' };
  const s2 = reduced ? {} : { x: x2, scale: sc, opacity: op, transformOrigin: 'left center' };
  return (
    <h2 id={id} ref={ref} className="giant">
      <motion.span className="giant-l" style={s1}>{lines[0]}</motion.span>{' '}
      <motion.span className="giant-l outline" style={s2}>{lines[1]}</motion.span>
    </h2>
  );
}
