import type { Level } from "@may/shared";
import { levelDown, levelUp } from "@may/shared";
import type { SessionStats } from "../processor/grade.ts";

export type Verdict = { move: "promote" | "demote" | "hold"; to: Level; reason: string };

/** R-LV-8 thresholds, exactly as written. */
export const PROMOTE_FLUENT_FIRST_RATE = 0.7;
export const PROMOTE_MAX_AVG_STALL_S = 3;
/** R-LV-9: two consecutive sessions with three or more step-downs. */
export const DEMOTE_STEP_DOWNS = 3;

/**
 * Pure code, never AI mood (doc 04 §5). `recent` is newest first.
 * Routing pattern (book ch. 2) with a rule-based router: the LLM only writes the announcement.
 */
export function judgeLevel(current: Level, recent: readonly SessionStats[]): Verdict {
  const [s0, s1] = recent;
  if (s0 && s1 && s0.stepDowns >= DEMOTE_STEP_DOWNS && s1.stepDowns >= DEMOTE_STEP_DOWNS) {
    const to = levelDown(current);
    return to === current
      ? { move: "hold", to, reason: "demotion criteria met but already at the first level" }
      : { move: "demote", to, reason: `two consecutive sessions with ≥${DEMOTE_STEP_DOWNS} step-downs (R-LV-9)` };
  }
  if (recent.length >= 3) {
    const last3 = recent.slice(0, 3);
    const attempted = last3.reduce((a, s) => a + s.itemsAttempted, 0);
    const fluentFirst = last3.reduce((a, s) => a + s.fluentFirstAttemptRate * s.itemsAttempted, 0);
    const rate = attempted ? fluentFirst / attempted : 0;
    const avgStall = last3.reduce((a, s) => a + s.avgStallSeconds, 0) / 3;
    const stepDowns = last3.reduce((a, s) => a + s.stepDowns, 0);
    if (rate > PROMOTE_FLUENT_FIRST_RATE && avgStall < PROMOTE_MAX_AVG_STALL_S && stepDowns === 0) {
      const to = levelUp(current);
      return to === current
        ? { move: "hold", to, reason: "promotion criteria met but already at the top level" }
        : { move: "promote", to, reason: `fluent-first ${(rate * 100).toFixed(0)}%, avg stall ${avgStall.toFixed(1)}s, no step-downs over 3 sessions (R-LV-8)` };
    }
  }
  return { move: "hold", to: current, reason: "criteria not met" };
}
