import Reveal from './Reveal';
import SplitTitle from './SplitTitle';

const Todo = ({ children = 'À COMPLÉTER' }) => <span className="todo">{children}</span>;

// Deux associés. Ne rien inventer : nom, statut exact, rôle et photos de l'associé·e sont à confirmer par Kélian.
export default function Team() {
  return (
    <section id="equipe" aria-labelledby="eq">
      <span className="label">Équipe</span>
      <SplitTitle id="eq" text="Une équipe de deux" />
      <p className="team-intro">Deux associés, deux formations : l'ENSAE Paris et l'ESSEC Business School. Vous écrivez à une seule adresse.</p>
      <div className="team">
        <Reveal tag="article" className="member">
          <span className="member-k">Associé · data science</span>
          <h3>Kélian Kaddouri</h3>
          <p className="member-school">Formé à l'ENSAE Paris, grande école d'ingénieurs en statistique et data science.</p>
          <p>Data scientist. Son métier : traiter des données en Python et automatiser des tâches répétitives.</p>
          <p className="member-todo">Photo : <Todo /></p>
        </Reveal>
        <Reveal tag="article" className="member" delay={0.14}>
          <span className="member-k">Associé·e</span>
          <h3>Nom : <Todo /></h3>
          <p className="member-school">Formé·e à l'ESSEC Business School, grande école de commerce.</p>
          <p>Statut exact et rôle dans l'équipe : <Todo /></p>
          <p className="member-todo">Photo : <Todo /></p>
        </Reveal>
      </div>
    </section>
  );
}
