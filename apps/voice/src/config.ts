export const config = {
  port: Number(process.env["PORT"] ?? 8787),
  geminiApiKey: process.env["GEMINI_API_KEY"] ?? "",
  /** Native-audio Live model. Override per spike result; see docs/technical-designs/02-voice-pipeline.md. */
  liveModel: process.env["GEMINI_LIVE_MODEL"] ?? "gemini-live-2.5-flash-preview",
  voiceName: process.env["MAY_VOICE"] ?? "Aoede",
  dataDir: process.env["DATA_DIR"] ?? "data",
  /** Open the next stage's Gemini session this many ms before the current budget ends (pre-warm). */
  prewarmMs: Number(process.env["PREWARM_MS"] ?? 30_000),
  /** R-SE-4: a paused session holds for 10 minutes, then ends and saves. */
  pauseHoldMs: Number(process.env["PAUSE_HOLD_MS"] ?? 10 * 60_000),
  /** Comma-separated browser origins allowed to open a call. Empty = allow all (local dev only). */
  allowedOrigins: (process.env["ALLOWED_ORIGINS"] ?? "").split(",").map((o) => o.trim()).filter(Boolean),
} as const;
