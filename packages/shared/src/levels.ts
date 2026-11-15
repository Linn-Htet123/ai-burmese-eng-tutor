import { z } from "zod";

/**
 * Three levels (PRD change note 2026-10-22, decision 3; supersedes R-LV-1's 0–10 integer).
 * Stored as an enum; ordering is explicit so the level judge can move exactly one step.
 */
export const LevelSchema = z.enum(["beginner", "middle", "advanced"]);
export type Level = z.infer<typeof LevelSchema>;

export const LEVEL_ORDER: readonly Level[] = ["beginner", "middle", "advanced"];

export function levelIndex(level: Level): number {
  return LEVEL_ORDER.indexOf(level);
}

/** One step up, or the same level at the top (R-LV-10: never more than one step). */
export function levelUp(level: Level): Level {
  return LEVEL_ORDER[Math.min(levelIndex(level) + 1, LEVEL_ORDER.length - 1)] ?? level;
}

/** One step down, or the same level at the bottom (R-LV-10). */
export function levelDown(level: Level): Level {
  return LEVEL_ORDER[Math.max(levelIndex(level) - 1, 0)] ?? level;
}

/** Burmese-to-English instruction ratio target per level (R-LV-4). 1 = all Burmese scaffolding. */
export const BURMESE_RATIO: Record<Level, number> = {
  beginner: 0.6,
  middle: 0.35,
  advanced: 0.15,
};

export const LEVEL_LABEL_MY: Record<Level, string> = {
  beginner: "အခြေခံ",
  middle: "အလယ်",
  advanced: "အဆင့်မြင့်",
};
