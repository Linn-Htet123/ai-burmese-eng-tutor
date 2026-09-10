# Payments — the manual rail, written down properly

**Status:** Approved (2026-09-11)
**Author:** Larry (Thar Linn Htet)
**Last updated:** 2026-09-11

## Requirements this implements
- `R-PY-1` — payment without an international card
- `R-PY-2` — one-session-per-day cap (enforced at session start against the active subscription)
- `R-ON-6` — the paywall appears only after the free placement ends
- PRD 13.2 — manual bank transfer + manual activation (D-026, D-042); founder handles monthly renewal outreach

## Related decisions
- `D-026` manual transfer + founder activation · `D-042` $25/month subscription, monthly renewal accepted as founder work
- `D-049` `subscriptions` + `payments` tables
- This doc's decisions (logged on approval as D-052): **personal-wallet P2P rails (KPay/Wave/AyaPay/PromptPay QR + bank fallback); required receipt-screenshot upload with claims; founder notified by email; 3-day grace period; renewal reminder at period_end − 3 days**

## Context

No payment provider exists in the MVP loop — the "rail" is a bank transfer screenshot and the founder's eyes (D-026). This doc's job is to make that manual process **stateful and honest in the product**: the learner always knows where their money stands, the founder has one screen to work from, and nothing depends on memory.

## Decision

### Payment methods shown (all personal-account transfers — zero business integration)

| Method | For | What the paywall shows |
|---|---|---|
| **KBZPay (KPay)** | Myanmar mass market | founder's wallet number + static QR image (exported from the KPay app) |
| **Wave Pay** | Myanmar mass market | number + static QR |
| **AyaPay** | Myanmar | number + static QR |
| **PromptPay QR (THB)** | Thailand-based Burmese | static PromptPay QR + THB price |
| **Bank transfer** | fallback | account details |

These are P2P transfers to the founder's own accounts — no merchant API, no entity requirement, exactly what D-026 intended made concrete. QR images are founder-uploaded config assets, not code. Prices shown in MMK and THB with the $25 anchor; figures are founder-set config (exchange reality moves).

### The flow

```
Placement ends → paywall (Burmese):
  price + method tabs (KPay / Wave / AyaPay / PromptPay / bank)
  each tab: number with copy button + QR to scan
       │
  learner transfers in their wallet app, screenshots the receipt
       │
  learner taps "I have paid" → uploads the receipt screenshot (required)
       ▼
  payments row: status=claimed, receipt stored     learner sees
  founder gets an EMAIL: "new payment claim         "confirming your
  from <name>, <method>, <amount>" + admin link      payment…"
       ▼
  founder opens admin pending list → sees claim WITH the receipt image
  → cross-checks wallet app → taps Activate (or Reject with reason)
       ▼
  payments row: received_at + activated_at set
  subscriptions row: active, period = today → +1 month
  learner notified on their channel — first session unlocked
```

- **The receipt screenshot is the load-bearing piece:** matching a claim against the wallet app takes seconds when the receipt (amount, time, transaction ref) is right there in the admin view.
- **Receipt storage:** private R2 object (`receipts/{learner}/{payment}.jpg`), founder-only access, key on the `payments` row — same storage stack as recordings (D-039), nothing new.
- **Founder notification = plain email** to the founder's address, sent via the same transactional-email provider the password-reset flow needs anyway (e.g. Resend free tier — joins the doc-01 manifest). No Firebase: that is mobile-push infrastructure, the wrong tool for "one email to one founder."
- Activation is idempotent and logged (who, when) — the audit trail is the `payments` table itself (D-049).

### Renewal (monthly, founder-driven per D-042)

```
period_end − 3 days:  renewal reminder on the learner's channel (counts within
                      the notification budget, warm copy — "your month renews")
period_end:           subscription → grace (access continues)
period_end + 3 days:  subscription → expired (sessions blocked, review/progress
                      pages still readable — never lock a learner out of their
                      own history)
any time:             transfer arrives → founder activates → new period starts
                      from activation day (not stacked from period_end — the
                      learner never pays for dead days)
```

- **Grace period: 3 days.** Bank transfers and salary timing are lumpy in Myanmar; cutting access at midnight for a transfer that lands Tuesday is churn for nothing. Grace shows a gentle banner, not a lock.
- **Expired ≠ deleted.** Review queue, recordings, progress remain readable forever; only new sessions gate on `active/grace`.

### Admin screens (two, both small)

1. **Pending payments** — claimed-but-unactivated list: learner, amount, note, claimed_at → [Activate] [Reject with reason]
2. **Subscription board** — who's active / in grace / expired, days to period_end — the founder's renewal-outreach worklist

### Enforcement points (exactly three in code)

- Session start (conductor): subscription in `active` or `grace`, and no completed session today (R-PY-2's daily cap)
- Paywall routing: unpaid learners land on the paywall after placement, everywhere else redirects there
- Everything else (progress, playback, review reading) checks **nothing** — paid-for artefacts stay accessible

## Alternatives considered
- **Stripe/Paddle now** — most target users have no international card (R-PY-1); deferred per PRD 13.2.
- **KBZPay/Wave merchant API integration** — automated confirmation, but merchant onboarding + business-entity requirements are unverified; the personal-wallet P2P version above gets the same reach with zero integration. Deferred until volume justifies the entity work.
- **Firebase for founder notification** — mobile-push infrastructure for a one-recipient alert; a transactional email (provider already required by password reset) does it with zero new services. Rejected.
- **No "I have paid" button / no receipt upload** (founder just watches the wallet apps) — fewer states, but the learner waits blind, messages the founder anyway, and matching unlabeled transfers across four wallets is guesswork. Rejected.
- **Stacking renewal periods from period_end** — punishes late payers with paid-for dead days. Rejected; period starts at activation.
- **No grace period** — hard cut at period_end. Rejected: transfer latency is not learner fault; 3 days costs ~$2.5 of sessions at worst and protects renewal goodwill.

## Trade-offs
- **Founder time scales linearly with subscribers** (~2 min/renewal × 50 = manageable; ×500 = not). Accepted by D-042; the subscription board keeps it a checklist, and the automated-rail decision re-opens at real volume.
- **"Claimed" can be abused** (tap without paying) — it grants nothing; it only puts you on the founder's list. No exposure.
- **Config-set MMK price** means price changes are a config edit with no history — mitigated: the `payments` rows record what was actually paid.

## Open questions
- [ ] Exact MMK + THB launch prices and which wallet accounts/QRs shown — founder config at launch, not code. (Owner: Larry)
- [ ] Email provider pick (Resend vs alternatives, free tiers) — small; decide when wiring password reset, add to the doc-01 manifest. (Owner: Larry)
- [ ] Receipt screenshots: retention (delete after activation + N months?) and max upload size on mobile data. (Owner: Larry)
- [ ] Renewal reminder copy + whether a second reminder inside grace is worth one of the three notification slots (interacts with doc 09). (Owner: Larry)
- [ ] Refund policy wording (PRD 13 mentions refund-requested as an analytics event; the policy itself is a founder/marketing call). (Owner: Larry)

## Rollout / next steps
- [ ] Paywall page + "I have paid" endpoint.
- [ ] Admin: pending payments + subscription board.
- [ ] Grace/expiry state transitions as a small daily job (in-process scheduler, no queue per D-041).
- [x] Logged as D-052 (2026-09-11).
