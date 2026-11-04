import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const norm = (s) => s.replace(/\r\n/g, '\n');

test('dist/app.js and data/data.js are in sync with sources (rebuild in temp copy)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'iam-build-'));
  try {
    for (const d of ['js', 'data', 'scripts']) cpSync(resolve(root, d), join(tmp, d), { recursive: true });
    const r = spawnSync(process.execPath, [join(tmp, 'scripts/build-data.mjs')], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(norm(readFileSync(join(tmp, 'dist/app.js'), 'utf8')), norm(readFileSync(resolve(root, 'dist/app.js'), 'utf8')), 'dist/app.js is stale: run node scripts/build-data.mjs');
    assert.equal(norm(readFileSync(join(tmp, 'data/data.js'), 'utf8')), norm(readFileSync(resolve(root, 'data/data.js'), 'utf8')), 'data/data.js is stale');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
test('dist/app.js is a classic script (no import/export statements)', () => {
  const s = readFileSync(resolve(root, 'dist/app.js'), 'utf8');
  assert.ok(!/^\s*(import|export)\s/m.test(s));
});
test('no inline event handlers or external resources in index.html', () => {
  const h = readFileSync(resolve(root, 'index.html'), 'utf8');
  assert.ok(!/\son\w+\s*=/i.test(h));
  assert.ok(!/<(script|link|img)[^>]+(src|href)=["']https?:/i.test(h));
});
test('size budget: site (excluding data) < 250 KB', () => {
  let n = 0;
  for (const f of ['index.html', 'css/styles.css', 'dist/app.js']) n += readFileSync(resolve(root, f)).length;
  assert.ok(n < 250 * 1024, String(n));
});
