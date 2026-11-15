import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { z } from "zod";
import type { Level, PoolEntry, ReviewItem, SessionLength, SessionPlan, StageKind } from "@may/shared";
import { BURMESE_RATIO, SessionPlanSchema, stageBudgets } from "@may/shared";
import { pickItems } from "./pickItems.ts";
import { validatePlan } from "./validate.ts";

/**
 * Planner — runs before each session (R-SE-1).
 * Patterns: Prompt Chaining (fetch → pick → compose → validate → save), Reflection
 * (compose is the Producer, validatePlan the Critic, bounded to MAX_ATTEMPTS),
 * Goal Setting & Monitoring (the goal is a plan that passes every PRD rule, checked in code).
 */

export interface LearnerSnapshot {
  learnerId: string;
  level: Level;
  topic: string;
  interests: string[];
  recapFromLast: ReviewItem[];
  due: ReviewItem[];
  fresh: ReviewItem[];
  pool: PoolEntry[];
  daysSinceLastSession: number | null;
}

/** What the LLM is asked to write: only words, never which items or how long. */
export const ComposedWordsSchema = z.object({
  openingLines: z.record(z.string(), z.string()).describe("Burmese opening line per stage kind."),
  talkPrompts: z.array(z.string()).min(2).max(6).describe("English conversation prompts for the talk stage."),
});
export type ComposedWords = z.infer<typeof ComposedWordsSchema>;

export interface ComposeRequest {
  level: Level;
  topic: string;
  interests: string[];
  stageKinds: StageKind[];
  critique: string[];
  isReturnSession: boolean;
}

export interface PlannerDeps {
  loadLearner: (learnerId: string) => Promise<LearnerSnapshot>;
  compose: (req: ComposeRequest) => Promise<ComposedWords>;
  savePlan: (plan: SessionPlan) => Promise<void>;
  now?: () => Date;
  newId?: () => string;
}

export const MAX_ATTEMPTS = 3;

const PlannerState = new StateSchema({
  learnerId: z.string(),
  length: z.union([z.literal(10), z.literal(20), z.literal(40)]),
  snapshot: z.custom<LearnerSnapshot>().optional(),
  picked: z.custom<ReturnType<typeof pickItems>>().optional(),
  words: z.custom<ComposedWords>().optional(),
  plan: z.custom<SessionPlan>().optional(),
  errors: z.array(z.string()).default(() => []),
  attempts: z.number().default(0),
});
export type PlannerStateType = typeof PlannerState.State;

export function buildPlannerGraph(deps: PlannerDeps) {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? (() => crypto.randomUUID());

  const fetchData: typeof PlannerState.Node = async (s) => ({ snapshot: await deps.loadLearner(s.learnerId) });

  const pick: typeof PlannerState.Node = (s) => {
    const snap = must(s.snapshot, "snapshot");
    const isReturnSession = (snap.daysSinceLastSession ?? 0) >= 7;
    return {
      picked: pickItems({
        length: s.length as SessionLength,
        recapFromLast: snap.recapFromLast,
        due: snap.due,
        fresh: snap.fresh,
        pool: snap.pool,
        isReturnSession,
      }),
    };
  };

  const compose: typeof PlannerState.Node = async (s) => {
    const snap = must(s.snapshot, "snapshot");
    const picked = must(s.picked, "picked");
    const words = await deps.compose({
      level: snap.level,
      topic: snap.topic,
      interests: snap.interests,
      stageKinds: picked.kinds,
      critique: s.errors,
      isReturnSession: (snap.daysSinceLastSession ?? 0) >= 7,
    });
    return { words, attempts: s.attempts + 1 };
  };

  const assemble: typeof PlannerState.Node = (s) => {
    const snap = must(s.snapshot, "snapshot");
    const picked = must(s.picked, "picked");
    const words = must(s.words, "words");
    const length = s.length as SessionLength;
    const budgets = stageBudgets(length);
    const plan: SessionPlan = {
      sessionId: newId(),
      learnerId: snap.learnerId,
      level: snap.level,
      lengthMinutes: length,
      topic: snap.topic,
      type: (snap.daysSinceLastSession ?? 0) >= 7 ? "return" : "normal",
      burmeseRatio: BURMESE_RATIO[snap.level],
      recapFromLast: snap.recapFromLast.slice(0, 3),
      stages: budgets.map((b) => ({
        kind: b.kind,
        budgetMinutes: b.minutes,
        openingLineMy: words.openingLines[b.kind] ?? "",
        items: picked.itemsByStage[b.kind],
        prompts: b.kind === "talk" ? words.talkPrompts : [],
        pool: picked.poolByStage[b.kind],
      })),
      createdAt: now().toISOString(),
    };
    return { plan, errors: validatePlan(plan, length) };
  };

  const save: typeof PlannerState.Node = async (s) => {
    const plan = SessionPlanSchema.parse(must(s.plan, "plan"));
    await deps.savePlan(plan);
    return {};
  };

  const route = (s: PlannerStateType): "save" | "compose" | typeof END => {
    if (s.errors.length === 0) return "save";
    if (s.attempts < MAX_ATTEMPTS) return "compose";
    return END; // give up: caller sees errors in final state and falls back (never improvise a session)
  };

  return new StateGraph(PlannerState)
    .addNode("fetch_data", fetchData)
    .addNode("pick_items", pick)
    .addNode("compose", compose)
    .addNode("assemble", assemble)
    .addNode("save", save)
    .addEdge(START, "fetch_data")
    .addEdge("fetch_data", "pick_items")
    .addEdge("pick_items", "compose")
    .addEdge("compose", "assemble")
    .addConditionalEdges("assemble", route, ["save", "compose", END])
    .addEdge("save", END)
    .compile();
}

function must<T>(v: T | undefined, name: string): T {
  if (v === undefined) throw new Error(`planner state missing ${name}`);
  return v;
}
