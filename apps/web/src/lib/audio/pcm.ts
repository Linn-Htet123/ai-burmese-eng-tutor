/** Pure PCM helpers. Mic goes up as PCM16 16 kHz mono; May comes down as PCM16 24 kHz mono. */

export const MIC_RATE = 16_000;
export const MAY_RATE = 24_000;

/** Average-decimate a float frame from the device rate to 16 kHz and convert to PCM16. */
export function downsampleToPcm16(input: Float32Array, inRate: number, outRate = MIC_RATE): Int16Array {
  if (inRate < outRate) throw new Error(`input rate ${inRate} below ${outRate}`);
  const ratio = inRate / outRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j] ?? 0;
    const v = end > start ? sum / (end - start) : 0;
    const c = Math.max(-1, Math.min(1, v));
    out[i] = c < 0 ? Math.round(c * 0x8000) : Math.round(c * 0x7fff);
  }
  return out;
}

/** PCM16 little-endian bytes to floats in [-1, 1]. */
export function pcm16ToFloat32(bytes: ArrayBuffer): Float32Array<ArrayBuffer> {
  const view = new DataView(bytes);
  const n = Math.floor(bytes.byteLength / 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = view.getInt16(i * 2, true) / 0x8000;
  return out;
}

export function rms(frame: Float32Array): number {
  if (frame.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < frame.length; i += 1) {
    const v = frame[i] ?? 0;
    s += v * v;
  }
  return Math.sqrt(s / frame.length);
}
