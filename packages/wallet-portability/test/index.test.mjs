import { describe, expect, it } from 'vitest';
import {
  exportMigrationBundle,
  importMigrationBundle,
  openMigrationBundle,
  PortabilityError,
  rotateVendor,
} from '../src/index.ts';

const account = '0x1111111111111111111111111111111111111111';
const key = new Uint8Array(32).fill(7);
const state = {
  wallet: {
    address: account,
    chainId: 84532,
    did: `did:pkh:eip155:84532:${account}`,
  },
  control: {
    recoveryAvailable: true,
    signers: [
      { id: 'recovery-1', kind: 'recovery', publicKey: '0x' + '22'.repeat(32) },
    ],
    modules: [],
  },
  assets: [
    { kind: 'native', balance: '100' },
    {
      kind: 'erc20',
      address: '0x2222222222222222222222222222222222222222',
      balance: '42',
    },
  ],
  history: { digest: '0x' + '33'.repeat(32) },
};
const auth = { authorize: async () => {} };
const signer = {
  keyId: 'fixture-key',
  sign: async (bytes) =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  verify: async (bytes, sig) =>
    Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).equals(
      Buffer.from(sig),
    ),
};
const encryption = {
  strategy: 'passphrase',
  passphrase: 'correct horse battery staple',
  iterations: 100000,
};
const create = () =>
  exportMigrationBundle({
    state,
    authorization: auth,
    signer,
    encryption,
    bundleId: 'bundle-1',
    expiresAt: '2030-01-01T00:00:00.000Z',
    now: () => new Date('2029-01-01T00:00:00.000Z'),
  });

describe('@ssw/wallet-portability', () => {
  it('round-trips a signed encrypted bundle without plaintext keys', async () => {
    const bundle = await create();
    expect(JSON.stringify(bundle)).not.toContain('correct horse');
    const opened = await openMigrationBundle({
      bundle,
      authorization: auth,
      signer,
      secret: encryption.passphrase,
      now: () => new Date('2029-01-02T00:00:00.000Z'),
    });
    expect(opened).toEqual(state);
  });
  it('rejects tampering, downgrade and expiry before import', async () => {
    const bundle = await create();
    await expect(
      openMigrationBundle({
        bundle: { ...bundle, bundleId: 'bundle-2' },
        authorization: auth,
        signer,
        secret: encryption.passphrase,
      }),
    ).rejects.toMatchObject({ code: 'SIGNATURE_INVALID' });
    await expect(
      openMigrationBundle({
        bundle: { ...bundle, version: 0 },
        authorization: auth,
        signer,
        secret: encryption.passphrase,
      }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_VERSION' });
    await expect(
      openMigrationBundle({
        bundle,
        authorization: auth,
        signer,
        secret: encryption.passphrase,
        now: () => new Date('2031-01-01T00:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ code: 'BUNDLE_EXPIRED' });
  });
  it('rejects attempts to export plaintext recovery material', async () => {
    await expect(
      createExportWithState({
        ...state,
        vaultBackup: { privateKey: 'never-export-this' },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_BUNDLE' });
    await expect(
      createExportWithState({ ...state, vendorSpecific: 'forbidden' }),
    ).rejects.toMatchObject({ code: 'INVALID_BUNDLE' });
  });
  it('requires explicit user authorization and rolls back interrupted import', async () => {
    const bundle = await create();
    const denied = {
      authorize: async () => {
        throw new Error('cancelled');
      },
    };
    await expect(
      openMigrationBundle({
        bundle,
        authorization: denied,
        signer,
        secret: encryption.passphrase,
      }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_REQUIRED' });
    let rolledBack = false;
    const target = {
      prepare: async () => ({ id: 1 }),
      commit: async () => {
        throw new Error('interrupted');
      },
      verify: async () => false,
      rollback: async () => {
        rolledBack = true;
      },
    };
    await expect(
      importMigrationBundle({
        bundle,
        authorization: auth,
        signer,
        secret: encryption.passphrase,
        target,
      }),
    ).rejects.toMatchObject({ code: 'IMPORT_FAILED' });
    expect(rolledBack).toBe(true);
  });
  it('does not remove old control until new control verifies and preserves identity', async () => {
    const events = [];
    const rotation = {
      inspect: async () => ({
        portable: true,
        recoveryAvailable: true,
        account,
        chainId: 84532,
        did: state.wallet.did,
        assetsDigest: '0x' + '11'.repeat(32),
        historyDigest: '0x' + '22'.repeat(32),
      }),
      installNextControl: async () => events.push('install'),
      verifyNextControl: async () => true,
      snapshot: async () => state,
      removeOldControl: async () => events.push('remove'),
      rollbackNextControl: async () => events.push('rollback'),
    };
    await expect(
      rotateVendor({ authorization: auth, rotation }),
    ).resolves.toMatchObject({ oldControlRemoved: true });
    expect(events).toEqual(['install', 'remove']);
    const failing = {
      ...rotation,
      verifyNextControl: async () => false,
      removeOldControl: async () => events.push('bad-remove'),
    };
    await expect(
      rotateVendor({ authorization: auth, rotation: failing }),
    ).rejects.toMatchObject({ code: 'ROTATION_FAILED' });
    expect(events).not.toContain('bad-remove');
    expect(events.at(-1)).toBe('rollback');
  });
  it('fails closed when account modules do not support rotation', async () => {
    const rotation = {
      inspect: async () => ({
        portable: false,
        reason: 'module blocks rotation',
        recoveryAvailable: true,
        account,
        chainId: 84532,
        assetsDigest: '0x' + '11'.repeat(32),
        historyDigest: '0x' + '22'.repeat(32),
      }),
    };
    await expect(
      rotateVendor({ authorization: auth, rotation }),
    ).rejects.toMatchObject({ code: 'ROTATION_UNSUPPORTED' });
  });
});

const createExportWithState = (nextState) =>
  exportMigrationBundle({
    state: nextState,
    authorization: auth,
    signer,
    encryption,
    bundleId: 'bundle-secret',
    expiresAt: '2030-01-01T00:00:00.000Z',
    now: () => new Date('2029-01-01T00:00:00.000Z'),
  });
