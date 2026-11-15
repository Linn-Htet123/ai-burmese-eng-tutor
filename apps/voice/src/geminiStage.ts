import {
  Behavior,
  FunctionResponseScheduling,
  GoogleGenAI,
  Modality,
  type FunctionDeclaration,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { itemLogFunctionDeclarations, MAY_SAMPLE_RATE, MIC_SAMPLE_RATE } from "@may/shared";
import { config } from "./config.ts";
import type { StageOpenOptions, StageSession, StageSessionFactory } from "./stageSession.ts";

/** Tools May must wait on (the gate decides) versus fire-and-forget logging. */
const BLOCKING_TOOLS = new Set(["offer_upgrade", "request_repeat"]);

function declarations(): FunctionDeclaration[] {
  return itemLogFunctionDeclarations().map((d) => ({
    name: d.name,
    description: d.description,
    parametersJsonSchema: d.parametersJsonSchema,
    behavior: BLOCKING_TOOLS.has(d.name) ? Behavior.BLOCKING : Behavior.NON_BLOCKING,
  }));
}

/** The real factory: one Gemini Live WebSocket per stage, owned by the backend (D-035). */
export const openGeminiStage: StageSessionFactory = async (opts: StageOpenOptions): Promise<StageSession> => {
  if (!config.geminiApiKey) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const h = opts.handlers;

  let session: Session | undefined;
  session = await ai.live.connect({
    model: config.liveModel,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: opts.systemInstruction,
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } } },
      tools: [{ functionDeclarations: declarations() }],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      realtimeInputConfig: { automaticActivityDetection: { disabled: false } },
      temperature: 0.7,
    },
    callbacks: {
      onmessage: (m: LiveServerMessage) => handle(m),
      onerror: (e) => h.onError(new Error(e.message ?? "gemini live error")),
      onclose: (e) => h.onClose(e.reason || `code ${e.code}`),
    },
  });

  function handle(m: LiveServerMessage) {
    if (m.usageMetadata) {
      h.onUsage({ prompt: m.usageMetadata.promptTokenCount ?? 0, response: m.usageMetadata.responseTokenCount ?? 0 });
    }
    const sc = m.serverContent;
    if (sc) {
      if (sc.interrupted) h.onInterrupted();
      for (const part of sc.modelTurn?.parts ?? []) {
        const data = part.inlineData?.data;
        if (data) h.onAudio(Buffer.from(data, "base64"));
      }
      if (sc.inputTranscription?.text) h.onTranscript("learner", sc.inputTranscription.text, Boolean(sc.inputTranscription.finished));
      if (sc.outputTranscription?.text) h.onTranscript("may", sc.outputTranscription.text, Boolean(sc.outputTranscription.finished));
      if (sc.turnComplete) h.onTurnComplete();
    }
    for (const fc of m.toolCall?.functionCalls ?? []) {
      if (fc.name) h.onToolCall({ id: fc.id ?? "", name: fc.name, args: (fc.args ?? {}) as Record<string, unknown> });
    }
  }

  const scheduling = {
    silent: FunctionResponseScheduling.SILENT,
    continue: FunctionResponseScheduling.WHEN_IDLE,
    interrupt: FunctionResponseScheduling.INTERRUPT,
  } as const;

  return {
    sendAudio: (pcm) =>
      session?.sendRealtimeInput({ audio: { data: pcm.toString("base64"), mimeType: `audio/pcm;rate=${MIC_SAMPLE_RATE}` } }),
    sendAudioStreamEnd: () => session?.sendRealtimeInput({ audioStreamEnd: true }),
    sendText: (text, o) =>
      session?.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: o?.generate ?? true }),
    sendToolResponse: (r) =>
      session?.sendToolResponse({
        functionResponses: [{ id: r.id, name: r.name, response: r.response, scheduling: scheduling[r.mode] }],
      }),
    close: () => {
      session?.close();
      session = undefined;
    },
  };
};

export { MAY_SAMPLE_RATE };
