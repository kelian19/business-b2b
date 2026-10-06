import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Marquee from '@/components/Marquee';
import Manifesto from '@/components/Manifesto';
import Services from '@/components/Services';
import InvoiceDemo from '@/components/InvoiceDemo';
import Calculator from '@/components/Calculator';
import Diagnostic from '@/components/Diagnostic';
import Method from '@/components/Method';
import SplitTitle from '@/components/SplitTitle';
import Reveal from '@/components/Reveal';
import Faq from '@/components/Faq';
import CaseStudy from '@/components/CaseStudy';
import GiantSlogan from '@/components/GiantSlogan';
import { FAQ, SITE } from '@/lib/site';

const Todo = ({ children = 'À COMPLÉTER' }) => <span className="todo">{children}</span>;
const mail = `mailto:${SITE.email}?subject=${encodeURIComponent(SITE.emailSubject)}`;

export default function Page() {
  return (
    <>
      <Header />
      <main id="contenu">
        <div id="top" />
        <Hero />
        <Marquee />
        <div className="wrap">
          <Manifesto />

          {/* Contexte */}
          <section aria-labelledby="ctx">
            <span className="label" id="ctx">Ce qui change pour les cabinets</span>
            <div className="dates">
              <Reveal tag="article" className="date">
                  <time dateTime="2025-02-02">2 février 2025</time>
                  <h3>IA au travail : former les équipes</h3>
                  <p>Le règlement européen sur l'IA (article 4) demande aux entreprises qui utilisent l'IA de prendre des mesures pour favoriser un niveau suffisant de maîtrise de l'IA chez leur personnel. Aucune certification n'est exigée. Cette formulation a été assouplie par le règlement (UE) 2026/1744, en vigueur depuis le 27 juillet 2026.</p>
              </Reveal>
              <Reveal tag="article" className="date" delay={0.14}>
                  <time dateTime="2026-09-01">1<sup>er</sup> septembre 2026</time>
                  <h3>Factures électroniques</h3>
                  <p>Depuis cette date, toutes les entreprises doivent pouvoir recevoir des factures électroniques. L'émission devient obligatoire pour les PME, TPE et micro-entreprises le 1<sup>er</sup> septembre 2027.</p>
              </Reveal>
            </div>
            <p className="note">Ces repères sont informatifs. Ce site ne constitue pas un conseil juridique.</p>
          </section>

          <Services />

          {/* Démo */}
          <section id="demo" className="dark" aria-labelledby="dm">
            <span className="label">Démo</span>
            <div className="tool">
              <div className="intro">
                <SplitTitle id="dm" text="Une facture lue en deux secondes" />
                <p>Démonstration simulée dans votre navigateur, sur une facture fictive. Sur vos documents, l'outil est adapté à votre cabinet et chaque résultat reste à valider par votre équipe.</p>
              </div>
              <Reveal><InvoiceDemo /></Reveal>
            </div>
          </section>

          {/* Calculateur */}
          <section id="calcul" className="dark" aria-labelledby="cl">
            <span className="label">Calculateur</span>
            <div className="tool">
              <div className="intro">
                <SplitTitle id="cl" text="Combien de temps pourriez-vous récupérer ?" />
                <p>Saisissez vos propres valeurs. Aucune valeur n'est préremplie, et aucun chiffre moyen n'est avancé.</p>
              </div>
              <Reveal><Calculator /></Reveal>
            </div>
          </section>

          {/* Diagnostic */}
          <section id="diagnostic" className="dark" aria-labelledby="dg">
            <span className="label">Auto-diagnostic</span>
            <div className="tool">
              <div className="intro">
                <SplitTitle id="dg" text="Votre cabinet et l'IA" />
                <p>Cinq questions, aucune donnée envoyée. Le résultat oriente vers un service, il ne mesure pas la conformité de votre cabinet.</p>
              </div>
              <Reveal><Diagnostic /></Reveal>
            </div>
          </section>

          <Method />

          {/* Confidentialité */}
          <section id="confidentialite" aria-labelledby="cf">
            <span className="label">Confidentialité et sécurité</span>
            <div className="cols">
              <SplitTitle id="cf" text="Vos données restent les vôtres" />
              <Reveal className="body">
                <p>Les données des clients du cabinet restent sous le contrôle du cabinet. <b>Aucune donnée client n'est placée dans un outil que le cabinet n'a pas validé.</b></p>
                <p>Le diagnostic et l'atelier peuvent se faire uniquement avec des exemples fictifs.</p>
                <p>Avant tout accès à des données réelles, un contrat de sous-traitance des données (article 28 du RGPD) est signé avec le cabinet.</p>
              </Reveal>
            </div>
          </section>

          {/* Ce que je ne fais pas */}
          <section aria-labelledby="nf">
            <span className="label">Limites</span>
            <div className="cols">
              <SplitTitle id="nf" text="Ce que je ne fais pas" />
              <Reveal>
                <ul className="plain">
                  <li>Je ne délivre ni certification ni garantie de conformité.</li>
                  <li>Je ne donne pas de conseil juridique ou fiscal.</li>
                  <li>Je ne tiens pas la comptabilité et ne fais pas la saisie pour les clients du cabinet. Je fournis l'outil, le cabinet fait le travail comptable.</li>
                  <li>Je ne remplace pas votre logiciel comptable.</li>
                  <li>Je ne signe rien à la place du cabinet.</li>
                </ul>
                <p style={{ marginTop: 20, color: 'var(--mut)' }}>Les résultats sont toujours relus par l'équipe du cabinet, qui garde la responsabilité de ses dossiers.</p>
              </Reveal>
            </div>
          </section>

          {/* Retour d'expérience (cas illustratif tant qu'aucun cabinet n'a donné son accord) */}
          <CaseStudy />

          {/* À propos */}
          <section aria-labelledby="ap">
            <span className="label">À propos</span>
            <div className="cols">
              <SplitTitle id="ap" text="Je travaille seul, et directement avec vous" />
              <Reveal className="body">
                <p>Je m'appelle Kélian Kaddouri. Je suis data scientist (master de l'ENSAE).</p>
                <p>Mon métier : mettre en production des outils en Python qui automatisent des tâches répétitives, et expliquer simplement ce qu'ils font.</p>
                <p>Je travaille seul pour l'instant. Les premiers cabinets bénéficient de conditions de lancement. Photo : <Todo /></p>
              </Reveal>
            </div>
          </section>

          {/* FAQ : les réponses restent dans le HTML même fermées */}
          <section id="faq" aria-labelledby="fq">
            <span className="label">Questions fréquentes</span>
            <SplitTitle id="fq" text="Vos questions" style={{ marginBottom: 40 }} />
            <Faq items={FAQ} />
          </section>
        </div>

        {/* Appel final */}
        <section className="final" id="appel" aria-labelledby="ap2" style={{ paddingBlock: 72 }}>
          <div className="wrap">
            <GiantSlogan id="ap2" lines={['Des règles claires,', 'et une tâche en moins.']} />
            <p>Quinze minutes pour voir si je peux vous aider. Sans engagement.</p>
            <div className="contact">
              <span>Lien de prise de rendez-vous : {SITE.bookingUrl ? <a href={SITE.bookingUrl} style={{ color: 'inherit' }}>{SITE.bookingUrl}</a> : <Todo />}</span>
              <span>Téléphone : <a href={SITE.phoneHref} style={{ color: 'inherit' }}>{SITE.phone}</a></span>
              <span>E-mail : <a href={mail} style={{ color: 'inherit' }}>{SITE.email}</a></span>
            </div>
          </div>
        </section>
      </main>

      <footer className="wrap">
        <div className="grid">
          <div><h3>{SITE.name}</h3><p>Cabinet de conseil indépendant pour experts-comptables.</p></div>
          <div>
            <h3>Mentions légales</h3>
            <dl>
              <dt>Éditeur</dt><dd>Kélian Kaddouri, micro-entreprise en cours de création</dd>
              <dt>SIRET</dt><dd><Todo /></dd>
              <dt>Adresse</dt><dd><Todo /></dd>
              <dt>Contact</dt><dd>{SITE.phone} · e-mail <a href={mail} style={{ color: 'inherit' }}>{SITE.email}</a></dd>
              <dt>Publication</dt><dd>Directeur : Kélian Kaddouri</dd>
              <dt>Hébergeur</dt><dd>Netlify, Inc. Adresse : <Todo /></dd>
            </dl>
          </div>
          <div><h3>Données</h3><p>Ce site n'utilise aucun traceur. <a href="#mentions">Politique de données et mentions complètes</a>.</p></div>
        </div>
        {/* Mentions à faire valider (juriste ou modèle CNIL/entreprises.gouv.fr) avant publication */}
        <section className="legal" id="mentions" aria-labelledby="ml" style={{ paddingBlock: '28px 0' }}>
          <h2 id="ml">Mentions légales et données personnelles</h2>
          <div className="blocks">
            <div>
              <h3>Éditeur</h3>
              <p>Kélian Kaddouri, entrepreneur individuel (micro-entrepreneur), sous le nom commercial « {SITE.name} ».</p>
              <p>SIRET : <Todo /></p>
              <p>Adresse professionnelle : <Todo /></p>
              <p>E-mail : <a href={mail}>{SITE.email}</a></p>
              <p>Directeur de la publication : Kélian Kaddouri.</p>
              <p>TVA : <Todo>À COMPLÉTER selon le régime (si franchise en base : TVA non applicable, art. 293 B du CGI)</Todo></p>
            </div>
            <div>
              <h3>Hébergeur</h3>
              <p>Netlify, Inc. Adresse : <Todo /> (à reprendre du site de l'hébergeur).</p>
              <h3 style={{ marginTop: 28 }}>Propriété intellectuelle</h3>
              <p>Les contenus et éléments graphiques de ce site sont la propriété de l'éditeur. Toute reproduction est interdite sans son accord.</p>
              <h3 style={{ marginTop: 28 }}>Responsabilité</h3>
              <p>Les informations de ce site sont de caractère général. Elles ne constituent ni un conseil juridique, ni un conseil fiscal, ni une certification, et aucune garantie de conformité n'est donnée.</p>
            </div>
            <div>
              <h3>Données personnelles</h3>
              <p>Responsable du traitement : Kélian Kaddouri.</p>
              <ul>
                <li><b>Données :</b> votre adresse e-mail et le contenu de votre message lorsque vous nous écrivez.</li>
                <li><b>Finalité :</b> répondre à votre demande et, le cas échéant, échanger sur une prestation.</li>
                <li><b>Base :</b> mesures précontractuelles ou intérêt légitime.</li>
                <li><b>Conservation :</b> 3 ans maximum après le dernier échange.</li>
                <li><b>Destinataires :</b> l'éditeur uniquement. La messagerie est assurée par Gmail (Google).</li>
              </ul>
              <p>Vous pouvez exercer vos droits d'accès, de rectification, d'effacement, d'opposition, de limitation et de portabilité en écrivant à <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Vous pouvez aussi introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>).</p>
              <p>Les calculs du calculateur et de l'auto-diagnostic se font dans votre navigateur et ne sont pas transmis.</p>
            </div>
            <div>
              <h3>Cookies et polices</h3>
              <p>Ce site ne dépose aucun cookie ni traceur.</p>
              <p>Les polices (Archivo, Public Sans, IBM Plex Mono) sont hébergées avec le site : aucune requête n'est envoyée à Google lors de votre visite.</p>
            </div>
          </div>
        </section>
      </footer>
    </>
  );
}
