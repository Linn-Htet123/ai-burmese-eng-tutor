# ai-burmese-eng-tutor

AI voice English tutor for Burmese adults. Tutor character name is **May**. Product name TBD.

## Status
**Build phase.** System design is COMPLETE — all nine technical designs (`docs/technical-designs/01–09`) approved 2026-09-07…11, decisions logged through D-053. Code may now be scaffolded when the human asks for it.

**Next milestone: the week-one spike** — Pipecat + Gemini Live, one session stage end-to-end, measuring the four make-or-break numbers: D-011 item log reliability · barge-in ≤300ms (R-SE-8, pipecat issue #3381 check per D-045) · end-to-end latency <1s (R-TE-1) · spoken Burmese quality. Design assumptions meet reality there; several D-xxx entries carry explicit "would revisit if" clauses keyed to spike results.

Read `docs/technical-designs/01-architecture-and-stack.md` before writing any code — it is the stack manifest (Next.js + FastAPI on Railway Singapore, Pipecat, LangGraph, Railway Postgres, R2).

## Where things live
- `docs/requirements/` — source of truth. Read before answering product or scope questions.
  - `01-vision.md` — north star
  - `02-business-requirements.md` — BRD
  - `03-product-requirements.md` — PRD (contains `R-xx-n` requirement IDs)
  - `04-marketing-plan.md`
  - `05-decisions-log.md` — decisions log (`D-xxx` IDs)
  - `06-competitor-landscape.md` — competitor research (snapshot 2026-09-08)
- `docs/technical-designs/` — design docs. Copy `_template.md` for new docs. Every doc must cite the PRD IDs it implements (e.g. `R-TE-1`).
- `docs/changes/` — one folder per ticket (`<ID>-<slug>/`) with proposal → spec → design → tickets → qa-report. Created by `/ticket <ID>`.
- `docs/decisions/` — ADRs for hard-to-undo choices (`NNNN-short-title.md`).

## Product facts to remember
- Web app, mobile-first. Must run on Chrome/Android + Safari/iOS on mid-range phones over mobile data.
- Sub-1-second voice latency from end of learner speech to start of May's voice (R-TE-1). This drives every stack choice.
- Core loop: May offers a better phrase → learner must use it before the session ends ("upgrade loop").
- Session shape: 40 min, one-per-day cap, monthly subscription ($25/mo). First month is pack-shaped with a week-4 before/after clip (see D-042, D-043). Session rhythm alternates unit day → review day.
- Pipeline: STT + LLM + TTS. Cached TTS for scripted lines. Per D-011, the LLM emits a structured item log — no separate transcription stream.
- Payments: MVP = manual bank transfer with founder-driven monthly renewal (D-026, D-042). Most users lack international cards; Stripe/Paddle deliberately deferred.
- Content authoring (scripted lessons + upgrade pool) is the biggest schedule risk (~20–40 hrs of writing).

## Naming
- `[PRODUCT NAME TBD]` is a placeholder — grep and replace once picked.
- **May** = tutor character only, not the product name.

## Doc conventions
- PRD requirements: `R-xx-n` (e.g. `R-TE-1`, `R-PL-5`).
- Decisions: `D-xxx` (e.g. `D-011`).
- Every technical-design doc cites the PRD IDs it implements.

## Harness rules
- `.claude/rules/backend.md`, `db.md`, `frontend.md` are placeholder stubs — this repo is docs-only. Ignore or delete until a real stack exists.

## Diagrams
- **Before drawing, follow the `diagram-selection` skill** (auto-triggers, or see `.claude/skills/diagram-selection/SKILL.md`) to pick the right diagram type — sequence vs flowchart vs C4 — based on what the design is showing. Prevents flowchart-for-a-round-trip mistakes.
- Use the `drawio:drawio` skill for architecture and flow diagrams. It auto-triggers when you ask for a diagram, or invoke it explicitly with `/drawio:drawio`.
- Prefer Mermaid input — the skill converts it to `.drawio` via the draw.io Desktop CLI (installed at `/Applications/draw.io.app`).
- Store `.drawio` source files next to what they document — requirements diagrams in `docs/requirements/diagrams/`, tech-design diagrams in `docs/technical-designs/diagrams/`. Also export a `.svg` alongside for GitHub preview.
- File naming: `NN-short-title.drawio` + `NN-short-title.svg` (e.g. `04-voice-pipeline.drawio`).
- Every technical-design doc that has a diagram should link to both the `.drawio` (source) and `.svg` (preview).
