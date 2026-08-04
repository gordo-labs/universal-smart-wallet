/**
 * Provider-neutral WebAuthn/passkey authentication boundary.
 *
 * This package never receives private key material and never implements a
 * P-256 verifier. Deployments supply a reviewed verifier through the port.
 * The browser adapter only orchestrates navigator.credentials and the server
 * service enforces the ceremony context before calling that verifier.
 */
export const adapterName = 'auth-passkey';
export const PASSKEY_SCHEMA_VERSION = 1 as const;

export type CeremonyKind = 'registration' | 'authentication' | 'step-up';
export type UserVerification = 'required';
export type PrfStrategy = 'prf' | 'passphrase';

export type PasskeyCeremonyContext = {
  readonly schemaVersion: typeof PASSKEY_SCHEMA_VERSION;
  readonly kind: CeremonyKind;
  readonly challenge: string;
  readonly origin: string;
  readonly rpId: string;
  readonly account: `0x${string}`;
  readonly did: string;
  readonly userVerification: UserVerification;
  /** Runtime hash of the pinned verifier deployment, not a public-key hash. */
  readonly verifierCodeHash: `0x${string}`;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly credentialId?: string;
};

export type PasskeyAssertion = {
  readonly clientDataJSON: Uint8Array;
  readonly authenticatorData: Uint8Array;
  readonly signature: Uint8Array;
  readonly origin: string;
  readonly rpId: string;
  readonly challenge: string;
  readonly account: `0x${string}`;
  readonly credentialId: string;
  readonly userVerified: boolean;
  readonly userVerification: UserVerification;
  readonly verifierCodeHash: `0x${string}`;
};

export type PasskeyCredential = {
  readonly credentialId: string;
  readonly account: `0x${string}`;
  readonly did: string;
  readonly origin: string;
  readonly rpId: string;
  /** Public key bytes are opaque to this package and may be persisted by a store. */
  readonly publicKey: Uint8Array;
  readonly createdAt: number;
  readonly status: 'active' | 'revoked';
};

export type PasskeyVerifierPort = {
  verify(input: {
    readonly assertion: PasskeyAssertion;
    readonly context: PasskeyCeremonyContext;
    readonly credential: PasskeyCredential;
  }): Promise<boolean>;
};

export type ChallengeStore = {
  put(context: PasskeyCeremonyContext): Promise<void>;
  consume(challenge: string): Promise<PasskeyCeremonyContext | undefined>;
};

export type BrowserCapabilities = {
  readonly webauthn: boolean;
  readonly prf: boolean;
  readonly reason?: 'unavailable' | 'unsupported' | 'not-detected';
};

export type BrowserCredentialApi = {
  create(input: {
    readonly challenge: string;
    readonly account: `0x${string}`;
    readonly rpId: string;
    readonly origin: string;
    readonly userVerification: UserVerification;
    readonly prf: boolean;
  }): Promise<{ readonly credentialId: string; readonly publicKey: Uint8Array; readonly assertion: PasskeyAssertion }>;
  get(input: {
    readonly challenge: string;
    readonly account: `0x${string}`;
    readonly credentialId: string;
    readonly rpId: string;
    readonly origin: string;
    readonly userVerification: UserVerification;
    readonly prf: boolean;
  }): Promise<{ readonly assertion: PasskeyAssertion; readonly prfOutput?: Uint8Array }>;
  capabilities?(): Promise<BrowserCapabilities>;
};

export type BrowserPasskeyAdapter = {
  readonly capabilities: () => Promise<BrowserCapabilities>;
  register(input: {
    readonly context: PasskeyCeremonyContext;
    readonly preferPrf?: boolean;
  }): Promise<{ readonly credentialId: string; readonly publicKey: Uint8Array; readonly assertion: PasskeyAssertion; readonly prfOutput?: Uint8Array }>;
  authenticate(input: {
    readonly context: PasskeyCeremonyContext;
    readonly credentialId: string;
    readonly preferPrf?: boolean;
  }): Promise<{ readonly assertion: PasskeyAssertion; readonly prfOutput?: Uint8Array }>;
};

export class PasskeyAuthError extends Error {
  constructor(
    readonly code:
      | 'INVALID_CONTEXT'
      | 'CONTEXT_EXPIRED'
      | 'CHALLENGE_MISMATCH'
      | 'ORIGIN_MISMATCH'
      | 'RP_ID_MISMATCH'
      | 'ACCOUNT_MISMATCH'
      | 'DID_MISMATCH'
      | 'CREDENTIAL_MISMATCH'
      | 'USER_VERIFICATION_REQUIRED'
      | 'VERIFIER_CODE_HASH_MISMATCH'
      | 'EMPTY_ASSERTION'
      | 'INVALID_ASSERTION'
      | 'VERIFIER_REJECTED'
      | 'CHALLENGE_REPLAYED'
      | 'CREDENTIAL_EXISTS'
      | 'CREDENTIAL_NOT_FOUND'
      | 'CREDENTIAL_REVOKED'
      | 'ROTATION_REQUIRES_REPLACEMENT'
      | 'USER_CANCELLED'
      | 'AUTHENTICATOR_UNAVAILABLE'
      | 'PRF_UNAVAILABLE',
    message: string,
  ) {
    super(message);
    this.name = 'PasskeyAuthError';
  }
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const CODE_HASH = /^0x[0-9a-fA-F]{64}$/u;
const validAddress = (value: string): value is `0x${string}` =>
  ADDRESS.test(value) && !/^0x0+$/u.test(value);

function assertContext(context: PasskeyCeremonyContext, now: number): void {
  if (
    context.schemaVersion !== PASSKEY_SCHEMA_VERSION ||
    !['registration', 'authentication', 'step-up'].includes(context.kind) ||
    !context.challenge ||
    !context.origin.startsWith('https://') ||
    !context.rpId ||
    !validAddress(context.account) ||
    !context.did ||
    context.userVerification !== 'required' ||
    !CODE_HASH.test(context.verifierCodeHash) ||
    /^0x0+$/u.test(context.verifierCodeHash) ||
    !Number.isSafeInteger(context.issuedAt) ||
    !Number.isSafeInteger(context.expiresAt) ||
    context.expiresAt <= context.issuedAt
  )
    throw new PasskeyAuthError('INVALID_CONTEXT', 'invalid passkey ceremony context');
  if (!Number.isSafeInteger(now) || now < context.issuedAt || now >= context.expiresAt)
    throw new PasskeyAuthError('CONTEXT_EXPIRED', 'passkey ceremony context has expired');
}

function assertAssertion(assertion: PasskeyAssertion, context: PasskeyCeremonyContext): void {
  if (assertion.origin !== context.origin)
    throw new PasskeyAuthError('ORIGIN_MISMATCH', 'WebAuthn origin does not match the ceremony');
  if (assertion.rpId !== context.rpId)
    throw new PasskeyAuthError('RP_ID_MISMATCH', 'WebAuthn RP ID does not match the ceremony');
  if (assertion.challenge !== context.challenge)
    throw new PasskeyAuthError('CHALLENGE_MISMATCH', 'WebAuthn challenge does not match the ceremony');
  if (assertion.account.toLowerCase() !== context.account.toLowerCase())
    throw new PasskeyAuthError('ACCOUNT_MISMATCH', 'WebAuthn assertion targets another account');
  if (assertion.userVerification !== 'required' || !assertion.userVerified)
    throw new PasskeyAuthError('USER_VERIFICATION_REQUIRED', 'user verification was not satisfied');
  if (assertion.verifierCodeHash.toLowerCase() !== context.verifierCodeHash.toLowerCase())
    throw new PasskeyAuthError('VERIFIER_CODE_HASH_MISMATCH', 'verifier deployment hash is not bound');
  if (!assertion.credentialId || assertion.signature.byteLength === 0)
    throw new PasskeyAuthError('EMPTY_ASSERTION', 'WebAuthn assertion is incomplete');
}

export class InMemoryChallengeStore implements ChallengeStore {
  private readonly values = new Map<string, PasskeyCeremonyContext>();
  async put(context: PasskeyCeremonyContext): Promise<void> {
    if (this.values.has(context.challenge))
      throw new PasskeyAuthError('INVALID_CONTEXT', 'challenge already exists');
    this.values.set(context.challenge, context);
  }
  async consume(challenge: string): Promise<PasskeyCeremonyContext | undefined> {
    const context = this.values.get(challenge);
    if (context) this.values.delete(challenge);
    return context;
  }
}

export function createPasskeyCeremonyContext(input: Omit<PasskeyCeremonyContext, 'schemaVersion'>): PasskeyCeremonyContext {
  const context = { schemaVersion: PASSKEY_SCHEMA_VERSION, ...input };
  assertContext(context, input.issuedAt);
  return context;
}

export function createBrowserPasskeyAdapter(input: {
  readonly api: BrowserCredentialApi;
}): BrowserPasskeyAdapter {
  const capabilities = async (): Promise<BrowserCapabilities> => {
    if (input.api.capabilities) return input.api.capabilities();
    return { webauthn: true, prf: false, reason: 'not-detected' };
  };
  const strategy = async (preferPrf: boolean | undefined): Promise<boolean> => {
    const available = await capabilities();
    if (!available.webauthn)
      throw new PasskeyAuthError('AUTHENTICATOR_UNAVAILABLE', 'WebAuthn is unavailable in this browser');
    if (preferPrf && !available.prf) return false;
    return Boolean(preferPrf && available.prf);
  };
  return {
    capabilities,
    async register(request) {
      assertContext(request.context, request.context.issuedAt);
      return input.api.create({
        challenge: request.context.challenge,
        account: request.context.account,
        rpId: request.context.rpId,
        origin: request.context.origin,
        userVerification: 'required',
        prf: await strategy(request.preferPrf),
      }).catch((error: unknown) => { throw classifyPasskeyError(error); });
    },
    async authenticate(request) {
      assertContext(request.context, request.context.issuedAt);
      return input.api.get({
        challenge: request.context.challenge,
        account: request.context.account,
        credentialId: request.credentialId,
        rpId: request.context.rpId,
        origin: request.context.origin,
        userVerification: 'required',
        prf: await strategy(request.preferPrf),
      }).catch((error: unknown) => { throw classifyPasskeyError(error); });
    },
  };
}

export function classifyPasskeyError(error: unknown): PasskeyAuthError {
  if (error instanceof PasskeyAuthError) return error;
  const name = error instanceof DOMException ? error.name : (error as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'AbortError')
    return new PasskeyAuthError('USER_CANCELLED', 'The user cancelled the passkey ceremony');
  if (name === 'NotSupportedError' || name === 'SecurityError')
    return new PasskeyAuthError('AUTHENTICATOR_UNAVAILABLE', 'No compatible passkey authenticator is available');
  return new PasskeyAuthError('AUTHENTICATOR_UNAVAILABLE', 'Passkey authenticator is unavailable');
}

export function choosePrfStrategy(input: { readonly preferPrf: boolean; readonly capabilities: BrowserCapabilities }): PrfStrategy {
  if (!input.capabilities.webauthn)
    throw new PasskeyAuthError('AUTHENTICATOR_UNAVAILABLE', 'WebAuthn is unavailable');
  return input.preferPrf && input.capabilities.prf ? 'prf' : 'passphrase';
}

export function createPasskeyAuthService(input: {
  readonly verifier: PasskeyVerifierPort;
  readonly challengeStore?: ChallengeStore;
  readonly now?: () => number;
}) {
  const store = input.challengeStore ?? new InMemoryChallengeStore();
  const now = input.now ?? (() => Math.floor(Date.now() / 1000));
  const credentials = new Map<string, PasskeyCredential>();
  const consumeAndVerify = async (context: PasskeyCeremonyContext, assertion: PasskeyAssertion, allowRegistration: boolean, publicKey?: Uint8Array): Promise<PasskeyCredential> => {
    assertContext(context, now());
    const stored = await store.consume(context.challenge);
    if (!stored) throw new PasskeyAuthError('CHALLENGE_REPLAYED', 'challenge was already consumed or unknown');
    assertContext(stored, now());
    if (stored.challenge !== context.challenge || stored.kind !== context.kind)
      throw new PasskeyAuthError('CHALLENGE_MISMATCH', 'challenge context does not match');
    assertAssertion(assertion, stored);
    const existing = credentials.get(assertion.credentialId);
    if (!allowRegistration && !existing) throw new PasskeyAuthError('CREDENTIAL_NOT_FOUND', 'passkey credential was not found');
    if (existing?.status === 'revoked') throw new PasskeyAuthError('CREDENTIAL_REVOKED', 'passkey credential is revoked');
    const credential = existing ?? {
      credentialId: assertion.credentialId,
      account: stored.account,
      did: stored.did,
      origin: stored.origin,
      rpId: stored.rpId,
      publicKey: publicKey?.slice() ?? new Uint8Array([1]),
      createdAt: now(),
      status: 'active' as const,
    };
    if (credential.account.toLowerCase() !== stored.account.toLowerCase() || credential.did !== stored.did)
      throw new PasskeyAuthError('CREDENTIAL_MISMATCH', 'passkey is bound to another wallet');
    if (!(await input.verifier.verify({ assertion, context: stored, credential })))
      throw new PasskeyAuthError('VERIFIER_REJECTED', 'WebAuthn assertion was rejected');
    if (allowRegistration && existing) throw new PasskeyAuthError('CREDENTIAL_EXISTS', 'passkey credential already exists');
    credentials.set(credential.credentialId, credential);
    return { ...credential, publicKey: credential.publicKey.slice() };
  };
  return {
    credentials: () => [...credentials.values()].map((value) => ({ ...value, publicKey: value.publicKey.slice() })),
    async register(context: PasskeyCeremonyContext, assertion: PasskeyAssertion, publicKey?: Uint8Array) {
      if (context.kind !== 'registration') throw new PasskeyAuthError('INVALID_CONTEXT', 'registration context required');
      return consumeAndVerify(context, assertion, true, publicKey);
    },
    async authenticate(context: PasskeyCeremonyContext, assertion: PasskeyAssertion) {
      if (context.kind !== 'authentication' && context.kind !== 'step-up') throw new PasskeyAuthError('INVALID_CONTEXT', 'authentication context required');
      return consumeAndVerify(context, assertion, false);
    },
    async stepUp(context: PasskeyCeremonyContext, assertion: PasskeyAssertion) {
      if (context.kind !== 'step-up') throw new PasskeyAuthError('INVALID_CONTEXT', 'step-up context required');
      await consumeAndVerify(context, assertion, false);
      return { verified: true as const, account: context.account, did: context.did, challenge: context.challenge };
    },
    async rotate(input: { readonly context: PasskeyCeremonyContext; readonly replacement: PasskeyAssertion; readonly replacementPublicKey?: Uint8Array; readonly oldCredentialId: string }) {
      if (input.context.kind !== 'registration') throw new PasskeyAuthError('INVALID_CONTEXT', 'registration context required for rotation');
      if (!input.oldCredentialId || input.oldCredentialId === input.replacement.credentialId) throw new PasskeyAuthError('ROTATION_REQUIRES_REPLACEMENT', 'a distinct replacement passkey is required');
      const old = credentials.get(input.oldCredentialId);
      if (!old || old.status !== 'active') throw new PasskeyAuthError('CREDENTIAL_NOT_FOUND', 'active old passkey is required');
      const replacement = await consumeAndVerify(input.context, input.replacement, true, input.replacementPublicKey);
      credentials.set(old.credentialId, { ...old, status: 'revoked' });
      return { replacement, account: old.account, did: old.did, revokedCredentialId: old.credentialId };
    },
    remove(input: { readonly credentialId: string; readonly replacementCredentialId: string }) {
      if (!input.replacementCredentialId || input.credentialId === input.replacementCredentialId) throw new PasskeyAuthError('ROTATION_REQUIRES_REPLACEMENT', 'an active replacement passkey is required before removal');
      const replacement = credentials.get(input.replacementCredentialId);
      if (!replacement || replacement.status !== 'active') throw new PasskeyAuthError('CREDENTIAL_NOT_FOUND', 'active replacement passkey is required');
      const old = credentials.get(input.credentialId);
      if (!old) throw new PasskeyAuthError('CREDENTIAL_NOT_FOUND', 'passkey credential was not found');
      credentials.set(input.credentialId, { ...old, status: 'revoked' });
      return { ...old, status: 'revoked' as const };
    },
  };
}

/** Deterministic synthetic fixture. It contains no private key or real identity material. */
export function createDeterministicPasskeyFixture(seed = 'fixture-1') {
  const account = '0x1111111111111111111111111111111111111111' as const;
  const verifierCodeHash = `0x${'22'.repeat(32)}` as `0x${string}`;
  const challenge = `ssw-test-challenge-${seed}`;
  const context = (kind: CeremonyKind, credentialId = 'credential-1'): PasskeyCeremonyContext => ({
    schemaVersion: 1,
    kind,
    challenge,
    origin: 'https://wallet.example',
    rpId: 'wallet.example',
    account,
    did: `did:pkh:eip155:84532:${account}`,
    userVerification: 'required',
    verifierCodeHash,
    issuedAt: 100,
    expiresAt: 200,
    credentialId,
  });
  const assertion = (kind: CeremonyKind, credentialId = 'credential-1'): PasskeyAssertion => ({
    clientDataJSON: new Uint8Array([1, 2]),
    authenticatorData: new Uint8Array([3, 4]),
    signature: new Uint8Array([5, 6]),
    origin: 'https://wallet.example',
    rpId: 'wallet.example',
    challenge,
    account,
    credentialId,
    userVerified: true,
    userVerification: 'required',
    verifierCodeHash,
  });
  return { account, verifierCodeHash, context, assertion };
}
