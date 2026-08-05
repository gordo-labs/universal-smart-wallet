import { WebCameraAdapter, type CameraOptions, type CameraPhase } from './web-camera';
import { SingleUseScanGate, fromDeepLink, fromImageBytes, fromUri, type ParsedScan, type ScanParser, type ScanSource } from './input';

export type WalletScanKind = 'issuance' | 'presentation';
export type WalletScanResult<T> = { readonly source: ScanSource; readonly kind: WalletScanKind; readonly parsed: T };

/** Wallet scanner for credential offers and presentation requests. */
export class WalletCredentialScanner<T> {
  readonly camera = new WebCameraAdapter();
  readonly singleUse = new SingleUseScanGate();
  constructor(private readonly parse: ScanParser<T>, private readonly allowHosts: readonly string[] = []) {}
  scanOffer(value: string): WalletScanResult<T> { return this.consume(fromUri(value), 'issuance'); }
  scanRequest(value: string): WalletScanResult<T> { return this.consume(fromUri(value), 'presentation'); }
  scanDeepLink(value: string, kind: WalletScanKind): WalletScanResult<T> { return this.consume(fromDeepLink(value, this.allowHosts), kind); }
  scanImage(bytes: Uint8Array, kind: WalletScanKind): WalletScanResult<T> { return this.consume(fromImageBytes(bytes), kind); }
  scanCameraValue(value: string | Uint8Array, kind: WalletScanKind): WalletScanResult<T> { return this.consume({ input: value, source: 'camera' }, kind); }
  startCamera(video: Parameters<WebCameraAdapter['start']>[0], options: CameraOptions = {}): Promise<CameraPhase> { return this.camera.start(video, options); }
  cancel(): void { this.camera.stop(); }
  dispose(): void { this.camera.dispose(); }
  private consume(scan: ParsedScan, kind: WalletScanKind): WalletScanResult<T> {
    if (!this.singleUse.accept(scan.input)) throw new Error('Duplicate scan rejected');
    return Object.freeze({ source: scan.source, kind, parsed: this.parse(scan.input) });
  }
}
