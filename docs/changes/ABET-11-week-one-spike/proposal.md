---
type: Proposal
title: ABET-11 Week-one spike: voice pipeline prototype
status: draft
resource: https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/11
sources:
  - id: linear
    resource: https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/11
    title: Ticket ABET-11
---
# Proposal — ABET-11 Week-one spike: voice pipeline prototype

## Why

The whole design assumes four numbers will hold in reality: item log emitted by Gemini (**D-011**), barge-in ≤ 300 ms (**R-SE-8**), end-to-end voice latency < 1 s at p75 (**R-TE-1**), and May's Burmese sounds right. Those numbers are guesses on paper. Every build phase after this (session engine, auth, payments, content, launch) rests on them being true — so building any of it before the spike measures them is expensive if the design turns out wrong. This is also the founder's first real Pipecat + FastAPI + WebSockets build, so the spike doubles as a learning phase.

## What changes

Build a **thin end-to-end vertical slice** of one voice turn: browser mic → client-side VAD (`@ricky0123/vad-web` Silero v6) → WebSocket → FastAPI backend on Railway Singapore → Pipecat's `GeminiLiveLLMService` → Gemini Live → PCM audio back → speaker. Server-side captures the structured item log and per-stage token metering. Barge-in works. Run it on a real Yangon phone through a `cloudflared` tunnel to a laptop, then again from a real Railway deploy, and measure the four numbers.

**What does NOT change:** no session engine (LangGraph), no auth, no payments, no content pack, no real UI polish, no post-session pipeline, no persistent audio recordings to R2 in this spike (recording tests come after — the spike touches the audio path only enough to prove the loop closes). The spike is throwaway code by design — a proof, not a foundation. The production build starts from a clean slate after the spike's decisions are logged in `05-decisions-log.md`.

## Key unknowns
- **U1**: Does Gemini Live serve from Singapore, or is it routed through Tokyo/US? Determines whether end-to-end latency can hit p75 < 1s from Yangon.
- **U2**: Does the current Pipecat release actually include PR #3429 (barge-in fix for issue #3381)? If not, barge-in cannot hit ≤300ms regardless of everything else.
- **U3**: Does `@ricky0123/vad-web` (Silero v6) actually crash on real Myanmar-market iPhones, or is issue #134 only on older devices? Determines whether the Add-to-Home-Screen fallback triggers rarely or always.
- **U4**: Does May's Burmese from Gemini Live sound natural to a native Burmese speaker, or does it feel like a robot? No amount of code tuning fixes this if the answer is "robot" — a model swap or provider swap is the only fix.

## Hypotheses (each one measurable in the spike)
- H1: metric: item_log arrival rate (item_log events / user_stopped_speaking events in frames.jsonl); from: unknown (never measured against Gemini Live); to: ≥ 95%; within: 5 days (spike duration); flag: none
- H2: metric: barge-in latency p95 in ms (client stop-playback − client user-started-speaking, from frames.jsonl); from: unknown (Pipecat PR #3429 not yet exercised in this stack); to: ≤ 300ms; within: 5 days; flag: none
- H3: metric: end-to-end latency p75 in ms (client first-audio-in − client user-stopped-speaking, from frames.jsonl); from: US-region baseline ~320ms p50 / ~780ms p95 (from scout research, not our stack); to: ≤ 1000ms from Yangon; within: 5 days; flag: none
- H4: metric: Burmese naturalness (single Burmese native speaker thumbs up/down at spike end); from: unknown (no prior test); to: thumbs-up; within: 5 days; flag: none

## Decision log
| # | Question | Options considered | Selected | Why the others were rejected |
|---|---|---|---|---|
| D1 | Who tests the spike? | Solo / Solo + 1 Burmese speaker / Panel | Solo + 1 Burmese speaker at end | Solo alone leaves H4 open; panel is over-engineered for a week-one |
| D2 | What counts as "one turn end-to-end"? | Single exchange / 3-5 exchange conversation / Full 40-min session | 3-5 exchange conversation | Single exchange too shallow for barge-in + state; full session blurs spike-vs-real-build line |
| D3 | What does "spike done" mean? | All 4 must pass / All 4 must be measured | All 4 measured (pass or fail) | "Must pass" makes the spike open-ended when a number fails; measured lets us close cleanly and open a follow-up |
| D4 | May persona in the spike? | Full persona + item log / Minimal echo / Hybrid | Full persona + item log | Item log is one of the 4 numbers; testing without it tests a different product |
| D5 | Capture audio during spike? | Nothing / Local disk only / Local + JSONL frame log | Local + JSONL frame log | Two of four numbers are timing measurements; without JSONL you cannot compute them post-hoc |
| D6 | iOS coverage in the spike? | Android only / Android + iOS with fallback / Android + iOS crash-and-learn | Android + iOS with graceful fallback | Founder call — iOS learners covered from day one; fallback is a modal, not a whole code path |
| D7 | Where do measurement timestamps live? | All in JSONL / Live dashboard + JSONL / Console printf only | JSONL only | No UI code in a throwaway spike; JSONL + `analyze.py` gives p50/p95 without display work |
| D8 | Handle Gemini rate limits / failures how? | Log-and-end cleanly / Auto-retry with backoff / Fall back to text mode | Log-and-end cleanly | Retry hides the error you want to see; text-mode fallback is way over spike scope |
| D9 | Deploy sequence? | Tunnel first then Railway / Railway first / Both in parallel | Cloudflared tunnel first, then Railway | Two independent measurement points; tunnel is faster to iterate; Railway-specific issues stay isolated |
| D10 | Pass/fail thresholds per number? | PRD targets exactly / Softer spike bars / No thresholds | PRD targets exactly | The spike is measuring reality vs the plan; bar = plan |
| D11 | Content for May in the spike? | One authored unit / Ad-hoc conversational tutor / Scripted script | Ad-hoc conversational tutor | Founder is thinking a content-strategy pivot; committing to an authored unit for a spike whose content might change is wasted work |
| D12 | iOS Safari fallback UX? | Add-to-Home-Screen prompt (Burmese) / Push-to-talk (no VAD) / Hard block ("use Android") | Add-to-Home-Screen prompt | Preserves barge-in UX on iOS; hard-block contradicts the iOS-coverage decision (D6) |

## Links
- Research: [research.md](research.md)
- Spec: [spec.md](spec.md)
- Design: [design.md](design.md)
