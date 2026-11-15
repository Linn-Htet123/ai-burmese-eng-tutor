import { spawn, type ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import type { ServerMessage } from "@may/shared";

const PORT = 18_787;
let proc: ChildProcess;

beforeAll(async () => {
  proc = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    env: { ...process.env, PORT: String(PORT), FAKE_GEMINI: "1", DATA_DIR: "data/test" },
    stdio: "pipe",
  });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("server did not start")), 15_000);
    proc.stdout?.on("data", (d: Buffer) => {
      if (d.toString().includes("voice gateway on")) {
        clearTimeout(t);
        resolve();
      }
    });
  });
}, 20_000);

afterAll(() => {
  proc.kill();
});

describe("gateway over a real WebSocket (fake Gemini)", () => {
  it("runs a learner turn through the upgrade loop and streams audio back", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?length=10`);
    const msgs: ServerMessage[] = [];
    let audioFrames = 0;
    ws.on("message", (data, isBinary) => {
      if (isBinary) audioFrames += 1;
      else msgs.push(JSON.parse(data.toString()) as ServerMessage);
    });
    await new Promise((r) => ws.once("open", r));
    const waitFor = async (pred: () => boolean, ms = 8000) => {
      const end = Date.now() + ms;
      while (!pred()) {
        if (Date.now() > end) throw new Error(`timeout; got ${msgs.map((m) => m.type).join(",")}`);
        await new Promise((r) => setTimeout(r, 25));
      }
    };
    await waitFor(() => msgs.some((m) => m.type === "state" && m.value === "speaking"));
    await waitFor(() => msgs.filter((m) => m.type === "state").at(-1)?.type === "state" && (msgs.filter((m) => m.type === "state").at(-1) as { value: string }).value === "listening");
    expect(msgs[0]).toMatchObject({ type: "ready", stageCount: 4 });

    // Greeting stage has no items: one learner turn then advance to review, which has items + pool.
    for (let i = 0; i < 3; i += 1) {
      ws.send(JSON.stringify({ type: "vad", speaking: true }));
      ws.send(Buffer.alloc(640));
      ws.send(JSON.stringify({ type: "vad", speaking: false }));
      await new Promise((r) => setTimeout(r, 1200));
    }
    await waitFor(() => msgs.some((m) => m.type === "stage" && m.kind === "review"));
    ws.send(JSON.stringify({ type: "vad", speaking: true }));
    ws.send(JSON.stringify({ type: "vad", speaking: false }));
    await waitFor(() => msgs.some((m) => m.type === "upgrade"));
    expect(msgs.find((m) => m.type === "upgrade")).toMatchObject({ card: { betterLine: "I ran the project" } });
    expect(msgs.some((m) => m.type === "metrics" && typeof m.responseMs === "number")).toBe(true);
    expect(audioFrames).toBeGreaterThan(5);

    ws.send(JSON.stringify({ type: "control", action: "end" }));
    await waitFor(() => msgs.some((m) => m.type === "ended"));
    ws.close();
  }, 30_000);

  it("rejects a malformed client message without dropping the socket", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    const msgs: ServerMessage[] = [];
    ws.on("message", (d, bin) => !bin && msgs.push(JSON.parse(d.toString()) as ServerMessage));
    await new Promise((r) => ws.once("open", r));
    ws.send(JSON.stringify({ type: "nope" }));
    ws.send("this is not json");
    await new Promise((r) => setTimeout(r, 300));
    expect(msgs.filter((m) => m.type === "error" && m.code === "bad_message")).toHaveLength(2);
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });
});
