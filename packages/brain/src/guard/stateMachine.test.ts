import { describe, expect, it } from "vitest";
import type { PoolEntry } from "@may/shared";
import { applyToolCall, createGuardState, flagRatePer100Calls, type GuardState } from "./stateMachine.ts";

const pool: PoolEntry[] = [
  { id: "p1", trigger: "I did the project", upgrade: "I ran the project", type: "verb_choice", glossMy: "…", tags: [], levels: ["middle"] },
];
const ctx = { pool };

function run(state: GuardState, steps: Array<[string, unknown]>) {
  let s = state;
  const results = [];
  let t = 0;
  for (const [tool, args] of steps) {
    const r = applyToolCall(s, tool as never, args, (t += 1000), ctx);
    s = r.state;
    results.push(r);
  }
  return { state: s, results };
}

describe("guard: upgrade loop", () => {
  it("blocks an upgrade before acknowledgement (R-UL-1) and allows it after", () => {
    const { results } = run(createGuardState("phrase"), [
      ["offer_upgrade", { item_id: "i1", learner_said: "I did the project", better_line: "I ran the project", reason_my: "…", source: "pool", pool_id: "p1" }],
      ["log_acknowledge", { item_id: "i1", quoted: "I did the project" }],
      ["offer_upgrade", { item_id: "i1", learner_said: "I did the project", better_line: "I ran the project", reason_my: "…", source: "pool", pool_id: "p1" }],
    ]);
    expect(results[0]?.gate.allowed).toBe(false);
    expect(results[0]?.newFlags[0]?.rule).toBe("UL-1");
    expect(results[2]?.gate.allowed).toBe(true);
    expect(results[2]?.newFlags).toHaveLength(0);
  });

  it("blocks a second upgrade on the same item (R-UL-3)", () => {
    const up = { item_id: "i1", learner_said: "a", better_line: "b", reason_my: "c", source: "pool", pool_id: "p1" };
    const { results } = run(createGuardState("phrase"), [
      ["log_acknowledge", { item_id: "i1", quoted: "a" }],
      ["offer_upgrade", up],
      ["offer_upgrade", { ...up, better_line: "another" }],
    ]);
    expect(results[2]?.gate.allowed).toBe(false);
    expect(results[2]?.newFlags[0]?.rule).toBe("UL-3");
  });

  it("flags generic praise but lets it through with a nudge (R-UL-2)", () => {
    const { results } = run(createGuardState("phrase"), [["log_acknowledge", { item_id: "i1", quoted: "Good job!" }]]);
    expect(results[0]?.gate.allowed).toBe(true);
    expect(results[0]?.newFlags[0]?.rule).toBe("UL-2");
    expect(results[0]?.nudge).toContain("generic");
  });

  it("blocks the second repeat request (R-UL-5)", () => {
    const { results } = run(createGuardState("phrase"), [
      ["log_acknowledge", { item_id: "i1", quoted: "a" }],
      ["offer_upgrade", { item_id: "i1", learner_said: "a", better_line: "b", reason_my: "c", source: "pool", pool_id: "p1" }],
      ["request_repeat", { item_id: "i1" }],
      ["request_repeat", { item_id: "i1" }],
    ]);
    expect(results[2]?.gate.allowed).toBe(true);
    expect(results[3]?.gate.allowed).toBe(false);
  });

  it("marks invented and unknown-pool upgrades for review (R-UL-8/9) without blocking", () => {
    const { state, results } = run(createGuardState("phrase"), [
      ["log_acknowledge", { item_id: "i1", quoted: "a" }],
      ["offer_upgrade", { item_id: "i1", learner_said: "a", better_line: "b", reason_my: "c", source: "invented" }],
      ["log_acknowledge", { item_id: "i2", quoted: "a" }],
      ["offer_upgrade", { item_id: "i2", learner_said: "a", better_line: "b", reason_my: "c", source: "pool", pool_id: "nope" }],
    ]);
    expect(results[1]?.gate.allowed).toBe(true);
    expect(results[1]?.newFlags[0]?.rule).toBe("UL-9");
    expect(results[3]?.newFlags[0]?.rule).toBe("UL-8");
    expect(state.items["i1"]?.pendingReview).toBe(true);
    expect(state.items["i2"]?.pendingReview).toBe(true);
  });

  it("nudges a step-down after three failures (R-FA-1) and triggers level review at three step-downs (R-FA-5)", () => {
    const fail = (id: string) => ["log_repeat_result", { item_id: id, delivery: "failed" }] as [string, unknown];
    const { state, results } = run(createGuardState("phrase"), [
      fail("i1"), fail("i1"), fail("i1"),
      ["log_step_down", { item_id: "i1", to_item_id: "e1" }],
      ["log_step_down", { item_id: "i2", to_item_id: "e2" }],
      ["log_step_down", { item_id: "i3", to_item_id: "e3" }],
    ]);
    expect(results[2]?.nudge).toContain("Stop drilling");
    expect(results[2]?.newFlags[0]?.rule).toBe("FA-1");
    expect(state.levelReviewTriggered).toBe(true);
    expect(state.flags.some((f) => f.rule === "FA-5")).toBe(true);
  });

  it("blocks malformed calls instead of throwing", () => {
    const r = applyToolCall(createGuardState("phrase"), "offer_upgrade", { item_id: 1 }, 0, ctx);
    expect(r.gate.allowed).toBe(false);
    expect(r.gate.instruction).toContain("Malformed");
  });

  it("computes the flag rate per 100 calls", () => {
    const { state } = run(createGuardState("phrase"), [
      ["log_acknowledge", { item_id: "i1", quoted: "nice" }],
      ["log_acknowledge", { item_id: "i2", quoted: "I ran the project" }],
    ]);
    expect(flagRatePer100Calls(state)).toBe(50);
  });

  it("does not mutate the previous state", () => {
    const s0 = createGuardState("phrase");
    applyToolCall(s0, "log_stall", { seconds: 6 }, 0, ctx);
    expect(s0.stalls).toBe(0);
    expect(s0.toolCalls).toBe(0);
  });
});
