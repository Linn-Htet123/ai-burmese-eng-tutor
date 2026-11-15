import { describe, expect, it } from "vitest";
import type { ReviewItem, SessionPlan } from "@may/shared";
import { MAX_ATTEMPTS, buildPlannerGraph, type ComposeRequest, type LearnerSnapshot } from "./graph.ts";
import { pickItems } from "./pickItems.ts";
import { validatePlan } from "./validate.ts";

const item = (id: string, target = `phrase ${id}`): ReviewItem => ({
  id, kind: "phrase", target, intervalStage: 0, nextReviewAt: null, lastDelivery: null, timesSeen: 0,
});

const snapshot: LearnerSnapshot = {
  learnerId: "L1",
  level: "middle",
  topic: "football",
  interests: ["football"],
  recapFromLast: [item("r1"), item("r2"), item("r3")],
  due: Array.from({ length: 12 }, (_, i) => item(`d${i}`)),
  fresh: Array.from({ length: 20 }, (_, i) => item(`f${i}`)),
  pool: [],
  daysSinceLastSession: 1,
};

const goodWords = (req: ComposeRequest) => ({
  openingLines: Object.fromEntries(req.stageKinds.map((k) => [k, `မင်္ဂလာပါ ${k}`])),
  talkPrompts: ["What did you watch last weekend?", "Who do you support, and why?"],
});

describe("pickItems", () => {
  it("returns recap items unconditionally and caps new items (R-RC-2, R-RV-6)", () => {
    const p = pickItems({ length: 40, recapFromLast: snapshot.recapFromLast, due: snapshot.due, fresh: snapshot.fresh, pool: [], isReturnSession: false });
    expect(p.itemsByStage.review.slice(0, 3).map((i) => i.id)).toEqual(["r1", "r2", "r3"]);
    expect(p.itemsByStage.phrase).toHaveLength(12);
  });
  it("goes easy on a return session and drops talk at 10 minutes (R-FA-10)", () => {
    const p = pickItems({ length: 10, recapFromLast: [], due: snapshot.due, fresh: snapshot.fresh, pool: [], isReturnSession: true });
    expect(p.itemsByStage.phrase).toHaveLength(1);
    expect(p.kinds).not.toContain("talk");
    expect(p.itemsByStage.talk).toHaveLength(0);
  });
});

describe("planner graph", () => {
  it("produces a valid plan and saves it", async () => {
    const saved: SessionPlan[] = [];
    const g = buildPlannerGraph({
      loadLearner: async () => snapshot,
      compose: async (req) => goodWords(req),
      savePlan: async (p) => { saved.push(p); },
      newId: () => "S1",
    });
    const out = await g.invoke({ learnerId: "L1", length: 40 });
    expect(out.errors).toEqual([]);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.stages.map((s) => s.kind)).toEqual(["greeting", "review", "phrase", "talk", "recap"]);
    expect(validatePlan(saved[0], 40)).toEqual([]);
    expect(saved[0]?.recapFromLast.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
  });

  it("feeds the critique back to compose and succeeds on retry (reflection loop)", async () => {
    const calls: ComposeRequest[] = [];
    const g = buildPlannerGraph({
      loadLearner: async () => snapshot,
      compose: async (req) => {
        calls.push(req);
        if (calls.length === 1) return { openingLines: { greeting: "Hello, no mistake" }, talkPrompts: ["one"] as unknown as [string, string] };
        return goodWords(req);
      },
      savePlan: async () => {},
    });
    const out = await g.invoke({ learnerId: "L1", length: 20 });
    expect(out.errors).toEqual([]);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.critique.length).toBeGreaterThan(0);
  });

  it("gives up after MAX_ATTEMPTS without saving (never improvise a session)", async () => {
    let saves = 0;
    const g = buildPlannerGraph({
      loadLearner: async () => snapshot,
      compose: async () => ({ openingLines: {}, talkPrompts: ["a", "b"] }),
      savePlan: async () => { saves += 1; },
    });
    const out = await g.invoke({ learnerId: "L1", length: 40 });
    expect(out.attempts).toBe(MAX_ATTEMPTS);
    expect(out.errors.length).toBeGreaterThan(0);
    expect(saves).toBe(0);
  });
});
