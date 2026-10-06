'use client';
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

// Comme useReducedMotion, mais renvoie false au premier rendu pour rester identique au HTML du serveur.
export default function useReduced() {
  const r = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!r;
}
