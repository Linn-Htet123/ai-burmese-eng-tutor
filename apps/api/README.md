# apps/api — FastAPI + Pipecat backend

Backend for the week-one voice pipeline spike (ABET-11). Wires the browser mic to Gemini Live via Pipecat, captures the structured item log, and writes raw PCM + a JSONL frame log to `/tmp/{session_id}/` for post-hoc analysis.

Spec + design + tickets: `docs/changes/ABET-11-week-one-spike/`.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- A Gemini API key from <https://aistudio.google.com/apikey>

## Setup

```bash
cd apps/api
uv sync
cp .env.example .env
# edit .env — set GEMINI_API_KEY
```

## Run the dev server

```bash
uv run uvicorn src.main:app --reload --port 8000
```

The FastAPI app answers on `http://localhost:8000` and the voice WebSocket lives at `ws://localhost:8000/voice`.

To reach it from a real phone (for the Yangon latency test), open a second terminal:

```bash
npx cloudflared tunnel --url http://localhost:8000
```

Cloudflared prints a public HTTPS URL. Point the frontend at it.

## Tests

```bash
uv run pytest
```

Test titles carry the scenario id: `S1 happy: ...`, `S2 edge: ...`. See the spec at `docs/changes/ABET-11-week-one-spike/spec.md` for R1-R6.

## Project layout

```
apps/api/
├── pyproject.toml
├── .env.example
├── src/
│   ├── main.py           # FastAPI app factory
│   ├── config.py         # BaseSettings — env vars
│   └── voice/            # Pipecat + Gemini Live
│       ├── pipeline.py   # Pipeline factory
│       └── handlers.py   # LLMLogObserver + capture
└── tests/
    └── voice/
        └── test_pipeline.py
```

Follows the domain-first structure from `.claude/rules/backend.md`.
