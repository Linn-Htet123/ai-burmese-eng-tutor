import { MAY_RATE, pcm16ToFloat32 } from "./pcm";

/** Gapless PCM playback with instant flush for barge-in (R-SE-8). Browser only. */
export class PcmPlayer {
  private playhead = 0;
  private readonly sources = new Set<AudioBufferSourceNode>();
  private readonly analyser: AnalyserNode;
  private readonly scratch: Float32Array<ArrayBuffer>;

  constructor(
    private readonly ctx: AudioContext,
    private readonly onDrained: () => void,
  ) {
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.scratch = new Float32Array(this.analyser.fftSize);
    this.analyser.connect(ctx.destination);
  }

  enqueue(bytes: ArrayBuffer): void {
    const samples = pcm16ToFloat32(bytes);
    if (samples.length === 0) return;
    const buf = this.ctx.createBuffer(1, samples.length, MAY_RATE);
    buf.copyToChannel(samples, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.analyser);
    const at = Math.max(this.ctx.currentTime + 0.03, this.playhead);
    src.start(at);
    this.playhead = at + buf.duration;
    this.sources.add(src);
    src.onended = () => {
      this.sources.delete(src);
      if (this.sources.size === 0) this.onDrained();
    };
  }

  flush(): void {
    for (const s of this.sources) {
      s.onended = null;
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.sources.clear();
    this.playhead = 0;
  }

  get playing(): boolean {
    return this.sources.size > 0;
  }

  level(): number {
    this.analyser.getFloatTimeDomainData(this.scratch);
    let s = 0;
    for (let i = 0; i < this.scratch.length; i += 1) s += (this.scratch[i] ?? 0) ** 2;
    return Math.sqrt(s / this.scratch.length);
  }
}
