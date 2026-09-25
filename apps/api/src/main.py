from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.voice.router import router as voice_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.spike_capture_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="ai-burmese-eng-tutor spike",
    description="Week-one voice pipeline spike (ABET-11).",
    lifespan=lifespan,
)

# Local dev only — Next.js runs on :3000, FastAPI on :8000. Loosen up so the
# browser can hit the WebSocket. Production hosting narrows this later.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
