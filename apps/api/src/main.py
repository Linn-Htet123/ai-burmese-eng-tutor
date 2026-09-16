from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.config import get_settings


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


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
