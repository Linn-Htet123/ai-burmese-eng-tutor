# ai-burmese-eng-tutor

AI voice English tutor for Burmese adults. Tutor character name is **Aye**. Product name TBD.

## Status
Planning phase. No code yet — only docs. System design is in progress.

**IMPORTANT: Do not scaffold code, install deps, or create technical-design files unless the human asks. This repo stays docs-only until system design is finished.**

## Where things live
- `docs/requirements/` — source of truth. Read before answering product or scope questions.
  - `01-vision.md` — north star
  - `02-business-requirements.md` — BRD
  - `03-product-requirements.md` — PRD (contains `R-xx-n` requirement IDs)
  - `04-marketing-plan.md`
  - `05-decisions-log.md` — decisions log (`D-xxx` IDs)
  - `06-competitor-landscape.md` — competitor research (snapshot 2026-09-08)
- `docs/technical-designs/` — design docs. Copy `_template.md` for new docs. Every doc must cite the PRD IDs it implements (e.g. `R-TE-1`).

## Product facts to remember
- Web app, mobile-first. Must run on Chrome/Android + Safari/iOS on mid-range phones over mobile data.
- Sub-1-second voice latency from end of learner speech to start of Aye's voice (R-TE-1). This drives every stack choice.
- Core loop: Aye offers a better phrase → learner must use it before the session ends ("upgrade loop").
- Session shape: 30 min, 3×/week, 4-week course.
- Pipeline: STT + LLM + TTS. Cached TTS for scripted lines. Per D-011, the LLM emits a structured item log — no separate transcription stream.
- Payments: Stripe/Paddle **plus** Myanmar local rails (most users lack international cards).
- Content authoring (scripted lessons + upgrade pool) is the biggest schedule risk (~20–40 hrs of writing).

## Naming
- `[PRODUCT NAME TBD]` is a placeholder — grep and replace once picked.
- **Aye** = tutor character only, not the product name.

## Doc conventions
- PRD requirements: `R-xx-n` (e.g. `R-TE-1`, `R-PL-5`).
- Decisions: `D-xxx` (e.g. `D-011`).
- Every technical-design doc cites the PRD IDs it implements.

## Diagrams
- **Before drawing, follow the `diagram-selection` skill** (auto-triggers, or see `.claude/skills/diagram-selection/SKILL.md`) to pick the right diagram type — sequence vs flowchart vs C4 — based on what the design is showing. Prevents flowchart-for-a-round-trip mistakes.
- Use the `drawio:drawio` skill for architecture and flow diagrams. It auto-triggers when you ask for a diagram, or invoke it explicitly with `/drawio:drawio`.
- Prefer Mermaid input — the skill converts it to `.drawio` via the draw.io Desktop CLI (installed at `/Applications/draw.io.app`).
- Store `.drawio` source files in `docs/requirements/diagrams/`. Also export a `.svg` alongside for GitHub preview.
- File naming: `NN-short-title.drawio` + `NN-short-title.svg` (e.g. `04-voice-pipeline.drawio`).
- Every technical-design doc that has a diagram should link to both the `.drawio` (source) and `.svg` (preview).
