import { describe, expect, it } from "vitest";
import { ItemLogTools, itemLogFunctionDeclarations } from "./itemLog.ts";
import { levelDown, levelUp } from "./levels.ts";
import { stageBudgets } from "./session.ts";

describe("stage budgets", () => {
  it("sum to the chosen session length", () => {
    for (const len of [10, 20, 40] as const) {
      const total = stageBudgets(len).reduce((s, b) => s + b.minutes, 0);
      expect(total).toBe(len);
    }
  });
  it("always start with greeting and end with recap", () => {
    for (const len of [10, 20, 40] as const) {
      const b = stageBudgets(len);
      expect(b[0]?.kind).toBe("greeting");
      expect(b.at(-1)?.kind).toBe("recap");
    }
  });
});

describe("levels", () => {
  it("move one step and clamp at the ends (R-LV-10)", () => {
    expect(levelUp("beginner")).toBe("middle");
    expect(levelUp("advanced")).toBe("advanced");
    expect(levelDown("beginner")).toBe("beginner");
    expect(levelDown("advanced")).toBe("middle");
  });
});

describe("item log tools", () => {
  it("export one Gemini declaration per tool with an object schema", () => {
    const decls = itemLogFunctionDeclarations();
    expect(decls.map((d) => d.name).sort()).toEqual(Object.keys(ItemLogTools).sort());
    for (const d of decls) {
      const s = d.parametersJsonSchema as { type: string; properties: object };
      expect(s.type).toBe("object");
      expect(s.properties).toBeTruthy();
      expect("$schema" in s).toBe(false);
    }
  });
  it("reject an upgrade without a Burmese reason", () => {
    const r = ItemLogTools.offer_upgrade.safeParse({
      item_id: "x", learner_said: "a", better_line: "b", source: "pool",
    });
    expect(r.success).toBe(false);
  });
});
