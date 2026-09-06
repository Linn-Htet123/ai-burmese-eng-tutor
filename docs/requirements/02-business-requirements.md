# [PRODUCT NAME TBD]: Business Requirements Document
### The adult English speaking product

> **Naming note.** **Aye** is the name of the tutor character only. The product itself is unnamed. It appears in these documents as **[PRODUCT NAME TBD]**. Search that string when the name is chosen.


**Version 1, 2026-09-05**

---

## 1. Business objective

Get a Burmese adult who already speaks some English to finish a four-week interview preparation course, sound noticeably smoother at the end of it, and either tell someone else or continue on a monthly plan.

Two revenue events, in order: the course sells, the subscription retains. Build the course first.

### 1.1 What the business actually is, longer term

The interview course is the wedge, not the product. The product is a levelled speaking tutor: eleven levels, each changing what a session is made of, and a growing library of goal packs. Interviews first, then workplace daily, then client calls, presentations, negotiation.

That matters commercially for one reason. A single course is a one-off purchase with a hard ceiling. Levels plus packs give a learner somewhere to go next, which is what turns a course business into a retention business. But it is also far more content, so it is sequenced deliberately: ship four levels and one pack, prove completion, then extend.

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

Design assumption: **30-minute session, 3 per week, 12 sessions per course.** Shorter than the kids 40 minutes, because adults have jobs and because 30 minutes of hard speaking is more taxing than 40 minutes of guided reading.

### 3.2 Cost per session and per course

| Architecture | Per session | Per course (12) | Per month (2x/wk) |
|---|---|---|---|
| A. All live, no VAD, 1.5x context overhead | $0.74 | **$8.91** | $6.46 |
| B. All live + client VAD, 1.3x overhead | $0.49 | **$5.91** | $4.29 |
| C. Hybrid, 30% scripted TTS, segmented context 1.1x | $0.44 | $5.26 | $3.82 |
| D. C, with scripted TTS cached across learners | $0.40 | **$4.78** | $3.46 |
| E. D, with learner talking 70% of the time | $0.41 | $4.88 | $3.54 |
| F. E, item log emitted by the model instead of a separate transcribe stream | $0.22 | **$2.61** | $1.89 |

Two findings worth reading twice.

**Finding 1: shifting talk time to the learner does not save money on its own.** Row E is marginally *worse* than row D. Transcription is billed at $0.009 per minute against $0.0045 for input, so every extra minute the learner speaks costs more in transcription than it saves in model output. The pedagogically correct move is cost-neutral at best under the current architecture.

**Finding 2: the separate transcription stream is the single largest controllable cost**, roughly 45% of an optimised session. Row F removes it by having the live model emit a structured item log alongside its audio response, rather than paying a second service to transcribe the same audio. This is the highest-leverage engineering decision in the document and it is worth prototyping in week one.

### 3.3 Gross margin by course price

| Course price | At $2.61 cost (F) | At $4.78 cost (D) |
|---|---|---|
| $10 | 74% | 52% |
| $12 | 78% | 60% |
| $15 | **83%** | **68%** |
| $20 | 87% | 76% |
| $25 | 90% | 81% |

Subtract 3 to 5% for payment processing, more if Myanmar rails are involved.

Every price from $10 up produces a viable margin. **Price is therefore not a cost question, it is a demand question.** Pick the price the market bears, not the price the model supports.

### 3.4 Post-course subscription

Assume 2 sessions per week, about 8.7 per month.

| Monthly price | At $1.89 cost (F) | At $3.46 cost (D) |
|---|---|---|
| $6 | 69% | 42% |
| $8 | 76% | 57% |
| $10 | 81% | 65% |

$8 per month works comfortably. $6 works only if row F lands.

### 3.5 Cost levers, in order

1. **Emit the item log from the live model, drop the separate transcribe stream.** Biggest single win, roughly 45% of optimised session cost. Needs prototyping to confirm the structured output is reliable enough for spaced review scheduling.
2. **Segment context per stage.** A 30-minute continuous context re-bills accumulated audio on every turn. Better engineering regardless of price.
3. **Aggressive client-side VAD.** Silence sent as audio is billed as audio.
4. **Cache scripted TTS across learners.** Smaller win here than for kids, because less of an adult session is scriptable, but free once built.
5. **Session length.** 30 to 20 minutes cuts a third. Real pedagogical trade, do not reach for it first.

⚠️ **Highest-priority open item, carried over unchanged from the kids document.** Every figure above rests on assumed talk ratios and a guessed context overhead multiplier. Reconnects that resend audio are billed again. **Instrument billed tokens per session per stage in week one and re-run this table against real logs before committing to a price.**

---

## 4. Pricing

**Unresolved. This is a blocking decision.**

What is known:

* The floor is cheap. Anything above $10 for the course produces a healthy margin.
* Regional pricing sets the anchor. Udemy and Coursera both price by purchasing power, and in markets like India and Brazil a course sells around $10 to $15, discounted almost continuously. The comparison point in a Burmese buyer's head is a discounted Udemy course, not a $79 US one.
* But those are recorded videos with low completion. This is twelve live sessions with feedback, which is closer to tutoring, and tutoring is priced per hour at $8 to $25.
* One live data point from the founder: $20 to $25 reads as expensive to him personally, and he recently bought Netflix at around $5 per month. Netflix is entertainment competing with free, so it is a weak comparison, but the reaction is a signal about the market's price sensitivity.

**Current working estimate: $10 to $15 for the four-week course, $8 per month after.** Held loosely.

**Method to resolve it.** Ask ten Burmese adults what they *currently spend* on English. Not what they would pay. Stated willingness to pay is fiction, existing spend is fact.

If the answer is "nothing", the follow-up questions matter more than the first one:

1. What did you do the last time you needed English for something real, a job interview, a foreign client, a new boss? Did you pay a tutor, watch YouTube, ask a friend, or wing it?
2. What non-English things do you pay for monthly? Gym, Netflix, courses, subscriptions.

Question 1 finds the one-off spend, which is exactly what a deadline-driven course captures. Question 2 establishes what a normal purchase looks like for this person.

⚠️ If most respondents have never paid for anything English-related, the product is being sold to a market with no purchasing habit, which is a harder problem than getting the number wrong.

### 4.1 Packaging note

The founder's concern: four weeks looks thin next to a one-year Udemy subscription, and buyers will compare.

The recommendation is **not** to lengthen the course. Longer means more content to author, longer before the format is validated, and more time for people to drop out. It buys a comparison optics fix at a high cost.

Fix the framing instead. Sell **"twelve live speaking sessions with feedback, interview-ready in four weeks"**, not "a four-week course". Twelve sessions compares favourably to twelve hours of tutoring, which is the honest comparison, and someone with an interview in three weeks is not shopping for a one-year subscription anyway.

---

## 5. Revenue model

Course sale, one-off. Optional monthly subscription afterwards.

At $12 course / $8 subscription, and row D costs:

| Course sales | Course revenue | Gross profit | + 30% converting to sub | Monthly recurring GP |
|---|---|---|---|---|
| 50 | $600 | $361 | 15 subs | $68 |
| 200 | $2,400 | $1,444 | 60 subs | $272 |
| 1,000 | $12,000 | $7,220 | 300 subs | $1,362 |

Read this honestly. The course is the revenue. The subscription is small at this scale and only becomes material after several thousand people have been through the course. Do not build the business plan on subscription MRR in year one.

The founder's stated near-term target was $200 per month within four or five months. At $12 a course that is **17 sales a month**, or about four a week. That is a realistic number and it should be the operating target, not a user count.

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

⚠️ **Content authoring is the unbudgeted cost in this plan.** Twelve interview units at the specified level of detail is plausibly 20 to 40 hours of work that cannot be sped up by writing code faster. A technical founder will under-budget this. Estimate it before committing to a launch date.

---

## 9. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| People do not finish the course | **Highest** | The deadline format is the whole bet. Instrument completion by session number from day one |
| Nobody finds the product | High | Distribution is undiscussed. See `04-marketing-plan.md`, and treat it as unsolved |
| Market has no habit of paying for English | High | Resolve via the ten interviews before building further |
| Upgrade suggestions are wrong or unnatural | High | Scripted target upgrades per unit, not free improvisation. Same principle as the kids lesson schema |
| Payment rails in Myanmar | High | Unsolved, carried from kids product |
| Latency breaks the conversation | Medium | Retrieval practice under time pressure is the product. Slow response destroys it |
| Founder is the only sample | Medium | The ten interviews |
| Scope creep from the level system | **High** | Eleven levels times any topic is not authorable in a month. MVP is levels 3 to 6 and one pack. See PRD R-LV-7 |
| Founder builds for his own level first | Medium | He sits at level 8 to 10, outside the MVP band. Named explicitly so it can be resisted |
| Automatic level placement is unreliable | Medium | First 50 placements reviewed by hand before any automation |
| Viber and Messenger business messaging not approved | Medium | Verify before promising it. SMS fallback is worse and costs more |

---

## 10. Blocking operational questions

1. **Payment.** How does a Burmese adult in Myanmar actually pay. KBZPay, Wave Money, agent top-up, or Thai rails for the diaspora segment. Automated rails unsolved. **Launch decision: manual bank transfer with manual account activation for the first 50 customers.** Ugly, unscalable, and it produces revenue this month.
2. **Price.** See section 4.
3. **Distribution.** Undiscussed.
4. **Content authoring capacity.** Twelve sessions of interview content, properly scripted with target upgrades, is real work. Estimate it before committing to a launch date.
4a. **Level coverage.** MVP ships levels 3 to 6. Every level added is another authoring pass across the pack.
5. **The raise.** No amount set. Frame it as twelve months of runway plus content authoring plus voice API for the first cohorts, then work backwards.

---

## 11. Four-week success criteria

The MVP is judged on these, in order:

1. **Course completion rate.** What fraction reach session 12. This is the number that decides whether the format works.
2. **The before and after clip.** Does week one versus week four sound different to a neutral listener. If it does not, the method is wrong.
3. **17 course sales in a month**, the founder's stated near-term revenue target.
4. **Measured cost per session** against the table in section 3.
