# [PRODUCT NAME TBD]: Business Requirements Document
### The adult English speaking product

> **Naming note.** **May** is the name of the tutor character only. The product itself is unnamed. It appears in these documents as **[PRODUCT NAME TBD]**. Search that string when the name is chosen.


**Version 1, 2026-09-05**

---

## 1. Business objective

Get a Burmese adult who already speaks some English into a **daily 40-minute practice habit at $25/month** (D-042), deliver a visibly smoother sample of their own voice by the end of month one, and keep them past month two. The first month carries a pack-shaped arc (interview-ready in 4 weeks, D-043) that ends with the before/after clip as the renewal moment.

**One revenue event: the monthly subscription.** The first-month pack is what gets people to the second charge; profession packs (D-043) are what keeps them past month three.

### 1.1 What the business actually is, longer term

The interview pack is the wedge, not the product (D-043). The product is a levelled speaking tutor: eleven levels, each changing what a session is made of, and a growing library of **profession-based goal packs** — nurses/doctors, street food & shop owners, delivery & drivers, teachers, engineers, office workers.

That matters commercially for one reason. Subscription retention needs a reason to renew every month. A single pack has a hard ceiling — once "interview-ready" is achieved, why keep paying? Profession packs give a learner somewhere to go next, which is what turns month-2 renewal into month-6 retention. Ship all eleven levels but only pack #1 (interviews) in MVP (D-043) to prove the subscription mechanic works; the R-TP-6 interest signal decides which pack to author next.

---

## 2. Customer and user are the same person

This is the main structural advantage over the kids product and it is worth being explicit about what it removes.

| Kids product | Adult product |
|---|---|
| Parent buys, child uses | Learner buys, learner uses |
| Needed a separate parent product (weekly Viber message, voice clip) | No second product surface |
| Consent forms for recording minors, two permission levels | Standard consent, one adult |
| Parent payment rails, parent trust barrier | Learner pays for themselves |
| Value must be demonstrated to someone who is not in the sessions | The buyer experiences the value directly |
| $8 per month ceiling, discretionary family spend | Tied to income and a job outcome, higher ceiling |

Roughly a third of the kids build disappears. That is the real reason for the pivot, more than price.

---

## 3. Unit economics

Recomputed for the adult product. **The kids figures do not transfer**, because the adult session is conversation-heavy and the kids session was mostly scripted. The hybrid audio lever that saved about a third of cost for kids saves roughly a tenth here.

### 3.1 Cost basis

Gemini 3.1 Flash Live: **$3 per 1M audio input tokens, $12 per 1M audio output tokens**, at 25 audio tokens per second.

| Service | Rate |
|---|---|
| Live audio in | $0.0045 / min |
| Live audio out | $0.0180 / min |
| Flash TTS out (pre-generated) | $0.0090 / min |
| Live Transcribe | $0.0090 / min |

Design assumption (per D-042): **40-minute session, up to one per day** (hard cap, no banking). Sessions alternate unit day → review day. Longer than the pre-D-042 30-minute working assumption because daily-with-cap needs the session to feel worth opening; still shorter of intent than the kids 40 minutes of guided reading, because 40 minutes of *hard speaking* is roughly the ceiling before the learner burns out.

### 3.2 Cost per session by architecture (40-minute session)

Costs scale +33% vs. the earlier 30-minute assumption. Monthly usage estimates use daily/realistic/light cadences from D-042.

| Architecture | Per session | Per month (~21 sessions realistic) |
|---|---|---|
| A. All live, no VAD, 1.5x context overhead | $0.99 | $20.79 |
| B. All live + client VAD, 1.3x overhead | $0.65 | $13.71 |
| C. Hybrid, 30% scripted TTS, segmented context 1.1x | $0.59 | $12.34 |
| D. C, with scripted TTS cached across learners | $0.53 | $11.20 |
| E. D, with learner talking 70% of the time | $0.55 | $11.48 |
| F. E, item log emitted by the model instead of a separate transcribe stream | $0.29 | **$6.15** |

**Row F is the target (D-011).** At Row F costs and realistic usage, monthly per-learner cost matches the D-042 subscription-cost table (whale $8.80, realistic $6.15, light $3.81 — within rounding of D-042's stated $5.90-10.90 realistic range). Architectures A-E are shown as failure modes to avoid, not options.

**Two findings worth reading twice.**

**Finding 1: shifting talk time to the learner does not save money on its own.** Row E is marginally *worse* than row D. Transcription is billed at $0.009 per minute against $0.0045 for input, so every extra minute the learner speaks costs more in transcription than it saves in model output. The pedagogically correct move is cost-neutral at best under the current architecture.

**Finding 2: the separate transcription stream is the single largest controllable cost**, roughly 45% of an optimised session. Row F removes it by having the live model emit a structured item log alongside its audio response, rather than paying a second service to transcribe the same audio (D-011). This is the highest-leverage engineering decision in the document and it is worth prototyping in week one.

### 3.3 Gross margin at $25/month subscription

D-042 fixed the price at $25/month. Margin depends on **how much the learner actually uses**, since D-042 accepts variable per-learner cost.

| Usage | AI cost/month (Row F) | Kept of $25 | Margin |
|---|---|---|---|
| Every day (whale, ~30 sessions) | $8.80 | $16.20 | 65% |
| ~70% of days (realistic, ~21 sessions) | $6.15 | $18.85 | 75% |
| 3 days/week (light, ~13 sessions) | $3.81 | $21.19 | 85% |

D-042 quotes a wider range ($8.40-15.60 whale, $5.90-10.90 realistic, $3.40-6.20 light) to allow for architecture drift and prompt-length growth as content matures. Above assumes Row F architecture holds.

Subtract 3 to 5% for payment processing, more if Myanmar rails are involved (see §10 and PRD §13.2).

**The one-session-per-day cap (R-PY-2) is the margin guardrail** — without it, a whale opening two sessions daily doubles cost while paying the same $25.

### 3.4 Post-course subscription

**Superseded by D-042.** Prior versions of this section computed a 2-sessions/week post-course monthly rate as a separate revenue stream. That mechanic is now the *whole product*, folded into §3.3. Retained as a heading only so cross-doc anchors don't drift; historical numbers live in git history.

### 3.5 Cost levers, in order

1. **Emit the item log from the live model, drop the separate transcribe stream.** Biggest single win, roughly 45% of optimised session cost. Needs prototyping to confirm the structured output is reliable enough for spaced review scheduling.
2. **Segment context per stage.** A 30-minute continuous context re-bills accumulated audio on every turn. Better engineering regardless of price.
3. **Aggressive client-side VAD.** Silence sent as audio is billed as audio.
4. **Cache scripted TTS across learners.** Smaller win here than for kids, because less of an adult session is scriptable, but free once built.
5. **Session length.** D-042 set session at 40 minutes. Cutting to 30 saves ~25% per session; cutting to 25 saves ~38%. Real pedagogical trade — D-042's revisit conditions include this lever if week-one token logs put whale-cost above ~$16/month.

⚠️ **Highest-priority open item, carried over unchanged from the kids document.** Every figure above rests on assumed talk ratios and a guessed context overhead multiplier. Reconnects that resend audio are billed again. **Instrument billed tokens per session per stage in week one and re-run this table against real logs before committing to a price.**

---

## 4. Pricing

**Resolved: $25/month subscription (D-042).** Superseded the earlier "$10-15 for a four-week course, $8/mo after" working estimate. The demand-check research below is preserved because the underlying market question (does this market pay for English?) is still open and still important — see §4.0.

### 4.0 The demand-check that still applies

Original method (pre-D-042): ask ten Burmese adults what they *currently spend* on English. Not what they would pay. Stated willingness to pay is fiction, existing spend is fact.

If the answer is "nothing", the follow-up questions matter more than the first one:

1. What did you do the last time you needed English for something real — a job interview, a foreign client, a new boss? Did you pay a tutor, watch YouTube, ask a friend, or wing it?
2. What non-English things do you pay for monthly? Gym, Netflix, courses, subscriptions.

Question 1 finds the one-off spend, which is exactly what a pack-shaped first month captures (D-043). Question 2 establishes what a normal monthly purchase looks like for this person — critical now that the product is a subscription (D-042).

⚠️ **Still applies.** If most respondents have never paid for anything English-related, the product is being sold to a market with no purchasing habit — a harder problem than getting the number wrong. D-042 accepted $25/month as a founder call; this research remains the honest check.

### 4.1 Packaging note

Under D-042 the product is a monthly subscription, but marketing surfaces the **first-month pack** (D-043) — the interview-ready-in-4-weeks arc — because "$25/month for daily English practice" is a generic pitch in a way that "interview-ready in 4 weeks" isn't. The subscription is the delivery mechanism; the pack is the story.

Recommended framing: **"Interview-ready in 4 weeks. Daily 40-minute practice with feedback. $25/month, cancel anytime."** Someone with an interview in three weeks is not shopping for a one-year subscription anyway.

~7-9 hours of daily practice across the first month (cadence-dependent, per D-042 unit-day/review-day rhythm) compares favourably to the same hours of private tutoring at $8-25/hr — which remains the honest comparison.

---

## 5. Revenue model

**Monthly subscription at $25/month (D-042).** No one-off course sale. First-month pack arc (D-043) drives acquisition; **month-2 renewal (post-week-4-clip)** is the real conversion event that decides whether the format works commercially.

At $25/month subscription, Row F architecture, and realistic (~70% days) usage:

| Active subscribers | Monthly revenue | Monthly gross profit | Notes |
|---|---|---|---|
| 8 | $200 | ~$150 | Founder's near-term revenue target — see below |
| 50 | $1,250 | ~$940 | D-042's "50 subscribers ≈ $1,250/mo steady" |
| 200 | $5,000 | ~$3,770 | |
| 1,000 | $25,000 | ~$18,850 | |

Read this honestly. Revenue is now recurring — **every churned subscriber is money lost forever, not just one course sale forgone**. The retention question is the entire business.

The founder's stated near-term revenue target was $200/month within four or five months. At $25/mo that is **8 active subscribers**. Accounting for a month-1 churn rate (unknown; probably 30-50% before week-4 clip lands), that means roughly 12-16 gross new signups over the ramp. That is the operating target, not a user count.

---

## 6. Market

**Primary.** Burmese adults, roughly 22 to 35, with some English, in a professional or student track, actively job-hunting or preparing to. In Myanmar, in Thailand, and in the diaspora.

The Thailand and diaspora segments are worth separating out early. They have better payment rails, higher incomes, and a sharper reason to need English at work. They may be the real beachhead even though Myanmar is the larger population.

**Secondary, later.** Same demographic, different situations: client calls, standups, presentations, negotiations.

⚠️ Market has not been sized. No number is in this document because no honest one is available yet.

---

## 7. Competition

| Who | What they do | Why they do not solve this |
|---|---|---|
| italki, Preply | Human tutors, $8 to $25/hr | Work well. Scheduling friction, and the embarrassment barrier stops most of this segment from booking |
| Cambly | On-demand native speakers | Conversation without structure or a deadline. Expensive |
| ELSA Speak | Pronunciation | Solves accent, which is not the binding constraint |
| Speak, Duolingo Max | AI conversation practice | Error-correction framing, no deadline, general purpose |
| Udemy / Coursera interview courses | Recorded video | Zero production practice. Low completion |
| Free YouTube | Everything | Consumption feels like progress |

**The gap.** Nobody is doing upgrade-style feedback for people whose English is already correct but not smooth, in the learner's own first language, tied to a deadline. That is a narrow gap and it is a real one.

**The honest risk.** It is narrow enough that a well-funded competitor could add an "upgrade" mode in a quarter. The defensibility is Burmese-language delivery and distribution, not the feature.

---

## 8. Team and constraints

* Solo technical founder, Bangkok. Bootstrapped. AI-assisted coding.
* Target: investor-ready MVP in about one month.
* Founder is a member of the target market, which is a genuine research advantage and a genuine sampling bias. His instincts about the product are probably right. His instincts about the market size are one data point.
* No Burmese language or teaching hire. Content authoring is on the founder.

⚠️ **Content authoring is the unbudgeted cost in this plan.** Twelve interview units × 11 level bands at the specified level of detail is plausibly 55 to 110 hours of work that cannot be sped up by writing code faster. A technical founder will under-budget this. Estimate it before committing to a launch date.

---

## 9. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| People do not renew for month 2 | **Highest** | The week-4 pack arc + before/after clip is the whole bet (D-042, D-043). Instrument daily-active retention and month-1 pack completion from day one. See §11 |
| Nobody finds the product | High | Distribution is undiscussed. See `04-marketing-plan.md`, and treat it as unsolved |
| Market has no habit of paying for English | High | Resolve via the ten interviews before building further |
| Upgrade suggestions are wrong or unnatural | High | Scripted target upgrades per unit, not free improvisation. Same principle as the kids lesson schema |
| Payment rails in Myanmar | High | Unsolved, carried from kids product |
| Latency breaks the conversation | Medium | Retrieval practice under time pressure is the product. Slow response destroys it |
| Founder is the only sample | Medium | The ten interviews |
| Scope creep from the level system | **High** | MVP now covers all eleven levels for one pack (interviews) — ~3× the authoring load of levels 3–6. See PRD R-LV-7 |
| Founder over-invests in his own bands (8 to 10) | Medium | All bands now ship in MVP. Risk shifts from ignoring the lower bands to spending time polishing 8–10 while 0–3 sit incomplete |
| Automatic level placement is unreliable | Medium | First 50 placements reviewed by hand before any automation |
| Viber and Messenger business messaging not approved | Medium | Verify before promising it. SMS fallback is worse and costs more |

---

## 10. Blocking operational questions

1. **Payment.** How does a Burmese adult in Myanmar actually pay. KBZPay, Wave Money, agent top-up, or Thai rails for the diaspora segment. Automated rails unsolved. **Launch decision: manual bank transfer with manual account activation for the first 50 customers.** Ugly, unscalable, and it produces revenue this month.
2. ~~**Price.** See section 4.~~ **Resolved by D-042: $25/month subscription.**
3. **Distribution.** Undiscussed.
4. **Content authoring capacity.** Twelve units of interview content (pack #1, D-043), each properly scripted with target upgrades and delivered across the first-month unit-day cadence (D-042), is real work. Estimate it before committing to a launch date.
4a. **Level coverage.** MVP ships all 11 levels (0 to 10) per R-LV-7. Every band is another authoring pass across the pack; the ~3× cost multiplier is accepted.
5. **The raise.** No amount set. Frame it as twelve months of runway plus content authoring plus voice API for the first cohorts, then work backwards.

---

## 11. First-cohort success criteria

Under D-042 the MVP is judged over the first ~8-10 weeks (month 1 + month 2 renewal window), on these, in order:

1. **Month-1 pack completion.** What fraction of signups reach the week-4 before/after clip (D-043 pack goal fulfilled). Leading indicator of whether the format works.
2. **The before and after clip.** Does day 1 versus week 4 sound different to a neutral listener. If it does not, the method is wrong.
3. **Month-2 renewal rate.** Of learners who reach week 4, what fraction charge a second time. This is the number that decides whether the *business* works (D-042).
4. **8 active subscribers by month 4**, translating to the founder's $200/month near-term revenue target.
5. **Measured per-learner monthly cost** against the D-042 table in §3.3.
