"""Smoke test — proves the voice loop wires together against real Gemini Live.

Run with:
    cd apps/api
    uv run python scripts/smoke_voice_loop.py

Requires a real GEMINI_API_KEY in .env. The script pushes a hardcoded
"hello" turn as if the learner just said it, waits ~15 seconds for May
to respond, then prints anything the LLMLogObserver captured. This is
piece 6 of T1 — the end-to-end sanity that unit tests cannot prove.
"""

import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

# Make src.* importable when running the script directly.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipecat.frames.frames import TranscriptionFrame
from pipecat.workers.runner import WorkerRunner

from src.config import get_settings
from src.voice.handlers import LLMLogObserver
from src.voice.pipeline import create_voice_pipeline, create_voice_worker

SYSTEM_PROMPT = """You are May, a friendly English tutor for Burmese adults.

After every practice attempt the learner makes, you MUST:
1. Reply with one short English sentence of encouragement and a better phrase.
2. Call the log_item function to record the exchange:
   - practiced_phrase: exactly what the learner said
   - offered_upgrade: the stronger phrase you offered
   - grade: fluent | hesitant | failed

Even for casual chat, still call log_item with grade="fluent"."""

LEARNER_TURN = "Hello May, I want to practice talking about my job."


async def run_smoke() -> None:
    settings = get_settings()
    observer = LLMLogObserver()

    pipeline = create_voice_pipeline(
        api_key=settings.gemini_api_key,
        system_prompt=SYSTEM_PROMPT,
    )
    worker = create_voice_worker(pipeline, observer)
    runner = WorkerRunner()
    await runner.add_workers(worker)

    async def push_turn_then_wait() -> None:
        # Give the pipeline a moment to open the Gemini socket.
        await asyncio.sleep(2)
        print(f"[smoke] pushing learner turn: {LEARNER_TURN!r}")
        await worker.queue_frame(
            TranscriptionFrame(
                text=LEARNER_TURN,
                user_id="smoke-learner",
                timestamp=datetime.now(UTC).isoformat(),
                finalized=True,
            )
        )
        # Wait long enough for May to respond and (hopefully) call log_item.
        await asyncio.sleep(15)
        print("[smoke] wait window ended, cancelling runner")
        await runner.cancel(reason="smoke test window elapsed")

    await asyncio.gather(runner.run(auto_end=False), push_turn_then_wait())

    print("\n[smoke] captured item log entries:")
    if not observer.entries:
        print("  (none — Gemini may not have called log_item this run)")
    for entry in observer.entries:
        print(f"  - practiced: {entry.practiced_phrase!r}")
        print(f"    upgrade:   {entry.offered_upgrade!r}")
        print(f"    grade:     {entry.grade}")


if __name__ == "__main__":
    asyncio.run(run_smoke())
