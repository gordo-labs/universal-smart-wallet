import { WebCameraAdapter, type CameraOptions, type CameraPhase } from './web-camera.ts';
import { SingleUseScanGate, fromDeepLink, fromImageBytes, fromUri, type ParsedScan, type ScanParser, type ScanSource } from './input.ts';

export type AdminVerificationResult<T> = { readonly source: ScanSource; readonly parsed: T };

/** Admin-side scanner: media acquisition is local; verifier calls stay injected. */
export class AdminVerifierScanner<T> {
  readonly camera = new WebCameraAdapter();
  readonly singleUse = new SingleUseScanGate();
  constructor(private readonly parse: ScanParser<T>, private readonly allowHosts: readonly string[] = []) {}

  scanUri(value: string): AdminVerificationResult<T> { return this.consume(fromUri(value)); }
  scanDeepLink(value: string): AdminVerificationResult<T> { return this.consume(fromDeepLink(value, this.allowHosts)); }
  scanImage(bytes: Uint8Array): AdminVerificationResult<T> { return this.consume(fromImageBytes(bytes)); }

  scanCameraValue(value: string | Uint8Array): AdminVerificationResult<T> { return this.consume({ input: value, source: 'camera' }); }

  startCamera(video: Parameters<WebCameraAdapter['start']>[0], options: CameraOptions = {}): Promise<CameraPhase> {
    return this.camera.start(video, options);
  }
  cancel(): void { this.camera.stop(); }
  dispose(): void { this.camera.dispose(); }

  private consume(scan: ParsedScan): AdminVerificationResult<T> {
    if (!this.singleUse.accept(scan.input)) throw new Error('Duplicate scan rejected');
    return Object.freeze({ source: scan.source, parsed: this.parse(scan.input) });
  }
}
