'use client';
import { useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { NAV, SITE } from '@/lib/site';

// En-tête collant : se cache quand on descend, revient quand on remonte.
export default function Header() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 160);
  });
  const close = () => setOpen(false);
  return (
    <motion.header
      className="top"
      animate={{ y: hidden && !open ? '-100%' : '0%' }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onKeyDown={(e) => { if (e.key === 'Escape' && open) close(); }}
    >
      <div className="bar">
        <a className="brand" href="#top" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true" style={{ flex: 'none' }}>
            <path d="M8 6H24V40H58V56H8Z" fill="currentColor" />
            <path d="M32 26L40 34L57 11" fill="none" stroke="#FF6A55" strokeWidth="6.5" strokeLinecap="square" />
          </svg>
          {SITE.name}
        </a>
        <button className="burger" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)}>Menu</button>
        <nav className={'main' + (open ? ' open' : '')} id="menu" aria-label="Navigation principale" onClick={(e) => { if (e.target.tagName === 'A') close(); }}>
          {NAV.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>
        <a className="btn btn-cta" href="#appel">Nous écrire</a>
      </div>
    </motion.header>
  );
}
