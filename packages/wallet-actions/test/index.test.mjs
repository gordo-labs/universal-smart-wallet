import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareNativeTransfer, prepareErc20Transfer, prepareErc20Approval, prepareErc721Transfer, prepareBatch, previewAction, simulateAction, WalletActionError } from '../dist/index.js';

const A='0x1111111111111111111111111111111111111111'; const B='0x2222222222222222222222222222222222222222';
test('typed transfers include consent fields and stable id',()=>{ const a=prepareNativeTransfer({chainId:8453,recipient:B,amount:100n}); assert.equal(a.asset,'native'); assert.match(previewAction(a),/chain 8453/); assert.match(a.consent,/amount 100/); assert.equal(a.value,100n); assert.equal(a.id,prepareNativeTransfer({chainId:8453,recipient:B,amount:100n}).id); });
test('token and NFT builders reject malformed values',()=>{ assert.throws(()=>prepareErc20Transfer({chainId:8453,target:A,recipient:B,amount:-1n}),WalletActionError); assert.throws(()=>prepareErc721Transfer({chainId:8453,target:A,recipient:B,amount:2n}),WalletActionError); });
test('unlimited approvals are high risk and batches preserve atomic calls',()=>{ const a=prepareErc20Approval({chainId:8453,target:A,recipient:B}); assert.equal(a.risk,'high'); const b=prepareBatch({chainId:8453,calls:[{target:A,selector:'0xa9059cbb',data:'0x',value:1n},{target:B,selector:'0xa9059cbb',data:'0x',value:2n}]}); assert.equal(b.calls.length,2); assert.match(b.consent,/target/); });
test('simulation failure blocks authorization flow',async()=>{ const a=prepareNativeTransfer({chainId:8453,recipient:B,amount:1n}); await assert.rejects(()=>simulateAction({simulate:async()=>({ok:false,error:'reverted'})},a),e=>e.code==='SIMULATION_FAILED'); });
