import { z } from "zod";
import { LevelSchema } from "./levels.ts";
import { SessionLengthSchema, StageKindSchema } from "./session.ts";
import { PoolEntrySchema, ReviewItemSchema } from "./items.ts";

/** What one stage needs to run in its own model context (R-SE-3). */
export const StagePlanSchema = z.object({
  kind: StageKindSchema,
  budgetMinutes: z.number().int().min(0),
  /** Burmese line May opens the stage with; cached TTS at runtime (D-046). */
  openingLineMy: z.string(),
  /** Items this stage practises. Empty for greeting. */
  items: z.array(ReviewItemSchema),
  /** Conversation prompts for the talk stage. */
  prompts: z.array(z.string()),
  /** The slice of the authored pool May may draw from in this stage (R-UL-8). */
  pool: z.array(PoolEntrySchema),
});
export type StagePlan = z.infer<typeof StagePlanSchema>;

/** R-SE-1: generated before the session, inspectable, never improvised end to end. */
export const SessionPlanSchema = z.object({
  sessionId: z.string(),
  learnerId: z.string(),
  level: LevelSchema,
  lengthMinutes: SessionLengthSchema,
  topic: z.string(),
  /** Session type: normal, review-heavy, or the easier return session (R-FA-10). */
  type: z.enum(["normal", "return", "placement"]),
  burmeseRatio: z.number().min(0).max(1),
  /** The three recap items from last session, returned unconditionally (R-RC-2/3). */
  recapFromLast: z.array(ReviewItemSchema).max(3),
  stages: z.array(StagePlanSchema).min(1),
  createdAt: z.string().datetime(),
});
export type SessionPlan = z.infer<typeof SessionPlanSchema>;
