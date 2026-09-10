# [PRODUCT NAME TBD]: Product Requirements Document
### The adult English speaking product

> **Naming note.** **May** is the name of the tutor character only. The product itself is unnamed. It appears in these documents as **[PRODUCT NAME TBD]**. Search that string when the name is chosen.


**Version 2, 2026-09-05**
**Supersedes v1, which was teaching-method notes rather than a product specification.**

Every requirement has an ID and acceptance criteria. If a requirement cannot be tested, it is not a requirement and it does not belong here.

---

## 0. Reading this document

* **R-xx-n** identifiers are stable. Reference them in tickets, never renumber them.
* **MVP** marks what ships in the first four weeks. **V2** marks what is specified but deliberately not built yet. **BACKLOG** marks what is only sketched.
* Where a decision is still open it says so, in place, rather than being quietly filled in with a guess.

---

## 1. What the product is

A web app where a Burmese adult opens a page, presses one button, and is immediately in a live spoken English lesson with a tutor called May who already knows their level, their goal, and what they got wrong last time.

Three commitments define it and everything below serves them.

1. **Zero friction to start.** No booking, no scheduling, no waiting for a tutor. Open and talk. This is the single biggest advantage over human tutoring and it must never be compromised for operational convenience.
2. **It meets you where you are.** A level from 0 to 10 changes what a session actually is, not just how hard the words are.
3. **It practises what you care about.** The learner's own goal and interests supply the content. Football if they like football. Interviews if they have one next month. Corporate meetings if that is the job.

### 1.1 Platform decisions

| ID | Decision | Rationale |
|---|---|---|
| R-PL-1 | **Web app**, mobile-first responsive. No native app for MVP | No app store review cycle, no install friction, one codebase for a solo founder. Myanmar users are phone-first but browser-comfortable |
| R-PL-2 | **Open and start any time.** No session booking, no calendar | Booking is friction and it is the thing human tutors already do badly. Removing it is a product advantage |
| R-PL-3 | **Interface language is Burmese.** English appears only as lesson content | The learner is not fluent. An English UI adds cognitive load before the lesson starts |
| R-PL-4 | Requires microphone and a stable-ish connection. Headphones recommended, not required | |
| R-PL-5 | Must work in Chrome on Android and Safari on iOS, on a mid-range phone over mobile data | This is the real device profile. Test on it, not on a laptop |

⚠️ **R-PL-2 has a cost consequence.** Unbooked sessions mean unpredictable concurrency and no way to smooth API spend. Accepted, but it must be monitored from day one, and a soft daily session cap per plan is the release valve if it gets out of hand. See R-PY-6.

---

## 2. The learner

**Primary.** Burmese adult, roughly 22 to 35. Has some English, from a little to a lot. Reads better than they speak. Stalls when speaking because they compose in Burmese and translate. Has bought an English course before and not finished it.

**Explicitly in scope, which is a change from v1.** Learners at the low end who genuinely need grammar taught, not just polished. The level system exists to serve them, and the product teaches grammar where the level calls for it.

**Out of scope.** Absolute beginners with no English at all. Children. Learners wanting IELTS or TOEFL score coaching, which is a test-prep product with different mechanics.

---

## 3. The level system

The core structural feature. A level is not a difficulty slider. **It changes what the session is made of.**

### 3.1 Level bands

| Level | Learner can | Session is mostly | Grammar treatment | Language of instruction |
|---|---|---|---|---|
| 0 to 1 | Knows words, cannot form sentences reliably | Guided sentence building, heavy modelling, simple back-and-forth | Taught explicitly, one pattern per session, always through examples first | 80 to 90% Burmese |
| 2 to 3 | Forms simple sentences, breaks down under pressure | Conversation with frequent scaffolding, translation drills both directions | Taught explicitly, tied to errors that actually appeared | 60 to 70% Burmese |
| 4 to 5 | Holds a conversation, makes regular errors, slow retrieval | Real conversation on the learner's topic, upgrade loop begins to dominate | Corrected in flow, explained only when the same error repeats | 40 to 50% Burmese |
| 6 to 7 | Communicates fine, sounds non-native, hesitates | Upgrade loop dominant. Speed and naturalness are the targets | Rarely explicit. Pattern-level only | 20 to 30% Burmese |
| 8 to 10 | Fluent but not polished. The founder sits here | Almost pure upgrade loop. Register, precision, phrasing, how to say something well | Only when a genuine error appears | 5 to 15% Burmese |

### 3.2 Requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-LV-1 | Learner is assigned a level 0 to 10 after placement (R-ON-4) | Every account has an integer level. No account can exist without one |
| R-LV-2 | Learner can override their level up or down at any time from the session start screen | Override takes effect on the next session start. Original placement level is retained in history |
| R-LV-3 | Level determines session composition per the table in 3.1, not merely vocabulary difficulty | Two sessions at levels 2 and 8 on the same topic produce visibly different stage sequences. Verifiable by inspecting the session plan |
| R-LV-4 | Level determines the Burmese to English instruction ratio per 3.1 | Measurable from the session transcript. Ratio within 15 percentage points of target |
| R-LV-5 | Level moves automatically on evidence, not on session count | Promotion requires the criteria in 3.3. Time served is never sufficient |
| R-LV-6 | Level changes are announced to the learner in Burmese, with the reason | Learner sees a message naming what improved |
| R-LV-7 | MVP ships all levels 0 to 10 | Every level band per 3.1 has its authored content and stage sequence ready before public launch |

⚠️ **R-LV-7 is the most important scope decision in this document.** Reversed from earlier drafts. MVP now ships all 11 level bands. This roughly triples the authoring work versus the earlier levels 3 to 6 plan — from 20 to 40 hours up to 55 to 110 hours. Content authoring in R-CA-3 is now the top schedule risk, and the launch date depends on whether the founder can absorb that authoring load. See the decisions log for the rationale behind this reversal.

### 3.3 Promotion and demotion

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-LV-8 | Promote a level when, across the last three sessions: fluent-first-attempt rate is above 70%, average stall length is below 3 seconds, and no step-downs were triggered | Rule is implemented as a scheduled evaluation after each session. All three conditions required |
| R-LV-9 | Demote a level when two consecutive sessions trigger three or more step-downs | Demotion is silent in the UI copy. Never says "you went down". Frames as "let us solidify this" |
| R-LV-10 | Level never moves more than one step per evaluation | |

---

## 4. Topics and personalisation

The second structural feature. The level decides the shape of a session. **The topic decides what is inside it.**

### 4.1 Topic model

A **topic pack** is authored content: situations, target language, upgrade pools, grammar points, and drill material, tagged by level band.

An **interest** is a lighter thing: a subject the learner cares about, used to generate conversation material inside a session. Football, cooking, their own job, their own city.

The distinction matters because packs are expensive to author and interests are nearly free.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-TP-1 | Learner picks one **goal pack** at signup, changeable later | Account always has exactly one active pack |
| R-TP-2 | Learner supplies up to three **interests** as free text at signup | Stored as text. Used for conversation material generation |
| R-TP-3 | Session content draws situations and examples from the active pack, and conversation material from the learner's interests and their own real life | A level 5 session on the interview pack for a learner interested in football uses interview structure with football and their real work as conversation content |
| R-TP-4 | Interests never override the goal pack's target language | Someone preparing for interviews still practises interview language, discussed through things they like |
| R-TP-5 | MVP ships **one** authored pack: job interviews | |
| R-TP-6 | Pack selection screen lists forthcoming packs greyed out with a Burmese "coming soon" label, and captures interest | Clicking a locked pack records the learner's preference. This is free demand research |

### 4.2 Pack roadmap

| Pack | Status | Why in this order |
|---|---|---|
| Job interviews | MVP | Real deadline, money attached, existing willingness to pay, easiest to advertise |
| Workplace daily: standups, updates, asking for help | V2 | Largest recurring need. The founder's own stated pain |
| Client and customer calls | V2 | Highest earning impact for freelancers |
| Presentations and demos | BACKLOG | |
| Negotiation: salary, scope, price | BACKLOG | |
| General conversation, no goal | BACKLOG | Weakest, because a goal is what makes people finish |

### 4.3 Adaptive personalisation

| ID | Requirement | Status |
|---|---|---|
| R-TP-7 | Five signup questions: (1) how to be called and gender, (2) age (picked from a range, not free-text number), (3) what you do (free text), (4) what you are preparing for (dropdown; values come from the pack catalog per R-TP-1; coming-soon packs greyed out per R-TP-6), (5) city of living. All skippable except question 1 | MVP |
| R-TP-8 | May references the learner's actual job and interests by name in sessions | MVP |
| R-TP-9 | Full adaptive profiling: automatically infers preferred topics, habits, difficulty tolerance and adjusts content selection | BACKLOG |

R-TP-9 is deliberately last. Five short signup questions capture most of the benefit at almost none of the cost, and the expensive version is not distinguishable to a learner in their first month.

---

## 5. Onboarding: first run, end to end

The most important flow in the product. Most people who abandon do it here.

### 5.1 The flow

```
Landing page (Burmese)
   -> Press "Try a free session"
   -> Phone number or email + password           [R-ON-1]
   -> Five questions (see R-TP-7)                [R-ON-2]
   -> Mic permission, with a 5-second test       [R-ON-3]
   -> Placement conversation, 8 to 10 minutes    [R-ON-4]
   -> Level shown + first session plan           [R-ON-5]
   -> Paywall                                    [R-ON-6]
```

### 5.2 Requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-ON-1 | Signup takes phone number or email plus password. No social login for MVP | Account created in under 30 seconds. Phone is primary since Myanmar users may not use email daily |
| R-ON-2 | Exactly the five questions defined in R-TP-7. Mix of dropdown, range picker, and free text | Skipping a question assigns a generic default for that field. Never blocks progress |
| R-ON-3 | Microphone permission requested with an in-page explanation in Burmese **before** the browser prompt, then a 5-second record-and-playback test | Learner hears their own voice played back before the placement starts. Failure shows a Burmese troubleshooting page, not a browser error |
| R-ON-4 | Placement is a live spoken conversation of 8 to 10 minutes, not a quiz | Produces a level 0 to 10, a confidence score, and a transcript. Never presented as a test. May opens with conversation, not instructions |
| R-ON-5 | After placement the learner sees their level in Burmese with a plain-language description of what it means, plus what the first session will cover | No numeric score shown without an explanation of it |
| R-ON-6 | The placement session is **free** and complete. The paywall appears only after it ends | Learner experiences the actual product before being asked for money |
| R-ON-7 | **The placement session audio is recorded and retained** | Non-negotiable. Without it there is no before-and-after clip, which is the entire marketing asset. Retroactive capture is impossible |
| R-ON-8 | If the learner abandons mid-placement, the partial transcript is kept and they resume where they stopped | Resume offered for 7 days, then a fresh placement |
| R-ON-9 | Total time from landing page to speaking English out loud must be under 3 minutes | Measured as a funnel metric. If it exceeds 3 minutes, cut steps |

⚠️ **R-ON-6 is a real bet.** Giving away a full session costs roughly 22 to 40 cents. The alternative, paywall first, would raise conversion per visitor but drastically cut the number of people who ever hear the upgrade loop, and the upgrade loop is the thing that sells the product. Reconsider only if free-session-to-paid conversion falls below about 15%.

⚠️ **R-ON-4 open question.** Automatic level assignment from a spoken conversation is not proven. For the first cohort the founder reviews every placement manually within 12 hours and corrects the assigned level. This is deliberately unscalable and it is how the rubric gets calibrated. Do not automate before roughly 50 manual placements exist.

---

## 6. The session

### 6.1 Shape

**40 minutes. Sessions alternate unit day → review day → unit day → ...** per D-042. Unit days introduce new authored material; review days are drawn from the review queue plus free conversation on the learner's own material — no new authored unit. No mid-session break. Stage composition is set by level per section 3.1. Below is the level 4 to 6 reference; variations for other bands described after each table. All 11 level bands ship in MVP (see R-LV-7).

**Unit day** — introduces new authored material.

| # | Stage | Time | What happens |
|---|---|---|---|
| 0 | Greeting | 1 min | Fixed shape, varied wording. Small talk in English. Itself practice, and it warms up the voice |
| 1 | Review | 5 min | Items due from spaced review, plus the three recap items from last session, unconditionally |
| 2 | Situation brief | 4 min | In Burmese. What this situation is, what the other person wants, what a good answer sounds like. **Situation before language** |
| 3 | Drills | 7 min | Two-direction translation. Burmese-to-English weighted about 2:1 |
| 4 | Core practice | 16 min | Upgrade loop on the learner's real material |
| 5 | Recap | 7 min | Three things that held you back. See section 9 |

At levels 0 to 3, stage 3 expands and stage 4 shrinks, and an explicit grammar stage is inserted before drills. At levels 7 to 10, stages 2 and 3 nearly disappear and stage 4 takes 26 minutes.

**Review day** — no new authored unit. Review queue is the main course; the rest is free conversation on the learner's own topics.

| # | Stage | Time | What happens |
|---|---|---|---|
| 0 | Greeting | 1 min | Same as unit day |
| 1 | Review | 12 min | Full review queue for the day. This is the day's main course |
| 2 | Free conversation | 20 min | Upgrade loop on the learner's real topics — no assigned situation. Any unfinished target phrases from prior unit days surface here |
| 3 | Recap | 7 min | Same three-things format as unit day |

### 6.2 Requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-SE-1 | Session plan is generated **before** the session starts, from level, pack, review queue, and interests | Plan exists as an inspectable object. Sessions are never improvised end to end |
| R-SE-2 | Learner sees the plan in one screen in Burmese before pressing start | Stage names and durations visible |
| R-SE-3 | Each stage is a separate model context with a compact state summary passed forward | Verifiable in logs. This is both a cost control and a quality control |
| R-SE-4 | Learner can pause. A paused session holds for 10 minutes, then ends and saves progress | Resumed session continues at the same stage |
| R-SE-5 | Learner can end early. Everything completed still counts, review items still written | No penalty framing. Never "you quit" |
| R-SE-6 | On-screen: current stage, time remaining, a live transcript of the last few exchanges, and the phrase currently being practised | Transcript matters. Learners at this level read faster than they hear |
| R-SE-7 | Learner can request Burmese explanation at any moment by pressing one button or saying it in Burmese | May switches to Burmese, explains, returns to the stage |
| R-SE-8 | Learner can interrupt May by speaking | May stops within 300ms of detected learner speech |
| R-SE-9 | Session audio recorded in full, with consent captured at signup | Learner can play back any past session |
| R-SE-10 | Session produces: transcript, updated review items, three recap items, updated fluency metrics | All five artefacts written before the session is marked complete |

### 6.3 On-screen layout, described

One column on a phone. Top: stage name and time remaining in Burmese. Middle, largest area: the current target phrase in English, large type, with its Burmese meaning underneath in smaller type. Below that: the last three exchanges as scrolling text. Bottom: a large microphone state indicator, a pause button, and a "say it in Burmese" help button.

No whiteboard. It served the kids product, where drawing made concrete nouns comprehensible. Adults do not have that problem, and the phrase display does the same job better for language that is mostly abstract.

---

## 7. The upgrade loop

The core interaction. Specified as a state machine because it must behave identically every time.

### 7.1 The mechanic

```
S1  PROMPT      May asks a question or sets a situation
S2  LEARNER     Learner answers out loud, however they can
S3  ACKNOWLEDGE May names, specifically, what worked
                  "That's clear, and 'responsible for' is exactly right"
S4  UPGRADE     May gives ONE better version
                  "A native speaker would say: 'I led the migration end to end'"
S5  REPEAT      Learner says the upgraded version out loud     [required]
S6  CONFIRM     May confirms, or asks for one more run if delivery was hesitant
S7  LOG         Upgraded phrase written to the review queue
```

### 7.2 Requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-UL-1 | Every loop passes S3 before S4. Acknowledgement is never skipped | Verifiable in transcripts. 100% of loops |
| R-UL-2 | Acknowledgement names a specific element, never generic praise | "Good job" and "well done" are prohibited strings in acknowledgement position |
| R-UL-3 | Exactly one upgrade per turn. Never a list | Two upgrades in one turn is a defect |
| R-UL-4 | May never interrupts the learner mid-sentence | Interruption by May during learner speech is a defect |
| R-UL-5 | S5 is required. If the learner does not repeat, prompt once, then continue | Never prompt twice. Fighting the learner costs more than the missed rep |
| R-UL-6 | Upgrade changes phrasing, never content | May never rewrites what the learner meant |
| R-UL-7 | If the sentence is genuinely wrong, correct it in the same warm frame | No switch into teacher register |
| R-UL-8 | Upgrades are drawn from the pack's authored **upgrade pool**, not improvised | Improvised upgrades outside the pool are logged and flagged for review |
| R-UL-9 | If nothing in the pool matches, May may generate one, but it is flagged for founder review before entering the review queue | Generated upgrades are visible in an admin queue |

⚠️ **R-UL-8 and R-UL-9 are the quality firewall.** A model asked for "more natural English" will produce confident nonsense, and a paying adult who is taught wrong English will notice and leave. The authored pool is also what makes cached TTS possible for scripted lines. Accept the authoring cost.

### 7.3 What upgrades target, in priority order

1. **Verb choice.** Highest yield by a distance. "I did the project" becomes "I ran the project"
2. **Collocation.** "Make a decision", not "do a decision"
3. **Compression.** Burmese speakers often over-explain in English. Shorter is usually the upgrade
4. **Hedging and softening.** "Roughly", "off the top of my head", "I'd say". What makes someone sound comfortable rather than blunt
5. **Turn-holding fillers.** "That's a good question, let me think for a second"

Item 5 is small and disproportionately valuable: it directly treats the stall. These phrases hold the turn while the learner finishes translating internally. **Teach them in session one, at every level.**

---

## 8. Grammar teaching

Added in v2. Previously out of scope, which was wrong.

Grammar is taught, but never as the primary activity and never as rules first.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-GR-1 | Grammar instruction is level-dependent per 3.1. Explicit at 0 to 3, in-flow at 4 to 6, error-triggered only at 7 to 10 | A level 8 session contains no scheduled grammar stage |
| R-GR-2 | A grammar point is always introduced with three real example sentences **before** the rule is named | Rule-first presentation is a defect |
| R-GR-3 | The rule may be named in Burmese. Examples are always in English | |
| R-GR-4 | At levels 0 to 3, one grammar point per session, maximum | |
| R-GR-5 | Grammar points are selected by what the learner actually got wrong, ranked by frequency in their own error log, not by curriculum order | Selection is inspectable and traceable to logged errors |
| R-GR-6 | After teaching, the learner must **produce** three sentences using the pattern about their own life | Recognition exercises are prohibited as the check |
| R-GR-7 | Grammar points enter the spaced review queue as items like any other | |

⚠️ Deliberate rejection: no grammar tables, no conjugation charts, no rule boxes. That is the Myanmar school method on a new screen, and it is the reason this learner cannot speak despite years of study.

---

## 9. Review, memory, and the recap

### 9.1 End-of-session recap

Five minutes, fixed structure, and the single strongest retention mechanism in the product.

May names **up to three specific things that held you back this session.** Not three errors. Three things that slowed the learner down or made them sound less capable than they are.

Per item:

```
What happened:   "You said 'I am responsible to manage the team'"
Why it cost you: "'Responsible for managing' is the pattern. You paused
                  because you weren't sure, and the pause lost you the turn"
The upgrade:     "I'm responsible for managing the team"
Say it back:     [learner repeats]
```

Then the closing line, which is the mechanism:

> "These three come back next session."

And they do.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-RC-1 | Up to three recap items per session. Three is a cap, not a quota | If one thing was worth naming, name one. Padding teaches the learner the recap is theatre |
| R-RC-2 | Every recap item is written to the review queue with next_review set to the next session, unconditionally | Verifiable in the data. This is what makes the promise true |
| R-RC-3 | Recap items appear in stage 1 of the following session, explicitly framed as "these are the three from last time" | The learner must notice the promise was kept |
| R-RC-4 | Recap is delivered in Burmese, with the English phrases in English | |
| R-RC-5 | Recap is also written to the learner's progress page as text they can re-read | |

### 9.2 Spaced review

**This matters more than content breadth.** Ten sessions with proper review beat thirty without.

The distinction driving the design: **massed repetition within a session builds comprehension. Spaced repetition across sessions builds retrieval speed.** Different mechanisms, both required, both specified.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-RV-1 | Every learner has a review queue of items. An item is a phrase, collocation, upgrade pattern, filler, or grammar pattern | |
| R-RV-2 | Each item stores what the learner originally said and what it was upgraded to | This pairing is what generates the before-and-after comparison later |
| R-RV-3 | Expanding intervals: 1 day, 3 days, 1 week, 3 weeks, then longer | |
| R-RV-4 | On failure, the interval resets and the item returns next session | |
| R-RV-5 | A new item introduced in a session is repeated several times **within** that session | Massed repetition. Without it the item is not retrievable at all |
| R-RV-6 | New items capped at 8 to 12 per session | Lower than the kids product's 10 to 15, because upgrade patterns are heavier than vocabulary |
| R-RV-7 | The review queue is cleared before new material is introduced | |
| R-RV-8 | Items are marked fluent, hesitant, or failed, based on delivery not just correctness | Hesitant is a distinct state and it is the one that matters most for this product |

⚠️ **The pedagogical case for daily subscription.** On any short timeline (say a compressed four-week block) the 3-week interval fires roughly once and anything longer never fires. Real acquisition needs those long intervals to actually fire. This is one of the strongest arguments for the daily subscription model (D-042) — and it should be said to learners honestly rather than hidden.

### 9.3 Progress and the proof asset

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-PR-1 | A progress page in Burmese showing: sessions completed, current level, phrases learned, and the last three recaps | One screen. No dashboards, no charts for the sake of charts |
| R-PR-2 | **Before-and-after playback.** Placement session clip beside the most recent session clip, same prompt where possible | Available from session 6 onward. This is the retention tool and the marketing asset in one |
| R-PR-3 | Learner can share the before-and-after clip with one button | Sharing is opt-in per clip and never automatic |
| R-PR-4 | Two separate consents: recording for the learner's own use, captured at signup; permission for public marketing use, requested at session 12 | Asked when the learner is pleased, not when they are cautious. Never bundled |
| R-PR-5 | Fluency metrics tracked per session: average stall length, fluent-first-attempt rate, words per minute, self-correction count | These feed level promotion in R-LV-8 |

---

## 10. Failure handling

For a child, repeated failure produces frustration. For a paying adult it produces **embarrassment**, and an embarrassed adult stops opening the app and never says why. There is no parent to notice. This section is therefore a retention feature, not an edge case.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-FA-1 | Three consecutive failures on one item: stop drilling it. Step down to something the learner can do. Return next session | Step-down path defined for every unit in every pack |
| R-FA-2 | Every session must contain at least one visible win, named explicitly at the end | Something the learner can point at: a phrase they now say smoothly that they could not last week |
| R-FA-3 | If the learner apologises for their English, May neither agrees nor over-reassures. One short line, then back to work | Over-reassurance reads as pity |
| R-FA-4 | If a learner stalls for more than 5 seconds, May offers a turn-holding filler first, then the word | Teaching the recovery move is worth more than supplying the answer |
| R-FA-5 | Three or more step-downs in a session triggers a level review | See R-LV-9 |
| R-FA-6 | Copy never uses failure language. No "wrong", no "you failed", no red | Verifiable by string audit of all Burmese and English UI copy |

### 10.1 Absence and lapsing

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-FA-7 | 3 days without a session: one reminder, in Burmese, via the learner's chosen channel | See section 12 |
| R-FA-8 | 7 days: a second message offering to restart the current week rather than continue | Restarting is offered as normal, never as a setback |
| R-FA-9 | 14 days: one final message, then stop | Never more than three. Nagging loses the referral as well as the learner |
| R-FA-10 | A returning learner after 7-plus days gets a shorter, easier session designed to be a win | Return session is a distinct session type |

---

## 11. May: persona specification

**Presentation.** Burmese woman, late twenties to early thirties. A professional peer with better English, not a schoolteacher. Someone who has worked in English and is showing you how it is done.

**Voice.** Native-fluency Burmese, clear natural English. Latency is part of the persona: slow responses make her feel like software.

| Situation | Behaviour |
|---|---|
| Learner produces a workable sentence | Name what worked, specifically, then upgrade |
| Learner makes a real error | Correct it, same warm frame. No register change |
| Learner stalls mid-sentence | Wait. Do not rescue immediately. The stall is what is being trained |
| Learner stalls past 5 seconds | Offer the filler, then the word |
| Learner apologises for their English | Do not agree, do not over-reassure. Move on |
| Learner asks about her | Two sentences maximum, English only. She has a light personal life |
| Explaining why an upgrade is better | Burmese, permanently, at every level. This is the one place explanation beats immersion |
| Learner misses sessions | Note it plainly, no guilt. "You missed a few days, let's pick up where we left off" |
| Learner speaks Burmese mid-session | Answer briefly in Burmese, then return to English. Never scold |
| Learner asks for something off-topic | One short answer, then back to the stage |

**Differences from the kids persona, deliberately.** No cutesiness. No stickers. No "I missed you". No cartoon face. Adults find it patronising, and this buyer is paying for competence.

⚠️ Dropped from the kids spec: "occasionally be slightly wrong to invite correction." It worked on children because correcting the teacher is a thrill at eleven. An adult paying money who catches the tutor being wrong concludes the product is unreliable. **May is never deliberately wrong.**

---

## 12. Notifications

Burmese-language, and deliberately minimal.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-NT-1 | Learner picks a channel at signup: Viber, Messenger, SMS, or email | Viber and Messenger are where Burmese users actually are |
| R-NT-2 | One daily reminder at a learner-chosen time, on days with no completed session | Off by default is wrong here. On by default, one tap to disable |
| R-NT-3 | Absence messages per R-FA-7 through R-FA-9 | Hard cap of three, ever |
| R-NT-4 | Session-12 completion message with the before-and-after clip and the referral ask | Highest-intent moment in the product |
| R-NT-5 | No marketing messages to active learners | |
| R-NT-6 | Every message includes a one-tap unsubscribe in Burmese | |

⚠️ Open decision: Viber and Messenger business messaging both require approved templates and a business account, which takes time and may cost money. **Verify feasibility before promising it.** SMS is the fallback and it is worse and costs more per message.

---

## 13. Payment and plans

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-PY-1 | Product sold as a **monthly subscription at $25/month**, auto-renewing (D-042) | Manual renewal outreach for MVP — see 13.2 |
| R-PY-2 | Each learner gets **one session per day, 40 minutes**. Hard cap — no banking unused days into longer sessions or extra daily sessions | Session start blocked if today's session is already completed |
| R-PY-3 | Session rhythm alternates **unit day → review day → unit day → ...** Review days generated from the review queue, not authored (D-042) | Plan-preview screen shows today's day type before start |
| R-PY-4 | **First month is pack-shaped:** an explicit outcome goal (e.g. "handle a foreign patient confidently in 4 weeks"), ending with the week-4 before/after clip as the renewal moment (D-042, D-043) | Landing page and onboarding surface the pack goal, not "a subscription" |
| R-PY-5 | One price, one product. No tiers at launch | |
| R-PY-6 | Refund policy for the first billing cycle | ⚠️ Policy shape TBD — see O-10 in §19 |
| R-PY-7 | Cost re-check against real R-TE-8 token logs in week one. Price or minutes adjust **before** launch if reality is worse than D-042's cost table | Documented decision either way before subscription flips on |

### 13.1 Price

**$25/month, auto-renewing (D-042).**

Cost basis (BRD ~$0.007–0.013/min via Gemini Live):

| Usage | AI cost/month | Kept of $25 |
|---|---|---|
| Every day (whale) | $8.40–15.60 | $9.40–16.60 |
| ~70% of days (realistic) | $5.90–10.90 | $14–19 |
| 3 days/week (light) | $3.40–6.20 | $19–22 |

The subscription beats one-shot on recurring revenue: 50 subscribers ≈ $1,250/month steady vs. a one-time $35 × 50 = $1,750 then zero. Daily practice is also better pedagogy and finally makes the long spaced-review intervals real (see 9.2).

**Guardrails.** The one-session-per-day cap (R-PY-2) protects margin at the whale end. R-PY-7 requires re-check against real token logs in week one.

**Would revisit if:** week-one token logs put whale-cost above ~$16/month, or month-2 renewal proves materially worse than course completion would have (D-042).

### 13.2 Payment rails

**Decision: manual bank transfer + manual activation for MVP (D-026, D-042).** Automate only once there is revenue worth automating.

| Option | Reach | Status |
|---|---|---|
| Manual bank transfer + manual activation | Everyone | ✅ Picked for MVP — correct for the first 50 customers (D-026) |
| Stripe or Paddle, cards | Diaspora and Thailand only | Deferred — most Myanmar learners have no international card |
| KBZPay, Wave Money | Myanmar mass market | Deferred — integration difficulty and business-entity requirements unverified |
| Thai rails, PromptPay | Thailand-based Burmese | Deferred — good fit for what may be the real beachhead if diaspora dominates |

Founder handles monthly renewal outreach until an automated rail lands (D-042 accepts this cost).

---

## 14. Content authoring

The hidden work item, and the most likely reason a one-month timeline slips.

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-CA-1 | All content authored in a structured format, version-controlled, never improvised at runtime | |
| R-CA-2 | Each unit specifies: situation brief in Burmese, target questions, upgrade pool, translation pairs, grammar point where applicable, fillers taught, and a step-down target | Every field present for every unit before it can be marked ready |
| R-CA-3 | MVP needs 12 units for the interview pack, authored for all levels 0 to 10 | |
| R-CA-4 | A minimal internal authoring and review tool: list units, edit fields, mark ready, view flagged model-generated upgrades | Not a CMS. A single admin page is sufficient |
| R-CA-5 | Founder reviews every flagged upgrade from R-UL-9 weekly | This is the quality loop that keeps the pool honest |

### 14.1 Unit structure, described

Each unit carries an identifier and a week number. It holds a Burmese situation brief for stage 2, a set of target questions for the core practice stage, and the upgrade pool, which is a list of trigger phrases paired with their upgraded forms and a type label such as verb choice or collocation. It also holds translation pairs for the drill stage, a grammar point where the level calls for one, the filler phrases taught in that unit, and a step-down target naming the easier unit to fall back to.

⚠️ **Estimate the authoring time before committing to a launch date.** Twelve units × 11 level bands at the specified level of detail is plausibly 55 to 110 hours of real work, and it is not compressible by writing code faster. This is the item most likely to blow the schedule, and it is the one a technical founder is most likely to under-budget. R-LV-7 is the decision that drove this multiplier — revisit if the authoring load proves impossible.

---

## 15. Technical requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| R-TE-1 | Response latency under 1 second from end of learner speech to start of May's speech | Product requirement, not infrastructure polish. Retrieval practice under time pressure is the method |
| R-TE-2 | Learner can interrupt May. May stops within 300ms | |
| R-TE-3 | Aggressive client-side voice activity detection | Silence sent as audio is billed as audio. Cost control as well as latency |
| R-TE-4 | Per-stage model context with a compact state summary passed forward | Cost control and quality control |
| R-TE-5 | Reconnect must not resend prior audio | Resent audio is billed again. A known and avoidable cost leak |
| R-TE-6 | Session state persisted continuously. A dropped connection loses at most 10 seconds | Mobile data drops. Assume it |
| R-TE-7 | Item log emitted by the live model rather than a separate transcription stream | ⚠️ Prototype in week one. Roughly 45% of optimised session cost. See BRD D-011 |
| R-TE-8 | Billed tokens logged per session per stage from day one | Every cost figure in the BRD is currently an assumption |
| R-TE-9 | Graceful degradation: if the live model is unavailable, offer a text-based review session rather than an error | A learner who hits a hard error on their streak day is a churn risk |
| R-TE-10 | Audio stored with per-learner access control. Only the learner and the founder can access it | |

### 15.1 Analytics events, minimum

Signup started, signup completed, mic test passed or failed, placement started, placement completed, level assigned, paywall shown, payment completed, session started, session completed with session number, stage completed, upgrade delivered, upgrade repeated, step-down triggered, level changed, before-and-after viewed, clip shared, reminder sent, reminder clicked, refund requested.

⚠️ Session-number granularity on session completed is the single most important event in the list. It produces the drop-off curve, which is how the format gets diagnosed.

---

## 16. MVP scope

**In:**
* Web app, Burmese UI, mobile-first
* Signup, two questions, mic test
* Placement session with manual founder review
* All levels 0 to 10, with automatic promotion and demotion
* One goal pack: job interviews, 12 units
* Upgrade loop with an authored pool
* Two-direction translation drills, untimed
* Grammar in-flow for levels 4 to 6, explicit for level 3
* Spaced review with the recap promise
* Progress page with before-and-after playback
* Session recording plus two-stage consent
* Manual payment activation
* Notifications on one channel
* Token instrumentation and the analytics events above
* Internal authoring and review page

**Out, deliberately:**
* Packs beyond interviews
* Timed speed sprint
* Subscription mechanics
* Automated payment
* Adaptive profiling beyond two questions
* Whiteboard
* Native apps
* Social login
* Any analytics dashboard beyond raw event export

**The bar:** twelve units authored properly beats thirty authored quickly. Same rule as the kids MVP, and it held.

---

## 17. Backlog

Ordered. Nothing is discarded, only queued.

1. **Burmese-to-English speed sprint.** May gives a Burmese sentence, learner has 5 seconds to produce the English. Attacks the stall more directly than anything else in the plan. Held only until the untimed drill works, then it should move up fast
2. **Workplace-daily pack**, then client calls, presentations, negotiation
3. **Post-course subscription mechanics**
4. **Automated payment rails**
5. **Full adaptive personalisation.** Expensive, and mostly redundant against the signup questions
6. **Cohort format.** Cheaper per learner and adds social accountability, which is the strongest known lever on completion. Worth reaching for if solo completion disappoints
7. **Native app**

---

## 18. The metric that decides everything

**Course completion rate. What fraction of learners reach session 12.**

Track it **by session number**, not just at the endpoint. Where people stop tells you what is broken:

* Cliff at session 1 or 2: the product does not deliver what the placement promised
* Cliff at session 4 to 6: content is too hard, too easy, or too boring
* Cliff at 7 to 9: the deadline is not real enough to them
* No cliff, just drift: the format itself is wrong, and the deadline bet has failed

Secondary, in order: does the before-and-after clip sound different to a neutral listener; free-session-to-paid conversion; 17 course sales in a month, which is the 200-dollar target; measured cost per session against the BRD table.

---

## 19. Open questions

| # | Question | Blocks | Owner |
|---|---|---|---|
| O-1 | ~~Course price~~ **Resolved by D-042: $25/month subscription** | ~~Landing page, all marketing~~ | ~~Ten interviews~~ |
| O-2 | Distribution: how an adult finds this | Everything post-launch | Undiscussed. Most dangerous open item |
| O-3 | Payment rails beyond manual transfer | Scaling revenue | Open since the kids product |
| O-4 | Myanmar or Thailand as the beachhead | Pricing, channel, payment | |
| O-5 | Whether automatic placement from conversation is reliable | Scaling onboarding | 50 manual placements first |
| O-6 | Viber and Messenger business messaging feasibility | Notification channel | Verify before promising |
| O-7 | Authoring hours for 12 units | Launch date | Estimate this week |
| O-8 | Does the pack-shaped first month produce month-2 renewal (see D-042) | The core bet | Cohort 1 |
| O-9 | **Product name.** May is the tutor character. The product is unnamed | Landing page, all marketing copy, domain | |
| O-10 | Refund policy for the first billing cycle (R-PY-6) | Billing terms, T&Cs, first paid signup | Founder call |
