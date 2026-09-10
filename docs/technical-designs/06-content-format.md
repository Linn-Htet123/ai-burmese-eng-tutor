# Content format — the shape of the 55–110 hours

**Status:** Approved (2026-09-11)
**Author:** Larry (Thar Linn Htet)
**Last updated:** 2026-09-10

## Requirements this implements
- `R-CA-1` — structured, version-controlled, never improvised at runtime
- `R-CA-2` — every unit field: brief, questions, upgrade pool, drill pairs, grammar point, fillers, step-down target
- `R-CA-3` — 12 interview-pack units covering all levels 0–10
- `R-CA-4` — minimal admin tool (shrunk by this design — see below)
- `R-CA-5` — weekly founder review of flagged upgrades
- `R-UL-8..9` — the authored upgrade pool and its review gate
- `R-GR-2..4` — grammar points: three real examples before the rule, rule nameable in Burmese, one per session at 0–3
- `R-FA-1` — a step-down path defined for every unit
- `R-TP-1, R-TP-6` — pack catalog including coming-soon entries

## Related decisions
- `D-032` all 11 levels ship · `D-042` alternating unit/review days · `D-043` profession-pack roadmap
- `D-047` quality guard (flagged upgrades land DB-side) · `D-049` content tables (packs/units/upgrade_pool_items)
- This doc's decisions (logged on approval as D-050): **YAML files in git as source of truth, synced to Postgres; authored per band (5) with shared core + overrides**

## Context

Content is the schedule's biggest risk (R-CA-3's warning: 55–110 hours of writing, not compressible by coding faster). The format must make that writing fast, diffable, and safe to evolve — and must cut the load where the PRD's own structure allows. PRD 3.1 defines behaviour by **five level bands** (0–1, 2–3, 4–5, 6–7, 8–10), not eleven individual levels; authoring to bands with a shared core is the single biggest lever on the estimate.

## Decision

**Units are YAML files in the repo. Git is the source of truth. A sync command validates against a schema and loads them into Postgres. Each unit is authored once as a shared core plus five band-override sections.**

### Repo layout

```
content/
├── packs/
│   └── interviews/
│       ├── pack.yaml              (title my/en, status, sort — the catalog entry)
│       ├── pool.yaml              (the pack's upgrade pool — shared across units)
│       └── units/
│           ├── 01-introducing-yourself.yaml
│           ├── 02-your-current-job.yaml
│           └── ... (12 for MVP)
├── fillers.yaml                   (turn-holding fillers — taught at every level, session one)
└── schema/                        (JSON-schema files the CI check validates against)
```

Coming-soon packs (R-TP-6) are a `pack.yaml` with `status: coming_soon` and no units — the catalog needs nothing more.

### One unit file, annotated (the real shape)

```yaml
id: interviews-02
title_en: Talking about your current job
title_my: "လက်ရှိအလုပ်အကြောင်း ပြောခြင်း"
week: 1
status: draft            # draft | ready  — planner only sees ready
step_down: interviews-01 # R-FA-1: where to retreat after 3 fails

core:                    # shared by ALL bands — written once
  situation_my: >
    အင်တာဗျူးမှာ လက်ရှိအလုပ်အကြောင်းမေးရင်...
    (what the interviewer wants: confidence, not your life story)
  questions:             # core-practice prompts (stage 4)
    - "Tell me about your current role."
    - "What does your team do?"
    - "What are you responsible for?"
  pool_tags: [role, team, responsibility]   # which pool.yaml entries this unit draws
  fillers: [let-me-think, good-question]     # refs into fillers.yaml

bands:                   # ONLY what differs per band — the overrides
  "0-1":
    drills:              # sentence pairs, my → en weighted 2:1 (stage 3)
      - my: "ကျွန်တော် ဆေးရုံမှာ အလုပ်လုပ်တယ်"
        en: "I work at a hospital."
    grammar:             # explicit at 0–3 (R-GR-1), examples BEFORE rule (R-GR-2)
      examples:
        - "I work at a hospital."
        - "She works at a bank."
        - "They work in a shop."
      rule_my: "present simple — နေ့စဉ်လုပ်တဲ့အလုပ်..."
  "2-3":
    drills: [...]
    grammar: {...}
  "4-5":
    drills: [...]        # no grammar section — in-flow only (R-GR-1)
  "6-7":
    drills: [...]        # drills shrink; stage table changes come from the plan, not here
  "8-10": {}             # nearly pure upgrade loop — core alone suffices
```

**Reading rule:** the planner materialises `core + bands[learner's band]` — a band section only *adds or replaces*; anything absent falls through to core (or is simply not part of that band's session, like grammar at 4+).

### The upgrade pool: pack-level, tagged (`pool.yaml`)

```yaml
- trigger: "I did the project"
  upgrade: "I ran the project"
  type: verb_choice          # PRD 7.3 categories
  gloss_my: "..."
  tags: [role, responsibility]
  bands: ["2-3", "4-5", "6-7", "8-10"]
```

Pool entries live at pack level and units draw them by tag — "responsible for" belongs to five different interview units; writing it once and tagging beats copy-paste drift. The sync loads these into `upgrade_pool_items` with `status: approved`. **Runtime-generated upgrades (R-UL-9) never touch these files** — they are DB rows born `pending_review`; if the founder approves one and wants it permanent, he adds it to `pool.yaml` and the next sync reconciles.

### The pipeline: write → validate → sync

1. **Write** in any editor. Git gives diffs, history, and blame — R-CA-1's version control for free.
2. **Validate**: a CI check (and a local `make validate`) runs JSON-schema validation plus semantic checks — every `step_down` target exists, every `pool_tag` matches ≥1 pool entry, every band key is one of the five, `ready` units have all R-CA-2 fields for every band. **A typo cannot reach the planner.**
3. **Sync**: `make sync-content` upserts packs/units/pool into Postgres (by `id`, delete-missing warns instead of deleting). Runs manually or on deploy. The DB copy is a cache of git, never edited by hand.

### What this does to the admin tool (R-CA-4 shrinks)

No editing UI. The admin page becomes two read/review screens:
- **Units list** — id, status, last synced, validation state (mostly reassurance)
- **Flagged upgrades queue** — R-UL-9/R-CA-5's weekly review: approve (→ usable, optionally promoted into `pool.yaml`) or reject

That is a fraction of the build the PRD budgeted for a field-editing tool.

### Revised authoring estimate

Shared core kills the per-level duplication of situation, questions, and pool. Remaining per-band work is drills + low-band grammar. Honest estimate: **~3–5 hours per unit × 12 units ≈ 40–60 hours** (from 55–110). Still the schedule's biggest item — but the format no longer multiplies it.

## Alternatives considered
- **Database + admin editing UI** — needed if a non-dev co-author existed. Rejected for MVP: building nested-form CRUD for pools/drills costs more than it saves a solo dev-founder who lives in an editor; git beats a hand-rolled audit table for version control. Revisit when a second author joins.
- **Google Docs/Sheets import** — comfortable writing, but structure drifts and imports fail silently; no diffs. Rejected.
- **Full per-level authoring (11 variants)** — maximum tailoring at maximum cost; the PRD's own band table says sessions differ by band. Rejected; revisit per-unit if a band proves too coarse (the format allows adding a sixth key, e.g. splitting "8-10").
- **One version, model adapts live** — improvisation by another name; the quality firewall (R-UL-8) exists precisely because "adapt this to level 2" produces confident nonsense. Rejected.
- **Markdown + frontmatter / JSON** — units are structured lists, not prose; MD crams structure into frontmatter (worse YAML), JSON is hostile to 40+ hours of Burmese text entry. Rejected.
- **Per-unit pools (no pack-level file)** — simpler mental model, but the same upgrade would be copy-pasted across units and drift. Rejected.

## Trade-offs
- **Band-shared cores risk mid-band mismatch** (a 4 and a 5 get identical drills). Accepted: PRD 3.1 already treats them as one band; per-unit band-splitting is possible later without a format change.
- **Two-step publish** (edit → sync) instead of instant DB edits. Accepted: the pause is a feature — validation gates every publish.
- **YAML has no DB-enforced integrity** until sync. Accepted: the validate step *is* the integrity check, and it runs in CI on every commit.
- **Pool tags are stringly-typed** — a typo'd tag silently draws nothing. Mitigated: the validator fails on tags matching zero entries.

## Open questions
- [ ] Exact JSON-schema files — write alongside the first real unit, not before. (Owner: Larry)
- [ ] Review-day content: generated from the queue at plan time (04's assumption) — does it need any authored scaffolding (e.g. free-conversation prompts per pack)? Decide after authoring unit 1. (Owner: Larry)
- [ ] Cached-TTS scripted lines (transition lines from D-046, scripted brief openers): same repo under `content/scripted/` — spec their format with the voice spike. (Owner: Larry)
- [ ] Burmese text QA: who checks the Burmese copy besides the founder? (Owner: Larry)

## Rollout / next steps
- [ ] Author **unit 01 for real** as the format's shakedown — the schema is extracted from it, not invented ahead of it.
- [ ] `make validate` + CI check.
- [ ] `make sync-content` against the D-049 tables.
- [ ] Flagged-upgrades review screen (with the guard, D-047).
- [x] Logged this doc's decisions as D-050 (2026-09-11).
