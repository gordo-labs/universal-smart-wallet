import { createServer } from 'node:http';
const required = ['SSW_ENV', 'DATABASE_URL', 'SMTP_URL', 'RPC_URL', 'CHAIN_ID'];
for (const key of required)
  if (!process.env[key]) {
    console.error(`missing required configuration: ${key}`);
    process.exit(78);
  }
if (process.env.SSW_ENV !== 'local')
  console.warn(
    'reference service: configure production secrets and infrastructure before deployment',
  );
const expectedChainId = Number(process.env.CHAIN_ID);
if (!Number.isSafeInteger(expectedChainId) || expectedChainId <= 0) {
  console.error('invalid CHAIN_ID');
  process.exit(78);
}
const rpcResponse = await fetch(process.env.RPC_URL, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_chainId',
    params: [],
  }),
  signal: AbortSignal.timeout(8_000),
}).catch(() => null);
if (!rpcResponse?.ok) {
  console.error('RPC_URL is unreachable');
  process.exit(78);
}
const rpcBody = await rpcResponse.json().catch(() => ({}));
const rpcChainId = Number.parseInt(String(rpcBody.result ?? ''), 16);
if (rpcChainId !== expectedChainId) {
  console.error(
    `RPC chain mismatch: expected ${expectedChainId}, got ${rpcChainId}`,
  );
  process.exit(78);
}
let migrated = false;
setTimeout(() => {
  migrated = true;
}, 50);
createServer((req, res) => {
  if (req.url === '/health') return res.writeHead(200).end('ok');
  if (req.url === '/ready')
    return res
      .writeHead(migrated ? 200 : 503)
      .end(migrated ? 'ready' : 'migrations-pending');
  res.writeHead(404).end();
}).listen(3000, '0.0.0.0');
