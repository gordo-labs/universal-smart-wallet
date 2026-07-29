#!/usr/bin/env node

/**
 * Small process boundary for the deterministic local vertical slice.
 * It intentionally exposes only the synthetic issuer/verifier routes and a
 * wallet readiness endpoint; no hosted service, RPC, or credential is used.
 */
import { createServer } from 'node:http';
import process from 'node:process';

const app = process.argv[2];
const port = Number(process.argv[3]);
if (
  !['issuer', 'wallet', 'verifier'].includes(app) ||
  !Number.isInteger(port)
) {
  console.error('usage: local-app-server.mjs <issuer|wallet|verifier> <port>');
  process.exit(2);
}

const json = (response, res) => {
  res.statusCode = response.status;
  res.setHeader('content-type', 'application/json');
  res.end(response.body);
};

let handler;
if (app === 'issuer') {
  const { createSyntheticIssuer } = await import(
    '../apps/issuer-demo/dist/index.js'
  );
  const issuer = createSyntheticIssuer('valid');
  handler = (req, res, body) => {
    const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    const response = issuer.route(path, {
      method: req.method,
      body,
      headers: req.headers,
    });
    json(response, res);
  };
} else if (app === 'verifier') {
  const { createVerifierDemo } = await import(
    '../apps/verifier-demo/dist/index.js'
  );
  const verifier = createVerifierDemo();
  handler = async (req, res, body) => {
    const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    json(
      await verifier.route(path, {
        method: req.method,
        body,
        headers: req.headers,
      }),
      res,
    );
  };
} else {
  handler = (_req, res) => {
    json(
      {
        status: 200,
        body: JSON.stringify({
          status: 'ready',
          app: 'wallet-web',
          runtime: 'synthetic-local',
        }),
      },
      res,
    );
  };
}

const server = createServer(async (req, res) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    try {
      await handler(req, res, Buffer.concat(chunks).toString('utf8'));
    } catch {
      if (!res.headersSent)
        json({ status: 500, body: 'local app failure' }, res);
      else res.end();
    }
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`SSW_LOCAL_APP_READY ${app} 127.0.0.1:${port}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
