import { describe, expect, it } from "vitest";
import { LONG_TERM_CAP, SHORT_TERM_CAP, buildLongTermChart, buildShortTermHandover } from "./handover.ts";

describe("handover notes", () => {
  it("keeps the newest notes when the short-term cap bites", () => {
    const notes = Array.from({ length: 30 }, (_, i) => `note ${i} ${"x".repeat(40)}`);
    const out = buildShortTermHandover(notes);
    expect(out.length).toBeLessThanOrEqual(SHORT_TERM_CAP);
    expect(out).toContain("note 29");
    expect(out).not.toContain("note 0 ");
  });
  it("caps the long-term chart and names the recap promise", () => {
    const out = buildLongTermChart({
      name: "Thura",
      level: "middle",
      interests: ["football", "cooking"],
      weakPoints: Array.from({ length: 50 }, (_, i) => `weak point number ${i}`),
      lastRecap: [{ id: "r1", kind: "phrase", target: "Let me think for a second", intervalStage: 0, nextReviewAt: null, lastDelivery: null, timesSeen: 1 }],
      profileFacts: [],
      daysSinceLastSession: 1,
    });
    expect(out.length).toBeLessThanOrEqual(LONG_TERM_CAP);
    expect(out).toContain("Last session's three");
  });
  it("tells May to go easy on a returning learner (R-FA-10)", () => {
    const out = buildLongTermChart({ name: "A", level: "beginner", interests: [], weakPoints: [], lastRecap: [], profileFacts: [], daysSinceLastSession: 9 });
    expect(out).toContain("Away 9 days");
  });
});
