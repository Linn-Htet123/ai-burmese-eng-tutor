import type { SessionLength, SessionPlan } from "@may/shared";
import { SessionPlanSchema, stageBudgets } from "@may/shared";

/**
 * The Critic of the planner's reflection loop (book ch. 4), in code not LLM:
 * every rule here is a PRD acceptance criterion, so it must be exact and auditable.
 */
export function validatePlan(plan: unknown, length: SessionLength): string[] {
  const parsed = SessionPlanSchema.safeParse(plan);
  if (!parsed.success) return parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  const p: SessionPlan = parsed.data;
  const errors: string[] = [];

  const expected = stageBudgets(length);
  if (p.stages.length !== expected.length) errors.push(`expected ${expected.length} stages, got ${p.stages.length}`);
  p.stages.forEach((s, i) => {
    const e = expected[i];
    if (e && s.kind !== e.kind) errors.push(`stage ${i} should be ${e.kind}, got ${s.kind}`);
  });
  const total = p.stages.reduce((a, s) => a + s.budgetMinutes, 0);
  if (total !== length) errors.push(`stage budgets sum to ${total}, expected ${length}`);

  for (const s of p.stages) {
    if (s.openingLineMy.trim().length < 4) errors.push(`stage ${s.kind}: opening line missing`);
    if (!/[က-႟]/.test(s.openingLineMy)) errors.push(`stage ${s.kind}: opening line must be Burmese (R-SE-2)`);
    for (const it of s.items) {
      if (!it.target.trim()) errors.push(`stage ${s.kind}: item ${it.id} has no target`);
    }
  }
  const talk = p.stages.find((s) => s.kind === "talk");
  if (talk && talk.prompts.length < 2) errors.push("talk stage needs at least two conversation prompts");

  if (p.recapFromLast.length > 3) errors.push("recapFromLast must be at most 3 (R-RC-1)");
  const review = p.stages.find((s) => s.kind === "review");
  if (review) {
    const ids = new Set(review.items.map((i) => i.id));
    for (const r of p.recapFromLast) {
      if (!ids.has(r.id)) errors.push(`recap item ${r.id} not scheduled in review stage (R-RC-3)`);
    }
  }
  for (const w of ["wrong", "mistake", "failed"]) {
    for (const s of p.stages) {
      if (s.openingLineMy.toLowerCase().includes(w)) errors.push(`stage ${s.kind}: opening line uses failure language "${w}" (R-FA-6)`);
    }
  }
  return errors;
}
