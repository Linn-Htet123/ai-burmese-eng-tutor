import type { Delivery, ItemLogEvent, ReviewItem } from "@may/shared";
import { REVIEW_INTERVALS_DAYS } from "@may/shared";

export interface ItemGrade {
  itemId: string;
  /** Final delivery for the session (last repeat result), R-RV-8. */
  delivery: Delivery;
  firstAttempt: Delivery;
  attempts: number;
  /** Longest stall recorded on this item, seconds. */
  maxStallSeconds: number;
  /** The upgrade was invented or unmatched: keep out of the queue until reviewed (R-UL-9). */
  pendingReview: boolean;
  learnerSaid?: string;
  betterLine?: string;
  reasonMy?: string;
}

/** Pure grading from the append-only item log. Replayable: a bug here is healed by re-running (D-049). */
export function gradeItems(events: readonly ItemLogEvent[]): ItemGrade[] {
  const byItem = new Map<string, ItemGrade>();
  const get = (id: string) => {
    let g = byItem.get(id);
    if (!g) {
      g = { itemId: id, delivery: "failed", firstAttempt: "failed", attempts: 0, maxStallSeconds: 0, pendingReview: false };
      byItem.set(id, g);
    }
    return g;
  };
  for (const e of events) {
    if (e.gate === "blocked") continue;
    const a = e.args as Record<string, unknown>;
    const id = typeof a["item_id"] === "string" ? (a["item_id"] as string) : undefined;
    switch (e.tool) {
      case "offer_upgrade": {
        if (!id) break;
        const g = get(id);
        g.learnerSaid = String(a["learner_said"] ?? "");
        g.betterLine = String(a["better_line"] ?? "");
        g.reasonMy = String(a["reason_my"] ?? "");
        if (a["source"] === "invented") g.pendingReview = true;
        break;
      }
      case "log_repeat_result": {
        if (!id) break;
        const g = get(id);
        const d = a["delivery"] as Delivery;
        if (g.attempts === 0) g.firstAttempt = d;
        g.attempts += 1;
        g.delivery = d;
        const stall = typeof a["stall_seconds"] === "number" ? (a["stall_seconds"] as number) : 0;
        g.maxStallSeconds = Math.max(g.maxStallSeconds, stall);
        break;
      }
      default:
        break;
    }
  }
  // Items that were only upgraded but never attempted are not graded (no evidence either way).
  return [...byItem.values()].filter((g) => g.attempts > 0);
}

/**
 * R-RV-3/4 spacing. fluent → next interval; hesitant → same interval again;
 * failed → reset to the first interval and come back next session.
 */
export function nextSchedule(item: Pick<ReviewItem, "intervalStage">, delivery: Delivery, now: Date): Pick<ReviewItem, "intervalStage" | "nextReviewAt"> {
  const last = REVIEW_INTERVALS_DAYS.length - 1;
  let stage: number;
  if (delivery === "fluent") stage = Math.min(item.intervalStage + 1, last);
  else if (delivery === "hesitant") stage = item.intervalStage;
  else stage = 0;
  const days = delivery === "failed" ? 1 : (REVIEW_INTERVALS_DAYS[stage] ?? 1);
  const next = new Date(now.getTime() + days * 86_400_000);
  return { intervalStage: stage, nextReviewAt: next.toISOString() };
}

export interface SessionStats {
  itemsAttempted: number;
  fluentFirstAttemptRate: number;
  avgStallSeconds: number;
  stepDowns: number;
  stalls: number;
}

/** R-PR-5 metrics the level judge reads (R-LV-8). */
export function computeStats(events: readonly ItemLogEvent[], grades: readonly ItemGrade[]): SessionStats {
  const stallEvents = events.filter((e) => e.tool === "log_stall").map((e) => Number((e.args as { seconds?: number }).seconds ?? 0));
  const itemStalls = grades.map((g) => g.maxStallSeconds).filter((s) => s > 0);
  const allStalls = [...stallEvents, ...itemStalls];
  const avg = allStalls.length ? allStalls.reduce((a, b) => a + b, 0) / allStalls.length : 0;
  const fluentFirst = grades.filter((g) => g.firstAttempt === "fluent").length;
  return {
    itemsAttempted: grades.length,
    fluentFirstAttemptRate: grades.length ? fluentFirst / grades.length : 0,
    avgStallSeconds: Number(avg.toFixed(2)),
    stepDowns: events.filter((e) => e.tool === "log_step_down").length,
    stalls: stallEvents.length,
  };
}
