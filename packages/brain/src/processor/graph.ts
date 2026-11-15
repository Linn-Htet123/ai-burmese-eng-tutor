import { END, MemorySaver, START, StateGraph, StateSchema, type BaseCheckpointSaver } from "@langchain/langgraph";
import { z } from "zod";
import type { ItemLogEvent, ReviewItem, SessionPlan } from "@may/shared";
import { computeStats, gradeItems, nextSchedule, type ItemGrade, type SessionStats } from "./grade.ts";

/**
 * Processor — runs at session end (R-SE-10).
 * Patterns: Prompt Chaining with a checkpointer so a crash resumes instead of re-running the
 * queue update (Exception Handling & Recovery, book ch. 12); Memory Management (writes long-term
 * memory); the one LLM step is recap extraction (R-RC-1: up to three, a cap not a quota).
 */

export const RecapItemSchema = z.object({
  itemId: z.string(),
  whatHappenedMy: z.string(),
  whyItCostYouMy: z.string(),
  upgrade: z.string(),
});
export const RecapSchema = z.object({
  /** The visible win named explicitly (R-FA-2). */
  winMy: z.string(),
  items: z.array(RecapItemSchema).max(3),
});
export type Recap = z.infer<typeof RecapSchema>;

export interface ProcessorDeps {
  loadSession: (sessionId: string) => Promise<{ plan: SessionPlan; events: ItemLogEvent[]; queue: ReviewItem[] }>;
  extractRecap: (input: { plan: SessionPlan; grades: ItemGrade[] }) => Promise<Recap>;
  writeQueue: (sessionId: string, items: ReviewItem[], pendingReview: ReviewItem[]) => Promise<void>;
  writeRecap: (sessionId: string, recap: Recap, recapItems: ReviewItem[]) => Promise<void>;
  writeStats: (sessionId: string, stats: SessionStats) => Promise<void>;
  markComplete: (sessionId: string) => Promise<void>;
  now?: () => Date;
  checkpointer?: BaseCheckpointSaver;
}

const ProcessorState = new StateSchema({
  sessionId: z.string(),
  plan: z.custom<SessionPlan>().optional(),
  events: z.custom<ItemLogEvent[]>().optional(),
  queue: z.custom<ReviewItem[]>().optional(),
  grades: z.custom<ItemGrade[]>().optional(),
  updatedQueue: z.custom<ReviewItem[]>().optional(),
  pendingReview: z.custom<ReviewItem[]>().optional(),
  recap: z.custom<Recap>().optional(),
  recapItems: z.custom<ReviewItem[]>().optional(),
  stats: z.custom<SessionStats>().optional(),
  complete: z.boolean().default(false),
});

export function buildProcessorGraph(deps: ProcessorDeps) {
  const now = deps.now ?? (() => new Date());

  const gather: typeof ProcessorState.Node = async (s) => {
    const { plan, events, queue } = await deps.loadSession(s.sessionId);
    return { plan, events, queue };
  };

  const grade: typeof ProcessorState.Node = (s) => ({ grades: gradeItems(s.events ?? []) });

  const updateQueue: typeof ProcessorState.Node = async (s) => {
    const plan = must(s.plan, "plan");
    const queue = s.queue ?? [];
    const grades = s.grades ?? [];
    const known = new Map<string, ReviewItem>(queue.map((q) => [q.id, q]));
    for (const st of plan.stages) for (const it of st.items) if (!known.has(it.id)) known.set(it.id, it);

    const updated: ReviewItem[] = [];
    const pending: ReviewItem[] = [];
    for (const g of grades) {
      const base: ReviewItem = known.get(g.itemId) ?? {
        id: g.itemId, kind: "upgrade", target: g.betterLine ?? "", intervalStage: 0, nextReviewAt: null, lastDelivery: null, timesSeen: 0,
      };
      const next: ReviewItem = {
        ...base,
        ...(g.learnerSaid ? { learnerSaid: g.learnerSaid } : {}),
        ...(g.betterLine ? { target: g.betterLine } : {}),
        ...(g.reasonMy ? { reasonMy: g.reasonMy } : {}),
        ...nextSchedule(base, g.delivery, now()),
        lastDelivery: g.delivery,
        timesSeen: base.timesSeen + 1,
      };
      (g.pendingReview ? pending : updated).push(next);
    }
    await deps.writeQueue(s.sessionId, updated, pending);
    return { updatedQueue: updated, pendingReview: pending };
  };

  const extractRecap: typeof ProcessorState.Node = async (s) => {
    const plan = must(s.plan, "plan");
    const grades = s.grades ?? [];
    const recap = RecapSchema.parse(await deps.extractRecap({ plan, grades }));
    // R-RC-2: every recap item returns next session, unconditionally — even a fluent one.
    const nextSession = new Date(now().getTime() + 86_400_000).toISOString();
    const pool = new Map((s.updatedQueue ?? []).map((q) => [q.id, q]));
    const recapItems: ReviewItem[] = recap.items
      .map((r) => pool.get(r.itemId))
      .filter((x): x is ReviewItem => Boolean(x))
      .map((q) => ({ ...q, nextReviewAt: nextSession }));
    await deps.writeRecap(s.sessionId, recap, recapItems);
    return { recap, recapItems };
  };

  const stats: typeof ProcessorState.Node = async (s) => {
    const st = computeStats(s.events ?? [], s.grades ?? []);
    await deps.writeStats(s.sessionId, st);
    return { stats: st };
  };

  const complete: typeof ProcessorState.Node = async (s) => {
    // R-SE-10: complete only when all artefacts exist.
    if (!s.updatedQueue || !s.recap || !s.stats) throw new Error("processor: artefacts missing, refusing to mark complete");
    await deps.markComplete(s.sessionId);
    return { complete: true };
  };

  return new StateGraph(ProcessorState)
    .addNode("gather", gather)
    .addNode("grade_items", grade)
    .addNode("update_queue", updateQueue)
    .addNode("extract_recap", extractRecap)
    .addNode("compute_stats", stats)
    .addNode("mark_complete", complete)
    .addEdge(START, "gather")
    .addEdge("gather", "grade_items")
    .addEdge("grade_items", "update_queue")
    .addEdge("update_queue", "extract_recap")
    .addEdge("extract_recap", "compute_stats")
    .addEdge("compute_stats", "mark_complete")
    .addEdge("mark_complete", END)
    .compile({ checkpointer: deps.checkpointer ?? new MemorySaver() });
}

function must<T>(v: T | undefined, name: string): T {
  if (v === undefined) throw new Error(`processor state missing ${name}`);
  return v;
}
