import { z } from "zod";

/** R-RV-1: an item is a phrase, collocation, upgrade pattern, filler, or grammar pattern. */
export const ItemKindSchema = z.enum(["phrase", "collocation", "upgrade", "filler", "grammar"]);
export type ItemKind = z.infer<typeof ItemKindSchema>;

/** R-RV-8: delivery grade, not correctness. Hesitant is the grade this product exists to fix. */
export const DeliverySchema = z.enum(["fluent", "hesitant", "failed"]);
export type Delivery = z.infer<typeof DeliverySchema>;

/** A review-queue item (R-RV-2 keeps the before/after pair). */
export const ReviewItemSchema = z.object({
  id: z.string(),
  kind: ItemKindSchema,
  learnerSaid: z.string().optional(),
  target: z.string(),
  reasonMy: z.string().optional(),
  /** Spaced-repetition stage: index into REVIEW_INTERVALS_DAYS (R-RV-3). */
  intervalStage: z.number().int().min(0),
  nextReviewAt: z.string().datetime().nullable(),
  lastDelivery: DeliverySchema.nullable(),
  timesSeen: z.number().int().min(0),
});
export type ReviewItem = z.infer<typeof ReviewItemSchema>;

/** R-RV-3: 1 day, 3 days, 1 week, 3 weeks, then longer (we use 60 days as "longer"). */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 21, 60] as const;

/** An authored upgrade-pool entry (content format doc 06, pool.yaml). */
export const PoolEntrySchema = z.object({
  id: z.string(),
  trigger: z.string(),
  upgrade: z.string(),
  type: z.string(),
  glossMy: z.string(),
  tags: z.array(z.string()),
  levels: z.array(z.enum(["beginner", "middle", "advanced"])),
});
export type PoolEntry = z.infer<typeof PoolEntrySchema>;
