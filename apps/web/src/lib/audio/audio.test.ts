import { describe, expect, it } from "vitest";
import { downsampleToPcm16, pcm16ToFloat32, rms } from "./pcm";
import { EnergyVad } from "./vad";

describe("pcm", () => {
  it("downsamples 48k to 16k at a third of the length and clamps", () => {
    const f = new Float32Array(960).fill(2);
    const out = downsampleToPcm16(f, 48_000);
    expect(out.length).toBe(320);
    expect(out[0]).toBe(0x7fff);
  });
  it("round-trips PCM16 bytes to floats", () => {
    const i16 = new Int16Array([0, 16384, -32768]);
    const f = pcm16ToFloat32(i16.buffer);
    expect(Array.from(f)).toEqual([0, 0.5, -1]);
  });
  it("computes rms", () => {
    expect(rms(new Float32Array([0.5, -0.5]))).toBeCloseTo(0.5);
  });
});

describe("vad", () => {
  it("starts after three voiced frames and ends after the hangover", () => {
    const v = new EnergyVad();
    const edges = [];
    for (let i = 0; i < 10; i += 1) edges.push(v.push(0.001));
    for (let i = 0; i < 5; i += 1) edges.push(v.push(0.2));
    expect(edges.filter(Boolean)).toEqual(["start"]);
    expect(edges.indexOf("start")).toBe(12);
    const tail = [];
    for (let i = 0; i < 30; i += 1) tail.push(v.push(0.001));
    expect(tail.indexOf("end")).toBe(22); // 450 ms / 20 ms = 23rd frame
    expect(v.speaking).toBe(false);
  });
  it("short pauses inside speech do not end the turn", () => {
    const v = new EnergyVad();
    for (let i = 0; i < 3; i += 1) v.push(0.2);
    for (let i = 0; i < 10; i += 1) expect(v.push(0.001)).toBeNull();
    v.push(0.2);
    expect(v.speaking).toBe(true);
  });
  it("raises its threshold in a noisy room", () => {
    const v = new EnergyVad();
    for (let i = 0; i < 200; i += 1) v.push(0.01);
    expect(v.threshold).toBeGreaterThan(0.025);
  });
});
