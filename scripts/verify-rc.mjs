#!/usr/bin/env node

/** Full local release-candidate gate with an explicit opt-in testnet lane. */
import { spawn } from 'node:child_process';
import process from 'node:process';

const run = (command, args, options = {}) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: new URL('..', import.meta.url).pathname,
      env: { ...process.env, ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });

const checks = [
  ['toolchain', 'pnpm', ['validate:toolchain']],
  ['build', 'pnpm', ['build']],
  ['local_vertical_slice', 'pnpm', ['e2e:local']],
  ['release_scenarios', 'node', ['tests/e2e/release-candidate.test.mjs']],
  ['security_and_contracts', 'pnpm', ['test:security']],
  [
    'foundry_full_suite',
    'pnpm',
    ['exec', 'forge', 'test', '--root', 'contracts'],
  ],
  [
    'sbom_license_secret_dependency_code_hash',
    'node',
    ['scripts/rc-evidence.mjs'],
  ],
];

const summarize = (output) => {
  const lines = output.trim().split('\n');
  return lines.slice(-8).join('\n').slice(-2_000);
};

async function main() {
  const result = {
    schemaVersion: 1,
    release: 'SSW-025',
    networkPolicy:
      'local Anvil and explicitly configured EVM testnets only; mainnet prohibited',
    checks: [],
  };
  for (const [name, command, args] of checks) {
    const check = await run(command, args);
    const item = {
      name,
      command: `${command} ${args.join(' ')}`,
      status: check.code === 0 ? 'PASS' : 'FAIL',
      output: summarize(check.output),
    };
    result.checks.push(item);
    console.log(`[${item.status}] ${name}`);
    if (item.status === 'FAIL') {
      console.error(item.output);
      result.status = 'FAIL';
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = 1;
      return;
    }
  }

  const testnet = await run('node', ['scripts/testnet-rc.mjs']);
  const testnetNotRequested = /NOT_REQUESTED/u.test(testnet.output);
  result.checks.push({
    name: 'opt_in_testnet_matrix',
    command: 'node scripts/testnet-rc.mjs',
    status:
      testnet.code === 0 && !testnetNotRequested
        ? 'PASS'
        : testnetNotRequested
          ? 'NOT_REQUESTED'
          : 'FAIL',
    classification: testnetNotRequested
      ? 'external_configuration_required'
      : 'configured_provider',
    output: summarize(testnet.output),
  });
  result.status = testnetNotRequested
    ? 'LOCAL_PASS_TESTNET_NOT_REQUESTED'
    : testnet.code === 0
      ? 'PASS'
      : 'FAIL';
  result.nextAction = testnetNotRequested
    ? 'Configure the declared testnet matrix and rerun with SSW_RC_TESTNET=1; this result is not an alpha-testnet release gate.'
    : 'Attach this evidence to the release-candidate review.';
  console.log(JSON.stringify(result, null, 2));
  if (testnet.code !== 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(
    `VERIFY RC FAIL: ${error instanceof Error ? (error.stack ?? error.message) : error}`,
  );
  process.exitCode = 1;
});
