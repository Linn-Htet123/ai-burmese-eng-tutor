import { describe, expect, it } from "vitest";
import { originAllowed } from "./origin.ts";

describe("origin allowlist", () => {
  it("allows everything when unset (local dev)", () => {
    expect(originAllowed(undefined, [])).toBe(true);
  });
  it("only allows listed origins when set", () => {
    const list = ["https://may.example"];
    expect(originAllowed("https://may.example", list)).toBe(true);
    expect(originAllowed("https://evil.example", list)).toBe(false);
    expect(originAllowed(undefined, list)).toBe(false);
  });
});
