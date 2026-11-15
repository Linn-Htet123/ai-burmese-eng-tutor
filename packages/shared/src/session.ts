import { z } from "zod";

/** Learner-chosen session length in minutes (design canvas: 10 / 20 / 40; R-PY-2 cap is 40). */
export const SessionLengthSchema = z.union([z.literal(10), z.literal(20), z.literal(40)]);
export type SessionLength = z.infer<typeof SessionLengthSchema>;

/** The five stages from the change note (decision 9). Each runs in its own model context (R-SE-3). */
export const StageKindSchema = z.enum(["greeting", "review", "phrase", "talk", "recap"]);
export type StageKind = z.infer<typeof StageKindSchema>;

export const STAGE_ORDER: readonly StageKind[] = ["greeting", "review", "phrase", "talk", "recap"];

export const STAGE_LABEL_MY: Record<StageKind, string> = {
  greeting: "နှုတ်ဆက်",
  review: "ပြန်လည်သုံးသပ်",
  phrase: "စကားစုလေ့ကျင့်",
  talk: "အဓိကစကားပြော",
  recap: "အနှစ်ချုပ်",
};

export interface StageBudget {
  kind: StageKind;
  minutes: number;
}

/**
 * Soft time budgets per session length. 40 is the change-note split
 * (greeting 1, review 5, phrase 10, main talk 17, recap 7). Shorter sessions keep
 * the review-first promise (R-RV-7) and the recap (R-RC-1); the 10-minute session
 * drops the main talk entirely — it is a review-and-one-phrase session.
 */
export function stageBudgets(length: SessionLength): StageBudget[] {
  switch (length) {
    case 40:
      return [
        { kind: "greeting", minutes: 1 },
        { kind: "review", minutes: 5 },
        { kind: "phrase", minutes: 10 },
        { kind: "talk", minutes: 17 },
        { kind: "recap", minutes: 7 },
      ];
    case 20:
      return [
        { kind: "greeting", minutes: 1 },
        { kind: "review", minutes: 3 },
        { kind: "phrase", minutes: 5 },
        { kind: "talk", minutes: 8 },
        { kind: "recap", minutes: 3 },
      ];
    case 10:
      return [
        { kind: "greeting", minutes: 1 },
        { kind: "review", minutes: 3 },
        { kind: "phrase", minutes: 4 },
        { kind: "recap", minutes: 2 },
      ];
  }
}

/** New items per session (R-RV-6 says 8–12 for 40 minutes; scaled down for shorter sessions). */
export function newItemCap(length: SessionLength): { min: number; max: number } {
  switch (length) {
    case 40:
      return { min: 8, max: 12 };
    case 20:
      return { min: 4, max: 6 };
    case 10:
      return { min: 1, max: 3 };
  }
}
