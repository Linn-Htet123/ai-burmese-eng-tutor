# VAD Library Comparison — Browser Client Side

**For:** GitHub issue #11 — pick a client-side VAD for the Next.js voice-AI tutor  
**Date:** 2026-09-13  
**Author:** @scout

---

## Recommendation

Use **`@ricky0123/vad-web`** (Silero VAD v5/v6 via ONNX Runtime Web).

- Silero outperforms every free alternative on noisy audio: 87% TPR vs 50% for WebRTC VAD at 5% FPR (Picovoice benchmark). Myanmar street noise is real-world noise; WebRTC VAD's 50% TPR makes it a non-starter.
- It is the only production-ready, MIT/ISC-licensed, actively-maintained VAD that runs fully in the browser via WASM/ONNX with no API key or server call required.
- Frame size is 32ms (512 samples at 16 kHz), so speech-start fires in one frame — well under the 300ms barge-in budget.

---

## Comparison Table

| Criterion | `@ricky0123/vad-web` (Silero) | WebRTC VAD WASM (`libfvad-wasm`) | Pipecat client SDK VAD | Cobra VAD (`@picovoice/cobra-web`) | Energy threshold (naive) |
|---|---|---|---|---|---|
| **Model / binary size** | 2.33 MB ONNX (v5); 1.2 MB (v6, added in 0.0.31) + ~4 MB ONNX Runtime WASM | ~150 KB WASM, no ML model | Server-side only (see note) | ~3-4 MB WASM + model | ~0 KB |
| **Noise robustness (TPR @ 5% FPR)** | 87.7% (Silero v5); Silero v6 ROC-AUC 0.97 | 50% — fails to separate speech from noise | N/A (server-side) | ~99% (Cobra, proprietary benchmark) | Very poor |
| **Speech-start latency** | ~32ms (1 frame = 512 samples at 16 kHz) | ~10-30ms (energy-based, no ML) | N/A | ~32ms (similar frame size) | ~10ms |
| **iOS Safari support** | Partial — see gotchas | Untested / likely fine (no SIMD dep) | N/A | Claims all major browsers incl Safari | Fine |
| **License** | ISC (code) + MIT (Silero ONNX model) | MIT / Apache-2.0 | Apache-2.0 | Non-commercial free; paid for commercial | N/A |
| **API key required** | No | No | No | Yes (Picovoice AccessKey) | No |
| **Actively maintained** | Yes — v0.0.31 released Sep 2025 (Silero v6 support + memory leak fix); 56 npm dependents | Low — `@echogarden/fvad-wasm` last update 2 years ago; Mozilla's port deprecated | N/A | Yes — commercial product | N/A |
| **Next.js / React integration** | First-class: `@ricky0123/vad-react` wrapper; Vite/webpack guides in docs | Manual — wrap in AudioWorklet | N/A | Manual | Manual |
| **CPU on mid-range phone** | <1ms per 30ms chunk on desktop CPU; Raspberry Pi Zero uses ~50% — mid-range Android should be 5-15% | <0.5ms per frame | N/A | ~0.05% on desktop (10x lighter than Silero) | <0.1ms |
| **Runs client-side (no server)** | Yes | Yes | No | Yes | Yes |

---

## Pipecat Client SDK — VAD note

The `pipecat-ai/pipecat-client-web` SDK does **not** ship a browser-side VAD. All Pipecat VAD (Silero, Krisp, WebRTC) runs server-side, inside the Pipecat pipeline on FastAPI. The client SDK streams raw audio over a WebRTC or WebSocket transport. For barge-in with sub-300ms latency the detection must happen in the browser — a separate browser-side VAD library is required.

Source: [Pipecat client-web GitHub](https://github.com/pipecat-ai/pipecat-client-web) — no VAD mentioned in device/media management. Pipecat server docs list Silero, Krisp, AI-Coustics as server-only analyzers.

---

## iOS Safari Gotchas

Three confirmed issues as of late 2024, none fully resolved upstream:

1. **WASM SIMD not supported (issue #157)** — Safari reports "WebAssembly SIMD is not supported in the current environment." Affects iPhones on older iOS. Safari added WASM SIMD in iOS 16.4, but some devices still fail. The fix is to serve both a SIMD and non-SIMD WASM build and use WebAssembly Feature Detection to pick at runtime. ONNX Runtime Web supports this but `@ricky0123/vad-web` does not yet auto-select the non-SIMD build for you (as of v0.0.31, Nov 2025 — issue open, no fix merged).
   Source: [GitHub issue #157](https://github.com/ricky0123/vad/issues/157), [ONNX Runtime issue #15644](https://github.com/microsoft/onnxruntime/issues/15644)

2. **WASM out-of-memory on iPhone (issue #134)** — iPhones with tighter memory management crash on model load with `RangeError: out of memory`. More likely on older iPhones (A12 and below). No documented fix. Using the v6 model (1.2 MB vs 2.33 MB for v5) may help.
   Source: [GitHub issue #134](https://github.com/ricky0123/vad/issues/134)

3. **AudioContext autoplay policy** — Safari requires a user gesture before an AudioContext can start. Must call `audioContext.resume()` inside a click/touch handler before initializing `MicVAD`. Not specific to this library but commonly tripped here.
   Source: [MDN Web Docs — AudioContext.resume()](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume)

**Practical mitigation:** Initialize `MicVAD` inside the "Start session" button handler. Use the Silero v6 model (1.2 MB) to reduce memory pressure. Test on an iPhone 11 (A13 Bionic, iOS 16+) as the minimum target. If SIMD fails, catch the init error and fall back to energy threshold for iOS only.

---

## Sources

- [@ricky0123/vad-web npm page](https://www.npmjs.com/package/@ricky0123/vad-web)
- [ricky0123/vad GitHub](https://github.com/ricky0123/vad)
- [vad-web browser docs](https://docs.vad.ricky0123.com/user-guide/browser/)
- [ricky0123/vad releases](https://github.com/ricky0123/vad/releases)
- [GitHub issue #157 — Safari SIMD](https://github.com/ricky0123/vad/issues/157)
- [GitHub issue #134 — iPhone OOM](https://github.com/ricky0123/vad/issues/134)
- [Picovoice: Best VAD 2026 benchmark](https://picovoice.ai/blog/best-voice-activity-detection-vad/)
- [Silero VAD quality metrics wiki](https://github.com/snakers4/silero-vad/wiki/Quality-Metrics)
- [Silero VAD v6 release notes — Soniqo guide](https://soniqo.audio/guides/vad)
- [Silero VAD v5 discussion — 3x faster, 2 MB model](https://github.com/snakers4/silero-vad/discussions/471)
- [libfvad-wasm GitHub](https://github.com/OzymandiasTheGreat/libfvad-wasm)
- [Mozilla webrtcvad_js — deprecated](https://github.com/mozilla/webrtcvad_js)
- [Cobra VAD web npm](https://www.npmjs.com/package/@picovoice/cobra-web)
- [Pipecat client-web GitHub](https://github.com/pipecat-ai/pipecat-client-web)
- [Pipecat JS SDK introduction](https://docs.pipecat.ai/client/js/introduction)
- [Deepwiki: Pipecat VAD](https://deepwiki.com/pipecat-ai/pipecat/6.1-voice-activity-detection)
- [ricky0123/vad ISC+MIT license](https://github.com/ricky0123/vad/blob/master/LICENSE)
- [ONNX Runtime WASM SIMD iOS issue #22086](https://github.com/microsoft/onnxruntime/issues/22086)
- [Can I use WASM SIMD](https://caniuse.com/wasm-simd)
- [VideoSDK: WebRTC VAD 2025](https://www.videosdk.live/developer-hub/webrtc/webrtc-voice-activity-detection)

---

## If We Are Wrong — Fallback Plan

If `@ricky0123/vad-web` disappoints during the week-one spike, here is the priority order:

| Scenario | Next option | Why |
|---|---|---|
| CPU too high on mid-range Android (>20% sustained) | Increase frame aggregation — require 2 consecutive positive frames before firing. Reduces callbacks by half. | No library change needed; just tune `positiveSpeechThreshold` + `minSpeechFrames`. |
| iOS Safari SIMD/OOM on target devices | Switch to Silero v6 model (1.2 MB). If still failing, use energy-threshold fallback for iOS only and accept coarser barge-in on iOS. | Energy threshold still beats WebRTC VAD for simplicity on a constrained path. |
| Accuracy too low in noisy real-world test (Myanmar street audio) | Try **Cobra VAD** (`@picovoice/cobra-web`) — 99% TPR, works on all browsers, processes audio in a separate thread. Commercial AccessKey required; free tier available. | Benchmarks show Cobra is 4-5x more accurate than Silero on hard noise. |
| `@ricky0123/vad-web` abandoned / breaks with future ONNX Runtime | Fork and pin the ONNX Runtime version, or switch to `@echogarden/fvad-wasm` (WebRTC-based, very small) and accept the noise-robustness tradeoff. | WebRTC VAD is stable and tiny; acceptable if Myanmar background noise turns out to be manageable. |
