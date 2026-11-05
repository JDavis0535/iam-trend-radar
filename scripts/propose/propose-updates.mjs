// propose-updates.mjs - asks Claude to propose edits to the curated trends and recommendations, based on the recent
// feed, then applies only the edits that pass the guard rails in proposals-lib.mjs. It writes to the working tree
// and never commits or publishes: .github/workflows/propose-updates.yml turns the result into a pull request.
//
// Usage: node scripts/propose/propose-updates.mjs [--dry-run] [--body-file <path>]
//   --dry-run     build the prompt and print its size, but do not call the API or write anything
//   --body-file   where to write the pull request description (default: none)
// Needs ANTHROPIC_API_KEY (a repository secret in the workflow). Without it the script says so and exits 0.
// IAM_PROPOSE_MODEL overrides the model. Exit code is 0 unless the data files are unreadable.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDataDir } from '../validate-data.mjs';
import { responseSchema, SYSTEM_PROMPT, buildUserPrompt, parseReply, applyProposals, renderPrBody, formatCompact } from './proposals-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MODEL = process.env.IAM_PROPOSE_MODEL || 'claude-opus-5-5';
const FEED_MAX_AGE_HOURS = 72; // do not propose edits from a feed that has stopped refreshing
const FEED_WINDOW_DAYS = 120;

/** Calls the model and returns { text, stopReason }. `client` is injectable so tests never touch the network. */
export async function askModel(client, { data, feedItems, signals, today, model = MODEL }) {
  const params = {
    model,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt({ trends: data.trends, recommendations: data.recommendations, feedItems, signals, today }) }],
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default'
  };
  const run = async (extra) => {
    const stream = client.beta.messages.stream({ ...params, output_config: { effort: 'high', ...extra } });
    return stream.finalMessage();
  };
  let message;
  try {
    message = await run({ format: { type: 'json_schema', schema: responseSchema(data.taxonomy) } });
  } catch (e) {
    // The structured-output schema was rejected: retry once with the prompt alone. Output is validated either way.
    if (e && e.status === 400) {
      console.warn(`WARN structured-output schema rejected (${String(e.message || e).slice(0, 300)}); retrying without it`);
      message = await run({});
    }
    else throw e;
  }
  const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { text, stopReason: message.stop_reason, usage: message.usage };
}

/** Returns { data, applied, rejected, note } without touching the disk. note is set when nothing was attempted. */
export async function propose({ client, data, feed, signals, today, now = Date.now(), model = MODEL }) {
  if (!feed || !Array.isArray(feed.items)) return { note: 'No usable feed; nothing to do.' };
  const ageH = (now - Date.parse(feed.generatedAt)) / 3600000;
  if (!(ageH <= FEED_MAX_AGE_HOURS)) return { note: `The feed is older than ${FEED_MAX_AGE_HOURS} hours; not proposing edits from stale data.` };
  const cutoff = now - FEED_WINDOW_DAYS * 86400000;
  const feedItems = feed.items.filter((i) => i.id && (!i.published || Date.parse(i.published) >= cutoff));
  if (!feedItems.length) return { note: 'No recent feed items; nothing to do.' };

  const { text, stopReason } = await askModel(client, { data, feedItems, signals, today, model });
  if (stopReason === 'refusal') return { note: 'The model declined the request; no edits proposed.' };
  const reply = parseReply(text);
  if (!reply) return { note: `Could not parse the model reply as the expected JSON (stop reason: ${stopReason}); no edits applied.` };
  return { ...applyProposals(data, reply.proposals, feedItems, { today }), model, rawText: text, stopReason };
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const bodyFile = arg('--body-file');
  const data = loadDataDir(resolve(root, 'data'));
  const readJson = (rel) => { try { return JSON.parse(readFileSync(resolve(root, rel), 'utf8')); } catch { return null; } };
  const feed = readJson('data/feed.json');
  const signals = (readJson('data/signals.json') || {}).trends || {};
  const today = new Date().toISOString().slice(0, 10);

  if (dryRun) {
    const items = feed && Array.isArray(feed.items) ? feed.items : [];
    const prompt = buildUserPrompt({ trends: data.trends, recommendations: data.recommendations, feedItems: items, signals, today });
    console.log(`dry run: model ${MODEL}, ${items.length} feed items, prompt about ${Math.round((SYSTEM_PROMPT.length + prompt.length) / 4)} tokens (estimated)`);
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY is not set; skipping the proposal step. Add it as a repository secret to enable weekly proposals.');
    return;
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const result = await propose({ client: new Anthropic(), data, feed, signals, today });
  if (result.note) { console.log(result.note); return; }

  for (const r of result.rejected) console.log(`rejected ${r.label}: ${r.reason}`);
  if (!result.applied.length) {
    // The reply is built from public feed text, so printing the start of it is safe and makes a bad shape debuggable.
    if (result.rejected.length) console.log(`model reply (stop reason ${result.stopReason}, first 2500 chars): ${String(result.rawText || '').slice(0, 2500)}`);
    console.log('No edits passed the guard rails; nothing to propose.');
    return;
  }

  writeFileSync(resolve(root, 'data/trends.json'), JSON.stringify(result.data.trends, null, 2) + '\n');
  writeFileSync(resolve(root, 'data/recommendations.json'), formatCompact(result.data.recommendations) + '\n');
  writeFileSync(resolve(root, 'data/meta.json'), JSON.stringify(result.data.meta, null, 2) + '\n');
  if (bodyFile) writeFileSync(resolve(bodyFile), renderPrBody({ applied: result.applied, rejected: result.rejected, today, model: result.model }));
  console.log(`applied ${result.applied.length} edit(s): ${result.applied.map((a) => `${a.kind}:${a.id}`).join(', ')}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `applied=${result.applied.length}\n`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error(`propose-updates failed: ${e && e.message ? e.message : e}`); process.exit(1); });
