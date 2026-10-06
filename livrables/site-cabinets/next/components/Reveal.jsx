'use client';
import { motion } from 'framer-motion';

// Apparition douce (montée + fondu) à l'entrée dans l'écran. `tag` choisit la balise HTML.
export default function Reveal({ children, delay = 0, className, style, tag = 'div' }) {
  const M = motion[tag];
  return (
    <M
      className={className}
      style={style}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}
