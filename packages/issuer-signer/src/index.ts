/**
 * Provider-neutral institutional issuer signing boundary.
 *
 * Production private keys belong in a KMS/HSM and never cross IssuerSignerPort.
 * Provider credentials, key generation, and key export are intentionally absent.
 */

declare const issuerKeyRefBrand: unique symbol;

export type IssuerKeyRef = string & {
  readonly [issuerKeyRefBrand]: 'IssuerKeyRef';
};

export type IssuerSigningAlgorithm = 'ES256' | 'EdDSA';
export type IssuerKeyStatus = 'active' | 'standby' | 'rotated' | 'disabled';
export type IssuerOperation = 'sign' | 'rotate' | 'disable';
export type Digest = `sha256:${string}`;

export interface IssuerKeyDescriptor {
  readonly keyRef: IssuerKeyRef;
  readonly algorithm: IssuerSigningAlgorithm;
  readonly status: IssuerKeyStatus;
  readonly version: string;
}

export interface IssuerSignRequest {
  readonly requestId: string;
  readonly tenantId: string;
  readonly keyRef: IssuerKeyRef;
  readonly algorithm: IssuerSigningAlgorithm;
  readonly payload: Uint8Array;
  readonly at: number;
}

export interface IssuerSignature {
  readonly requestId: string;
  readonly keyRef: IssuerKeyRef;
  readonly keyVersion: string;
  readonly algorithm: IssuerSigningAlgorithm;
  readonly signature: Uint8Array;
}

export interface RotateIssuerKeyRequest {
  readonly requestId: string;
  readonly tenantId: string;
  readonly currentKeyRef: IssuerKeyRef;
  readonly nextKeyRef: IssuerKeyRef;
  readonly at: number;
}

export interface DisableIssuerKeyRequest {
  readonly requestId: string;
  readonly tenantId: string;
  readonly keyRef: IssuerKeyRef;
  readonly at: number;
}

export interface IssuerKeyRotationReceipt {
  readonly requestId: string;
  readonly previousKeyRef: IssuerKeyRef;
  readonly activeKeyRef: IssuerKeyRef;
  readonly activeVersion: string;
}

/** The application-facing port contains opaque references and public metadata only. */
export interface IssuerSignerPort {
  describeKey(keyRef: IssuerKeyRef): Promise<IssuerKeyDescriptor | undefined>;
  sign(request: IssuerSignRequest): Promise<IssuerSignature>;
  rotate(request: RotateIssuerKeyRequest): Promise<IssuerKeyRotationReceipt>;
  disable(request: DisableIssuerKeyRequest): Promise<void>;
}

export type KmsHsmRejectionCode =
  | 'KEY_NOT_FOUND'
  | 'KEY_NOT_ACTIVE'
  | 'KEY_DISABLED'
  | 'ALGORITHM_MISMATCH'
  | 'PROVIDER_REJECTED';

export type KmsHsmSignResult =
  | {
      readonly status: 'signed';
      readonly signature: Uint8Array;
      readonly algorithm: IssuerSigningAlgorithm;
      readonly keyVersion: string;
    }
  | { readonly status: 'rejected'; readonly reasonCode: KmsHsmRejectionCode }
  | { readonly status: 'ambiguous' };

export type KmsHsmMutationResult =
  | { readonly status: 'completed' }
  | { readonly status: 'rejected'; readonly reasonCode: KmsHsmRejectionCode }
  | { readonly status: 'ambiguous' };

/**
 * Contract implemented by a cloud KMS, network HSM, Vault, or development
 * adapter. Implementations MUST check key state again inside every mutation;
 * the preceding describe call is not an authorization decision.
 *
 * Methods are single-attempt operations. An implementation reports an unknown
 * provider outcome as `ambiguous`; callers must reconcile out of band and must
 * not call the operation again with a new identifier.
 */
export interface KmsHsmAdapter {
  describeKey(keyRef: IssuerKeyRef): Promise<IssuerKeyDescriptor | undefined>;
  sign(input: {
    readonly operationId: string;
    readonly keyRef: IssuerKeyRef;
    readonly algorithm: IssuerSigningAlgorithm;
    readonly payload: Uint8Array;
  }): Promise<KmsHsmSignResult>;
  rotate(input: {
    readonly operationId: string;
    readonly currentKeyRef: IssuerKeyRef;
    readonly nextKeyRef: IssuerKeyRef;
  }): Promise<KmsHsmMutationResult>;
  disable(input: {
    readonly operationId: string;
    readonly keyRef: IssuerKeyRef;
  }): Promise<KmsHsmMutationResult>;
}

export interface ApprovalContext {
  readonly requestId: string;
  readonly tenantId: string;
  readonly operation: IssuerOperation;
  readonly bindingDigest: Digest;
  readonly at: number;
}

export interface ApprovalEvidence {
  readonly approvalId: string;
  readonly approverId: string;
  readonly requestId: string;
  readonly tenantId: string;
  readonly operation: IssuerOperation;
  readonly bindingDigest: Digest;
  readonly approvedAt: number;
  readonly expiresAt: number;
}

/** Returns already-authenticated approval records bound to the exact context. */
export interface DualApprovalPort {
  approvalsFor(context: ApprovalContext): Promise<readonly ApprovalEvidence[]>;
}

export type OperationOutcome =
  | 'signed'
  | 'completed'
  | 'rejected'
  | 'ambiguous';

export interface IssuerOperationStore {
  /** Atomic reservation. `unresolved-operation` blocks a new ID after ambiguity. */
  reserve(input: {
    readonly requestId: string;
    readonly operation: IssuerOperation;
    readonly operationFingerprint: Digest;
  }): Promise<'reserved' | 'duplicate-request' | 'unresolved-operation'>;
  finish(requestId: string, outcome: OperationOutcome): Promise<void>;
}

export type IssuerSignerErrorCode =
  | 'INVALID_REQUEST'
  | 'KEY_NOT_FOUND'
  | 'KEY_NOT_ACTIVE'
  | 'KEY_DISABLED'
  | 'ALGORITHM_MISMATCH'
  | 'DUAL_APPROVAL_REQUIRED'
  | 'APPROVAL_INVALID'
  | 'APPROVAL_UNAVAILABLE'
  | 'REQUEST_ALREADY_USED'
  | 'PROVIDER_REJECTED'
  | 'PROVIDER_UNAVAILABLE'
  | 'SIGNING_RESULT_AMBIGUOUS'
  | 'OPERATION_RESULT_AMBIGUOUS'
  | 'AUDIT_UNAVAILABLE';

export interface IssuerSignerAuditEvent {
  readonly schemaVersion: 1;
  readonly eventId: string;
  readonly tenantId: string;
  readonly requestId: string;
  readonly operation: IssuerOperation;
  readonly outcome: 'accepted' | 'rejected' | 'ambiguous';
  readonly reasonCode:
    | IssuerSignerErrorCode
    | 'SIGNED'
    | 'ROTATED'
    | 'DISABLED';
  readonly createdAt: number;
}

/** Audit events intentionally exclude payloads, signatures, keys, and provider errors. */
export interface IssuerSignerAuditPort {
  append(event: IssuerSignerAuditEvent): Promise<void>;
}

export class IssuerSignerError extends Error {
  readonly code: IssuerSignerErrorCode;

  constructor(code: IssuerSignerErrorCode, message = 'issuer signing denied') {
    super(message);
    this.name = 'IssuerSignerError';
    this.code = code;
  }
}

type StoredOperation = {
  readonly fingerprint: Digest;
  outcome: OperationOutcome | 'pending';
};

/** Deterministic local store. Production services must provide durable storage. */
export class InMemoryIssuerOperationStore implements IssuerOperationStore {
  private readonly operations = new Map<string, StoredOperation>();
  private readonly unresolved = new Map<Digest, string>();

  async reserve(input: {
    readonly requestId: string;
    readonly operation: IssuerOperation;
    readonly operationFingerprint: Digest;
  }): Promise<'reserved' | 'duplicate-request' | 'unresolved-operation'> {
    if (this.operations.has(input.requestId)) return 'duplicate-request';
    if (this.unresolved.has(input.operationFingerprint))
      return 'unresolved-operation';
    this.operations.set(input.requestId, {
      fingerprint: input.operationFingerprint,
      outcome: 'pending',
    });
    this.unresolved.set(input.operationFingerprint, input.requestId);
    return 'reserved';
  }

  async finish(requestId: string, outcome: OperationOutcome): Promise<void> {
    const operation = this.operations.get(requestId);
    if (!operation) throw new Error('operation was not reserved');
    operation.outcome = outcome;
    if (outcome !== 'ambiguous') this.unresolved.delete(operation.fingerprint);
  }
}

const MAX_PAYLOAD_BYTES = 1_048_576;
const MAX_SIGNATURE_BYTES = 8_192;
const idPattern = /^[A-Za-z0-9._:-]{1,128}$/u;
const keyRefPattern = /^[A-Za-z0-9._:/=@+-]{3,256}$/u;
const digestPattern = /^sha256:[0-9a-f]{64}$/u;

const fail = (code: IssuerSignerErrorCode): never => {
  throw new IssuerSignerError(code);
};

const safeId = (value: unknown): string => {
  if (typeof value !== 'string' || !idPattern.test(value))
    fail('INVALID_REQUEST');
  return value as string;
};

const safeTime = (value: unknown): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    fail('INVALID_REQUEST');
  return value as number;
};

const ensureKeyRef = (value: unknown): IssuerKeyRef => {
  if (
    typeof value !== 'string' ||
    !keyRefPattern.test(value) ||
    value.startsWith('{') ||
    value.includes('-----BEGIN')
  )
    fail('INVALID_REQUEST');
  return value as IssuerKeyRef;
};

export function opaqueIssuerKeyRef(value: string): IssuerKeyRef {
  return ensureKeyRef(value);
}

const ensureAlgorithm = (value: unknown): IssuerSigningAlgorithm => {
  if (value !== 'ES256' && value !== 'EdDSA') fail('INVALID_REQUEST');
  return value as IssuerSigningAlgorithm;
};

const ensurePayload = (value: unknown): Uint8Array => {
  if (
    !(value instanceof Uint8Array) ||
    value.byteLength === 0 ||
    value.byteLength > MAX_PAYLOAD_BYTES
  )
    fail('INVALID_REQUEST');
  return Uint8Array.from(value as Uint8Array);
};

const digest = async (value: Uint8Array | string): Promise<Digest> => {
  const bytes =
    typeof value === 'string'
      ? new TextEncoder().encode(value)
      : Uint8Array.from(value);
  const hash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer),
  );
  return `sha256:${Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
};

const ensureDescriptor = (
  descriptor: IssuerKeyDescriptor,
  expectedRef: IssuerKeyRef,
): IssuerKeyDescriptor => {
  if (
    ensureKeyRef(descriptor.keyRef) !== expectedRef ||
    !['active', 'standby', 'rotated', 'disabled'].includes(descriptor.status) ||
    !idPattern.test(descriptor.version)
  )
    fail('PROVIDER_REJECTED');
  ensureAlgorithm(descriptor.algorithm);
  return descriptor;
};

const providerCode = (code: KmsHsmRejectionCode): IssuerSignerErrorCode => {
  switch (code) {
    case 'KEY_NOT_FOUND':
    case 'KEY_NOT_ACTIVE':
    case 'KEY_DISABLED':
    case 'ALGORITHM_MISMATCH':
      return code;
    default:
      return 'PROVIDER_REJECTED';
  }
};

const keyStateCode = (status: IssuerKeyStatus): IssuerSignerErrorCode =>
  status === 'disabled' ? 'KEY_DISABLED' : 'KEY_NOT_ACTIVE';

const normalizeError = (error: unknown): IssuerSignerError =>
  error instanceof IssuerSignerError
    ? error
    : new IssuerSignerError('PROVIDER_UNAVAILABLE');

export class InstitutionalIssuerSigner implements IssuerSignerPort {
  constructor(
    private readonly adapter: KmsHsmAdapter,
    private readonly approvals: DualApprovalPort,
    private readonly operations: IssuerOperationStore,
    private readonly audit: IssuerSignerAuditPort,
  ) {}

  async describeKey(
    keyRef: IssuerKeyRef,
  ): Promise<IssuerKeyDescriptor | undefined> {
    const ref = ensureKeyRef(keyRef);
    try {
      const descriptor = await this.adapter.describeKey(ref);
      return descriptor ? ensureDescriptor(descriptor, ref) : undefined;
    } catch (error) {
      throw normalizeError(error);
    }
  }

  async sign(request: IssuerSignRequest): Promise<IssuerSignature> {
    const requestId = safeId(request?.requestId);
    const tenantId = safeId(request?.tenantId);
    const keyRef = ensureKeyRef(request?.keyRef);
    const algorithm = ensureAlgorithm(request?.algorithm);
    const payload = ensurePayload(request?.payload);
    const at = safeTime(request?.at);
    const contentDigest = await digest(payload);
    const bindingDigest = await digest(
      `${tenantId}\0sign\0${keyRef}\0${algorithm}\0${contentDigest}`,
    );
    const context = {
      requestId,
      tenantId,
      operation: 'sign',
      bindingDigest,
      at,
    } as const;

    try {
      const key = await this.describeKey(keyRef);
      if (!key) throw new IssuerSignerError('KEY_NOT_FOUND');
      if (key.status !== 'active') fail(keyStateCode(key.status));
      if (key.algorithm !== algorithm) fail('ALGORITHM_MISMATCH');
      await this.requireDualApproval(context);
    } catch (error) {
      const safe = normalizeError(error);
      await this.auditBeforeProvider(context, 'rejected', safe.code);
      throw safe;
    }

    const fingerprint = await digest(
      `sign\0${tenantId}\0${keyRef}\0${contentDigest}`,
    );
    await this.reserve(context, fingerprint);

    const result = await this.invokeSign(context, () =>
      this.adapter.sign({
        operationId: requestId,
        keyRef,
        algorithm,
        payload: Uint8Array.from(payload),
      }),
    );

    if (result.status === 'ambiguous') {
      await this.markAmbiguous(requestId);
      await this.auditAmbiguous(context, 'SIGNING_RESULT_AMBIGUOUS');
      throw new IssuerSignerError('SIGNING_RESULT_AMBIGUOUS');
    }
    if (result.status === 'rejected') {
      const code = providerCode(result.reasonCode);
      try {
        await this.audit.append(this.auditEvent(context, 'rejected', code));
        await this.operations.finish(requestId, 'rejected');
      } catch {
        await this.markAmbiguous(requestId);
        throw new IssuerSignerError('SIGNING_RESULT_AMBIGUOUS');
      }
      throw new IssuerSignerError(code);
    }
    if (
      result.algorithm !== algorithm ||
      !idPattern.test(result.keyVersion) ||
      !(result.signature instanceof Uint8Array) ||
      result.signature.byteLength === 0 ||
      result.signature.byteLength > MAX_SIGNATURE_BYTES
    ) {
      await this.markAmbiguous(requestId);
      await this.auditAmbiguous(context, 'SIGNING_RESULT_AMBIGUOUS');
      throw new IssuerSignerError('SIGNING_RESULT_AMBIGUOUS');
    }

    try {
      await this.audit.append(this.auditEvent(context, 'accepted', 'SIGNED'));
      await this.operations.finish(requestId, 'signed');
    } catch {
      await this.markAmbiguous(requestId);
      throw new IssuerSignerError('SIGNING_RESULT_AMBIGUOUS');
    }
    return {
      requestId,
      keyRef,
      keyVersion: result.keyVersion,
      algorithm,
      signature: Uint8Array.from(result.signature),
    };
  }

  async rotate(
    request: RotateIssuerKeyRequest,
  ): Promise<IssuerKeyRotationReceipt> {
    const requestId = safeId(request?.requestId);
    const tenantId = safeId(request?.tenantId);
    const currentKeyRef = ensureKeyRef(request?.currentKeyRef);
    const nextKeyRef = ensureKeyRef(request?.nextKeyRef);
    const at = safeTime(request?.at);
    if (currentKeyRef === nextKeyRef) fail('INVALID_REQUEST');
    const bindingDigest = await digest(
      `${tenantId}\0rotate\0${currentKeyRef}\0${nextKeyRef}`,
    );
    const context = {
      requestId,
      tenantId,
      operation: 'rotate',
      bindingDigest,
      at,
    } as const;

    try {
      const [current, next] = await Promise.all([
        this.describeKey(currentKeyRef),
        this.describeKey(nextKeyRef),
      ]);
      if (!current || !next) throw new IssuerSignerError('KEY_NOT_FOUND');
      if (current.status !== 'active' || next.status !== 'standby')
        fail('KEY_NOT_ACTIVE');
      if (current.algorithm !== next.algorithm) fail('ALGORITHM_MISMATCH');
      await this.requireDualApproval(context);
    } catch (error) {
      const safe = normalizeError(error);
      await this.auditBeforeProvider(context, 'rejected', safe.code);
      throw safe;
    }

    const fingerprint = await digest(
      `rotate\0${tenantId}\0${currentKeyRef}\0${nextKeyRef}`,
    );
    await this.reserve(context, fingerprint);
    const result = await this.invokeMutation(context, () =>
      this.adapter.rotate({
        operationId: requestId,
        currentKeyRef,
        nextKeyRef,
      }),
    );
    if (result.status === 'rejected')
      return this.rejectMutation(context, providerCode(result.reasonCode));
    if (result.status === 'ambiguous') return this.ambiguousMutation(context);

    let next: IssuerKeyDescriptor | undefined;
    try {
      next = await this.describeKey(nextKeyRef);
      const previous = await this.describeKey(currentKeyRef);
      if (!next || next.status !== 'active' || previous?.status === 'active')
        return this.ambiguousMutation(context);
    } catch {
      return this.ambiguousMutation(context);
    }
    await this.completeMutation(context, 'ROTATED');
    return {
      requestId,
      previousKeyRef: currentKeyRef,
      activeKeyRef: nextKeyRef,
      activeVersion: next.version,
    };
  }

  async disable(request: DisableIssuerKeyRequest): Promise<void> {
    const requestId = safeId(request?.requestId);
    const tenantId = safeId(request?.tenantId);
    const keyRef = ensureKeyRef(request?.keyRef);
    const at = safeTime(request?.at);
    const bindingDigest = await digest(`${tenantId}\0disable\0${keyRef}`);
    const context = {
      requestId,
      tenantId,
      operation: 'disable',
      bindingDigest,
      at,
    } as const;

    try {
      const key = await this.describeKey(keyRef);
      if (!key) throw new IssuerSignerError('KEY_NOT_FOUND');
      if (key.status === 'disabled') fail('KEY_DISABLED');
      await this.requireDualApproval(context);
    } catch (error) {
      const safe = normalizeError(error);
      await this.auditBeforeProvider(context, 'rejected', safe.code);
      throw safe;
    }

    const fingerprint = await digest(`disable\0${tenantId}\0${keyRef}`);
    await this.reserve(context, fingerprint);
    const result = await this.invokeMutation(context, () =>
      this.adapter.disable({ operationId: requestId, keyRef }),
    );
    if (result.status === 'rejected')
      return this.rejectMutation(context, providerCode(result.reasonCode));
    if (result.status === 'ambiguous') return this.ambiguousMutation(context);
    try {
      const disabled = await this.describeKey(keyRef);
      if (!disabled || disabled.status !== 'disabled')
        return this.ambiguousMutation(context);
    } catch {
      return this.ambiguousMutation(context);
    }
    await this.completeMutation(context, 'DISABLED');
  }

  private async requireDualApproval(context: ApprovalContext): Promise<void> {
    let evidence: readonly ApprovalEvidence[] = [];
    try {
      evidence = await this.approvals.approvalsFor(context);
    } catch {
      throw new IssuerSignerError('APPROVAL_UNAVAILABLE');
    }
    if (!Array.isArray(evidence) || evidence.length < 2)
      fail('DUAL_APPROVAL_REQUIRED');
    const approvalIds = new Set<string>();
    const approvers = new Set<string>();
    for (const approval of evidence) {
      if (
        !approval ||
        !idPattern.test(approval.approvalId) ||
        !idPattern.test(approval.approverId) ||
        approval.requestId !== context.requestId ||
        approval.tenantId !== context.tenantId ||
        approval.operation !== context.operation ||
        approval.bindingDigest !== context.bindingDigest ||
        !digestPattern.test(approval.bindingDigest) ||
        !Number.isSafeInteger(approval.approvedAt) ||
        !Number.isSafeInteger(approval.expiresAt) ||
        approval.approvedAt > context.at ||
        approval.expiresAt <= context.at ||
        approval.expiresAt <= approval.approvedAt
      )
        fail('APPROVAL_INVALID');
      approvalIds.add(approval.approvalId);
      approvers.add(approval.approverId);
    }
    if (approvalIds.size < 2 || approvers.size < 2)
      fail('DUAL_APPROVAL_REQUIRED');
  }

  private async reserve(
    context: ApprovalContext,
    fingerprint: Digest,
  ): Promise<void> {
    let reservation: Awaited<ReturnType<IssuerOperationStore['reserve']>> =
      'duplicate-request';
    try {
      reservation = await this.operations.reserve({
        requestId: context.requestId,
        operation: context.operation,
        operationFingerprint: fingerprint,
      });
    } catch {
      throw new IssuerSignerError('PROVIDER_UNAVAILABLE');
    }
    if (reservation !== 'reserved') fail('REQUEST_ALREADY_USED');
  }

  private async invokeMutation(
    context: ApprovalContext,
    invoke: () => Promise<KmsHsmMutationResult>,
  ): Promise<KmsHsmMutationResult> {
    try {
      return await invoke();
    } catch {
      return this.ambiguousMutation(context);
    }
  }

  private async invokeSign(
    context: ApprovalContext,
    invoke: () => Promise<KmsHsmSignResult>,
  ): Promise<KmsHsmSignResult> {
    try {
      return await invoke();
    } catch {
      await this.markAmbiguous(context.requestId);
      await this.auditAmbiguous(context, 'SIGNING_RESULT_AMBIGUOUS');
      throw new IssuerSignerError('SIGNING_RESULT_AMBIGUOUS');
    }
  }

  private async rejectMutation(
    context: ApprovalContext,
    code: IssuerSignerErrorCode,
  ): Promise<never> {
    try {
      await this.audit.append(this.auditEvent(context, 'rejected', code));
      await this.operations.finish(context.requestId, 'rejected');
    } catch {
      return this.ambiguousMutation(context);
    }
    throw new IssuerSignerError(code);
  }

  private async completeMutation(
    context: ApprovalContext,
    reasonCode: 'ROTATED' | 'DISABLED',
  ): Promise<void> {
    try {
      await this.audit.append(this.auditEvent(context, 'accepted', reasonCode));
      await this.operations.finish(context.requestId, 'completed');
    } catch {
      return this.ambiguousMutation(context);
    }
  }

  private async ambiguousMutation(context: ApprovalContext): Promise<never> {
    await this.markAmbiguous(context.requestId);
    await this.auditAmbiguous(context, 'OPERATION_RESULT_AMBIGUOUS');
    throw new IssuerSignerError('OPERATION_RESULT_AMBIGUOUS');
  }

  private async markAmbiguous(requestId: string): Promise<void> {
    try {
      await this.operations.finish(requestId, 'ambiguous');
    } catch {
      // The original reservation remains pending and therefore retry-blocking.
    }
  }

  private auditEvent(
    context: ApprovalContext,
    outcome: IssuerSignerAuditEvent['outcome'],
    reasonCode: IssuerSignerAuditEvent['reasonCode'],
  ): IssuerSignerAuditEvent {
    return {
      schemaVersion: 1,
      eventId: `${context.requestId}:${context.operation}:${outcome}`,
      tenantId: context.tenantId,
      requestId: context.requestId,
      operation: context.operation,
      outcome,
      reasonCode,
      createdAt: context.at,
    };
  }

  private async auditBeforeProvider(
    context: ApprovalContext,
    outcome: 'rejected',
    reasonCode: IssuerSignerErrorCode,
  ): Promise<void> {
    try {
      await this.audit.append(this.auditEvent(context, outcome, reasonCode));
    } catch {
      fail('AUDIT_UNAVAILABLE');
    }
  }

  private async auditAmbiguous(
    context: ApprovalContext,
    reasonCode: 'SIGNING_RESULT_AMBIGUOUS' | 'OPERATION_RESULT_AMBIGUOUS',
  ): Promise<void> {
    try {
      await this.audit.append(
        this.auditEvent(context, 'ambiguous', reasonCode),
      );
    } catch {
      // Never include provider errors, inputs, signatures, or secrets in fallback logs.
    }
  }
}

export const UNSAFE_LOCAL_DEVELOPMENT_WARNING =
  'UNSAFE_LOCAL_DEVELOPMENT_ONLY: keys are held in application memory; never use for production credentials';

export interface UnsafeLocalDevelopmentKey {
  readonly keyRef: IssuerKeyRef;
  readonly version: string;
  readonly algorithm: IssuerSigningAlgorithm;
  readonly status: 'active' | 'standby' | 'disabled';
  readonly privateKey: CryptoKey;
}

/**
 * UNSAFE local fixture adapter. This is not a KMS/HSM and provides no custody,
 * access-control, durability, or audit guarantees. It accepts only WebCrypto
 * private keys marked non-extractable and never exposes them after construction.
 */
export class UnsafeLocalDevelopmentKmsAdapter implements KmsHsmAdapter {
  readonly safety = UNSAFE_LOCAL_DEVELOPMENT_WARNING;
  private readonly keys = new Map<
    IssuerKeyRef,
    Omit<UnsafeLocalDevelopmentKey, 'status'> & { status: IssuerKeyStatus }
  >();

  constructor(input: {
    readonly acknowledgeUnsafeLocalDevelopment: true;
    readonly keys: readonly UnsafeLocalDevelopmentKey[];
  }) {
    if (input?.acknowledgeUnsafeLocalDevelopment !== true)
      throw new Error(UNSAFE_LOCAL_DEVELOPMENT_WARNING);
    if (!Array.isArray(input.keys) || input.keys.length === 0)
      throw new Error(UNSAFE_LOCAL_DEVELOPMENT_WARNING);
    for (const key of input.keys) {
      const keyRef = ensureKeyRef(key.keyRef);
      if (
        this.keys.has(keyRef) ||
        !idPattern.test(key.version) ||
        key.privateKey?.type !== 'private' ||
        key.privateKey.extractable
      )
        throw new Error(UNSAFE_LOCAL_DEVELOPMENT_WARNING);
      ensureAlgorithm(key.algorithm);
      this.keys.set(keyRef, { ...key, keyRef });
    }
  }

  async describeKey(
    keyRef: IssuerKeyRef,
  ): Promise<IssuerKeyDescriptor | undefined> {
    const entry = this.keys.get(ensureKeyRef(keyRef));
    if (!entry) return undefined;
    return {
      keyRef: entry.keyRef,
      version: entry.version,
      algorithm: entry.algorithm,
      status: entry.status,
    };
  }

  async sign(input: {
    readonly operationId: string;
    readonly keyRef: IssuerKeyRef;
    readonly algorithm: IssuerSigningAlgorithm;
    readonly payload: Uint8Array;
  }): Promise<KmsHsmSignResult> {
    safeId(input.operationId);
    const entry = this.keys.get(ensureKeyRef(input.keyRef));
    if (!entry) return { status: 'rejected', reasonCode: 'KEY_NOT_FOUND' };
    if (entry.status === 'disabled')
      return { status: 'rejected', reasonCode: 'KEY_DISABLED' };
    if (entry.status !== 'active')
      return { status: 'rejected', reasonCode: 'KEY_NOT_ACTIVE' };
    if (entry.algorithm !== ensureAlgorithm(input.algorithm))
      return { status: 'rejected', reasonCode: 'ALGORITHM_MISMATCH' };
    const payload = ensurePayload(input.payload);
    try {
      const algorithm: EcdsaParams | AlgorithmIdentifier =
        entry.algorithm === 'ES256'
          ? { name: 'ECDSA', hash: 'SHA-256' }
          : { name: 'Ed25519' };
      const signature = new Uint8Array(
        await crypto.subtle.sign(
          algorithm,
          entry.privateKey,
          payload.buffer as ArrayBuffer,
        ),
      );
      return {
        status: 'signed',
        signature,
        algorithm: entry.algorithm,
        keyVersion: entry.version,
      };
    } catch {
      return { status: 'ambiguous' };
    }
  }

  async rotate(input: {
    readonly operationId: string;
    readonly currentKeyRef: IssuerKeyRef;
    readonly nextKeyRef: IssuerKeyRef;
  }): Promise<KmsHsmMutationResult> {
    safeId(input.operationId);
    const current = this.keys.get(ensureKeyRef(input.currentKeyRef));
    const next = this.keys.get(ensureKeyRef(input.nextKeyRef));
    if (!current || !next)
      return { status: 'rejected', reasonCode: 'KEY_NOT_FOUND' };
    if (current.status === 'disabled' || next.status === 'disabled')
      return { status: 'rejected', reasonCode: 'KEY_DISABLED' };
    if (current.status !== 'active' || next.status !== 'standby')
      return { status: 'rejected', reasonCode: 'KEY_NOT_ACTIVE' };
    if (current.algorithm !== next.algorithm)
      return { status: 'rejected', reasonCode: 'ALGORITHM_MISMATCH' };
    current.status = 'rotated';
    next.status = 'active';
    return { status: 'completed' };
  }

  async disable(input: {
    readonly operationId: string;
    readonly keyRef: IssuerKeyRef;
  }): Promise<KmsHsmMutationResult> {
    safeId(input.operationId);
    const key = this.keys.get(ensureKeyRef(input.keyRef));
    if (!key) return { status: 'rejected', reasonCode: 'KEY_NOT_FOUND' };
    if (key.status === 'disabled')
      return { status: 'rejected', reasonCode: 'KEY_DISABLED' };
    key.status = 'disabled';
    return { status: 'completed' };
  }
}

/**
 * Convenience IssuerSignerPort for local fixtures. The mandatory acknowledgement
 * and warning make the unsafe custody boundary visible at construction and runtime.
 */
export class UnsafeLocalDevelopmentIssuerSigner extends InstitutionalIssuerSigner {
  readonly safety = UNSAFE_LOCAL_DEVELOPMENT_WARNING;

  constructor(input: {
    readonly acknowledgeUnsafeLocalDevelopment: true;
    readonly keys: readonly UnsafeLocalDevelopmentKey[];
    readonly approvals: DualApprovalPort;
    readonly audit: IssuerSignerAuditPort;
    readonly operations?: IssuerOperationStore;
  }) {
    super(
      new UnsafeLocalDevelopmentKmsAdapter({
        acknowledgeUnsafeLocalDevelopment:
          input.acknowledgeUnsafeLocalDevelopment,
        keys: input.keys,
      }),
      input.approvals,
      input.operations ?? new InMemoryIssuerOperationStore(),
      input.audit,
    );
  }
}
