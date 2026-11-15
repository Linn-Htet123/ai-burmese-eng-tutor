import { describe, expect, it } from "vitest";
import type { ServerMessage } from "@may/shared";
import { TRANSCRIPT_LINES, callReducer, initialCallState, median, stageMinutesLeft, type CallState } from "./reducer";

const srv = (s: CallState, msg: ServerMessage, at = 0) => callReducer(s, { type: "server", msg, at });

describe("call reducer", () => {
  it("goes connecting → live → ended", () => {
    let s = callReducer(initialCallState, { type: "connect" });
    expect(s.phase).toBe("connecting");
    s = srv(s, { type: "ready", sessionId: "x", stageCount: 5 });
    expect(s.phase).toBe("live");
    s = srv(s, { type: "ended", reason: "complete" });
    expect(s).toMatchObject({ phase: "ended", endedReason: "complete" });
    expect(callReducer(s, { type: "socket_closed" }).phase).toBe("ended");
  });

  it("merges transcript chunks per speaker and caps the lines (R-SE-6)", () => {
    let s = initialCallState;
    s = srv(s, { type: "transcript", role: "may", text: "Hello", final: false });
    s = srv(s, { type: "transcript", role: "may", text: " Thura,", final: false });
    s = srv(s, { type: "transcript", role: "may", text: "how", final: false });
    expect(s.transcript).toEqual([{ role: "may", text: "Hello Thura, how", final: false }]);
    s = srv(s, { type: "transcript", role: "learner", text: "Fine", final: false });
    expect(s.transcript).toHaveLength(2);
    for (let i = 0; i < 10; i += 1) {
      s = srv(s, { type: "state", value: "listening" });
      s = srv(s, { type: "transcript", role: i % 2 ? "may" : "learner", text: `l${i}`, final: false });
    }
    expect(s.transcript).toHaveLength(TRANSCRIPT_LINES);
  });

  it("keeps May's first chunk on the same line when the speaking state arrives after it", () => {
    let s = srv(initialCallState, { type: "transcript", role: "may", text: "မင်္ဂလာပါ", final: false });
    s = srv(s, { type: "state", value: "speaking" });
    s = srv(s, { type: "transcript", role: "may", text: " Thura။", final: false });
    expect(s.transcript).toEqual([{ role: "may", text: "မင်္ဂလာပါ Thura။", final: false }]);
  });

  it("closes open lines when May returns to listening so the next chunk starts a new line", () => {
    let s = srv(initialCallState, { type: "transcript", role: "may", text: "One", final: false });
    s = srv(s, { type: "state", value: "listening" });
    s = srv(s, { type: "transcript", role: "may", text: "Two", final: false });
    expect(s.transcript.map((l) => l.text)).toEqual(["One", "Two"]);
  });

  it("clears the upgrade card on a new stage and returns to listening on interrupt", () => {
    let s = srv(initialCallState, { type: "upgrade", card: { itemId: "i", learnerSaid: "a", betterLine: "b", reasonMy: "c", index: 1, total: 3 } });
    expect(s.upgrade).not.toBeNull();
    s = srv(s, { type: "state", value: "speaking" });
    s = srv(s, { type: "interrupted" });
    expect(s.may).toBe("listening");
    s = srv(s, { type: "stage", kind: "talk", index: 3, total: 5, budgetMinutes: 8 }, 1000);
    expect(s.upgrade).toBeNull();
    expect(stageMinutesLeft(s.stage, 1000 + 60_000 * 3)).toBe(5);
  });

  it("keeps latency samples for the spike numbers", () => {
    let s = initialCallState;
    for (const ms of [700, 900, 800]) s = srv(s, { type: "metrics", responseMs: ms });
    s = srv(s, { type: "metrics", bargeInMs: 240 });
    expect(median(s.metrics.responseMs)).toBe(800);
    expect(s.metrics.bargeInMs).toEqual([240]);
  });

  it("only pauses from live", () => {
    expect(callReducer(initialCallState, { type: "pause" }).phase).toBe("idle");
    const live = { ...initialCallState, phase: "live" as const };
    expect(callReducer(callReducer(live, { type: "pause" }), { type: "resume" }).phase).toBe("live");
  });
});
