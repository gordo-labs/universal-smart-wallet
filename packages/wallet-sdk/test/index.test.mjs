import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createBrowserWalletClient, WalletSdkError } from '../dist/browser.js';
import { createServerWalletClient } from '../dist/server.js';

const response = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{'content-type':'application/json'}});
test('browser exports and core lifecycle use the OpenAPI paths', async () => {
  const calls=[];
  const client=createBrowserWalletClient({baseUrl:'https://wallet.example', fetch:async (url, init)=>{calls.push([url,init]); return response({walletId:'w1',locator:'wlt_v1_x',tenantId:'t',chainId:84532,address:'0x1111111111111111111111111111111111111111',status:'active'});}});
  const wallet=await client.get('w1');
  assert.equal(wallet.walletId,'w1'); assert.equal(calls[0][0],'https://wallet.example/v1/wallets/w1');
  assert.equal((await client.did('w1')).did,'did:pkh:eip155:84532:0x1111111111111111111111111111111111111111');
});
test('mutating operations require idempotency keys and auth errors are redacted', async () => {
  const client=createBrowserWalletClient({baseUrl:'https://wallet.example', fetch:async()=>response({error:{code:'AUTH_INVALID',message:'secret token leaked',requestId:'r1'}},401)});
  await assert.rejects(()=>Promise.resolve().then(()=>client.send({walletId:'w1'},{})), e=>e instanceof WalletSdkError && e.code==='CONFLICT');
  await assert.rejects(()=>client.send({walletId:'w1'},{idempotencyKey:'k'}), e=>e instanceof WalletSdkError && e.message==='Authentication failed' && !e.message.includes('secret'));
});
test('timeouts and aborts are stable and do not retry non-idempotent sends', async () => {
  const client=createBrowserWalletClient({baseUrl:'https://wallet.example',timeoutMs:5,fetch:async(_u,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))))});
  await assert.rejects(()=>client.get('w1'), e=>e instanceof WalletSdkError && e.code==='TIMEOUT');
  const c=new AbortController(); c.abort(); await assert.rejects(()=>client.get('w1',{signal:c.signal}), e=>e instanceof WalletSdkError && e.code==='ABORTED');
});
test('server entrypoint accepts an API key without importing node modules in browser', async()=>{
  const server=createServerWalletClient({baseUrl:'https://wallet.example',apiKey:'synthetic',fetch:async(_u,init)=>{assert.equal(init.headers.authorization,'ApiKey synthetic'); return response({ok:true,version:'v1'});}});
  assert.equal((await server.health()).ok,true);
  const browser=await import('../dist/browser.js'); assert.equal(Object.keys(browser).includes('createServerWalletClient'),false);
});
test('generated API path surface matches the published OpenAPI contract', async()=>{
  const schema=JSON.parse(await readFile(new URL('../../../apps/wallet-service/openapi.json', import.meta.url),'utf8'));
  const paths=Object.keys(schema.paths).sort();
  assert.deepEqual(paths,['/v1/health','/v1/transactions','/v1/wallets','/v1/wallets/{walletId}','/v1/wallets/{walletId}/activity','/v1/wallets/{walletId}/balances','/v1/webhooks'].sort());
  assert.equal(schema.openapi,'3.1.0');
});
