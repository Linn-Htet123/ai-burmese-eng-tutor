"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SessionLengthSchema, type SessionLength } from "@may/shared";
import { Button } from "@/components/ui/button";
import { median, stageMinutesLeft } from "@/lib/call/reducer";
import { useCall } from "@/lib/call/useCall";
import { COPY, type Lang } from "@/lib/copy";
import { CallControls } from "./CallControls";
import { Transcript } from "./Transcript";
import { UpgradeCard } from "./UpgradeCard";
import { VoiceOrb } from "./VoiceOrb";

export function CallScreen({ length: rawLength, lang, debug }: { length: number; lang: Lang; debug: boolean }) {
  const parsed = SessionLengthSchema.safeParse(rawLength);
  const length: SessionLength = parsed.success ? parsed.data : 20;
  const copy = COPY[lang];
  const { state, start, pause, resume, burmese, end, levels } = useCall(length);
  const now = useNow(state.phase === "live" || state.phase === "paused");

  if (state.phase === "idle" || state.phase === "connecting") {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <VoiceOrb state={state.phase === "connecting" ? "thinking" : "listening"} levels={levels} label="May" />
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold text-white">{copy.precallTitle}</h1>
            <p className="mx-auto max-w-xs text-white/60">{copy.precallBody}</p>
          </div>
        </div>
        <Button
          size="lg"
          className="h-14 w-full rounded-2xl bg-white text-base font-semibold text-[#2a1a24] hover:bg-white/90"
          disabled={state.phase === "connecting"}
          onClick={() => void start()}
        >
          {state.phase === "connecting" ? copy.connecting : copy.call}
        </Button>
      </Shell>
    );
  }

  if (state.phase === "ended" || state.phase === "error") {
    const isError = state.phase === "error" || state.endedReason === "error";
    return (
      <Shell>
        <div className="flex flex-1 flex-col justify-center gap-4">
          <h1 className="text-3xl font-semibold text-white">{isError ? copy.trouble : copy.endedTitle}</h1>
          {!isError && <p className="text-lg text-white/70">{copy.endedBody}</p>}
          {debug && <Metrics state={state} />}
        </div>
        <div className="grid gap-3">
          <Button
            size="lg"
            className="h-14 rounded-2xl bg-white text-base font-semibold text-[#2a1a24] hover:bg-white/90"
            onClick={() => window.location.reload()}
          >
            {copy.again}
          </Button>
          <Link href={`/?lang=${lang}`} className="py-2 text-center text-white/60">
            {copy.home}
          </Link>
        </div>
      </Shell>
    );
  }

  const left = stageMinutesLeft(state.stage, now);
  const compact = state.upgrade !== null;
  return (
    <Shell fixed>
      <header className="text-center">
        <p className="text-lg font-semibold text-white">May</p>
        {state.stage && (
          <p className="mt-0.5 text-sm text-white/55">
            {copy.stage[state.stage.kind]}
            {left !== null && ` · ${copy.remaining(left)}`}
          </p>
        )}
        {state.stage && (
          <div className="mx-auto mt-3 flex w-28 gap-1.5" aria-hidden>
            {Array.from({ length: state.stage.total }, (_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i <= (state.stage?.index ?? 0) ? "bg-amber-200/80" : "bg-white/15"}`} />
            ))}
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 py-3">
        <VoiceOrb state={state.may} levels={levels} label={copy.state[state.may]} compact={compact} />
        <p className="h-6 text-white/70" aria-live="polite">
          {state.phase === "paused" ? copy.paused : copy.state[state.may]}
        </p>
      </div>

      <div className="flex min-h-0 shrink flex-col gap-3 overflow-y-auto pb-4">
        <Transcript lines={compact ? state.transcript.slice(-2) : state.transcript} />
        {state.upgrade && <UpgradeCard card={state.upgrade} copy={copy} />}
        {debug && <Metrics state={state} />}
      </div>

      <div className="shrink-0">
        <CallControls paused={state.phase === "paused"} copy={copy} onPause={pause} onResume={resume} onBurmese={burmese} onEnd={end} />
      </div>
    </Shell>
  );
}

/** `fixed` pins the live call to one screen so the controls never scroll away. */
function Shell({ children, fixed }: { children: React.ReactNode; fixed?: boolean }) {
  return (
    <main className={`call-bg flex justify-center ${fixed ? "h-dvh overflow-hidden" : "min-h-dvh"}`}>
      <div className={`flex w-full max-w-md flex-col px-4 ${fixed ? "h-full pb-6 pt-8" : "pb-8 pt-10"}`}>{children}</div>
    </main>
  );
}

/** The spike's numbers on screen (R-TE-1 < 1s, R-SE-8 ≤ 300ms). Shown with ?debug=1. */
function Metrics({ state }: { state: ReturnType<typeof useCall>["state"] }) {
  const r = median(state.metrics.responseMs);
  const b = median(state.metrics.bargeInMs);
  return (
    <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-black/30 p-3 font-mono text-xs text-white/70">
      <div>
        <dt className="text-white/40">response p50</dt>
        <dd className={r !== null && r < 1000 ? "text-emerald-300" : ""}>{r === null ? "–" : `${Math.round(r)} ms`}</dd>
      </div>
      <div>
        <dt className="text-white/40">barge-in p50</dt>
        <dd className={b !== null && b <= 300 ? "text-emerald-300" : ""}>{b === null ? "–" : `${Math.round(b)} ms`}</dd>
      </div>
      <div>
        <dt className="text-white/40">samples</dt>
        <dd>
          {state.metrics.responseMs.length}/{state.metrics.bargeInMs.length}
        </dd>
      </div>
      {state.metrics.tokens && (
        <div className="col-span-3">
          tokens in {state.metrics.tokens.prompt} · out {state.metrics.tokens.response}
        </div>
      )}
    </dl>
  );
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}
