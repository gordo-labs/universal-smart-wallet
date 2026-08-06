export type MobilePermission = 'camera' | 'links' | 'secure-storage' | 'passkey';

export type PermissionState = {
  readonly permission: MobilePermission;
  readonly status: 'unknown' | 'granted' | 'denied';
  readonly recoveryMessage?: string;
};

/** Permission failures are represented as recoverable UI state, never secrets. */
export class PermissionRecovery {
  private readonly states = new Map<MobilePermission, PermissionState>();

  mark(permission: MobilePermission, granted: boolean): PermissionState {
    const state: PermissionState = Object.freeze({
      permission,
      status: granted ? 'granted' : 'denied',
      ...(granted ? {} : { recoveryMessage: recoveryMessage(permission) }),
    });
    this.states.set(permission, state);
    return state;
  }

  state(permission: MobilePermission): PermissionState {
    return this.states.get(permission) ?? { permission, status: 'unknown' };
  }

  clear(permission: MobilePermission): void {
    this.states.delete(permission);
  }
}

const recoveryMessage = (permission: MobilePermission): string => {
  if (permission === 'camera') return 'Camera access is denied. Grant camera permission or paste a credential link manually.';
  if (permission === 'links') return 'Link access is unavailable. Paste the credential request from a trusted issuer or verifier.';
  if (permission === 'passkey') return 'Passkey access is unavailable. Try again or use a configured recovery factor.';
  return 'Secure storage is unavailable. Do not continue until protected storage is restored.';
};
