'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import SplitTitle from './SplitTitle';

// Sur ordinateur, les deux offres sont des cartes empilées : la première se colle en haut
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
      <span className="label">Offres</span>
      <SplitTitle id="sv" text="Deux offres, un prix fixe annoncé avant de commencer" />
      <div className="stack" style={{ marginTop: 40 }}>
        <div className={'stack-item' + (desktop ? ' sticky' : '')}>
          <motion.article className="svc svc-wide" style={desktop ? { scale, opacity: dim, transformOrigin: 'top center' } : undefined}>
            <div className="svc-head">
              <span className="tag" aria-hidden="true">1</span>
              <h3>Dossier facture électronique : vous savez ce qu'il faut corriger dans vos fichiers et vos factures avant septembre 2027</h3>
              <p className="result"><b>Pour qui :</b> PME B2B de 20 à 249 salariés (négoce, distribution, fabrication) : dirigeants, DAF, RAF.</p>
              <p className="result"><b>Prix :</b> fixe, annoncé avant de commencer.</p>
              <a className="link" href="#appel">Nous écrire →</a>
            </div>
            <div className="svc-body">
              <p>À partir d'un export de votre fichier clients et fournisseurs (une ligne par client ou fournisseur, sans noms de contacts) et de 3 de vos modèles de factures, vous recevez :</p>
              <ul>
                <li><b>Un fichier fiabilisé :</b> SIREN/SIRET vérifiés, numéros de TVA intracommunautaire, adresses de facturation et de livraison, doublons repérés. Chaque ligne est marquée « vérifiée » ou « à trancher ».</li>
                <li><b>Le contrôle de 3 modèles de factures</b> au regard des 4 nouvelles mentions : SIREN du client, adresse de livraison si différente de l'adresse de facturation, nature de l'opération, option pour le paiement de la TVA d'après les débits.</li>
                <li><b>Un rapport des points à corriger,</b> à traiter avant le 1er septembre 2027.</li>
              </ul>
              <div className="tiers">
                <div className="tier"><b>Délai indicatif</b><span>5 jours ouvrés après réception de l'export et des 3 modèles (hypothèse, à confirmer sur les premiers dossiers).</span></div>
                <div className="tier"><b>Option : mise à niveau</b><span>Un nouveau contrôle avant septembre 2027, sur le fichier mis à jour et les modèles tels que paramétrés.</span></div>
                <div className="tier"><b>Ce que nous ne faisons pas</b><span>Nous ne garantissons pas la conformité, ne donnons ni conseil fiscal ni conseil juridique et ne promettons pas d'éviter une amende. Nous ne corrigeons pas vos données nous-mêmes et ne vendons aucune plateforme : vous décidez et corrigez à partir du rapport.</span></div>
              </div>
            </div>
          </motion.article>
        </div>
        <div ref={nextRef} className={'stack-item' + (desktop ? ' sticky' : '')} style={desktop ? { top: 110 } : undefined}>
          <article className="svc svc-wide">
            <div className="svc-head">
              <span className="tag" aria-hidden="true">2</span>
              <h3>Le Décodeur : en deux semaines, vous savez quelles tâches répétitives automatiser, et la première fonctionne déjà en prototype</h3>
              <p className="result"><b>Pour qui :</b> PME de 10 à 249 salariés qui veulent utiliser l'IA sans savoir par où commencer.</p>
              <p className="result"><b>Prix :</b> fixe, annoncé avant de commencer. Le gain de temps est estimé avec vous à partir de vos réponses : aucun chiffre n'est promis à l'avance.</p>
              <a className="link" href="#appel">Nous écrire →</a>
            </div>
            <div className="svc-body">
              <p>Vous décrivez vos tâches, sans avoir à connaître la technologie. Vous recevez :</p>
              <ul>
                <li><b>Un questionnaire écrit,</b> à remplir à votre rythme (une courte visio seulement si vous la demandez).</li>
                <li><b>Une cartographie de 3 à 5 tâches répétitives</b> de votre entreprise.</li>
                <li><b>Pour chacune,</b> la solution recommandée (un outil existant ou un petit script), l'effort, le coût estimé et les risques (données, RGPD).</li>
                <li><b>Un prototype fonctionnel</b> sur la tâche prioritaire.</li>
              </ul>
              <div className="tiers">
                <div className="tier"><b>Délai indicatif</b><span>2 semaines (hypothèse, le prototype est le poste le plus incertain).</span></div>
                <div className="tier"><b>Options</b><span>Mise à niveau : ajustement du prototype et mise à jour de la cartographie après quelques semaines d'usage. Mise en place : la solution retenue installée dans votre quotidien, à prix fixe sur devis établi après le Décodeur.</span></div>
                <div className="tier"><b>Ce que nous ne faisons pas</b><span>Nous ne promettons pas que toute tâche soit automatisable : si aucune ne l'est à un coût raisonnable, la cartographie le dit. Nous ne revendons aucun outil. Nous n'intervenons ni en conseil juridique, ni en sécurité informatique.</span></div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
