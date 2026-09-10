# Decisions Log

> **Naming note.** **May** is the name of the tutor character only. The product itself is unnamed. It appears in these documents as **[PRODUCT NAME TBD]**. Search that string when the name is chosen.


Running record of what was decided, why, and what was rejected. Rejected options are recorded so they are not re-argued from scratch, and so they can be revisited if the reasoning stops holding.

---

## D-001: Pivot from kids to adults
**Date:** 2026-09-04 · **Status:** decided

Target Burmese adults who already speak some English, rather than Burmese children aged 11 to 13.

**Why.** Adults pay for themselves, which removes the parent product, the parent payment rails, and the minor-consent problem, roughly a third of the build. They tolerate a higher price because it is tied to income. The founder is a member of the target market, so product instincts are informed rather than guessed.

**Trigger.** Founder pushed back that reaching 100 kid users felt implausible to him, and asked what could produce $200 per month within four or five months.

**Rejected:** continuing with kids first. Not abandoned, kept as reference in `/kids-reference/`.

**Would revisit if:** adult completion rates come back poor, or the adult market turns out to have no habit of paying for English.

---

## D-002: Target adults who already speak some English, not beginners
**Date:** 2026-09-04 · **Status:** decided

**Why.** The founder's own problem, and the one the product is built for, is retrieval speed, not knowledge. Beginners are a different product, a different method, and a different price.

**Rejected:** a general-purpose English product covering all levels. General is exactly why the existing options fail this user.

---

## D-003: Broad across professions, not software-only
**Date:** 2026-09-04 · **Status:** decided

Software, design, finance, teaching, students.

**Why.** Founder's explicit preference. The core problem is not field-specific.

**Tension to watch:** it conflicts slightly with D-005, since interview content is more useful when it is field-specific. Handled by the five signup questions in R-TP-7 rather than by narrowing the market.

---

## D-004: Upgrade loop as the core feature
**Date:** 2026-09-04 · **Status:** decided

Learner says a sentence, May confirms what worked and gives the smoother native version, learner says it back.

**Why.** Founder's own idea and the strongest thing to come out of the session. This user's English is not wrong, it is not smooth, so error-correction framing is both inaccurate and alienating. The say-it-back step is the actual mechanism, not politeness.

**Rejected:** conventional error correction. Wrong diagnosis for this user.

---

## D-005: Four-week course, not an open-ended subscription
**Date:** 2026-09-04 · **Status:** ~~decided~~ **superseded by D-042 (2026-09-08)** — pivoted to a monthly subscription with a pack-shaped first-month arc

Twelve live sessions over four weeks, tied to a real deadline.

**Why.** Adults quit things that run forever and finish things that end. A subscription has no moment where quitting registers as failure. A course tied to a real event does. Also cheaper to author: one four-week arc instead of infinite content.

**Rejected:** subscription-first. Kept as the post-course product, D-006.

**Would revisit if:** completion rates come back low anyway, which would mean the deadline is not doing the work.

**Superseded by D-042.** The subscription-first framing that D-005 explicitly rejected is now the model. D-042 preserves the four-week deadline flavour via the first-month pack arc (D-043) and the week-4 before/after clip as renewal moment, but revenue is monthly, not one-off.

---

## D-006: Optional monthly subscription after the course
**Date:** 2026-09-04 · **Status:** ~~decided, build second~~ **superseded by D-042 (2026-09-08)** — subscription is the whole product, not a post-course option

Course acquires, subscription retains.

**Why.** Captures the people who want to keep going without imposing open-endedness on everyone. Also gives the spaced-review intervals beyond three weeks somewhere to live, which a four-week course cannot.

**Sequencing:** course first. Do not build subscription mechanics until completion is proven.

**Superseded by D-042.** The subscription mechanic is now built first, not second — it is the product, not a follow-on. The "spaced-review beyond three weeks needs somewhere to live" argument was correct and is what makes D-042 pedagogically better than a fixed four-week course.

---

## D-007: First situation is job interviews
**Date:** 2026-09-04 · **Status:** decided

**Why.** Real deadline, money attached, an existing market for interview prep, and the easiest thing to write an advertisement for.

**How it was decided:** founder said he could not choose. Claude made the call, founder accepted.

**Rejected for now:** standups, client calls, presentations, negotiations. All queued as situation packs.

---

## D-008: Do not lengthen the course to compete with year-long subscriptions
**Date:** 2026-09-05 · **Status:** decided

**Founder's concern:** four weeks looks thin next to a one-year Udemy subscription, and buyers will compare.

**Why rejected as a fix.** Longer means more authoring, later validation, and more time to drop out. It pays a high price to solve an optics problem. Someone with an interview in three weeks is not shopping for a year of anything.

**What was decided instead.** Reframe the packaging. Sell "twelve live sessions with feedback, interview-ready in four weeks", and compare against tutoring, not against recorded video. Twelve tutor hours is $100 to $300 on italki.

**Would revisit if:** the ten pricing interviews show buyers genuinely comparing to annual subscriptions and refusing on length.

---

## D-009: Pricing method, existing spend not stated willingness
**Date:** 2026-09-04, refined 2026-09-05 · **Status:** decided (method), open (number)

Ask ten Burmese adults what they **currently spend** on English, not what they would pay.

**Why.** Stated willingness to pay is fiction. Existing spend is fact.

**Fallback questions if the answer is "nothing":** what they did the last time they needed English for something real, and what non-English things they pay for monthly.

**Data so far.** Regional pricing on Udemy and Coursera puts the anchor around $10 to $15 in purchasing-power-adjusted markets. Founder personally reads $20 to $25 as expensive, and recently bought Netflix at around $5 per month. Netflix is a weak comparison, entertainment competing against free, but the price sensitivity is a signal.

**Working estimate:** $10 to $15 course, $8 per month subscription. Held loosely, not committed.

---

## D-010: Price is a demand question, not a cost question
**Date:** 2026-09-05 · **Status:** decided

**Why.** Recomputed unit economics put the four-week course at $2.61 to $4.78 per learner. Every price from $10 upward gives a healthy margin. Cost therefore sets a floor and nothing else.

**Implication:** stop reasoning about price from cost, and resolve it from D-009 instead.

---

## D-011: Item log emitted by the model instead of a separate transcription stream
**Date:** 2026-09-05 · **Status:** proposed, needs prototyping

**Why.** Transcription at $0.009 per minute is roughly 45% of an optimised session cost, more than model output. Having the live model emit a structured item log alongside its audio response removes that line entirely, taking the course from about $4.78 to about $2.61.

**Second reason it matters:** without this, shifting talk time toward the learner is cost-negative, because transcription scales with learner speech. The pedagogically correct move only becomes cost-positive once the separate transcription stream is gone.

**Risk:** structured output may not be reliable enough to drive spaced-review scheduling. Prototype in week one before assuming the saving.

---

## D-012: 30-minute sessions, three per week
**Date:** 2026-09-05 · **Status:** ~~decided~~ **superseded by D-042 (2026-09-08)** — 40 minutes, up to daily (with hard one-per-day cap)

**Why.** Shorter than the kids product's 40 minutes. Adults have jobs, and 30 minutes of hard speaking is more taxing than 40 minutes of guided reading. Three per week gives twelve sessions over four weeks, which is a clean course shape.

**Rejected:** 40 minutes, carried over from kids. No mid-session break either, adults do not need one at 30 minutes.

**Superseded by D-042.** Session length went back to 40 minutes (the D-042 "hard speaking ceiling" argument overturned this decision's "taxing" argument). Cadence went from three per week to daily-with-cap. The clean-course-shape reasoning was tied to D-005 (also superseded).

---

## D-013: Two signup questions instead of adaptive profiling
**Date:** 2026-09-04 · **Status:** superseded by D-033 (2026-09-07)

What do you do, and what are you preparing for.

**Why.** Captures most of the available personalisation benefit at almost no cost. Full adaptive profiling is expensive and mostly redundant against these two answers.

**Rejected for v1:** adaptive personalisation by field, level, interests, and habits. Queued as backlog item 3.

---

## D-014: Upgrades come from a scripted pool, not free improvisation
**Date:** 2026-09-05 · **Status:** decided

**Why.** Carried from the kids product's scripted-lesson principle. An AI inventing "more natural" English will produce confident nonsense. It also makes cached TTS possible for scripted portions.

**Cost:** authoring work per unit. Accepted.

---

## D-015: Speed sprint stays in the backlog
**Date:** 2026-09-04 · **Status:** decided

Timed Burmese-to-English production, five seconds to answer.

**Why queued rather than cut.** It attacks the stall more directly than anything else in the plan, and should move up quickly once the untimed drill works. Shipping both at once risks learners failing at the drill and the timer simultaneously, with no way to tell which broke.

---

## D-016: Accent is not the target
**Date:** 2026-09-04 · **Status:** decided

**Why.** Slow to shift, rarely what actually breaks communication, and expensive in practice time relative to what it returns. Vocabulary and retrieval speed are what cost this learner turns in real conversations.

**Rejected:** pronunciation and accent reduction as a product focus, despite the founder naming pronunciation as one of his own problems.

---

## D-017: Pedagogy carried over from the kids product
**Date:** 2026-09-05 · **Status:** decided

Unchanged: meaning before form, output over recognition, spaced review over coverage. Expanding review intervals of 1 day, 3 days, 1 week, 3 weeks. Massed repetition within a session, spaced repetition across sessions. Step down after three consecutive failures. Never ask "do you understand", make the learner produce instead.

Added for adults: upgrade rather than correct, and retrieval speed over accuracy.

Changed for adults: new item cap drops from 10 to 15 down to 8 to 12, since upgrade patterns are heavier than vocabulary items. Language ramp is steeper, roughly 60% Burmese down to 15%, against the kids 80% to 40%.

---

## D-018: Whiteboard dropped from v1
**Date:** 2026-09-05 · **Status:** decided

**Why.** It existed in the kids product to make concrete vocabulary comprehensible by drawing. Adults do not have that comprehension problem. No clear role here.

**Would revisit if:** a specific need appears, most likely around sentence structure or written feedback.

---

## D-019: The app teaches grammar
**Date:** 2026-09-05 · **Status:** decided, corrects an earlier error

**Why.** Claude had framed grammar as out of scope, on the basis that the founder's own problem is retrieval speed rather than knowledge. Founder corrected this: the product serves learners below his own level, and those learners need grammar taught.

**How it is handled.** Never rules first. Three real examples, then the pattern, then the learner produces three sentences of their own. Selected by what the learner actually got wrong, ranked by frequency in their own error log, not by curriculum order.

**Still rejected:** grammar tables, conjugation charts, rule boxes. That is the Myanmar school method on a new screen.

---

## D-020: Level system, 0 to 10
**Date:** 2026-09-05 · **Status:** decided

**Why.** Founder's requirement. A single fixed difficulty serves only one slice of the market. Level 0 gets a conversation partner plus explicit grammar teaching; level 10 gets phrasing, register, and how to say something well.

**Key design point.** A level changes what a session is *made of*, not just how hard the words are. Stage composition and the Burmese-to-English instruction ratio both move with level.

**Promotion is on evidence, not attendance:** fluent-first-attempt rate above 70%, average stall under 3 seconds, no step-downs, across three sessions.

---

## D-021: MVP ships levels 3 to 6 only
**Date:** 2026-09-05 · **Status:** superseded by D-032 (2026-09-07)

**Why.** Eleven levels multiplied by any topic is more content than one person authors in a month. Levels 3 to 6 cover the largest share of the market and include the bands where the upgrade loop already works.

**Uncomfortable consequence, stated deliberately.** The founder himself sits at level 8 to 10, so he is **not** in his own MVP's target band. The temptation to build for himself first is the main risk to this decision.

**Rejected:** shipping all eleven levels thin. Better to ship four levels properly.

---

## D-022: Topic packs versus interests
**Date:** 2026-09-05 · **Status:** decided

Two different mechanisms, deliberately separated.

A **goal pack** is authored content: situations, target language, upgrade pools, grammar points. Expensive. MVP ships exactly one, interviews.

An **interest** is free text the learner supplies at signup, used to generate conversation material. Football, cooking, their own job. Nearly free.

**Why the split.** It gives the founder's requirement that content adapts to the user, without requiring an authored pack per subject. A level 5 interview session for a football fan uses interview structure with football as conversation material. Interests never override the pack's target language.

---

## D-023: No booking, open and start any time
**Date:** 2026-09-05 · **Status:** decided (Claude proposed, founder accepted)

**Why.** Booking is friction, and it is the thing human tutoring already does badly. Removing it is a genuine product advantage over italki and Preply.

**Cost consequence, accepted:** unpredictable concurrency and no way to smooth API spend. The release valve is a soft weekly session cap, framed as pacing advice rather than a limit.

---

## D-024: Web app, Burmese interface
**Date:** 2026-09-05 · **Status:** decided (Claude proposed, founder accepted)

**Why web:** no app store review cycle, no install friction, one codebase for a solo founder. Mobile-first responsive, tested on a mid-range Android phone over mobile data, not on a laptop.

**Why Burmese UI:** the learner is not fluent. An English interface adds cognitive load before the lesson has started. English appears only as lesson content.

---

## D-025: Free full placement session before any paywall
**Date:** 2026-09-05 · **Status:** decided, and it is a bet

**Why.** The upgrade loop is what sells the product, and nobody can be told about it convincingly. Costs roughly 22 to 40 cents per free session.

**Rejected:** paywall first. Higher conversion per visitor, far fewer people ever experience the loop.

**Would revisit if:** free-session-to-paid conversion falls below about 15%.

---

## D-026: Manual payment activation at launch
**Date:** 2026-09-05 · **Status:** decided

Bank transfer, founder activates the account by hand.

**Why.** Card rails reach only the diaspora. KBZPay and Wave Money integration difficulty is unverified and may require a business entity. Manual transfer is ugly, does not scale, and works today.

**Correct for the first 50 customers.** Automate once there is revenue worth automating.

---

## D-027: Manual review of every placement for the first cohort
**Date:** 2026-09-05 · **Status:** decided

**Why.** Assigning a level 0 to 10 automatically from a spoken conversation is unproven. The founder reviews every placement within 12 hours and corrects the level.

**Deliberately unscalable.** It is how the rubric gets calibrated. Do not automate before roughly 50 manual placements exist.

---

## D-028: May is never deliberately wrong
**Date:** 2026-09-05 · **Status:** decided, reverses a kids-product decision

**Kids spec said:** occasionally be slightly wrong to invite correction. It worked because correcting the teacher is a thrill at eleven, and it forces production.

**Why reversed for adults.** A paying adult who catches the tutor being wrong concludes the product is unreliable and asks for a refund. The upside is small and the downside is churn.

---

## D-029: Course access expires at 8 weeks, not 4
**Date:** 2026-09-05 · **Status:** decided

**Why.** The four-week deadline is the motivational frame, and it should stay in the marketing. A hard four-week expiry, though, generates refund requests and resentment when real life interferes. Eight weeks of access keeps the frame without punishing people.

---

## D-030: Whiteboard dropped, confirmed
**Date:** 2026-09-05 · **Status:** decided, supersedes D-018 with a stronger reason

The kids whiteboard made concrete nouns comprehensible by drawing. Adult content is mostly abstract, so drawing has little to offer. The large phrase display, English with Burmese underneath, does the same job better for the language adults are actually learning.

---

## Open, not yet decided

| # | Question | Blocks |
|---|---|---|
| O-1 | Course price | Landing page, all marketing |
| O-2 | Distribution. How an adult learner finds this | Everything downstream of launch |
| O-3 | Payment rails for Myanmar | Revenue. Open since the kids product |
| O-4 | Myanmar or Thailand as the beachhead | Pricing, channel, payment |
| O-5 | Whether the deadline format actually produces completion | The core bet |
| O-6 | Content authoring capacity for twelve units | Launch date |
| O-7 | Raise amount | Investor conversations |
| O-8 | **Product name.** May is settled as the tutor character only. The product is unnamed | Landing page, marketing, domain |

---

## D-031: May is the tutor character, not the product
**Date:** 2026-09-05 · **Status:** decided

**Why.** May is a made-up character name for the voice the learner talks to. Using it as the product name conflates the persona with the business, and it makes the product hard to extend later: a second character, or a non-voice surface, would sit oddly under a person's name.

**Consequence.** The product needs its own name. Until one is chosen, all documents use the placeholder **[PRODUCT NAME TBD]**, which is a searchable string. May continues to appear throughout as the tutor, unchanged, in every behavioural requirement.

**Open:** the actual name. It blocks the landing page, the domain, and all marketing copy.

---

## D-032: MVP ships all eleven levels (0 to 10)
**Date:** 2026-09-07 · **Status:** decided, supersedes D-021

Reversal of D-021.

**Why.** Founder call. Widens coverage from four levels to eleven so no learner sees a "coming soon" gate on their assigned level. Accepts the roughly 3× authoring load (from ~20 to 40 hours up to ~55 to 110 hours for the interviews pack).

**Consequence.** Content authoring in R-CA-3 is now the top schedule risk. Founder no longer sits outside the MVP band, so the "resist building for yourself first" framing from D-021 no longer applies. The new failure mode is over-investing in the 8 to 10 bands where the founder is comfortable while lower bands stay incomplete. See BRD section 9 risk table.

**Would revisit if:** authoring load proves impossible in the target timeline. Fallback is D-021's plan (levels 3 to 6 first, others gated).

---

## D-033: Five signup questions instead of two
**Date:** 2026-09-07 · **Status:** decided, supersedes D-013

Reversal of D-013.

The five questions, in order:
1. How you'd like to be called, and gender
2. Age (picked from a range)
3. What do you do (free text)
4. What are you preparing for (dropdown; values come from the pack catalog per R-TP-1, coming-soon packs greyed out per R-TP-6)
5. City of living

**Why.** Founder call. Extra fields feed better session personalisation and future analytics. Cost is small — a few added seconds at signup, and all questions skippable except Q1.

**Rejected for now:** full adaptive profiling (queued as R-TP-9 / backlog).

**Would revisit if:** signup completion drops noticeably. Signup flow duration is still capped by R-ON-9 at under 3 minutes from landing to speaking.

---

## D-034: Tutor character renamed from Aye to May
**Date:** 2026-09-07 · **Status:** decided

The tutor character is now **May**. Previously **Aye**.

**Why.** Founder preference. Both names fit the Burmese-peer persona in PRD Section 11. No change to the character's nationality, age range, or behavioural specification.

**How applied.** Every "Aye" reference across `docs/requirements/` was replaced with "May". Older decision entries (D-004, D-028, D-031) now read "May" throughout; their original wording used "Aye". This entry is the historical record of the rename.

**Rejected on the way:**
- "Miss Gwen Stacy" — Marvel character, clashed with the Burmese-peer persona.
- "Tr. May" — schoolteacher register, conflicts with the explicit "not a schoolteacher" line in PRD Section 11.

**Product name is still TBD** — May is the character only, per D-031.

---

## D-035: Voice traffic is proxied through our backend, not browser-direct to Gemini
**Date:** 2026-09-07 · **Status:** decided

Browser ↔ our backend ↔ Gemini Live. The browser never holds a Google API key.

**Why.** Three server-side needs beat the ~100–200ms proxy cost: the D-011 item log is captured in-process instead of surviving a round-trip from a flaky mobile client; token metering (R-TE-8) is counted on the way through and cannot be skipped; API keys stay on the server, so no short-lived token system to build. The latency budget in the voice pipeline design still fits under R-TE-1's 1 second.

**Rejected:** direct browser → Gemini (lowest latency, kept as documented fallback if the week-one spike blows the budget); hybrid direct-audio + proxied-control (2× the code for a problem we do not have yet).

**Would revisit if:** week-one spike measures end-to-end p75 above 1 second.

Design: `docs/technical-designs/02-voice-pipeline.md`.

---

## D-036: WebSocket transport with mandatory heartbeat, not WebRTC
**Date:** 2026-09-07 · **Status:** decided

Browser ↔ backend audio runs over a WebSocket carrying Opus frames, with a ping/pong heartbeat (20s interval, two missed pongs → reconnect with backoff) and stateful resume by session ID.

**Why.** 2–3 days build versus 1.5–2 weeks for DIY WebRTC (media server + TURN = an ops burden a solo founder should not take on in month one). The heartbeat is mandatory because silent middlebox disconnects on mobile carriers are a known failure mode — the founder hit exactly this class of bug on a previous product where the WebSocket had no heartbeat.

**Rejected:** DIY WebRTC (build + ops cost); managed WebRTC / LiveKit Cloud (strongest alternative, ~$50–100/month at target scale — documented as the upgrade path if real-world Myanmar testing shows WebSocket audio is too choppy); HTTP chunked streaming (breaks barge-in R-SE-8 and likely the 1s budget).

**Would revisit if:** Myanmar-mobile testing shows unacceptable audio choppiness (TCP retransmit stalls) → move to LiveKit Cloud.

---

## D-037: Hosting on Railway Singapore, not Vercel
**Date:** 2026-09-07 · **Status:** decided

**Why.** Researched 2026-09-07: Vercel's native WebSocket support (public beta, June 2026) force-closes connections at the function max duration — 5 minutes on Hobby, ~13 minutes on Pro, 30 minutes only behind a second beta flag — and Next.js needs an experimental upgrade API on top. Our session is 30 minutes of continuous audio; forced mid-conversation drops trigger Gemini re-attach costs against the spirit of R-TE-5. Railway runs plain long-lived processes, has a Singapore region (~30–50ms from Yangon), and the founder already operates it for another product. ~$10–25/month at MVP scale.

**Consequence.** Audio recordings go to Cloudflare R2 (S3-compatible, zero egress) instead of Vercel Blob. Storage design: `03-audio-storage.md`.

**Rejected:** all-Vercel (duration limits, beta-on-experimental stack); Vercel app + tiny Railway relay (two platforms for a solo founder).

**Would revisit if:** Vercel ships GA WebSockets with ≥30-minute connections.

---

## D-038: Next.js frontend + FastAPI (Python) backend
**Date:** 2026-09-07 · **Status:** decided

Two services on Railway: a Next.js frontend (TypeScript) and a FastAPI backend (Python) that holds the learner WebSocket, owns the Gemini Live connection, and will host the LangGraph-based session engine and plan generation.

**Why.** Founder call, two drivers: LangGraph fits the session-stage state machine and the non-realtime LLM work (plan generation, item-log processing, placement scoring), and Python is its first-class ecosystem; and the founder is deliberately investing in Python/FastAPI skills. Guardrail: the live audio loop uses no framework — raw WebSocket to Gemini — because every layer in the hot path costs latency (R-TE-1).

**Rejected:** Next.js full-stack / TypeScript-only with LangGraph JS (fastest to ship, one service — reversed by the founder in favour of the Python learning investment and ecosystem); hybrid TS-now-Python-later (two languages eventually anyway, without the learning benefit now).

**Cost accepted:** two deploys, CORS/auth wiring between services, and a slower week one while learning FastAPI + WebSockets.

**Would revisit if:** the week-one spike stalls on Python unfamiliarity badly enough to threaten the schedule — fallback is the TypeScript monolith with LangGraph JS.

---

## D-039: Session audio — server-side two-track capture to Cloudflare R2
**Date:** 2026-09-07 · **Status:** decided

Both voices captured in the FastAPI proxy (audio already flows through it per D-035), stored as two separate Opus tracks (learner + May), buffered on server disk during the session, uploaded to Cloudflare R2 at session end, background-transcoded with ffmpeg to a mixed M4A for playback, served via 15-minute presigned URLs after an owner-or-founder check (R-TE-10).

**Why.** Server-side capture makes the least reliable machine in the system (a mid-range phone on Myanmar mobile data) irrelevant to the product's most irreplaceable artefact (R-ON-7). Separate tracks keep learner-only audio cuttable for before/after marketing clips — un-mixing a combined file is impossible. M4A because Opus playback is unreliable on older Safari/iOS, exactly our audience. R2 because reads are free (replays cost nothing) after Vercel Blob died with the Vercel hosting plan (D-037).

**Rejected:** browser-side recording (depends on the flakiest machine); one mixed file (kills learner-only clips forever); streaming multipart upload (upgrade path, not MVP); raw Opus playback (fails on old iPhones); audio in Postgres (wrong tool).

**Would revisit if:** recordings become revenue-critical enough that losing one to a rare server crash is unacceptable → move to streaming multipart upload.

Design: `docs/technical-designs/03-audio-storage.md`.

---

## D-040: Recordings are kept indefinitely, beyond course expiry
**Date:** 2026-09-07 · **Status:** decided

Recordings are not deleted when course access expires at 8 weeks (D-029). Deletion happens only on learner request, and then completely (all files plus database row).

**Why.** The before/after clip is the marketing asset, the retention tool, and the investor demo (vision doc); it gains value with time. Storage cost is trivial (~$0.015/GB-month; the whole first cohort is ~12 GB).

**Would revisit if:** per-learner audio ever approaches ~1 GB, or a privacy/regulatory requirement forces a retention window.

---

## D-041: Remaining stack picks — Railway Postgres, SQLAlchemy + Alembic, Sentry + PostHog, Tailwind + shadcn/ui
**Date:** 2026-09-07 (logged on doc approval 2026-09-09) · **Status:** decided

The stack manifest's remaining choices, completing D-035–D-038:
- **PostgreSQL on Railway** — same platform as the services, private network to the backend, ~$5/month. Rejected: Neon/Supabase (extra vendor, public-internet DB traffic; Neon stays the fallback).
- **SQLAlchemy 2.0 + Alembic** — the Python standard; migrations only, never auto-push. Rejected: SQLModel (smaller community), raw SQL (slow to build).
- **Sentry + PostHog**, both free tiers — errors plus the landing→signup→placement→paid funnel, measured from learner #1. Rejected: analytics-later (the onboarding funnel is the riskiest flow).
- **Tailwind + shadcn/ui** — owned components, light enough for mid-range phones.

Full manifest, third-party blast-radius table, and deliberate non-picks (no auth vendor, no Redis, no queues, no staging): `docs/technical-designs/01-architecture-and-stack.md`.

---

## D-042: Subscription model — $25/month, daily 40-minute sessions
**Date:** 2026-09-08 · **Status:** decided, supersedes the one-time 4-week-course packaging (D-024/D-029 framing, R-PY-2)

The product is sold as a **monthly subscription at $25/month**. Each learner gets **up to one session per day, 40 minutes** (hard cap — no banking unused days into longer sessions).

**Session rhythm alternates:** unit day (new authored material) → review day (review queue + free conversation on the learner's material) → unit day → … Review days are generated from the review queue, not authored, which stretches the authored pack across ~5–6 weeks and matches spaced-repetition mechanics.

**First-month arc kept:** the first four weeks carry an explicit pack-shaped goal (see D-043) and end with the before/after clip at week 4. The clip's job changes from completion prize to **renewal moment** — the learner hears their own improvement right when month 2 billing is due.

**The economics (from the BRD cost basis, ~$0.007–0.013/min):**
| Usage | AI cost/month | Kept of $25 |
|---|---|---|
| Every day (whale) | $8.40–15.60 | $9.40–16.60 |
| ~70% of days (realistic) | $5.90–10.90 | $14–19 |
| 3 days/week (light) | $3.40–6.20 | $19–22 |

**Why.** Founder call. Recurring revenue instead of a one-shot $35; 50 subscribers ≈ $1,250/month steady. Daily practice is also better pedagogy and finally makes the long spaced-review intervals real (the PRD itself flags the 4-week course as too short for retention — this was the argued case for a subscription all along).

**Guardrails:** one-session-per-day cap protects margin and pedagogy. All cost figures re-check against real R-TE-8 token logs in week one; price or minutes adjust **before** launch if reality is worse.

**Cost accepted:** no finish line (mitigated by the first-month arc + week-4 clip); monthly manual bank-transfer renewal and founder re-activation (payments doc must design this); the "different from every subscription app" positioning weakens; session shape stretches from 30 to 40 minutes (PRD section 6 stage times scale ~+33%).

**Docs still to update for this:** BRD pricing + cost tables, PRD sections 6 (session shape) and 13 (payment/plans), marketing plan packaging. Tracked as an open task, not yet done.

**Would revisit if:** week-one token logs put whale-cost above ~$16/month, or month-2 renewal proves materially worse than course completion did.

---

## D-043: Packs are a profession-based roadmap; interviews is only the MVP test pack
**Date:** 2026-09-08 · **Status:** decided, widens D-003

The interview pack is **pack #1, the MVP experiment** — not the product's identity. The engine (May + upgrade loop + daily practice) is profession-agnostic; packs are the topic skin. Roadmap direction: nurses/doctors (patients in English), street food & shop owners (serving foreign customers), delivery & drivers, teachers, engineers, office workers.

**First-month goal is pack-shaped** ("handle a foreign patient confidently in 4 weeks", "serve a tourist start to finish"), replacing the interview-specific framing everywhere it appears.

**Why.** Founder call. The upgrade-loop mechanic works on any profession's situations; profession packs multiply the addressable market without touching the engine. The greyed-out coming-soon pack list (R-TP-6) already measures which pack to author next — this decision gives that list its roadmap.

**Tension flagged, accepted deliberately:** D-003 chose software/design/finance/teaching/students as the initial market. This roadmap adds blue-collar segments (street food, delivery) — bigger population, likely tighter budgets for $25/month. The pack-interest data from R-TP-6 decides the actual authoring order; no segment commitment is made here beyond pack #1.

**Would revisit if:** pack-interest data shows demand concentrated in one profession — then depth in that pack beats breadth.

---

## D-044: Voice model reaffirmed — Gemini Live; GPT-6 Astra evaluated and parked
**Date:** 2026-09-09 · **Status:** decided

Researched on GPT-6 Astra's launch week (released 2026-09-03/04) at the founder's request.

**Why Gemini Live stays, verified against primary sources:**
1. **Burmese is officially supported** — Google's Live API capabilities page lists 97 audio-output languages including "Burmese `my`", with mid-conversation language switching. This is load-bearing: levels 0–3 are 60–90% Burmese instruction (R-LV-4), and May explains upgrades in Burmese at every level.
2. **Astra is not a voice model.** Its documented capabilities are coding, math, computer/browser use; OpenAI's own audio API docs do not mention it. OpenAI's realtime voice line is the separate gpt-realtime family, which publishes no Burmese voice support (their translate model outputs 13 languages only).
3. **Cost:** Astra at $10/M input, $50/M output is 3–4× Gemini Flash Live ($3/$12) — incompatible with the D-042 subscription margin.

**Parked, not rejected forever:** Astra (or similar frontier text models) remains a candidate for slow-brain jobs (planner, level judge, QA analysis) post-MVP if plan quality on cheaper models disappoints. Not MVP: second vendor for an unproven quality gain.

**Fallback if Gemini's spoken Burmese disappoints in the week-one spike:** compare against gpt-realtime-2 — never Astra.

**Caveat recorded:** OpenAI's Astra page itself was unreachable during research (403); conclusion rests on their audio docs omitting Astra and launch coverage. Re-verify if OpenAI announces Astra audio modalities.

---

## D-045: Voice plumbing — Pipecat adopted
**Date:** 2026-09-09 (revised same day: trial → adopted, founder call after comparing LiveKit Agents, Google's `google-genai` SDK, and TEN Framework) · **Status:** decided

The voice-moving layer (browser audio ↔ Gemini Live) is built on **Pipecat** (open-source Python voice-agent framework, BSD, ~13k stars, maintained by Daily). Pipecat ships a `GeminiLiveLLMService`, a FastAPI WebSocket transport, VAD, and interruption handling — most of the plumbing 02-voice-pipeline planned to hand-write.

**Alternatives compared (researched 2026-09-09, including issue trackers):** LiveKit Agents (best interruption reputation, but drags in WebRTC media-server infra rejected in D-036, and has a known 6–12s first-turn latency bug with Gemini Flash Live); Google's `google-genai` SDK directly (first-party, perfect stack fit, but most hand-assembly — kept as the documented fallback); TEN Framework (smallest community, most configuration — wrong bet for a solo founder).

**Week-one verification (adoption is decided; these verify it in practice):**
1. **Barge-in:** May stops within **300ms** of learner speech (R-SE-8 / R-TE-2). Known risk: pipecat-ai/pipecat issue #3381 — the Gemini service historically used the slow transcription signal for interruptions (1–2s delay) instead of Gemini's instant `interrupted` signal. Check if fixed in the current release; if not, patch it ourselves (the fix path is documented in the issue).
2. **Latency:** end-of-speech → May's first audio under **1s** (R-TE-1) on a real Myanmar-style mobile connection.

**Documented fallback if Pipecat proves unfixable on either number:** Google's official `google-genai` SDK on asyncio (their examples cover exactly this use case). Our stage conductor logic is written as our own code either way — with Pipecat it lives as custom pipeline processors; on the fallback it sits directly on asyncio. The conductor survives a swap.

**If adopted:** pin the exact Pipecat version; upgrades are deliberate events with the eval suite run before and after — the project has a documented history of breaking changes and interrupt/resume bug classes (queue recreation, deadlock, frame-drop, race conditions).

**Why trial anyway, despite the known warts:** the Gemini Live wiring, VAD, and transport come free — the spike gets built in days, not weeks, and the two exit tests are cheap to measure. The research (2026-09-09) that surfaced both the value and the warts is what shaped the criteria.

**Relation to D-038's "no framework in the hot path":** that rule targeted general LLM frameworks (LangChain-style) wrapping the socket. Pipecat is a hot-path-native voice framework built for latency; the rule's spirit — nothing between the learner and Gemini that adds silent delay — is exactly what the exit criteria enforce.

**Would revisit if:** Pipecat passes the spike but later releases regress latency or interruption behaviour — the raw-asyncio fallback remains documented in 02-voice-pipeline.

---

## D-046: Stage cutover — fresh Gemini context per stage, handover notes, cached cover lines
**Date:** 2026-09-09 · **Status:** decided

Each of a session's stages runs in its own fresh Gemini Live context (implements R-SE-3 / R-TE-4). The 1–2s reconnect gap is masked by a pre-recorded May transition line (cached TTS, zero marginal cost). Every new stage context opens with two handover notes: the **long-term chart** (level, pack, weak points, recap items, profile — from Postgres) and the **short-term handover** (what happened earlier this session, built live by the conductor). Stage time budgets are soft — May is never cut off mid-sentence; the conductor sends a wrap-up-when-natural instruction near budget end.

**Why.** One accumulated 40-minute context re-bills the growing history every turn (the BRD's named cost leak) and drifts in quality. Fresh contexts with compact summaries are both the cost model and the quality model — and the handover notes are exactly the "compact state summary passed forward" R-SE-3 names, so May never appears to forget.

**Rejected:** one 40-minute context (cost leak, violates R-SE-3); one context with "forget previous stage" instructions (still accumulates cost; forget-instructions unreliable); hard per-minute stage cuts (robotic, breaks the persona).

**Cost accepted:** ~10 authored + recorded transition lines per session type, and cutover logic in the conductor.

Design: `docs/technical-designs/04-session-engine.md`.

---

## D-047: Quality guard — watch and nudge, with a weekly prompt loop and eval suite
**Date:** 2026-09-09 · **Status:** decided

May's per-turn item log (D-011) is scored by plain code against the R-UL rules as each report arrives — never in the audio path, so zero latency. Two reaction lanes: **flags** to a weekly founder QA list (invented upgrades additionally blocked from the review queue until approved, per R-UL-9), and rare **nudges** — one corrective text instruction into May's live context when drift damages the lesson (missed repeat, stage far over budget). Improvement loop: flags → rewrite the weak prompt sentence → run the eval suite (~20 saved test conversations, grown from real flagged sessions) → ship. Prompt changes never ship without the suite passing. Flag-rate per 100 turns is the tracked teaching-quality metric.

**Why.** R-UL-1 demands 100% rule compliance; prompts alone deliver ~95% silently. Checking each turn *before* the learner hears it would add ~1s and destroy R-TE-1. Watching the already-existing reports costs nothing and makes every violation visible.

**Rejected:** prompt-only trust (silent failures reach paying adults); hard-gating every turn (kills the latency budget).

**Known limit, accepted:** the item log is self-reported by the model — mitigated by weekly founder spot-checks of transcripts against reports.

**Would revisit if:** flag rates stay high after several prompt iterations — then selective hard-gating of the worst stage type gets reconsidered despite the latency cost.

---

## D-048: Session engine tool split — LangGraph thinks, our Python conducts, Pipecat carries audio
**Date:** 2026-09-09 · **Status:** decided

- **Planner, post-session processor, level judge** → LangGraph graphs (step-shaped LLM workflows; checkpointing prevents half-done bookkeeping, retries handle bad LLM outputs, traces make debugging visible).
- **Live conductor** (stage switching, soft timers, handover building, nudge delivery, pause/resume) → our own Python, registered as custom Pipecat processors (D-045).
- Judgment stays code where rules are exact: level promotion/demotion (R-LV-8/9/10) and item grading are pure logic; LLM calls only where language is produced.

**Why.** The conductor is continuous and event-driven — many simultaneous concerns, no step shape — so a graph framework adds ceremony without its gifts; the three thinking jobs are exactly step-shaped and get resume/retry/tracing free. Discussed across six topics with the founder, 2026-09-09.

**Rejected:** LangGraph everywhere (wrong shape for the conductor); LangGraph nowhere (~a week of hand-built plumbing for the thinking jobs, and the founder wants the LangGraph skill).

Design: `docs/technical-designs/04-session-engine.md`.

---

## D-049: Data model — UUIDs everywhere, append-only item-log events, plans as JSONB
**Date:** 2026-09-10 · **Status:** decided

Three structural choices for the single Railway Postgres database (17 tables, full schema in the design doc):

1. **UUID primary keys on every table.** Session and recording IDs are exposed in URLs; guessable integers would undercut R-TE-10's access posture. Rejected: auto-increment (guessable), mixed scheme (two conventions for no gain at this scale).
2. **`item_log_events` is append-only and the source of truth.** Every per-turn report from May (D-011) is stored exactly as emitted, never updated or deleted; review items, metrics, and recaps are derived from it. A processor bug is healed by re-running the derivation over raw events — learning history can never be silently corrupted. Rejected: process-and-discard (a bug destroys the product's core asset with no way back).
3. **Session plans as one JSONB document per row.** Written once by the planner, read once by the conductor, never queried inside; cross-plan questions are answered by the events (what happened), not plans (what was intended). No migration cost while the plan shape evolves weekly. Rejected: normalized plan_stages/plan_items tables (structure enforcement the planner's validate step already provides, at constant migration cost).

**The working rule, recorded for future tables:** *normalize what you query, JSON what you pass around.*

Design: `docs/technical-designs/05-data-model.md` (+ ER diagram `diagrams/05-data-model.drawio`).

---

## D-050: Content authored as YAML in git, per band with shared core, synced to Postgres
**Date:** 2026-09-11 · **Status:** decided

Three choices for the content that R-CA-3 warns is the schedule's biggest risk:

1. **Git is the source of truth.** Units are YAML files under `content/` in the repo; a validated `sync-content` step upserts them into the D-049 tables (the DB copy is a cache, never hand-edited). R-CA-1's version control comes free from git; the R-CA-4 admin tool shrinks to two read-only screens (units list + flagged-upgrade review). Rejected: DB + editing UI (nested-form CRUD costs a solo dev-founder more than it saves — revisit when a non-dev co-author joins); Docs/Sheets import (silent drift, no diffs).
2. **Authored per band (5), shared core + overrides — not per level (11).** PRD 3.1 defines behaviour by five bands; one shared core (situation, questions, pool tags) plus five band sections (drills, low-band grammar) cuts the authoring estimate from 55–110 hours to **~40–60 hours**. Escape hatch: a band can be split per-unit later with no format change. Rejected: full per-level authoring (the PRD's own structure says sessions differ by band); author-once-model-adapts (improvisation by another name — the R-UL-8 firewall exists because that produces confident nonsense).
3. **Upgrade pool at pack level, tag-linked** (`pool.yaml`): one entry serves many units; units draw by tag. Runtime-generated upgrades (R-UL-9) stay DB-only as `pending_review` and enter the files only by deliberate founder promotion. Rejected: per-unit pools (copy-paste drift).

**Guardrail:** CI validation (schema + semantic checks: step-down targets exist, tags match, ready-units complete per R-CA-2) — a typo cannot reach the planner. The real schema is extracted from authoring unit 01, not invented ahead of it.

Design: `docs/technical-designs/06-content-format.md`.

---

## D-051: Auth — JWT with DB-backed refresh, no phone OTP, email-based reset
**Date:** 2026-09-11 · **Status:** decided

- **JWT access tokens (15 min) in httpOnly Secure cookies + opaque refresh tokens stored hashed in Postgres** (~30d, rotated, revocable by row deletion). Founder call for the JWT pattern; the DB-backed refresh token closes pure-JWT's revocation gap. Rejected: server-side sessions (the recommended simpler option — declined for ecosystem familiarity); auth vendors (D-041); localStorage tokens (XSS).
- **No phone OTP at signup.** Signup speed (R-ON-1/9) and zero SMS dependency beat data purity; monthly manual payment contact (D-042) is the human verification. Revisit with automated payments.
- **Password reset via email links**; phone-only learners get founder-assisted reset via Viber/Messenger. Signup copy encourages adding an email for this reason.
- **Placement artefacts** (closes a D-049 open question): level + confidence + transcript ref on the placement session row; the assignment written to `level_history` in the same transaction; D-027's manual review is a flag on that history row.
- **Learner deletion flow: deliberately parked.** D-040's promise stands; founder-by-hand covers any request at cohort scale. Real design waits on an actual request or the accountant's answer on Myanmar payment-record retention (asked at business registration).

Design: `docs/technical-designs/07-auth-and-consent.md`.

---

## D-052: Payment rails — personal-wallet P2P transfers with receipt-screenshot claims
**Date:** 2026-09-11 · **Status:** decided, makes D-026/D-042's manual rail concrete

- **Methods shown at the paywall:** KBZPay, Wave Pay, AyaPay (founder's personal wallet number + static QR exported from each app), PromptPay QR in THB for Thailand-based learners, bank transfer as fallback. All P2P to the founder's own accounts — **zero merchant integration, no business-entity requirement**.
- **The claim flow:** learner transfers in their wallet app → taps "I have paid" → **uploads the receipt screenshot (required)** → stored privately in R2 (`receipts/…`, founder-only) → **founder notified by transactional email** with an admin link → founder matches receipt against the wallet app in the pending-payments screen → Activate (period starts from activation day) or Reject with reason.
- **Grace and renewal:** reminder at period_end − 3 days; 3-day grace after expiry (banner, not a lock); expired blocks new sessions only — history, recordings, and progress stay readable forever.
- **Founder notification is email, not Firebase** — Firebase is mobile-push infrastructure; one email to one founder needs only the transactional-email provider password reset already requires (e.g. Resend; joins the doc-01 manifest).

**Rejected:** merchant API integrations (entity requirements unverified, P2P gets the same reach); claims without receipt upload (matching unlabeled transfers across four wallets is guesswork); no grace period (churn over bank latency); stacking renewal periods from period_end (late payers would pay for dead days).

**Would revisit if:** subscriber volume makes founder matching a real time cost — then KBZPay/Wave merchant rails and automated confirmation re-open, alongside the business-entity work.

Design: `docs/technical-designs/08-payments.md`.
