(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./contracts.js'), require('./core.js'));
  else root.FlowSimulation = factory(root.FlowContracts, root.FlowCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C, Core) {
  'use strict';
  const defaults = Object.freeze({
    client_id: 'agence-demo', mailbox_id: 'boite-demo', mailbox_address: 'agence@demo.example',
    services: ['web', 'marketing', 'communication'], max_body_chars: 20000, followup_hours: 48
  });
  const faults = new Set(['none', 'tracking_uncertain', 'draft_timeout', 'draft_unstored']);

  class Simulation {
    #records = new Map();
    #drafts = new Map();
    #events = [];
    #counter = 0;
    #creates = 0;
    #config;
    #now;
    constructor(config, now) {
      const selected = config || defaults;
      if (!C.validate('config', selected).ok || !selected.services.length ||
        new Set(selected.services).size !== selected.services.length) throw new Error('INVALID_CONFIG');
      this.#config = Core.copy(selected);
      this.#now = now || '2026-10-15T12:00:00.000Z';
      if (!Core.validTimestamp(this.#now)) throw new Error('INVALID_CLOCK');
    }
    get config() { return Core.copy(this.#config); }
    get now() { return this.#now; }
    get calls() { return { simulated_draft_creates: this.#creates }; }
    list() { return Core.copy(Array.from(this.#records.values())); }
    logs() { return Core.copy(this.#events); }
    get(key) { return this.#records.has(key) ? Core.copy(this.#records.get(key)) : null; }
    #log(code, record) {
      this.#events.push({ code: code, request_id: record ? record.request_id : null, occurred_at: this.#now });
    }
    #review(record, code, status) {
      record.processing_state = 'manual_review';
      if (status) record.draft_status = status;
      if (!record.review_reasons.includes(code)) record.review_reasons.push(code);
      this.#log(code, record);
      return this.get(record.idempotency_key);
    }
    #result(kind, record, code) {
      return { kind: kind, code: code || null,
        record: record ? this.get(record.idempotency_key) : null, simulation: true };
    }
    ingest(message, extraction, fault) {
      fault = fault || 'none';
      if (!faults.has(fault)) throw new Error('INVALID_FAULT');
      const input = Core.incoming(message, this.#config);
      if (!input.ok) {
        this.#log(input.code);
        return { kind: 'rejected', code: input.code, issues: input.issues, record: null, simulation: true };
      }
      const key = Core.keyFor(input.message);
      if (this.#records.has(key)) {
        const existing = this.#records.get(key);
        this.#log('DUPLICATE_SKIPPED', existing);
        return this.#result('duplicate', existing);
      }
      const record = {
        request_id: 'req-demo-' + (++this.#counter), idempotency_key: key,
        message: input.message, extraction: null, missing_fields: [], review_reasons: [],
        processing_state: 'reserved', followup_status: 'new', recorded: false,
        draft_status: 'none', draft_id: null, draft_message_id: null,
        outbound_message_id: null, answered_at: null, confirmation_source: null, confirmed_at: null,
        created_at: this.#now, schema_version: '0.1-demo', model_id: 'simulated-fixture'
      };
      this.#records.set(key, record);
      this.#log('TRACKING_RESERVED', record);
      const qualification = Core.qualify(record.message, extraction, this.#config);
      if (!qualification.ok) {
        this.#review(record, 'EXTRACTION_INVALID');
        return this.#result('review', record, 'EXTRACTION_INVALID');
      }
      record.extraction = qualification.extraction;
      record.missing_fields = qualification.missing;
      record.processing_state = 'extracted';
      this.#log('EXTRACTION_SIMULATED', record);
      if (fault === 'tracking_uncertain') {
        this.#review(record, 'TRACKING_UNCERTAIN');
        return this.#result('review', record, 'TRACKING_UNCERTAIN');
      }
      record.recorded = true;
      record.processing_state = 'recorded';
      this.#log('TRACKING_RECORDED', record);
      const review = qualification.reasons.concat(Core.routing(record.message, this.#config));
      if (review.length) {
        for (const code of review) this.#review(record, code);
        return this.#result('review', record, review[0]);
      }
      if (qualification.extraction.scope === 'non_commercial') {
        record.processing_state = 'ignored';
        record.followup_status = 'closed';
        this.#log('NON_COMMERCIAL', record);
        return this.#result('ignored', record);
      }
      const active = Array.from(this.#records.values()).some(other =>
        other !== record && other.message.client_id === record.message.client_id &&
        other.message.mailbox_id === record.message.mailbox_id &&
        other.message.thread_id === record.message.thread_id && other.followup_status !== 'answered' &&
        ['pending', 'ready', 'uncertain', 'missing'].includes(other.draft_status));
      if (active) {
        this.#review(record, 'THREAD_ALREADY_ACTIVE');
        return this.#result('review', record, 'THREAD_ALREADY_ACTIVE');
      }
      record.processing_state = 'draft_pending';
      record.draft_status = 'pending';
      record.followup_status = 'awaiting_review';
      this.#log('DRAFT_PENDING', record);
      const payload = Core.draftFor(record.message, qualification);
      this.#creates++;
      const draft = Object.assign(payload, {
        id: 'draft-demo-' + this.#creates, message_id: 'draft-message-demo-' + (++this.#counter),
        client_id: this.#config.client_id, mailbox_id: this.#config.mailbox_id,
        // Corrélation du faux fournisseur uniquement, pas une capacité Gmail démontrée.
        mock_request_id: record.request_id
      });
      this.#drafts.set(draft.id, draft);
      this.#log('SIMULATED_DRAFT_CREATED', record);
      if (fault === 'draft_timeout' || fault === 'draft_unstored') {
        this.#review(record, 'DRAFT_EFFECT_UNCERTAIN', 'uncertain');
        return this.#result('review', record, 'DRAFT_EFFECT_UNCERTAIN');
      }
      record.draft_id = draft.id;
      record.draft_message_id = draft.message_id;
      record.draft_status = 'ready';
      record.processing_state = 'draft_ready';
      this.#log('DRAFT_READY', record);
      return this.#result('ready', record);
    }
    draft(key) {
      const record = this.#records.get(key);
      if (!record) return null;
      const candidates = Array.from(this.#drafts.values()).filter(draft =>
        draft.mock_request_id === record.request_id && draft.client_id === this.#config.client_id &&
        draft.mailbox_id === this.#config.mailbox_id);
      return candidates.length === 1 ? Core.copy(candidates[0]) : null;
    }
    observe(key, options) {
      const record = this.#records.get(key);
      if (!record) return { kind: 'not_found', simulation: true };
      if (record.followup_status === 'answered') return this.#result('answered', record);
      if (record.draft_status === 'none') return this.#result('unchanged', record);
      options = options || {};
      if (options.read_error) {
        const code = options.read_error === 'revoked' ? 'ACCESS_REVOKED' : 'READ_FAILED';
        this.#review(record, code);
        return this.#result('review', record, code);
      }
      if (options.complete === false) {
        this.#review(record, 'RECONCILIATION_INCOMPLETE');
        return this.#result('review', record, 'RECONCILIATION_INCOMPLETE');
      }
      const draft = this.draft(key);
      if (!draft || draft.thread_id !== record.message.thread_id || draft.to !== record.message.from ||
        draft.in_reply_to !== record.message.rfc_message_id) {
        this.#review(record, 'DRAFT_MISSING_OR_AMBIGUOUS', 'missing');
        return this.#result('review', record, 'DRAFT_MISSING_OR_AMBIGUOUS');
      }
      record.draft_id = draft.id;
      record.draft_message_id = draft.message_id;
      record.draft_status = 'ready';
      record.processing_state = 'draft_ready';
      record.review_reasons = record.review_reasons.filter(code => ![
        'DRAFT_EFFECT_UNCERTAIN', 'READ_FAILED', 'RECONCILIATION_INCOMPLETE', 'DRAFT_MISSING_OR_AMBIGUOUS'
      ].includes(code));
      if (record.review_reasons.length) record.processing_state = 'manual_review';
      this.#log('DRAFT_OBSERVED_SIMULATED', record);
      return this.#result(record.review_reasons.length ? 'review' : 'ready', record);
    }
    editDraft(key, value) {
      const draft = this.draft(key);
      if (!draft || typeof value !== 'string' || !value.trim() || value.length > 6000) return false;
      const stored = this.#drafts.get(draft.id);
      stored.text = value;
      stored.message_id = 'draft-message-demo-' + (++this.#counter);
      this.#log('HUMAN_EDIT_SIMULATED', this.#records.get(key));
      return true;
    }
    removeDraft(key) {
      const draft = this.draft(key);
      if (!draft) return false;
      this.#drafts.delete(draft.id);
      this.#log('DRAFT_REMOVAL_SIMULATED', this.#records.get(key));
      return true;
    }
    confirmSimulatedReply(key, outgoing) {
      const record = this.#records.get(key);
      if (!record) return { kind: 'not_found', simulation: true };
      if (record.followup_status === 'answered') return this.#result('answered', record);
      if (!record.extraction || record.extraction.scope !== 'commercial' ||
        !Core.matchesReply(record, outgoing, this.#config) || Date.parse(outgoing.sent_at) > Date.parse(this.#now)) {
        this.#log('OUTBOUND_NOT_CONFIRMED', record);
        return this.#result('unconfirmed', record, 'OUTBOUND_NOT_CONFIRMED');
      }
      if (record.draft_id) this.#drafts.delete(record.draft_id);
      record.outbound_message_id = outgoing.id;
      record.answered_at = outgoing.sent_at;
      record.confirmed_at = this.#now;
      record.confirmation_source = 'simulated_provider';
      record.followup_status = 'answered';
      record.processing_state = 'recorded';
      record.draft_status = 'absent_after_simulated_reply';
      this.#log('SIMULATED_REPLY_CONFIRMED', record);
      return this.#result('answered', record);
    }
    sheetRows() {
      return this.list().filter(record => record.recorded).map(record => ({
        request_id: record.request_id, subject: Core.sheetSafe(record.message.subject),
        company: Core.sheetSafe(record.extraction.company),
        service: Core.sheetSafe(record.extraction.service),
        summary: Core.sheetSafe(record.extraction.summary), status: record.followup_status
      }));
    }
  }
  return Object.freeze({ Simulation: Simulation, defaults: defaults });
});
