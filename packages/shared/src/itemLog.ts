import { z } from "zod";
import { DeliverySchema } from "./items.ts";

/**
 * The item log (D-011): May reports what she is doing through function calls while she talks.
 * One zod schema per tool is the single source of truth — the Gemini function declarations
 * are generated from these with z.toJSONSchema, and the guard validates incoming calls with them.
 *
 * Upgrade loop steps (PRD §7.1): S1 learner speaks · S2 May listens to the end (R-UL-4) ·
 * S3 acknowledge something specific (R-UL-1/2) · S4 exactly one upgrade (R-UL-3) ·
 * S5 ask for the repeat, once (R-UL-5) · S6 learner repeats · S7 log and move on.
 */
export const ItemLogTools = {
  log_acknowledge: z.object({
    item_id: z.string().describe("The item being practised, from the stage plan."),
    quoted: z
      .string()
      .describe("The exact words of the learner you named as good. Never generic praise."),
  }),
  offer_upgrade: z.object({
    item_id: z.string(),
    learner_said: z.string().describe("What the learner actually said, verbatim."),
    better_line: z.string().describe("The ONE better phrasing. Same meaning, better words."),
    reason_my: z.string().describe("One short Burmese sentence saying why it is better."),
    source: z.enum(["pool", "invented"]).describe("pool if taken from the stage's upgrade pool."),
    pool_id: z.string().optional().describe("The pool entry id when source is pool."),
  }),
  request_repeat: z.object({
    item_id: z.string(),
  }),
  log_repeat_result: z.object({
    item_id: z.string(),
    delivery: DeliverySchema.describe("fluent = smooth first try; hesitant = got there with effort; failed = did not produce it."),
    stall_seconds: z.number().min(0).optional().describe("Longest pause before the learner answered."),
  }),
  log_item_done: z.object({
    item_id: z.string(),
  }),
  log_stall: z.object({
    seconds: z.number().min(0).describe("How long the learner has been silent."),
  }),
  log_step_down: z.object({
    item_id: z.string(),
    to_item_id: z.string().describe("The easier item you retreated to (R-FA-1)."),
  }),
  stage_wrap_ready: z.object({
    note: z.string().describe("One line of handover for the next stage: what happened, what to carry."),
  }),
} as const;

export type ItemLogToolName = keyof typeof ItemLogTools;
export const ITEM_LOG_TOOL_NAMES = Object.keys(ItemLogTools) as ItemLogToolName[];

export type ItemLogArgs<N extends ItemLogToolName> = z.infer<(typeof ItemLogTools)[N]>;

/** One appended event. item_log_events is append-only truth (D-049). */
export const ItemLogEventSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  stage: z.string(),
  at: z.string().datetime(),
  /** Milliseconds since the stage opened; cheap to diff for timing stats. */
  tMs: z.number().int().min(0),
  tool: z.enum(ITEM_LOG_TOOL_NAMES as [ItemLogToolName, ...ItemLogToolName[]]),
  args: z.record(z.string(), z.unknown()),
  /** What the gate answered (Tool Use Restriction guardrail). */
  gate: z.enum(["allowed", "blocked"]).default("allowed"),
  gateReason: z.string().optional(),
});
export type ItemLogEvent = z.infer<typeof ItemLogEventSchema>;

const TOOL_DESCRIPTIONS: Record<ItemLogToolName, string> = {
  log_acknowledge:
    "Call right after you name something specific the learner did well (step S3). Required before any upgrade.",
  offer_upgrade:
    "Call when you offer the one better line (step S4). Wait for the response: if it says blocked, do not say the upgrade; follow the instruction in the response instead.",
  request_repeat: "Call when you ask the learner to say the better line back (step S5). Ask once only.",
  log_repeat_result: "Call after the learner's repeat attempt, grading delivery not correctness (step S6).",
  log_item_done: "Call when you move on from an item (step S7).",
  log_stall: "Call when the learner has been silent for 5 seconds or more, before you offer a filler (R-FA-4).",
  log_step_down: "Call when you stop drilling an item after three failures and retreat to an easier one.",
  stage_wrap_ready: "Call when you have reached a natural end for this stage and are ready to hand over.",
};

/** Gemini `FunctionDeclaration[]` built from the zod schemas. */
export function itemLogFunctionDeclarations(): Array<{
  name: string;
  description: string;
  parametersJsonSchema: unknown;
}> {
  return ITEM_LOG_TOOL_NAMES.map((name) => ({
    name,
    description: TOOL_DESCRIPTIONS[name],
    parametersJsonSchema: stripSchemaMeta(z.toJSONSchema(ItemLogTools[name])),
  }));
}

function stripSchemaMeta(schema: unknown): unknown {
  if (schema && typeof schema === "object") {
    const copy = { ...(schema as Record<string, unknown>) };
    delete copy["$schema"];
    delete copy["additionalProperties"];
    return copy;
  }
  return schema;
}
