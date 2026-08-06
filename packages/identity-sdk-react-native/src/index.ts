/**
 * Framework-neutral native capability ports for the identity wallet.
 *
 * This package intentionally has no React Native or Expo dependency. Native
 * applications adapt their platform APIs to these narrow ports. Secret
 * material is only accepted as bytes by the secure-storage port and is never
 * exposed through a backup/export operation here.
 */

import {
  CredentialScannerError,
  parseCredentialInput,
  type CredentialScanKind,
  type ParsedCredentialScan,
} from '@ssw/credential-scanner';

export const IDENTITY_NATIVE_SCHEMA_VERSION = 1 as const;

export type NativeLifecycleState = 'active' | 'inactive' | 'background';

export type LifecycleEvent = {
  readonly state: NativeLifecycleState;
  readonly at: number;
};

export type LifecyclePort = {
  readonly currentState?: () => NativeLifecycleState;
  readonly subscribe: (listener: (event: LifecycleEvent) => void) => () => void;
};

export type PasskeyCapabilities = {
  readonly passkey: boolean;
  readonly prf: boolean;
  readonly reason?: 'available' | 'unsupported' | 'not-configured';
};

export type PasskeyRequest = {
  readonly challenge: string;
  readonly rpId: string;
  readonly userVerification: 'required';
  readonly credentialId?: string;
  readonly signal: AbortSignal;
};

/** The result is an opaque authenticator response; private key material is not representable. */
export type PasskeyResult = {
  readonly credentialId: string;
  readonly authenticatorData: Uint8Array;
  readonly clientDataJSON: Uint8Array;
  readonly signature: Uint8Array;
  readonly prfOutput?: Uint8Array;
};

export type PasskeyPort = {
  readonly capabilities?: () => Promise<PasskeyCapabilities>;
  readonly register: (input: PasskeyRequest) => Promise<PasskeyResult>;
  readonly authenticate: (input: PasskeyRequest) => Promise<PasskeyResult>;
};

/**
 * Native secure storage is intentionally byte-only. There is no plaintext
 * backup/export method; an application must use the encrypted vault protocol
 * when it needs portability.
 */
export type SecureStoragePort = {
  readonly get: (key: string, options: { readonly signal: AbortSignal }) => Promise<Uint8Array | undefined>;
  readonly set: (key: string, value: Uint8Array, options: { readonly signal: AbortSignal }) => Promise<void>;
  readonly delete: (key: string, options: { readonly signal: AbortSignal }) => Promise<boolean>;
};

export type CameraScanResult = {
  readonly value: string;
  readonly format?: 'qr' | 'data-matrix' | 'unknown';
};

export type CameraPort = {
  readonly scan: (input: {
    readonly signal: AbortSignal;
    readonly formats?: readonly ('qr' | 'data-matrix')[];
  }) => Promise<CameraScanResult>;
  readonly stop?: () => Promise<void> | void;
};

export type AppLinkPort = {
  /** Subscribe only; this port must not navigate or fetch a received link. */
  readonly subscribe: (listener: (link: string) => void) => () => void;
  readonly initialLink?: (options: { readonly signal: AbortSignal }) => Promise<string | undefined>;
};

export type IdentityNativePorts = {
  readonly lifecycle: LifecyclePort;
  readonly passkey: PasskeyPort;
  readonly secureStorage: SecureStoragePort;
  readonly camera: CameraPort;
  readonly appLinks: AppLinkPort;
};

export type MobileErrorCode =
  | 'INVALID_INPUT'
  | 'ABORTED'
  | 'BACKGROUNDED'
  | 'LINK_REJECTED'
  | 'CAPABILITY_UNAVAILABLE'
  | 'OPERATION_FAILED';

/** Stable, redacted error. Raw links, QR values, claims, and secret bytes are never included. */
export class IdentityNativeError extends Error {
  constructor(readonly code: MobileErrorCode, message = 'Native identity operation failed') {
    super(message);
    this.name = 'IdentityNativeError';
  }
}

const fail = (code: MobileErrorCode, message?: string): never => {
  throw new IdentityNativeError(code, message);
};

const isAbortError = (error: unknown): boolean =>
  error instanceof IdentityNativeError && error.code === 'ABORTED';

const abortReason = (signal: AbortSignal): IdentityNativeError => {
  const reason = signal.reason;
  if (reason instanceof IdentityNativeError) return reason;
  return new IdentityNativeError('ABORTED', 'Native identity operation was cancelled');
};

const assertSignal = (signal: AbortSignal): void => {
  if (signal.aborted) throw abortReason(signal);
};

const validStorageKey = (key: string): boolean =>
  typeof key === 'string' && /^[A-Za-z0-9._:-]{1,128}$/u.test(key);

const cloneBytes = (value: Uint8Array): Uint8Array => {
  if (!(value instanceof Uint8Array) || value.byteLength === 0 || value.byteLength > 4 * 1024 * 1024)
    fail('INVALID_INPUT', 'Secure-storage values must be bounded bytes');
  return new Uint8Array(value);
};

type PendingSession = { readonly controller: AbortController; readonly cleanup: () => void };

/**
 * Orchestrates native ports while enforcing a single lifecycle rule: all
 * sensitive work is cancelled when the app backgrounds. Adapter methods never
 * navigate, fetch, log, or persist plaintext secrets.
 */
export class IdentityNativeAdapter {
  private readonly pending = new Set<PendingSession>();
  private readonly unsubscribeLifecycle: () => void;
  private lifecycleState: NativeLifecycleState;

  constructor(private readonly ports: IdentityNativePorts, now: () => number = () => Date.now()) {
    this.lifecycleState = ports.lifecycle.currentState?.() ?? 'active';
    this.unsubscribeLifecycle = ports.lifecycle.subscribe((event) => {
      this.lifecycleState = event.state;
      if (event.state === 'background') this.cancelSensitive('background');
    });
    // Keep the clock in the constructor signature so native adapters can
    // inject deterministic lifecycle timestamps without exposing them in APIs.
    void now;
  }

  /** Release the lifecycle listener and cancel all in-flight sensitive work. */
  dispose(): void {
    this.unsubscribeLifecycle();
    this.cancelSensitive('dispose');
  }

  get state(): NativeLifecycleState {
    return this.lifecycleState;
  }

  async capabilities(): Promise<PasskeyCapabilities> {
    if (!this.ports.passkey.capabilities)
      return { passkey: true, prf: false, reason: 'not-configured' };
    return this.ports.passkey.capabilities();
  }

  registerPasskey(input: Omit<PasskeyRequest, 'signal'>, options: { readonly signal?: AbortSignal } = {}): Promise<PasskeyResult> {
    return this.runSensitive((signal) => this.ports.passkey.register({ ...input, signal }), options.signal);
  }

  authenticatePasskey(input: Omit<PasskeyRequest, 'signal'>, options: { readonly signal?: AbortSignal } = {}): Promise<PasskeyResult> {
    return this.runSensitive((signal) => this.ports.passkey.authenticate({ ...input, signal }), options.signal);
  }

  async readSecret(key: string, options: { readonly signal?: AbortSignal } = {}): Promise<Uint8Array | undefined> {
    this.assertStorageKey(key);
    const value = await this.runSensitive((signal) => this.ports.secureStorage.get(key, { signal }), options.signal);
    return value === undefined ? undefined : cloneBytes(value);
  }

  writeSecret(key: string, value: Uint8Array, options: { readonly signal?: AbortSignal } = {}): Promise<void> {
    this.assertStorageKey(key);
    const copy = cloneBytes(value);
    return this.runSensitive((signal) => this.ports.secureStorage.set(key, copy, { signal }), options.signal);
  }

  deleteSecret(key: string, options: { readonly signal?: AbortSignal } = {}): Promise<boolean> {
    this.assertStorageKey(key);
    return this.runSensitive((signal) => this.ports.secureStorage.delete(key, { signal }), options.signal);
  }

  scanCamera(options: { readonly signal?: AbortSignal; readonly formats?: readonly ('qr' | 'data-matrix')[] } = {}): Promise<CameraScanResult> {
    return this.runSensitive(async (signal) => {
      try {
        return await this.ports.camera.scan({ signal, formats: options.formats });
      } finally {
        await this.ports.camera.stop?.();
      }
    }, options.signal);
  }

  /** Wait for and parse one bounded credential app/deep link; no navigation occurs. */
  waitForCredentialLink(options: {
    readonly signal?: AbortSignal;
    readonly expectedKind?: CredentialScanKind;
  } = {}): Promise<ParsedCredentialScan> {
    return this.runSensitive((signal) => this.waitForLink(signal, options.expectedKind), options.signal);
  }

  private assertStorageKey(key: string): void {
    if (!validStorageKey(key)) fail('INVALID_INPUT', 'Secure-storage key is invalid');
  }

  private cancelSensitive(reason: 'background' | 'dispose'): void {
    const error = new IdentityNativeError(reason === 'background' ? 'BACKGROUNDED' : 'ABORTED', reason === 'background' ? 'Sensitive operation cancelled in background' : 'Native identity adapter disposed');
    for (const session of [...this.pending]) session.controller.abort(error);
  }

  private runSensitive<T>(operation: (signal: AbortSignal) => Promise<T>, external?: AbortSignal): Promise<T> {
    if (this.lifecycleState === 'background') return Promise.reject(new IdentityNativeError('BACKGROUNDED', 'Sensitive operation is unavailable in background'));
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort(external?.reason ?? new IdentityNativeError('ABORTED'));
    if (external) {
      if (external.aborted) return Promise.reject(abortReason(external));
      external.addEventListener('abort', onExternalAbort, { once: true });
    }
    const cleanup = () => external?.removeEventListener('abort', onExternalAbort);
    const session = { controller, cleanup };
    this.pending.add(session);
    const cancellation = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => reject(abortReason(controller.signal)), { once: true });
    });
    const task = Promise.resolve().then(() => operation(controller.signal));
    return Promise.race([task, cancellation]).then(
      (value) => {
        assertSignal(controller.signal);
        return value;
      },
      (error: unknown) => {
        if (controller.signal.aborted) throw abortReason(controller.signal);
        if (isAbortError(error)) throw error;
        throw error instanceof IdentityNativeError ? error : new IdentityNativeError('OPERATION_FAILED');
      },
    ).finally(() => {
      cleanup();
      this.pending.delete(session);
    });
  }

  private waitForLink(signal: AbortSignal, expectedKind?: CredentialScanKind): Promise<ParsedCredentialScan> {
    return new Promise<ParsedCredentialScan>((resolve, reject) => {
      let unsubscribe: (() => void) | undefined;
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        unsubscribe?.();
        signal.removeEventListener('abort', onAbort);
        callback();
      };
      const onAbort = () => finish(() => reject(abortReason(signal)));
      const onLink = (link: string) => {
        try {
          assertSignal(signal);
          const parsed = parseCredentialInput(link);
          if (expectedKind !== undefined && parsed.kind !== expectedKind)
            throw new CredentialScannerError('UNKNOWN_SCHEME');
          finish(() => resolve(parsed));
        } catch {
          finish(() => reject(new IdentityNativeError('LINK_REJECTED', 'Credential link was rejected')));
        }
      };
      signal.addEventListener('abort', onAbort, { once: true });
      unsubscribe = this.ports.appLinks.subscribe(onLink);
      if (this.ports.appLinks.initialLink) {
        void this.ports.appLinks.initialLink({ signal }).then((link) => {
          if (link !== undefined) onLink(link);
        }).catch(() => {
          if (!signal.aborted) finish(() => reject(new IdentityNativeError('OPERATION_FAILED')));
        });
      }
      if (signal.aborted) onAbort();
    });
  }
}

export const createIdentityNativeAdapter = (ports: IdentityNativePorts): IdentityNativeAdapter =>
  new IdentityNativeAdapter(ports);
