import { describe, expect, it } from "vitest";
import { COPY, toMyDigits } from "./copy";

function allStrings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (typeof v === "function") return [String((v as (n: number | string) => string)(7)), String((v as (n: string) => string)("X"))];
  if (v && typeof v === "object") return Object.values(v).flatMap(allStrings);
  return [];
}

describe("copy", () => {
  it("never uses failure language in either language (R-FA-6 string audit)", () => {
    const banned = [/\bwrong\b/i, /\bfail(ed)?\b/i, /\bmistake/i, /\bincorrect\b/i, /မှား/];
    for (const s of allStrings(COPY)) for (const b of banned) expect(s, s).not.toMatch(b);
  });
  it("has the same keys in Burmese and English", () => {
    expect(Object.keys(COPY.en).sort()).toEqual(Object.keys(COPY.my).sort());
  });
  it("keeps Burmese copy in Burmese script and Latin-only stage names in English", () => {
    for (const s of Object.values(COPY.my.stage)) expect(s).toMatch(/[က-႟]/);
    for (const s of Object.values(COPY.en.stage)) expect(s).not.toMatch(/[က-႟]/);
  });
  it("renders Burmese digits", () => {
    expect(toMyDigits(40)).toBe("၄၀");
  });
});
