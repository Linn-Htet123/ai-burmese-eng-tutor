import type { PoolEntry, ReviewItem, SessionLength, SessionPlan } from "@may/shared";
import { BURMESE_RATIO, stageBudgets } from "@may/shared";

/**
 * The week-one spike plan: one topic, three items, three pool entries, hand-written Burmese lines.
 * Replaced by the planner graph once there is a database; kept valid against validatePlan by test.
 */
const items: ReviewItem[] = [
  { id: "ph-let-me-think", kind: "filler", target: "Let me think for a second.", intervalStage: 0, nextReviewAt: null, lastDelivery: null, timesSeen: 0 },
  { id: "ph-responsible-for", kind: "collocation", target: "I'm responsible for managing the team.", learnerSaid: "I am responsible to manage the team", intervalStage: 0, nextReviewAt: null, lastDelivery: null, timesSeen: 0 },
  { id: "ph-mainly-because", kind: "upgrade", target: "Mainly because of time.", learnerSaid: "Because of many reasons, and also the time", intervalStage: 0, nextReviewAt: null, lastDelivery: null, timesSeen: 0 },
];

const pool: PoolEntry[] = [
  { id: "pool-ran-project", trigger: "I did the project", upgrade: "I ran the project", type: "verb_choice", glossMy: "\"ran\" က ဦးဆောင်ခဲ့တယ်ဆိုတဲ့ အဓိပ္ပာယ်ပါတယ်", tags: ["role"], levels: ["middle", "advanced"] },
  { id: "pool-decision", trigger: "I did a decision", upgrade: "I made a decision", type: "collocation", glossMy: "decision နဲ့ တွဲတဲ့ verb က make ပါ", tags: ["work"], levels: ["beginner", "middle"] },
  { id: "pool-watch-match", trigger: "I see the match", upgrade: "I watched the match", type: "verb_choice", glossMy: "ပွဲကြည့်တာကို watch လို့ သုံးပါတယ်", tags: ["football"], levels: ["beginner", "middle"] },
];

const openingLines: Record<string, string> = {
  greeting: "မင်္ဂလာပါ Thura။ ဒီနေ့ ဘောလုံးအကြောင်း ပြောကြမယ်နော်။",
  review: "မနေ့က စကားစု သုံးခုကို ပြန်ကြည့်ကြမယ်။",
  phrase: "ဒီနေ့ စကားစုအသစ်တွေ စမ်းကြည့်ရအောင်။",
  talk: "ကဲ၊ မနေ့ညက ပွဲအကြောင်း ပြောပြပါဦး။",
  recap: "ဒီနေ့ ကောင်းခဲ့တာလေးတွေ ပြန်ကြည့်ရအောင်။",
};

export function demoPlan(length: SessionLength = 20, sessionId = "demo"): SessionPlan {
  return {
    sessionId,
    learnerId: "demo-learner",
    level: "middle",
    lengthMinutes: length,
    topic: "football",
    type: "normal",
    burmeseRatio: BURMESE_RATIO.middle,
    recapFromLast: [items[0]!],
    createdAt: new Date().toISOString(),
    stages: stageBudgets(length).map((b) => ({
      kind: b.kind,
      budgetMinutes: b.minutes,
      openingLineMy: openingLines[b.kind] ?? "",
      items: b.kind === "review" ? [items[0]!] : b.kind === "phrase" || b.kind === "talk" ? items.slice(1) : [],
      prompts: b.kind === "talk" ? ["Who did you support when you were a kid, and why?", "Tell me about the last match you watched.", "Who is the best player in your team at work?"] : [],
      pool: b.kind === "greeting" || b.kind === "recap" ? [] : pool,
    })),
  };
}
