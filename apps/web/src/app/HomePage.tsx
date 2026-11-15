"use client";

import { useSearchParams } from "next/navigation";
import { TodayCard } from "@/components/TodayCard";

export function HomePage() {
  const lang = useSearchParams().get("lang") === "en" ? "en" : "my";
  return <TodayCard lang={lang} name="Thura" />;
}
