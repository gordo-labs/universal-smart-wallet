import type { InstitutionalAdminPrincipal } from '../lib/institutional-issuer-admin';
import {
  assertFiniteTimestamp,
  authorizeIdentityOperations,
  cloneFreeze,
  IdentityOperationsError,
  redactProviderFailure,
  requireOpaqueId,
} from './security';

export type SignerHealthState = 'healthy' | 'degraded' | 'unavailable' | 'unknown';
export type SignerLifecycleState = 'active' | 'standby' | 'disabled';
export type RotationState = 'requested' | 'ready' | 'succeeded' | 'failed' | 'ambiguous';
export type OpaqueSignerProvider = 'aws-kms' | 'gcp-kms' | 'azure-key-vault' | 'network-hsm' | 'local-development';
export type SignerAlgorithm = 'ES256' | 'EdDSA';

export interface SignerHealth {
  readonly tenantId: string;
  readonly signerId: string;
  readonly provider: OpaqueSignerProvider;
  readonly algorithm: SignerAlgorithm;
  readonly keyVersion: string;
  readonly lifecycle: SignerLifecycleState;
  readonly health: SignerHealthState;
  readonly checkedAt: number;
}

export interface SignerRotationRequest {
  readonly tenantId: string;
  readonly rotationId: string;
  readonly currentSignerId: string;
  readonly currentKeyVersion: string;
  readonly replacementSignerId: string;
  readonly replacementKeyVersion: string;
  readonly state: RotationState;
  readonly requestedBy: string;
  readonly requestedAt: number;
  readonly resolvedAt?: number;
}

export interface RotationResult {
  readonly rotationId: string;
  readonly outcome: 'ready' | 'succeeded' | 'failed' | 'ambiguous';
  readonly observedCurrentKeyVersion: string;
  readonly observedReplacementKeyVersion: string;
  readonly at: number;
}

export interface SignerHealthProvider {
  check(input: Readonly<{ tenantId: string; signerId: string }>): Promise<SignerHealthState> | SignerHealthState;
  rotate(input: Readonly<{ tenantId: string; rotationId: string; replacementSignerId: string }>): Promise<RotationResult> | RotationResult;
}

export class InMemorySignerOperations {
  private readonly health = new Map<string, SignerHealth>();
  private readonly rotations = new Map<string, SignerRotationRequest>();

  setHealth(
    principal: InstitutionalAdminPrincipal,
    value: Omit<SignerHealth, 'tenantId'> & { tenantId: string },
  ): SignerHealth {
    authorizeIdentityOperations(principal, 'issuer:signers:read', value.tenantId);
    requireOpaqueId(value.signerId, 'signerId');
    requireOpaqueId(value.keyVersion, 'keyVersion');
    assertFiniteTimestamp(value.checkedAt, 'checkedAt');
    const health = cloneFreeze({ ...value });
    this.health.set(this.key(value.tenantId, value.signerId), health);
    return health;
  }

  listHealth(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
  ): readonly SignerHealth[] {
    authorizeIdentityOperations(principal, 'issuer:signers:read', tenantId);
    return Object.freeze([...this.health.values()].filter((item) => item.tenantId === tenantId));
  }

  getHealth(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    signerId: string,
  ): SignerHealth {
    authorizeIdentityOperations(principal, 'issuer:signers:read', tenantId);
    const found = this.health.get(this.key(tenantId, requireOpaqueId(signerId, 'signerId')));
    if (!found) throw new IdentityOperationsError('NOT_FOUND', 'Signer health not found');
    return found;
  }

  requestRotation(
    principal: InstitutionalAdminPrincipal,
    input: Readonly<{
      tenantId: string;
      rotationId: string;
      currentSignerId: string;
      currentKeyVersion: string;
      replacementSignerId: string;
      replacementKeyVersion: string;
      requestedAt?: number;
    }>,
  ): SignerRotationRequest {
    authorizeIdentityOperations(principal, 'issuer:signers:rotate', input.tenantId);
    for (const [field, value] of Object.entries(input)) {
      if (field !== 'requestedAt') requireOpaqueId(value, field);
    }
    const requestedAt = assertFiniteTimestamp(input.requestedAt ?? Date.now(), 'requestedAt');
    const existing = this.rotations.get(this.key(input.tenantId, input.rotationId));
    if (existing) {
      const same =
        existing.currentSignerId === input.currentSignerId &&
        existing.currentKeyVersion === input.currentKeyVersion &&
        existing.replacementSignerId === input.replacementSignerId &&
        existing.replacementKeyVersion === input.replacementKeyVersion;
      if (!same) {
        throw new IdentityOperationsError('ROTATION_AMBIGUOUS', 'Rotation request identity is ambiguous');
      }
      return existing;
    }
    const request = cloneFreeze({
      tenantId: input.tenantId,
      rotationId: input.rotationId,
      currentSignerId: input.currentSignerId,
      currentKeyVersion: input.currentKeyVersion,
      replacementSignerId: input.replacementSignerId,
      replacementKeyVersion: input.replacementKeyVersion,
      state: 'requested' as const,
      requestedBy: principal.principalId,
      requestedAt,
    });
    this.rotations.set(this.key(input.tenantId, input.rotationId), request);
    return request;
  }

  recordRotationResult(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    result: RotationResult,
  ): SignerRotationRequest {
    authorizeIdentityOperations(principal, 'issuer:signers:rotate', tenantId);
    const existing = this.rotations.get(this.key(tenantId, requireOpaqueId(result.rotationId, 'rotationId')));
    if (!existing) throw new IdentityOperationsError('NOT_FOUND', 'Rotation request not found');
    assertFiniteTimestamp(result.at, 'rotation result timestamp');
    requireOpaqueId(result.observedCurrentKeyVersion, 'observedCurrentKeyVersion');
    requireOpaqueId(result.observedReplacementKeyVersion, 'observedReplacementKeyVersion');
    if (result.observedCurrentKeyVersion !== existing.currentKeyVersion || result.observedReplacementKeyVersion !== existing.replacementKeyVersion) {
      return this.failClosed(existing, 'ambiguous', result.at);
    }
    if (result.outcome === 'ambiguous') return this.failClosed(existing, 'ambiguous', result.at);
    if (existing.state === 'succeeded' && result.outcome !== 'succeeded') {
      return this.failClosed(existing, 'ambiguous', result.at);
    }
    const next = cloneFreeze({ ...existing, state: result.outcome, resolvedAt: result.outcome === 'ready' ? undefined : result.at });
    this.rotations.set(this.key(tenantId, existing.rotationId), next);
    return next;
  }

  getRotation(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    rotationId: string,
  ): SignerRotationRequest {
    authorizeIdentityOperations(principal, 'issuer:signers:read', tenantId);
    const found = this.rotations.get(this.key(tenantId, requireOpaqueId(rotationId, 'rotationId')));
    if (!found) throw new IdentityOperationsError('NOT_FOUND', 'Rotation request not found');
    return found;
  }

  async checkProvider(
    principal: InstitutionalAdminPrincipal,
    provider: SignerHealthProvider,
    tenantId: string,
    signerId: string,
  ): Promise<SignerHealthState> {
    authorizeIdentityOperations(principal, 'issuer:signers:read', tenantId);
    try {
      const result = await provider.check({ tenantId, signerId });
      if (!['healthy', 'degraded', 'unavailable', 'unknown'].includes(result)) return 'unknown';
      return result;
    } catch (error) {
      void redactProviderFailure(error);
      return 'unknown';
    }
  }

  async rotateWithProvider(
    principal: InstitutionalAdminPrincipal,
    provider: SignerHealthProvider,
    tenantId: string,
    rotationId: string,
  ): Promise<SignerRotationRequest> {
    authorizeIdentityOperations(principal, 'issuer:signers:rotate', tenantId);
    // Do not call the public read method here: a delegated rotation session may
    // intentionally have rotate permission without broad read permission.
    const request = this.findRotation(tenantId, rotationId);
    try {
      const result = await provider.rotate({ tenantId, rotationId, replacementSignerId: request.replacementSignerId });
      return this.recordRotationResult(principal, tenantId, result);
    } catch (error) {
      const ambiguous = this.failClosed(request, 'ambiguous', Date.now());
      void ambiguous;
      throw redactProviderFailure(error);
    }
  }

  private failClosed(current: SignerRotationRequest, state: RotationState, at: number): SignerRotationRequest {
    const next = cloneFreeze({ ...current, state, resolvedAt: at });
    this.rotations.set(this.key(current.tenantId, current.rotationId), next);
    return next;
  }

  private findRotation(tenantId: string, rotationId: string): SignerRotationRequest {
    const found = this.rotations.get(this.key(tenantId, requireOpaqueId(rotationId, 'rotationId')));
    if (!found) throw new IdentityOperationsError('NOT_FOUND', 'Rotation request not found');
    return found;
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}\0${id}`;
  }
}
