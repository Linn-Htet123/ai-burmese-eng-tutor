"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Gemini Live is asymmetric on sample rate: 16kHz PCM in, 24kHz PCM out.
const CAPTURE_SAMPLE_RATE = 16000;
const PLAYBACK_SAMPLE_RATE = 24000;

const WORKLET_URL = "/audio-worklet.js";

// A tiny cushion added when scheduling the first chunk — protects against
// underruns while later chunks are still on the wire.
const PLAYBACK_CUSHION_SEC = 0.06;

// Exponential-ish backoff for reconnects. Backend `uvicorn --reload` restarts
// in ~200-500ms, so the first retry lands almost immediately. Cap at 8s so we
// don't leave the user staring at a dead status for a minute.
const RECONNECT_DELAYS_MS = [250, 500, 1000, 2000, 4000, 8000] as const;

export type VoiceStreamStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "reconnecting"
  | "error";

type UseVoiceStreamOptions = {
  url: string;
};

type UseVoiceStreamReturn = {
  status: VoiceStreamStatus;
  error: Error | null;
  bytesSent: number;
  bytesReceived: number;
  start: () => Promise<void>;
  stop: () => void;
};

function pcm16ToFloat(buffer: ArrayBuffer): Float32Array {
  const pcm = new Int16Array(buffer);
  const float = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    float[i] = pcm[i] / 0x8000;
  }
  return float;
}

/**
 * Owns the mic → 16kHz PCM → WebSocket path and the 24kHz playback context
 * for audio coming back from Pipecat/Gemini.
 *
 * Also auto-reconnects on WebSocket close (survives `uvicorn --reload` and
 * transient network blips). Mic capture, audio contexts, and playback state
 * stay alive across reconnects — only the socket itself gets recreated.
 */
export function useVoiceStream({
  url,
}: UseVoiceStreamOptions): UseVoiceStreamReturn {
  const [status, setStatus] = useState<VoiceStreamStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [bytesSent, setBytesSent] = useState(0);
  const [bytesReceived, setBytesReceived] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  // Gapless playback: next chunk starts where the previous chunk ends.
  const nextPlayTimeRef = useRef<number>(0);
  // Every scheduled May-audio chunk lives here until it finishes. On
  // barge-in we call stop(0) on every one at once so the buffered
  // ~1-2s of speech doesn't keep playing over the learner.
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  // Explicit user intent — true after start(), false after stop(). The
  // onclose handler uses this to decide whether to reconnect or give up.
  const wantsStreamRef = useRef<boolean>(false);
  // Flipped true only after the backend sends `{"type":"ready"}`, which
  // means Gemini's handshake is done and it's safe to stream mic audio.
  // Sending PCM before this hits a still-warming model and the first turn
  // feels sluggish.
  const upstreamReadyRef = useRef<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePlayback = useCallback((buffer: ArrayBuffer) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;
    const float = pcm16ToFloat(buffer);
    if (float.length === 0) return;
    const audioBuffer = ctx.createBuffer(1, float.length, PLAYBACK_SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    // Remove the source from the tracked list as soon as it finishes so
    // the array doesn't grow unbounded across a long lesson. onended
    // fires both on natural completion and on explicit stop().
    source.onended = () => {
      const arr = scheduledSourcesRef.current;
      const idx = arr.indexOf(source);
      if (idx !== -1) arr.splice(idx, 1);
    };
    const now = ctx.currentTime;
    if (nextPlayTimeRef.current < now) {
      nextPlayTimeRef.current = now + PLAYBACK_CUSHION_SEC;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
    scheduledSourcesRef.current.push(source);
  }, []);

  const stopAllPlayback = useCallback(() => {
    // Kill every scheduled source so barge-in feels instant. Playback
    // clock resets to 0 so the next batch of May-audio starts fresh
    // instead of stacking behind a stale nextPlayTime.
    for (const source of scheduledSourcesRef.current) {
      try {
        source.stop(0);
      } catch {
        // Already stopped or never started — safe to ignore.
      }
    }
    scheduledSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
  }, []);

  const openSocket = useCallback(() => {
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    socketRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      // Every fresh socket restarts the handshake — mic capture stays
      // gated until the backend confirms Gemini is warm.
      upstreamReadyRef.current = false;
      // First connect: wire up the mic → worklet → send path once. On
      // reconnects the worklet already exists and reads socketRef.current
      // + upstreamReadyRef.current dynamically, so there is nothing else
      // to wire.
      if (!workletRef.current) {
        const inputCtx = inputCtxRef.current;
        const micStream = micStreamRef.current;
        if (!inputCtx || !micStream) return;
        const source = inputCtx.createMediaStreamSource(micStream);
        const worklet = new AudioWorkletNode(inputCtx, "capture");
        worklet.port.onmessage = (e) => {
          const data = e.data as ArrayBuffer;
          // Read refs dynamically so the worklet keeps working after a
          // reconnect swaps in a new WebSocket + a fresh ready handshake.
          const current = socketRef.current;
          if (!current || current.readyState !== WebSocket.OPEN) return;
          if (!upstreamReadyRef.current) return;
          current.send(data);
          setBytesSent((sent) => sent + data.byteLength);
        };
        // Worklets need a destination to be pulled by the audio graph. A
        // muted gain gives us that without any sound reaching the speakers.
        const mute = inputCtx.createGain();
        mute.gain.value = 0;
        source.connect(worklet);
        worklet.connect(mute).connect(inputCtx.destination);
        sourceRef.current = source;
        workletRef.current = worklet;
      }
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data) as { type?: string };
          if (msg.type === "ready") {
            upstreamReadyRef.current = true;
            setStatus("streaming");
          } else if (msg.type === "interrupted") {
            stopAllPlayback();
          }
        } catch {
          // Non-JSON text frame — ignore; the backend only sends control
          // JSON, so anything else is noise we can't act on.
        }
        return;
      }
      const data = event.data as ArrayBuffer;
      setBytesReceived((n) => n + data.byteLength);
      schedulePlayback(data);
    };

    ws.onerror = () => {
      // Don't setStatus("error") here — onclose runs right after and drives
      // the reconnect decision. onerror alone can't tell us whether the user
      // still wants to be streaming.
    };

    ws.onclose = () => {
      socketRef.current = null;
      if (!wantsStreamRef.current) {
        // User called stop() (or component unmounted). Silent close.
        return;
      }
      const attempt = reconnectAttemptsRef.current;
      if (attempt >= RECONNECT_DELAYS_MS.length) {
        setError(new Error("WebSocket dropped and reconnects exhausted"));
        setStatus("error");
        return;
      }
      setStatus("reconnecting");
      const delay = RECONNECT_DELAYS_MS[attempt];
      reconnectAttemptsRef.current = attempt + 1;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (wantsStreamRef.current) openSocket();
      }, delay);
    };
  }, [url, schedulePlayback, stopAllPlayback]);

  const teardown = useCallback(() => {
    wantsStreamRef.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptsRef.current = 0;

    // Kill any pending May-audio before we close contexts, otherwise
    // 1-2s of speech keeps playing after the user hits Stop.
    stopAllPlayback();

    try {
      workletRef.current?.port.postMessage("stop");
    } catch {
      // ignore — worklet may already be dead
    }
    try {
      workletRef.current?.disconnect();
    } catch {
      // ignore
    }
    try {
      sourceRef.current?.disconnect();
    } catch {
      // ignore
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    // AudioContext.close() may reject if already closing; ignore secondary
    // errors so we don't mask the original failure.
    void inputCtxRef.current?.close().catch(() => undefined);
    void outputCtxRef.current?.close().catch(() => undefined);
    try {
      socketRef.current?.close();
    } catch {
      // ignore
    }

    workletRef.current = null;
    sourceRef.current = null;
    micStreamRef.current = null;
    inputCtxRef.current = null;
    outputCtxRef.current = null;
    socketRef.current = null;
    nextPlayTimeRef.current = 0;
    upstreamReadyRef.current = false;
  }, [stopAllPlayback]);

  const start = useCallback(async () => {
    if (status !== "idle" && status !== "error") return;
    setError(null);
    setBytesSent(0);
    setBytesReceived(0);
    setStatus("connecting");
    wantsStreamRef.current = true;
    reconnectAttemptsRef.current = 0;

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = micStream;

      // Two contexts: capture at the device's native rate (the worklet
      // downsamples), playback fixed at 24kHz to match Gemini's output.
      const inputCtx = new AudioContext();
      const outputCtx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;

      await inputCtx.audioWorklet.addModule(WORKLET_URL);
      openSocket();
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      setError(wrapped);
      setStatus("error");
      teardown();
    }
  }, [status, openSocket, teardown]);

  const stop = useCallback(() => {
    teardown();
    setStatus("idle");
  }, [teardown]);

  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  return {
    status,
    error,
    bytesSent,
    bytesReceived,
    start,
    stop,
  };
}
