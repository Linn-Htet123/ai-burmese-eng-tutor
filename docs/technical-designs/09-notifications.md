# Notifications — Telegram bot + push + email, minimal by design

**Status:** Approved (2026-09-11)
**Author:** Larry (Thar Linn Htet)
**Last updated:** 2026-09-11

## Requirements this implements
- `R-NT-1` — learner picks a channel at signup (**amended by this doc:** MVP channels are Telegram / push / email; Viber, Messenger, SMS deferred — PRD channel list to be updated on approval)
- `R-NT-2` — one daily reminder at a learner-chosen time on no-session days; on by default, one tap off
- `R-NT-3` / `R-FA-7..9` — absence messages at 3/7/14 days, hard cap of three, ever
- `R-NT-4` — session-12 message with the before/after clip + referral ask
- `R-NT-5` — no marketing to active learners
- `R-NT-6` — one-tap Burmese unsubscribe in every message
- Plus doc 08's renewal reminder (period_end − 3 days)

## Related decisions
- `D-042` renewal reminder · `D-049` `notifications` table · `D-052` founder email alerts (separate concern)
- This doc's decisions (logged on approval as D-053): **Telegram bot as primary channel; Firebase (FCM) web push and email alongside; Viber/Messenger/SMS all deferred; in-process daily scheduler**

## Context

The PRD flagged "verify feasibility before promising" on Viber/Messenger — verified 2026-09-11 and confirmed infeasible at MVP (partner minimums ~€150–200/month; Messenger's 24-hour window prohibits scheduled reminders). Founder call: **Telegram bot** as the primary channel — free, no approval process, growing Burmese usage — plus web push and email. SMS (cheap but one-way, ~12 MMK/msg via local gateways) is skipped for now and stays the documented fallback if Telegram adoption in the cohort disappoints.

**Channel comparison (research + founder call):**

| Channel | Cost | Onboarding friction | Verdict |
|---|---|---|---|
| **Telegram bot** | **Free, unlimited** (Bot API) | learner taps one link, presses Start | ✅ **Primary** |
| **Web push (Firebase FCM)** | Free | browser permission prompt; **iOS Safari requires add-to-home-screen first** | ✅ Secondary — great on Android, unreliable on iPhone |
| **Email** | ~free (provider exists per D-052) | none | ✅ Third — for learners who gave one |
| SMS (SMSPoh, ~12 MMK/msg) | ~$2–3/mo total | none | 🟡 Deferred — the fallback if Telegram adoption is weak |
| Viber Business | €150–200/mo minimums via partners | partner onboarding | ❌ Deferred |
| Messenger | free-ish | 24h window bans scheduled reminders; app review | ❌ Deferred |

## Decision

**Three live channels: Telegram (primary), FCM web push, email.** A learner can have several connected; each message type sends on the learner's preferred channel with fallback down the list (Telegram → push → email).

### Connecting channels (at signup's channel step, and later from settings)

- **Telegram:** "Connect Telegram" button → opens `t.me/<our_bot>?start=<one-time token>` → learner taps **Start** → our webhook receives the token, links `telegram_chat_id` to the learner. Two taps total. The bot also gives us a free *human* support channel — learners can reply, and replies land in an admin inbox view.
- **Push:** browser permission prompt (asked at the channel step with a Burmese explainer first, same pattern as the mic prompt R-ON-3). Android Chrome: normal. **iOS Safari: only works after add-to-home-screen** — the UI detects iOS and shows the install hint; push is never promised as reliable on iPhone.
- **Email:** already collected at signup where given.
- No channel connected → in-app-only (a banner on next visit); the funnel nudges Telegram as the "best" option.

### The four message types (complete list — R-NT-5 means there is no fifth)

| Type | Trigger | Budget |
|---|---|---|
| Daily nudge | learner-chosen time, only on no-session days (R-NT-2) | on by default, one-tap off |
| Absence sequence | 3 / 7 / 14 days without a session (R-FA-7..9) | **hard cap 3 per absence episode**, then silence |
| Renewal reminder | period_end − 3 days (doc 08) | 1 per cycle |
| Session-12 moment | 12th completed session: before/after clip + referral ask (R-NT-4) | once ever |

All copy Burmese, warm, no guilt (R-FA framing). Every message carries the one-tap opt-out (R-NT-6): Telegram gets an inline "မလိုတော့ပါ" button; push/email get a token link to a no-login Burmese opt-out page.

### Mechanics

- **Scheduler:** the in-process daily job (shared with doc 08's grace transitions, per D-041's no-queue rule) computes due messages from `sessions`, `subscriptions`, and preferences, writes `notifications` rows, sends. Idempotent by (learner, template, date) — restarts never double-send.
- **Sending:** one `notify(learner, template, vars)` module; adapters behind it (Telegram Bot API, FCM, email) — the `storage.py` wrapper pattern (D-039). Adding SMS later = one adapter.
- **Absence cap:** counted from `notifications` rows in the current episode (episode resets on any completed session) — the cap is data, not memory.
- **New learner columns:** `telegram_chat_id`, `push_subscription` (JSONB), `preferred_channel`, `nudge_time`, `notifications_enabled` — small D-049 amendment, one migration.
- **Failures:** fall down the channel list once; then drop. A reminder is not worth a retry queue.

## Alternatives considered
- **SMS-first (the pre-founder-call draft of this doc)** — cheap (~$3/mo) and zero-friction, but one-way, and the founder prefers channels learners can reply on. Deferred, kept as the documented fallback if cohort Telegram adoption is weak.
- **Viber Business Messages** — where Burmese users classically are, but partner minimums are 60–80× the need at this scale. Deferred; the signup channel screen can still measure demand with a greyed entry.
- **Messenger** — the 24-hour window + tag policy prohibits exactly our use. Deferred indefinitely unless policy changes.
- **Native mobile app for reliable iOS push** — an app is out of scope by platform decision (web, R-PL). Rejected.

## Trade-offs
- **Telegram reach in Myanmar is a founder market call**, not a verified stat — mitigated by measuring: the channel-connect rate in cohort 1 is the test, and SMS is the ready fallback.
- **iPhone learners have weaker delivery** (no reliable push; Telegram-on-iOS works fine though). Accepted — Telegram is the answer for iOS too.
- **Firebase enters the stack** (FCM only) — one more vendor, though free and isolated behind the adapter. Accepted for Android reach.
- **Bot replies create a support surface** — learners will message the bot expecting answers. Accepted deliberately: at cohort scale that inbox is a feature (founder hears users), not a burden.

## Open questions
- [ ] Bot identity: name/handle + Burmese welcome copy (blocked on product name, O-8). (Owner: Larry)
- [ ] FCM web push implementation details (service worker scope in Next.js, iOS install-hint UX) — spec at build time. (Owner: Larry)
- [ ] Does the daily-nudge default time question live in signup Q-flow or first-session-end? (Owner: Larry)
- [ ] PRD R-NT-1 amendment wording (channel list update) — apply with the next PRD editing pass. (Owner: Larry)

## Rollout / next steps
- [ ] Create the bot (@BotFather), webhook endpoint, `t.me` deep-link connect flow.
- [ ] `notify()` module + Telegram/FCM/email adapters; learner columns migration.
- [ ] Daily job (with doc 08's transitions); opt-out page; admin inbox view for bot replies.
- [ ] Session-12 hook lands with the session engine's completion path.
- [x] Logged as D-053 (2026-09-11).

## Sources (research 2026-09-11)
- https://smspoh.com/v3/ (SMS fallback pricing)
- https://messaggio.com/operators/viber-mm/ · https://messaggio.com/pricing-viber/ (Viber partner minimums)
- https://www.forbusiness.viber.com/en/messaging-partners/ (partner requirement)
- https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy (24-hour window)
- Telegram Bot API and FCM are free-tier, first-party documented platforms (core.telegram.org/bots · firebase.google.com/docs/cloud-messaging)
