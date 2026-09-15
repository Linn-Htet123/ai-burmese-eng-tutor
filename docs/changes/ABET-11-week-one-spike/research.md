---
type: Research
title: ABET-11 — Pipecat + Gemini Live week-one spike
status: complete
sources:
  - https://docs.pipecat.ai/server/services/s2s/gemini-live
  - https://reference-server.pipecat.ai/en/latest/_modules/pipecat/services/google/gemini_live/llm.html
  - https://docs.pipecat.ai/api-reference/server/frames/overview
  - https://github.com/pipecat-ai/pipecat/issues/3381
  - https://ai.google.dev/gemini-api/docs/live-api
  - https://ai.google.dev/gemini-api/docs/live-api/capabilities
  - https://docs.vad.ricky0123.com/user-guide/browser/
  - https://github.com/ricky0123/vad/issues/134
  - https://docs.railway.com/guides/sse-vs-websockets
  - https://docs.pipecat.ai/api-reference/server/utilities/observers/llm-observer
  - https://www.fullstackml.dev/p/15-where-does-the-time-go-measuring
  - https://lablab.ai/ai-tutorials/building-voice-agents-gemini-live-fastapi
---

# Research — ABET-11 Week-one spike: Pipecat + Gemini Live voice pipeline

## Question

What are the concrete implementation details needed to spec and build a thin end-to-end vertical slice of one voice turn using Pipecat + GeminiLiveLLMService on FastAPI, with client-side VAD, PCM over WebSocket, barge-in, item-log capture, and four make-or-break metric recipes?

---

## Findings

| # | Finding | Supports / refutes | Source |
|---|---------|-------------------|--------|
| F1 | `GeminiLiveLLMService` is the correct class name. Import path: `pipecat.services.google.gemini_live.llm`. Default model is `gemini-2.5-flash-native-audio-preview-12-2025`. | Confirms stack lock | [Pipecat docs](https://docs.pipecat.ai/server/services/s2s/gemini-live) |
| F2 | Constructor key params: `api_key`, `system_instruction`, `tools`, `settings=GeminiLiveLLMService.Settings(model, voice, vad, language, ...)`. Old `model` and `voice_id` top-level params are deprecated — use `Settings`. | Spec shape for service init | [Pipecat docs](https://docs.pipecat.ai/server/services/s2s/gemini-live) |
| F3 | WebSocket transport class: `FastAPIWebsocketTransport(websocket, params=FastAPIWebsocketParams(audio_in_enabled=True, audio_out_enabled=True))`. Docs say it is "best suited for telephony" but examples confirm it works for direct browser WebSocket too. | Usable for spike without Daily | [FastAPI WS transport docs](https://docs.pipecat.ai/server/services/transport/fastapi-websocket) |
| F4 | Barge-in bug (pipecat#3381): `GeminiLiveLLMService` was not handling the `server_content.interrupted` signal from Gemini Live (50–100ms) and instead waiting for the later `input_transcription` signal (500–2000ms). Fix landed in PR #3429. **Issue is closed.** Pin pipecat >= the version containing #3429. | Closes the D-045 / R-SE-8 risk — but must verify fix is in the installed version | [pipecat#3381](https://github.com/pipecat-ai/pipecat/issues/3381) |
| F5 | Barge-in at Pipecat level flows via: `UserStartedSpeakingFrame` (user speech detected) → `InterruptionFrame` / `CancelFrame` (system frames never discarded) → pending `OutputAudioRawFrame` data frames are dropped. With server-VAD, Gemini sends an `interrupted` signal; with local VAD (`GeminiVADParams(disabled=True)`), Pipecat drives the turn. | Defines exact frame chain for barge-in | [Frames overview](https://docs.pipecat.ai/api-reference/server/frames/overview) + [search result: pipecat forum] |
| F6 | Gemini Live audio format: **input** = raw 16-bit PCM, 16 kHz, little-endian. **Output** = raw 16-bit PCM, 24 kHz, little-endian. MIME type: `audio/pcm;rate=16000`. | Confirms wire-format spec | [Gemini Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities) |
| F7 | Practical browser chunk size: 640 bytes = 320 samples = 20 ms at 16 kHz PCM16 mono. Send as ArrayBuffer (binary WebSocket frame), not base64 JSON — saves ~33% bandwidth. AudioWorklet `process()` fires every 128 samples; accumulate to 320 before sending. | Spec for client audio sender | [DEV Community article](https://dev.to/programmingcentral/build-real-time-voice-chat-with-websockets-llms-and-web-audio-api-4mnj) |
| F8 | Item log capture method: use `GeminiLiveLLMService` tools / function calling. Register a `log_item` function tool. Gemini calls it alongside audio output when it emits a structured log entry. Observe `FunctionCallInProgressFrame` + `FunctionCallResultFrame` via `LLMLogObserver` or a custom pipeline observer. Alternatively use `_handle_msg_tool_call` hook pattern. | Confirms D-011 implementation path | [LLMLogObserver docs](https://docs.pipecat.ai/api-reference/server/utilities/observers/llm-observer) + [llm.py source](https://reference-server.pipecat.ai/en/latest/_modules/pipecat/services/google/gemini_live/llm.html) |
| F9 | Per-turn token metering: audio token usage (input_audio_tokens, output_audio_tokens) now flows through `LLMTokenUsage` into `MetricsFrame`. Attach an observer to capture `MetricsFrame` per turn. Gemini Live v3.x spans also carry cached and reasoning token counts. | Supports per-stage token metering requirement | [pipecat releases](https://github.com/pipecat-ai/pipecat/releases) search result |
| F10 | `@ricky0123/vad-web` event flow: `MicVAD.new({ onSpeechStart: () => { startSendingAudio() }, onSpeechEnd: (audio: Float32Array) => { stopSendingAudio(); sendFinalChunk() } })`. Assets (worklet bundle + ONNX model) must be served from `/public`; set `baseAssetPath` and `onnxWASMBasePath` accordingly for Next.js. | Confirms client VAD integration pattern | [vad-web docs](https://docs.vad.ricky0123.com/user-guide/browser/) |
| F11 | iOS Safari WASM OOM issue (vad#134): confirmed on iPhone devices — RangeError: out of memory from WASM backend. Issue opened Sep 2024, **still unresolved** as of research date. No confirmed workaround yet; original poster said no constructor params mitigate it. | Risk flag: iOS Safari may need fallback | [vad#134](https://github.com/ricky0123/vad/issues/134) |
| F12 | Next.js `@ricky0123/vad-web` worklet loading error (issue#106): error loading worklet bundle at default path. Fix: set `workletURL` option to the public path where `vad.worklet.bundle.min.js` is copied. Copy vad assets to `public/` in Next.js. Use `"use client"` + dynamic import to avoid SSR. Issue is open but the workaround is clear. | Confirms Next.js App Router integration requires explicit asset config | [vad#106](https://github.com/ricky0123/vad/issues/106) |
| F13 | cloudflared tunnel: `npx cloudflared tunnel --url http://localhost:8000` gives an `https://random.trycloudflare.com` URL. WebSocket upgrade (wss://) works automatically — no extra config. HTTPS is provided by default, so mic permission prompt works on Chrome/Android and Safari/iOS. Data is encrypted end-to-end. | Confirms spike phone-test method | [Cloudflare community](https://www.answeroverflow.com/m/1402672681601466411) + [lmei88 Medium](https://lmei88.medium.com/websocket-with-cloudflare-tunnel-reversed-proxy-to-self-hosted-ubuntu-server-95625475c610) |
| F14 | Railway WebSocket: official docs say WebSocket connections are **exempt from request timeouts and can stay open indefinitely, even while idle**. Community reports of ~50-min silent drops are a known issue; mitigation is server-side ping every 15–25 s. For a spike, this is acceptable. | Supports Railway deploy for spike | [Railway guide](https://docs.railway.com/guides/sse-vs-websockets) |
| F15 | Railway FastAPI deploy: Dockerfile using Python + `pip install -r requirements.txt` + `CMD ["hypercorn", "main:app", "--bind", "0.0.0.0:$PORT"]`. Expose `$PORT` env var (Railway injects it). Set `GOOGLE_API_KEY` env var in Railway dashboard. No special WebSocket port config needed — Railway proxies via HTTP upgrade. | Spec for Railway Dockerfile | [Railway FastAPI guide](https://docs.railway.com/guides/fastapi) + [codingforentrepreneurs blog](https://www.codingforentrepreneurs.com/blog/deploy-fastapi-to-railway-with-this-dockerfile) |
| F16 | Gemini Live endpoint region: AI Studio API (`generativelanguage.googleapis.com`) is a global/US endpoint. Vertex AI has regional endpoints including `asia-northeast1` (Tokyo) and `asia-southeast1` (Singapore) — confirmed both are in Google Cloud's regional roster. However, **which specific Live API models are available per region is not confirmed** from public docs (F16a); must test live. RTT from Mumbai → `asia-south1` cut 150ms vs US-east. Tokyo and Singapore are physically closer to Yangon than US. | Supports spike goal of measuring RTT per region | [autointerviewai blog](https://www.autointerviewai.com/blog/google-gemini-live-voice-to-voice-review-2026) + [Google Cloud blog](https://cloud.google.com/blog/products/ai-machine-learning/gemini-live-api-available-on-vertex-ai) |
| F17 | Gemini Live reported latency issues: community forum reports 3–10 s latency with `gemini-2.5-flash-native-audio-preview-09-2025` and `gemini-live-2.5-flash-preview`. Google escalated but gave no resolution. Model processing itself is 100–200 ms; the multi-second delays appear intermittent / tier-dependent. | Risk: Gemini Live latency is not a solved problem — spike must measure | [Google AI forum](https://discuss.ai.google.dev/t/gemini-live-api-models-high-latency/108989) |
| F18 | Barge-in timing (Gemini 3.1 flash live bug): `server never emits interrupted` when user speaks as model turn begins — open issue on Google AI forum. Affects Gemini 3.1 flash live preview. Gemini 2.5 flash is not reported to have this bug. Use 2.5 flash for the spike. | Risk: avoid gemini-3.1 for spike | [Google AI forum](https://discuss.ai.google.dev/t/gemini-3-1-flash-live-preview-live-api-server-never-emits-interrupted-barge-in-when-the-user-is-already-speaking-as-the-models-turn-begins/174346) |
| F19 | Measurement recipe — end-to-end latency: anchor A = `VADUserStoppedSpeakingFrame` timestamp (client VAD fires `onSpeechEnd`), anchor B = `BotStartedSpeakingFrame` (first audio chunk queued for playback). Use Pipecat's observer pattern to record both without touching pipeline logic. Observed p50 ~320 ms, p95 ~780 ms in one production report (US region, Gemini 2.5). | Defines metric recipe for R-TE-1 | [fullstackml.dev article](https://www.fullstackml.dev/p/15-where-does-the-time-go-measuring) + [lablab.ai tutorial](https://lablab.ai/ai-tutorials/building-voice-agents-gemini-live-fastapi) |
| F20 | Measurement recipe — barge-in ≤ 300ms: anchor A = client mic-open timestamp when user starts speaking mid-bot-turn (log in `onSpeechStart` callback), anchor B = local playback stop (audio queue drained, log when `AudioContext` source node ends). Delta = perceived barge-in latency. | Defines metric recipe for R-SE-8 | Derived from frame model + lablab tutorial |
| F21 | Measurement recipe — item log reliability: attach a custom observer that counts `FunctionCallResultFrame` events tagged as `log_item` per turn; compare count to expected-turn count at session end. Target: 100% coverage. | Defines metric recipe for D-011 | [LLMLogObserver docs](https://docs.pipecat.ai/api-reference/server/utilities/observers/llm-observer) |
| F22 | Measurement recipe — Burmese quality: no published automated rubric for Burmese voice quality exists. Practical approach for spike: collect 10 scripted Burmese phrases, play back via May, have one native Burmese speaker score each on 1–5 intelligibility + 1–5 naturalness. WER not viable (no off-the-shelf Burmese ASR). | Burmese quality metric requires manual evaluation | Could not verify automated option |
| F23 | Gemini Live function calling (Gemini 2.5 Flash): supports `NON_BLOCKING` behavior for async tool calls. Gemini 3.x does not support NON_BLOCKING — logs a warning. Use 2.5 flash for async `log_item` function calls that do not pause the audio stream. | Confirms async item-log function call is feasible without blocking audio | [Gemini Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities) |

---

## Prior art

1. **lablab.ai FastAPI + Gemini Live tutorial** — shows four-task concurrent asyncio architecture (receive-from-frontend, send-to-gemini, receive-from-gemini, send-to-frontend), bounded queues for backpressure, barge-in via queue drain, and function-call-triggered structured data extraction. Closest to our spike architecture.
   URL: https://lablab.ai/ai-tutorials/building-voice-agents-gemini-live-fastapi

2. **pipecat-ai/pipecat-examples `gemini-live-starters/web-bot`** — official Pipecat starter with Next.js client + Python server using GeminiLiveLLMService. Uses Daily transport for production, but the server-side pipeline pattern is directly applicable.
   URL: https://github.com/pipecat-ai/pipecat-examples/tree/main/gemini-live-starters/web-bot

3. **pipecat-ai/gemini-multimodal-live-demo** — archived Oct 2025 (superseded by pipecat-examples), but the FastAPI + GeminiLiveLLMService pipeline structure (`bots/webrtc/bot_pipeline.py`) is still worth reading for the session lifecycle pattern.
   URL: https://github.com/pipecat-ai/gemini-multimodal-live-demo

4. **fullstackml.dev article #15 — Measuring Voice-to-Voice Latency with Pipecat + Twilio** — production-grade latency measurement using Pipecat observer pattern, `VADUserStoppedSpeakingFrame` → `BotStartedSpeakingFrame` timing, and `MetricsFrame` capture. Directly applicable measurement recipe.
   URL: https://www.fullstackml.dev/p/15-where-does-the-time-go-measuring

5. **expo-gemini-live (kiarashplusplus)** — FastAPI + Pipecat 0.0.94 + Expo/React Native starter. Older pipecat version but shows RTVI endpoint pattern (`POST /api/rtvi/start`, `POST /api/rtvi/{sessionId}/stop`) that gives the spike a clean session lifecycle shape.
   URL: https://github.com/kiarashplusplus/expo-gemini-live

---

## What I could not verify

- **Exact pipecat version that contains the #3381 fix (PR #3429)**: The PR exists and is merged, but I did not confirm which release tag it shipped in. Must check `git log` or changelog before pinning version in requirements.txt.

- **Gemini Live regional availability per-model**: Whether `gemini-2.5-flash-native-audio-preview-12-2025` is available on Vertex AI `asia-southeast1` (Singapore) or `asia-northeast1` (Tokyo) is not confirmed from public docs. The global AI Studio endpoint is confirmed available. The spike should test Vertex AI regional endpoints directly.

- **`@ricky0123/vad-web` iOS Safari OOM**: No workaround is confirmed as of research date (issue#134 open). The fallback for the spike should be a graceful "install to home screen" prompt for iOS users, or disabling VAD on iOS and using push-to-talk as a temporary measure.

- **Gemini Live input transcription side-channel format in Pipecat**: The source confirms `_handle_msg_input_transcription()` aggregates user speech into sentences, but the exact frame type emitted for consumption by downstream processors was not fully traced.

- **Exact latency of Gemini Live from Railway Singapore → Gemini endpoint**: No public benchmark comparing Railway Singapore region → AI Studio global vs Vertex AI Tokyo/Singapore. Must measure in spike.

- **`workletURL` option availability in latest `@ricky0123/vad-web`**: The fix for Next.js worklet path is documented as using `workletURL`, but the exact option name and whether it is in the current npm release was not verified against the package source.

---

## Sources

- [Pipecat Gemini Live service docs](https://docs.pipecat.ai/server/services/s2s/gemini-live)
- [GeminiLiveLLMService source (reference-server)](https://reference-server.pipecat.ai/en/latest/_modules/pipecat/services/google/gemini_live/llm.html)
- [Pipecat FastAPI WebSocket transport docs](https://docs.pipecat.ai/server/services/transport/fastapi-websocket)
- [Pipecat frames overview](https://docs.pipecat.ai/api-reference/server/frames/overview)
- [pipecat#3381 — GeminiLiveLLMService interrupted signal fix](https://github.com/pipecat-ai/pipecat/issues/3381)
- [pipecat#2460 — FastAPIWebsocket interruption handling issue](https://github.com/pipecat-ai/pipecat/issues/2460)
- [Gemini Live API overview (ai.google.dev)](https://ai.google.dev/gemini-api/docs/live-api)
- [Gemini Live API capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities)
- [Gemini Live high latency forum thread](https://discuss.ai.google.dev/t/gemini-live-api-models-high-latency/108989)
- [Gemini 3.1 flash live barge-in bug forum thread](https://discuss.ai.google.dev/t/gemini-3-1-flash-live-preview-live-api-server-never-emits-interrupted-barge-in-when-the-user-is-already-speaking-as-the-models-turn-begins/174346)
- [Gemini Live on Vertex AI blog post](https://cloud.google.com/blog/products/ai-machine-learning/gemini-live-api-available-on-vertex-ai)
- [vad-web browser user guide](https://docs.vad.ricky0123.com/user-guide/browser/)
- [vad#134 — iOS Safari WASM OOM](https://github.com/ricky0123/vad/issues/134)
- [vad#106 — Next.js worklet loading error](https://github.com/ricky0123/vad/issues/106)
- [Railway SSE vs WebSockets guide](https://docs.railway.com/guides/sse-vs-websockets)
- [Railway FastAPI deploy guide](https://docs.railway.com/guides/fastapi)
- [Railway WebSocket drops community thread](https://station.railway.com/questions/web-socket-connections-dropping-silently-da8600df)
- [LLMLogObserver docs](https://docs.pipecat.ai/api-reference/server/utilities/observers/llm-observer)
- [fullstackml.dev — measuring voice latency with Pipecat](https://www.fullstackml.dev/p/15-where-does-the-time-go-measuring)
- [lablab.ai — FastAPI + Gemini Live tutorial](https://lablab.ai/ai-tutorials/building-voice-agents-gemini-live-fastapi)
- [pipecat-examples gemini-live-starters/web-bot](https://github.com/pipecat-ai/pipecat-examples/tree/main/gemini-live-starters/web-bot)
- [Gemini 2.0 Flash Live latency review](https://www.autointerviewai.com/blog/google-gemini-live-voice-to-voice-review-2026)

---

## Learnings after launch
_(filled by /measure — leave empty until then)_
