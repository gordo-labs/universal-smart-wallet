import { createServer } from 'node:http';
const required = ['SSW_ENV', 'DATABASE_URL', 'SMTP_URL', 'RPC_URL'];
for (const key of required)
  if (!process.env[key]) {
    console.error(`missing required configuration: ${key}`);
    process.exit(78);
  }
if (process.env.SSW_ENV !== 'local')
  console.warn(
    'reference service: configure production secrets and infrastructure before deployment',
  );
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
