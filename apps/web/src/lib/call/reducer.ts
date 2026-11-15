import type { MayState, ServerMessage, StageKind, UpgradeCard } from "@may/shared";

export type Phase = "idle" | "connecting" | "live" | "paused" | "ended" | "error";

export interface TranscriptLine {
  role: "learner" | "may";
  text: string;
  final: boolean;
}

export interface CallState {
  phase: Phase;
  may: MayState;
  stage: { kind: StageKind; index: number; total: number; budgetMinutes: number; startedAt: number } | null;
  transcript: TranscriptLine[];
  upgrade: UpgradeCard | null;
  metrics: { responseMs: number[]; bargeInMs: number[]; tokens: { prompt: number; response: number } | null };
  endedReason: "complete" | "learner" | "paused_out" | "error" | null;
  error: string | null;
}

export const initialCallState: CallState = {
  phase: "idle",
  may: "listening",
  stage: null,
  transcript: [],
  upgrade: null,
  metrics: { responseMs: [], bargeInMs: [], tokens: null },
  endedReason: null,
  error: null,
};

export type CallAction =
  | { type: "connect" }
  | { type: "server"; msg: ServerMessage; at: number }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "socket_closed" }
  | { type: "fail"; message: string };

/** R-SE-6: the last few exchanges on screen. */
export const TRANSCRIPT_LINES = 4;
const METRIC_SAMPLES = 50;

export function callReducer(s: CallState, a: CallAction): CallState {
  switch (a.type) {
    case "connect":
      return { ...initialCallState, phase: "connecting" };
    case "pause":
      return s.phase === "live" ? { ...s, phase: "paused" } : s;
    case "resume":
      return s.phase === "paused" ? { ...s, phase: "live" } : s;
    case "fail":
      return { ...s, phase: "error", error: a.message };
    case "socket_closed":
      return s.phase === "ended" || s.phase === "error" ? s : { ...s, phase: "error", error: s.error ?? "socket closed" };
    case "server":
      return onServer(s, a.msg, a.at);
  }
}

function onServer(s: CallState, m: ServerMessage, at: number): CallState {
  switch (m.type) {
    case "ready":
      return { ...s, phase: "live" };
    case "state":
      // A turn ends when May goes back to listening; transcript chunks can arrive before "speaking".
      return {
        ...s,
        may: m.value,
        transcript: m.value === "listening" ? s.transcript.map((l) => (l.final ? l : { ...l, final: true })) : s.transcript,
      };
    case "stage":
      return { ...s, stage: { kind: m.kind, index: m.index, total: m.total, budgetMinutes: m.budgetMinutes, startedAt: at }, upgrade: null };
    case "transcript": {
      const last = s.transcript.at(-1);
      let lines: TranscriptLine[];
      if (last && last.role === m.role && !last.final) {
        lines = [...s.transcript.slice(0, -1), { role: m.role, text: joinChunk(last.text, m.text), final: m.final }];
      } else {
        lines = [...s.transcript, { role: m.role, text: m.text.trim(), final: m.final }];
      }
      return { ...s, transcript: lines.slice(-TRANSCRIPT_LINES) };
    }
    case "upgrade":
      return { ...s, upgrade: m.card };
    case "interrupted":
      return { ...s, may: "listening" };
    case "metrics": {
      const metrics = { ...s.metrics };
      if (m.responseMs !== undefined) metrics.responseMs = [...metrics.responseMs, m.responseMs].slice(-METRIC_SAMPLES);
      if (m.bargeInMs !== undefined) metrics.bargeInMs = [...metrics.bargeInMs, m.bargeInMs].slice(-METRIC_SAMPLES);
      if (m.tokens) metrics.tokens = m.tokens;
      return { ...s, metrics };
    }
    case "ended":
      return { ...s, phase: "ended", endedReason: m.reason };
    case "error":
      return { ...s, error: m.message };
  }
}

function joinChunk(prev: string, chunk: string): string {
  if (!prev) return chunk.trim();
  if (/^\s/.test(chunk) || /\s$/.test(prev)) return (prev + chunk).replace(/\s+/g, " ");
  // Gemini transcription chunks usually carry their own leading space; when not, keep words apart.
  return /^[.,!?;:'’]/.test(chunk) ? prev + chunk : `${prev} ${chunk}`;
}

export function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? null) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}

export function stageMinutesLeft(stage: CallState["stage"], now: number): number | null {
  if (!stage) return null;
  const left = stage.budgetMinutes * 60_000 - (now - stage.startedAt);
  return Math.max(0, Math.ceil(left / 60_000));
}
