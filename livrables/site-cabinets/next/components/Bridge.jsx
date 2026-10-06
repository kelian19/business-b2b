'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import useReduced from '@/lib/useReduced';
import { BRIDGE } from '@/lib/site';
import SplitTitle from './SplitTitle';

// Petit pont dessiné en SVG : tablier et arche se tracent, un document traverse.
function Span({ draw, dotX, dotOp, reduced }) {
  const full = { pathLength: 1 };
  return (
    <svg viewBox="0 0 120 56" aria-hidden="true">
      <g className="bridge-base">
        <path d="M4 40H116" /><path d="M4 40Q60 -6 116 40" />
        <path d="M32 40V22.8M60 40V17M88 40V22.8" />
      </g>
      <g className="bridge-draw">
        <motion.path d="M4 40H116" style={reduced ? full : { pathLength: draw }} />
        <motion.path d="M4 40Q60 -6 116 40" style={reduced ? full : { pathLength: draw }} />
        <motion.path d="M32 40V22.8M60 40V17M88 40V22.8" style={reduced ? full : { pathLength: draw }} />
      </g>
      <path className="bridge-pier" d="M4 40V52M116 40V52" />
      {!reduced && <motion.rect className="bridge-doc" x={-5} y={30} width={10} height={10} style={{ x: dotX, opacity: dotOp }} />}
    </svg>
  );
}

function Row({ w, b, reduced }) {
  const ref = useRef(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start 0.88', 'start 0.4'] });
  const draw = useTransform(p, [0, 0.7], [0, 1]);
  const dotX = useTransform(p, [0.15, 0.95], [10, 120]);
  const dotOp = useTransform(p, [0.1, 0.2, 0.9, 1], [0, 1, 1, 0]);
  const worry = useTransform(p, [0.2, 1], [1, 0.55]);
  const benOp = useTransform(p, [0.55, 1], [0.3, 1]);
  const benX = useTransform(p, [0.55, 1], [-18, 0]);
  return (
    <li className="bridge-row" ref={ref}>
      <motion.div className="bridge-worry" style={reduced ? undefined : { opacity: worry }}>
        <span className="bridge-tag">Souci</span>
        <p>{w}</p>
      </motion.div>
      <div className="bridge-span" aria-hidden="true">
        <Span draw={draw} dotX={dotX} dotOp={dotOp} reduced={reduced} />
      </div>
      <motion.div className="bridge-benefit" style={reduced ? undefined : { opacity: benOp, x: benX }}>
        <span className="bridge-tag">Avec moi</span>
        <p>{b}</p>
      </motion.div>
    </li>
  );
}

export default function Bridge() {
  const reduced = useReduced();
  return (
    <section id="pont" aria-labelledby="pt">
      <span className="label">Le pont</span>
      <SplitTitle id="pt" text="Entre vos soucis et un cabinet plus serein, un pont." />
      <p className="bridge-intro">Je ne remplace pas votre logiciel ni votre équipe : je fais le lien entre ce qui vous pèse aujourd'hui et ce que vous voulez obtenir. Voici, souci par souci, ce que vous gagnez.</p>
      <div className="bridge-heads" aria-hidden="true">
        <span>Aujourd'hui</span><span>Le pont</span><span>Après</span>
      </div>
      <ul className="bridge-list">
        {BRIDGE.map(([w, b]) => <Row key={w} w={w} b={b} reduced={reduced} />)}
      </ul>
      <p className="note">Schéma qualitatif : aucun gain chiffré n'est annoncé. Le temps gagné se mesure avec vous pendant le diagnostic.</p>
    </section>
  );
}
