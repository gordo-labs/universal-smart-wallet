import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeploymentProfile, ENTRY_POINT_V08, SafeServiceAdapter } from '../dist/index.js';

const A = (n) => `0x${String(n).padStart(40, '0')}`;
const H = (n) => `0x${String(n).padStart(64, '0')}`;
const profile = (network = 'base-sepolia') => createDeploymentProfile(network, {
  chainId: network === 'base-sepolia' ? 84532 : 534351,
  entryPoint: { address: ENTRY_POINT_V08, version: '0.8.0', codeHash: H(1) },
  safeFactory: { address: A(2), version: 'safe-1.4.1', codeHash: H(2) },
  safeSingleton: { address: A(3), version: 'safe-1.4.1', codeHash: H(3) },
});
const op = (sender = A(4)) => ({ sender, nonce: 0n, callData: '0x1234', callGasLimit: 1n, verificationGasLimit: 1n, preVerificationGas: 1n, maxFeePerGas: 1n, maxPriorityFeePerGas: 1n, paymasterAndData: '0x', signature: '0x12' });
const ports = ({ chainId = 84532, hashes = [H(1), H(2), H(3)], send = H(9) } = {}) => {
  const calls = [];
  return { calls,
    rpc: { getChainId: async () => chainId, getCode: async () => '0x6001', getCodeHash: async (a) => hashes[[ENTRY_POINT_V08, A(2), A(3)].findIndex((x) => x.toLowerCase() === a.toLowerCase())] },
    lifecycle: { createSafe: async () => ({ address: A(4), chainId, owners: [A(5)], threshold: 1 }), getSafe: async () => undefined, encodeCall: async () => '0xabcd' },
    bundler: { simulateUserOperation: async (input) => { calls.push('simulate'); return { userOp: input, valid: true, gas: { call: 1n, verification: 1n } }; }, sendUserOperation: async () => { calls.push('send'); return send; }, getUserOperationReceipt: async (hash) => ({ userOpHash: hash, transactionHash: H(10), success: true }) },
    signer: { signUserOperation: async () => '0x99' },
  };
};

test('profiles pin independent Base and Scroll chain ids', () => {
  assert.equal(profile().chainId, 84532); assert.equal(profile('scroll-sepolia').chainId, 534351);
  assert.throws(() => createDeploymentProfile('scroll-sepolia', { ...profile(), chainId: 84532 }), /chain id mismatch/);
  assert.throws(() => createDeploymentProfile('base-sepolia', { ...profile(), entryPoint: { ...profile().entryPoint, codeHash: H(0) } }), /pinned/);
});
test('deployment verification checks chain, bytecode and runtime hashes', async () => {
  const p = ports(); const service = new SafeServiceAdapter(profile(), p.rpc, p.lifecycle, p.bundler, p.signer);
  await service.verifyDeployment(); await assert.doesNotReject(() => service.createSafe({ owners: [A(5)], threshold: 1, saltNonce: 1n }));
  const mismatch = ports({ hashes: [H(8), H(2), H(3)] }); const bad = new SafeServiceAdapter(profile(), mismatch.rpc, mismatch.lifecycle, mismatch.bundler, mismatch.signer);
  await assert.rejects(() => bad.verifyDeployment(), /hash mismatch/);
});
test('provider-neutral lifecycle and call preparation', async () => {
  const p = ports(); const service = new SafeServiceAdapter(profile(), p.rpc, p.lifecycle, p.bundler, p.signer); await service.verifyDeployment();
  const prepared = await service.prepareCall({ account: A(4), call: { to: A(6), value: 0n, data: '0x' } }); assert.equal(prepared.chainId, 84532); assert.equal(prepared.callData, '0xabcd');
});
test('simulation is mandatory and a second submission is refused', async () => {
  const p = ports(); const service = new SafeServiceAdapter(profile(), p.rpc, p.lifecycle, p.bundler, p.signer); await service.verifyDeployment();
  await assert.rejects(() => service.submit(op()), /simulation/); await service.simulate(op()); assert.equal(await service.submit(op()), H(9)); await assert.rejects(() => service.submit(op()), /already/);
});
test('invalid operation and missing paymaster fail closed', async () => {
  const p = ports(); const service = new SafeServiceAdapter(profile(), p.rpc, p.lifecycle, p.bundler, p.signer); await service.verifyDeployment();
  await assert.rejects(() => service.simulate({ ...op(), callData: '0x1' }), /even-length/); await assert.rejects(() => service.sponsor(op()), /not configured/);
});
test('receipt inspection preserves provider hash and success state', async () => {
  const p = ports(); const service = new SafeServiceAdapter(profile(), p.rpc, p.lifecycle, p.bundler, p.signer); await service.verifyDeployment(); const receipt = await service.receipt(H(9)); assert.equal(receipt.userOpHash, H(9)); assert.equal(receipt.success, true);
});
