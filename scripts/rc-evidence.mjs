#!/usr/bin/env node

/** Offline release evidence checks. No network, credentials, or production endpoints are used. */
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url).pathname;
const run = async (command, args, options = {}) => {
  const { spawn } = await import('node:child_process');
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

async function contractHashes() {
  const sourceRoot = join(ROOT, 'contracts', 'src');
  const names = (await readdir(sourceRoot))
    .filter((name) => name.endsWith('.sol'))
    .sort();
  const files = [];
  for (const name of names) {
    const contents = await readFile(join(sourceRoot, name));
    files.push({ path: `contracts/src/${name}`, sha256: sha256(contents) });
  }
  const deployment = await readFile(join(ROOT, 'contracts/deployments.json'));
  return {
    algorithm: 'SHA-256',
    deploymentManifestSha256: sha256(deployment),
    sourceFiles: files,
  };
}

async function licenseEvidence() {
  const result = await run('pnpm', ['licenses', 'list', '--json']);
  if (result.code !== 0) {
    return {
      status: 'FAIL',
      reason: 'pnpm licenses list failed',
      details: result.stderr.trim(),
    };
  }
  let data;
  try {
    data = JSON.parse(result.stdout);
  } catch {
    return { status: 'FAIL', reason: 'license output was not JSON' };
  }
  const allowed = new Set([
    // Runtime and transitive build dependencies are checked by SPDX ID. These
    // permissive licenses are compatible with this Apache-2.0 repository; the
    // dependency inventory remains part of the evidence for manual review.
    '0BSD',
    'MIT',
    'Apache-2.0',
    'BSD-3-Clause',
    'CC-BY-4.0',
    'ISC',
    'LGPL-3.0-or-later',
    'MPL-2.0',
  ]);
  const licenses = Object.keys(data).sort();
  const disallowed = licenses.filter((license) => !allowed.has(license));
  const packageCount = Object.values(data).reduce(
    (count, packages) => count + packages.length,
    0,
  );
  return {
    status: disallowed.length ? 'FAIL' : 'PASS',
    packageCount,
    licenses,
    disallowed,
    source: 'pnpm licenses list --json',
  };
}

async function lockEvidence() {
  const lock = await readFile(join(ROOT, 'pnpm-lock.yaml'), 'utf8');
  const frozen = await run('pnpm', [
    'install',
    '--frozen-lockfile',
    '--offline',
    '--ignore-scripts',
  ]);
  return {
    status:
      lock.startsWith("lockfileVersion: '9.0'") && frozen.code === 0
        ? 'PASS'
        : 'FAIL',
    lockfileVersion:
      lock.match(/lockfileVersion:\s*([^\n]+)/u)?.[1] ?? 'missing',
    command: 'pnpm install --frozen-lockfile --offline --ignore-scripts',
    output: (frozen.stderr || frozen.stdout).trim().slice(-500),
  };
}

async function main() {
  const network = process.env.SSW_RC_NETWORK ?? 'anvil';
  if (/mainnet|homestead|ethereum\s*main/u.test(network)) {
    console.error('RC EVIDENCE FAIL: mainnet is never supported');
    process.exitCode = 1;
    return;
  }
  const licenses = await licenseEvidence();
  const lock = await lockEvidence();
  const hashes = await contractHashes();
  const redaction = await run('node', ['tests/security/redaction-scan.mjs']);
  const result = {
    schemaVersion: 1,
    generatedAt: 'reproducible-at-run-time',
    network,
    sbom: {
      status: licenses.status,
      source: licenses.source,
      packageCount: licenses.packageCount,
      licenses: licenses.licenses,
    },
    licenses,
    dependencyLock: lock,
    secrets: {
      status: redaction.code === 0 ? 'PASS' : 'FAIL',
      command: 'node tests/security/redaction-scan.mjs',
      output: (redaction.stdout || redaction.stderr).trim().slice(-500),
    },
    contractCodeHashes: hashes,
  };
  console.log(JSON.stringify(result, null, 2));
  if (
    [licenses, lock].some((check) => check.status !== 'PASS') ||
    redaction.code !== 0
  )
    process.exitCode = 1;
}

main().catch((error) => {
  console.error(
    `RC EVIDENCE FAIL: ${error instanceof Error ? error.message : error}`,
  );
  process.exitCode = 1;
});
