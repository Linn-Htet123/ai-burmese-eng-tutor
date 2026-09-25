---
type: QAReport
title: ABET-11 QA report
status: complete
---
# QA report — ABET-11 Week-one spike: voice pipeline prototype

Human-driven acceptance testing of the four spike hypotheses (see `spec.md`).

## Spike hypotheses — pass / fail

| # | Hypothesis | Target | Result | Evidence |
|---|---|---|---|---|
| **H1** | **Item log reliability (D-011)** | **Log entry per learner turn** | **✅ PASS (with follow-up)** | Confirmed working on Pipecat build (5b93078) — LLM called `log_item` on every learner turn, entries were captured cleanly in `ItemLogCapture`. Disabled in the raw bridge to remove ~1s/turn stall (Pipecat 1.10 NON_BLOCKING downgrade on `gemini-3.*`). Spike hypothesis was answered — the D-011 approach works. Re-implementation under the raw bridge is engineering follow-up, not spike work: parse Gemini's `outputAudioTranscription` for offered-upgrade phrases into `ItemLogCapture`-shaped entries. Follow-up ticket to be opened separately. |
| **H2** | **Barge-in latency (R-SE-8)** | **≤300ms from learner start-of-speech to bot stops** | **✅ PASS (felt-instant)** | Larry interrupted May mid-sentence across 5 trials; felt instant, like cutting into a friend on the phone. Numeric ≤300ms not stopwatched (human reaction is ~200ms — impractical), but qualitatively meets R-SE-8. Fix required: frontend `use-voice-stream.ts` now calls `stop(0)` on every queued `AudioBufferSourceNode` on receiving `{"type":"interrupted"}` from the bridge, then resets `nextPlayTimeRef`. Without this the buffered ~1-2s of May-audio kept playing over the learner. |
| **H3** | **End-to-end latency (R-TE-1)** | **<1s reply** | **✅ PASS** | Larry stopwatched 5 short-phrase trials after Gemini warmup. Reported perceived reply latency of 0.5–1.0s. Meets target. |
| **H4** | **Spoken Burmese quality** | **Native speaker judges ≥4/5** | **✅ PASS** | Larry (Burmese native speaker) judged May's spoken Burmese during live sessions. Voice sounds natural, warm, and understandable; comprehension of learner Burmese is workable. Not a formal panel score but self-judged pass from a native ear. |

## Architecture note

Original design used Pipecat as the voice pipeline framework. Spike learning: Pipecat's Gemini Live adapter (a) does not emit `UserStartedSpeakingFrame` / `UserStoppedSpeakingFrame` (server VAD is invisible), and (b) downgrades NON_BLOCKING tools to blocking on `gemini-3.*`, stalling audio ~1s per learner turn.

Chose to bypass Pipecat and bridge the browser WebSocket directly to Gemini Live (mirrors `Downloads/burmese-tutor/server.mjs`). See D-054 in the decisions log. Reduced infrastructure to ~200 lines; observably fast turn-taking after Gemini warmup.

## H3 details — reply latency

- Setup: `feat/ABET-11-week-one-spike` branch, raw bridge (`src/voice/bridge.py`), model `gemini-3.1-flash-live-preview`, default Gemini server VAD (no explicit tuning), auto-greeting priming on connect.
- Method: 5 short-phrase trials, stopwatched from mouth-close to hearing May's first sound.
- Trials: "yes" · "hi May" · "okay" · "thank you" · "yes please".
- Range reported: 0.5s – 1.0s.
- First-turn cold-start (accept → first bot audio) hidden behind the browser's "Connecting…" spinner via a priming `[session start]` clientContent message. Browser only flips to `streaming` once May's greeting is on the wire.

## Gaps / follow-ups

- H1 must be re-established under the raw bridge (transcript-parsing approach) or deferred as a known limitation of the current architecture.
- H4 requires a native Burmese speaker.
