'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import useReduced from '@/lib/useReduced';
import { CASE } from '@/lib/site';
import SplitTitle from './SplitTitle';

const Todo = ({ children = 'À COMPLÉTER' }) => <span className="todo">{children}</span>;

function Step({ s, i, n, progress, reduced }) {
  const a = i / n;
  const opacity = useTransform(progress, [a - 0.1, a + 0.1], [0.28, 1]);
  return (
    <motion.li className="case-step" style={reduced ? undefined : { opacity }}>
      <span className="case-k">{String(i + 1).padStart(2, '0')} · {s.k}</span>
      <span className="case-d">{s.d}</span>
      <h3>{s.t}</h3>
      <p>{s.p}</p>
    </motion.li>
  );
}

// Retour d'expérience : une ligne verticale se trace et chaque étape s'allume au défilement.
export default function CaseStudy() {
  const ref = useRef(null);
  const reduced = useReduced();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.7', 'end 0.6'] });
  const line = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const n = CASE.etapes.length;
  return (
    <section id="retour" aria-labelledby="rx">
      <span className="label">Retour d'expérience</span>
      <div className="case">
        <div className="case-side">
          {CASE.fictif && <span className="fict">Cas illustratif, cabinet fictif</span>}
          <SplitTitle id="rx" text={CASE.titre} />
          <p className="case-profile">{CASE.profil}</p>
          <p className="case-note">
            {CASE.fictif
              ? "Ce scénario montre le déroulé type d'une mission. Ce n'est pas un client réel et aucun chiffre n'est annoncé. Les vrais retours seront publiés avec l'accord écrit des cabinets."
              : "Publié avec l'accord écrit du cabinet."}
          </p>
        </div>
        <div className="case-main" ref={ref}>
          {!reduced && <motion.span className="case-line" style={{ scaleY: line }} aria-hidden="true" />}
          <ol className="case-steps">
            {CASE.etapes.map((s, i) => <Step key={s.k} s={s} i={i} n={n} progress={scrollYProgress} reduced={reduced} />)}
          </ol>
          <div className="case-result">
            <span className="case-k">Résultat</span>
            {CASE.resultat
              ? <p>{CASE.resultat}</p>
              : <p>{CASE.fictif ? 'Gain de temps : à mesurer pendant le diagnostic, puis à comparer après la mise en place.' : <Todo />}</p>}
            {(CASE.citation || !CASE.fictif) && (
              <blockquote>{CASE.citation || <Todo>À COMPLÉTER : propos du cabinet, avec accord écrit</Todo>}</blockquote>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
