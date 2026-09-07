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
**Date:** 2026-09-04 · **Status:** decided, and the biggest untested bet in the plan

Twelve live sessions over four weeks, tied to a real deadline.

**Why.** Adults quit things that run forever and finish things that end. A subscription has no moment where quitting registers as failure. A course tied to a real event does. Also cheaper to author: one four-week arc instead of infinite content.

**Rejected:** subscription-first. Kept as the post-course product, D-006.

**Would revisit if:** completion rates come back low anyway, which would mean the deadline is not doing the work.

---

## D-006: Optional monthly subscription after the course
**Date:** 2026-09-04 · **Status:** decided, build second

Course acquires, subscription retains.

**Why.** Captures the people who want to keep going without imposing open-endedness on everyone. Also gives the spaced-review intervals beyond three weeks somewhere to live, which a four-week course cannot.

**Sequencing:** course first. Do not build subscription mechanics until completion is proven.

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
**Date:** 2026-09-05 · **Status:** decided

**Why.** Shorter than the kids product's 40 minutes. Adults have jobs, and 30 minutes of hard speaking is more taxing than 40 minutes of guided reading. Three per week gives twelve sessions over four weeks, which is a clean course shape.

**Rejected:** 40 minutes, carried over from kids. No mid-session break either, adults do not need one at 30 minutes.

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
