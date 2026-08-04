import { describe, expect, it } from 'vitest';
import {
  createHolderBinding,
  createPrivateDidLifecycle,
  didEthr,
  didPkh,
  disabledIdentityAdapter,
  IdentityAdapterError,
  resolveDid,
  verifyControlProof,
} from '../src/index.ts';

const account = {
  chainId: 31337,
  address: '0xAbcdefabcdefabcdefabcdefabcdefabcdefabcd',
};

describe('DID and holder-binding adapter', () => {
  it('creates a local private DID without registration or implicit disclosure', async () => {
    const lifecycle = createPrivateDidLifecycle(account);
    expect(lifecycle.did.did).toBe(
      'did:pkh:eip155:31337:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    );
    expect(lifecycle.created).toEqual({ registeredOnChain: false, disclosed: false });
    expect(lifecycle.exportControl({ fixture: 'explicit-control' })).toMatchObject({
      version: 1,
      registration: 'local-only',
      did: lifecycle.did,
    });
    const pairwise = await lifecycle.pairwise({
      credentialId: 'cred-1',
      verifier: 'verifier-a',
    });
    expect(pairwise.holderId).not.toContain(account.address.slice(2).toLowerCase());
  });

  it('preserves DID across signer/vendor rotation and fails closed on chain changes', () => {
    const lifecycle = createPrivateDidLifecycle(account);
    const rotated = lifecycle.rotateControl({
      chainId: account.chainId,
      address: `0x${account.address.slice(2).toUpperCase()}`,
    });
    expect(rotated.did.did).toBe(lifecycle.did.did);
    expect(() => lifecycle.rotateControl({ ...account, chainId: 1 })).toThrowError(
      expect.objectContaining({ code: 'CHAIN_MISMATCH' }),
    );
    expect(() => lifecycle.rotateControl({
      ...account,
      address: '0x1111111111111111111111111111111111111111',
    })).toThrowError(expect.objectContaining({ code: 'CONTROL_PROOF_REJECTED' }));
  });

  it('keeps controller DID stable across passkey rotation', async () => {
    const controller = didPkh(account);
    const before = await createHolderBinding({
      mode: 'credential-scoped',
      credentialId: 'cred-1',
      controller,
    });
    const after = await createHolderBinding({
      mode: 'credential-scoped',
      credentialId: 'cred-1',
      controller,
    });
    expect(controller.did).toBe(
      'did:pkh:eip155:31337:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    );
    expect(before.holderId).toBe(after.holderId);
    expect(before.holderId).not.toContain(
      account.address.slice(2).toLowerCase(),
    );
  });

  it('scopes pairwise identifiers per verifier and never silently downgrades', async () => {
    const controller = didEthr(account);
    const one = await createHolderBinding({
      mode: 'pairwise',
      credentialId: 'cred-1',
      controller,
      verifier: 'verifier-a',
    });
    const two = await createHolderBinding({
      mode: 'pairwise',
      credentialId: 'cred-1',
      controller,
      verifier: 'verifier-b',
    });
    expect(one.holderId).not.toBe(two.holderId);
    expect(() => disabledIdentityAdapter().bind()).toThrowError(
      IdentityAdapterError,
    );
    await expect(
      createHolderBinding({
        mode: 'pairwise',
        credentialId: 'cred-1',
        controller,
      }),
    ).rejects.toMatchObject({ code: 'BINDING_MISMATCH' });
  });

  it('rejects wrong-controller and wrong-chain proofs; outage is explicit', async () => {
    const controller = didPkh(account);
    const control = { verify: async () => true };
    await expect(
      verifyControlProof({
        did: controller,
        expectedAccount: {
          ...account,
          address: '0x1111111111111111111111111111111111111111',
        },
        proof: {},
        control,
      }),
    ).rejects.toMatchObject({ code: 'CONTROL_PROOF_REJECTED' });
    await expect(
      verifyControlProof({
        did: controller,
        expectedAccount: { ...account, chainId: 1 },
        proof: {},
        control,
      }),
    ).rejects.toMatchObject({ code: 'CHAIN_MISMATCH' });
    await expect(
      resolveDid({
        did: controller.did,
        resolver: {
          resolve: async () => {
            throw new Error('offline');
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'RESOLVER_UNAVAILABLE' });
  });

  it('rejects forged DID references instead of silently using the public controller', async () => {
    const forged = {
      method: 'did:pkh',
      did: 'did:pkh:eip155:31337:0x1111111111111111111111111111111111111111',
      controller: didPkh(account).controller,
    };
    await expect(
      createHolderBinding({
        mode: 'pairwise',
        credentialId: 'cred-1',
        verifier: 'verifier-a',
        controller: forged,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_DID' });
    await expect(
      verifyControlProof({
        did: forged,
        expectedAccount: account,
        proof: {},
        control: { verify: async () => true },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_DID' });
  });

  it('verifies a deterministic control fixture', async () => {
    const controller = didPkh(account);
    await expect(
      verifyControlProof({
        did: controller,
        expectedAccount: account,
        proof: { fixture: 'valid' },
        control: { verify: async ({ proof }) => proof.fixture === 'valid' },
      }),
    ).resolves.toBeUndefined();
    await expect(
      verifyControlProof({
        did: controller,
        expectedAccount: account,
        proof: { fixture: 'wrong' },
        control: { verify: async () => false },
      }),
    ).rejects.toMatchObject({ code: 'CONTROL_PROOF_REJECTED' });
  });
});
