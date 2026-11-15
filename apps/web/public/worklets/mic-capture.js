// Batches mic input into ~20 ms frames at the device sample rate and posts them to the main thread.
class MicCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(Math.round(sampleRate * 0.02));
    this.i = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let k = 0; k < ch.length; k++) {
      this.buf[this.i++] = ch[k];
      if (this.i === this.buf.length) {
        this.port.postMessage(this.buf.slice());
        this.i = 0;
      }
    }
    return true;
  }
}
registerProcessor("mic-capture", MicCapture);
