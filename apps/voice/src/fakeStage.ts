import { MAY_SAMPLE_RATE } from "@may/shared";
import type { StageOpenOptions, StageSession, StageSessionFactory } from "./stageSession.ts";

/**
 * A scripted stand-in for Gemini Live (FAKE_GEMINI=1). Lets the UI and conductor run end to end
 * with no API key: May "speaks" a soft tone with transcript, and after each learner turn she runs
 * one full upgrade loop through the real tool gate. Never used in production.
 */
export const openFakeStage: StageSessionFactory = async (opts: StageOpenOptions): Promise<StageSession> => {
  const h = opts.handlers;
  let closed = false;
  let turn = 0;
  let callId = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!closed) fn();
    }, ms);
    timers.add(t);
  };

  const speak = (text: string, then?: () => void) => {
    const words = text.split(" ");
    words.forEach((w, i) => later(120 * i, () => h.onTranscript("may", (i ? " " : "") + w, false)));
    const chunks = Math.max(4, Math.round(words.length * 1.5));
    for (let c = 0; c < chunks; c += 1) later(80 + c * 100, () => h.onAudio(tone(0.1, 196 + (c % 3) * 24)));
    later(120 + chunks * 100, () => {
      h.onUsage({ prompt: 400, response: 60 });
      h.onTurnComplete();
      then?.();
    });
  };

  const item = opts.stage.items[0];
  const pool = opts.stage.pool[0];

  return {
    sendAudio: () => {},
    sendAudioStreamEnd: () => {
      turn += 1;
      later(350, () => {
        h.onTranscript("learner", "I did the project last year", true);
        if (!item || !pool || turn > 2) {
          speak("Nice, tell me more about that.", () => {
            if (turn > 2) h.onToolCall({ id: `f${(callId += 1)}`, name: "stage_wrap_ready", args: { note: "Fake stage done; learner relaxed." } });
          });
          return;
        }
        h.onToolCall({ id: `f${(callId += 1)}`, name: "log_acknowledge", args: { item_id: item.id, quoted: "last year" } });
        h.onToolCall({
          id: `f${(callId += 1)}`,
          name: "offer_upgrade",
          args: { item_id: item.id, learner_said: pool.trigger, better_line: pool.upgrade, reason_my: pool.glossMy, source: "pool", pool_id: pool.id },
        });
        speak(`I love that you said last year. Try this: ${pool.upgrade}.`);
      });
    },
    sendText: (_text, o) => {
      if (o?.generate === false) return;
      later(300, () => speak(opts.stage.openingLineMy));
    },
    sendToolResponse: () => {},
    close: () => {
      closed = true;
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
  };
};

function tone(seconds: number, hz: number): Buffer {
  const n = Math.round(seconds * MAY_SAMPLE_RATE);
  const buf = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i += 1) {
    const env = Math.sin((Math.PI * i) / n);
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / MAY_SAMPLE_RATE) * env * 2500), i * 2);
  }
  return buf;
}
