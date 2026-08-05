import {
  IdentityNativeAdapter,
  IdentityNativeError,
  type PasskeyResult,
} from '@ssw/identity-sdk-react-native';
import {
  createCredentialScannerClient,
  type AcceptedCredentialScan,
  type CredentialScannerClient,
} from '@ssw/identity-sdk/scanner';
import type {
  HolderCredential,
  HolderCredentialClient,
  PresentationRequest,
} from '@ssw/identity-sdk/holder';
import { SingleUseLinkGate } from './link-gate.js';
import { PermissionRecovery, type MobilePermission, type PermissionState } from './permissions.js';

export type MobileWalletStatus = 'ready' | 'backgrounded' | 'disposed';

export type MobileWalletOptions = {
  readonly native: IdentityNativeAdapter;
  readonly holder: HolderCredentialClient;
  readonly scanner?: CredentialScannerClient;
  readonly offline?: {
    /** Delegate to @ssw/credential-scanner/offline without widening this app's import surface. */
    readonly verify: (envelope: string, options: { readonly signal?: AbortSignal }) => Promise<MobileOfflineVerificationResult>;
  };
  readonly now?: () => number;
};

export type InboxItem = {
  readonly id: string;
  readonly kind: 'issuance' | 'presentation' | 'offline';
  readonly receivedAt: number;
  readonly scan: AcceptedCredentialScan;
};

export type CameraFlowResult =
  | { readonly ok: true; readonly item: InboxItem }
  | { readonly ok: false; readonly permission: PermissionState };

/**
 * Composition boundary for the Expo application. Platform code supplies the
 * ports; this controller owns consent, bounded scanning, one-time links and
 * lifecycle cancellation without importing Expo or React Native.
 */
export class MobileWalletController {
  private readonly scanner: CredentialScannerClient;
  private readonly links = new SingleUseLinkGate();
  private readonly permissions = new PermissionRecovery();
  private readonly inbox = new Map<string, InboxItem>();
  private readonly now: () => number;
  private status: MobileWalletStatus = 'ready';

  constructor(private readonly options: MobileWalletOptions) {
    this.scanner = options.scanner ?? createCredentialScannerClient();
    this.now = options.now ?? (() => Date.now());
  }

  get state(): MobileWalletStatus {
    return this.status;
  }

  get inboxItems(): readonly InboxItem[] {
    return Object.freeze([...this.inbox.values()]);
  }

  permission(permission: MobilePermission): PermissionState {
    return this.permissions.state(permission);
  }

  /** Read a passkey response; private key material never crosses this boundary. */
  registerPasskey(input: { readonly challenge: string; readonly rpId: string }): Promise<PasskeyResult> {
    return this.options.native.registerPasskey({ ...input, userVerification: 'required' });
  }

  authenticatePasskey(input: { readonly challenge: string; readonly rpId: string; readonly credentialId?: string }): Promise<PasskeyResult> {
    return this.options.native.authenticatePasskey({ ...input, userVerification: 'required' });
  }

  readProtectedSecret(key: string): Promise<Uint8Array | undefined> {
    return this.options.native.readSecret(key);
  }

  writeProtectedSecret(key: string, value: Uint8Array): Promise<void> {
    return this.options.native.writeSecret(key, value);
  }

  /** Parse, gate and enqueue an issuance/presentation/offline link. */
  receiveLink(link: string): InboxItem {
    if (!this.links.accept(link)) throw new MobileWalletError('LINK_REPLAY', 'Credential link was already consumed');
    let accepted: AcceptedCredentialScan;
    try {
      accepted = this.scanner.accept(link);
    } catch {
      throw new MobileWalletError('LINK_REJECTED', 'Credential link was rejected');
    }
    return this.enqueue(accepted);
  }

  /** Wait for one bounded app/universal link; no navigation or fetching occurs. */
  async waitForLink(expectedKind?: 'issuance' | 'presentation' | 'offline'): Promise<InboxItem> {
    const parsed = await this.options.native.waitForCredentialLink({ expectedKind });
    const raw = parsed.kind === 'issuance'
      ? parsed.credentialOfferUri ?? parsed.credentialOffer
      : parsed.kind === 'presentation'
        ? parsed.requestUri ?? parsed.request
        : parsed.envelope;
    if (!raw) throw new MobileWalletError('LINK_REJECTED', 'Credential link was rejected');
    if (!this.links.accept(raw)) throw new MobileWalletError('LINK_REPLAY', 'Credential link was already consumed');
    return this.enqueue({ schemaVersion: 1, acceptedAt: this.now(), scan: parsed });
  }

  /** Camera denial returns a recovery state; camera work is cancelled on background. */
  async scanCamera(permissionGranted = true): Promise<CameraFlowResult> {
    const permission = this.permissions.mark('camera', permissionGranted);
    if (!permissionGranted) return { ok: false, permission };
    try {
      const scan = await this.options.native.scanCamera({ formats: ['qr'] });
      if (!this.links.accept(scan.value)) throw new MobileWalletError('LINK_REPLAY', 'Credential link was already consumed');
      const item = this.enqueue(this.scanner.accept(scan.value));
      return { ok: true, item };
    } catch (error) {
      if (error instanceof MobileWalletError) throw error;
      throw new MobileWalletError('LINK_REJECTED', 'Scanned credential input was rejected');
    }
  }

  async issue(item: InboxItem, options: { readonly acknowledgeUnknownIssuer?: boolean; readonly signal?: AbortSignal } = {}): Promise<HolderCredential> {
    this.assertKind(item, 'issuance');
    const scan = item.scan.scan;
    if (scan.kind !== 'issuance') throw new MobileWalletError('LINK_REJECTED', 'Issuance offer is unavailable');
    const offer = scan.credentialOffer ?? scan.credentialOfferUri;
    if (!offer) throw new MobileWalletError('LINK_REJECTED', 'Issuance offer is unavailable');
    try {
      return await this.options.holder.acceptOffer(decodeOffer(offer), options);
    } catch {
      throw new MobileWalletError('ISSUANCE_FAILED', 'Credential issuance could not be completed');
    }
  }

  async present(request: PresentationRequest, options: { readonly confirm: boolean; readonly signal?: AbortSignal }): Promise<unknown> {
    if (!options.confirm) throw new MobileWalletError('CONSENT_REQUIRED', 'Explicit presentation consent is required');
    const claims = [...new Set(request.claims)];
    if (claims.length === 0 || !request.consent.accepted || !sameClaims(claims, request.consent.claims))
      throw new MobileWalletError('CONSENT_REQUIRED', 'Exact claim consent is required');
    try {
      return await this.options.holder.present({ ...request, claims, consent: { ...request.consent, claims } }, options);
    } catch {
      throw new MobileWalletError('PRESENTATION_FAILED', 'Presentation could not be completed');
    }
  }

  async verifyOffline(item: InboxItem, options: { readonly signal?: AbortSignal } = {}): Promise<MobileOfflineVerificationResult> {
    this.assertKind(item, 'offline');
    const offline = this.options.offline;
    if (!offline) throw new MobileWalletError('VERIFICATION_UNAVAILABLE', 'Offline verification is not configured');
    const scan = item.scan.scan;
    if (scan.kind !== 'offline') throw new MobileWalletError('LINK_REJECTED', 'Offline envelope is unavailable');
    if (options.signal?.aborted) throw new MobileWalletError('VERIFICATION_UNAVAILABLE', 'Verification was cancelled');
    return offline.verify(scan.envelope, options);
  }

  removeInboxItem(id: string): boolean {
    return this.inbox.delete(id);
  }

  dispose(): void {
    if (this.status === 'disposed') return;
    this.status = 'disposed';
    this.options.native.dispose();
    this.inbox.clear();
  }

  private enqueue(scan: AcceptedCredentialScan): InboxItem {
    const item: InboxItem = Object.freeze({
      id: `inbox-${this.now()}-${this.inbox.size + 1}`,
      kind: scan.scan.kind,
      receivedAt: this.now(),
      scan,
    });
    this.inbox.set(item.id, item);
    return item;
  }

  private assertKind(item: InboxItem, kind: InboxItem['kind']): void {
    if (!item || item.kind !== kind || this.inbox.get(item.id) !== item)
      throw new MobileWalletError('LINK_REJECTED', 'The inbox item is invalid or no longer available');
  }
}

export type MobileWalletErrorCode =
  | 'LINK_REPLAY'
  | 'LINK_REJECTED'
  | 'CONSENT_REQUIRED'
  | 'ISSUANCE_FAILED'
  | 'PRESENTATION_FAILED'
  | 'VERIFICATION_UNAVAILABLE';

export type MobileOfflineVerificationResult = {
  readonly result: 'verified' | 'rejected' | 'indeterminate';
  readonly code: string;
  readonly envelopeId?: string;
  readonly issuerId?: string;
  readonly schemaId?: string;
  readonly snapshotId?: string;
  readonly snapshotExpiresAt?: number;
};

export class MobileWalletError extends Error {
  constructor(readonly code: MobileWalletErrorCode, message: string) {
    super(message);
    this.name = 'MobileWalletError';
  }
}

const sameClaims = (left: readonly string[], right: readonly string[]): boolean => {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === left.length && b.length === right.length && a.every((value, index) => value === b[index]);
};

const decodeOffer = (value: string): string => {
  try {
    if (value.startsWith('{')) return value;
    const url = new URL(value);
    const encoded = url.searchParams.get('credential_offer');
    if (encoded) return encoded;
  } catch {
    // HolderClient performs the final bounded validation and returns a stable error.
  }
  return value;
};

export { IdentityNativeError };
