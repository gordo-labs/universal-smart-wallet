import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const docs = path.join(root, 'docs/platform');

test('Wallet Platform documentation links resolve to repository files', () => {
  const files = fs.readdirSync(docs).filter((file) => file.endsWith('.md'));
  assert.ok(files.length >= 5);
  for (const file of files) {
    const source = fs.readFileSync(path.join(docs, file), 'utf8');
    for (const match of source.matchAll(/\]\(([^)#]+)(?:#[^)]+)?\)/gu)) {
      const target = match[1];
      if (/^https?:/u.test(target)) continue;
      assert.ok(fs.existsSync(path.resolve(docs, target)), `${file}: missing ${target}`);
    }
  }
});

test('public capability documentation names executable examples and boundaries', () => {
  const source = fs.readFileSync(path.join(docs, 'typescript-sdk.md'), 'utf8');
  for (const method of ['createPrivateDidLifecycle', 'createHolderBinding', 'simulateAndAuthorize', 'rotateVendor'])
    assert.match(source, new RegExp(`\\b${method}\\b`, 'u'));
  const selfHosting = fs.readFileSync(path.join(docs, 'self-hosting.md'), 'utf8');
  assert.match(selfHosting, /not cryptographic self-custody|operational custody/iu);
  assert.match(selfHosting, /AES-GCM-256/iu);
  const future = fs.readFileSync(path.join(root, 'working/roadmap/future/identity-platform-expansions.md'), 'utf8');
  assert.match(future, /future adapters/iu);
  assert.match(future, /Aztec\/Noir/iu);
});
