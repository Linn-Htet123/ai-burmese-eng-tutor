# Voice pipeline — how the learner and May talk in real time

**Status:** Approved (2026-09-07)
**Author:** Larry (Thar Linn Htet)
**Last updated:** 2026-09-13
**Diagram:** [source](diagrams/02-voice-pipeline.excalidraw) · [preview](diagrams/02-voice-pipeline.svg)

## What this doc covers

This is how the learner's voice reaches May and how May's voice comes back — **fast enough to feel like a real conversation.** Everything about audio *files* (saving, playback) is a separate doc: `03-audio-storage.md`.

## Requirements this implements
- `R-TE-1` — May's voice starts within **1 second** after the learner stops talking
- `R-TE-2` — the learner can cut May off; May stops within **300ms** (same as R-SE-8)
- `R-TE-3` — the browser only sends audio while the learner is actually speaking (silence is billed as audio)
- `R-TE-5` — if the connection drops, we don't resend old audio
- `R-TE-6` — session state is saved constantly; a dropped connection loses **at most 10 seconds**
- `R-TE-7` — the AI model tells us what happened each turn; we don't run a separate transcription
- `R-TE-8` — every session logs its token cost per stage, from day one
- `R-TE-9` — if the AI is down, we fall back to a **text review session**, never an error screen
- `R-SE-8` — same as R-TE-2 (barge-in)

## Related decisions
- `D-011` — the AI model emits a **structured item log** alongside its audio. No separate transcription stream. This removes ~45% of session cost. **Must be prototyped in week one.**
- `D-035` — voice runs **through our backend**, not browser-direct
- `D-036` — **WebSocket** with a heartbeat, not WebRTC
- `D-037` — hosted on **Railway Singapore**, not Vercel
- `D-038` — **Next.js frontend + FastAPI backend** (Python)
- `D-042` — sessions are **40 minutes**, up to one per day (subscription)
- `D-045` — **Pipecat** carries the audio (built-in `GeminiLiveLLMService`, voice activity detection, interruption). Raw asyncio + `google-genai` stays as our documented backup

## The problem

Every session is 40 minutes of spoken English (D-042). The teaching method — retrieval practice under time pressure — only works if it **feels like a conversation**, not a walkie-talkie with lag.

Every turn does the same four things:

```
Learner speaks → AI hears → AI thinks → May speaks back
```

**Three hard constraints:**
- **Under 1 second** total, end of learner speech to start of May's voice (R-TE-1).
- Learners are on **cheap Android phones on Myanmar mobile data**. Connections drop — assume it (R-TE-6).
- Every second of audio in or out **costs money** (BRD cost model). Silence, resent audio, and separate transcription streams are all cost leaks (R-TE-3, R-TE-5, D-011).

## The design

**A proxied pipeline. Browser talks to our backend over WebSocket. Our backend talks to Gemini Live over WebSocket. Everything in one region (Singapore), on one host (Railway).**

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

One Gemini Live connection per live session. The backend owns it. **The browser never sees a Google API key.**

### Why the backend sits in the middle

Three reasons, all cost or safety:

1. **The D-011 item log lands on the backend.** Gemini sends a structured report along with May's audio — what she said, what phrase she offered, whether the learner repeated it, timing. The backend grabs it and writes it to Postgres in the same process. If the browser talked to Gemini directly, this log would have to bounce back from a flaky phone.
2. **Token metering (R-TE-8) is counted as it passes through.** Every BRD cost figure is a guess until real logs exist. Counting in the proxy makes it impossible to skip.
3. **API keys stay on the server.** No short-lived browser tokens to build.

**Cost of the middle hop:** ~50–150ms. See the latency budget below — it fits.

### Why Railway Singapore, not Vercel

Researched 2026-09-07. Vercel added WebSocket support in June 2026 (public beta) — but their functions have a **max duration** that force-closes the connection:

- **Hobby: 5 minutes.**
- **Pro: ~13 minutes.**
- **30 minutes:** only behind a separate beta flag.

Our sessions are 40 minutes (D-042). That means **3 to 8 forced disconnects per session**, each one making us re-attach to Gemini (audio gap + extra billed state-summary tokens — against the spirit of R-TE-5). On top of that, Next.js needs an `experimental_upgradeWebSocket()` API — experimental, on top of a beta.

Third-party analysis (Ably) and Vercel's own guidance agree: for long-lived realtime AI voice, use a **persistent server** or a **managed realtime provider**.

**So:** two services on Railway Singapore. A Next.js frontend and a FastAPI (Python) backend. The FastAPI service is a plain long-running process. It holds the 40-minute learner WebSocket (D-042), owns the Gemini Live connection (via Pipecat, D-045), and later runs the LangGraph work (plan generation, item log processing, placement scoring). One platform, two deploys, **~$10–25/month** at MVP scale. The founder already runs Railway for another product.

**Why Python for the backend:**
- **LangGraph** is Python-first and fits our session-stage state machine and slow-brain work.
- **Pipecat** (also Python) carries the hot-path voice loop (D-045). It gives us the FastAPI WebSocket transport, `GeminiLiveLLMService`, client VAD, and interruption handling — most of what we would otherwise hand-write.
- **The founder is deliberately learning Python + FastAPI.**

D-045 sets two exit criteria for Pipecat in the week-one spike: **barge-in <300ms** (R-TE-2 / R-SE-8) and **end-to-end <1s** (R-TE-1). These enforce the older "no framework in the hot path" rule — nothing between learner and Gemini can add silent delay. If Pipecat misses either target, we fall back to raw asyncio on Google's `google-genai` SDK. Documented, ready.

**Storage consequence:** audio files go to Cloudflare R2 (S3-compatible, zero egress fees), not Vercel Blob. Details in `03-audio-storage.md`.

### Transport: WebSocket + heartbeat + reconnect

Browser ↔ backend runs one WebSocket. It carries:

**Going up (browser → backend):**
- **PCM audio** — 16-bit, 16 kHz, mono, ~20 ms frames — **only while the client VAD detects speech** (R-TE-3). Gemini Live only accepts PCM (no Opus decode step in the hot path).
- Control messages (stage events, pause, Burmese-help button)

**Coming down (backend → browser):**
- May's audio chunks
- Transcript fragments for the live on-screen transcript (R-SE-6)
- Stage / state updates

**Heartbeat protocol** (required — silent middlebox disconnects happen on mobile carriers and CDNs):
- Client sends `ping` every 20s. Server replies `pong` within 5s.
- Two missed pongs → the client tears down and reconnects with exponential backoff (1s, 2s, 4s, cap 10s).

**Reconnect protocol** (R-TE-5, R-TE-6):
- Server persists session state continuously: current stage, current upgrade item, elapsed time, item log so far.
- Client reconnects with its session ID and picks up at the same stage. Server re-attaches (or re-opens) the Gemini connection using a compact state summary (R-TE-4 pattern) — **never by resending prior audio**, which would be re-billed.
- Target: a drop loses at most **10 seconds** of conversation.

### Barge-in (R-SE-8 / R-TE-2)

When the learner interrupts May:
- **Client VAD** detects learner speech locally. Two things happen at once: audio starts streaming up, AND local playback of May's audio stops.
- **Backend** forwards an interrupt signal to Gemini so the model stops generating.
- The 300ms budget is met **on the client** (local playback stop is ~10ms). The upstream cancel just stops wasted billing.

### Latency budget

End of learner speech → first audio out of the speaker:

| Hop | Estimate |
|---|---|
| Client VAD detects end of speech | 100–200ms (VAD hangover window) |
| Last audio frame browser → backend (Yangon → Singapore) | 30–60ms |
| Backend → Gemini Live (same region) | 5–20ms |
| Gemini: think + first audio chunk | 400–600ms |
| First audio chunk back to browser + playback start | 40–80ms |
| **Total** | **~575–960ms** |

Fits under 1 second, with little slack. If we run hot, two levers: **shorten the VAD hangover window**, and **verify Gemini Live serves from Singapore** (a US region would add ~180ms × 2 and break the budget).

### If Gemini dies (R-TE-9)

If the Gemini connection won't establish, or dies repeatedly mid-session:
- Backend switches the client into a **text-based review session** (review queue items, typed answers), with a Burmese explanation.
- **Never** a hard error. A learner who hits an error wall on their streak day is a churn risk.

## Alternatives we considered

- **Browser → Gemini directly.** Fastest (saves ~100–200ms). Rejected: the D-011 item log and R-TE-8 token metering would depend on the flaky client reporting back, and we'd need to build short-lived token issuance. Kept as the fallback if the week-one spike shows the proxy blows the latency budget.
- **WebRTC (DIY on Fly.io).** Best audio on bad networks (jitter buffer, packet-loss concealment, UDP). Rejected for MVP: ~1.5–2 weeks build, plus a media server + TURN server to operate, plus a second deploy platform. A solo founder in month one shouldn't become a media-server ops team.
- **WebRTC (managed, LiveKit Cloud).** Same audio quality as DIY WebRTC, ~3–5 days build, ~$50–100/month at target scale. The strongest alternative. Rejected for now to stay on one platform and $0. Documented as the upgrade path if real Myanmar testing shows WebSocket audio is too choppy.
- **HTTP chunked streaming (MediaRecorder + SSE).** Simplest possible. Rejected: barge-in becomes effectively impossible (breaks R-SE-8), and per-turn overhead (~200–400ms) likely breaks R-TE-1.
- **Vercel with native WebSockets (beta).** Zero-config deploys, keeps Vercel Blob. Rejected after research 2026-09-07: max duration force-closes the socket every 5 min (Hobby) / ~13 min (Pro); the 30-min mode and the Next.js WebSocket API are both beta/experimental. Revisit if Vercel ships GA WebSockets with ≥30-min connections.
- **Vercel app + tiny WebSocket relay on Railway.** Keeps Vercel DX for the web app. Rejected: two platforms and two deploys for a solo founder, when Railway alone can host everything.
- **TypeScript-only backend (Next.js full-stack or Node + LangGraph JS).** One language, one service, fastest to ship. Rejected 2026-09-07: Python LangGraph is the first-class version, the Python AI ecosystem is stronger for what comes after MVP, and the founder is deliberately investing in Python/FastAPI. Cost accepted: two services, slower week one.

## Trade-offs

- **~100–200ms spent on the proxy hop.** Bought back in server-side item log, metering, and key safety. Leaves little slack in the 1s budget.
- **TCP transport on flaky mobile.** WebSocket rides TCP, so packet loss causes retransmit stalls (audio choppiness) instead of graceful dropouts. WebRTC would handle this better; we accept the risk and let real-world testing decide.
- **Single region (Singapore).** An outage there takes the product down. Acceptable at 50 users; revisit at 10× scale.
- **Vendor lock-in on Gemini Live.** The D-011 item-log trick and the single STT+LLM+TTS model are Gemini-specific. Switching providers later means redesigning the pipeline, not swapping a URL.
- **Two services, two languages.** Frontend (TS) and backend (Python) split the original monolith into "one repo, two services." CORS/auth wiring between them, and the founder is learning FastAPI + WebSockets while building the most latency-critical piece. Accepted as a deliberate learning investment.

## Open questions
- [ ] Which Gemini Live region actually answers from Singapore? Measure in the week-one spike; the latency budget assumes same-region. (Owner: Larry)
- [x] ~~Can Vercel hold a 30-min WebSocket?~~ Resolved 2026-09-07: no — max duration force-closes it (5 min Hobby / ~13 min Pro; 30 min beta-only). Whole monolith moves to Railway Singapore.
- [ ] Gemini Live rate limits and per-connection session caps — what happens at 10 concurrent sessions? (Owner: Larry)
- [ ] Exact client VAD library and hangover tuning (affects both latency and billed silence). (Owner: Larry)
- [x] ~~Opus bitrate choice~~ Resolved 2026-09-13: browser sends raw PCM 16-bit @ 16 kHz — Gemini Live requires PCM input, so Opus on the wire would need a decode step (~46 ms lost). Opus stays as the R2 storage format (encoded server-side at session end — see `03-audio-storage.md`).

## Local development

Both services run natively on a laptop with full dev/prod parity — FastAPI (`uvicorn`) and Next.js (`npm run dev`) are the same processes Railway runs. Gemini Live is reached with a dev API key from `.env`.

**One gotcha:** the microphone API requires HTTPS except on `localhost`. Testing on a real phone needs a tunnel:

```
npx cloudflared tunnel --url http://localhost:8000
```

That tunnel is also how the week-one Myanmar-mobile latency measurement runs before anything is deployed.

## Rollout / next steps

- [ ] **Week-one spike (D-011, D-045).** Thin prototype: browser mic → Pipecat/FastAPI proxy → Gemini Live → audio back. With the structured item log and per-stage token metering wired in. Verify D-045's two exit criteria: **barge-in <300ms** (watch pipecat-ai/pipecat issue #3381 on Gemini interruption handling) and **end-to-end latency <1s** on real Myanmar-style mobile. No UI polish. This is also the founder's first FastAPI + WebSockets + Pipecat build — budget extra time for learning.
- [ ] Measure the real latency budget from a Myanmar mobile connection (or simulated 4G with packet loss) against the table above.
- [ ] **Decision gate:** if Pipecat blows either D-045 exit criterion, swap to the raw-asyncio + `google-genai` fallback. If end-to-end > 1s at p75 even on the fallback, revisit the browser-direct design. If audio is too choppy, revisit LiveKit Cloud.
- [x] Log the stack decisions — D-035, D-036, D-037, D-038.
- [ ] Then draft `03-audio-storage.md` (Cloudflare R2 — switched from Vercel Blob when hosting moved to Railway). Recording is a hard dependency of the marketing asset (R-ON-7).
