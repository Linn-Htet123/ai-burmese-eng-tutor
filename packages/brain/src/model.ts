import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Resource-Aware Optimization (book ch. 16): two tiers, picked per job in code.
 * fast  → recap items, Burmese notices, opening lines (short, many).
 * strong → composing a whole session plan (one call per session, needs judgement).
 * Model ids are env-driven so the spike can swap without a deploy.
 */
export type ModelTier = "fast" | "strong";

export function modelIdFor(tier: ModelTier): string {
  if (tier === "strong") return process.env["GEMINI_STRONG_MODEL"] ?? "gemini-2.5-pro";
  return process.env["GEMINI_FAST_MODEL"] ?? "gemini-2.5-flash";
}

export function makeChatModel(tier: ModelTier, temperature = 0.4): ChatGoogleGenerativeAI {
  return new ChatGoogleGenerativeAI({
    model: modelIdFor(tier),
    temperature,
    apiKey: process.env["GEMINI_API_KEY"],
  });
}
