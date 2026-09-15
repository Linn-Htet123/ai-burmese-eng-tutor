# Opus Bitrate Research — Browser → Backend Audio Stream

**Question:** What Opus bitrate should the Next.js frontend use when streaming mic audio over WebSocket to the FastAPI/Pipecat backend for Gemini Live STT?

---

## CRITICAL FINDING (read this first)

Gemini Live API **only accepts raw PCM audio** — not Opus, not any compressed format.
Required input: `audio/pcm;rate=16000` — 16-bit little-endian PCM, mono, 16 kHz.
Source: [Gemini Live API — Get started with WebSockets](https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket)

This means the architecture choice is binary:

**Option A — Send PCM directly (no Opus on the wire)**
Browser captures mic → raw PCM → WebSocket → Pipecat → Gemini Live.
No encode/decode step. Bitrate = 16,000 samples/s × 16-bit × 1 ch = **256 kbps constant**.

**Option B — Compress with Opus browser-side, decode server-side**
Browser encodes PCM → Opus → WebSocket → Pipecat decodes Opus → PCM → Gemini Live.
Reduces wire bytes at the cost of an encode/decode hop and ~26.5 ms extra latency.

Both options are viable. The bitrate question only matters if you pick Option B.
Pipecat's Gemini Live service internally sends PCM to Google — confirmed by GitHub issue analysis showing `sample_rate=16000` and `mime_type="audio/pcm"` in the service config.
Source: [Pipecat Gemini Live Twilio issue #1823](https://github.com/pipecat-ai/pipecat/issues/1823)

---

## Findings

| # | Finding | Supports / refutes | Source |
|---|---------|-------------------|--------|
| 1 | Gemini Live requires raw 16-bit PCM at 16 kHz. It does not accept Opus as input. | **Defines the architecture** — Option B requires a decode step in Pipecat before Gemini gets the audio. | [Firebase AI Logic limits](https://firebase.google.com/docs/ai-logic/live-api/limits-and-specs) · [Google Live API WebSocket guide](https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket) |
| 2 | Pipecat sends `audio/pcm` at 16 kHz to Gemini Live. No native Opus pass-through to Gemini. | Confirms Option B requires server-side decode; Option A requires no decode. | [litellm issue #40563](https://github.com/BerriAI/litellm/issues/40563) · [Pipecat issue #1823](https://github.com/pipecat-ai/pipecat/issues/1823) |
| 3 | RFC 6716 (Opus spec) "sweet spots" for wideband speech: 16–20 kbps. For fullband speech (the target if you want naturalness): 28–40 kbps. | If using Opus (Option B), **24 kbps wideband** is the right middle point. | [RFC 6716 §2.1](https://datatracker.ietf.org/doc/html/rfc6716#section-2.1) |
| 4 | Xiph.org VoIP table: mono voice, 10–24 kbps for VoIP. "24 kbps should give fullband." 20 ms frame is the recommended default. | 24 kbps / 20 ms is the canonical VoIP floor for full-bandwidth speech. | [XiphWiki Opus Recommended Settings](https://wiki.xiph.org/Opus_Recommended_Settings) |
| 5 | WER saturation point for single-channel ASR: ~32 kbps. Above that, gains diminish. | 32 kbps is a safe STT ceiling; no benefit paying more bytes above it for upstream speech. | [arXiv 2106.07994](https://arxiv.org/abs/2106.07994) |
| 6 | Chrome default Opus bitrate for WebRTC/getUserMedia: **32 kbps mono**. Firefox default: 40 kbps. | Browser defaults already sit at or above the STT saturation point. | [Fora Soft — Opus and WebRTC](https://www.forasoft.com/learn/audio-for-video/articles-audio/opus-codec-explained) · [GetStream WebRTC Codecs](https://getstream.io/resources/projects/webrtc/advanced/codecs/) |
| 7 | Myanmar median mobile download: ~23 Mbps. MPT upload max: 15.6 Mbps. Prepaid data cost: ~3,800–4,300 Ks/GB (~$1.80–2.05/GB at 2,100 Ks/USD). | Even Option A (256 kbps PCM) uses only **~115 MB/hour** of upload — about $0.22/hr at worst-case tariff. Bandwidth is not the bottleneck on a 15 Mbps pipe. | [DataReportal Digital 2024 Myanmar](https://datareportal.com/reports/digital-2024-myanmar) · [Myanmar Tech Press data prices Aug 2026](https://en.myanmartechpress.com/myanmar-telecom-operators-mobile-data-prices-august-2026/) |
| 8 | Opus encoder complexity is configurable (0–10). Default 10 gives best quality but highest CPU. Mid-range Android can handle complexity 5–7 with no perceptible quality drop and ~30–40% CPU saving. | CPU/battery concern on mid-range phones is real but manageable with complexity tuning, not bitrate reduction. | [XiphWiki Opus Recommended Settings](https://wiki.xiph.org/Opus_Recommended_Settings) · [OvenMediaEngine Opus CPU issue #828](https://github.com/AirenSoft/OvenMediaEngine/issues/828) |
| 9 | Opus algorithmic delay: 26.5 ms inherent + frame size. At 20 ms frames, encode + decode ≈ 46 ms end-to-end. At 40 ms frames, ≈ 66 ms. | Option B adds ~46–66 ms to the budget vs. Option A's ~0 ms codec latency. With a <1 s total target, 46 ms is acceptable but non-free. | [Opus codec overview — FutureAGI](https://futureagi.com/glossary/opus-codec/) |
| 10 | Pipecat WebSocket transport default audio output: 96 kbps. Internal audio frame size: 10 ms chunks. Input default sample rate: 16 kHz. | Pipecat expects PCM input internally; no built-in Opus decoder in the base transport — you would need to add one for Option B. | [Pipecat WebSocket server docs](https://docs.pipecat.ai/api-reference/server/services/transport/websocket-server) · [Pipecat frames docs](https://reference-server.pipecat.ai/en/stable/api/pipecat.frames.frames.html) |

---

## Recommendation

**Use Option A: send raw PCM from the browser. Do not use Opus on the upload path.**

Rationale:
1. Gemini Live accepts only PCM. Opus must be decoded before Google sees it.
2. Myanmar upload speeds (~15 Mbps peak, ~5 Mbps typical 4G) dwarf the 256 kbps PCM stream.
3. A 40-minute session at 256 kbps = ~77 MB upload. At $2/GB worst-case, that is $0.15/session — within the $25/month subscription economics.
4. Option A saves 26.5–46 ms of codec latency, which directly helps the <1 s end-to-end target.
5. No Opus decoder needed in Pipecat — less infrastructure complexity for the week-one spike.

If bandwidth later becomes a real constraint (spike data shows packet loss > 5%, or users on 3G-only areas), revisit Option B with the sweep values below.

---

## Bytes-per-minute and STT-quality comparison (if you do use Opus — Option B)

| Bitrate | Bytes/minute | Opus bandwidth tier | STT signal notes |
|---------|-------------|---------------------|-----------------|
| 12 kbps | ~90 KB/min | Narrowband (3–4 kHz) | Intelligible; misses fricatives; WER likely 10–20% higher vs. 24 kbps on accented speech |
| 24 kbps | ~180 KB/min | Fullband (per Xiph) | Sweet spot; matches Gemini's 16 kHz input ceiling; recommended VoIP floor |
| 32 kbps | ~240 KB/min | Fullband | WER saturation point; Chrome's default; marginal gain over 24 kbps for STT |
| 64 kbps | ~480 KB/min | Fullband (music-band) | No STT benefit over 32 kbps; wastes bytes; Discord's setting for music |

Compare to Option A (raw PCM): **1,920 KB/min** — ~8–10× more bytes than 24 kbps Opus. Still fine on Myanmar 4G.

---

## Test sweep for week-one spike (use only if Option A proves problematic)

If PCM upload causes packet loss or exceeds acceptable data use, test these three Opus configs in order:

1. **32 kbps / 20 ms / mono** — Chrome's own default; highest STT fidelity; closest to PCM quality; easiest A/B comparison.
2. **24 kbps / 20 ms / mono** — Xiph VoIP recommendation; fullband ceiling; good STT; 25% fewer bytes than 32 kbps.
3. **16 kbps / 20 ms / mono** — Wideband (8 kHz effective); noticeably thinner but still very intelligible; half the bytes of 32 kbps.

For each, measure: Gemini STT word error rate on the same 3-sentence Burmese-accented English test clip, end-to-end latency, and packet loss rate.

---

## Prior art

- **Vapi / Retell / LiveKit** — these platforms use WebRTC (not plain WebSocket) and rely on browser-negotiated Opus at 32–40 kbps. They sit in front of their own STT layer (Deepgram, etc.) that accepts Opus natively. Gemini Live does not.
- **Discord** — 64 kbps Opus, fullband, stereo. Not a voice-AI reference; music headroom.
- **WebRTC standard** — negotiates Opus, 20 ms frames, 32 kbps mono by default (Chrome). This is a good data point for "what the web considers normal."
- **Pipecat example apps** — use Daily or LiveKit transports (WebRTC) for Opus handling; WebSocket transport examples use raw PCM from the start.

---

## What I could not verify

- Pipecat's WebSocket transport does not ship a built-in Opus decoder. The source code review found no Opus decode in `base_output.py` or the Gemini Live service. A custom decode step (e.g. `opusscript` or native Node/Python decode) would be needed for Option B — but I did not find a Pipecat issue or PR confirming this gap explicitly.
- Whether Gemini Live will ever add native Opus input support. The Firebase docs list `audio/ogg` as a MIME type but the live-API-specific WebSocket guide overrides this with PCM-only. Could not confirm if `audio/ogg;codecs=opus` works in practice.
- Exact CPU delta (in mW or %) between Opus encode at complexity 5 vs. 10 on a specific mid-range Android (e.g. MediaTek Helio G88). The 30–40% CPU estimate is from community reports, not a controlled benchmark.
- Myanmar 4G median upload speed by operator. Only MPT's peak (15.6 Mbps) was available; field median for typical 4G users in secondary cities may be lower (~2–5 Mbps per the brief).

---

## Sources

- [RFC 6716 — Definition of the Opus Audio Codec](https://datatracker.ietf.org/doc/html/rfc6716)
- [XiphWiki — Opus Recommended Settings](https://wiki.xiph.org/Opus_Recommended_Settings)
- [Gemini Live API — Get started with WebSockets (Google AI for Developers)](https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket)
- [Firebase AI Logic — Live API limits and specs](https://firebase.google.com/docs/ai-logic/live-api/limits-and-specs)
- [Pipecat — WebSocket Server Transport docs](https://docs.pipecat.ai/api-reference/server/services/transport/websocket-server)
- [Pipecat issue #1823 — Twilio ↔ Pipecat ↔ Gemini Live audio format](https://github.com/pipecat-ai/pipecat/issues/1823)
- [litellm issue #40563 — Vertex AI Realtime PCM sample rate](https://github.com/BerriAI/litellm/issues/40563)
- [arXiv 2106.07994 — Multi-channel Opus for far-field ASR](https://arxiv.org/abs/2106.07994)
- [Fora Soft — Opus and WebRTC](https://www.forasoft.com/learn/audio-for-video/articles-audio/opus-codec-explained)
- [GetStream — WebRTC Codecs](https://getstream.io/resources/projects/webrtc/advanced/codecs/)
- [DataReportal — Digital 2024 Myanmar](https://datareportal.com/reports/digital-2024-myanmar)
- [Myanmar Tech Press — Mobile data prices Aug 2026](https://en.myanmartechpress.com/myanmar-telecom-operators-mobile-data-prices-august-2026/)
- [OvenMediaEngine — Opus CPU issue #828](https://github.com/AirenSoft/OvenMediaEngine/issues/828)
- [FutureAGI — Opus codec overview](https://futureagi.com/glossary/opus-codec/)
