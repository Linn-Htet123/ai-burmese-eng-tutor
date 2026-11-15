/**
 * The upgrade-loop rules the guard enforces (PRD §7, R-UL-1…9; R-FA-1/5).
 * Pattern: Guardrails / Safety (book ch. 18) — behavioural rules checked in code,
 * with Tool Use Restriction as the hard gate and a flag lane for everything else.
 */
export type RuleId =
  | "UL-1" // acknowledgement before upgrade
  | "UL-2" // acknowledgement must be specific
  | "UL-3" // exactly one upgrade per item
  | "UL-5" // repeat requested once, never twice; S5 required
  | "UL-8" // upgrade claimed from pool but id unknown
  | "UL-9" // invented upgrade: allowed, flagged, blocked from queue until review
  | "FA-1" // three failures: stop drilling, step down
  | "FA-5"; // three step-downs: level review

/** R-UL-2: generic praise is prohibited in acknowledgement position. Lower-cased, trimmed. */
export const GENERIC_PRAISE = [
  "good job",
  "well done",
  "great",
  "great job",
  "nice",
  "nice job",
  "excellent",
  "perfect",
  "good",
  "very good",
  "awesome",
  "amazing",
] as const;

export function isGenericPraise(quoted: string): boolean {
  const q = quoted.trim().toLowerCase().replace(/[.!,]+$/g, "");
  if (q.length === 0) return true;
  return (GENERIC_PRAISE as readonly string[]).includes(q);
}

export const MAX_UPGRADES_PER_ITEM = 1;
export const MAX_REPEAT_REQUESTS = 1;
export const FAILS_BEFORE_STEP_DOWN = 3;
export const STEP_DOWNS_FOR_LEVEL_REVIEW = 3;
