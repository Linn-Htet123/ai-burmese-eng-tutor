import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { Level } from "@may/shared";
import { makeChatModel } from "../model.ts";

/** R-LV-6 / R-LV-9 copy, fast tier. */
export async function writeNoticeWithGemini(input: { from: Level; to: Level; move: "promote" | "demote"; reason: string }): Promise<string> {
  const llm = makeChatModel("fast", 0.5);
  const frame =
    input.move === "promote"
      ? "Announce the move up warmly in two Burmese sentences, naming what improved."
      : "Two Burmese sentences framed as 'let us solidify this together'. Never say they went down, never 'wrong' or 'failed'.";
  const res = await llm.invoke([
    new SystemMessage("You write short Burmese messages from May, a warm English tutor, to an adult learner."),
    new HumanMessage(`${frame}\nFrom level ${input.from} to ${input.to}. Evidence: ${input.reason}.`),
  ]);
  return typeof res.content === "string" ? res.content : JSON.stringify(res.content);
}
