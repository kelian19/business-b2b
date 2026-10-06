'use client';
import { useRef } from 'react';
import { motion, useScroll, useVelocity, useSpring, useTransform, useAnimationFrame, useMotionValue } from 'framer-motion';
import { MARQUEE } from '@/lib/site';

const SPEED = 0.045; // pixels par milliseconde (45 px/s)

// Bandeau défilant : il avance en continu et se penche selon la vitesse de défilement.
export default function Marquee() {
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { stiffness: 120, damping: 30 });
  const skew = useTransform(velocity, [-2500, 0, 2500], [-7, 0, 7], { clamp: true });
  const setRef = useRef(null);
  useAnimationFrame((_, delta) => {
    const w = setRef.current ? setRef.current.offsetWidth : 0;
    if (!w) return;
    const next = x.get() - delta * SPEED;
    x.set(next <= -w ? next + w : next); // le contenu est dupliqué : on boucle d'une largeur
  });
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="marquee" aria-hidden="true">
      <motion.div className="marquee-skew" style={{ skewX: skew }}>
        <motion.div className="marquee-track" style={{ x }}>
          {[0, 1].map((k) => (
            <div className="marquee-set" key={k} ref={k === 0 ? setRef : undefined}>
              {items.map((w, i) => <span key={i} className={i % 2 ? 'outline' : ''}>{w}<i>✓</i></span>)}
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
