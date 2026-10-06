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
import Bridge from '@/components/Bridge';
import CaseStudy from '@/components/CaseStudy';
import Team from '@/components/Team';
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
          <Bridge />

          {/* Contexte : repères datés (sources vérifiées) */}
          <section aria-labelledby="ctx">
            <span className="label" id="ctx">Ce qui change pour les entreprises</span>
            <div className="dates three">
              <Reveal tag="article" className="date">
                <time dateTime="2026-09-01">1<sup>er</sup> septembre 2026</time>
                <h3>Factures électroniques : réception</h3>
                <p>Depuis cette date, toutes les entreprises doivent pouvoir recevoir des factures électroniques. L'émission devient obligatoire pour les PME, TPE et micro-entreprises le 1<sup>er</sup> septembre 2027. Une amende est prévue par facture non émise sous forme électronique quand elle est obligatoire (article 1737 du CGI).</p>
              </Reveal>
              <Reveal tag="article" className="date" delay={0.14}>
                <time dateTime="2026-09-01">1<sup>er</sup> septembre 2026</time>
                <h3>4 nouvelles mentions obligatoires</h3>
                <p>Sur les factures entre entreprises assujetties :</p>
                <ul>
                  <li>le SIREN du client ;</li>
                  <li>l'adresse de livraison, si elle diffère de l'adresse de facturation ;</li>
                  <li>la nature de l'opération (biens, services ou les deux) ;</li>
                  <li>l'option pour le paiement de la TVA d'après les débits.</li>
                </ul>
              </Reveal>
              <Reveal tag="article" className="date" delay={0.28}>
                <time dateTime="2026-07">Juillet 2026</time>
                <h3>IA : 18 % des entreprises de 10 salariés ou plus l'utilisent</h3>
                <p>Selon l'INSEE (données 2025, entreprises de 10 salariés ou plus), 18 % utilisent au moins une technologie d'IA. Parmi les autres, 54 % citent le manque d'expertise et 71 % n'en voient pas l'utilité.</p>
                <p className="src">Source : <a href="https://www.insee.fr/fr/statistiques/9025878">INSEE Première n° 2120, juillet 2026</a>.</p>
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
                <SplitTitle id="dm" text="Une facture lue, ses mentions contrôlées" />
                <p>Démonstration simulée dans votre navigateur, sur une facture fictive (SIREN fictif). Elle illustre le type de contrôle appliqué à un modèle de facture : présence du SIREN du client, nature de l'opération, cohérence des montants. Dans le dossier, le contrôle porte sur 3 de vos modèles et chaque point reste à valider par vous.</p>
              </div>
              <Reveal><InvoiceDemo /></Reveal>
            </div>
          </section>

          {/* Calculateur */}
          <section id="calcul" className="dark" aria-labelledby="cl">
            <span className="label">Calculateur</span>
            <div className="tool">
              <div className="intro">
                <SplitTitle id="cl" text="Combien de temps une tâche vous coûte-t-elle ?" />
                <p>Pensez à une tâche répétitive de votre entreprise (saisie de factures, relances, rapprochements, rapports). Saisissez vos propres valeurs : aucune n'est préremplie, et aucun chiffre moyen n'est avancé. C'est une estimation de votre part, pas une promesse de gain : le Décodeur l'affine avec vous.</p>
              </div>
              <Reveal><Calculator /></Reveal>
            </div>
          </section>

          {/* Diagnostic */}
          <section id="diagnostic" className="dark" aria-labelledby="dg">
            <span className="label">Auto-diagnostic</span>
            <div className="tool">
              <div className="intro">
                <SplitTitle id="dg" text="Par quoi commencer ?" />
                <p>Cinq questions, aucune donnée envoyée. Le résultat oriente vers une offre (ou vers « pas maintenant »), il ne mesure pas la conformité de votre entreprise.</p>
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
                <p><b>Nous travaillons sur un export, sans accès à vos logiciels.</b> Pour le dossier facture électronique : une ligne par client ou fournisseur, sans noms de contacts.</p>
                <p>Si le fichier contient des entrepreneurs individuels (des personnes physiques), nous signons d'abord un contrat de sous-traitance des données (article 28 du RGPD).</p>
                <p>Vos fichiers sont supprimés après la livraison, avec confirmation par e-mail.</p>
                <p>Pour Le Décodeur : le questionnaire ne demande aucune donnée personnelle, nous n'accédons à aucune donnée de votre entreprise sans contrat écrit conforme au RGPD, et le prototype s'appuie par défaut sur des exemples fictifs ou anonymisés.</p>
              </Reveal>
            </div>
          </section>

          {/* Limites communes aux deux offres */}
          <section aria-labelledby="nf">
            <span className="label">Limites</span>
            <div className="cols">
              <SplitTitle id="nf" text="Ce que nous ne faisons pas" />
              <Reveal>
                <ul className="plain">
                  <li>Nous ne délivrons ni certification ni garantie de conformité.</li>
                  <li>Nous ne donnons pas de conseil juridique ou fiscal.</li>
                  <li>Nous ne promettons pas d'éviter une amende : nous listons des points à corriger.</li>
                  <li>Nous ne vendons ni plateforme de facturation ni outil d'IA.</li>
                  <li>Nous ne promettons aucun gain de temps chiffré avant d'avoir vu votre façon de travailler.</li>
                </ul>
                <p style={{ marginTop: 20, color: 'var(--mut)' }}>Les résultats sont des éléments de décision : la décision et la responsabilité restent les vôtres.</p>
              </Reveal>
            </div>
          </section>

          {/* Premiers retours : aucun cas publié */}
          <CaseStudy />

          {/* Équipe */}
          <Team />

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
            <GiantSlogan id="ap2" lines={['Sachez quoi corriger,', 'sachez quoi automatiser.']} />
            <p>Un e-mail d'une ligne suffit pour commencer : nous répondons avec les modalités et le prix fixe. Une courte visio est possible si vous la préférez. Sans engagement.</p>
            <div className="contact">
              <span>E-mail : <a href={mail} style={{ color: 'inherit' }}>{SITE.email}</a></span>
            </div>
          </div>
        </section>
      </main>

      <footer className="wrap">
        <div className="grid">
          <div><h3>{SITE.name}</h3><p>Facture électronique et IA pour les PME : deux offres à prix fixe, par une équipe de deux.</p></div>
          <div>
            <h3>Mentions légales</h3>
            <dl>
              <dt>Éditeur</dt><dd><Todo>À COMPLÉTER (identité et structure juridique de l'activité, à confirmer avec l'associé·e)</Todo></dd>
              <dt>SIRET</dt><dd><Todo /></dd>
              <dt>Adresse</dt><dd><Todo /></dd>
              <dt>Contact</dt><dd>E-mail : <a href={mail} style={{ color: 'inherit' }}>{SITE.email}</a></dd>
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
              <p>Éditeur (dénomination ou nom, statut) : <Todo /></p>
              <p>Structure juridique de l'activité (deux associés) : <Todo /></p>
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
