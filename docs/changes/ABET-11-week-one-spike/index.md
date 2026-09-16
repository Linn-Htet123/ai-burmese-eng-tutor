---
type: Change
title: ABET-11 Week-one spike: voice pipeline prototype
status: draft
stage: ready
resource: https://github.com/Linn-Htet123/ai-burmese-eng-tutor/issues/11
tags: []
generated: { by: claude-code, at: 2026-09-14 }
---
# ABET-11 — Week-one spike: voice pipeline prototype

One folder = one ticket. The files link to each other, so an agent can read
only this folder (a sub-graph), not all of `docs/`.

| Step | File | Status |
|---|---|---|
| 1 Intent | [proposal.md](proposal.md) | draft |
| 2 Research | [research.md](research.md) | draft |
| 2 Spec | [spec.md](spec.md) | draft |
| 2 Design | [design.md](design.md) | draft |
| 4 Tickets | [tickets.md](tickets.md) | draft |
| 5 QA | [qa-report.md](qa-report.md) | not run |

## Stage log
- 2026-09-14 — intent: folder created from ticket ABET-11
- 2026-09-15 — spec: 12-question grilling complete, proposal + spec + design + tickets drafted
- 2026-09-15 — ready: 18 ready-check gates passed, Larry approved, tickets pushed to GitHub
- 2026-09-16 — implement (T1 in progress): scaffold + observer + tool schema landed, 6 → 12 tests pass, observer wired via `PipelineWorker`
- 2026-09-16 — implement (T1 done): smoke script ran end-to-end against real Gemini Live — connection, system prompt, tool schema all confirmed; `log_item` calls not yet triggered because text-only input doesn't drive Gemini Live's audio-in model. Real `log_item` capture proves out with audio input in T2.

## What lives where

- `apps/api/src/voice/handlers.py` — `LLMLogObserver` (Pipecat `BaseObserver` subclass) + `ItemLogEntry` dataclass + `LOG_ITEM_SCHEMA` (`FunctionSchema` for the `log_item` tool).
- `apps/api/src/voice/pipeline.py` — `create_voice_pipeline(api_key, system_prompt) -> Pipeline` and `create_voice_worker(pipeline, observer) -> PipelineWorker`.
- `apps/api/scripts/smoke_voice_loop.py` — the one-shot script that opens a real Gemini Live connection with a hardcoded turn. Requires `GEMINI_API_KEY` in `apps/api/.env`.
- `apps/api/tests/voice/test_handlers.py` (7 tests) and `apps/api/tests/voice/test_pipeline.py` (4 tests) — all green.

## Next up: T2 (GitHub #13)

Next.js client — mic capture + Silero VAD + PCM WebSocket streaming. See `tickets.md`.
