---
paths: ["apps/api/**/*.py", "backend/**/*.py", "api/**/*.py"]
---
# Backend (FastAPI / Python) — loads only when touching backend files

Reads on top of `coding.md`. This file only holds Python + FastAPI + async specifics.

## Teaching mode

Larry is still learning FastAPI, Python asyncio, and WebSockets. When you touch these, explain the change in 2-3 simple lines with a real-life comparison. Example: "This uses `Depends()` — think of it like a coffee shop asking every customer 'what size?' before they order. FastAPI runs `get_current_user()` before the route body, injects the result."

## Project layout — domain first

Every domain gets its own folder under `src/`:

```
apps/api/src/
├── main.py               # app factory, lifespan, router mounts, CORS
├── config.py             # BaseSettings — env vars
├── database.py           # SQLAlchemy engine + session factory
├── session/              # voice session domain
│   ├── router.py         # HTTP + WebSocket endpoints
│   ├── schemas.py        # Pydantic request/response models
│   ├── models.py         # SQLAlchemy ORM models
│   ├── service.py        # business logic + DB queries
│   ├── dependencies.py   # FastAPI Depends() functions
│   └── exceptions.py     # domain-specific HTTPExceptions
├── user/                 # same 6 files
├── voice/                # Pipecat + Gemini Live plumbing
│   ├── pipeline.py       # pipeline factory
│   ├── handlers.py       # event handlers
│   └── transport.py      # WebSocket transport wrapper
├── langgraph/            # LangGraph slow-brain
│   ├── graph.py          # graph definition
│   ├── nodes.py          # individual node functions
│   └── state.py          # TypedDict state schema
├── storage/              # R2 + audio helpers
│   └── r2.py
└── shared/               # cross-domain utils (only if used by 3+ domains)
    ├── logging.py
    └── errors.py
```

**Rules for this layout:**
- Do NOT create `routers/`, `services/`, `models/` top-level folders. Group by domain, not by type.
- `shared/` only for utilities used by 3+ domains. Keep it tiny.
- `voice/` and `langgraph/` are their own modules because they're big and have distinct reasons to change.

## Functions first, class only for stateful DI

- **Route handlers, service functions, and utilities are plain `async def`.**
- **Reach for a class only when you need a configurable, reusable client** (e.g. an `R2Uploader` class that takes a bucket name in its constructor).
- **Never use a class just to "hold related functions"** — that's what a module is.

## Pydantic at the edge, dataclass inside

- **Pydantic BaseModel:** for every request body, response model, and `BaseSettings` env config. This is the boundary.
- **`@dataclass` or `TypedDict`:** for internal data containers that are already validated. Pydantic is 10-25× slower than dataclass assignment — don't pay that cost on data that's already trusted.
- **`Depends()` for injection:** never `global` state, never module-level singletons for things that change per request.

## Never block the event loop

Any blocking call inside `async def` halts the entire event loop and stops other requests.

- **Blocking I/O in async:** wrap with `await asyncio.get_event_loop().run_in_executor(None, blocking_fn)`.
- **Long-running tasks:** track with `asyncio.Task`, catch `asyncio.CancelledError` when the client disconnects, clean up explicitly (close sockets, cancel Gemini connection).
- **WebSocket loops:** always use `try/finally` around the receive loop to guarantee cleanup even on cancellation.

## Typed request/response — no loose dicts

- **Every API boundary has a Pydantic model.** No `dict[str, Any]` in a return annotation. No untyped `**kwargs` for public functions.
- **Response models are separate from ORM models.** Never return an ORM object directly — even if it "just works". The response model is the contract.

## Retry, timeout, fallback — one place per policy

- **One retry policy per external service.** Not sprinkled in every call site.
- **Explicit timeouts on all external calls.** No unbounded `await httpx.get(url)`. If you don't set a timeout, one exists you don't like.
- **Circuit breakers are premature at MVP scale.** Skip until you see repeated cascading failures.

## No repository layer at MVP

- **Query the DB from `service.py` directly** via SQLAlchemy. No `session_repository.py`, no `SessionRepository` class.
- **The repo layer pays off only when you need to swap storage backends.** That won't happen in cohort 1. If it ever happens, add it then — not now.

## Google-style docstrings on public functions

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

**Rules:**
- One-line summary ending with `.`, blank line, then `Args:` / `Returns:` / `Raises:` when non-trivial.
- No docstring on private helpers (`_` prefix) unless the logic is genuinely tricky.
- No docstring that just restates the signature. If you'd write "Gets the user by ID" above `def get_user(user_id: int) -> User`, delete it.

## Testing

- **Use pytest** with `pytest-asyncio` for async tests.
- **Mirror the domain structure under `tests/`.** `tests/session/test_service.py` tests `src/session/service.py`.
- **Test scenario ids match the spec.** `def test_S1_happy_session_starts_when_no_active_session(): ...` — this is how `/qa` finds them.
- **Fixtures live in `conftest.py`** at the closest matching level.

## SQLAlchemy

See `db.md` for schema, migration, and query patterns.
