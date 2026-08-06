#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const env = process.env;
const required = [
  'SSW_ENV',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
];
const missing = required.filter((key) => !env[key]);
if (missing.length) {
  console.error(`missing required configuration: ${missing.join(', ')}`);
  process.exit(2);
}
if (env.SSW_ENV !== 'local') {
  const unsafe = ['ssw_local_change_me', 'local'];
  if (unsafe.includes(env.POSTGRES_PASSWORD)) {
    console.error(
      'refusing unsafe development credentials outside SSW_ENV=local',
    );
    process.exit(3);
  }
}
const compose = await readFile(
  new URL('../docker-compose.platform.yml', import.meta.url),
  'utf8',
);
for (const service of [
  'postgres',
  'mailpit',
  'anvil',
  'wallet-service',
  'wallet-app',
  'admin-console',
  'gallery',
]) {
  if (!new RegExp(`^  ${service}:`, 'm').test(compose))
    throw new Error(`compose missing ${service}`);
}
console.log('self-hosted configuration valid (local synthetic mode)');
