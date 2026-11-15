import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { makeChatModel } from "../model.ts";
import { ComposedWordsSchema, type ComposeRequest, type ComposedWords } from "./graph.ts";

/** The real Producer: one structured LLM call. Tests inject a fake instead. */
export async function composeWithGemini(req: ComposeRequest): Promise<ComposedWords> {
  const llm = makeChatModel("strong", 0.6).withStructuredOutput(ComposedWordsSchema, { name: "composed_words" });
  const critique = req.critique.length
    ? `\nYour previous attempt failed these checks, fix them:\n- ${req.critique.join("\n- ")}`
    : "";
  const res = await llm.invoke([
    new SystemMessage(
      "You write the words May, a warm Burmese English tutor, uses to open each stage of a phone lesson. Opening lines are in Burmese script, one or two short sentences, never praise-generic, never the words wrong/mistake/failed. Talk prompts are natural English questions about the topic a Burmese adult would enjoy answering.",
    ),
    new HumanMessage(
      `Level: ${req.level}. Topic: ${req.topic}. Interests: ${req.interests.join(", ") || "unknown"}. Stages in order: ${req.stageKinds.join(", ")}. ${req.isReturnSession ? "The learner has been away a week: make it gentle and name that it is good to have them back." : ""}${critique}`,
    ),
  ]);
  return ComposedWordsSchema.parse(res);
}
