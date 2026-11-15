"use client";

import Link from "next/link";
import { useState } from "react";
import { Mic } from "lucide-react";
import type { SessionLength } from "@may/shared";
import { Card, CardContent } from "@/components/ui/card";
import { COPY, type Lang } from "@/lib/copy";
import { cn } from "@/lib/utils";

const LENGTHS: SessionLength[] = [10, 20, 40];

/** Today screen (design canvas A5): one decision, one button, and May speaking first. */
export function TodayCard({ lang, name }: { lang: Lang; name: string }) {
  const copy = COPY[lang];
  const [length, setLength] = useState<SessionLength>(20);
  const other: Lang = lang === "my" ? "en" : "my";

  return (
    <main className="flex min-h-dvh justify-center bg-muted/60">
      <div className="flex w-full max-w-md flex-col gap-6 px-4 pb-10 pt-10">
        <header className="flex items-start justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">{copy.greeting(name)}</h1>
          <Link href={`/?lang=${other}`} className="pt-2 text-sm font-medium text-primary">
            {copy.langToggle}
          </Link>
        </header>

        <div className="flex items-start gap-3">
          <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-200 via-orange-300 to-rose-400 text-sm font-semibold text-white shadow-sm">
            M
          </span>
          <p className="rounded-2xl rounded-tl-sm bg-card px-4 py-3 text-[1.02rem] leading-relaxed shadow-sm ring-1 ring-foreground/5">
            {copy.mayToday}
          </p>
        </div>

        <Card className="rounded-3xl">
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">{copy.howLong}</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label={copy.howLong}>
              {LENGTHS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={length === l}
                  onClick={() => setLength(l)}
                  className={cn(
                    "rounded-lg py-2.5 text-sm font-medium transition",
                    length === l ? "bg-background shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {copy.minutes(l)}
                </button>
              ))}
            </div>
            <Link
              href={`/call?length=${length}&lang=${lang}`}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition active:scale-[0.99]"
            >
              <Mic className="size-5" />
              {copy.start(length)}
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
