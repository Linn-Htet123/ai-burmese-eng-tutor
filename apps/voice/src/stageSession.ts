import type { Level, StagePlan } from "@may/shared";

/**
 * One model context for one stage (R-SE-3, D-046). The conductor talks to this interface only,
 * so tests inject a fake and the real one wraps @google/genai Live.
 */
export interface StageOpenOptions {
  systemInstruction: string;
  stage: StagePlan;
  level: Level;
  handlers: StageHandlers;
}

export interface StageHandlers {
  /** PCM16 24 kHz bytes from May. */
  onAudio: (pcm: Buffer) => void;
  onToolCall: (call: { id: string; name: string; args: Record<string, unknown> }) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onTranscript: (role: "learner" | "may", text: string, final: boolean) => void;
  onUsage: (u: { prompt: number; response: number }) => void;
  onClose: (reason: string) => void;
  onError: (err: Error) => void;
}

export interface StageSession {
  /** PCM16 16 kHz mono from the learner's mic. */
  sendAudio: (pcm: Buffer) => void;
  /** Mic muted or paused: tells server VAD the stream ended. */
  sendAudioStreamEnd: () => void;
  /** A text turn into the context (Burmese-help request, nudges). */
  sendText: (text: string, opts?: { generate: boolean }) => void;
  sendToolResponse: (r: { id: string; name: string; response: Record<string, unknown>; mode: "silent" | "continue" | "interrupt" }) => void;
  close: () => void;
}

export type StageSessionFactory = (opts: StageOpenOptions) => Promise<StageSession>;
