import { describe, expect, it } from "vitest";
import type { SessionStats } from "../processor/grade.ts";
import { buildJudgeGraph } from "./graph.ts";
import { judgeLevel } from "./rules.ts";

const s = (o: Partial<SessionStats>): SessionStats => ({ itemsAttempted: 10, fluentFirstAttemptRate: 0.8, avgStallSeconds: 2, stepDowns: 0, stalls: 0, ...o });

describe("level judge rules", () => {
  it("promotes when all three R-LV-8 criteria hold across three sessions", () => {
    expect(judgeLevel("beginner", [s({}), s({}), s({})]).move).toBe("promote");
  });
  it("holds when any criterion fails or fewer than three sessions", () => {
    expect(judgeLevel("beginner", [s({}), s({})]).move).toBe("hold");
    expect(judgeLevel("beginner", [s({ avgStallSeconds: 6 }), s({}), s({})]).move).toBe("hold");
    expect(judgeLevel("beginner", [s({ stepDowns: 1 }), s({}), s({})]).move).toBe("hold");
    expect(judgeLevel("beginner", [s({ fluentFirstAttemptRate: 0.5 }), s({}), s({})]).move).toBe("hold");
  });
  it("demotes after two consecutive sessions with three step-downs (R-LV-9)", () => {
    const v = judgeLevel("middle", [s({ stepDowns: 3 }), s({ stepDowns: 4 }), s({})]);
    expect(v).toMatchObject({ move: "demote", to: "beginner" });
  });
  it("never moves more than one step and clamps at the ends (R-LV-10)", () => {
    expect(judgeLevel("advanced", [s({}), s({}), s({})])).toMatchObject({ move: "hold", to: "advanced" });
    expect(judgeLevel("beginner", [s({ stepDowns: 3 }), s({ stepDowns: 3 })])).toMatchObject({ move: "hold", to: "beginner" });
  });
});

describe("judge graph", () => {
  it("writes a notice and applies the level only on a move", async () => {
    const applied: string[] = [];
    const g = buildJudgeGraph({
      loadLevel: async () => "beginner",
      loadRecentStats: async () => [s({}), s({}), s({})],
      writeNotice: async () => "တိုးတက်လာပါပြီ",
      applyLevel: async (_l, to) => { applied.push(to); },
    });
    const out = await g.invoke({ learnerId: "L1" });
    expect(out.noticeMy).toBe("တိုးတက်လာပါပြီ");
    expect(applied).toEqual(["middle"]);

    const hold = buildJudgeGraph({
      loadLevel: async () => "beginner",
      loadRecentStats: async () => [s({})],
      writeNotice: async () => { throw new Error("must not be called"); },
      applyLevel: async () => { throw new Error("must not be called"); },
    });
    const out2 = await hold.invoke({ learnerId: "L1" });
    expect(out2.noticeMy).toBeUndefined();
  });
});
