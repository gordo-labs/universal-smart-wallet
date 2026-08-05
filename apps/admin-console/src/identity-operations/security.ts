import type { InstitutionalAdminPrincipal } from '../lib/institutional-issuer-admin';

/** Administrative capabilities owned by the issuer security surface. */
export type IdentityOperationsScope =
  | 'issuer:signers:read'
  | 'issuer:signers:rotate'
  | 'issuer:trust:read'
  | 'issuer:trust:write'
  | 'issuer:audit:read';

const roleScopes: Record<InstitutionalAdminPrincipal['role'], readonly IdentityOperationsScope[]> = {
  'institutional-owner': [
    'issuer:signers:read',
    'issuer:signers:rotate',
    'issuer:trust:read',
    'issuer:trust:write',
    'issuer:audit:read',
  ],
  'institutional-admin': [
    'issuer:signers:read',
    'issuer:signers:rotate',
    'issuer:trust:read',
    'issuer:trust:write',
    'issuer:audit:read',
  ],
  'template-editor': [],
  'template-reviewer': [],
  'security-admin': [
    'issuer:signers:read',
    'issuer:signers:rotate',
    'issuer:trust:read',
    'issuer:trust:write',
    'issuer:audit:read',
  ],
  'institutional-viewer': [
    'issuer:signers:read',
    'issuer:trust:read',
    'issuer:audit:read',
  ],
};

export type IdentityOperationsErrorCode =
  | 'FORBIDDEN'
  | 'TENANT_MISMATCH'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'ROTATION_AMBIGUOUS'
  | 'PROVIDER_ERROR'
  | 'SECRET_UNAVAILABLE';

export class IdentityOperationsError extends Error {
  constructor(readonly code: IdentityOperationsErrorCode, message: string) {
    super(message);
    this.name = 'IdentityOperationsError';
  }
}

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/u;
const secretLikePattern =
  /(-----BEGIN|private[_-]?key|secret|password|token|api[_-]?key|mnemonic|bearer)/iu;
const personalLikePattern = /(?:^[^\s@]+@[^\s@]+\.[^\s@]+$|^\+?[0-9][0-9 .()-]{7,}$)/u;

export const requireOpaqueId = (value: unknown, field: string): string => {
  if (
    typeof value !== 'string' ||
    !idPattern.test(value) ||
    secretLikePattern.test(value) ||
    personalLikePattern.test(value)
  ) {
    throw new IdentityOperationsError('INVALID_REQUEST', `${field} is invalid`);
  }
  return value;
};

export const requireTenant = (tenantId: unknown): string => requireOpaqueId(tenantId, 'tenantId');

export function authorizeIdentityOperations(
  principal: InstitutionalAdminPrincipal,
  scope: IdentityOperationsScope,
  tenantId: string,
): void {
  requireTenant(tenantId);
  if (principal.tenantId !== tenantId) {
    throw new IdentityOperationsError('TENANT_MISMATCH', 'Tenant boundary violation');
  }
  const allowed = roleScopes[principal.role]?.includes(scope) ?? false;
  const delegated =
    principal.scopes === undefined ||
    (principal.scopes as readonly string[]).includes(scope);
  if (!allowed || !delegated) {
    throw new IdentityOperationsError('FORBIDDEN', 'Insufficient issuer security scope');
  }
}

/**
 * Convert provider failures into a bounded message. The original exception is
 * intentionally not retained on the returned error to avoid secret leakage.
 */
export function redactProviderFailure(_error: unknown): IdentityOperationsError {
  return new IdentityOperationsError('PROVIDER_ERROR', 'Issuer security provider request failed');
}

export const assertFiniteTimestamp = (value: unknown, field = 'timestamp'): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new IdentityOperationsError('INVALID_REQUEST', `${field} is invalid`);
  }
  return value as number;
};

export const cloneFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) cloneFreeze(child);
    Object.freeze(value);
  }
  return value;
};
