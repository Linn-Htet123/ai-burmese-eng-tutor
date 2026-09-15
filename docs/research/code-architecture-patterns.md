# Code architecture patterns — research

**Question:** What are the pragmatic, widely-used file/module/class architecture patterns for clean, readable, maintainable code in this specific stack (Next.js + TypeScript, FastAPI + Python, solo founder, AI-agent-written code)?

**Date:** 2026-09-14
**Written to:** `docs/research/code-architecture-patterns.md`

---

## Question

What code-level (file / module / class) architecture patterns best fit a solo-founder codebase on Next.js + FastAPI where most code is AI-generated, with Larry's five stated constraints: concern-grouped, minimum code, no fake types, correctness first, files < 300 lines?

---

## Findings

| # | Finding | Supports / refutes | Source |
|---|---|---|---|
| 1 | FastAPI's own best-practices community repo advocates **domain-first folders** (`src/auth/`, `src/session/`) each containing `router.py`, `schemas.py`, `models.py`, `service.py`, `dependencies.py`, `exceptions.py` — not a flat type-first layout (`routers/`, `services/`) | Supports domain grouping over type grouping | [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices) |
| 2 | The same repo is **entirely function-based** for routes and services. Classes appear only when stateful DI is needed (e.g. a configurable client wrapper). Functions with `Depends()` cover 95% of cases | Supports functions-first, class only for stateful DI | [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices) |
| 3 | **Pydantic 2 at boundaries, plain dataclasses inside**: Pydantic BaseModel for anything entering/leaving the API (request bodies, response models, env config). For internal data containers that are already validated, stdlib `@dataclass` is 10–25× faster with zero ceremony | Supports Pydantic discipline: parse once at the edge | [hrekov.com pydantic vs dataclasses](https://hrekov.com/blog/dataclasses-vs-pydantic-model), [pydantic.dev docs](https://pydantic.dev/docs/validation/latest/concepts/dataclasses/) |
| 4 | **Repository pattern is not worth it at MVP scale**. The fastapi-best-practices repo queries the DB directly from service functions. The repo layer only pays off when you need to swap storage backends — rare in a solo project | Refutes early repo-layer abstraction | [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices) |
| 5 | **Async gotcha**: blocking I/O in an `async def` halts the entire event loop. The correct pattern is: CPU work → run in thread pool via `asyncio.run_in_executor`; long inference → track with `asyncio.Task`, catch `CancelledError` when client disconnects, clean up explicitly | Supports correct async patterns | [leapcell.io async pitfalls](https://leapcell.io/blog/understanding-pitfalls-of-async-task-management-in-fastapi-requests), [theneuralbase cancellation handling](https://theneuralbase.com/fastapi-for-ml/learn/intermediate/cancellation-handling-for-long-generations/) |
| 6 | **Next.js is deliberately un-opinionated about file layout** — three valid strategies exist: (a) all shared code outside `app/`, (b) shared code in top-level folders inside `app/`, (c) colocate route-specific code next to the route, shared code in `lib/`. Vercel names strategy (c) the recommended approach for growing apps | Supports route-colocation with a shared `lib/` | [nextjs.org project structure](https://nextjs.org/docs/app/building-your-application/routing/colocation) |
| 7 | Private folders (`_folderName`) in `app/` opt a folder out of routing entirely — safe place for route-specific utilities that should not be accidentally routable | Supports using `_components/`, `_hooks/` inside route segments | [nextjs.org project structure](https://nextjs.org/docs/app/building-your-application/routing/colocation) |
| 8 | **Zod: parse at the boundary, not everywhere**. After `.parse()` succeeds, treat the typed value as trusted — no re-validation in service or hook layers. Use `.safeParse()` when errors are expected (form UX); use `.parse()` in try/catch when success is the norm | Supports parse-once discipline | [stevekinney.com zod best practices](https://stevekinney.com/courses/full-stack-typescript/zod-best-practices) |
| 9 | **The 300-line rule**: Google's Python style guide sets no file-length limit, only a ~40-line soft cap on individual **functions**. An eslint community rule defaults to **200 lines**. The "300-line file" heuristic is widely repeated in engineering blogs but is not in any major published style guide — it is an informal consensus cap, not a formal rule | Supports using 300 as a soft cap, not a hard lint rule | [google.github.io/styleguide/pyguide](https://google.github.io/styleguide/pyguide.html), [glama.ai eslint file-length rule](https://glama.ai/mcp/servers/@tbreeding/jira-mcp/blob/e7f58e7d9b12bec35a79fb829972804c4bbcdb21/eslint-rules/docs/file-length.md) |
| 10 | **AHA > DRY**: Kent C. Dodds (and Sandi Metz before him) argue "prefer duplication over the wrong abstraction". Abstract when the pattern is obvious — not at the second occurrence. The "rule of three" (WET) is a workable heuristic but arbitrary. AHA says: wait until abstraction screams at you | Refutes reflexive DRY; supports write-it-twice before abstracting | [kentcdodds.com/blog/aha-programming](https://kentcdodds.com/blog/aha-programming) |
| 11 | **Clean Code SRP/tiny-functions advice ages badly in AI-written codebases**. Martin's style of extracting every block into a one-use private function increases scroll depth, obscures data flow, and causes the AI to invent helper names that mean nothing. The core insight of SRP ("one reason to change per module") is valid; the extreme function-extraction implementation is not | Refutes tiny-function orthodoxy; supports module-level SRP | [bugzmanov clean code critique](https://bugzmanov.github.io/cleancode-critique/clean_code_second_edition_review.html), [qntm.org/clean](https://qntm.org/clean) |
| 12 | **Google Python docstring rule**: docstrings required for all public functions + classes. Format: one-line summary (80 chars, ends with `.`), blank line, then Args/Returns/Raises sections if non-trivial. "Never describe the code — assume the reader knows Python." Comments for **why**, not what | Supports concise, structured docstrings | [google.github.io/styleguide/pyguide](https://google.github.io/styleguide/pyguide.html) |
| 13 | **JSDoc in TypeScript**: omit type annotations in JSDoc (TS compiler ignores them anyway). Use `/** */` only for public functions where the hover tooltip saves the caller from reading the body. Internal helpers need no JSDoc | Supports lean JSDoc — public surface only | [typescriptlang.org JSDoc support](https://www.typescriptlang.org/play/javascript/modern-javascript/jsdoc-support.js.html) |
| 14 | **Hungarian notation is a dead anti-pattern**. Modern naming should describe purpose/semantics, not type. Avoid: `strUserName`, `bIsActive`, `arrItems`. Acceptable: `userId`, `isActive`, `items` | Refutes `I`-prefix interfaces, `T`-prefix types except in generic constraints | [wikipedia: Hungarian notation](https://en.wikipedia.org/wiki/Hungarian_notation), [codewithjason naming anti-patterns](https://www.codewithjason.com/variable-name-anti-patterns/) |
| 15 | **Solo founder + AI agents → lint/format should run automatically, not manually**. Prettier on save + ESLint + `lint-staged` on pre-commit is the minimal viable gate. Avoid complex custom rules — the cognitive overhead exceeds the benefit at this scale | Supports lightweight automated formatting | [dev.to ESLint Prettier 2026](https://dev.to/_d7eb1c1703182e3ce1782/eslint-prettier-setup-the-complete-developer-configuration-guide-2026-4p8k) |

---

## Prior art

- **[fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)** — the most-starred community conventions repo for FastAPI. Domain-first structure, function-based DI, Pydantic at edges. 24k+ stars as of 2024.
- **[Next.js official docs — project structure](https://nextjs.org/docs/app/building-your-application/routing/colocation)** — the canonical source for App Router layout decisions. Vercel deliberately gives three options; they do not mandate one.
- **[Kent C. Dodds — AHA Programming](https://kentcdodds.com/blog/aha-programming)** — the definitive short piece on "Avoid Hasty Abstractions". Source of the "prefer duplication over the wrong abstraction" framing.
- **[Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)** — docstring format, naming, function-length guidance. Used by most serious Python projects.
- **[bugzmanov — Clean Code critique](https://bugzmanov.github.io/cleancode-critique/clean_code_second_edition_review.html)** — detailed technical analysis of which Martin advice is harmful in practice. Well-sourced, not just a rant.
- **[Steve Kinney — Zod Best Practices](https://stevekinney.com/courses/full-stack-typescript/zod-best-practices)** — concise rules: parse-at-boundary, no redundant re-validation, use `safeParse` when failures are expected.

---

## What I could not verify

- Whether Vercel's internal monorepo uses feature-folders or type-folders. Their public examples repo uses both styles across different example apps — no single canonical answer.
- Whether Google TypeScript Style Guide sets a file-line limit. The search found no explicit cap. The JS guide sets 80-char column width but not file size.
- Specific patterns for LangGraph + Pipecat project layout — no widely-used community conventions repo exists yet. Patterns below are inferred from FastAPI + async best practices.

---

## 1 — Recommended rules for this project

Rules the AI (Larry and agents) must follow when writing code. Each rule cites a source.

**Python / FastAPI**

1. **Group by domain, not by type.** Put `router.py`, `schemas.py`, `service.py`, `dependencies.py`, `exceptions.py` inside `src/<domain>/` — not in flat `routers/`, `services/` top-level folders. Source: [fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)

2. **Functions first, class only for stateful DI.** Route handlers, service functions, and utilities are plain `async def`. Reach for a class only when you need a configurable, reusable client (e.g. an R2 uploader that takes a bucket name). Source: [fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)

3. **Pydantic at the edge, dataclass inside.** Use `BaseModel` for request bodies, response models, and `BaseSettings` env config. Use `@dataclass` for internal data containers that are already validated. Reason: Pydantic validation is 10–25× slower than dataclass assignment. Source: [hrekov.com](https://hrekov.com/blog/dataclasses-vs-pydantic-model)

4. **No repository layer at MVP.** Query the DB from `service.py` directly via SQLAlchemy. Add a repo layer only when you need to swap storage backends — which won't happen in cohort 1. Source: [fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)

5. **Never block the event loop.** Any blocking call inside `async def` must be wrapped: `await asyncio.get_event_loop().run_in_executor(None, blocking_fn)`. Long-running inference tasks must catch `asyncio.CancelledError` and clean up. Source: [leapcell.io async pitfalls](https://leapcell.io/blog/understanding-pitfalls-of-async-task-management-in-fastapi-requests)

6. **Google-style docstrings on all public functions.** One-line summary ending with `.`, blank line, then `Args:` / `Returns:` / `Raises:` when non-trivial. No docstring on private helpers (`_` prefix) unless the logic is genuinely tricky. Source: [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)

**TypeScript / Next.js**

7. **Route-colocation + shared `lib/`.** Route-specific components and hooks live next to the route (in `_components/`, `_hooks/` private folders). Code used by two or more routes moves to `src/lib/`. Source: [nextjs.org colocation docs](https://nextjs.org/docs/app/building-your-application/routing/colocation)

8. **Zod at the boundary — once.** Parse incoming API responses, form data, and env vars with Zod. After `.parse()` returns, the value is typed and trusted — no re-validation inside hooks or service layers. Source: [stevekinney.com zod](https://stevekinney.com/courses/full-stack-typescript/zod-best-practices)

9. **JSDoc only on public-surface functions.** Exported hooks and utility functions get a `/** */` comment so the hover tooltip is useful. Internal functions used only in one file need no JSDoc — the types tell the story. No type annotations inside JSDoc (TS ignores them). Source: [typescriptlang.org JSDoc](https://www.typescriptlang.org/play/javascript/modern-javascript/jsdoc-support.js.html)

**Cross-cutting**

10. **AHA over DRY.** Write it twice. On the third occurrence, if a clear abstraction exists, extract. Never abstract pre-emptively because two things look similar — different callers often diverge. Source: [kentcdodds.com AHA](https://kentcdodds.com/blog/aha-programming)

11. **Module-level SRP, not function-level.** Each file/module has one reason to change. Within a module, functions can be longer than Martin would like — if the logic reads naturally top-to-bottom, don't chop it into tiny one-use helpers. Source: [bugzmanov clean code critique](https://bugzmanov.github.io/cleancode-critique/clean_code_second_edition_review.html)

12. **Comments explain WHY, not WHAT.** If a comment re-states what the code does, delete it. Write a comment when: (a) a non-obvious constraint exists ("must flush before closing — Gemini Live drops the last frame otherwise"), (b) a deliberate workaround is used ("using polling instead of events — pipecat issue #3381"), (c) a magic number needs a unit or source. Source: [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)

13. **No prefixes or Hungarian notation.** Name by purpose: `sessionId` not `strSessionId`, `isComplete` not `bIsComplete`, `items` not `arrItems`. TypeScript interfaces: no `I` prefix. Generic type params: single capital letter (`T`, `K`, `V`) is fine. Source: [wikipedia Hungarian notation](https://en.wikipedia.org/wiki/Hungarian_notation)

14. **Automate formatting, not style debates.** Prettier handles JS/TS formatting. Ruff handles Python formatting + linting. Both run on pre-commit via `lint-staged`. No custom lint rules beyond the recommended sets — cognitive overhead exceeds the benefit at this scale. Source: [dev.to ESLint Prettier 2026](https://dev.to/_d7eb1c1703182e3ce1782/eslint-prettier-setup-the-complete-developer-configuration-guide-2026-4p8k)

15. **Keep functions under ~40 lines (Python) and ~50 lines (TS).** This is the Google Python style guide's informal guidance for "evaluate whether to decompose". A file can be 300+ lines if it holds genuinely related logic — the function length matters more than the file length. Source: [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)

---

## 2 — Recommended file structure

### `apps/web` (Next.js + TypeScript)

```
apps/web/
├── src/
│   ├── app/                        # Next.js App Router — routes only
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── _components/    # route-private, not routable
│   │   │   │   └── _hooks/
│   │   ├── (session)/
│   │   │   ├── session/[id]/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── _components/    # VoicePlayer, TranscriptPanel etc.
│   │   │   │   └── _hooks/         # useVoiceSession, useUpgradeLoop
│   │   ├── api/                    # route.ts handlers (API routes)
│   │   │   └── sessions/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/                        # shared across 2+ routes
│   │   ├── api/                    # typed fetch wrappers + Zod parsing
│   │   │   └── sessions.ts
│   │   ├── schemas/                # Zod schemas (boundary definitions)
│   │   │   └── session.ts
│   │   ├── utils/                  # pure, side-effect-free helpers
│   │   │   └── format.ts
│   │   └── auth.ts                 # auth helpers (server-side)
│   ├── components/                 # truly shared UI (Button, Modal, etc.)
│   │   └── ui/                     # shadcn/ui components live here
│   ├── hooks/                      # hooks shared across 2+ routes
│   │   └── useSession.ts
│   └── types/                      # shared TypeScript types (not Zod schemas)
│       └── session.ts
├── public/
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

Key decisions:
- Route-specific components and hooks stay inside the route folder (private `_` prefix).
- `lib/` only gets code used by 2+ routes — resist moving things there early.
- `lib/schemas/` holds Zod schemas. `types/` holds plain TS types for things that do not need runtime validation.
- `components/ui/` is for shadcn/ui primitives. Feature components live near their route.

### `apps/api` (FastAPI + Python)

```
apps/api/
├── src/
│   ├── main.py                     # app factory, lifespan, router mounts
│   ├── config.py                   # BaseSettings (env vars, Pydantic)
│   ├── database.py                 # SQLAlchemy engine + session factory
│   ├── session/                    # voice session domain
│   │   ├── __init__.py
│   │   ├── router.py               # HTTP + WebSocket endpoints
│   │   ├── schemas.py              # Pydantic request/response models
│   │   ├── models.py               # SQLAlchemy ORM models
│   │   ├── service.py              # business logic, DB queries
│   │   ├── dependencies.py         # FastAPI Depends() functions
│   │   └── exceptions.py           # domain-specific HTTPExceptions
│   ├── user/
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── models.py
│   │   ├── service.py
│   │   └── dependencies.py
│   ├── voice/                      # Pipecat / Gemini Live plumbing
│   │   ├── pipeline.py             # pipeline factory
│   │   ├── handlers.py             # event handlers
│   │   └── transport.py            # WebSocket transport wrapper
│   ├── langgraph/                  # LangGraph slow-brain
│   │   ├── graph.py                # graph definition
│   │   ├── nodes.py                # individual node functions
│   │   └── state.py                # TypedDict state schema
│   ├── storage/                    # R2 + audio file helpers
│   │   └── r2.py
│   └── shared/                     # cross-domain utils (logging, errors)
│       ├── logging.py
│       └── errors.py
├── alembic/
│   └── versions/
├── tests/
│   ├── session/
│   ├── user/
│   └── conftest.py
├── pyproject.toml
└── Dockerfile
```

Key decisions:
- `voice/` and `langgraph/` are their own modules because they are big enough and have a distinct reason to change (Pipecat upgrades, LangGraph graph rewrites).
- `shared/` only for things needed by 3+ domains — keep it small.
- Tests mirror the domain structure under `tests/`.

---

## 3 — Comment / docstring policy

### Python

**Write a docstring when:**
- The function is exported (no `_` prefix) and does non-obvious work.
- The function signature alone does not tell the caller what side effects to expect.
- A class has any public methods.

**Format (Google style):**
```python
def start_session(user_id: int, plan_id: str) -> Session:
    """Create a new voice session and reserve a Pipecat pipeline slot.

    Args:
        user_id: The authenticated user's database ID.
        plan_id: Lesson plan identifier (e.g. "unit-03-day-02").

    Returns:
        A Session ORM object with status="pending".

    Raises:
        SessionLimitError: If the user already has an active session today.
    """
```

**Write an inline comment when:**
- A constraint is non-obvious: `# Must flush before close — Gemini drops the last audio frame`
- A deliberate workaround: `# Polling instead of event — pipecat issue #3381`
- A magic number has context: `# 300ms — barge-in latency budget from R-SE-8`

**Do NOT write a comment when:**
- It just restates the code: `# increment counter` above `count += 1`
- The function name already says it: `# get user` above `get_user(user_id)`
- It describes types (the type hints do that)

### TypeScript

**Write JSDoc when:**
- The function is exported from a module and called from another file.
- The function has non-obvious parameters or a non-obvious return shape.

**Format:**
```typescript
/**
 * Opens a WebSocket to the voice backend and returns a controller
 * that the caller uses to send audio and receive transcripts.
 *
 * @param sessionId - Active session ID from the API.
 * @returns Controller with `send`, `close`, and an `onMessage` callback setter.
 */
export function openVoiceSocket(sessionId: string): VoiceSocketController { ... }
```

**Do NOT write JSDoc when:**
- The function is local to a single file (TypeScript types are enough).
- The function name + types are self-evident.
- You would just be repeating the type signature in prose.

**On inline comments:** same rule as Python — why, not what.

---

## 4 — The "300-line rule" verdict

**Defensible as a soft cap, but it is not in any major style guide.**

- Google Python Style Guide: no file limit. Informal function guidance: ~40 lines before evaluating decomposition.
- Google JavaScript/TypeScript Style Guide: no file limit. 80-column line length only.
- An eslint community rule defaults to **200 lines** — more conservative than 300.
- The 300-line number is widely repeated by engineers in blog posts and talks, but the source is always anecdote.

**What actually matters is cohesion, not line count.**
A 400-line `service.py` that is all session-related logic is fine. A 150-line file that mixes auth, billing, and error handling is a problem.

**Practical rule for this project:**
- Functions: aim for < 40 lines (Python), < 50 lines (TypeScript). Exceeding this is a signal, not a law.
- Files: use 300 lines as a smell threshold. When you hit it, ask "does this file have one reason to change?" If no, split. If yes, keep going.
- Utils and constants files are exempt — they are legitimately longer.

---

## 5 — Sources

| Source | URL | Used for |
|---|---|---|
| fastapi-best-practices (zhanymkanov) | https://github.com/zhanymkanov/fastapi-best-practices | Domain structure, service layer, Pydantic usage, async patterns |
| Next.js official project structure docs | https://nextjs.org/docs/app/building-your-application/routing/colocation | App Router layout, colocation, private folders |
| Kent C. Dodds — AHA Programming | https://kentcdodds.com/blog/aha-programming | DRY vs AHA, abstraction timing |
| Google Python Style Guide | https://google.github.io/styleguide/pyguide.html | Docstrings, naming, function length |
| Steve Kinney — Zod Best Practices | https://stevekinney.com/courses/full-stack-typescript/zod-best-practices | Zod parse-at-boundary discipline |
| bugzmanov — Clean Code critique | https://bugzmanov.github.io/cleancode-critique/clean_code_second_edition_review.html | Which Clean Code advice ages badly |
| qntm.org — Stop recommending Clean Code | https://qntm.org/clean | Specific Martin anti-patterns |
| hrekov.com — Pydantic vs Dataclasses | https://hrekov.com/blog/dataclasses-vs-pydantic-model | When to use each, performance numbers |
| Pydantic docs — dataclasses | https://pydantic.dev/docs/validation/latest/concepts/dataclasses/ | Pydantic dataclasses as middle ground |
| leapcell.io — async pitfalls | https://leapcell.io/blog/understanding-pitfalls-of-async-task-management-in-fastapi-requests | Async task management, cancellation |
| theneuralbase — cancellation handling | https://theneuralbase.com/fastapi-for-ml/learn/intermediate/cancellation-handling-for-long-generations/ | CancelledError pattern in FastAPI |
| TypeScript JSDoc support | https://www.typescriptlang.org/play/javascript/modern-javascript/jsdoc-support.js.html | JSDoc in TS — omit type annotations |
| dev.to ESLint Prettier 2026 | https://dev.to/_d7eb1c1703182e3ce1782/eslint-prettier-setup-the-complete-developer-configuration-guide-2026-4p8k | Automated formatting setup |
| Wikipedia — Hungarian notation | https://en.wikipedia.org/wiki/Hungarian_notation | Why to avoid it |
| codewithjason — naming anti-patterns | https://www.codewithjason.com/variable-name-anti-patterns/ | Naming smells (get prefix, bool prefixes) |
| eslint file-length rule default | https://glama.ai/mcp/servers/@tbreeding/jira-mcp/blob/e7f58e7d9b12bec35a79fb829972804c4bbcdb21/eslint-rules/docs/file-length.md | 200-line default as data point |

---

## 6 — Watch out for (advice that ages badly in AI-generated codebases)

**Over-extraction (Martin's tiny functions).** AI agents trained on Clean Code examples will happily split a 30-line function into 8 private helpers, each called once. This increases scroll distance, obfuscates data flow (arguments turn into implicit state), and produces helpers with names like `_validate_and_prepare_session_context_for_gemini` that only confuse the next reader. The rule: extract a helper when it is called in 2+ places, or when it has a genuinely reusable job — not to satisfy a "small function" aesthetic.

**Ceremony class hierarchies.** Martin's SOLID examples often replace a 5-line switch with 4 classes + 1 interface. For a solo codebase with 1–3 concrete implementations, a plain dict lookup or a `match` statement is less ceremony and equally correct. Reach for polymorphism when there are 4+ implementations or when they are added/removed at runtime.

**Comment-as-documentation for things types already say.** AI agents write: `# Returns a list of Session objects` above `-> list[Session]:`. These comments rot the moment the return type changes. Types are documentation. Write comments for business reasoning, not data shapes.

**Premature `lib/` inflation.** The natural AI instinct is to move every shared function into `lib/` early, creating a flat graveyard of utilities with no obvious home. A function belongs in `lib/` only after it has two or more genuine callers. Before that, it lives next to the only caller.

**Over-Zodding.** Validating with Zod at every layer (API → hook → component) is a pattern AI agents reproduce because they see it in tutorials. It adds latency, produces duplicate error handling, and makes refactors harder. Parse once at the network boundary and trust the types thereafter.

**SRP applied to files instead of concerns.** "One class per file" (a Java habit Martin promotes) results in dozens of tiny files that are always opened together. Python and TypeScript both support multiple exports per file. Group by cohesion: if two things always change together, they belong in the same file.
