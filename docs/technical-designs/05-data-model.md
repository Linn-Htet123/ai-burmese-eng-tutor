# Data model — the tables everything writes to

**Status:** Approved (2026-09-10)
**Author:** Larry (Thar Linn Htet)
**Last updated:** 2026-09-10

## Requirements this implements
- `R-ON-1, R-ON-7` — account identity (phone/email + password); placement recording retained
- `R-TP-6..7` — five-question profile; pack-interest capture from greyed-out packs
- `R-SE-1, R-SE-10, R-TE-6` — inspectable plan object; five session artefacts; continuously persisted session state
- `R-RV-1..8` — review queue items, original↔upgraded pairing, intervals, grades
- `R-RC-2, R-RC-5` — recap items into the queue unconditionally; recaps re-readable on the progress page
- `R-UL-8..9` — authored upgrade pool; generated upgrades gated behind founder review
- `R-LV-1..2, R-LV-5..10` — level per learner, override, evidence-based movement, history
- `R-PR-4..5` — two separate consents with timestamps; per-session fluency metrics
- `R-TE-8` — billed tokens per session per stage from day one
- `R-PY-1` — manual bank-transfer payments and founder activation (D-026/D-042 monthly renewal)
- `R-FA-7..9` — absence reminders, hard cap of three
- `R-TE-10` — recordings metadata with per-learner access control (detail in 03-audio-storage)

## Related decisions
- `D-041` Railway Postgres, SQLAlchemy 2.0 + Alembic (migrations only, never auto-push)
- `D-042` subscription model · `D-039/D-040` recordings in R2, kept forever · `D-047` quality flags
- This doc's own decisions (logged on approval as D-049): **UUID primary keys everywhere; item-log events stored append-only as the source of truth; session plans as single JSONB documents**

## Context

One Postgres database on Railway serves both services. Cohort-1 scale (~50 learners, daily sessions) means every table stays tiny — thousands of rows, not millions — so the design optimises for **clarity, evolvability, and not losing learning data**, never for query performance. The one growth table is `item_log_events` (~50–80 rows per session), still only ~1.5M rows/year at full cohort attendance — trivial for Postgres.

## Decision

### Conventions (apply to every table)
- **Primary keys: UUID** (`gen_random_uuid()`). Safe in URLs — recordings/sessions IDs are exposed to clients and must not be guessable (R-TE-10).
- `created_at` / `updated_at` as `timestamptz`, always UTC; learner-facing times rendered in Asia/Yangon by the app.
- **Migrations via Alembic only.** No auto-generated pushes to a live DB, ever (house rule, D-041).
- **No soft deletes**, except the learner-requested full deletion flow (recordings + rows, per D-040).
- **Rule of thumb applied throughout: normalize what you query, JSON what you pass around.**

### The tables (17), by group

**WHO**
| Table | Purpose / key columns |
|---|---|
| `learners` | phone/email (unique), password hash, the five profile answers (call-name+gender required; age_range, occupation, prep_goal→pack, city all nullable per R-TP-7), `level` (0–10, R-LV-1), `level_override` (R-LV-2), notification channel, `consent_recording_at` (signup, required before placement), `consent_marketing_at` (nullable until session ~12) — R-PR-4's two consents as two timestamps |
| `level_history` | append-only: learner, from→to, reason ("promotion R-LV-8" / "demotion R-LV-9" / "manual override"), evidence session ids. The announcement text (R-LV-6) is generated from this |
| `pack_interest` | learner × coming-soon pack clicks (R-TP-6) — free demand research |

**MONEY** (manual rails, D-026/D-042)
| Table | Purpose |
|---|---|
| `subscriptions` | learner, status (`pending`/`active`/`expired`), `period_start`/`period_end` (monthly), `activated_by` (founder). Renewal = founder confirms transfer → new period written |
| `payments` | learner, subscription, amount, currency (MMK/USD), method (`bank_transfer`), transfer reference note, `received_at`, `activated_at`. One row per real-world transfer — the audit trail |

**CONTENT** (authored by founder; consumed by the planner)
| Table | Purpose |
|---|---|
| `packs` | slug, title (my/en), status (`live`/`coming_soon`), sort order — drives R-TP-1/R-TP-6 catalog |
| `units` | pack, number, title, `content` JSONB (situation brief, drill pairs, core prompts — passed around, not queried), status |
| `upgrade_pool_items` | pack, phrase (en), gloss (my), target category (verb/collocation/compression/hedging/filler per PRD 7.3), level band range, **status: `approved` / `pending_review`** — R-UL-9's gate is this column. May-generated upgrades land here as `pending_review` and cannot enter any review queue until approved |

**LEARNING** (the core)
| Table | Purpose |
|---|---|
| `session_plans` | learner, session_type (`unit_day`/`review_day`/`placement`/`return`), **`plan` JSONB — the whole recipe in one document** (this doc's decision). Written once by the planner, read once by the conductor, validated in code before save |
| `sessions` | learner, plan, session_number (the analytics-critical counter, PRD 15.1), status (`in_progress`/`paused`/`completed`/`ended_early`/`abandoned`), current_stage, **`live_state` JSONB** — the continuously persisted conductor state (R-TE-6: updated at least every 10s; holds stage progress, current item, short-term handover), `recap` JSONB (the three items with their review_item ids — re-readable per R-RC-5), started/ended timestamps |
| `item_log_events` | **append-only source of truth** (this doc's decision): session, monotonic `seq`, stage, `event` JSONB exactly as May emitted it (D-011), created_at. Never updated, never deleted. The processor derives everything else from these; a processor bug is healed by re-running over the raw events |
| `review_items` | learner's queue (R-RV-1): item_type (phrase/collocation/upgrade/filler/grammar), **`original_said` + `upgraded_to`** (R-RV-2 — the pairing that generates before/after comparisons), source (`upgrade_pool_items` FK, nullable for founder-approved generated ones), interval_index (the 1d/3d/1w/3w ladder position, R-RV-3), `next_review_at`, last_grade (`fluent`/`hesitant`/`failed`, R-RV-8), times_seen/failed. **Current state only** — the grade history lives in `item_log_events` |
| `session_metrics` | one row per completed session: avg stall length, fluent-first-attempt rate, WPM, self-correction count (R-PR-5) — the level judge reads the last three of these (R-LV-8) |
| `token_usage` | session × stage: input/output tokens, audio seconds, computed cost (R-TE-8 — "every BRD figure is an assumption until this table has data") |
| `quality_flags` | the guard's output (D-047): session, event seq ref, rule violated (e.g. `R-UL-3`), detail, status (`open`/`reviewed`/`prompt_fixed`). The founder's weekly QA list is `WHERE status='open'` |

**FILES + OUTREACH**
| Table | Purpose |
|---|---|
| `recordings` | per 03-audio-storage: learner, session, R2 keys (learner.ogg / may.ogg / session.m4a), duration, status (`buffering`/`uploaded`/`transcoded`/`failed`) |
| `notifications` | learner, channel, template (`absent_3d`/`absent_7d`/`absent_14d`/…), sent_at — R-FA-9's "never more than three" is enforced by counting rows in the current absence episode |

### Relationships (the spine)

```
learners ─┬─ subscriptions ── payments
          ├─ level_history
          ├─ pack_interest ──────────────── packs ── units
          ├─ review_items ── (source) ───── upgrade_pool_items
          └─ session_plans ── sessions ─┬── item_log_events
                                        ├── session_metrics
                                        ├── token_usage
                                        ├── quality_flags
                                        └── recordings
```

Diagram: [05-data-model.drawio](diagrams/05-data-model.drawio) · [05-data-model.svg](diagrams/05-data-model.svg)

### The indexes that matter (all others are just FK indexes)
- `review_items (learner_id, next_review_at)` — the planner's daily "what's due" query
- `item_log_events (session_id, seq)` — ordered replay for the processor
- `quality_flags (status)` partial on `open` — the weekly QA list
- `sessions (learner_id, started_at)` — history, absence detection, before/after lookup

### What is deliberately NOT in the database
- **Audio bytes** → R2 only; Postgres holds pointers (03-audio-storage)
- **Analytics events** (PRD 15.1) → PostHog; the DB is not an analytics store. `session_number` lives in both — in `sessions` because product logic (return sessions, before/after gating) needs it transactionally
- **Prompts and eval conversations** → versioned files in the repo, not rows; prompt changes ship through git + the eval suite (D-047)

## Alternatives considered
- **Auto-increment integer IDs** — smaller, human-readable. Rejected: guessable in exposed URLs (recordings, sessions), directly against R-TE-10's access posture. UUIDs cost nothing at this scale.
- **Process item logs immediately, store only derived rows** — smaller DB. Rejected: a processor bug would silently corrupt the product's core asset (learning history) with no way back. Append-only raw events make every derivation re-runnable.
- **Normalized plan tables** (`plan_stages`, `plan_items`) — DB-enforced structure, cross-plan queries. Rejected: plans are written once and read once, never queried inside; the only cross-plan question ("where was item X practiced?") is answered better by `item_log_events` (what happened) than plans (what was intended). Every plan-shape change would cost a migration during the most experimental months.
- **Per-item grade-history table** — explicit review trail. Rejected as redundant: the history is already in `item_log_events`; `review_items` keeps current state only.
- **Separate auth tables / auth vendor schema** — deferred to the auth+consent design doc; `learners` carries identity for now and the auth doc may split a `credentials` table out.

## Trade-offs
- **JSONB plans and unit content have no DB-enforced schema** — malformed writes are possible. Accepted: shape validation lives in the planner's validate step and Pydantic models at the app boundary, which is where evolution is cheap.
- **Append-only events grow forever** — ~1.5M rows/year. Accepted: trivial for Postgres; revisit partitioning only if cohort size 10×s.
- **Recap stored on the session row** (JSONB) rather than its own table — the progress page reads "last 3 sessions", never queries across recaps. If a recap-search feature ever appears, extract then.
- **`level` denormalized on `learners`** (also derivable from `level_history`) — one read instead of a window query on every plan generation. The judge writes both in one transaction.

## Open questions
- [ ] Exact `event` JSONB schema for `item_log_events` — depends on what the D-011 spike gets Gemini to emit reliably. The table shape is stable regardless. (Owner: Larry)
- [ ] Placement session artefacts: same `sessions` row shape with type=`placement`, but does the level+confidence output live on the session row or `level_history`? Settle in the auth/onboarding doc. (Owner: Larry)
- [ ] Learner full-deletion flow (D-040): background job order (R2 objects → rows) and what remains in `payments` for accounting. Settle with the auth+consent doc. (Owner: Larry)
- [ ] MMK vs USD as the money column's canonical currency — depends how the founder tracks pricing. (Owner: Larry)

## Rollout / next steps
- [ ] SQLAlchemy models + initial Alembic migration when the repo scaffolds (post-design-phase).
- [ ] The D-011 spike writes real `item_log_events` rows — the event JSONB question resolves there.
- [ ] Auth+consent doc may refine `learners` (credentials split, deletion flow).
- [x] Logged this doc's decisions as D-049 (2026-09-10).
