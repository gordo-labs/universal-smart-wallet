import type { InstitutionalAdminPrincipal } from '../lib/institutional-issuer-admin';
import {
  assertFiniteTimestamp,
  authorizeIdentityOperations,
  cloneFreeze,
  IdentityOperationsError,
  requireOpaqueId,
} from './security';

export type ConfiguredTrust = 'trusted' | 'untrusted' | 'revoked';
export type EffectiveTrust = ConfiguredTrust | 'unknown' | 'stale';

export interface TrustStatusRecord {
  readonly tenantId: string;
  readonly authorityId: string;
  readonly profileId: string;
  readonly configured: ConfiguredTrust;
  readonly effective: EffectiveTrust;
  readonly active: boolean;
  readonly version: string;
  readonly observedAt: number;
  readonly expiresAt?: number;
  readonly note?: string;
}

export interface TrustStatusInput {
  readonly authorityId: string;
  readonly profileId: string;
  readonly configured: ConfiguredTrust;
  readonly version: string;
  readonly observedAt: number;
  readonly expiresAt?: number;
  readonly note?: string;
}

export class InMemoryTrustStatusStore {
  private readonly records = new Map<string, TrustStatusRecord>();

  upsert(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    input: TrustStatusInput,
    now = Date.now(),
    maxAgeMs = 86_400_000,
  ): TrustStatusRecord {
    authorizeIdentityOperations(principal, 'issuer:trust:write', tenantId);
    const normalized = this.validateInput(input);
    const record = this.resolveRecord(tenantId, normalized, now, maxAgeMs);
    this.records.set(this.key(tenantId, input.authorityId, input.profileId), record);
    return record;
  }

  resolve(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    authorityId: string,
    profileId: string,
    now = Date.now(),
    maxAgeMs = 86_400_000,
  ): TrustStatusRecord {
    authorizeIdentityOperations(principal, 'issuer:trust:read', tenantId);
    const key = this.key(tenantId, requireOpaqueId(authorityId, 'authorityId'), requireOpaqueId(profileId, 'profileId'));
    const existing = this.records.get(key);
    if (!existing) {
      return cloneFreeze({
        tenantId,
        authorityId,
        profileId,
        configured: 'untrusted' as const,
        effective: 'unknown' as const,
        active: false,
        version: 'unknown',
        observedAt: 0,
      });
    }
    const refreshed = this.resolveRecord(tenantId, existing, now, maxAgeMs);
    this.records.set(key, refreshed);
    return refreshed;
  }

  list(
    principal: InstitutionalAdminPrincipal,
    tenantId: string,
    now = Date.now(),
    maxAgeMs = 86_400_000,
  ): readonly TrustStatusRecord[] {
    authorizeIdentityOperations(principal, 'issuer:trust:read', tenantId);
    return Object.freeze([...this.records.values()]
      .filter((item) => item.tenantId === tenantId)
      .map((item) => this.resolveRecord(tenantId, item, now, maxAgeMs)));
  }

  private validateInput(input: TrustStatusInput): TrustStatusInput {
    requireOpaqueId(input.authorityId, 'authorityId');
    requireOpaqueId(input.profileId, 'profileId');
    requireOpaqueId(input.version, 'version');
    if (!['trusted', 'untrusted', 'revoked'].includes(input.configured)) {
      throw new IdentityOperationsError('INVALID_REQUEST', 'trust status is invalid');
    }
    assertFiniteTimestamp(input.observedAt, 'observedAt');
    if (input.expiresAt !== undefined) assertFiniteTimestamp(input.expiresAt, 'expiresAt');
    if (input.note !== undefined && (input.note.length > 160 || /(?:email|token|secret|credential|vc|private)/iu.test(input.note))) {
      throw new IdentityOperationsError('SECRET_UNAVAILABLE', 'Trust notes cannot contain sensitive material');
    }
    return input;
  }

  private resolveRecord(
    tenantId: string,
    input: TrustStatusInput | TrustStatusRecord,
    now: number,
    maxAgeMs: number,
  ): TrustStatusRecord {
    assertFiniteTimestamp(now, 'now');
    if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 0) throw new IdentityOperationsError('INVALID_REQUEST', 'maxAgeMs is invalid');
    const stale = input.observedAt === 0 || now < input.observedAt || now - input.observedAt > maxAgeMs || (input.expiresAt !== undefined && now >= input.expiresAt);
    const effective: EffectiveTrust = stale ? 'stale' : input.configured;
    return cloneFreeze({
      tenantId,
      authorityId: input.authorityId,
      profileId: input.profileId,
      configured: input.configured,
      effective,
      active: effective === 'trusted',
      version: input.version,
      observedAt: input.observedAt,
      ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
      ...(input.note === undefined ? {} : { note: input.note }),
    });
  }

  private key(tenantId: string, authorityId: string, profileId: string): string {
    return `${tenantId}\0${authorityId}\0${profileId}`;
  }
}

