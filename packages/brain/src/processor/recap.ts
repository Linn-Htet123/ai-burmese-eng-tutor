import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { SessionPlan } from "@may/shared";
import { makeChatModel } from "../model.ts";
import type { ItemGrade } from "./grade.ts";
import { RecapSchema, type Recap } from "./graph.ts";

/** The one LLM call in the processor (fast tier). Tests inject a fake. */
export async function extractRecapWithGemini(input: { plan: SessionPlan; grades: ItemGrade[] }): Promise<Recap> {
  const llm = makeChatModel("fast", 0.3).withStructuredOutput(RecapSchema, { name: "recap" });
  const lines = input.grades
    .map((g) => `- ${g.itemId}: said "${g.learnerSaid ?? "?"}" → "${g.betterLine ?? "?"}" · delivery ${g.delivery} (first ${g.firstAttempt}), stall ${g.maxStallSeconds}s`)
    .join("\n");
  const res = await llm.invoke([
    new SystemMessage(
      "You write May's end-of-session recap for a Burmese adult. Burmese script for explanations, the English phrases in English. Open with the one visible win. Then at most three items in the frame what-happened / why-it-cost-you / the better line. Three is a cap, not a quota: if only one thing was worth naming, name one. Never the words wrong, mistake, failed.",
    ),
    new HumanMessage(`Topic: ${input.plan.topic}. Level: ${input.plan.level}.\nItems:\n${lines || "- (no items attempted)"}`),
  ]);
  return RecapSchema.parse(res);
}
