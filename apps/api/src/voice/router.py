import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.config import get_settings
from src.voice.bridge import run_bridge
from src.voice.prompts import MAY_SYSTEM_PROMPT

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/voice")
async def voice_endpoint(websocket: WebSocket) -> None:
    """Accept one browser WebSocket and bridge it to Gemini Live."""
    await websocket.accept()
    settings = get_settings()
    try:
        await run_bridge(
            browser_ws=websocket,
            api_key=settings.gemini_api_key,
            system_prompt=MAY_SYSTEM_PROMPT,
        )
    except WebSocketDisconnect:
        # Expected on browser tab close — clean shutdown, not an error.
        pass
    except asyncio.CancelledError:
        # Uvicorn --reload uses cancellation to force fast shutdown;
        # re-raise so the reload cycle completes.
        raise
    except Exception:
        logger.exception("Voice bridge crashed")
    finally:
        try:
            await websocket.close()
        except Exception:
            # Socket may already be closed by the bridge or by the client.
            pass
