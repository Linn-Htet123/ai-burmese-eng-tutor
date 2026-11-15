/**
 * Energy VAD with an adaptive noise floor (R-TE-3: aggressive client VAD, silence is billed).
 * Hangover adds directly to response latency, so it is the main tuning knob for R-TE-1.
 */
export interface VadOptions {
  frameMs: number;
  /** Absolute floor for the speech threshold. */
  minThreshold: number;
  /** Speech must be this many times louder than the noise floor. */
  ratio: number;
  /** Consecutive voiced frames before "start" (pre-roll covers the clipped onset). */
  startFrames: number;
  /** Silence needed before "end". */
  hangoverMs: number;
}

export const DEFAULT_VAD: VadOptions = { frameMs: 20, minThreshold: 0.012, ratio: 3, startFrames: 3, hangoverMs: 450 };

export type VadEdge = "start" | "end" | null;

export class EnergyVad {
  private floor = 0.004;
  private voicedRun = 0;
  private silentMs = 0;
  private _speaking = false;

  constructor(private readonly o: VadOptions = DEFAULT_VAD) {}

  get speaking(): boolean {
    return this._speaking;
  }

  get threshold(): number {
    return Math.max(this.o.minThreshold, this.floor * this.o.ratio);
  }

  push(level: number): VadEdge {
    const voiced = level >= this.threshold;
    if (!voiced) this.floor = this.floor * 0.95 + level * 0.05;

    if (!this._speaking) {
      this.voicedRun = voiced ? this.voicedRun + 1 : 0;
      if (this.voicedRun >= this.o.startFrames) {
        this._speaking = true;
        this.silentMs = 0;
        return "start";
      }
      return null;
    }
    if (voiced) {
      this.silentMs = 0;
      return null;
    }
    this.silentMs += this.o.frameMs;
    if (this.silentMs >= this.o.hangoverMs) {
      this._speaking = false;
      this.voicedRun = 0;
      return "end";
    }
    return null;
  }

  reset(): void {
    this._speaking = false;
    this.voicedRun = 0;
    this.silentMs = 0;
  }
}
