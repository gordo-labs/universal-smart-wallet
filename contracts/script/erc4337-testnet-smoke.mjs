#!/usr/bin/env node
// Deliberately dependency-free gate: the real provider adapter is opt-in and local tests never call a network.
if (process.env.SSW_4337_ENABLED !== '1') {
  console.log(
    'SSW-017 testnet smoke: SKIP (set SSW_4337_ENABLED=1 and all required variables)',
  );
  process.exit(0);
}
const required = [
  'SSW_4337_CHAIN_ID',
  'SSW_4337_RPC_URL',
  'SSW_4337_BUNDLER_URL',
  'SSW_4337_ENTRY_POINT',
  'SSW_4337_ACCOUNT',
  'SSW_4337_ACCOUNT_CODE_HASH',
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(
    `SSW-017 testnet smoke: CONFIG_MISSING (${missing.join(', ')})`,
  );
  process.exit(2);
}
console.log(
  `SSW-017 testnet smoke: READY (chain ${process.env.SSW_4337_CHAIN_ID}; EntryPoint ${process.env.SSW_4337_ENTRY_POINT})`,
);
