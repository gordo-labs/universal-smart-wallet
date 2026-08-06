/** Provider-neutral DID and holder-binding boundary.
 *
 * DID is deliberately optional: credential exchange can run without creating
 * a DID or contacting a resolver. Integrations supply resolver/control-proof
 * implementations; this package contains no chain or universal-resolver code.
 */
export const adapterName = 'identity-adapter';

export type DidMethod = 'did:pkh' | 'did:ethr';
export type HolderBindingMode = 'credential-scoped' | 'pairwise';

export type AccountController = {
  readonly chainId: number;
  readonly address: `0x${string}`;
};

export type DidReference = {
  readonly method: DidMethod;
  readonly did: string;
  readonly controller: AccountController;
};

export type ResolverPort = {
  resolve(did: string): Promise<unknown>;
};

export type ControlProofPort = {
  verify(input: {
    readonly did: DidReference;
    readonly account: AccountController;
    readonly proof: unknown;
  }): Promise<boolean>;
};

/** A proof is exported only when a caller explicitly asks for DID control. */
export type DidControlExport = {
  readonly version: 1;
  readonly did: DidReference;
  readonly proof: unknown;
  /** This package never registers a DID or submits a chain transaction. */
  readonly registration: 'local-only';
};

export type PrivateDidLifecycle = {
  readonly did: DidReference;
  /** Creation is local and has no chain side effects or implicit disclosure. */
  readonly created: {
    readonly registeredOnChain: false;
    readonly disclosed: false;
  };
  /** The DID remains stable when signer/passkey/vendor control changes. */
  rotateControl(account: AccountController): PrivateDidLifecycle;
  pairwise(input: {
    readonly credentialId: string;
    readonly verifier: string;
  }): Promise<HolderBinding>;
  exportControl(proof: unknown): DidControlExport;
};

export type HolderBinding = {
  readonly mode: HolderBindingMode;
  readonly credentialId: string;
  /** Pairwise identifier, never a public account address. */
  readonly holderId: string;
  /** Stable controller identity used only when explicitly requested. */
  readonly controller: DidReference;
};

export class IdentityAdapterError extends Error {
  constructor(
    readonly code:
      | 'DISABLED'
      | 'INVALID_DID'
      | 'INVALID_ACCOUNT'
      | 'RESOLVER_UNAVAILABLE'
      | 'CONTROL_PROOF_REJECTED'
      | 'CHAIN_MISMATCH'
      | 'BINDING_MISMATCH',
    message: string,
  ) {
    super(message);
    this.name = 'IdentityAdapterError';
  }
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const normalizeAccount = (account: AccountController): AccountController => {
  if (
    !Number.isSafeInteger(account.chainId) ||
    account.chainId <= 0 ||
    !ADDRESS.test(account.address) ||
    /^0x0{40}$/iu.test(account.address)
  )
    throw new IdentityAdapterError(
      'INVALID_ACCOUNT',
      'valid account and chain are required',
    );
  return {
    chainId: account.chainId,
    address: account.address.toLowerCase() as `0x${string}`,
  };
};

const assertDidReference = (reference: DidReference): DidReference => {
  if (reference.method !== 'did:pkh' && reference.method !== 'did:ethr')
    throw new IdentityAdapterError('INVALID_DID', 'unsupported DID method');
  const normalized =
    reference.method === 'did:pkh'
      ? didPkh(reference.controller)
      : didEthr(reference.controller);
  if (reference.did !== normalized.did)
    throw new IdentityAdapterError(
      'INVALID_DID',
      'DID does not match its controller account',
    );
  return normalized;
};

export function didPkh(account: AccountController): DidReference {
  const normalized = normalizeAccount(account);
  return {
    method: 'did:pkh',
    did: `did:pkh:eip155:${normalized.chainId}:${normalized.address}`,
    controller: normalized,
  };
}

export function didEthr(account: AccountController): DidReference {
  const normalized = normalizeAccount(account);
  return {
    method: 'did:ethr',
    did: `did:ethr:${normalized.chainId}:${normalized.address}`,
    controller: normalized,
  };
}

export function parseDid(did: string): DidReference {
  const pkh = /^did:pkh:eip155:(\d+):(0x[0-9a-f]{40})$/u.exec(
    did.toLowerCase(),
  );
  if (pkh)
    return didPkh({
      chainId: Number(pkh[1]),
      address: pkh[2] as `0x${string}`,
    });
  const ethr = /^did:ethr:(\d+):(0x[0-9a-f]{40})$/u.exec(did.toLowerCase());
  if (ethr)
    return didEthr({
      chainId: Number(ethr[1]),
      address: ethr[2] as `0x${string}`,
    });
  throw new IdentityAdapterError('INVALID_DID', 'unsupported DID syntax');
}

const toB64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/=+$/u, '');
};

const digest = async (value: string): Promise<string> =>
  toB64Url(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  );

/** Create a credential-scoped or verifier-pairwise holder identifier. */
export async function createHolderBinding(input: {
  readonly mode: HolderBindingMode;
  readonly credentialId: string;
  readonly controller: DidReference;
  readonly verifier?: string;
}): Promise<HolderBinding> {
  const controller = assertDidReference(input.controller);
  if (!input.credentialId || input.credentialId.length > 256)
    throw new IdentityAdapterError(
      'BINDING_MISMATCH',
      'credential id is required and bounded',
    );
  if (input.mode === 'pairwise' && !input.verifier)
    throw new IdentityAdapterError(
      'BINDING_MISMATCH',
      'pairwise binding requires verifier scope',
    );
  const scope = input.mode === 'pairwise' ? input.verifier : 'credential';
  const holderId = `h_${await digest(`${controller.did}|${input.credentialId}|${scope}`)}`;
  return {
    mode: input.mode,
    credentialId: input.credentialId,
    holderId,
    controller,
  };
}

/**
 * Creates the default private DID at wallet creation time. This is a local
 * value object: it never resolves, registers, publishes, or submits a chain
 * transaction. A new signer/vendor therefore cannot change the controller.
 */
export function createPrivateDidLifecycle(
  account: AccountController,
  method: DidMethod = 'did:pkh',
): PrivateDidLifecycle {
  if (method !== 'did:pkh' && method !== 'did:ethr')
    throw new IdentityAdapterError('INVALID_DID', 'unsupported DID method');
  const controller = method === 'did:pkh' ? didPkh(account) : didEthr(account);
  const lifecycle: PrivateDidLifecycle = {
    did: controller,
    created: { registeredOnChain: false, disclosed: false },
    rotateControl(nextAccount) {
      const next = normalizeAccount(nextAccount);
      if (next.chainId !== controller.controller.chainId)
        throw new IdentityAdapterError(
          'CHAIN_MISMATCH',
          'DID control rotation cannot change chain',
        );
      if (next.address !== controller.controller.address)
        throw new IdentityAdapterError(
          'CONTROL_PROOF_REJECTED',
          'DID controller cannot change during signer/vendor rotation',
        );
      return lifecycle;
    },
    pairwise(input) {
      return createHolderBinding({
        mode: 'pairwise',
        credentialId: input.credentialId,
        verifier: input.verifier,
        controller,
      });
    },
    exportControl(proof) {
      return {
        version: 1,
        did: controller,
        proof,
        registration: 'local-only',
      };
    },
  };
  return lifecycle;
}

export async function verifyControlProof(input: {
  readonly did: DidReference;
  readonly expectedAccount: AccountController;
  readonly proof: unknown;
  readonly control: ControlProofPort;
}): Promise<void> {
  const did = assertDidReference(input.did);
  const expected = normalizeAccount(input.expectedAccount);
  if (did.controller.chainId !== expected.chainId)
    throw new IdentityAdapterError(
      'CHAIN_MISMATCH',
      'DID controller chain does not match account chain',
    );
  if (did.controller.address !== expected.address.toLowerCase())
    throw new IdentityAdapterError(
      'CONTROL_PROOF_REJECTED',
      'controller does not match account',
    );
  if (
    !(await input.control.verify({
      did,
      account: expected,
      proof: input.proof,
    }))
  )
    throw new IdentityAdapterError(
      'CONTROL_PROOF_REJECTED',
      'DID control proof rejected',
    );
}

export async function resolveDid(input: {
  did: string;
  resolver: ResolverPort;
}): Promise<unknown> {
  const reference = parseDid(input.did);
  try {
    return await input.resolver.resolve(reference.did);
  } catch (error) {
    throw new IdentityAdapterError(
      'RESOLVER_UNAVAILABLE',
      `resolver unavailable for ${reference.method}: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

/** Explicit opt-out used by the base credential flow. */
export function disabledIdentityAdapter(): {
  readonly enabled: false;
  bind(): never;
} {
  return {
    enabled: false,
    bind(): never {
      throw new IdentityAdapterError(
        'DISABLED',
        'DID adapter is disabled; use SD-JWT holder binding',
      );
    },
  };
}
