# Auth and consent — the front door

**Status:** Approved (2026-09-11)
**Author:** Larry (Thar Linn Htet)
**Last updated:** 2026-09-11

## Requirements this implements
- `R-ON-1` — phone or email + password; account created in under 30 seconds; no social login
- `R-ON-2` / `R-TP-7` — the five signup questions, all skippable except name+gender
- `R-ON-3` — mic permission with in-page Burmese explanation before the browser prompt, then the 5-second record-and-playback test
- `R-ON-6..7` — free placement after signup; placement audio recorded and retained (consent 1 must exist first)
- `R-ON-9` — landing to speaking in under 3 minutes
- `R-PR-4` — two separate consents, never bundled: recording (signup), marketing use (~session 12)
- `R-TE-10` — per-learner access control on everything a learner owns
- Closes one D-049 open question (placement artefacts); the learner-deletion flow is explicitly parked (see Open questions)

## Related decisions
- `D-033` five questions · `D-040` deletion on request, complete · `D-041` no auth vendor · `D-042` subscription gates
- This doc's decisions (logged on approval as D-051): **JWT auth with DB-backed refresh tokens in httpOnly cookies; no phone OTP at MVP; email-based password reset with founder-assisted fallback**

## Context

The signup funnel is the product's most fragile flow ("most people who abandon do it here" — PRD section 5). Every design choice here optimises for speed-to-speaking and zero avoidable failure points, at cohort-1 scale where the founder personally knows every paying learner. No auth vendor (D-041): this is a few endpoints with hashed passwords.

## Decision

### Signup flow (implements PRD 5.1)

```
Landing (Burmese) → "Try a free session"
  → identifier + password                    identifier = phone OR email; email encouraged
                                             ("needed to recover your password")
  → Q1 name + gender (required)              account row created HERE — under 30s so far
  → Q2–Q5 age band / occupation / prep goal / city — each skippable
  → consent 1: session recording             plain Burmese, one checkbox, REQUIRED to proceed
                                             (no recording = no placement = no product, R-ON-7)
  → mic explain (Burmese) → browser prompt → 5s record + playback test
  → placement session starts
```

- Passwords hashed with **argon2id** (the current standard; bcrypt acceptable fallback).
- Phone numbers normalised to E.164 (+95…); uniqueness on the normalised form.
- **No OTP verification at MVP.** Signup speed (R-ON-1/9) beats data purity; monthly manual payment contact (D-042) *is* the human verification. Revisit with automated payments.
- Consent rows: `consent_recording_at` set at signup (blocking), `consent_marketing_at` requested around session 12 by May in-session + a UI prompt — separate action, never pre-checked (R-PR-4).

### Sessions: JWT with a revocable refresh token

- **Access token:** JWT, 15-minute expiry, carried in an **httpOnly, Secure, SameSite cookie** — never localStorage (XSS). Contains learner id only.
- **Refresh token:** opaque random value, stored hashed in a `refresh_tokens` table (learner, hash, expires ~30d, revoked_at). Refresh rotates the token. **Revocation = delete the row** — the kill switch pure JWT lacks.
- **WebSocket auth:** the voice socket authenticates via the same cookie at upgrade time (same origin); the conductor re-checks subscription status (`active`, D-042) before starting any non-placement session.
- **Authorisation rule (R-TE-10), stated once and enforced everywhere:** every learner-owned resource query is scoped `WHERE learner_id = current`. The founder role bypasses via an `is_admin` flag on `learners`. There are exactly two roles; no role system is built.

### Password reset

- **Email on file:** single-use, 30-minute reset link by email.
- **Phone-only learners:** "Forgot password" shows Burmese copy → contact us on Viber/Messenger → founder verifies identity (he knows all 50 via payment) → admin page issues a temp reset code. Founder-assisted is the fallback, not the norm — signup copy nudges everyone to add an email.

### Placement artefacts (closes the D-049 open question)

Placement runs as a `sessions` row with `session_type='placement'`. Its outputs: assigned level + confidence + transcript ref stored **on the session row** (JSONB result field); the level assignment itself written to `level_history` with reason `placement` — one transaction. Manual founder review of early placements (D-027) is a flag on that history row (`reviewed_at`).

### Learner deletion — deliberately NOT designed at MVP

D-040's promise stands (deletion on request, complete), but no flow is built: at cohort-1 scale a request may never come, and if one does, the founder deletes by hand that day (R2 objects, then rows). The design questions — payment-record retention under Myanmar accounting rules, deletion log, exact anonymisation — are parked in Open questions and get a real design only when either a request arrives or the business registers and an accountant answers the retention question.

## Alternatives considered
- **Server-side sessions (cookie + session table)** — simplest and instantly revocable; my original recommendation. Founder chose JWT (familiar from the JS ecosystem); the DB-backed refresh token restores revocability, landing within one step of the same safety.
- **Auth vendor (Clerk/Auth0/Firebase)** — rejected in D-041: per-user pricing against a $25/month product, and R-ON-1's flow is small.
- **Phone OTP at signup** — cleaner numbers, but needs the Myanmar SMS provider now (doc 09's research), adds cost + a failure point to the funnel's most fragile step. Deferred to the automated-payments era.
- **SMS reset codes** — same SMS dependency for a flow ~2 people/month use at this scale. Rejected for MVP.
- **localStorage tokens** — XSS-exposed; httpOnly cookies close that door. Rejected.

## Trade-offs
- **JWT + refresh is more moving parts than plain sessions** (expiry handling, rotation) — accepted as the founder's familiarity choice, with the revocation gap closed by the DB-backed refresh token.
- **Unverified phone numbers** — typos possible; discovered at first founder payment contact. Accepted.
- **Founder in the reset loop for phone-only users** — minutes/month at cohort scale; scales badly, tracked for the automated-payments revisit.
- **A required consent at signup adds one screen** to the funnel — unavoidable: without consent 1 there is legally and product-wise no placement recording (R-ON-7).

## Open questions
- [ ] Exact Burmese consent copy (both consents) — write with the marketing-plan voice; the checkbox text is a trust moment. (Owner: Larry)
- [ ] JWT signing key rotation practice (single HS256 secret in Railway env at MVP — document the rotation step). (Owner: Larry)
- [ ] **Learner deletion flow — whole design parked** (founder-by-hand suffices at MVP). Blockers to designing it properly: Myanmar payment-record retention rules (ask the accountant at business registration), deletion log shape, anonymisation detail. (Owner: Larry)

## Rollout / next steps
- [ ] Endpoints: signup, login, refresh, logout, reset-request, reset-confirm — FastAPI, ~6 routes.
- [ ] `refresh_tokens` table joins the D-049 schema (migration alongside `learners`).
- [ ] Consent-2 prompt wiring lands with the session engine's session-12 hook.
- [x] Logged as D-051 (2026-09-11).
