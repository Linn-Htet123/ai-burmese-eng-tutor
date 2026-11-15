import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerMessage } from "@may/shared";
import { validatePlan } from "@may/brain";
import { SessionConductor } from "./conductor.ts";
import { demoPlan } from "./demoPlan.ts";
import { MemoryItemLogSink } from "./itemLogSink.ts";
import type { StageHandlers, StageOpenOptions, StageSession } from "./stageSession.ts";

interface FakeStage extends StageSession {
  handlers: StageHandlers;
  opts: StageOpenOptions;
  texts: Array<{ text: string; generate: boolean }>;
  toolResponses: Array<{ name: string; mode: string; response: Record<string, unknown> }>;
  audio: Buffer[];
  closed: boolean;
  streamEnded: boolean;
}

function harness(length: 10 | 20 | 40 = 20) {
  const sent: ServerMessage[] = [];
  const audioOut: Buffer[] = [];
  const stages: FakeStage[] = [];
  const sink = new MemoryItemLogSink();
  let t = 1_000_000;
  const now = () => t;
  const tick = (ms: number) => { t += ms; };
  const openStage = async (opts: StageOpenOptions): Promise<StageSession> => {
    const s: FakeStage = {
      handlers: opts.handlers,
      opts,
      texts: [],
      toolResponses: [],
      audio: [],
      closed: false,
      streamEnded: false,
      sendAudio: (b) => { s.audio.push(b); },
      sendAudioStreamEnd: () => { s.streamEnded = true; },
      sendText: (text, o) => { s.texts.push({ text, generate: o?.generate ?? true }); },
      sendToolResponse: (r) => { s.toolResponses.push({ name: r.name, mode: r.mode, response: r.response }); },
      close: () => { s.closed = true; },
    };
    stages.push(s);
    return s;
  };
  const c = new SessionConductor(demoPlan(length, "T1"), { send: (m) => sent.push(m), sendAudio: (b) => audioOut.push(b), openStage, sink, now }, { longTermChart: "Learner: T.", uiLanguage: "my" });
  const states = () => sent.filter((m) => m.type === "state").map((m) => (m as { value: string }).value);
  return { c, sent, audioOut, stages, sink, tick, states };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("demo plan", () => {
  it("passes the planner's validator for every length", () => {
    for (const len of [10, 20, 40] as const) expect(validatePlan(demoPlan(len), len)).toEqual([]);
  });
});

describe("conductor", () => {
  it("opens stage 0 with its opening line in the prompt and asks May to begin", async () => {
    const h = harness();
    await h.c.start();
    expect(h.sent[0]).toMatchObject({ type: "ready", stageCount: 5 });
    expect(h.sent.find((m) => m.type === "stage")).toMatchObject({ kind: "greeting", index: 0 });
    expect(h.stages[0]?.opts.systemInstruction).toContain("မင်္ဂလာပါ Thura");
    expect(h.stages[0]?.texts[0]?.generate).toBe(true);
  });

  it("drives listening → thinking → speaking → listening and measures response latency", async () => {
    const h = harness();
    await h.c.start();
    const s = h.stages[0]!;
    s.handlers.onAudio(Buffer.alloc(10));
    s.handlers.onTurnComplete();
    h.sent.length = 0;
    h.audioOut.length = 0;
    await h.c.onClientMessage({ type: "vad", speaking: true });
    h.tick(800);
    await h.c.onClientMessage({ type: "vad", speaking: false });
    expect(s.streamEnded).toBe(true);
    h.tick(640);
    s.handlers.onAudio(Buffer.from([1, 2]));
    s.handlers.onTurnComplete();
    expect(h.states()).toEqual(["thinking", "speaking", "listening"]);
    expect(h.sent.find((m) => m.type === "metrics")).toMatchObject({ responseMs: 640 });
    expect(h.audioOut).toHaveLength(1);
  });

  it("reports barge-in time and flushes the client when May is interrupted (R-SE-8)", async () => {
    const h = harness();
    await h.c.start();
    const s = h.stages[0]!;
    s.handlers.onAudio(Buffer.alloc(1));
    h.sent.length = 0;
    await h.c.onClientMessage({ type: "vad", speaking: true });
    h.tick(210);
    s.handlers.onInterrupted();
    expect(h.sent.map((m) => m.type)).toEqual(["interrupted", "metrics", "state"]);
    expect(h.sent[1]).toMatchObject({ bargeInMs: 210 });
    expect(h.c.state).toBe("listening");
  });

  it("gates offer_upgrade through the guard, logs the event, and shows the card only when allowed", async () => {
    const h = harness();
    await h.c.start();
    const s = h.stages[0]!;
    const up = { item_id: "ph-responsible-for", learner_said: "I am responsible to manage", better_line: "I'm responsible for managing", reason_my: "ပုံစံ", source: "pool", pool_id: "pool-ran-project" };
    s.handlers.onToolCall({ id: "1", name: "offer_upgrade", args: up });
    await vi.waitFor(() => expect(s.toolResponses).toHaveLength(1));
    expect(s.toolResponses[0]).toMatchObject({ mode: "interrupt", response: { status: "blocked" } });
    expect(h.sent.find((m) => m.type === "upgrade")).toBeUndefined();

    s.handlers.onToolCall({ id: "2", name: "log_acknowledge", args: { item_id: "ph-responsible-for", quoted: "manage the team" } });
    s.handlers.onToolCall({ id: "3", name: "offer_upgrade", args: up });
    await vi.waitFor(() => expect(s.toolResponses).toHaveLength(3));
    expect(s.toolResponses[1]).toMatchObject({ mode: "silent" });
    expect(s.toolResponses[2]).toMatchObject({ mode: "continue", response: { status: "ok" } });
    expect(h.sent.find((m) => m.type === "upgrade")).toMatchObject({ card: { betterLine: "I'm responsible for managing", index: 1 } });
    expect(h.sink.events.map((e) => e.gate)).toEqual(["blocked", "allowed", "allowed"]);
    expect(h.sink.events[0]?.gateReason).toContain("Blocked");
  });

  it("injects a coach nudge as a non-generating text turn", async () => {
    const h = harness();
    await h.c.start();
    const s = h.stages[0]!;
    s.handlers.onToolCall({ id: "1", name: "log_acknowledge", args: { item_id: "x", quoted: "good job" } });
    await vi.waitFor(() => expect(s.texts.length).toBe(2));
    expect(s.texts[1]).toMatchObject({ generate: false });
    expect(s.texts[1]?.text).toContain("generic");
  });

  it("cuts over on stage_wrap_ready + turn end, carrying the handover note, and closes the old stage", async () => {
    const h = harness();
    await h.c.start();
    const s0 = h.stages[0]!;
    s0.handlers.onToolCall({ id: "1", name: "stage_wrap_ready", args: { note: "Thura is warmed up, likes Man Utd" } });
    await vi.waitFor(() => expect(s0.toolResponses).toHaveLength(1));
    s0.handlers.onTurnComplete();
    await vi.waitFor(() => expect(s0.closed).toBe(true));
    expect(h.stages).toHaveLength(2);
    expect(h.stages[1]?.opts.systemInstruction).toContain("likes Man Utd");
    expect(h.sent.filter((m) => m.type === "stage").at(-1)).toMatchObject({ kind: "review", index: 1 });
    // audio from the closed stage is ignored
    s0.handlers.onAudio(Buffer.alloc(3));
    expect(h.audioOut).toHaveLength(0);
  });

  it("pre-warms the next stage before the budget ends and reuses it at cutover", async () => {
    const h = harness();
    await h.c.start();
    await vi.advanceTimersByTimeAsync(60_000); // greeting budget is 1 minute; prewarm fires at budget − 30s
    expect(h.stages).toHaveLength(2);
    const s0 = h.stages[0]!;
    expect(s0.texts.some((t) => t.text.includes("stage_wrap_ready"))).toBe(true);
    s0.handlers.onToolCall({ id: "1", name: "stage_wrap_ready", args: { note: "done" } });
    await vi.waitFor(() => expect(s0.toolResponses).toHaveLength(1));
    s0.handlers.onTurnComplete();
    await vi.waitFor(() => expect(s0.closed).toBe(true));
    expect(h.stages).toHaveLength(2); // the pre-warmed one was reused, no third open
  });

  it("pause ends the audio stream, drops mic audio, and times out after the hold (R-SE-4)", async () => {
    const h = harness();
    await h.c.start();
    const s = h.stages[0]!;
    await h.c.onClientMessage({ type: "control", action: "pause" });
    expect(s.streamEnded).toBe(true);
    h.c.onClientAudio(Buffer.alloc(4));
    expect(s.audio).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(10 * 60_000 + 1);
    expect(h.sent.at(-1)).toMatchObject({ type: "ended", reason: "paused_out" });
    expect(s.closed).toBe(true);
  });

  it("ends with reason complete after the last stage wraps", async () => {
    const h = harness(10);
    await h.c.start();
    for (let i = 0; i < 4; i += 1) {
      const s = h.stages[i]!;
      s.handlers.onToolCall({ id: `${i}`, name: "stage_wrap_ready", args: { note: `n${i}` } });
      await vi.waitFor(() => expect(s.toolResponses).toHaveLength(1));
      s.handlers.onTurnComplete();
      if (i < 3) await vi.waitFor(() => expect(s.closed).toBe(true));
    }
    await vi.waitFor(() => expect(h.sent.at(-1)).toMatchObject({ type: "ended", reason: "complete" }));
  });

  it("reopens the stage once on an unexpected close, then errors out", async () => {
    const h = harness();
    await h.c.start();
    h.stages[0]!.handlers.onClose("network");
    await vi.waitFor(() => expect(h.stages).toHaveLength(2));
    h.stages[1]!.handlers.onClose("network again");
    await vi.waitFor(() => expect(h.sent.at(-1)).toMatchObject({ type: "ended", reason: "error" }));
  });
});

describe("conductor resilience", () => {
  it("still answers the gate when the item-log write fails, and does not throw", async () => {
    const h = harness();
    h.sink.append = async () => { throw new Error("disk full"); };
    await h.c.start();
    const s = h.stages[0]!;
    expect(() => s.handlers.onToolCall({ id: "1", name: "log_stall", args: { seconds: 6 } })).not.toThrow();
    expect(s.toolResponses).toHaveLength(1);
    await Promise.resolve();
    await Promise.resolve();
  });
});
