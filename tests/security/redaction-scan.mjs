import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const roots = [
  'apps',
  'packages',
  'contracts/cache',
  'artifacts',
  'test-results',
].map((path) => join(root, path));
const files = [];

async function walk(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) {
      const packageTree = /[/\\](?:apps|packages)[/\\]/u.test(full);
      const packageRoot = /[/\\](?:apps|packages)$/u.test(path);
      if (
        entry.name !== 'node_modules' &&
        entry.name !== '.git' &&
        (!packageTree || packageRoot || entry.name === 'dist')
      )
        await walk(full);
    } else if (
      /\.(json|log|txt|trace|out|snap|js|mjs|html)$/u.test(entry.name)
    ) {
      files.push(full);
    }
  }
}

for (const path of roots) await walk(path);

// These patterns represent material that must never appear in generated logs,
// traces, screenshots, or runtime bundles. Synthetic fixture identifiers are
// intentionally allowed; only values that look like secrets/PII are blocked.
const forbidden = [
  /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/u,
  /(?:secret|passphrase|prfOutput|privateKey|credentialSubject)\s*[:=]\s*["']([^"']{8,})/u,
  /\b(?:birthdate|date_of_birth|ssn|social_security_number)\b\s*[:=]/iu,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/u,
];
const findings = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(text))
      findings.push(`${relative(root, file)} matches ${pattern}`);
  }
}
if (findings.length) {
  console.error(`SECURITY REDACTION SCAN FAILED\n${findings.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(
    `Security redaction scan OK (${files.length} generated files inspected).`,
  );
}
