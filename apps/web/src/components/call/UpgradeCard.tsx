import type { UpgradeCard as Card } from "@may/shared";
import type { Copy } from "@/lib/copy";

/**
 * Noticing the gap (Schmidt; design canvas card 04): what they said sits right above the better line.
 * Framed as May's words, never as an error: no red, no "wrong" (R-FA-6).
 */
export function UpgradeCard({ card, copy }: { card: Card; copy: Copy }) {
  return (
    <section
      aria-live="polite"
      className="animate-in fade-in slide-in-from-bottom-2 rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/10 backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-200">
          <span className="inline-block size-2 rounded-full bg-gradient-to-br from-amber-200 to-rose-400" />
          {copy.upgradeTitle}
        </p>
        <span className="text-xs tabular-nums text-white/40">
          {card.index}/{card.total}
        </span>
      </div>
      <p className="mt-3 text-sm text-white/45">
        {copy.youSaid}: “{card.learnerSaid}”
      </p>
      <p className="mt-1 text-xl font-semibold leading-snug text-white">{card.betterLine}</p>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-white/70">{card.reasonMy}</p>
    </section>
  );
}
