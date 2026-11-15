# Agentic patterns map — where each book pattern lives in the code

**Status:** Approved (2026-11-15)
**Author:** Larry (Thar Linn Htet)
**Last updated:** 2026-11-15

## Requirements this implements
- `R-SE-1`, `R-SE-3`, `R-SE-4`, `R-SE-6`, `R-SE-8`, `R-SE-10` — plan first, a context per stage, pause, transcript, barge-in, complete only with every artefact
- `R-UL-1` to `R-UL-9` — the upgrade loop, gated and flagged
- `R-RV-3`, `R-RV-4`, `R-RV-6`, `R-RV-7`, `R-RV-8` — spacing, reset, caps, review first, grading by delivery
- `R-RC-1`, `R-RC-2`, `R-RC-3` — recap cap and the next-session promise
- `R-LV-8`, `R-LV-9`, `R-LV-10` — level movement as pure code
- `R-FA-1`, `R-FA-4`, `R-FA-5`, `R-FA-6`, `R-FA-10` — step-down, stalls, level review, no failure language, return sessions
- `R-TE-1`, `R-TE-3`, `R-TE-5`, `R-TE-6` — latency, client VAD, no resent audio, reconnect

## Related decisions
- `D-054` TypeScript end to end · `D-055` the book as vocabulary · `D-056` gated function-call item log · `D-057` code follows the change note
- `D-011`, `D-046`, `D-047`, `D-048`, `D-049` still hold

## Context
The founder asked for the build to follow *Agentic Design Patterns* (Antonio Gulli, 2025). This page maps each of its 21 patterns to the module that applies it, so a reader can go from a pattern to the code and back. A pattern that does not earn its place is listed with the reason.

## Decision

### Repo layout
```
apps/web        Next.js + shadcn — Today screen, call screen, three-state voice orb, mic/VAD/playback
apps/voice      Node gateway — WebSocket ↔ Gemini Live, conductor, tool gate, item-log sink
packages/brain  LangGraph.js graphs (planner, processor, judge), guard, memory, prompts
packages/shared zod schemas: levels, stages, items, plan, item-log tools, wire protocol
```

### The map

| # | Pattern (book chapter) | Where | What it does here |
|---|---|---|---|
| 1 | Prompt Chaining | `brain/planner/graph.ts`, `brain/processor/graph.ts` | fetch → pick → compose → validate → save, and gather → grade → queue → recap → stats → complete |
| 2 | Routing | `brain/judge/rules.ts` + `graph.ts` | Rule-based router: promote, demote or hold; only a move reaches the LLM notice node |
| 3 | Parallelization | not used | Processor steps write in order so the checkpoint resumes cleanly; the volume is too small to need it |
| 4 | Reflection | `brain/planner/graph.ts` + `validate.ts` | Producer composes the plan's words, a code Critic checks every PRD rule, the critique goes back, at most 3 attempts |
| 5 | Tool Use | `shared/itemLog.ts`, `voice/geminiStage.ts` | May reports the loop through 8 Gemini Live function calls declared from zod |
| 6 | Planning | `brain/planner/*` | A whole session plan exists before the call starts (R-SE-1); the LLM writes words, code picks items and times |
| 7 | Multi-Agent Collaboration | `voice/conductor.ts` | One specialist context per stage, handing over through notes; supervisor is plain code, not an LLM |
| 8 | Memory Management | `brain/memory/handover.ts`, review queue | Long-term chart (capped 900 chars) + short-term handover (capped 600, newest wins) rebuilt per stage |
| 9 | Learning and Adaptation | `brain/processor/grade.ts`, `brain/judge/*` | Spaced repetition per item, level moves on evidence, weekly prompt loop from flags (D-047) |
| 10 | MCP | not used | No external tools at MVP; the gateway owns all I/O |
| 11 | Goal Setting and Monitoring | `brain/guard/stateMachine.ts`, conductor timers | Shadow state machine per item, soft stage budgets with a wrap-up note |
| 12 | Exception Handling and Recovery | processor checkpointer, `conductor.onStageClosed`, gate | Crash resumes without re-running the queue; one reopen with the same handover; malformed calls blocked, never thrown; log failures never crash a call |
| 13 | Human-in-the-Loop | `pendingReview` path | Invented or unmatched upgrades stay out of the queue until the founder approves (R-UL-9) |
| 14 | Knowledge Retrieval (RAG) | not used | The upgrade pool is small and tagged; selection by tag beats embeddings at this size |
| 15 | Inter-Agent Communication (A2A) | not used | Single process, no remote agents |
| 16 | Resource-Aware Optimization | `brain/model.ts`, stage contexts, client VAD | Fast vs strong model tiers per job, fresh context per stage, capped notes, silence never sent |
| 17 | Reasoning Techniques | planner only | Strong model for the plan; nothing in the hot path waits on reasoning |
| 18 | Guardrails / Safety | `brain/guard/*`, `prompts/stagePrompt.ts`, `web/lib/copy.test.ts` | Tool-use restriction gate, behavioural rules in the prompt, generic-praise list, failure-language string audit |
| 19 | Evaluation and Monitoring | conductor metrics, `flagRatePer100Calls`, debug panel | Response and barge-in times per turn, tokens per session, flag rate; eval suite still to build |
| 20 | Prioritization | `brain/planner/pickItems.ts` | Recap items first, then due items, then new items within the cap |
| 21 | Exploration and Discovery | not used | The curriculum is authored, not discovered |

### One turn, end to end
```
mic ─AudioWorklet 20ms─► downsample 16k ─► EnergyVad ──start──► pre-roll + live PCM ──ws──► gateway ──► Gemini Live
                                                    └─end────► {vad:false} ──► audioStreamEnd (flush) ─┘
Gemini ─toolCall offer_upgrade─► guard.applyToolCall ─► blocked? instruction back : ok + upgrade card to browser
Gemini ─audio─► gateway (first byte ⇒ responseMs) ─ws─► PcmPlayer;  interrupted ⇒ flush (bargeInMs)
```

## Alternatives considered
- **LangGraph for the live conductor** — rejected again for the same reason as D-048: the conductor is event-driven, not step-shaped.
- **LLM supervisor agent over the stages** — rejected: a supervisor model in the loop adds latency and a second thing to go wrong; stage order is known in advance.
- **RAG over the pool** — rejected at MVP size; revisit when pools pass a few hundred entries per level.

## Trade-offs
- The gate trusts May to call `offer_upgrade` before she speaks the line. If she speaks first, the gate becomes a flag. The spike measures this.
- Fake Gemini mode tests the plumbing, not May's teaching. Teaching quality still needs the eval suite.

## Open questions
- [ ] Calls per learner turn and blocking-wait audibility with real Gemini Live (D-056 exit criteria). (Owner: Larry)
- [ ] Whether coach notes sent as non-generating client content mix cleanly with realtime audio on the live model. (Owner: Larry)
- [ ] Cached TTS transition lines at cutover (D-046) — the gateway currently lets May open each stage live. (Owner: Larry)
- [ ] Text review fallback when Gemini is down (R-TE-9) — not built yet.
- [ ] Postgres sink and repositories behind the graph `deps` interfaces — the spike uses a JSONL file.

## Rollout / next steps
- [x] Monorepo, shared schemas, brain graphs, gateway, call screen, 65 tests, browser run with fake Gemini.
- [ ] Week-one spike with a real key: run the call screen with `?debug=1` on a phone over mobile data and read response p50 and barge-in p50.
- [ ] Eval suite v0 over saved item logs.
