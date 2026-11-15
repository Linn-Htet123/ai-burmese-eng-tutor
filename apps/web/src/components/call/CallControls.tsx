import { Languages, Pause, PhoneOff, Play } from "lucide-react";
import type { Copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface Props {
  paused: boolean;
  copy: Copy;
  onPause: () => void;
  onResume: () => void;
  onBurmese: () => void;
  onEnd: () => void;
}

/** Low cognitive load (design canvas card 05): three buttons, nothing else while talking. */
export function CallControls({ paused, copy, onPause, onResume, onBurmese, onEnd }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <RoundButton label={paused ? copy.resume : copy.pause} onClick={paused ? onResume : onPause}>
        {paused ? <Play className="size-6" /> : <Pause className="size-6" />}
      </RoundButton>
      <RoundButton label={copy.burmese} onClick={onBurmese} disabled={paused}>
        <Languages className="size-6" />
      </RoundButton>
      <RoundButton label={copy.end} onClick={onEnd} tone="end">
        <PhoneOff className="size-6" />
      </RoundButton>
    </div>
  );
}

function RoundButton({
  label,
  onClick,
  children,
  disabled,
  tone,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  tone?: "end";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-center gap-2 text-xs text-white/60 disabled:opacity-40"
    >
      <span
        className={cn(
          "grid size-16 place-items-center rounded-full transition active:scale-95",
          tone === "end" ? "bg-white text-[#2a1a24]" : "bg-white/10 text-white group-hover:bg-white/15",
        )}
      >
        {children}
      </span>
      {label}
    </button>
  );
}
