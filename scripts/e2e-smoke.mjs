import { access } from 'node:fs/promises';
for (const app of ['wallet-web', 'issuer-demo', 'verifier-demo']) {
  await access(`apps/${app}/dist/index.js`);
}
console.log('E2E smoke OK: all app shells have build output.');
