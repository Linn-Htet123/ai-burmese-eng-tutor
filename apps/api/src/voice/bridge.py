"""Browser <-> Gemini Live raw WebSocket bridge.

Mirrors Downloads/burmese-tutor/server.mjs but in Python. Two async
tasks per session: browser mic -> Gemini, and Gemini audio -> browser.

Skipping Pipecat here because its Gemini Live adapter (a) hides the
turn-boundary frames we need to measure and (b) downgrades NON_BLOCKING
tools to blocking on gemini-3.*, stalling audio ~1s per learner turn.
"""

import asyncio
import base64
import json
import logging
import time
from dataclasses import dataclass
from typing import Any

import websockets
from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger(__name__)


def _trace(msg: str) -> None:
    """Bypass uvicorn's log-level filtering for the first-turn trace lines.

    Uvicorn's default config leaves the root logger at WARNING, which
    swallows every `logger.info(...)` we make from application modules.
    Using `print(flush=True)` guarantees the line lands in the terminal
    that's tailing uvicorn, which is what we actually watch during
    latency debugging.
    """
    print(f"[bridge] {msg}", flush=True)


@dataclass
class _TurnTimer:
    """Shared timestamps across the two forwarder tasks.

    Kept mutable + shared so we can trace where the wall-clock goes
    without threading extra args through every send/recv call.
    """

    started_at: float
    first_bot_audio_at: float | None = None
    ready_sent: bool = False

    def stamp_ms(self) -> int:
        return int((time.monotonic() - self.started_at) * 1000)

GEMINI_LIVE_URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)
GEMINI_LIVE_MODEL = "gemini-3.1-flash-live-preview"
INPUT_SAMPLE_RATE = 16000


def _build_setup(system_prompt: str) -> dict[str, Any]:
    # Kept deliberately minimal: this is the smallest setup the demo at
    # Downloads/burmese-tutor uses (minus the languageCode we chose to
    # skip because we're teaching English-first). Add voice, transcript,
    # compression, and resumption ONE AT A TIME in later chunks — if we
    # add them all at once and Gemini closes with 1008 policy-violation
    # we won't know which field it hated.
    return {
        "setup": {
            "model": f"models/{GEMINI_LIVE_MODEL}",
            "generationConfig": {"responseModalities": ["AUDIO"]},
            "systemInstruction": {"parts": [{"text": system_prompt}]},
        }
    }


def _build_priming_turn() -> dict[str, Any]:
    """Nudge Gemini to speak first, before the learner does anything.

    Two wins:
    - Hides Gemini's ~5-10s first-inference cold-start behind the
      browser's `connecting` spinner instead of the learner's first turn.
    - Gives the learner a warm greeting to react to — matches the
      natural rhythm of a phone-call tutor.

    The learner never sees this text; it just triggers the model's
    normal opening (defined in MAY_SYSTEM_PROMPT).
    """
    return {
        "clientContent": {
            "turns": [
                {
                    "role": "user",
                    "parts": [{"text": "[session start]"}],
                }
            ],
            "turnComplete": True,
        }
    }


def _decode(raw: str | bytes) -> dict[str, Any] | None:
    """Gemini Live sends JSON as bytes on the Python websockets client."""
    if isinstance(raw, (bytes, bytearray)):
        raw = raw.decode("utf-8")
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return None


async def _wait_for_setup_complete(gemini_ws) -> None:
    while True:
        raw = await gemini_ws.recv()
        msg = _decode(raw)
        if msg is None:
            continue
        if msg.get("setupComplete") is not None:
            return
        _trace(f"pre-setup message keys={list(msg.keys())}")


async def _browser_to_gemini(
    browser_ws: WebSocket, gemini_ws, timer: _TurnTimer
) -> None:
    """Forward browser mic (16kHz PCM binary) to Gemini as base64 audio."""
    seen_first = False
    try:
        while True:
            try:
                data = await browser_ws.receive_bytes()
            except WebSocketDisconnect:
                return
            if not seen_first:
                seen_first = True
                _trace(f"t={timer.stamp_ms()}ms first mic PCM from browser")
            b64 = base64.b64encode(data).decode("ascii")
            await gemini_ws.send(
                json.dumps(
                    {
                        "realtimeInput": {
                            "audio": {
                                "mimeType": f"audio/pcm;rate={INPUT_SAMPLE_RATE}",
                                "data": b64,
                            }
                        }
                    }
                )
            )
    except ConnectionClosed:
        # Gemini dropped us (goAway, session timeout, network). The
        # gemini→browser task will notice via `async for` exit and end
        # the run_bridge wait cycle. Nothing further to do here.
        return


async def _gemini_to_browser(
    gemini_ws, browser_ws: WebSocket, timer: _TurnTimer
) -> None:
    """Forward Gemini audio (24kHz PCM) back to the browser.

    Also owns the browser `ready` signal — we don't flip the browser
    from `connecting` to `streaming` until the first byte of May's
    greeting is on its way. That way the ~5-10s Gemini cold-start hides
    inside the connecting spinner instead of the learner's first turn.
    """
    try:
        async for raw in gemini_ws:
            msg = _decode(raw)
            if msg is None:
                continue

            server_content = msg.get("serverContent")
            if server_content is None:
                if msg.get("error"):
                    _trace(f"upstream error: {msg['error']}")
                continue

            if server_content.get("interrupted"):
                try:
                    await browser_ws.send_text(
                        json.dumps({"type": "interrupted"})
                    )
                except (WebSocketDisconnect, RuntimeError):
                    return

            for part in server_content.get("modelTurn", {}).get("parts", []):
                inline = part.get("inlineData")
                if inline and (inline.get("mimeType", "")).startswith("audio/"):
                    if timer.first_bot_audio_at is None:
                        timer.first_bot_audio_at = time.monotonic()
                        _trace(
                            f"t={timer.stamp_ms()}ms first bot audio out"
                        )
                    if not timer.ready_sent:
                        try:
                            await browser_ws.send_text(
                                json.dumps({"type": "ready"})
                            )
                        except (WebSocketDisconnect, RuntimeError):
                            return
                        timer.ready_sent = True
                        _trace(
                            f"t={timer.stamp_ms()}ms ready sent — "
                            f"browser can flip to streaming now"
                        )
                    audio_bytes = base64.b64decode(inline["data"])
                    try:
                        await browser_ws.send_bytes(audio_bytes)
                    except (WebSocketDisconnect, RuntimeError):
                        return
    except ConnectionClosed:
        return


async def run_bridge(
    browser_ws: WebSocket,
    api_key: str,
    system_prompt: str,
) -> None:
    """Bridge one browser session end-to-end through Gemini Live.

    Opens Gemini's WebSocket the moment the browser is accepted — the
    setup handshake runs in parallel with the browser's own mic +
    AudioContext wiring, so first-turn cold-start is hidden inside the
    browser's connecting spinner instead of the first spoken turn.
    """
    timer = _TurnTimer(started_at=time.monotonic())
    _trace("t=0ms browser accepted, connecting to Gemini upstream…")
    url = f"{GEMINI_LIVE_URL}?key={api_key}"
    async with websockets.connect(url, max_size=None) as gemini_ws:
        _trace(f"t={timer.stamp_ms()}ms Gemini WS open")

        await gemini_ws.send(json.dumps(_build_setup(system_prompt)))
        await _wait_for_setup_complete(gemini_ws)
        _trace(f"t={timer.stamp_ms()}ms setupComplete received")

        # Kick Gemini into its first inference NOW so its cold-start
        # runs while the browser is still showing "connecting". The
        # browser only sees `ready` once May's greeting audio is on the
        # way — see _gemini_to_browser for that handoff.
        await gemini_ws.send(json.dumps(_build_priming_turn()))
        _trace(
            f"t={timer.stamp_ms()}ms priming turn sent, waiting for greeting…"
        )

        tasks = [
            asyncio.create_task(_browser_to_gemini(browser_ws, gemini_ws, timer)),
            asyncio.create_task(_gemini_to_browser(gemini_ws, browser_ws, timer)),
        ]
        try:
            _, pending = await asyncio.wait(
                tasks, return_when=asyncio.FIRST_COMPLETED
            )
            for t in pending:
                t.cancel()
        finally:
            for t in tasks:
                if not t.done():
                    t.cancel()
