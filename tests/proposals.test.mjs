// proposals.test.mjs - guard rails for the weekly Claude proposal job (scripts/propose/). No network: the model
// client is a stub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDataset, loadDataDir } from '../scripts/validate-data.mjs';
import { applyProposals, parseReply, responseSchema, buildUserPrompt, renderPrBody, formatCompact, MAX_APPLIED, ALL_FIELDS } from '../scripts/propose/proposals-lib.mjs';
import { propose, askModel } from '../scripts/propose/propose-updates.mjs';

const data = loadDataDir(new URL('../data', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const TODAY = '2026-11-10';
const NOW = Date.parse('2026-11-10T08:00:00Z');
const feedItems = [
  { id: 'f1', title: 'FIDO publishes a passkey profile', link: 'https://fidoalliance.org/a/', published: '2026-11-08T10:00:00.000Z', summary: 's', source: 'FIDO Alliance', sourceId: 'fido' },
  { id: 'f2', title: 'NIST update', link: 'https://www.nist.gov/b', published: '2026-11-07T10:00:00.000Z', summary: 's', source: 'NIST News', sourceId: 'nist' },
  { id: 'f3', title: 'Insecure', link: 'http://example.org/c', published: '2026-11-07T10:00:00.000Z', summary: 's', source: 'X', sourceId: 'nope' }
];
const none = Object.fromEntries(ALL_FIELDS.map((f) => [f, null]));
const prop = (over) => ({ kind: 'trend', id: 'passkeys-passwordless', changes: { ...none, summary: 'A tighter summary of passkeys.' }, evidence: ['f1'], rationale: 'FIDO published a profile.', ...over });
const trend = (d, id) => d.trends.find((t) => t.id === id);

test('the committed dataset is valid (baseline for these tests)', () => {
  assert.deepEqual(validateDataset(data).errors, []);
});

test('a well-supported edit is applied, flagged for verification, sourced from the feed item, and stays valid', () => {
  const r = applyProposals(data, [prop()], feedItems, { today: TODAY });
  assert.equal(r.rejected.length, 0, JSON.stringify(r.rejected));
  assert.equal(r.applied.length, 1);
  const t = trend(r.data, 'passkeys-passwordless');
  assert.equal(t.summary, 'A tighter summary of passkeys.');
  assert.equal(t.lastUpdated, TODAY);
  assert.equal(t.needsVerification, true);
  assert.match(t.verificationNotes, /fidoalliance\.org\/a\//);
  const added = t.sources.find((s) => s.url === 'https://fidoalliance.org/a/');
  assert.deepEqual({ title: added.title, publisher: added.publisher, type: added.type, published: added.published, accessed: added.accessed },
    { title: 'FIDO publishes a passkey profile', publisher: 'FIDO Alliance', type: 'news', published: '2026-11-08', accessed: TODAY });
  assert.equal(r.data.meta.lastUpdated, TODAY);
  assert.deepEqual(validateDataset(r.data).errors, []);
  assert.equal(trend(data, 'passkeys-passwordless').summary === t.summary, false, 'input data is not mutated');
});

test('proposals without real evidence, with unknown ids, or with no real change are rejected', () => {
  const cases = [
    [prop({ evidence: [] }), /cites no feed item/],
    [prop({ evidence: ['made-up'] }), /cites no feed item/],
    [prop({ id: 'no-such-trend' }), /no such id/],
    [prop({ kind: 'widget' }), /unknown kind/],
    [prop({ changes: { ...none } }), /no field differs/],
    [prop({ changes: { ...none, summary: trend(data, 'passkeys-passwordless').summary } }), /no field differs/]
  ];
  for (const [p, re] of cases) {
    const r = applyProposals(data, [p], feedItems, { today: TODAY });
    assert.equal(r.applied.length, 0, JSON.stringify(p));
    assert.match(r.rejected[0].reason, re);
  }
});

test('fields outside the allow-list and invalid enum values are rejected', () => {
  let r = applyProposals(data, [prop({ changes: { ...none, title: 'Renamed', summary: 'x' } })], feedItems, { today: TODAY });
  assert.match(r.rejected[0].reason, /"title" cannot be edited/);
  r = applyProposals(data, [prop({ changes: { ...none, horizon: 'now' } })], feedItems, { today: TODAY });
  assert.match(r.rejected[0].reason, /"horizon" cannot be edited on a trend/);
  r = applyProposals(data, [prop({ changes: { ...none, momentum: 'exploding' } })], feedItems, { today: TODAY });
  assert.match(r.rejected[0].reason, /not a valid momentum/);
});

test('edits that would break validation are rejected (length limit, unsourced statistic in a recommendation)', () => {
  let r = applyProposals(data, [prop({ changes: { ...none, summary: 'x'.repeat(400) } })], feedItems, { today: TODAY });
  assert.match(r.rejected[0].reason, /would break validation/);
  const rec = data.recommendations[0];
  r = applyProposals(data, [{ kind: 'recommendation', id: rec.id, changes: { ...none, description: 'Cut costs by 40% with passkeys.' }, evidence: ['f1'], rationale: 'r' }], feedItems, { today: TODAY });
  assert.match(r.rejected[0].reason, /would break validation/);
  assert.equal(r.applied.length, 0);
});

test('a valid recommendation edit is applied without touching the verification flag of any trend', () => {
  const rec = data.recommendations[0];
  const r = applyProposals(data, [{ kind: 'recommendation', id: rec.id, changes: { ...none, horizon: rec.horizon === 'now' ? 'next' : 'now' }, evidence: ['f2'], rationale: 'r' }], feedItems, { today: TODAY });
  assert.equal(r.applied.length, 1);
  assert.equal(r.data.recommendations[0].lastUpdated, TODAY);
  assert.deepEqual(r.data.trends, data.trends);
});

test('only https feed links become sources, and the number of applied edits is capped', () => {
  const r = applyProposals(data, [prop({ evidence: ['f3'] })], feedItems, { today: TODAY });
  assert.equal(r.applied.length, 1);
  assert.ok(!trend(r.data, 'passkeys-passwordless').sources.some((s) => s.url.startsWith('http://')));
  const many = data.trends.map((t) => prop({ id: t.id, changes: { ...none, summary: `Revised summary for ${t.id}.` } }));
  const capped = applyProposals(data, many, feedItems, { today: TODAY });
  assert.equal(capped.applied.length, Math.min(MAX_APPLIED, data.trends.length));
  assert.ok(capped.rejected.some((x) => /limit of/.test(x.reason)));
  assert.deepEqual(validateDataset(capped.data).errors, []);
});

test('a trend that is already flagged keeps its earlier verification note', () => {
  const d = structuredClone(data);
  const t = trend(d, 'passkeys-passwordless');
  t.needsVerification = true; t.verificationNotes = 'Earlier note.';
  const r = applyProposals(d, [prop()], feedItems, { today: TODAY });
  assert.match(trend(r.data, 'passkeys-passwordless').verificationNotes, /^Earlier note\. Drafted by/);
});

test('parseReply accepts plain or fenced JSON and rejects everything else', () => {
  assert.deepEqual(parseReply('{"proposals":[]}'), { proposals: [] });
  assert.deepEqual(parseReply('```json\n{"proposals":[]}\n```'), { proposals: [] });
  assert.equal(parseReply('not json'), null);
  assert.equal(parseReply('{"proposals":"x"}'), null);
  assert.equal(parseReply(''), null);
});

test('responseSchema lists every field as required and nullable enums include null', () => {
  const s = responseSchema(data.taxonomy);
  const changes = s.properties.proposals.items.properties.changes;
  assert.deepEqual([...changes.required].sort(), [...ALL_FIELDS].sort());
  assert.ok(changes.properties.momentum.enum.includes(null) && changes.properties.momentum.enum.includes('rising'));
  assert.equal(changes.additionalProperties, false);
});

test('the prompt tells the model feed text is untrusted data and includes the evidence ids', () => {
  const p = buildUserPrompt({ trends: data.trends, recommendations: data.recommendations, feedItems, signals: {}, today: TODAY });
  assert.match(p, /"id": "f1"/);
  assert.match(p, /Untrusted text/);
});

test('renderPrBody includes before/after, evidence links, rejects and the reviewer checklist', () => {
  const r = applyProposals(data, [prop(), prop({ id: 'nope' })], feedItems, { today: TODAY });
  const body = renderPrBody({ applied: r.applied, rejected: r.rejected, today: TODAY, model: 'test-model' });
  assert.match(body, /Nothing here is published until you merge/);
  assert.match(body, /Before:/);
  assert.match(body, /A tighter summary of passkeys\./);
  assert.match(body, /\(https:\/\/fidoalliance\.org\/a\/\)/);
  assert.match(body, /rejected \(1\)/);
});

test('formatCompact reproduces the committed recommendations.json exactly', () => {
  const rawText = readFileSync(new URL('../data/recommendations.json', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(formatCompact(JSON.parse(rawText)) + '\n', rawText);
});

// ---- end to end with a stub client ----
function stubClient(reply, { stop = 'end_turn', failFirstWith400 = false } = {}) {
  const calls = [];
  return {
    calls,
    beta: { messages: { stream(params) {
      calls.push(params);
      return { finalMessage: async () => {
        if (failFirstWith400 && calls.length === 1) { const e = new Error('schema'); e.status = 400; throw e; }
        return { stop_reason: stop, content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: reply }], usage: {} };
      } };
    } } }
  };
}
const feed = { generatedAt: '2026-11-10T06:00:00.000Z', items: feedItems };

test('propose: applies a good reply, uses the schema, adaptive thinking and server-side fallbacks', async () => {
  const client = stubClient(JSON.stringify({ proposals: [prop()] }));
  const r = await propose({ client, data, feed, signals: {}, today: TODAY, now: NOW });
  assert.equal(r.applied.length, 1);
  const call = client.calls[0];
  assert.equal(call.model, 'claude-opus-5-5');
  assert.deepEqual(call.thinking, { type: 'adaptive' });
  assert.equal(call.fallbacks, 'default');
  assert.deepEqual(call.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(call.output_config.format.type, 'json_schema');
  assert.equal(call.output_config.effort, 'high');
  assert.equal(call.tool_choice, undefined, 'no forced tool use');
});

test('propose: retries once without the schema if the API rejects it with a 400', async () => {
  const client = stubClient(JSON.stringify({ proposals: [] }), { failFirstWith400: true });
  const r = await propose({ client, data, feed, signals: {}, today: TODAY, now: NOW });
  assert.equal(client.calls.length, 2);
  assert.equal(client.calls[1].output_config.format, undefined);
  assert.equal(r.applied.length, 0);
});

test('propose: refusal, garbage reply and stale or empty feed all end as a no-op note', async () => {
  assert.match((await propose({ client: stubClient('', { stop: 'refusal' }), data, feed, signals: {}, today: TODAY, now: NOW })).note, /declined/);
  assert.match((await propose({ client: stubClient('sorry'), data, feed, signals: {}, today: TODAY, now: NOW })).note, /Could not parse/);
  const stale = { ...feed, generatedAt: '2026-11-01T00:00:00.000Z' };
  const client = stubClient('{}');
  assert.match((await propose({ client, data, feed: stale, signals: {}, today: TODAY, now: NOW })).note, /older than/);
  assert.equal(client.calls.length, 0, 'no API call from a stale feed');
  assert.match((await propose({ client, data, feed: null, signals: {}, today: TODAY, now: NOW })).note, /No usable feed/);
});

test('askModel rethrows non-400 errors', async () => {
  const client = { beta: { messages: { stream: () => ({ finalMessage: async () => { const e = new Error('boom'); e.status = 500; throw e; } }) } } };
  await assert.rejects(askModel(client, { data, feedItems, signals: {}, today: TODAY }), /boom/);
});
