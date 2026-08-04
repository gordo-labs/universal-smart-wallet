#!/usr/bin/env node
/** Deterministic, offline Wallet Platform integration/security gate. */
import { spawnSync } from 'node:child_process';

const run = (command, args) => {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

// Build once so every suite consumes the same generated artifacts.
run('pnpm', ['build']);
run('node', ['--test', 'tests/platform/*.test.mjs']);
for (const filter of [
  '@ssw/auth-email', '@ssw/auth-passkey', '@ssw/auth-oidc',
  '@ssw/identity-adapter', '@ssw/platform-store', '@ssw/signer-policy',
  '@ssw/wallet-actions', '@ssw/wallet-portability', '@ssw/wallet-service',
]) run('pnpm', ['--filter', filter, 'test']);
run('pnpm', ['test:security']);
console.log('\nWallet Platform verification PASS (offline, synthetic fixtures only).');
