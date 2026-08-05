export type CameraPhase = 'idle' | 'starting' | 'active' | 'permission-denied' | 'unsupported' | 'stopped';

export type CameraOptions = {
  readonly facingMode?: 'user' | 'environment';
  readonly onPhase?: (phase: CameraPhase) => void;
  readonly onManualFallback?: () => void;
};

type CameraStream = { readonly getTracks: () => readonly { stop: () => void }[] };
type CameraVideo = { srcObject?: unknown; play?: () => Promise<void> | void };

/** Browser-only media boundary. It never parses or verifies QR payloads. */
export class WebCameraAdapter {
  private stream?: CameraStream;
  private video?: CameraVideo;
  private options: CameraOptions = {};
  private visibilityHandler?: () => void;
  private phase: CameraPhase = 'idle';
  private generation = 0;

  get state(): CameraPhase { return this.phase; }

  async start(video: CameraVideo, options: CameraOptions = {}): Promise<CameraPhase> {
    this.stop();
    const generation = ++this.generation;
    this.options = options;
    this.video = video;
    this.setPhase('starting');
    const media = globalThis.navigator?.mediaDevices;
    if (!media?.getUserMedia) {
      this.setPhase('unsupported');
      options.onManualFallback?.();
      return this.phase;
    }
    try {
      const stream = await media.getUserMedia({
        audio: false,
        video: { facingMode: options.facingMode ?? 'environment' },
      });
      if (generation !== this.generation) {
        for (const track of (stream as CameraStream).getTracks()) track.stop();
        return 'stopped';
      }
      this.stream = stream as CameraStream;
      video.srcObject = stream;
      await video.play?.();
      this.installVisibilityGuard();
      this.setPhase('active');
    } catch (error) {
      this.stream = undefined;
      video.srcObject = null;
      const denied = error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      this.setPhase(denied ? 'permission-denied' : 'stopped');
      options.onManualFallback?.();
    }
    return this.phase;
  }

  stop(): void {
    this.generation += 1;
    this.removeVisibilityGuard();
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    if (this.video) this.video.srcObject = null;
    this.stream = undefined;
    this.video = undefined;
    if (this.phase !== 'idle') this.setPhase('stopped');
  }

  /** Alias for React effect cleanup and explicit cancel controls. */
  dispose(): void { this.stop(); }

  private setPhase(phase: CameraPhase): void {
    this.phase = phase;
    this.options.onPhase?.(phase);
  }

  private installVisibilityGuard(): void {
    if (typeof document === 'undefined') return;
    this.visibilityHandler = () => {
      if (document.visibilityState !== 'visible') this.stop();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private removeVisibilityGuard(): void {
    if (this.visibilityHandler && typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.visibilityHandler = undefined;
  }
}

export const createWebCameraAdapter = (): WebCameraAdapter => new WebCameraAdapter();
