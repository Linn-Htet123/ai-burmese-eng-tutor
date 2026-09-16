from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineWorker
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService

from src.voice.handlers import LLMLogObserver
from src.voice.pipeline import create_voice_pipeline, create_voice_worker


def _find_llm(pipeline: Pipeline) -> GeminiLiveLLMService:
    return next(p for p in pipeline.processors if isinstance(p, GeminiLiveLLMService))


def test_create_voice_pipeline_returns_pipeline_instance() -> None:
    pipeline = create_voice_pipeline(
        api_key="test-key-not-real",
        system_prompt="You are May, an English tutor.",
    )

    assert isinstance(pipeline, Pipeline)


def test_create_voice_pipeline_registers_log_item_tool_on_llm() -> None:
    pipeline = create_voice_pipeline(
        api_key="test-key-not-real",
        system_prompt="You are May.",
    )

    llm = _find_llm(pipeline)
    tool_names = [t.name for t in llm._tools_from_init.standard_tools]
    assert "log_item" in tool_names


def test_create_voice_worker_returns_pipeline_worker_instance() -> None:
    pipeline = create_voice_pipeline(
        api_key="test-key-not-real",
        system_prompt="You are May.",
    )
    observer = LLMLogObserver()

    worker = create_voice_worker(pipeline, observer)

    assert isinstance(worker, PipelineWorker)


def test_create_voice_worker_attaches_observer() -> None:
    pipeline = create_voice_pipeline(
        api_key="test-key-not-real",
        system_prompt="You are May.",
    )
    observer = LLMLogObserver()

    worker = create_voice_worker(pipeline, observer)

    assert observer in worker._observer._observers
