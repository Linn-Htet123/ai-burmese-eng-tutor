# Voice pipeline — real-time loop between learner and May

**Status:** Approved (2026-09-07)
**Author:** Larry (Thar Linn Htet)
**Last updated:** 2026-09-10 (updated to reflect D-042 session shape and D-045 Pipecat adoption)
**Diagram:** [source](diagrams/voice-pipeline-architecture.drawio) · [preview](diagrams/voice-pipeline-architecture.svg)

## Requirements this implements
- `R-TE-1` — response latency under 1 second from end of learner speech to start of May's speech
- `R-TE-2` — learner can interrupt May; May stops within 300ms (same as R-SE-8)
- `R-TE-3` — aggressive client-side voice activity detection (silence sent as audio is billed as audio)
- `R-TE-5` — reconnect must not resend prior audio
- `R-TE-6` — session state persisted continuously; a dropped connection loses at most 10 seconds
- `R-TE-7` — item log emitted by the live model rather than a separate transcription stream
- `R-TE-8` — billed tokens logged per session per stage from day one
- `R-TE-9` — graceful degradation: if the live model is unavailable, offer a text-based review session
- `R-SE-8` — learner can interrupt May by speaking; May stops within 300ms of detected learner speech

Audio **recording and storage** (R-ON-7, R-SE-9, R-PR-2, R-TE-10, R-PR-4) is a separate doc: `03-audio-storage.md`.

## Related decisions
- `D-011` — the live model emits a structured item log alongside its audio response; no separate transcription stream. Removes ~45% of optimised session cost. **Must be prototyped in week one.**
- `D-035` — voice traffic proxied through our backend, not browser-direct
- `D-036` — WebSocket transport with mandatory heartbeat, not WebRTC
- `D-037` — hosting on Railway Singapore, not Vercel
- `D-038` — Next.js frontend + FastAPI (Python) backend
- `D-042` — 40-minute sessions, up to one per day (subscription model)
- `D-045` — Pipecat adopted as the hot-path voice framework (`GeminiLiveLLMService`, VAD, interruption); `google-genai` on raw asyncio kept as documented fallback

## Context

Every session is a 40-minute spoken conversation (D-042). The loop below repeats on every learner turn, and the product's teaching method (retrieval practice under time pressure) only works if the loop feels like a conversation, not a walkie-talkie with lag:

```
Learner speaks → model hears → model thinks → May speaks back
```

Hard constraints:
- **Sub-1-second** from end of learner speech to start of May's voice (R-TE-1).
- Learners are on **mid-range Android phones over Myanmar mobile data**. Connections drop; assume it (R-TE-6).
- Every second of audio in or out is **billed** (BRD §cost model). Silence, resent audio, and separate transcription streams are all avoidable cost leaks (R-TE-3, R-TE-5, D-011).

## Decision

**A proxied pipeline: browser ↔ our backend (WebSocket) ↔ Gemini Live (WebSocket), single region (Singapore), hosted on Railway.**

```
┌──────────────┐  WebSocket (wss)  ┌────────────────────┐  WebSocket   ┌─────────────┐
│   Browser     │ ────────────────► │  FastAPI backend    │ ───────────► │ Gemini Live │
│  (Next.js)    │                   │  (Railway, SG)      │              │             │
│ · mic capture │ ◄──────────────── │ · session state     │ ◄─────────── │ · STT+LLM+  │
│ · client VAD  │   May's audio     │ · item log capture  │  audio +     │   TTS in    │
│ · playback    │                   │ · token metering    │  item log    │   one model │
│ · barge-in UI │                   │ · barge-in relay    │              │             │
└──────────────┘                   └────────────────────┘              └─────────────┘
```

One Gemini Live connection per active session, owned by the backend. The browser never holds a Google API key.

### Why proxy (not direct browser → Gemini)

1. **D-011 item log is captured server-side.** The structured item log arrives interleaved with May's audio on the Gemini socket. The backend peels it off and writes it to the database in the same process. If the browser talked to Gemini directly, the log would have to survive a round-trip back from a flaky mobile client.
2. **Token metering (R-TE-8) is counted on the way through.** Every cost figure in the BRD is an assumption until real logs exist. Metering in the proxy makes it impossible to skip.
3. **API keys stay on the server.** No short-lived token issuance system to build.

Cost of the proxy: one extra network hop, ~50–150ms. See latency budget below — it fits.

### Hosting: Railway (Singapore), not Vercel

Researched 2026-09-07. Vercel added native WebSocket support in June 2026 (public beta), but a connection dies when the function hits its max duration: **5 minutes hard cap on Hobby, ~13 minutes on Pro** (800s), and 30 minutes only behind a separate beta flag. Our session is 40 minutes of continuous audio (D-042) — that means 3–8 forced mid-conversation disconnects per session, each one triggering a Gemini session re-attach (audio gap + extra billed state-summary tokens, against the spirit of R-TE-5). On top of that, Next.js on Vercel needs the `experimental_upgradeWebSocket()` API — experimental, on top of a beta.

Third-party analysis (Ably) and Vercel's own guidance agree: for long-lived realtime connections like AI voice, use a persistent server or a managed realtime provider.

**Decision: two services on Railway's Singapore region — a Next.js frontend and a FastAPI (Python) backend.** The FastAPI service is a plain long-running process: it holds the 40-minute learner WebSocket (D-042), owns the Gemini Live connection (via Pipecat, D-045), and later hosts the LangGraph-based session engine and plan generation. One platform, two deploys, ~$10–25/month at MVP scale. Founder already operates Railway for another product.

Why Python for the backend: LangGraph (Python-first) fits the session-stage state machine and the slow-brain work (plan generation, item-log processing, placement scoring); **Pipecat (also Python) carries the hot-path voice loop** (D-045); and the founder is deliberately investing in Python/FastAPI skills. Pipecat provides the FastAPI WebSocket transport, `GeminiLiveLLMService`, client VAD, and interruption handling — most of the plumbing this doc originally planned to hand-write. D-045's exit criteria (barge-in <300ms per R-TE-2/R-SE-8, end-to-end <1s per R-TE-1) enforce the same spirit as the earlier "no framework in the hot path" rule: nothing between learner and Gemini adds silent delay. The raw-asyncio path on Google's `google-genai` SDK remains the **documented fallback** if Pipecat can't hit either number in the week-one spike.

Consequence for storage: audio recordings go to Cloudflare R2 (S3-compatible, zero egress fees) rather than Vercel Blob, since we are no longer on Vercel. Details in `03-audio-storage.md`.

### Transport: WebSocket with heartbeat + reconnect

Browser ↔ backend uses a WebSocket carrying:
- **Upstream:** Opus-encoded audio chunks (~20ms frames), only while client VAD detects speech (R-TE-3); control messages (stage events, pause, Burmese-help button).
- **Downstream:** May's audio chunks; transcript fragments for the on-screen live transcript (R-SE-6); stage/state updates.

**Heartbeat protocol** (mandatory — silent middlebox disconnects are a known failure mode on mobile carriers and CDNs):
- Client sends `ping` every 20s. Server replies `pong` within 5s.
- Two missed pongs → client tears down and reconnects with exponential backoff (1s, 2s, 4s, cap 10s).

**Reconnect protocol** (R-TE-5, R-TE-6):
- Server persists session state continuously: current stage, current upgrade item, elapsed time, item log so far.
- Client reconnects with its session ID and resumes at the same stage. Server re-attaches to (or re-opens) the Gemini connection with a compact state summary (R-TE-4 pattern) — **never by resending prior audio**, which would be re-billed.
- Target: a drop loses at most 10 seconds of conversation.

### Barge-in (R-SE-8 / R-TE-2)

- Client VAD detects learner speech locally and does two things at once: starts streaming audio upstream **and** immediately stops local playback of May's audio.
- Backend forwards an interrupt signal to Gemini Live so the model stops generating.
- The 300ms budget is met on the client (stop playback is local, ~10ms); the upstream cancellation just stops wasted billing.

### Latency budget (end of learner speech → first audio out of speaker)

| Hop | Estimate |
|---|---|
| Client VAD detects end of speech | 100–200ms (VAD hangover window) |
| Last audio frame browser → backend (Yangon → Singapore) | 30–60ms |
| Backend → Gemini Live (same region) | 5–20ms |
| Gemini: think + first audio chunk | 400–600ms |
| First audio chunk back to browser + playback start | 40–80ms |
| **Total** | **~575–960ms** |

Fits under 1 second, with little slack. The two levers if we run hot: shorten the VAD hangover window, and verify Gemini Live serves from Singapore (not a US region — that would add ~180ms × 2 and break the budget).

### Graceful degradation (R-TE-9)

If the Gemini connection cannot be established or dies repeatedly mid-session: the backend switches the client into a **text-based review session** (review queue items, typed answers) with a Burmese explanation — never a hard error. A learner who hits an error wall on their streak day is a churn risk.

## Alternatives considered

- **Direct browser → Gemini Live** — lowest latency (~100–200ms saved). Rejected because the D-011 item log and R-TE-8 token metering would depend on the flaky client reporting back, and we would need to build short-lived token issuance. Kept as the documented fallback if the week-one spike shows the proxy blows the latency budget.
- **WebRTC (DIY on Fly.io)** — best audio quality on bad networks (jitter buffer, packet-loss concealment, UDP). Rejected for MVP: ~1.5–2 weeks build, a media server + TURN server to operate, and a second deploy platform. A solo founder in month one should not become a media-server ops team.
- **WebRTC (managed, LiveKit Cloud)** — same quality, ~3–5 days build, ~$50–100/month at target scale. The strongest alternative. Rejected for now to stay one-platform and $0; documented as the upgrade path if real-world Myanmar testing shows WebSocket audio is too choppy.
- **HTTP chunked streaming (MediaRecorder + SSE)** — simplest possible. Rejected: barge-in is effectively impossible (breaks R-SE-8) and per-turn overhead (~200–400ms) likely breaks R-TE-1.
- **Hosting on Vercel (native WebSocket beta)** — zero-config deploys, keeps Vercel Blob. Rejected after research (2026-09-07): function max duration force-closes the socket every 5 min (Hobby) / ~13 min (Pro), causing mid-conversation drops and Gemini re-attach costs; the 30-min duration and the Next.js WebSocket API are both beta/experimental. Revisit if Vercel ships GA WebSockets with ≥30-min connections.
- **Vercel app + tiny WebSocket relay on Railway** — keeps Vercel DX for the web app. Rejected: two platforms and two deploys for a solo founder, when Railway alone can host everything.
- **TypeScript-only backend (Next.js full-stack or Node + LangGraph JS)** — one language, one service, fastest to ship; LangGraph does exist in JS. Rejected 2026-09-07: Python LangGraph is the first-class version, the Python AI ecosystem is stronger for what comes after MVP, and the founder is deliberately investing in Python/FastAPI. Cost accepted: two services, slower week one while learning.

## Trade-offs

- **~100–200ms of latency spent on the proxy hop**, bought back in server-side item log, metering, and key safety. Leaves little slack in the 1s budget.
- **TCP transport on flaky mobile:** WebSocket rides TCP, so packet loss causes retransmit stalls (audio choppiness) instead of graceful dropouts. WebRTC would handle this better; we accept the risk and let real-world testing decide.
- **Single region (Singapore):** an outage there takes the product down. Acceptable at 50 users; revisit at 10× scale.
- **Vendor lock-in on Gemini Live:** the D-011 item-log trick and the single STT+LLM+TTS model are Gemini-specific. Switching providers later means redesigning the pipeline, not swapping a URL.
- **Two services and two languages:** frontend (TS) and backend (Python) split the original monolith idea into "one repo, two services." CORS/auth wiring between them, and the founder is learning FastAPI + WebSockets while building the most latency-critical piece. Accepted as a deliberate learning investment.

## Open questions
- [ ] Which Gemini Live serving region actually answers from Singapore? Measure in the week-one spike; the latency budget assumes same-region. (Owner: Larry)
- [x] ~~Can Vercel hold a 30-min WebSocket?~~ Resolved 2026-09-07: no — max duration force-closes it (5 min Hobby / ~13 min Pro; 30 min beta-only). Whole monolith moves to Railway Singapore. See "Hosting" section.
- [ ] Gemini Live rate limits and per-connection session caps — what happens at 10 concurrent sessions? (Owner: Larry)
- [ ] Exact client VAD library and hangover tuning (affects both latency and billed silence). (Owner: Larry)
- [ ] Opus bitrate choice: quality vs Myanmar mobile bandwidth. (Owner: Larry)

## Local development
Both services run natively on a laptop with full dev/prod parity — FastAPI (`uvicorn`) and Next.js (`npm run dev`) are the same processes Railway runs. Gemini Live is reached with a dev API key from `.env`. One gotcha: the mic API requires HTTPS except on `localhost`, so testing on a real phone needs a tunnel (`npx cloudflared tunnel --url http://localhost:8000`) — which is also how the week-one Myanmar-mobile latency measurement runs before anything is deployed.

## Rollout / next steps
- [ ] **Week-one spike (D-011, D-045):** thin prototype — browser mic → Pipecat/FastAPI proxy → Gemini Live → audio back, with the structured item log and per-stage token metering. Verify D-045's two exit criteria: **barge-in <300ms** (watch for pipecat-ai/pipecat issue #3381 on Gemini interruption handling) and **end-to-end latency <1s** on real Myanmar-style mobile. No UI polish. This is also the founder's first FastAPI + WebSockets + Pipecat build — budget extra time for learning.
- [ ] Measure the real latency budget from a Myanmar mobile connection (or simulated 4G with packet loss) against the table above.
- [ ] Decision gate: if Pipecat blows either D-045 exit criterion, swap to the raw-asyncio + `google-genai` fallback (D-045). If end-to-end > 1s at p75 even on the fallback, revisit the direct-from-browser design; if audio is too choppy, revisit LiveKit Cloud.
- [x] Log the stack decisions in the decisions log — done: D-035, D-036, D-037, D-038.
- [ ] Then draft `03-audio-storage.md` (Cloudflare R2 — switched from Vercel Blob when hosting moved to Railway) — recording is a hard dependency of the marketing asset (R-ON-7).
