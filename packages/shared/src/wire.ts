import { z } from "zod";
import { StageKindSchema } from "./session.ts";

/**
 * Browser ↔ voice gateway protocol over one WebSocket.
 * Binary frames are audio: PCM16 little-endian mono, 16 kHz up (mic), 24 kHz down (May).
 * Text frames are JSON messages below.
 */

/** May's visible state. Drives the three-state voice animation (change note, decision 6). */
export const MayStateSchema = z.enum(["listening", "thinking", "speaking"]);
export type MayState = z.infer<typeof MayStateSchema>;

export const ClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hello"), sessionId: z.string(), token: z.string().optional() }),
  /** Client-side VAD edge: the learner started or stopped talking. */
  z.object({ type: z.literal("vad"), speaking: z.boolean() }),
  z.object({ type: z.literal("control"), action: z.enum(["pause", "resume", "burmese", "end"]) }),
  /** Playback drained; lets the gateway time turn ends against what the learner actually heard. */
  z.object({ type: z.literal("playback_done") }),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export const UpgradeCardSchema = z.object({
  itemId: z.string(),
  learnerSaid: z.string(),
  betterLine: z.string(),
  reasonMy: z.string(),
  index: z.number().int().min(1),
  total: z.number().int().min(1),
});
export type UpgradeCard = z.infer<typeof UpgradeCardSchema>;

export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready"), sessionId: z.string(), stageCount: z.number().int() }),
  z.object({ type: z.literal("state"), value: MayStateSchema }),
  z.object({
    type: z.literal("stage"),
    kind: StageKindSchema,
    index: z.number().int(),
    total: z.number().int(),
    budgetMinutes: z.number(),
  }),
  z.object({ type: z.literal("transcript"), role: z.enum(["learner", "may"]), text: z.string(), final: z.boolean() }),
  z.object({ type: z.literal("upgrade"), card: UpgradeCardSchema }),
  /** May was interrupted: flush any queued playback immediately (R-SE-8). */
  z.object({ type: z.literal("interrupted") }),
  z.object({
    type: z.literal("metrics"),
    /** End of learner speech (client VAD) to first May audio byte at the gateway. */
    responseMs: z.number().optional(),
    /** Learner speech detected to Gemini acknowledging the interruption. */
    bargeInMs: z.number().optional(),
    tokens: z.object({ prompt: z.number(), response: z.number() }).optional(),
  }),
  z.object({ type: z.literal("ended"), reason: z.enum(["complete", "learner", "paused_out", "error"]) }),
  z.object({ type: z.literal("error"), code: z.string(), message: z.string() }),
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

export const MIC_SAMPLE_RATE = 16_000;
export const MAY_SAMPLE_RATE = 24_000;
