(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./contracts.js'));
  else root.FlowCore = factory(root.FlowContracts);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const headerControls = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
  const labels = Object.freeze({ web: 'site web', marketing: 'marketing', communication: 'communication' });
  const text = value => value.normalize('NFC').replace(/\r\n?/g, '\n').trim();
  const keyFor = message => JSON.stringify([message.client_id, message.mailbox_id, message.provider_message_id]);

  function validTimestamp(value) {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
    return Boolean(match && validDate(match[1]) && +match[2] < 24 && +match[3] < 60 &&
      +match[4] < 60 && (!match[6] || (+match[6] <= 14 && +match[7] < 60 &&
      (+match[6] < 14 || +match[7] === 0))) && Number.isFinite(Date.parse(value)));
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function incoming(message, config) {
    const result = C.validate('incoming', message);
    if (!result.ok) return { ok: false, code: 'INPUT_INVALID', issues: result.issues };
    if (message.client_id !== config.client_id || message.mailbox_id !== config.mailbox_id)
      return { ok: false, code: 'WRONG_CONTEXT', issues: [] };
    if (!validTimestamp(message.received_at))
      return { ok: false, code: 'INVALID_DATE', issues: [] };
    if (message.body_text.length > config.max_body_chars || !text(message.body_text) || !text(message.subject))
      return { ok: false, code: 'INPUT_SIZE', issues: [] };
    if (headerControls.test(message.subject))
      return { ok: false, code: 'HEADER_CONTROL', issues: [] };
    const normalized = copy(message);
    normalized.body_text = text(message.body_text);
    return { ok: true, message: normalized };
  }

  function amount(value) {
    if (!/^(?:\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?:,\d{1,2})?$/.test(value)) return null;
    const numeric = Number(value.replace(/[ \u00a0\u202f]/g, '').replace(',', '.'));
    const cents = Math.round(numeric * 100);
    return Number.isSafeInteger(cents) && cents <= 10000000000 ? cents : null;
  }
  function budgetEvidence(raw) {
    const source = raw.trim();
    const unit = '(?:€|EUR)';
    let match = new RegExp('^(.+?)\\s*' + unit + '$', 'iu').exec(source);
    if (match) {
      const cents = amount(match[1].trim());
      if (cents !== null) return { min: cents, max: cents, currency: 'EUR' };
    }
    match = new RegExp('^entre\\s+(.+?)\\s+et\\s+(.+?)\\s*' + unit + '$', 'iu').exec(source);
    if (match) {
      const low = amount(match[1].trim()), high = amount(match[2].trim());
      if (low !== null && high !== null && low <= high) return { min: low, max: high, currency: 'EUR' };
    }
    match = new RegExp('^à partir de\\s+(.+?)\\s*' + unit + '$', 'iu').exec(source);
    if (match) {
      const low = amount(match[1].trim());
      if (low !== null) return { min: low, max: null, currency: 'EUR' };
    }
    return null;
  }
  function cents(value) {
    if (value === null) return null;
    const scaled = value * 100;
    return Math.abs(scaled - Math.round(scaled)) < 0.000001 ? Math.round(scaled) : NaN;
  }
  function qualify(message, extraction, config) {
    const contract = C.validate('extraction', extraction);
    if (!contract.ok) return { ok: false, reasons: ['EXTRACTION_INVALID'], issues: contract.issues };
    const reasons = [];
    const missing = [];
    const evidence = field => extraction.evidence.filter(item => item.field === field &&
      text(item.quote) && message.body_text.includes(text(item.quote)));
    for (const item of extraction.evidence) {
      if (!text(item.quote) || !message.body_text.includes(text(item.quote))) reasons.push('UNSUPPORTED_EVIDENCE');
    }
    const proved = (field, value) => evidence(field).some(item => text(item.quote).includes(value));
    if (extraction.service !== 'unknown' && extraction.service !== 'other' && !evidence('service').length)
      reasons.push('SERVICE_WITHOUT_EVIDENCE');
    if (extraction.company !== null && !proved('company', extraction.company))
      reasons.push('COMPANY_WITHOUT_EVIDENCE');
    if (extraction.scope === 'uncertain') reasons.push('UNCERTAIN_SCOPE');
    if (extraction.scope === 'commercial' && !config.services.includes(extraction.service)) {
      reasons.push('SERVICE_REQUIRES_REVIEW'); missing.push('service');
    }
    if (extraction.budget === null) missing.push('budget');
    else {
      const budget = extraction.budget;
      const parsed = budgetEvidence(budget.raw_text);
      if (!proved('budget', budget.raw_text) || !parsed || budget.currency !== parsed.currency ||
        cents(budget.min) !== parsed.min || cents(budget.max) !== parsed.max)
        reasons.push('BUDGET_REQUIRES_REVIEW');
    }
    if (extraction.deadline === null) missing.push('deadline');
    else {
      const deadline = extraction.deadline;
      if (!proved('deadline', deadline.raw_text)) reasons.push('DEADLINE_WITHOUT_EVIDENCE');
      if (deadline.precision === 'exact') {
        if (!deadline.date_iso || !validDate(deadline.date_iso) || !deadline.raw_text.includes(deadline.date_iso))
          reasons.push('DEADLINE_REQUIRES_REVIEW');
      } else {
        if (deadline.date_iso !== null) reasons.push('INVENTED_DATE');
        missing.push('deadline_precision');
      }
    }
    return { ok: true, reasons: Array.from(new Set(reasons)), missing: missing,
      extraction: copy(extraction) };
  }

  function routing(message, config) {
    const reasons = [];
    if (message.reply_to && message.reply_to.toLowerCase() !== message.from.toLowerCase())
      reasons.push('DIVERGENT_REPLY_TO');
    if (message.from.toLowerCase() === config.mailbox_address.toLowerCase())
      reasons.push('OWN_MESSAGE');
    if (/<\/?[A-Za-z][^>]*>/.test(message.body_text)) reasons.push('HTML_REQUIRES_REVIEW');
    return reasons;
  }
  function draftFor(message, qualification) {
    if (!qualification.ok || qualification.reasons.length ||
      !Object.hasOwn(labels, qualification.extraction.service)) throw new Error('DRAFT_NOT_QUALIFIED');
    const questions = [];
    if (qualification.missing.includes('budget')) questions.push('votre enveloppe budgétaire');
    if (qualification.missing.includes('deadline')) questions.push('votre échéance souhaitée');
    if (qualification.missing.includes('deadline_precision')) questions.push('la date précise, année comprise');
    questions.push('le contenu à prévoir');
    return {
      to: message.from, cc: [], bcc: [], subject: message.subject, thread_id: message.thread_id,
      in_reply_to: message.rfc_message_id,
      references: Array.from(new Set(message.rfc_references.concat(message.rfc_message_id))),
      text: 'Bonjour,\n\nMerci pour votre demande de ' + labels[qualification.extraction.service] +
        '. Pourriez-vous préciser ' + questions.join(', ') +
        ' ?\n\nCes éléments nous aideront à cadrer les prochaines étapes.\n\nBonne journée',
      simulation: true
    };
  }
  function sheetSafe(value) {
    const raw = String(value ?? '');
    const probe = raw.replace(/^[\s\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060\ufeff]+/u, '');
    return /^[=+@-]/.test(probe) ? "'" + raw : raw;
  }
  function followupDue(record, now, hours) {
    if (!validTimestamp(now) || !Number.isInteger(hours) || hours < 1) throw new Error('INVALID_CLOCK');
    if (!record.extraction || record.extraction.scope !== 'commercial' ||
      record.followup_status === 'answered' || record.followup_status === 'closed') return false;
    return Date.parse(now) - Date.parse(record.message.received_at) >= hours * 3600000;
  }
  function matchesReply(record, outgoing, config) {
    if (!C.validate('outgoing', outgoing).ok || !validTimestamp(outgoing.sent_at)) return false;
    return outgoing.labels.includes('SENT') && !outgoing.automatic &&
      outgoing.thread_id === record.message.thread_id &&
      outgoing.in_reply_to === record.message.rfc_message_id &&
      outgoing.from.toLowerCase() === config.mailbox_address.toLowerCase() &&
      outgoing.to.toLowerCase() === record.message.from.toLowerCase() &&
      Date.parse(outgoing.sent_at) >= Date.parse(record.message.received_at) &&
      outgoing.id !== record.message.provider_message_id && outgoing.id !== record.draft_message_id;
  }
  return Object.freeze({ copy: copy, incoming: incoming, qualify: qualify, routing: routing,
    draftFor: draftFor, keyFor: keyFor, sheetSafe: sheetSafe, followupDue: followupDue,
    matchesReply: matchesReply, validTimestamp: validTimestamp, budgetEvidence: budgetEvidence });
});
