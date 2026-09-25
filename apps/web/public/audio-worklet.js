// audio-worklet.js — runs on the audio thread.
// Takes mic audio at the browser's native rate (usually 48kHz) and downsamples
// to 16kHz mono 16-bit PCM in 100ms chunks, which is what Gemini Live wants.
//
// This has to run on the audio thread (via AudioWorkletProcessor) because the
// main thread is not allowed to drop a sample — every 100ms is a hard budget.

const TARGET_RATE = 16000;
const CHUNK_SAMPLES = 1600; // 100ms at 16kHz

class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    // `sampleRate` is a global provided by the worklet runtime — the current
    // device's mic rate.
    this.resampleRatio = sampleRate / TARGET_RATE;
    this.readCursor = 0;
    this.outBuffer = new Int16Array(CHUNK_SAMPLES);
    this.outCount = 0;
    // Last input sample of the previous buffer, kept so we can interpolate
    // cleanly across the buffer boundary instead of clamping to the last
    // sample of the current buffer (which produces a click every ~2.7ms).
    this.lastSample = 0;
    this.running = true;
    this.port.onmessage = (e) => {
      if (e.data === "stop") this.running = false;
    };
  }

  process(inputs) {
    if (!this.running) return false;
    const ch = inputs[0] && inputs[0][0];
    if (!ch || ch.length === 0) return true;

    // Linear resample from the device rate down to 16kHz.
    while (this.readCursor < ch.length) {
      const idx = Math.floor(this.readCursor);
      const frac = this.readCursor - idx;
      const a = ch[idx];
      // Cross the boundary between buffers using `lastSample` from the
      // previous process() call. Falls back to `a` only when the previous
      // buffer was empty (first process() ever).
      const b = idx + 1 < ch.length ? ch[idx + 1] : this.lastSample || a;
      let sample = a + (b - a) * frac;

      if (sample > 1) sample = 1;
      else if (sample < -1) sample = -1;
      this.outBuffer[this.outCount++] =
        sample < 0 ? sample * 0x8000 : sample * 0x7fff;

      if (this.outCount === CHUNK_SAMPLES) {
        // Copy + transfer the buffer so the main thread can send it without
        // us waiting on garbage collection.
        const out = this.outBuffer.slice(0);
        this.port.postMessage(out.buffer, [out.buffer]);
        this.outCount = 0;
      }
      this.readCursor += this.resampleRatio;
    }
    // Rebase the cursor for the next buffer. Guard against corruption if
    // the loop somehow overshot by more than a full buffer.
    this.readCursor = Math.max(0, this.readCursor - ch.length);
    this.lastSample = ch[ch.length - 1];
    return true;
  }
}

registerProcessor("capture", Capture);
