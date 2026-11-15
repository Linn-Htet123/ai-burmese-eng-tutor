"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { MayState } from "@may/shared";

interface Props {
  state: MayState;
  /** Live audio levels, read every animation frame (never during render). */
  levels: () => { mic: number; may: number };
  label: string;
  /** Smaller while an upgrade card needs the room. */
  compact?: boolean;
}

/**
 * May's presence on the call screen (change note decision 6): no avatar, a warm orb with three states.
 * listening → rings follow the learner's mic level · thinking → soft pulse and dots ·
 * speaking → rings and bars follow May's playback level. Driven by real gateway state, not a loop.
 */
export function VoiceOrb({ state, levels, label, compact = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    const loop = () => {
      const l = levels();
      const target = state === "listening" ? l.mic : state === "speaking" ? l.may : 0;
      smooth = smooth * 0.75 + Math.min(1, target * 8) * 0.25;
      ref.current?.style.setProperty("--level", smooth.toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state, levels]);

  return (
    <div ref={ref} data-state={state} data-compact={compact} className="voice-orb" role="img" aria-label={label}>
      <span className="voice-orb__ring voice-orb__ring--outer" />
      <span className="voice-orb__ring" />
      <span className="voice-orb__core">
        <span className="voice-orb__name">May</span>
      </span>
      <span className="voice-orb__dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span className="voice-orb__bars" aria-hidden>
        {[0.55, 0.85, 1, 0.8, 0.5].map((k, i) => (
          <i key={i} style={{ "--k": k, "--i": i } as CSSProperties} />
        ))}
      </span>
    </div>
  );
}
