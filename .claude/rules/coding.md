---
paths: ["**/*.py", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---
# Coding — loads for every code file

Cross-cutting rules for any code in this repo. Specific stacks add more in `backend.md`, `frontend.md`, and `db.md`.

## The two guiding rules

1. **Correctness first, readability second.** A working solution that reads awkwardly beats an elegant solution that misses an edge case. Fix behaviour before you polish shape.
2. **Junior-friendly ≠ weak.** Code that a competent junior can read in three months is the goal. That means: clear names, explicit types, no clever tricks. It does NOT mean skipping error handling, edge cases, or tests. Junior-readable code is a quality mark, not a shortcut.

## Size and shape

- **File length:** 300 lines is the soft cap. When you hit it, ask: *does this file have one reason to change?* If no, split it. If yes (a `session/service.py` full of related session logic is fine), keep it. Utils and constants files are exempt.
- **Function length:** ~40 lines for Python, ~50 for TypeScript is the point at which you *evaluate* whether to decompose. It's a signal, not a law.
- **Nesting:** aim for max 3 levels of nesting inside any function.

## When you hit deep nesting — the fix order

1. **First, flip conditions with early returns / guard clauses.** Turn `if x: if y: if z:` into `if not x: return; if not y: return; ...`. This is free — no new helpers, no name-invention.
2. **Second, use `match` / discriminated unions** for shape-based branching if you have 3+ mutually exclusive cases.
3. **Only then extract a helper**, and only if you can give it a real, non-invented name (`validateReceiptUpload`, `computeStagePlan` — not `_process_thing_helper`). If you can't name it well, it's not a helper.

Never split a function into 8 one-use private helpers just to satisfy a "small function" aesthetic. That's the biggest AI anti-pattern in a codebase like this.

## Grouping and structure

- **Group by concern, not by type.** A domain folder (`session/`) that contains routes, schemas, service, and dependencies for that domain beats a type folder (`routers/`, `services/`) with the same code scattered.
- **Module-level SRP:** each file has ONE reason to change. Multiple exports per file are fine — group things that always change together.
- **The "next reader" test:** if a stranger opened this file, would the top-to-bottom flow make sense? If yes, keep it. If no, restructure.

## Abstraction

- **AHA over DRY.** Write it twice. On the third similar occurrence, if a clear abstraction exists and different callers actually want the same thing, extract. Never abstract preemptively because two things look similar — different callers usually diverge over time.
- **No dead helpers.** If a helper is called in one place, inline it. If a util is exported but nothing imports it, delete it.
- **No fake abstractions.** No fake types, no `TODO: implement this properly`, no placeholder returns that hide missing logic. Ship less code that is real, not more code that is a lie.

## Naming

- **Purpose, not type.** `sessionId` not `strSessionId`, `isComplete` not `bIsComplete`, `items` not `arrItems`.
- **No prefixes** on interfaces (`I` prefix) or types (`T` prefix) — they add noise the IDE already shows.
- **Booleans read as questions:** `isComplete`, `hasErrors`, `canRetry`. Not `complete`, `errors`, `retry`.
- **Handlers read as actions:** `handleClick`, `onSessionEnd`. Not `click`, `sessionEndListener`.
- **Constants in UPPER_SNAKE_CASE only** if they're truly constants exported from a config module. Local `const` variables use normal camelCase.

## Comments — when yes, when no

Comments explain **the code** and, when it helps, **the business reason behind the code**. Nothing else.

**Write a comment when:**
- A non-obvious constraint exists — explain what the constraint is, not where it was decided.
  - Good: `# Flush before closing the socket — the last audio frame is dropped otherwise`
  - Bad: `# See ticket ABC-123` / `# Per decision D-049`
- A deliberate workaround is used — explain what the workaround does and why the straight path doesn't work.
  - Good: `# Polling instead of waiting on the interrupt event — the event is unreliable while the model is still generating audio`
  - Bad: `# Workaround for pipecat issue #3381`
- A magic number needs a plain-English meaning.
  - Good: `# 300ms — the interruption budget: the learner shouldn't feel the AI ignores them when they start talking`
  - Bad: `# 300ms — see R-SE-8`
- A piece of business logic isn't obvious from the code alone.
  - Good: `# Placement is free — we never charge before the learner has heard the tutor speak`

**Do NOT write a comment when:**
- It just restates the code: `# increment counter` above `count += 1`
- The function name already says it: `# get user` above `get_user(user_id)`
- It describes types (the type hints do that)
- It's a decorative header (`# ============= HELPERS =============`)

**Never write:**
- **Ticket or issue references** — no `# See ticket X`, `# From issue Y`, `# Per D-049`, `# Fixes R-SE-8`. Ticket ids belong in commit messages and PR bodies, never in code. Comments must stand on their own six months from now when nobody remembers the ticket.
- **Session or AI-context references** — no `# As requested by user`, `# Per the previous discussion`, `# Based on the spec we wrote earlier`.
- **AI self-commentary** — no `# This function...`, no `# I chose to...`, no "as an AI" energy.
- **Docstrings that repeat the signature** — the signature already tells the caller the types.

Docstrings on public functions (backend + frontend both — see stack files for format), not on private helpers unless the logic is genuinely tricky.

## What NOT to make up

- **No fake types.** If you don't know what shape something has, read the code that produces it, or ask.
- **No placeholder returns.** No `return None  # TODO`. If you can't implement it, leave it unimplemented and say so.
- **No fabricated library APIs.** If you're not sure a method exists, check the docs or the source. Don't guess.
- **No fake numbers.** No "estimated latency" pulled from thin air. Use measured values or say "TBD".

## Formatting

- **Automated, not debated.** Prettier handles JS/TS. Ruff handles Python. Both run on pre-commit via `lint-staged`.
- No custom lint rules beyond the recommended sets. The cognitive overhead exceeds the benefit at this scale.

## The "AI writing this code" section

Larry works with AI agents to produce code. These patterns show up often and must be resisted:

1. **Tiny function extraction.** AI splits a natural 30-line function into 8 one-use helpers. Result: scroll-hunting, invented names, obscured data flow. Rule: extract only when the helper has a real, reusable job.
2. **Ceremony class hierarchies.** AI reaches for interfaces + factories + strategies when a plain function or `match` would do. Rule: polymorphism only when you have 4+ implementations, or new ones get added at runtime.
3. **Comment inflation.** AI adds docstrings that repeat the signature and inline comments that describe the code. Rule: only WHY comments, only where WHY is non-obvious.
4. **Premature `lib/` moves.** AI hoists every shared function into `lib/utils.ts` early. Rule: a function belongs in `lib/` only after 2+ genuine callers.
5. **Over-validation.** AI validates the same data at every layer (API → hook → component). Rule: parse ONCE at the network boundary. Trust the types thereafter.
6. **Made-up types.** AI invents interface fields that don't exist because the code needs them "logically". Rule: read the actual source of the data. Never fabricate a field.
