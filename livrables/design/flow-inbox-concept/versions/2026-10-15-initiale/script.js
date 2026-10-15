'use strict';

// Illustration de site : textes éditoriaux fixes, aucun traitement de message.
const illustrations = Object.freeze({
  complete: Object.freeze({
    subject: 'Un nouveau site pour notre collectif',
    message: 'Bonjour, nous cherchons une agence pour créer un site vitrine. Nous avons un budget de 5 000 € et souhaitons une mise en ligne en janvier. Pouvons-nous en discuter ?',
    budget: '5 000 €',
    missing: 'Année souhaitée',
    draft: 'Bonjour, merci pour votre demande de site vitrine et pour les précisions sur votre budget. Pourriez-vous confirmer l’année de mise en ligne souhaitée et le contenu à prévoir ? Nous pourrons ensuite préciser les prochaines étapes.',
    announcement: 'Exemple avec budget affiché. Les panneaux de demande, de suivi et de brouillon ont été mis à jour. L’année reste à confirmer.',
  }),
  missing: Object.freeze({
    subject: 'Un site vitrine, quelques précisions à venir',
    message: 'Bonjour, nous cherchons une agence pour créer un site vitrine. Nous aimerions une mise en ligne en janvier. Nous n’avons pas encore fixé notre budget. Pouvons-nous en discuter ?',
    budget: 'Non renseigné',
    missing: 'Budget et année souhaitée',
    draft: 'Bonjour, merci pour votre demande de site vitrine. Pourriez-vous préciser votre enveloppe budgétaire, l’année de mise en ligne souhaitée et le contenu à prévoir ? Ces éléments nous aideront à cadrer la suite avec vous.',
    announcement: 'Exemple sans budget affiché. Les panneaux de demande, de suivi et de brouillon ont été mis à jour. Aucun budget n’est inventé.',
  }),
});

const scenarioButtons = document.querySelectorAll('[data-scenario]');
const bindings = Object.freeze({
  subject: document.getElementById('mail-subject'),
  message: document.getElementById('mail-text'),
  budget: document.getElementById('record-budget'),
  missing: document.getElementById('record-missing'),
  draft: document.getElementById('draft-text'),
  announcement: document.getElementById('scenario-feedback'),
});

for (const button of scenarioButtons) {
  button.addEventListener('click', () => {
    const key = button.dataset.scenario;
    if (!Object.hasOwn(illustrations, key)) return;
    for (const [name, element] of Object.entries(bindings)) {
      element.textContent = illustrations[key][name];
    }
    bindings.budget.classList.toggle('field-missing', key === 'missing');
    for (const candidate of scenarioButtons) {
      candidate.setAttribute('aria-pressed', String(candidate === button));
    }
  });
}
