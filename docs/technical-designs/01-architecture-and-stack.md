# Architecture overview and stack manifest

**Status:** Approved (2026-09-09)
**Author:** Larry (Thar Linn Htet)
**Last updated:** 2026-09-10 (cost figure + concurrency numbers aligned with D-042)
**Diagram:** [source](diagrams/product-overview-architecture.drawio) · [preview](diagrams/product-overview-architecture.svg)

## Requirements this implements
This doc is the map, not a feature. It carries the cross-cutting requirements every other design inherits:
- `R-PL-1..` — web app, mobile-first; Chrome/Android + Safari/iOS on mid-range phones over mobile data
- `R-TE-1` — sub-1-second voice latency (drives hosting region, transport, and the no-framework hot path)
- `R-TE-8` — billed tokens logged per session per stage from day one (drives observability choices)
- `R-ON-1` — phone/email + password auth, no social login for MVP
- `R-PY-1` — payment without international cards (MVP: manual bank transfer per D-026)

## Related decisions
- `D-035` proxy voice path · `D-036` WebSocket + heartbeat · `D-037` Railway Singapore · `D-038` Next.js + FastAPI · `D-039` R2 audio storage · `D-040` recordings kept forever
- `D-041` (this doc): remaining stack picks — Railway Postgres, SQLAlchemy 2.0 + Alembic, Sentry + PostHog, Tailwind + shadcn/ui
- `D-011` / `D-026` — item log from the live model; manual payment activation

## Context

Scale reality: cohort 1 is ~50 learners on the D-042 subscription (daily 40-minute sessions, ~70% attendance), peak ~10–15 concurrent voice sessions on Myanmar evenings. Every choice below optimises for **one solo founder shipping fast at small scale** — boring, few vendors, one platform — while protecting the two hard product constraints: sub-1s voice latency and never losing a recording.

## Decision — the shape

Two services, one platform, one region:

```
                    ┌────────────────────────── Railway · Singapore ─────────────────────────┐
                    │                                                                        │
 Learner phone ────►│  Next.js frontend (TS)      FastAPI backend (Python)      PostgreSQL   │
 (Chrome/Safari)    │  · app shell, UI            · WebSocket voice proxy       (Railway)    │
                    │  · Tailwind + shadcn/ui     · session state machine                    │
                    │                             · LangGraph (slow brain)                   │
                    │                             · SQLAlchemy + Alembic                     │
                    └───────────────┬────────────────────────┬───────────────────────────────┘
                                    │                        │
                              Gemini Live              Cloudflare R2
                              (voice AI)               (audio files)
```

## The full manifest

### Core stack
| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Next.js** (TypeScript) | Founder's strong side. Mobile-first. |
| UI | **Tailwind CSS + shadcn/ui** | Owned components, light enough for mid-range phones |
| Backend | **FastAPI** (Python 3.12+) | Holds the voice WebSocket; founder learning investment (D-038) |
| Agent framework | **LangGraph** (Python) | Planner, post-session processor, level judge (D-048). **Never in the audio hot path** |
| Voice plumbing | **Pipecat** | Browser audio ↔ Gemini Live: transport, VAD, interruptions (D-045). Version-pinned |
| ORM / migrations | **SQLAlchemy 2.0 + Alembic** | Migrations only — the `db:migrate`, never `db:push` discipline |
| Database | **PostgreSQL on Railway** | Same platform, private network to backend, ~$5/mo |
| Object storage | **Cloudflare R2** | Audio recordings; zero egress (D-039) |
| Audio tooling | **ffmpeg** | In the backend image; Opus → M4A transcode |
| Hosting | **Railway**, Singapore region | Both services + Postgres (D-037) |

### Third-party services
| Service | Used for | Cost at MVP | Failure blast radius |
|---|---|---|---|
| **Gemini Live** (Google) | STT + LLM + TTS, item log | ~$6.15/learner/month realistic; ~$8.80 whale (BRD §3.3 / D-042) | Sessions down → text review fallback (R-TE-9). Biggest lock-in (D-011 trick is Gemini-specific) |
| **Cloudflare R2** | Audio file storage | ~$0.20/mo | Playback down; capture buffers on disk, uploads retry |
| **Sentry** | Error tracking, FE + BE | Free tier | None (observability only). Founder already uses it |
| **PostHog** | Product analytics — the landing→signup→placement→paid funnel | Free tier | None (observability only) |
| **Railway** | All hosting | ~$15–30/mo | Everything down — accepted single point at MVP (D-037) |

### Deliberately NOT used (MVP)
| Not using | Why |
|---|---|
| Stripe / Paddle | D-026: manual bank transfer + founder activates by hand. International rails come post-MVP |
| Auth provider (Clerk/Auth0/etc.) | R-ON-1 is phone/email + password — a few endpoints with hashed passwords. A vendor adds cost + complexity for less than it gives |
| Redis / cache layer | Session state lives in the FastAPI process + Postgres. ~10–15 concurrent sessions doesn't need a cache |
| Queue (Celery/SQS/etc.) | Session-end jobs run in-process (asyncio background tasks). Revisit if transcode CPU hurts live sessions |
| Vercel / CDN | D-037. Next.js on Railway serves ~50 users fine; add a CDN when static-asset latency measurably hurts |
| Docker Compose locally | Both services run natively (`npm run dev`, `uvicorn`); Railway builds from the repo |

### Notification providers (deferred)
Viber / Messenger / SMS / email providers (R-NT-x) get their own design doc — provider choice (e.g. Viber Business API vs local SMS gateway) needs Myanmar-specific research and blocks nothing else.

### Repo and environment shape
- **One monorepo**, two deployables: `apps/web` (Next.js) + `apps/api` (FastAPI). Shared nothing at code level; they talk HTTP/WS only.
- **Environments:** local (native processes, `.env`, cloudflared tunnel for phone testing) → production (Railway). No staging until there are paying users to protect.
- **CI:** GitHub Actions — lint + tests on PR. Railway auto-deploys `main` on merge.

## Alternatives considered
- **Neon / Supabase for Postgres** — free tiers, branching. Rejected: another vendor and public-internet DB traffic when Railway Postgres sits on the private network next to the backend. Neon stays the fallback if Railway Postgres misbehaves.
- **SQLModel** — simpler FastAPI-native ORM. Rejected: smaller community; SQLAlchemy is the durable skill and the ecosystem default.
- **Auth vendor (Clerk/Auth0)** — faster start. Rejected: R-ON-1's phone+password flow is small, and per-user vendor pricing is wrong for a $30-ish course product.
- **No analytics until later** — rejected: the onboarding funnel (R-ON) is the product's riskiest flow and must be measured from learner #1.
- **Full microservices / queues / Redis** — rejected on scale reality: ~10–15 concurrent sessions. Add moving parts only when a measured bottleneck demands them.

## Trade-offs
- **Railway is a single point of failure** for app + DB. Accepted at MVP; the R2/Gemini dependencies fail independently.
- **Two languages** (TS + Python) — accepted in D-038 as a learning investment.
- **No staging environment** — production breaks are possible on every deploy; mitigated by docs-first design, tests in CI, and tiny cohort size.
- **In-process background jobs** — a backend restart mid-transcode delays (not loses) a recording; the .ogg files are already on disk and the job retries on boot.

## Open questions
- [ ] Monorepo tooling: plain folders vs turborepo — decide when the repo is scaffolded. (Owner: Larry)
- [ ] Python dependency manager: uv (recommended, fast) vs poetry. (Owner: Larry)
- [ ] PostHog: cloud (EU/US) vs self-host later — cloud free tier to start. (Owner: Larry)
- [ ] Domain + DNS (blocked on product name, O-9).

## Rollout / next steps
- [x] Approved 2026-09-09 → D-041 logged.
- [ ] Remaining design docs against this map: session engine, data model, auth + consent, content authoring, review queue, payments + activation, notifications.
- [ ] Week-one spike (02-voice-pipeline) validates the riskiest column of the manifest: Gemini Live from Railway Singapore.
