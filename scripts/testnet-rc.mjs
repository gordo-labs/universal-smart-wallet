#!/usr/bin/env node

/** Opt-in testnet gate. It is deliberately inert until SSW_RC_TESTNET=1. */
import { createHash } from 'node:crypto';
import process from 'node:process';

const required = [
  'SSW_RC_CHAIN_ID',
  'SSW_RC_RPC_URL',
  'SSW_RC_ENTRY_POINT',
  'SSW_RC_ENTRY_POINT_CODE_HASH',
  'SSW_RC_ACCOUNT',
  'SSW_RC_ACCOUNT_CODE_HASH',
  'SSW_RC_ATTESTATION_CONSUMER',
  'SSW_RC_ATTESTATION_CONSUMER_CODE_HASH',
];

const normalizeHash = (value) => value.toLowerCase().replace(/^0x/u, '');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const isAddress = (value) => /^0x[0-9a-fA-F]{40}$/u.test(value);

async function rpc(url, method, params = []) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`provider_rpc_${body.error.code}`);
  return body.result;
}

async function main() {
  if (process.env.SSW_RC_TESTNET !== '1') {
    console.log(
      'TESTNET RC: NOT_REQUESTED (set SSW_RC_TESTNET=1 to run the declared matrix)',
    );
    return;
  }
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`TESTNET RC: CONFIG_MISSING (${missing.join(', ')})`);
    process.exitCode = 2;
    return;
  }
  const chainId = Number(process.env.SSW_RC_CHAIN_ID);
  if (!Number.isSafeInteger(chainId) || chainId <= 0)
    throw new Error('invalid SSW_RC_CHAIN_ID');
  for (const key of [
    'SSW_RC_ENTRY_POINT',
    'SSW_RC_ACCOUNT',
    'SSW_RC_ATTESTATION_CONSUMER',
  ]) {
    if (!isAddress(process.env[key]))
      throw new Error(`${key} must be an EVM address`);
  }
  try {
    const remoteChain = Number.parseInt(
      await rpc(process.env.SSW_RC_RPC_URL, 'eth_chainId'),
      16,
    );
    if (remoteChain !== chainId)
      throw new Error(
        `chain_id_mismatch expected=${chainId} actual=${remoteChain}`,
      );
    const addresses = [
      ['entryPoint', 'SSW_RC_ENTRY_POINT', 'SSW_RC_ENTRY_POINT_CODE_HASH'],
      ['account', 'SSW_RC_ACCOUNT', 'SSW_RC_ACCOUNT_CODE_HASH'],
      [
        'attestationConsumer',
        'SSW_RC_ATTESTATION_CONSUMER',
        'SSW_RC_ATTESTATION_CONSUMER_CODE_HASH',
      ],
    ];
    const codeHashes = {};
    for (const [name, addressKey, hashKey] of addresses) {
      const code = await rpc(process.env.SSW_RC_RPC_URL, 'eth_getCode', [
        process.env[addressKey],
        'latest',
      ]);
      if (
        typeof code !== 'string' ||
        !/^0x[0-9a-f]+$/u.test(code) ||
        code === '0x'
      )
        throw new Error(`${name}_has_no_runtime_code`);
      const digest = `0x${sha256(Buffer.from(code.slice(2), 'hex'))}`;
      const expected = normalizeHash(process.env[hashKey]);
      if (expected !== normalizeHash(digest))
        throw new Error(`${name}_code_hash_mismatch`);
      codeHashes[name] = digest;
    }
    console.log(
      JSON.stringify({ status: 'PASS', chainId, codeHashes }, null, 2),
    );
  } catch (error) {
    console.error(
      `TESTNET RC: EXTERNAL_OUTAGE_OR_PROVIDER_FAILURE (${error instanceof Error ? error.message : error})`,
    );
    process.exitCode = 3;
  }
}

main().catch((error) => {
  console.error(
    `TESTNET RC: FAIL (${error instanceof Error ? error.message : error})`,
  );
  process.exitCode = 1;
});
