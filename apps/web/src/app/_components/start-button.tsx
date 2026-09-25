"use client";

import { Button } from "@/components/ui/button";
import {
  useVoiceStream,
  type VoiceStreamStatus,
} from "../_hooks/use-voice-stream";

const VOICE_WS_URL =
  process.env.NEXT_PUBLIC_VOICE_WS_URL ?? "ws://localhost:8000/voice";

const statusLabel: Record<VoiceStreamStatus, string> = {
  idle: "Tap Start when you're ready.",
  connecting: "Connecting to May…",
  streaming: "Listening — say something.",
  reconnecting: "Reconnecting to May… keep talking.",
  error: "Something went wrong. Try again.",
};

export function StartButton() {
  const voice = useVoiceStream({ url: VOICE_WS_URL });

  const handleStart = () => {
    void voice.start();
  };

  const handleStop = () => {
    voice.stop();
  };

  const isActive =
    voice.status === "connecting" ||
    voice.status === "streaming" ||
    voice.status === "reconnecting";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3">
        <Button
          onClick={handleStart}
          size="lg"
          disabled={isActive}
          data-testid="voice-start-button"
        >
          {voice.status === "connecting" ? "Connecting…" : "Start"}
        </Button>
        {isActive ? (
          <Button
            onClick={handleStop}
            size="lg"
            variant="outline"
            data-testid="voice-stop-button"
          >
            Stop
          </Button>
        ) : null}
      </div>
      <p
        className="text-sm text-muted-foreground"
        data-testid="voice-status"
        data-status={voice.status}
      >
        {statusLabel[voice.status]}
      </p>
      {isActive ? (
        <p
          className="text-xs text-muted-foreground"
          data-testid="voice-debug"
          data-socket-status={voice.status}
        >
          status: {voice.status} · sent: {voice.bytesSent} · recv:{" "}
          {voice.bytesReceived}
        </p>
      ) : null}
      {voice.error ? (
        <p className="text-xs text-destructive" data-testid="voice-error">
          {voice.error.message}
        </p>
      ) : null}
    </div>
  );
}
