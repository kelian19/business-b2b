import Reveal from './Reveal';
import SplitTitle from './SplitTitle';

// Premiers retours : aucun cas publié à ce jour. Ne rien inventer ici.
// Quand une entreprise a donné son accord écrit : ajouter son retour (résultat mesuré, citation) dans cette section.
export default function CaseStudy() {
  return (
    <section id="retour" aria-labelledby="rx">
      <span className="label">Premiers retours</span>
      <div className="cols">
        <SplitTitle id="rx" text="Aucun cas client publié pour l'instant" />
        <Reveal className="body">
          <p>Nous démarrons : nous n'avons aucune référence client à ce jour, et nous préférons le dire plutôt que d'en mettre en scène.</p>
          <p>C'est pourquoi le prix est fixe et connu avant de commencer, et pourquoi chaque livrable est décrit en détail plus haut : vous jugez sur pièces.</p>
          <p><b>Les études de cas seront publiées ici avec l'accord écrit de l'entreprise concernée,</b> et avec ses résultats mesurés, pas avant.</p>
        </Reveal>
      </div>
    </section>
  );
}
