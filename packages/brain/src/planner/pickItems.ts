import type { PoolEntry, ReviewItem, SessionLength, StageKind } from "@may/shared";
import { newItemCap, stageBudgets } from "@may/shared";

export interface PickInput {
  length: SessionLength;
  /** Last session's recap items: return unconditionally (R-RC-2/3). */
  recapFromLast: ReviewItem[];
  /** Items due today from the spaced-repetition queue, oldest first. */
  due: ReviewItem[];
  /** Fresh items for today's topic, authored. */
  fresh: ReviewItem[];
  pool: PoolEntry[];
  isReturnSession: boolean;
}

export interface PickedStages {
  kinds: StageKind[];
  itemsByStage: Record<StageKind, ReviewItem[]>;
  poolByStage: Record<StageKind, PoolEntry[]>;
}

/**
 * Pure selection (no LLM): review first (R-RV-7), recap items always, new items within cap (R-RV-6),
 * easier on a return session (R-FA-10). The LLM only writes words around these choices.
 */
export function pickItems(input: PickInput): PickedStages {
  const kinds = stageBudgets(input.length).map((b) => b.kind);
  const cap = newItemCap(input.length);
  const newCount = input.isReturnSession ? cap.min : cap.max;

  const seen = new Set<string>();
  const uniq = (xs: ReviewItem[]) => xs.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));

  const recap = uniq(input.recapFromLast.slice(0, 3));
  const dueBudget = input.length === 10 ? 3 : input.length === 20 ? 5 : 8;
  const due = uniq(input.due.slice(0, dueBudget));
  const fresh = uniq(input.fresh.slice(0, newCount));

  const empty = (): Record<StageKind, ReviewItem[]> => ({ greeting: [], review: [], phrase: [], talk: [], recap: [] });
  const itemsByStage = empty();
  itemsByStage.review = [...recap, ...due];
  itemsByStage.phrase = fresh;
  itemsByStage.talk = kinds.includes("talk") ? [...fresh, ...recap] : [];
  itemsByStage.recap = [];

  const poolByStage: Record<StageKind, PoolEntry[]> = { greeting: [], review: [], phrase: [], talk: [], recap: [] };
  poolByStage.phrase = input.pool;
  poolByStage.talk = input.pool;
  poolByStage.review = input.pool;

  return { kinds, itemsByStage, poolByStage };
}
