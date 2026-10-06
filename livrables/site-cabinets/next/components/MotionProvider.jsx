'use client';
import { MotionConfig } from 'framer-motion';

// Respecte prefers-reduced-motion : les transformations sont coupées pour ces visiteurs.
export default function MotionProvider({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
