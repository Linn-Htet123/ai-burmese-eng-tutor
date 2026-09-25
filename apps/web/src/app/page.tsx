import { StartButton } from "./_components/start-button";

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          Talk with May
        </h1>
        <p className="mt-3 text-muted-foreground">
          Practice English with your AI tutor.
        </p>
      </div>
      <StartButton />
    </main>
  );
}
