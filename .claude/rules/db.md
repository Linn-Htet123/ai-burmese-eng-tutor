---
paths: ["**/migrations/**", "**/schema/**", "**/lib/db/**", "**/alembic/**", "apps/api/src/**/models.py", "apps/api/src/database.py"]
---
# Database (PostgreSQL / SQLAlchemy / Alembic) — loads only when touching schema, migrations, or ORM models

Reads on top of `coding.md` and `backend.md`. This file only holds DB-shape and migration specifics.

## The golden rules

1. **Migrations only.** Alembic-generated migrations, always. Never a schema-push. A hook blocks it, but never even reach for one.
2. **Ask Larry before ANY schema change.** State which table, which column, and how to undo it.
3. **Production databases are read-only for us** unless the ticket explicitly says otherwise.

## Migration flow

```
1. Edit the SQLAlchemy model in src/<domain>/models.py
2. Generate the migration:  alembic revision --autogenerate -m "add sessions.paused_at"
3. Review the generated SQL in alembic/versions/*.py — look for wrong types, missing indexes, unintended drops
4. Run the migration:       alembic upgrade head
5. Commit the model change AND the migration file in the same commit
```

**Never:**
- Hand-write a plain `CREATE TABLE` migration. Let autogenerate do the first pass; you edit if needed.
- Squash migrations after they've hit shared branches. History is the audit trail.
- Delete a migration file without a rollback plan.

## Conventions

Applied to every table:

- **Primary keys are UUID** (`gen_random_uuid()`). Safe in URLs — never leak sequence numbers.
- **`created_at` and `updated_at`** are `TIMESTAMPTZ`, always in UTC. The app renders in Asia/Yangon at display time.
- **No soft deletes.** Deletion means actually delete — rows AND R2 objects. The only "delete" flow at MVP is learner-requested full data deletion.
- **Normalize what you query, JSONB what you pass around.** Plans are JSONB (write-once, read-once, never queried inside). Review items are proper rows because you query them by `next_review_at`.

## SQLAlchemy 2.0 patterns

- **Use `select()` + `session.execute()`**, not the legacy `Query` API.
- **Model definitions use `Mapped[T]`** typed columns.
- **Relationships use `Mapped[list["Foo"]]`** with lazy loading tuned per relationship (default: `"selectin"` for one-to-many, `"joined"` for one-to-one that always loads together).

```python
class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship(back_populates="sessions", lazy="selectin")
```

## Indexes are intentional

- **Every foreign key gets an index.** Autogenerate misses some — check the migration.
- **Every column used in a `WHERE`, `ORDER BY`, or `JOIN` gets an index** if the table has 1000+ rows expected.
- **Partial indexes** for common filtered queries: `CREATE INDEX ... ON sessions (user_id) WHERE status = 'active'`.
- **No index on columns you never query.** Extra indexes cost writes.

## Query patterns

- **Query in `service.py`, not in `router.py`.** Routes call service functions; they don't touch the ORM directly.
- **Return the ORM object from `service.py`; convert to a Pydantic response model in the router.**
- **Explicit joins** — no lazy loading in hot paths. `selectinload()` or `joinedload()` on the query when you know you'll access the relation.
- **Use `scalar_one_or_none()` / `scalar_one()` for single-row queries.** Not `first()` (deprecated in SQLAlchemy 2.0).

## Transactions

- **One transaction per request** — FastAPI's `Depends(get_db)` yields a session that commits on success, rolls back on exception.
- **Never commit mid-service-function** unless you have a specific reason (e.g. releasing a lock).
- **`with session.begin_nested()`** for savepoints when you need to attempt-and-recover within a request.

## JSONB columns — when yes

Use JSONB for:
- **Pass-around config** — session plans (written once, read once by the conductor, never queried inside).
- **Structured events with variable shape** — `item_log_events.event_data` where log payloads differ by event type.

Do NOT use JSONB for:
- **Anything you'll query by** (`WHERE payload->>'user_id' = ...`). Extract that column into a proper field.
- **Simple key-value pairs.** If it's always the same 3 keys, use 3 columns.

## Naming

- **Tables are plural, lowercase, snake_case:** `sessions`, `review_items`, `token_usage`.
- **Foreign keys end in `_id`:** `user_id`, `plan_id`.
- **Boolean columns start with `is_`, `has_`, or `can_`:** `is_active`, `has_marketing_consent`.
- **Timestamps end in `_at`:** `created_at`, `paused_at`, `deleted_at` (if we ever add soft delete, which we won't).
- **Never abbreviate** unless the abbreviation is more common than the full word (`id`, `url`, `api`).

## Test databases

- **Tests use a separate test database.** Never point tests at production or dev DBs.
- **Fixtures create fresh data per test.** No shared fixtures that mutate rows across tests.
- **Use `pytest-asyncio` + `sqlalchemy.ext.asyncio`** for async DB tests.
- **Transactions rolled back at the end of each test** — fastest way to keep tests isolated.
