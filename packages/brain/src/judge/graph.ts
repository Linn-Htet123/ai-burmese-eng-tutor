import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { z } from "zod";
import type { Level } from "@may/shared";
import type { SessionStats } from "../processor/grade.ts";
import { judgeLevel, type Verdict } from "./rules.ts";

export interface JudgeDeps {
  loadRecentStats: (learnerId: string, n: number) => Promise<SessionStats[]>;
  loadLevel: (learnerId: string) => Promise<Level>;
  /** R-LV-6: Burmese announcement naming what improved; R-LV-9 demotion framed as "let's solidify". */
  writeNotice: (input: { from: Level; to: Level; move: "promote" | "demote"; reason: string }) => Promise<string>;
  applyLevel: (learnerId: string, to: Level, noticeMy: string, reason: string) => Promise<void>;
}

const JudgeState = new StateSchema({
  learnerId: z.string(),
  level: z.custom<Level>().optional(),
  recent: z.custom<SessionStats[]>().optional(),
  verdict: z.custom<Verdict>().optional(),
  noticeMy: z.string().optional(),
});

export function buildJudgeGraph(deps: JudgeDeps) {
  const load: typeof JudgeState.Node = async (s) => ({
    level: await deps.loadLevel(s.learnerId),
    recent: await deps.loadRecentStats(s.learnerId, 3),
  });
  const check: typeof JudgeState.Node = (s) => ({ verdict: judgeLevel(s.level as Level, s.recent ?? []) });
  const announce: typeof JudgeState.Node = async (s) => {
    const v = s.verdict as Verdict;
    if (v.move === "hold") return {};
    const noticeMy = await deps.writeNotice({ from: s.level as Level, to: v.to, move: v.move, reason: v.reason });
    await deps.applyLevel(s.learnerId, v.to, noticeMy, v.reason);
    return { noticeMy };
  };
  const route = (s: typeof JudgeState.State) => (s.verdict?.move === "hold" ? END : "write_notice");

  return new StateGraph(JudgeState)
    .addNode("load_last_3", load)
    .addNode("check_rules", check)
    .addNode("write_notice", announce)
    .addEdge(START, "load_last_3")
    .addEdge("load_last_3", "check_rules")
    .addConditionalEdges("check_rules", route, ["write_notice", END])
    .addEdge("write_notice", END)
    .compile();
}
