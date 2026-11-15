import type { Delivery, ItemLogArgs, ItemLogToolName, PoolEntry } from "@may/shared";
import { ItemLogTools } from "@may/shared";
import {
  FAILS_BEFORE_STEP_DOWN,
  MAX_REPEAT_REQUESTS,
  MAX_UPGRADES_PER_ITEM,
  STEP_DOWNS_FOR_LEVEL_REVIEW,
  isGenericPraise,
  type RuleId,
} from "./rules.ts";

/** S1–S7 of the upgrade loop, as the guard shadows it per item (doc 04 §3). */
export type LoopStep = "idle" | "acknowledged" | "upgraded" | "repeat_requested" | "repeated" | "done";

export interface ItemLoop {
  itemId: string;
  step: LoopStep;
  upgrades: number;
  repeatRequests: number;
  deliveries: Delivery[];
  failStreak: number;
  /** Set when the upgrade was invented (R-UL-9): kept out of the review queue until reviewed. */
  pendingReview: boolean;
}

export interface Flag {
  rule: RuleId;
  itemId?: string;
  detail: string;
  tMs: number;
}

export interface GuardState {
  stage: string;
  items: Record<string, ItemLoop>;
  flags: Flag[];
  /** Text instructions injected into May's context (nudge lane). */
  nudges: Array<{ text: string; tMs: number }>;
  toolCalls: number;
  stalls: number;
  stepDowns: number;
  levelReviewTriggered: boolean;
  handoverNotes: string[];
}

export interface GateDecision {
  allowed: boolean;
  /** Returned to May as the function response so she can self-correct in the same turn. */
  instruction: string;
}

export interface GuardContext {
  /** The authored pool slice for this stage (R-UL-8). */
  pool: readonly PoolEntry[];
}

export function createGuardState(stage: string): GuardState {
  return {
    stage,
    items: {},
    flags: [],
    nudges: [],
    toolCalls: 0,
    stalls: 0,
    stepDowns: 0,
    levelReviewTriggered: false,
    handoverNotes: [],
  };
}

function loop(state: GuardState, itemId: string): ItemLoop {
  const existing = state.items[itemId];
  if (existing) return existing;
  const fresh: ItemLoop = {
    itemId,
    step: "idle",
    upgrades: 0,
    repeatRequests: 0,
    deliveries: [],
    failStreak: 0,
    pendingReview: false,
  };
  state.items[itemId] = fresh;
  return fresh;
}

export interface ApplyResult {
  state: GuardState;
  gate: GateDecision;
  newFlags: Flag[];
  nudge?: string;
}

const OK: GateDecision = { allowed: true, instruction: "ok" };

/**
 * Apply one item-log tool call. Pure: returns a new state (shallow-cloned) plus the gate decision.
 * Unknown or malformed calls are blocked, never thrown — the audio must keep flowing.
 */
export function applyToolCall(
  prev: GuardState,
  tool: ItemLogToolName,
  rawArgs: unknown,
  tMs: number,
  ctx: GuardContext,
): ApplyResult {
  const state: GuardState = {
    ...prev,
    items: Object.fromEntries(Object.entries(prev.items).map(([k, v]) => [k, { ...v, deliveries: [...v.deliveries] }])),
    flags: [...prev.flags],
    nudges: [...prev.nudges],
    handoverNotes: [...prev.handoverNotes],
    toolCalls: prev.toolCalls + 1,
  };
  const newFlags: Flag[] = [];
  const flag = (rule: RuleId, detail: string, itemId?: string) => {
    const f: Flag = { rule, detail, tMs, ...(itemId ? { itemId } : {}) };
    newFlags.push(f);
    state.flags.push(f);
  };
  let nudge: string | undefined;

  const schema = ItemLogTools[tool];
  const parsed = schema.safeParse(rawArgs);
  if (!parsed.success) {
    return {
      state,
      newFlags,
      gate: { allowed: false, instruction: `Malformed ${tool} call: ${parsed.error.issues.map((i) => i.message).join("; ")}. Continue talking; call it again with the right fields.` },
    };
  }

  switch (tool) {
    case "log_acknowledge": {
      const a = parsed.data as ItemLogArgs<"log_acknowledge">;
      const l = loop(state, a.item_id);
      if (isGenericPraise(a.quoted)) {
        flag("UL-2", `generic acknowledgement: "${a.quoted}"`, a.item_id);
        // Allowed: she already said it; the flag goes to the weekly list and the next turn gets a nudge.
        nudge = "Your last acknowledgement was generic. Next time quote the learner's exact words that worked.";
      }
      if (l.step === "idle") l.step = "acknowledged";
      return { state, newFlags, gate: OK, ...(nudge ? { nudge } : {}) };
    }

    case "offer_upgrade": {
      const a = parsed.data as ItemLogArgs<"offer_upgrade">;
      const l = loop(state, a.item_id);
      if (l.step === "idle") {
        flag("UL-1", "upgrade offered before any acknowledgement", a.item_id);
        return {
          state,
          newFlags,
          gate: {
            allowed: false,
            instruction:
              "Blocked: first name one specific thing the learner said well (call log_acknowledge), then offer the better line.",
          },
        };
      }
      if (l.upgrades >= MAX_UPGRADES_PER_ITEM) {
        flag("UL-3", "second upgrade on the same item", a.item_id);
        return {
          state,
          newFlags,
          gate: {
            allowed: false,
            instruction:
              "Blocked: you already gave the one better line for this item. Ask the learner to say it back, or move on.",
          },
        };
      }
      if (a.source === "pool") {
        const known = a.pool_id !== undefined && ctx.pool.some((p) => p.id === a.pool_id);
        if (!known) {
          flag("UL-8", `claimed pool upgrade with unknown pool_id ${a.pool_id ?? "(none)"}`, a.item_id);
          l.pendingReview = true;
        }
      } else {
        flag("UL-9", `invented upgrade: "${a.better_line}"`, a.item_id);
        l.pendingReview = true;
      }
      l.upgrades += 1;
      l.step = "upgraded";
      return { state, newFlags, gate: OK };
    }

    case "request_repeat": {
      const a = parsed.data as ItemLogArgs<"request_repeat">;
      const l = loop(state, a.item_id);
      if (l.repeatRequests >= MAX_REPEAT_REQUESTS) {
        flag("UL-5", "asked for the repeat a second time", a.item_id);
        return {
          state,
          newFlags,
          gate: { allowed: false, instruction: "Blocked: never ask twice. Continue the conversation naturally." },
        };
      }
      l.repeatRequests += 1;
      l.step = "repeat_requested";
      return { state, newFlags, gate: OK };
    }

    case "log_repeat_result": {
      const a = parsed.data as ItemLogArgs<"log_repeat_result">;
      const l = loop(state, a.item_id);
      l.deliveries.push(a.delivery);
      l.step = "repeated";
      if (a.delivery === "failed") {
        l.failStreak += 1;
        if (l.failStreak >= FAILS_BEFORE_STEP_DOWN) {
          flag("FA-1", `three consecutive failures on ${a.item_id}`, a.item_id);
          nudge =
            "Three failures on this item. Stop drilling it. Warmly move to something the learner can do and call log_step_down.";
        }
      } else {
        l.failStreak = 0;
      }
      return { state, newFlags, gate: OK, ...(nudge ? { nudge } : {}) };
    }

    case "log_item_done": {
      const a = parsed.data as ItemLogArgs<"log_item_done">;
      const l = loop(state, a.item_id);
      if (l.upgrades > 0 && l.deliveries.length === 0) {
        flag("UL-5", "item closed without the repeat ever happening", a.item_id);
        nudge = "The learner never said the better line back. On the next item, ask for the repeat once before moving on.";
      }
      l.step = "done";
      return { state, newFlags, gate: OK, ...(nudge ? { nudge } : {}) };
    }

    case "log_stall": {
      state.stalls += 1;
      return { state, newFlags, gate: OK };
    }

    case "log_step_down": {
      const a = parsed.data as ItemLogArgs<"log_step_down">;
      const l = loop(state, a.item_id);
      l.step = "done";
      l.failStreak = 0;
      state.stepDowns += 1;
      if (state.stepDowns >= STEP_DOWNS_FOR_LEVEL_REVIEW && !state.levelReviewTriggered) {
        state.levelReviewTriggered = true;
        flag("FA-5", `${state.stepDowns} step-downs this session`);
      }
      return { state, newFlags, gate: OK };
    }

    case "stage_wrap_ready": {
      const a = parsed.data as ItemLogArgs<"stage_wrap_ready">;
      state.handoverNotes.push(a.note);
      return { state, newFlags, gate: OK };
    }
  }
}

/** Teaching-quality metric tracked per D-047 (Evaluation pattern, book ch. 19). */
export function flagRatePer100Calls(state: GuardState): number {
  if (state.toolCalls === 0) return 0;
  return (state.flags.length / state.toolCalls) * 100;
}
