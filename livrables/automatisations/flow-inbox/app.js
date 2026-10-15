'use strict';
(function () {
  const Core = window.FlowCore;
  const examples = window.FlowFixtures.scenarios();
  let simulation = new window.FlowSimulation.Simulation();
  let selected = examples[0];
  let feedbackText = 'Choisissez un exemple puis lancez son traitement local.';
  let feedbackKind = '';
  let editorKey = null, editorMessageId = null, dirty = false;
  const byId = id => document.getElementById(id);
  const fieldNames = {
    service: 'Service', budget: 'Budget', deadline: 'Échéance',
    deadline_precision: 'Date précise et année'
  };
  const states = {
    reserved: 'Réservée', extracted: 'Extraction validée', recorded: 'Suivi enregistré',
    draft_pending: 'Création en cours', draft_ready: 'Brouillon à relire',
    manual_review: 'Revue humaine', ignored: 'Hors périmètre'
  };
  const draftStates = {
    none: 'Aucun', pending: 'En cours', ready: 'Prêt, simulé', uncertain: 'Création incertaine',
    missing: 'Absent, cause non confirmée', absent_after_simulated_reply: 'Réponse fictive confirmée'
  };
  const reasons = {
    INPUT_INVALID: 'Entrée non conforme : référence email, type ou champ invalide.',
    INVALID_DATE: 'Date non valide.', INPUT_SIZE: 'Texte vide ou trop long.',
    WRONG_CONTEXT: 'La demande ne correspond pas à l’agence et à la boîte configurées.',
    HEADER_CONTROL: 'Un en-tête contient un caractère interdit.',
    EXTRACTION_INVALID: 'La sortie IA simulée ne respecte pas le contrat : aucune donnée qualifiée enregistrée.',
    DIVERGENT_REPLY_TO: 'Le Reply-To diffère de l’expéditeur : une revue humaine est nécessaire.',
    OWN_MESSAGE: 'Ce message provient de la boîte elle-même.',
    HTML_REQUIRES_REVIEW: 'Le contenu HTML nécessite une revue ; aucun lien ou fichier n’est chargé.',
    UNSUPPORTED_EVIDENCE: 'Un extrait censé servir de preuve est absent du texte.',
    SERVICE_WITHOUT_EVIDENCE: 'Le service extrait n’a pas de preuve dans le texte.',
    COMPANY_WITHOUT_EVIDENCE: 'Le nom d’entreprise extrait n’a pas de preuve dans le texte.',
    UNCERTAIN_SCOPE: 'Le périmètre commercial est incertain.',
    SERVICE_REQUIRES_REVIEW: 'Le service demande une qualification humaine.',
    BUDGET_REQUIRES_REVIEW: 'Le budget extrait ne correspond pas à une preuve numérique vérifiable.',
    DEADLINE_WITHOUT_EVIDENCE: 'L’échéance extraite n’a pas de preuve dans le texte.',
    DEADLINE_REQUIRES_REVIEW: 'La date exacte ne peut pas être confirmée.',
    INVENTED_DATE: 'Une date précise a été ajoutée à une échéance ambiguë.',
    TRACKING_UNCERTAIN: 'Écriture du suivi incertaine : aucun brouillon créé. La demande reste à revoir.',
    THREAD_ALREADY_ACTIVE: 'Un brouillon existe déjà dans ce fil. La nouvelle demande est conservée et attend une revue.',
    DRAFT_EFFECT_UNCERTAIN: 'Un brouillon a peut-être été créé. Rejouer ne le recrée pas ; utilisez « Revoir l’état simulé ».',
    DRAFT_MISSING_OR_AMBIGUOUS: 'Brouillon absent ou ambigu. Cela ne prouve pas un envoi ; aucune recréation automatique.',
    ACCESS_REVOKED: 'Accès refusé : traitement suspendu.',
    READ_FAILED: 'Lecture en échec : aucune absence déduite.',
    RECONCILIATION_INCOMPLETE: 'Recherche incomplète : aucune absence déduite.'
  };
  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }
  function currentRecord() { return simulation.get(Core.keyFor(selected.sample.message)); }
  function visibleDraft(record) {
    if (!record || record.draft_status !== 'ready' || !record.draft_id) return null;
    const draft = simulation.draft(record.idempotency_key);
    return draft && draft.id === record.draft_id ? draft : null;
  }
  function choose(example) {
    selected = example; dirty = false; editorKey = null;
    feedbackKind = '';
    feedbackText = currentRecord() ? 'Exemple déjà présent dans le suivi de cette session.' :
      'Cet exemple est prêt à être traité localement.';
    render();
  }
  examples.forEach((example, index) => {
    const button = node('button', 'scenario-choice');
    button.type = 'button'; button.dataset.scenario = example.id;
    button.setAttribute('aria-controls', 'scenario-title');
    button.append(node('span', '', String(index + 1).padStart(2, '0')), node('span', '', example.title));
    button.addEventListener('click', () => choose(example));
    byId('scenarios').append(button);
  });
  function render() {
    const sample = selected.sample;
    const record = currentRecord();
    const draft = visibleDraft(record);
    byId('scenarios').querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.scenario === selected.id));
    });
    byId('scenario-title').textContent = selected.title;
    byId('scenario-description').textContent = selected.description;
    byId('sender').textContent = sample.message.from;
    byId('subject').textContent = sample.message.subject;
    byId('body').textContent = sample.message.body_text;
    byId('extraction').replaceChildren();
    const data = sample.extraction;
    [
      ['Service', data.service === 'web' ? 'Site web' : data.service],
      ['Entreprise', data.company || 'Non renseignée'],
      ['Budget', data.budget ? data.budget.raw_text : 'Non renseigné'],
      ['Échéance citée', data.deadline ? data.deadline.raw_text : 'Non renseignée'],
      ['Date exacte', data.deadline && data.deadline.date_iso ? data.deadline.date_iso : 'À confirmer']
    ].forEach(pair => {
      const row = node('div'); row.append(node('dt', '', pair[0]), node('dd', '', pair[1]));
      byId('extraction').append(row);
    });
    byId('feedback').textContent = feedbackText; byId('feedback').dataset.kind = feedbackKind;
    byId('draft-badge').textContent = record ? draftStates[record.draft_status] : 'EN ATTENTE';
    const editor = byId('draft-text');
    editor.disabled = !draft;
    if (draft) {
      if (!dirty || editorKey !== record.idempotency_key || editorMessageId !== draft.message_id) {
        editor.value = draft.text; dirty = false;
      }
      editorKey = record.idempotency_key; editorMessageId = draft.message_id;
    } else { editor.value = ''; dirty = false; editorKey = null; editorMessageId = null; }
    byId('draft-explainer').textContent = draft ?
      'Brouillon texte du faux fournisseur. Modifiez-le puis enregistrez la retouche pour vérifier sa conservation au rejeu.' :
      record && record.review_reasons.length ? reasons[record.review_reasons[0]] || 'Revue humaine nécessaire.' :
      record && record.followup_status === 'answered' ? 'La réponse confirmée est un événement fictif, pas un message Gmail.' :
      'Aucun brouillon confirmé pour cet exemple. Un refus ou un effet incertain ne déclenche pas de création aveugle.';
    byId('save').disabled = !draft;
    byId('remove').disabled = !draft;
    byId('confirm').disabled = !draft || record.processing_state !== 'draft_ready';
    byId('observe').disabled = !record || record.draft_status === 'none' || record.followup_status === 'answered';
    byId('process').textContent = record ? 'Rejouer cet exemple ↻' : 'Traiter cet exemple ↗';
    renderTracking();
    byId('identity').textContent = record ? JSON.stringify({
      demande: record.request_id, cle: record.idempotency_key,
      id_api_entrant: record.message.provider_message_id, message_id_mime: record.message.rfc_message_id,
      fil: record.message.thread_id, brouillon: record.draft_id,
      message_du_brouillon: record.draft_message_id, sortie: record.outbound_message_id,
      source_confirmation: record.confirmation_source
    }, null, 2) : 'Aucune demande enregistrée pour cet exemple.';
    byId('events').textContent = simulation.logs().map(event =>
      event.occurred_at + '  ' + (event.request_id || 'entrée-refusée') + '  ' + event.code
    ).join('\n') || 'Aucun événement.';
  }
  function renderTracking() {
    const records = simulation.list();
    byId('metric-requests').textContent = records.length;
    byId('metric-drafts').textContent = simulation.calls.simulated_draft_creates;
    byId('metric-replies').textContent = records.filter(record => record.followup_status === 'answered').length;
    byId('tracking-empty').hidden = records.length > 0;
    byId('tracking-wrapper').hidden = records.length === 0;
    byId('tracking').replaceChildren();
    for (const record of records) {
      const row = node('tr'), identity = node('td');
      const button = node('button', 'record-link', record.request_id);
      button.type = 'button';
      button.addEventListener('click', () => {
        const example = examples.find(item => Core.keyFor(item.sample.message) === record.idempotency_key);
        if (example) choose(example);
        byId('scenario-title').scrollIntoView({ block: 'center' });
      });
      identity.append(button, node('span', 'record-extra', record.recorded ? 'Suivi simulé confirmé' : 'Réservation / suivi non confirmé'));
      const state = node('td');
      state.append(node('span', 'badge ' + (record.processing_state === 'manual_review' ? 'badge-review' : 'badge-ready'),
        states[record.processing_state]));
      row.append(identity, state,
        node('td', '', record.missing_fields.map(field => fieldNames[field] || field).join(', ') || '—'),
        node('td', '', draftStates[record.draft_status]),
        node('td', '', record.followup_status === 'answered' ? 'Confirmée fictivement' : 'Non confirmée'));
      byId('tracking').append(row);
    }
  }
  byId('draft-text').addEventListener('input', () => { dirty = true; });
  byId('process').addEventListener('click', () => {
    const sample = selected.sample;
    const result = simulation.ingest(sample.message, sample.extraction, sample.fault);
    feedbackKind = result.kind;
    feedbackText = result.kind === 'duplicate' ? 'Rejeu ignoré : aucun nouveau suivi ni brouillon. Les retouches enregistrées sont préservées.' :
      result.kind === 'ready' ? 'Demande organisée et brouillon local prêt. La réponse reste à relire ; rien n’est envoyé.' :
      reasons[result.code] || 'Ce cas nécessite une revue humaine.';
    render();
  });
  byId('save').addEventListener('click', () => {
    const record = currentRecord(); if (!record) return;
    if (simulation.editDraft(record.idempotency_key, byId('draft-text').value)) {
      simulation.observe(record.idempotency_key); dirty = false;
      feedbackKind = 'ready'; feedbackText = 'Retouche enregistrée dans le faux fournisseur. Rejouez : elle sera conservée.';
    } else {
      feedbackKind = 'review'; feedbackText = 'Retouche refusée : texte vide, trop long ou brouillon absent.';
    }
    render();
  });
  byId('observe').addEventListener('click', () => {
    const record = currentRecord(); if (!record) return;
    const result = simulation.observe(record.idempotency_key);
    feedbackKind = result.kind;
    feedbackText = result.kind === 'ready' ? 'Brouillon retrouvé par la corrélation du faux fournisseur, sans nouvelle création.' :
      reasons[result.code] || 'État conservé pour revue.';
    render();
  });
  byId('remove').addEventListener('click', () => {
    const record = currentRecord(); if (!record) return;
    simulation.removeDraft(record.idempotency_key);
    simulation.observe(record.idempotency_key); dirty = false;
    feedbackKind = 'review';
    feedbackText = 'Brouillon disparu dans le simulateur. Aucune réponse déduite, aucune recréation automatique.';
    render();
  });
  byId('confirm').addEventListener('click', () => {
    const record = currentRecord(); if (!record) return;
    const result = simulation.confirmSimulatedReply(record.idempotency_key, {
      id: 'sortie-' + record.request_id, thread_id: record.message.thread_id,
      from: simulation.config.mailbox_address, to: record.message.from,
      in_reply_to: record.message.rfc_message_id, sent_at: simulation.now, labels: ['SENT'], automatic: false
    });
    feedbackKind = result.kind; dirty = false;
    feedbackText = result.kind === 'answered' ?
      'Réponse confirmée à partir d’un événement sortant fictif. Aucun email réellement envoyé ni vérifié dans Gmail.' :
      'La preuve fictive ne permet pas de confirmer cette réponse.';
    render();
  });
  byId('reset').addEventListener('click', () => {
    simulation = new window.FlowSimulation.Simulation();
    selected = examples[0]; dirty = false; editorKey = null; editorMessageId = null;
    feedbackKind = ''; feedbackText = 'Session fictive réinitialisée. Aucune donnée conservée.';
    render();
  });
  render();
})();
