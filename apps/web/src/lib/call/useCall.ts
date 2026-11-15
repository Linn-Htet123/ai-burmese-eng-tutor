"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { ServerMessageSchema, type ClientMessage, type SessionLength } from "@may/shared";
import { startMic, type MicHandle } from "../audio/mic";
import { downsampleToPcm16, rms } from "../audio/pcm";
import { PcmPlayer } from "../audio/player";
import { EnergyVad } from "../audio/vad";
import { callReducer, initialCallState } from "./reducer";

/** ~200 ms of audio kept before the VAD fires so the first syllable is not clipped. */
const PREROLL_FRAMES = 10;

interface Live {
  ws: WebSocket | null;
  ctx: AudioContext | null;
  player: PcmPlayer | null;
  mic: MicHandle | null;
  vad: EnergyVad;
  preroll: ArrayBuffer[];
  paused: boolean;
  micLevel: number;
}

export function voiceUrl(length: SessionLength): string {
  const base =
    process.env.NEXT_PUBLIC_VOICE_URL ??
    `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:8787/ws`;
  return `${base}?length=${length}`;
}

export function useCall(length: SessionLength) {
  const [state, dispatch] = useReducer(callReducer, initialCallState);
  const live = useRef<Live>({ ws: null, ctx: null, player: null, mic: null, vad: new EnergyVad(), preroll: [], paused: false, micLevel: 0 });

  const send = useCallback((m: ClientMessage) => {
    const ws = live.current.ws;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  }, []);

  const teardown = useCallback(() => {
    const l = live.current;
    l.mic?.stop();
    l.player?.flush();
    if (l.ws && l.ws.readyState <= WebSocket.OPEN) l.ws.close();
    void l.ctx?.close();
    l.ws = null;
    l.mic = null;
    l.player = null;
    l.ctx = null;
    l.vad.reset();
    l.preroll = [];
  }, []);

  /** Must run inside the tap handler: iOS only unlocks audio from a user gesture. */
  const start = useCallback(async () => {
    dispatch({ type: "connect" });
    const l = live.current;
    try {
      const ctx = new AudioContext();
      await ctx.resume();
      l.ctx = ctx;
      l.player = new PcmPlayer(ctx, () => send({ type: "playback_done" }));

      const ws = new WebSocket(voiceUrl(length));
      ws.binaryType = "arraybuffer";
      l.ws = ws;
      ws.onmessage = (e: MessageEvent<ArrayBuffer | string>) => {
        if (typeof e.data !== "string") {
          l.player?.enqueue(e.data);
          return;
        }
        const parsed = ServerMessageSchema.safeParse(JSON.parse(e.data));
        if (!parsed.success) return;
        const msg = parsed.data;
        if (msg.type === "interrupted") l.player?.flush();
        dispatch({ type: "server", msg, at: Date.now() });
      };
      ws.onclose = () => dispatch({ type: "socket_closed" });
      ws.onerror = () => dispatch({ type: "fail", message: "socket error" });
      await new Promise<void>((resolve, reject) => {
        ws.addEventListener("open", () => resolve(), { once: true });
        ws.addEventListener("error", () => reject(new Error("could not reach the voice gateway")), { once: true });
      });
      send({ type: "hello", sessionId: "web" });

      l.mic = await startMic(ctx, (frame) => {
        const level = rms(frame);
        l.micLevel = level;
        if (l.paused) return;
        const pcm = downsampleToPcm16(frame, ctx.sampleRate).buffer as ArrayBuffer;
        const edge = l.vad.push(level);
        if (edge === "start") {
          send({ type: "vad", speaking: true });
          for (const p of l.preroll) l.ws?.send(p);
          l.preroll = [];
        }
        if (l.vad.speaking || edge === "end") {
          l.ws?.send(pcm);
        } else {
          l.preroll.push(pcm);
          if (l.preroll.length > PREROLL_FRAMES) l.preroll.shift();
        }
        if (edge === "end") send({ type: "vad", speaking: false });
      });
    } catch (err) {
      dispatch({ type: "fail", message: err instanceof Error ? err.message : String(err) });
      teardown();
    }
  }, [length, send, teardown]);

  const pause = useCallback(() => {
    live.current.paused = true;
    live.current.vad.reset();
    send({ type: "control", action: "pause" });
    dispatch({ type: "pause" });
  }, [send]);

  const resume = useCallback(() => {
    live.current.paused = false;
    send({ type: "control", action: "resume" });
    dispatch({ type: "resume" });
  }, [send]);

  const burmese = useCallback(() => send({ type: "control", action: "burmese" }), [send]);

  const end = useCallback(() => {
    send({ type: "control", action: "end" });
  }, [send]);

  /** Read by the orb's animation loop; never during render. */
  const levels = useCallback(() => ({ mic: live.current.micLevel, may: live.current.player?.level() ?? 0 }), []);

  useEffect(() => {
    if (state.phase === "ended" || state.phase === "error") teardown();
  }, [state.phase, teardown]);

  useEffect(() => teardown, [teardown]);

  return { state, start, pause, resume, burmese, end, levels };
}
