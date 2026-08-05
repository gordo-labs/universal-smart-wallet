import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const guide = path.join(root, 'docs/identity-platform/operator-handoff.md');
const source = fs.readFileSync(guide, 'utf8');

const linkTargets = [...source.matchAll(/\]\(([^)#]+)(?:#[^)]+)?\)/g)].map((m) => m[1]);

test('operator handoff links resolve to repository files', () => {
  for (const target of linkTargets) {
    assert.ok(!target.startsWith('http'), `external link is not a local evidence link: ${target}`);
    const resolved = path.resolve(path.dirname(guide), target);
    assert.ok(fs.existsSync(resolved), `missing handoff evidence: ${target}`);
  }
});

test('operator handoff covers every supported surface and explicit boundaries', () => {
  for (const term of [
    'Institutional issuer',
    'Holder wallet',
    'Verifier and scanner',
    'Mobile adapter',
    'KMS/HSM, trust, and offline operations',
    'Sector composition boundaries',
    'EUDI, HAIP, and claims boundary',
    'indeterminate',
    'synthetic credentials',
  ]) {
    assert.match(source, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
});

test('operator handoff rejects unsupported positive claims', () => {
  assert.doesNotMatch(source, /claims? (?:EUDI|HAIP|production|certification) (?:compliance|certified|ready)/i);
  assert.match(source, /not a deployment\s+guide, an audit report, a legal opinion, or a certification statement/i);
  assert.match(source, /legal opinion/i);
  assert.match(source, /production readiness/i);
});
