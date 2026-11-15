import { Suspense } from "react";
import { CallPage } from "./CallPage";

export default function Page() {
  return (
    <Suspense fallback={<main className="call-bg min-h-dvh" />}>
      <CallPage />
    </Suspense>
  );
}
