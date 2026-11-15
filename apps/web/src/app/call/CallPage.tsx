"use client";

import { useSearchParams } from "next/navigation";
import { CallScreen } from "@/components/call/CallScreen";

export function CallPage() {
  const params = useSearchParams();
  const lang = params.get("lang") === "en" ? "en" : "my";
  return <CallScreen length={Number(params.get("length") ?? 20)} lang={lang} debug={params.get("debug") === "1"} />;
}
