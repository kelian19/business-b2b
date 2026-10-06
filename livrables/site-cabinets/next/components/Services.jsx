'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import SplitTitle from './SplitTitle';

// Sur ordinateur, les deux services sont des cartes empilées : la première se colle en haut
// et rétrécit légèrement quand la seconde arrive. Sur mobile, simple liste verticale.
function useDesktop() {
  const [d, setD] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)');
    const f = () => setD(m.matches);
    f(); m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return d;
}

export default function Services() {
  const nextRef = useRef(null);
  const desktop = useDesktop();
  const { scrollYProgress } = useScroll({ target: nextRef, offset: ['start end', 'start 110px'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const dim = useTransform(scrollYProgress, [0, 1], [1, 0.6]);

  return (
    <section id="services" aria-labelledby="sv">
      <span className="label">Services</span>
      <SplitTitle id="sv" text="Deux façons de travailler ensemble" />
      <div className="stack" style={{ marginTop: 40 }}>
        <div className={'stack-item' + (desktop ? ' sticky' : '')}>
          <motion.article className="svc svc-wide" style={desktop ? { scale, opacity: dim, transformOrigin: 'top center' } : undefined}>
            <div className="svc-head">
              <span className="tag" aria-hidden="true">A</span>
              <h3>Votre équipe utilise l'IA sans risque pour le secret professionnel, et vous avez la preuve prête</h3>
              <p className="result"><b>Vous obtenez</b> une équipe alignée sur des règles simples, une trace écrite datée, et un dossier à jour en cas de question d'un client, d'un confrère ou d'un contrôle.</p>
              <a className="link" href="#appel">En parler en 15 minutes →</a>
            </div>
            <div className="svc-body">
              <div className="tiers">
                <div className="tier"><b>Express</b><span>Livré en moins de 2 semaines</span></div>
                <ul>
                  <li>Atelier d'équipe en visio (environ 1 h 30) sur ce qu'on peut faire ou non avec l'IA au cabinet, avec des cas concrets du métier</li>
                  <li>Charte d'usage de l'IA adaptée au cabinet : secret professionnel, données clients, RGPD, outils autorisés</li>
                  <li>Attestation interne de formation pour chaque participant</li>
                </ul>
                <div className="tier"><b>Kit complet</b><span>Tout l'Express, plus :</span></div>
                <ul>
                  <li>Registre des outils IA utilisés : qui, quoi, pour quelles tâches, avec quelles données</li>
                  <li>Dossier de preuve de votre démarche, qui réunit l'ensemble</li>
                  <li>Point de suivi annuel, en option</li>
                </ul>
              </div>
            </div>
          </motion.article>
        </div>
        <div ref={nextRef} className={'stack-item' + (desktop ? ' sticky' : '')} style={desktop ? { top: 110 } : undefined}>
          <article className="svc svc-wide">
            <div className="svc-head">
              <span className="tag" aria-hidden="true">B</span>
              <h3>Je supprime une tâche répétitive de votre cabinet</h3>
              <p className="result"><b>Gain de temps :</b> à mesurer pendant le diagnostic. Aucun chiffre n'est annoncé à l'avance.</p>
              <a className="link" href="#appel">En parler en 15 minutes →</a>
            </div>
            <div className="svc-body">
              <p>On choisit ensemble une seule tâche, et on la fait disparaître. Vous gardez vos outils. Je ne remplace pas votre logiciel comptable, je m'y branche.</p>
              <ul>
                <li>Un outil qui pré-remplit les factures fournisseurs des clients du cabinet, que votre équipe valide, et qui prépare la facture électronique</li>
                <li>Un reporting mensuel automatique pour vos clients, à partir de vos exports</li>
                <li>Un petit outil sur mesure : relance de pièces manquantes, contrôle, tri</li>
              </ul>
              <div className="tiers">
                <div className="tier"><b>1. Diagnostic</b><span>Environ 1 h 30 en visio : on choisit la tâche et on mesure le temps qu'elle prend aujourd'hui.</span></div>
                <div className="tier"><b>2. Mise en place à prix fixe</b><span>2 à 3 semaines environ, testée sur un dossier avant généralisation.</span></div>
                <div className="tier"><b>3. Suivi mensuel</b><span>En option.</span></div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
