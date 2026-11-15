import { Suspense } from "react";
import { HomePage } from "./HomePage";

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-muted/60" />}>
      <HomePage />
    </Suspense>
  );
}
