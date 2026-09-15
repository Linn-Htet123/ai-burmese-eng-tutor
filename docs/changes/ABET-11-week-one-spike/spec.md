---
type: Spec
title: ABET-11 spec
status: stable
resource: https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/11
---
# Spec — ABET-11 Week-one spike: voice pipeline prototype

## Purpose

When this is done: Larry has run at least three 3-5 exchange voice conversations with May (one on cloudflared tunnel + laptop, one on Railway-deployed backend, one with a Burmese native speaker at the end) and produced a report with four measured numbers — item-log reliability, barge-in p95, end-to-end p75, and a native-speaker thumbs-up-or-down for Burmese quality — plus a decision recommendation for the next map (proceed / apply-fallback / redesign).

## Out of scope

- Session engine / LangGraph slow brain (04-session-engine.md) — spike does not run the 6-stage session shape
- Auth / login / password (07-auth-and-consent.md) — sessions are anonymous, keyed by a random session id
- Payments / subscriptions (08-payments.md)
- R2 audio persistence (03-audio-storage.md) — local disk only, deleted daily
- LangGraph planner / processor / level judge — no post-session processing
- Content authoring against a real pack (06-content-format.md) — ad-hoc conversational tutor only
- Notifications, Telegram bot, emails (09-notifications.md)
- Data model / Postgres for real (05-data-model.md) — SQLite file for the item log if needed, or in-memory
- UI polish, styling, marketing site — one page with a "Start" button and status text is enough

## User stories

1. As **Larry the founder**, I want to run a 3-5 exchange voice conversation with May from my Android Chrome browser via cloudflared tunnel, so that I can hear whether the loop feels like a real conversation.
2. As **Larry the founder**, I want to run the same conversation from my Android Chrome browser against a Railway-deployed backend, so that I can compare deploy-vs-local numbers.
3. As **an iPhone Safari user**, I want to see a clear Burmese instruction to "Add to Home Screen" before the mic is requested, so that I do not hit the WASM crash and quit.
4. As **Larry the founder**, I want the measurement script to print the 4 numbers from a session's captured files, so that I can decide whether to proceed or apply a fallback without listening to 40 minutes of audio.
5. As **the Burmese native speaker friend**, I want to take a 3-5 exchange conversation on my own phone at the end of the spike, so that I can give Larry a thumbs-up-or-down on May's Burmese naturalness.

## ADDED Requirements

### Requirement: One voice turn works end-to-end

The system SHALL complete one full turn of the upgrade loop — learner speaks, VAD detects end-of-speech, PCM audio streams to Gemini Live via the FastAPI + Pipecat proxy, May's PCM audio streams back with a structured item-log event, and the item log is written to a JSONL frame log — with p75 total latency ≤ 1000ms measured from client-side.

#### Scenario: S1 happy — normal turn
- **GIVEN** the FastAPI + Pipecat + Gemini Live pipeline is running and the browser has an active WebSocket
- **WHEN** the learner speaks one English sentence and the client VAD detects speech-end
- **THEN** May speaks a response within 1000ms p75, and one `item_log` event lands in the session's `frames.jsonl` with the practiced phrase, offered upgrade, and grade.

#### Scenario: S2 edge — Gemini failure mid-turn
- **GIVEN** an active session with the pipeline running
- **WHEN** Gemini Live returns an error or drops the connection mid-turn
- **THEN** the FastAPI proxy logs the failure to `frames.jsonl`, closes the browser WebSocket cleanly, and preserves the partial audio + JSONL files in `/tmp/{session_id}/`.

#### Scenario: S3 edge — VAD does not fire (soft speech)
- **GIVEN** the learner speaks below the VAD threshold
- **WHEN** no speech-end event fires within a 30-second window
- **THEN** the session stays alive, no upstream audio is sent (billing protection), and the UI shows a "listening — try speaking louder" hint in Burmese.

### Requirement: Barge-in works within 300ms

The system SHALL stop May's local playback and send an interrupt signal upstream within 300ms p95 of client VAD detecting learner speech during May's turn.

#### Scenario: S1 happy — clean barge-in
- **GIVEN** May is actively speaking a response
- **WHEN** the learner starts speaking (client VAD fires `user-started-speaking`)
- **THEN** May's local audio playback stops within 300ms p95, an interrupt frame is sent to Pipecat, and the JSONL frame log records both timestamps.

#### Scenario: S2 edge — false barge-in from background noise
- **GIVEN** May is actively speaking
- **WHEN** background noise triggers the VAD but no real speech follows
- **THEN** playback stops (correct behaviour), but within 500ms the VAD returns to silent and May resumes on her next turn — the JSONL logs the false-positive count for post-hoc analysis.

### Requirement: Multi-turn conversation works

The system SHALL maintain state across 3-5 exchanges within a single WebSocket session — meaning May's context includes prior turns (via Pipecat's LLM state), timestamps are contiguous in the JSONL log, and no exchange is lost mid-conversation under normal network conditions.

#### Scenario: S1 happy — 5 turns end to end
- **GIVEN** a fresh session
- **WHEN** the learner and May exchange 5 conversational turns including at least one barge-in
- **THEN** all 5 turns appear in `frames.jsonl` with monotonically increasing timestamps, and May's final response references at least one detail from an earlier turn.

#### Scenario: S2 edge — mid-conversation connection drop
- **GIVEN** an active session at turn 3
- **WHEN** the WebSocket drops (e.g. cloudflared tunnel restarts)
- **THEN** the session ends cleanly, the partial JSONL up to turn 3 is preserved, and the browser shows a Burmese "session ended — please restart" message.

### Requirement: Local capture works

The system SHALL write two raw PCM tracks (`learner.raw.pcm`, `may.raw.pcm`) and one `frames.jsonl` file to `/tmp/{session_id}/` during every session, allowing post-hoc audio replay and timing analysis.

#### Scenario: S1 happy — files present and valid at session end
- **GIVEN** a completed 3-5 turn session
- **WHEN** the session ends via any path (clean stop, Gemini failure, connection drop)
- **THEN** all three files exist in `/tmp/{session_id}/`, the PCM tracks are playable via `ffmpeg`, and the JSONL parses without errors.

#### Scenario: S2 edge — mid-session process crash
- **GIVEN** a session at turn 2 of 5
- **WHEN** the FastAPI process crashes
- **THEN** the partial `learner.raw.pcm`, partial `may.raw.pcm`, and partial `frames.jsonl` remain on disk — enough to reconstruct what happened up to the crash.

### Requirement: iOS Safari fallback works

The system SHALL detect iOS Safari (not-in-PWA mode) on page load and show a Burmese "Add to Home Screen" modal instead of requesting mic permission, avoiding the known Silero VAD WASM OOM crash.

#### Scenario: S1 happy — iPhone Safari (not PWA) is blocked with a helpful prompt
- **GIVEN** a page load on iPhone Safari not launched from the Home Screen
- **WHEN** the page finishes loading
- **THEN** a Burmese modal appears with instructions to tap Share → Add to Home Screen, an inline screenshot, and no mic permission is requested.

#### Scenario: S2 edge — iPhone in PWA mode proceeds normally
- **GIVEN** a page load on iPhone Safari launched from the Home Screen (PWA/standalone display mode detected)
- **WHEN** the page finishes loading
- **THEN** the fallback modal does NOT appear, mic permission is requested normally, and the session proceeds like an Android Chrome session.

### Requirement: Measurement rig produces the 4 numbers

The system SHALL provide a standalone `analyze.py` script that reads a session's `/tmp/{session_id}/frames.jsonl` and prints item-log reliability %, barge-in p95 (ms), end-to-end p75 (ms), and the path to the two audio files for a human ear check.

#### Scenario: S1 happy — analyze one completed session
- **GIVEN** a `/tmp/{session_id}/` folder from a completed 5-turn session
- **WHEN** the founder runs `python analyze.py /tmp/{session_id}/`
- **THEN** the script prints four labeled lines with the numbers (or "N/A" for numbers with no data) and exits 0.

#### Scenario: S2 edge — session with zero barge-ins
- **GIVEN** a session where the learner never interrupted May
- **WHEN** `analyze.py` runs on it
- **THEN** barge-in p95 prints as `N/A (no barge-in events)` instead of crashing on an empty percentile calculation.

## How we prove it

- Every scenario id (S1, S2, S3) appears in a test title on the relevant unit or integration test.
- Edge scenarios assert the failure behaviour explicitly — file existence checks, error text checks, no-navigation checks.
- The Burmese speaker session at spike end produces a short written thumbs-up-or-down note in `qa-report.md`.
- The measurement script's output for the three real sessions (tunnel-local, tunnel-Yangon, Railway-Yangon) is copy-pasted into `qa-report.md` verbatim.
