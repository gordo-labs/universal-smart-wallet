export const appName = 'wallet-web';
export const runtimeBoundary = 'browser adapters only';

export type PasskeyCapability = {
  available: boolean;
  reason: 'available' | 'secure-context-required' | 'webauthn-unsupported';
};

/** Capability smoke check used by the local wallet UI; no credential is created here. */
export function detectPasskeyCapability(
  scope: {
    isSecureContext?: boolean;
    credentials?: { create?: unknown; get?: unknown };
  } = globalThis as typeof globalThis & { credentials?: CredentialsContainer },
): PasskeyCapability {
  if (scope.isSecureContext === false)
    return { available: false, reason: 'secure-context-required' };
  if (
    !scope.credentials ||
    typeof scope.credentials.create !== 'function' ||
    typeof scope.credentials.get !== 'function'
  ) {
    return { available: false, reason: 'webauthn-unsupported' };
  }
  return { available: true, reason: 'available' };
}
