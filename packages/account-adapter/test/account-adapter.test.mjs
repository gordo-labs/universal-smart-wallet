import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDeployment,
  ENTRY_POINT_V08,
  PasskeyBoundaryError,
  createPasskeySigner,
  deriveDeterministicAccountAddress,
  parseErc4337Config,
  submitUserOperation,
  UserOperationAdapterError,
  ERC7579_DRAFT_VERSION,
  ERC7579_ADAPTER_VERSION,
  assertERC7579Policy,
  createERC7579Lifecycle,
} from '../dist/index.js';

const valid = {
  chainId: 31337,
  account: '0x1111111111111111111111111111111111111111',
  accountCodeHash: '0x' + '11'.repeat(32),
  entryPoint: ENTRY_POINT_V08,
  entryPointVersion: '0.8.0',
};

test('accepts pinned local deployment metadata', () => assertDeployment(valid));
test('rejects an address without a code hash', () => {
  assert.throws(
    () =>
      assertDeployment({ ...valid, accountCodeHash: '0x' + '00'.repeat(32) }),
    /code hash/,
  );
});
test('rejects an incompatible EntryPoint', () => {
  assert.throws(
    () =>
      assertDeployment({
        ...valid,
        entryPoint: '0x2222222222222222222222222222222222222222',
      }),
    /EntryPoint/,
  );
});

const assertion = {
  clientDataJSON: new Uint8Array([1]),
  authenticatorData: new Uint8Array([2]),
  signature: new Uint8Array([3]),
  origin: 'https://wallet.example',
  rpId: 'wallet.example',
  challenge: 'challenge-1',
  account: valid.account,
};
const verifierCodeHash = '0x' + '22'.repeat(32);

test('passkey boundary accepts a verified assertion without private material', async () => {
  const signer = createPasskeySigner({
    account: valid.account,
    origin: assertion.origin,
    rpId: assertion.rpId,
    challenge: assertion.challenge,
    verifyP256: async ({ assertion: received }) => received.signature[0] === 3,
    verifierCodeHash,
    expectedVerifierCodeHash: verifierCodeHash,
  });
  const signature = await signer.signDigest(`0x${'ab'.repeat(32)}`, assertion);
  assert.deepEqual([...signature], [3]);
  assert.equal('privateKey' in signer, false);
});

for (const [field, code] of [
  ['origin', 'ORIGIN_MISMATCH'],
  ['rpId', 'RP_ID_MISMATCH'],
  ['challenge', 'CHALLENGE_MISMATCH'],
  ['account', 'ACCOUNT_MISMATCH'],
]) {
  test(`rejects a passkey assertion with the wrong ${field}`, async () => {
    const signer = createPasskeySigner({
      account: valid.account,
      origin: assertion.origin,
      rpId: assertion.rpId,
      challenge: assertion.challenge,
      verifyP256: async () => true,
      verifierCodeHash,
      expectedVerifierCodeHash: verifierCodeHash,
    });
    await assert.rejects(
      signer.signDigest(`0x${'ab'.repeat(32)}`, {
        ...assertion,
        [field]:
          field === 'account'
            ? '0x2222222222222222222222222222222222222222'
            : 'wrong',
      }),
      (error) => error instanceof PasskeyBoundaryError && error.code === code,
    );
  });
}

test('rejects an invalid P-256 signature', async () => {
  const signer = createPasskeySigner({
    account: valid.account,
    origin: assertion.origin,
    rpId: assertion.rpId,
    challenge: assertion.challenge,
    verifyP256: async () => false,
    verifierCodeHash,
    expectedVerifierCodeHash: verifierCodeHash,
  });
  await assert.rejects(
    signer.signDigest(`0x${'ab'.repeat(32)}`, assertion),
    /rejected/,
  );
});

test('derives a stable account address from documented public inputs', async () => {
  const input = {
    chainId: 31337,
    factory: valid.account,
    rpId: 'wallet.example',
    credentialId: 'credential-1',
  };
  const first = await deriveDeterministicAccountAddress(input);
  const second = await deriveDeterministicAccountAddress({ ...input });
  const changed = await deriveDeterministicAccountAddress({
    ...input,
    credentialId: 'credential-2',
  });
  assert.match(first, /^0x[0-9a-f]{40}$/);
  assert.equal(first, second);
  assert.notEqual(first, changed);
});

test('opt-in config skips cleanly unless explicitly enabled', () => {
  assert.equal(parseErc4337Config({}), null);
  assert.throws(
    () => parseErc4337Config({ SSW_4337_ENABLED: '1' }),
    /Missing SSW_4337_CHAIN_ID/,
  );
});

const flowConfig = {
  chainId: 11155111,
  rpcUrl: 'https://rpc.test.invalid',
  bundlerUrl: 'https://bundler.test.invalid',
  entryPoint: ENTRY_POINT_V08,
  entryPointVersion: '0.8.0',
  account: valid.account,
  accountCodeHash: valid.accountCodeHash,
};
const operation = {
  sender: valid.account,
  nonce: 0n,
  callData: '0x',
  callGasLimit: 1n,
  verificationGasLimit: 1n,
  preVerificationGas: 1n,
  maxFeePerGas: 1n,
  maxPriorityFeePerGas: 1n,
  signature: '0x01',
};
const receipt = {
  userOperationHash: '0x' + 'aa'.repeat(32),
  transactionHash: '0x' + 'bb'.repeat(32),
  blockNumber: 5n,
  success: true,
  entryPoint: ENTRY_POINT_V08,
  chainId: 11155111,
  sender: valid.account,
};

test('simulates, sponsors, submits once, and links an exact receipt', async () => {
  let sends = 0;
  const bundler = {
    async simulateUserOperation() {
      return {};
    },
    async sendUserOperation() {
      sends += 1;
      return receipt.userOperationHash;
    },
    async getUserOperationReceipt() {
      return receipt;
    },
  };
  const result = await submitUserOperation(
    flowConfig,
    bundler,
    operation,
    undefined,
    { pollIntervalMs: 0 },
  );
  assert.deepEqual(result, receipt);
  assert.equal(sends, 1);
});

test('provider and paymaster failures are actionable and never retried', async () => {
  const denied = {
    async sponsorUserOperation() {
      throw new Error('denied');
    },
  };
  const bundler = {
    async simulateUserOperation() {
      return {};
    },
    async sendUserOperation() {
      throw new Error('offline');
    },
    async getUserOperationReceipt() {
      return null;
    },
  };
  await assert.rejects(
    submitUserOperation(flowConfig, bundler, operation, denied),
    (error) =>
      error instanceof UserOperationAdapterError &&
      error.code === 'PAYMASTER_DENIED',
  );
  await assert.rejects(
    submitUserOperation(flowConfig, bundler, operation),
    (error) =>
      error instanceof UserOperationAdapterError &&
      error.code === 'BUNDLER_UNAVAILABLE',
  );
});

const modulePolicy = {
  draft: ERC7579_DRAFT_VERSION,
  adapter: ERC7579_ADAPTER_VERSION,
  modules: [
    {
      address: '0x3333333333333333333333333333333333333333',
      type: 'executor',
      version: '1.0.0',
      codeHash: '0x' + '33'.repeat(32),
      delegateCall: false,
      draft: ERC7579_DRAFT_VERSION,
    },
  ],
};

test('ERC-7579 policy pins draft, module version, and runtime code hash', () => {
  assert.doesNotThrow(() => assertERC7579Policy(modulePolicy));
  assert.throws(
    () =>
      assertERC7579Policy({
        ...modulePolicy,
        modules: [
          { ...modulePolicy.modules[0], codeHash: '0x' + '00'.repeat(32) },
        ],
      }),
    /code hash/,
  );
  assert.throws(
    () =>
      assertERC7579Policy({
        ...modulePolicy,
        modules: [{ ...modulePolicy.modules[0], delegateCall: true }],
      }),
    /fail-closed/,
  );
});

test('ERC-7579 lifecycle installs, uses, uninstalls, and recovers without delegatecall', () => {
  const lifecycle = createERC7579Lifecycle(modulePolicy);
  const module = modulePolicy.modules[0];
  lifecycle.install(module);
  assert.deepEqual(
    [...lifecycle.use(module.address, new Uint8Array([7]))],
    [7],
  );
  assert.deepEqual(lifecycle.installed(), [module.address.toLowerCase()]);
  lifecycle.uninstall(module.address);
  assert.deepEqual(lifecycle.installed(), []);
  assert.throws(() => lifecycle.use(module.address), /not installed/);
  lifecycle.install(module);
  lifecycle.recoverUninstall(module.address);
  assert.deepEqual(lifecycle.installed(), []);
});

test('ERC-7579 lifecycle rejects unpinned and malicious modules', () => {
  const lifecycle = createERC7579Lifecycle(modulePolicy);
  assert.throws(
    () =>
      lifecycle.install({
        ...modulePolicy.modules[0],
        codeHash: '0x' + '44'.repeat(32),
      }),
    /code-hash/,
  );
  assert.throws(
    () =>
      lifecycle.install({
        ...modulePolicy.modules[0],
        address: '0x4444444444444444444444444444444444444444',
      }),
    /code-hash/,
  );
});
