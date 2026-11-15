import type { TranscriptLine } from "@/lib/call/reducer";
import { cn } from "@/lib/utils";

/** R-SE-6: learners at this level read faster than they hear, so the last few lines stay on screen. */
export function Transcript({ lines }: { lines: TranscriptLine[] }) {
  if (lines.length === 0) return null;
  return (
    <ol className="flex flex-col gap-1.5 text-[0.95rem] leading-snug" aria-label="transcript">
      {lines.map((l, i) => (
        <li
          key={i}
          className={cn(
            "max-w-[85%] rounded-2xl px-3 py-1.5 transition-opacity",
            l.role === "may" ? "self-start bg-white/[0.06] text-white/85" : "self-end bg-amber-200/10 text-amber-50/90",
            i < lines.length - 2 && "opacity-50",
          )}
        >
          {l.text}
        </li>
      ))}
    </ol>
  );
}
