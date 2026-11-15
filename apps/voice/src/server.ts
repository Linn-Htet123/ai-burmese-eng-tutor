import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { ClientMessageSchema, SessionLengthSchema, type ServerMessage } from "@may/shared";
import { buildLongTermChart } from "@may/brain";
import { config } from "./config.ts";
import { originAllowed } from "./origin.ts";
import { SessionConductor } from "./conductor.ts";
import { demoPlan } from "./demoPlan.ts";
import { openFakeStage } from "./fakeStage.ts";
import { openGeminiStage } from "./geminiStage.ts";
import { FileItemLogSink } from "./itemLogSink.ts";

const http = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, fake, model: config.liveModel, hasKey: Boolean(config.geminiApiKey) }));
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({
  server: http,
  path: "/ws",
  verifyClient: (info: { origin: string }) => originAllowed(info.origin || undefined, config.allowedOrigins),
});
const sink = new FileItemLogSink(config.dataDir);
const fake = process.env["FAKE_GEMINI"] === "1";
const openStage = fake ? openFakeStage : openGeminiStage;

wss.on("connection", (ws: WebSocket, req) => {
  const url = new URL(req.url ?? "/ws", "http://localhost");
  const lengthParsed = SessionLengthSchema.safeParse(Number(url.searchParams.get("length") ?? 20));
  const length = lengthParsed.success ? lengthParsed.data : 20;
  const sessionId = `${url.searchParams.get("session") ?? "demo"}-${Date.now().toString(36)}`;
  const plan = demoPlan(length, sessionId);

  const send = (m: ServerMessage) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m));
  };
  const conductor = new SessionConductor(
    plan,
    {
      send,
      sendAudio: (pcm) => {
        if (ws.readyState === ws.OPEN) ws.send(pcm, { binary: true });
      },
      openStage,
      sink,
      log: (msg, data) => console.log(`[${sessionId}] ${msg}`, data ?? ""),
    },
    {
      longTermChart: buildLongTermChart({
        name: "Thura",
        level: plan.level,
        interests: ["football", "cooking"],
        weakPoints: ["translating in his head before answering"],
        lastRecap: plan.recapFromLast,
        profileFacts: ["accountant in Yangon with foreign clients"],
        daysSinceLastSession: 1,
      }),
      uiLanguage: "my",
    },
  );

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      conductor.onClientAudio(Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer));
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(data.toString());
    } catch {
      send({ type: "error", code: "bad_message", message: "not JSON" });
      return;
    }
    const parsed = ClientMessageSchema.safeParse(json);
    if (!parsed.success) {
      send({ type: "error", code: "bad_message", message: parsed.error.message });
      return;
    }
    void conductor.onClientMessage(parsed.data);
  });
  ws.on("close", () => void conductor.end("learner"));

  conductor.start().catch((err: unknown) => {
    console.error(`[${sessionId}] start failed`, err);
    send({ type: "error", code: "start_failed", message: err instanceof Error ? err.message : String(err) });
    ws.close();
  });
});

http.listen(config.port, () => {
  console.log(
    `voice gateway on :${config.port} (ws path /ws, ${fake ? "FAKE Gemini" : `model ${config.liveModel}, key ${config.geminiApiKey ? "set" : "MISSING"}`})`,
  );
});
