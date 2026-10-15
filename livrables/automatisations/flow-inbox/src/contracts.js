(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlowContracts = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const string = (min, max, pattern) => Object.assign(
    { type: 'string', minLength: min, maxLength: max },
    pattern ? { pattern: pattern } : {}
  );
  const nullable = schema => Object.assign({}, schema, { type: [schema.type, 'null'] });
  const enumeration = values => ({ enum: values });
  const object = properties => ({
    type: 'object', additionalProperties: false,
    required: Object.keys(properties), properties: properties
  });
  const array = (items, maxItems) => ({ type: 'array', items: items, maxItems: maxItems });
  const id = string(1, 100, '^[A-Za-z0-9._:-]+$');
  const address = string(3, 254, '^[A-Za-z0-9][A-Za-z0-9._+-]*@[A-Za-z0-9][A-Za-z0-9.-]*\\.[A-Za-z]{2,}$');
  const rfcId = string(5, 254, '^<[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+>$');
  const timestamp = string(20, 35, '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?(?:Z|[+-]\\d{2}:\\d{2})$');
  const service = enumeration(['web', 'marketing', 'communication', 'other', 'unknown']);
  const schemas = {
    incoming: object({
      client_id: id, mailbox_id: id, provider_message_id: id, thread_id: id,
      received_at: timestamp, from: address, reply_to: nullable(address),
      subject: string(1, 200), body_text: string(1, 20000),
      rfc_message_id: rfcId, rfc_references: array(rfcId, 20)
    }),
    extraction: object({
      schema_version: enumeration(['0.1-demo']),
      scope: enumeration(['commercial', 'non_commercial', 'uncertain']),
      service: service, company: nullable(string(1, 160)),
      budget: nullable(object({
        min: nullable({ type: 'number', minimum: 0, maximum: 100000000 }),
        max: nullable({ type: 'number', minimum: 0, maximum: 100000000 }),
        currency: enumeration(['EUR', null]), raw_text: string(1, 160)
      })),
      deadline: nullable(object({
        raw_text: string(1, 200), date_iso: nullable(string(10, 10, '^\\d{4}-\\d{2}-\\d{2}$')),
        precision: enumeration(['exact', 'text', 'unknown'])
      })),
      summary: string(1, 700),
      evidence: array(object({
        field: enumeration(['service', 'company', 'budget', 'deadline']),
        quote: string(1, 500)
      }), 12)
    }),
    config: object({
      client_id: id, mailbox_id: id, mailbox_address: address,
      services: array(enumeration(['web', 'marketing', 'communication']), 3),
      max_body_chars: { type: 'integer', minimum: 1, maximum: 20000 },
      followup_hours: { type: 'integer', minimum: 1, maximum: 720 }
    }),
    outgoing: object({
      id: id, thread_id: id, from: address, to: address,
      in_reply_to: rfcId, sent_at: timestamp,
      labels: array(string(1, 30), 10), automatic: { type: 'boolean' }
    })
  };

  // Sous-ensemble fermé de JSON Schema : aucun $ref, format ou mot-clé ignoré.
  const keywords = new Set(['type', 'enum', 'required', 'properties', 'additionalProperties',
    'items', 'maxItems', 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum']);
  function audit(schema) {
    for (const key of Object.keys(schema)) {
      if (!keywords.has(key)) throw new Error('UNSUPPORTED_SCHEMA_KEYWORD');
    }
    if (schema.properties) Object.values(schema.properties).forEach(audit);
    if (schema.items) audit(schema.items);
  }
  Object.values(schemas).forEach(audit);

  function plain(value) {
    return value !== null && typeof value === 'object' &&
      !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
  }
  function typeMatches(value, type) {
    if (type === 'null') return value === null;
    if (type === 'object') return plain(value);
    if (type === 'array') return Array.isArray(value);
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
    if (type === 'integer') return Number.isSafeInteger(value);
    return typeof value === type;
  }
  function validate(name, value) {
    if (!Object.hasOwn(schemas, name)) throw new Error('UNKNOWN_SCHEMA');
    const issues = [];
    function visit(schema, item, path) {
      if (schema.type && !(Array.isArray(schema.type) ? schema.type : [schema.type])
        .some(type => typeMatches(item, type))) {
        issues.push({ path: path, code: 'TYPE' }); return;
      }
      if (schema.enum && !schema.enum.includes(item)) {
        issues.push({ path: path, code: 'ENUM' }); return;
      }
      if (item === null) return;
      if (typeof item === 'string') {
        if (item.length < (schema.minLength || 0) || item.length > (schema.maxLength || Infinity))
          issues.push({ path: path, code: 'LENGTH' });
        if (schema.pattern && !new RegExp(schema.pattern, 'u').test(item))
          issues.push({ path: path, code: 'PATTERN' });
      }
      if (typeof item === 'number' && (item < (schema.minimum ?? -Infinity) || item > (schema.maximum ?? Infinity)))
        issues.push({ path: path, code: 'BOUNDS' });
      if (Array.isArray(item) && schema.items) {
        if (item.length > schema.maxItems) issues.push({ path: path, code: 'ITEM_COUNT' });
        item.slice(0, schema.maxItems).forEach((child, index) => visit(schema.items, child, path + '/' + index));
      }
      if (plain(item) && schema.properties) {
        for (const key of schema.required) {
          if (!Object.hasOwn(item, key)) issues.push({ path: path + '/' + key, code: 'REQUIRED' });
        }
        // Ne jamais recopier le nom arbitraire d'un champ rejeté dans un journal.
        if (Object.keys(item).some(key => !Object.hasOwn(schema.properties, key)))
          issues.push({ path: path, code: 'EXTRA_PROPERTY' });
        for (const [key, childSchema] of Object.entries(schema.properties)) {
          if (Object.hasOwn(item, key)) visit(childSchema, item[key], path + '/' + key);
        }
      }
    }
    visit(schemas[name], value, '');
    return { ok: issues.length === 0, issues: issues };
  }
  return Object.freeze({ schemas: schemas, validate: validate, plain: plain });
});
