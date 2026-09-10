# Session engine — plan, conduct, guard, and bookkeep every lesson

**Status:** Approved (2026-09-09)
**Author:** Larry (Thar Linn Htet)
**Last updated:** 2026-09-09

## Requirements this implements
- `R-SE-1..10` — session planning, stage structure, pause/resume, on-screen state, artefacts
- `R-UL-1..9` — the upgrade loop state machine and its quality firewall
- `R-RC-1..5` — the recap promise (three items, back next session, re-readable)
- `R-RV-1..8` — review queue updates: grading (fluent/hesitant/failed), spaced intervals, caps
- `R-LV-3..4, R-LV-8..10` — level-dependent session composition; promotion/demotion rules
- `R-GR-1..7` — grammar stage insertion at levels 0–3, error-triggered selection
- `R-FA-1..6, R-FA-10` — in-session failure handling, visible win, return session type
- `R-TE-2, R-TE-4, R-TE-6, R-TE-9` — barge-in, per-stage context, continuous state persistence, degradation

## Related decisions
- `D-004` upgrade loop as core · `D-011` item log from the live model · `D-020` adult review caps · `D-028` May never deliberately wrong
- `D-042` subscription: daily 40-minute sessions, alternating unit/review days · `D-043` pack-based first-month goal
- `D-038` LangGraph for slow-brain work, no general framework in the hot path · `D-045` Pipecat adopted for voice plumbing
- `D-046` stage cutover: fresh context per stage + handover notes, masked by cached lines
- `D-047` quality guard: watch-and-nudge with weekly prompt loop and eval suite
- `D-048` tool split: LangGraph thinks, our Python conducts, Pipecat carries audio

## Context

A session is one 40-minute voice lesson (D-042). The engine must make every lesson feel personally planned and consistently taught, while a live AI does the talking. Four forces shape the design: the PRD demands 100% compliance with teaching rules a prompt alone cannot guarantee (R-UL-1); per-stage model contexts are both the cost model and the quality model (R-SE-3, R-TE-4); Myanmar mobile connections drop and the learner must lose almost nothing (R-TE-6); and one founder must be able to see and improve teaching quality without listening to 33 hours of audio a day.

## Decision — four parts, two tools

```
BEFORE                DURING (live)                       AFTER
┌──────────┐   ┌─────────────────────────────┐   ┌──────────┐ ┌───────────┐
│ PLANNER   │──►│ CONDUCTOR       + GUARD      │──►│ PROCESSOR │►│ LEVEL     │
│ LangGraph │   │ our Python code (as Pipecat  │   │ LangGraph │ │ JUDGE     │
│           │   │ custom processors) watching  │   │           │ │ LangGraph │
└──────────┘   │ the item-log reports          │   └──────────┘ └───────────┘
               └─────────────────────────────┘
```

Rule of thumb: **LangGraph thinks, our Python conducts, Pipecat carries the audio.**

### Session types

The engine runs four session types from one machinery, differing only in the plan the planner emits:

| Type | When | Shape |
|---|---|---|
| **Unit day** | alternating (D-042) | full 6-stage recipe on new authored material |
| **Review day** | alternating | built from the review queue + free conversation on the learner's material; no new authoring consumed |
| **Placement** | first contact (R-ON-4) | 8–10 min conversation → level + confidence + transcript; recorded (R-ON-7) |
| **Return** | after 7+ days away (R-FA-10) | shorter, easier, designed to be a win |

Stage composition and Burmese ratio vary by level band per PRD 3.1 (R-LV-3/4). The PRD's stage table is written for 30 minutes; times scale ~+33% to the 40-minute shape — the exact table lands in the PRD update tracked in D-042.

### 1. Planner — LangGraph (runs before each session, R-SE-1)

```
fetch_data → pick_items → compose_plan (LLM) → validate ⟲ retry ≤2 → save
```

Inputs: level, pack unit (unit days), review queue due items, the 3 recap items (unconditional, R-RC-3), learner profile, session type. Output: a **SessionPlan** JSON in Postgres — stages with time budgets, per-stage prompt material, the slice of the authored upgrade pool for this session, and the Burmese-ratio target. The plan is inspectable (R-SE-1) and rendered to the learner in Burmese before start (R-SE-2). Validation is code, not LLM: item counts within caps (R-RV-6, D-020), stage budgets sum to 40, every referenced item exists.

### 2. Conductor — our Python, inside Pipecat (runs the live 40 minutes)

The conductor is custom code registered as Pipecat pipeline processors (D-045). It owns:

**Stage cutover — fresh context per stage, masked by cached lines.** Each stage is a new Gemini Live session (R-SE-3, R-TE-4). On cutover: play a pre-recorded May transition line (cached TTS, zero cost) → behind it, close the old Gemini session and open the new one with the stage prompt plus **two handover notes**:
- *Long-term chart* (from Postgres): name, level, pack, weak points, last session's recap items, profile facts — May "already knows them" (R-TP-8)
- *Short-term handover* (built by the conductor as the session runs): what happened in prior stages this session, current struggles

Fresh context never means amnesia; the notes are the compact state summary R-SE-3 names. ~10 transition lines per session type must be authored and recorded (content-authoring dependency).

**Soft time budgets.** Stage durations are budgets, not alarms. Near budget-end the conductor sends May a wrap-up-when-natural instruction; May is never cut off mid-sentence. Practice may run long; the plan's later budgets absorb it.

**Barge-in (R-SE-8, R-TE-2).** Delivered by Pipecat's interruption path; week-one verification target ≤300ms, with the known issue #3381 check/patch per D-045.

**Pause, drop, resume.** Session state (current stage, current item, handover-so-far) is persisted to Postgres continuously — a drop loses ≤10s (R-TE-6). Pause holds 10 minutes then ends and saves (R-SE-4); early end keeps everything earned (R-SE-5). Resume reopens the current stage's Gemini session with the same handover notes — prior audio is never resent (R-TE-5).

**In-session failure handling.** Three fails on an item → step down (R-FA-1); step-down count feeds the level judge (R-FA-5). Stalls >5s → May offers a turn-holding filler first (R-FA-4) — this behaviour lives in the stage prompts; the conductor tracks stall timing from the item log for metrics. Gemini unavailable → the conductor ends the voice attempt gracefully and offers a text review session (R-TE-9), never an error screen.

**Burmese help button (R-SE-7).** A control message to May's current context: switch to Burmese, explain, return.

### 3. Guard — watch and nudge (the quality system)

May's per-turn **item log** (D-011) is the source: what was practiced, upgrade offered (and from-pool or invented), repeat happened or not, timing data. The guard is plain code reading each report as it arrives — never in the audio path, so zero latency cost.

**Shadow state machine.** The guard tracks S1–S7 of the upgrade loop per item from the reports and scores every turn against the R-UL rules: acknowledgement present and specific (banned generic strings per R-UL-2), exactly one upgrade (R-UL-3), repeat requested at most once (R-UL-5), upgrade from the authored pool (R-UL-8).

**Two reaction lanes:**
- *Flag lane (default):* violations go to a QA list the founder reviews weekly (~10 min at cohort-1 scale). Invented upgrades (R-UL-9) are additionally **blocked from the review queue** until founder approval — the quality firewall.
- *Nudge lane (rare):* lesson-damaging drift — repeat never happened, stage far over budget — triggers one corrective text instruction into May's current context. May self-corrects on her next turn; the learner hears nothing mechanical.

**The improvement loop.** Weekly: read flags → find the weak prompt sentence → rewrite with explicit good/bad examples → run the **eval suite** (~20 saved test conversations, grown from real flagged sessions) → ship. Prompt changes never ship without the suite passing. Flag-rate per 100 turns is tracked in PostHog as the teaching-quality metric.

**Known limit:** the reports are self-reported by the model. Mitigation: weekly founder spot-checks comparing a sample of real transcripts against their reports.

### 4. Processor — LangGraph (runs at session end, R-SE-10)

```
gather → grade_items → update_queue → extract_recap (LLM) → compute_stats → mark_complete
```

Grades every practiced item **by delivery**: fluent / hesitant / failed (R-RV-8) using the item log's timing data — pure code. Updates spaced intervals (1d/3d/1w/3w, reset on failure — R-RV-3/4). The one LLM call writes the three recap items in the what-happened / why-it-cost-you / upgrade frame (9.1), stamped `next_review = next session` unconditionally (R-RC-2) and written to the progress page (R-RC-5). Stats: stall length, fluent-first-attempt rate, WPM, self-corrections (R-PR-5). The session is complete only when all five artefacts exist — LangGraph's checkpointing prevents the half-done-bookkeeping corruption (a crash between boxes resumes, never re-runs queue updates).

### 5. Level judge — LangGraph (runs after the processor)

```
load_last_3_sessions → check_rules (pure code) → decide (≤1 step) → write_notice (LLM)
```

Judgment is **not** AI: R-LV-8/9/10 are exact numeric criteria, implemented as auditable code. The LLM only writes the Burmese announcement naming what improved (R-LV-6); demotion copy follows the "let's solidify" framing (R-LV-9).

## Alternatives considered
- **One 40-minute Gemini context, no per-stage cutover** — simplest code. Rejected: re-bills accumulated audio every turn (the BRD's named cost leak), quality drifts, and it violates R-SE-3 outright.
- **One context with "forget previous stage" instructions** — no cutover gap. Rejected: the context still accumulates cost, and forget-instructions are unreliable.
- **Hard-gating every model turn through a checker before the learner hears it** — 100% rule enforcement. Rejected: adds ~1s per turn, destroying R-TE-1. The product's core promise loses.
- **Prompt-only quality (no guard)** — zero build cost. Rejected: R-UL-1 demands 100%; prompts deliver ~95% silently.
- **LangGraph everywhere, including the live conductor** — one framework. Rejected: the conductor is continuous and event-driven, not step-shaped; forcing it into graph nodes adds ceremony without the framework's gifts (topic-2 discussion, 2026-09-09).
- **No LangGraph anywhere** — fewer deps. Rejected: planner/processor/judge are exactly step-shaped LLM workflows; hand-building resume/retry/tracing is ~a week of plumbing, and the founder wants the LangGraph skill.
- **Raw asyncio instead of Pipecat for voice plumbing** — see D-045; kept as the documented fallback.

## Trade-offs
- **A nudge fixes drift one turn late** — the learner may hear one imperfect turn before correction. Accepted over universal latency.
- **Item log is self-reported** — a wrong report blinds the guard. Mitigated by weekly transcript spot-checks; accepted at MVP scale.
- **Cutover gaps depend on cached transition lines** — authoring + recording ~10 lines per session type is real content work, on the critical path for week one.
- **Quality improves in weeks, not instantly** — cohort 1 hears the rough edges while the flag→prompt loop converges. Accepted; it is also how the founder learns the product.
- **Three frameworks in one engine** (Pipecat, LangGraph, our code) — more to learn than one tool. Accepted deliberately: each covers the part it is built for, and the conductor — the only piece with no good framework — stays ours.

## Open questions
- [ ] Exact handover-note format (fields, length cap) — the compact state summary's token size directly affects per-stage cost. Prototype in the week-one spike. (Owner: Larry)
- [ ] Nudge injection mechanics inside Pipecat's pipeline (context-update frame vs system message) — verify in the spike alongside D-045's barge-in check. (Owner: Larry)
- [ ] Review-day plan composition rules (how much queue vs free conversation, by level band) — needs a pass with the content-format doc. (Owner: Larry)
- [ ] The 40-minute stage-time table per level band — lands with the D-042 PRD update. (Owner: Larry)
- [ ] Placement session's scoring flow (transcript → level 0–10 + confidence) — same machinery, needs its own short spec; interacts with manual review D-027. (Owner: Larry)

## Rollout / next steps
- [ ] Week-one spike (with 02-voice-pipeline's): one stage running end-to-end through Pipecat — stage prompt + handover note in, item log captured, one cutover with a cached line, barge-in measured (D-045 checks).
- [ ] Guard v0: shadow state machine + flag list on the spike's item logs (no nudges yet).
- [ ] Eval suite v0: ~20 scripted test conversations for the core-practice stage prompts.
- [ ] Planner graph v0 for unit days; review-day composition after the content-format doc.
- [ ] Processor + level judge graphs after the data-model doc pins the tables they write.
- [x] Logged this doc's three decisions as D-046–D-048 (2026-09-09).
