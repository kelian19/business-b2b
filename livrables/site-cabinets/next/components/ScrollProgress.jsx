'use client';
import { motion, useScroll, useSpring } from 'framer-motion';

// Fine barre de progression en haut de l'écran
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });
  return <motion.div className="progress" style={{ scaleX }} aria-hidden="true" />;
}
