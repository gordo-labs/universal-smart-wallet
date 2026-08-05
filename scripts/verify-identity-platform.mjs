#!/usr/bin/env node

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { REQUIRED_CASES, runAllCases } from '../tests/identity-platform/fixtures.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const evidencePath = join(root, 'docs/audit/identity-platform-e2e.md');

const fail = (message) => {
  console.error(`IDENTITY_PLATFORM_GATE_FAIL: ${message}`);
  process.exitCode = 1;
};

const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited ${result.status}`);
};

const scanArtifacts = async () => {
  const dirs = [join(root, 'tests/identity-platform'), join(root, 'docs/audit')];
  const files = [join(root, 'scripts/verify-identity-platform.mjs')];
  for (const dir of dirs) {
    for (const name of await readdir(dir)) if (name.startsWith('identity-platform-') || name === 'fixtures.mjs' || name === 'e2e.test.mjs') files.push(join(dir, name));
  }
  const forbidden = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
    /(?:password|api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*['"][^'"]+/iu,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
    /\b(?:passport|national[_-]?id|phone|home[_-]?address)\s*[:=]/iu,
  ];
  const violations = [];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const pattern of forbidden) if (pattern.test(content)) violations.push(`${file.replace(`${root}/`, '')}: ${pattern}`);
  }
  if (violations.length) throw new Error(`redaction violations: ${violations.join('; ')}`);
  return files.map((file) => file.replace(`${root}/`, '')).sort();
};

try {
  run(process.execPath, ['--test', 'tests/identity-platform/e2e.test.mjs']);
  const first = await runAllCases();
  const second = await runAllCases();
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('run is not deterministic');
  for (const required of REQUIRED_CASES) if (!first[required]) throw new Error(`required flow skipped: ${required}`);
  const artifacts = await scanArtifacts();
  const lines = [
    '# Institutional identity E2E gate evidence',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'This is synthetic, local evidence only. It is not a certification, legal approval, or production-readiness claim.',
    '',
    '## Required flows',
    '',
    ...REQUIRED_CASES.map((name) => `- PASS — ${name}`),
    '',
    '## Determinism and security',
    '',
    '- Two complete runs produced identical summaries.',
    '- Online and offline scanner paths were exercised without network access.',
    '- Offline freshness, signed snapshot, and replay rejection were exercised.',
    '- Artifact scan found no private keys, credentials, PII fields, or secrets.',
    '',
    '## Artifacts checked',
    '',
    ...artifacts.map((file) => `- \`${file}\``),
    '',
    '## Exact command',
    '',
    '```text',
    'node scripts/verify-identity-platform.mjs',
    '```',
  ];
  await writeFile(evidencePath, `${lines.join('\n')}\n`);
  console.log(`IDENTITY_PLATFORM_GATE_PASS: ${REQUIRED_CASES.length} required flows`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
