---
type: Tickets
title: ABET-11 tickets
status: draft
---
# Tickets — ABET-11 Week-one spike: voice pipeline prototype

Source of truth is this file. Sync to GitHub Issues under the ABET-11 parent after Larry approves (Step 3).
Each ticket is a vertical slice — a demoable piece of the spike, not a "make the folder" chore.

| id | title | blocked by | scenarios covered | tracker | status |
|---|---|---|---|---|---|
| T1 | Scaffold FastAPI + Pipecat + Gemini Live minimum voice loop | — | R1 S1 | [#12](https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/12) | done (wiring proven; real log_item awaits T2 audio) |
| T2 | Next.js client — mic capture + Silero VAD + PCM WebSocket streaming | T1 | R1 S1, R1 S3, R3 S1 | [#13](https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/13) | todo |
| T3 | Barge-in path — client VAD-fires + local playback stop + upstream interrupt frame | T1, T2 | R2 S1, R2 S2 | [#14](https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/14) | todo |
| T4 | Server-side disk capture — learner.raw.pcm, may.raw.pcm, frames.jsonl | T1 | R4 S1, R4 S2 | [#15](https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/15) | todo |
| T5 | iOS Safari detection + Burmese Add-to-Home-Screen modal | T2 | R5 S1, R5 S2 | [#16](https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/16) | todo |
| T6 | `analyze.py` measurement script — reads frames.jsonl, prints 4 numbers | T4 | R6 S1, R6 S2 | [#17](https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/17) | todo |
| T7 | Gemini failure / rate-limit handling — clean end + partial file preservation | T1, T4 | R1 S2, R3 S2 | [#18](https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/18) | todo |
| T8 | Deploy to Railway + rerun measurements from real Yangon phone | T1-T7 | all requirements (verify) | [#19](https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/19) | todo |
| T9 | Burmese native speaker session — schedule + run + write thumbs verdict | T8 | H4 (Burmese quality hypothesis) | [#20](https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/20) | todo |

## Notes per ticket

- **T1** — the scaffold. Just a FastAPI app with a single WebSocket route wired to a Pipecat pipeline with `GeminiLiveLLMService` and the `LLMLogObserver` from the scout's research. Push a hard-coded English "hello" through it, get May's reply back, item log appears in stdout. That is done.
- **T2** — reads the Silero WASM, PCM-encodes mic audio, streams over WebSocket. Playback path: receive PCM, buffer, feed Web Audio API. Local timestamps for VAD-fires + playback-stop go to a temporary in-memory buffer (persisted at session end by T4's coordinator).
- **T3** — the hardest ticket. Client-side barge-in logic runs on the VAD's `user-started-speaking` event: immediately stop local playback (`audioContext.suspend()`), send an interrupt frame to the backend. Backend forwards to Pipecat, which cancels the Gemini generation. Both timestamps land in the JSONL. Version-pin Pipecat here.
- **T4** — the FastAPI proxy already sees every PCM frame in both directions. Write them to disk raw. Every event Pipecat emits (via the observer) → JSONL line with a monotonic ns clock. Client sends its own clock-aligned events over the WebSocket for merging.
- **T5** — page-load detection: `navigator.userAgent` for iOS + `window.matchMedia('(display-mode: standalone)').matches` for PWA. If iOS-not-PWA → render a Burmese modal blocking the "Start" button, with a screenshot showing the Share button and Add to Home Screen tap. No mic request until dismissed OR reloaded from Home Screen.
- **T6** — pure Python. Reads JSONL, computes item-log arrival rate (item_log events / user_stopped_speaking events), barge-in p95 (bot_stopped_speaking_ts − user_started_speaking_ts, only for events during bot-speaking state), end-to-end p75 (first_bot_pcm_frame_ts − user_stopped_speaking_ts). Prints four labeled lines. Exits 0 on any input (including empty).
- **T7** — try/finally around Pipecat's main loop. On any exception in `pipeline.run()`, log an `error` event to JSONL, flush audio buffers to disk, close the WebSocket with a reason string. No retry logic.
- **T8** — Railway deploy from the same repo. Dockerfile is simple: Python 3.12 image, `uv sync`, `uvicorn main:app`. WebSockets work by default on Railway. Environment vars: Gemini API key. Then hit the deployed URL from a Yangon phone and rerun the same test as T1-T7.
- **T9** — schedule with a Burmese-speaking friend on WhatsApp. Share the deployed URL. Ask them to have a 3-5 exchange conversation with May in a mix of Burmese and English. Get a thumbs verdict + one line of commentary. Copy to `qa-report.md`.

## Order of implementation

Recommended path (respects blockers, delivers early feedback):
```
T1 (scaffold, day 1) → T2 (client wire-up, day 1-2)
   → T4 (capture, day 2) [T3 unblocks after this]
   → T3 (barge-in, day 3) [the hardest]
   → T6 (analyze.py, day 3) [uses whatever data T4 already produces]
   → T7 (error handling, day 4)
   → T5 (iOS modal, day 4) [independent, do while brain is tired]
   → T8 (Railway deploy, day 5)
   → T9 (Burmese speaker, day 5-6)
```

Total: ~5-6 focused days. Buffer 1-2 days for learning (first FastAPI + Pipecat + WebSockets build).
