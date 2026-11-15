import { describe, expect, it } from "vitest";
import type { ItemLogEvent, ReviewItem, SessionPlan } from "@may/shared";
import { computeStats, gradeItems, nextSchedule } from "./grade.ts";
import { buildProcessorGraph } from "./graph.ts";

let n = 0;
const ev = (tool: ItemLogEvent["tool"], args: Record<string, unknown>, gate: "allowed" | "blocked" = "allowed"): ItemLogEvent => ({
  id: `e${(n += 1)}`, sessionId: "S1", stage: "phrase", at: new Date(0).toISOString(), tMs: n * 1000, tool, args, gate,
});
const item = (id: string, intervalStage = 0): ReviewItem => ({ id, kind: "phrase", target: `t-${id}`, intervalStage, nextReviewAt: null, lastDelivery: null, timesSeen: 0 });

const plan: SessionPlan = {
  sessionId: "S1", learnerId: "L1", level: "middle", lengthMinutes: 20, topic: "football", type: "normal", burmeseRatio: 0.35,
  recapFromLast: [], createdAt: new Date(0).toISOString(),
  stages: [
    { kind: "greeting", budgetMinutes: 1, openingLineMy: "မင်္ဂလာပါ", items: [], prompts: [], pool: [] },
    { kind: "review", budgetMinutes: 3, openingLineMy: "မင်္ဂလာပါ", items: [item("i1", 1)], prompts: [], pool: [] },
    { kind: "phrase", budgetMinutes: 5, openingLineMy: "မင်္ဂလာပါ", items: [item("i2"), item("i3")], prompts: [], pool: [] },
    { kind: "talk", budgetMinutes: 8, openingLineMy: "မင်္ဂလာပါ", items: [], prompts: ["a", "b"], pool: [] },
    { kind: "recap", budgetMinutes: 3, openingLineMy: "မင်္ဂလာပါ", items: [], prompts: [], pool: [] },
  ],
};

const events: ItemLogEvent[] = [
  ev("log_acknowledge", { item_id: "i1", quoted: "x" }),
  ev("offer_upgrade", { item_id: "i1", learner_said: "I did the project", better_line: "I ran the project", reason_my: "…", source: "pool", pool_id: "p1" }),
  ev("log_repeat_result", { item_id: "i1", delivery: "hesitant", stall_seconds: 4 }),
  ev("log_repeat_result", { item_id: "i1", delivery: "fluent" }),
  ev("offer_upgrade", { item_id: "i2", learner_said: "a", better_line: "b", reason_my: "c", source: "invented" }),
  ev("log_repeat_result", { item_id: "i2", delivery: "failed" }),
  ev("offer_upgrade", { item_id: "i3", learner_said: "a", better_line: "blocked line", reason_my: "c", source: "pool" }, "blocked"),
  ev("log_stall", { seconds: 6 }),
  ev("log_step_down", { item_id: "i2", to_item_id: "e1" }),
];

describe("grading", () => {
  it("grades by last delivery, keeps first attempt, ignores blocked calls", () => {
    const g = gradeItems(events);
    const i1 = g.find((x) => x.itemId === "i1");
    expect(i1?.delivery).toBe("fluent");
    expect(i1?.firstAttempt).toBe("hesitant");
    expect(i1?.maxStallSeconds).toBe(4);
    expect(g.find((x) => x.itemId === "i3")).toBeUndefined();
    expect(g.find((x) => x.itemId === "i2")?.pendingReview).toBe(true);
  });
  it("spaces intervals per R-RV-3/4", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(nextSchedule({ intervalStage: 1 }, "fluent", now).intervalStage).toBe(2);
    expect(nextSchedule({ intervalStage: 1 }, "hesitant", now).intervalStage).toBe(1);
    const f = nextSchedule({ intervalStage: 3 }, "failed", now);
    expect(f.intervalStage).toBe(0);
    expect(f.nextReviewAt).toBe("2026-01-02T00:00:00.000Z");
    expect(nextSchedule({ intervalStage: 4 }, "fluent", now).intervalStage).toBe(4);
  });
  it("computes R-PR-5 stats", () => {
    const s = computeStats(events, gradeItems(events));
    expect(s.itemsAttempted).toBe(2);
    expect(s.fluentFirstAttemptRate).toBe(0);
    expect(s.stepDowns).toBe(1);
    expect(s.avgStallSeconds).toBe(5);
  });
});

describe("processor graph", () => {
  it("writes queue, recap and stats then marks complete; recap items return next session", async () => {
    const writes: string[] = [];
    let queued: ReviewItem[] = [];
    let pending: ReviewItem[] = [];
    let recapItems: ReviewItem[] = [];
    const g = buildProcessorGraph({
      loadSession: async () => ({ plan, events, queue: [item("i1", 1)] }),
      extractRecap: async () => ({ winMy: "ကောင်းတယ်", items: [{ itemId: "i1", whatHappenedMy: "a", whyItCostYouMy: "b", upgrade: "I ran the project" }] }),
      writeQueue: async (_s, q, p) => { writes.push("queue"); queued = q; pending = p; },
      writeRecap: async (_s, _r, items) => { writes.push("recap"); recapItems = items; },
      writeStats: async () => { writes.push("stats"); },
      markComplete: async () => { writes.push("complete"); },
      now: () => new Date("2026-01-01T00:00:00Z"),
    });
    const out = await g.invoke({ sessionId: "S1" }, { configurable: { thread_id: "S1" } });
    expect(out.complete).toBe(true);
    expect(writes).toEqual(["queue", "recap", "stats", "complete"]);
    expect(queued.map((q) => q.id)).toEqual(["i1"]);
    expect(queued[0]?.intervalStage).toBe(2);
    expect(queued[0]?.learnerSaid).toBe("I did the project");
    expect(pending.map((q) => q.id)).toEqual(["i2"]);
    expect(recapItems[0]?.nextReviewAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("resumes from the checkpoint after a crash without re-running the queue update", async () => {
    let queueWrites = 0;
    let failOnce = true;
    const deps = {
      loadSession: async () => ({ plan, events, queue: [] as ReviewItem[] }),
      extractRecap: async () => {
        if (failOnce) { failOnce = false; throw new Error("LLM down"); }
        return { winMy: "x", items: [] };
      },
      writeQueue: async () => { queueWrites += 1; },
      writeRecap: async () => {},
      writeStats: async () => {},
      markComplete: async () => {},
    };
    const g = buildProcessorGraph(deps);
    const cfg = { configurable: { thread_id: "S2" } };
    await expect(g.invoke({ sessionId: "S2" }, cfg)).rejects.toThrow("LLM down");
    const out = await g.invoke(null, cfg);
    expect(out.complete).toBe(true);
    expect(queueWrites).toBe(1);
  });
});
