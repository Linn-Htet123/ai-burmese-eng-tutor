from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineWorker
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService

from src.voice.handlers import LOG_ITEM_SCHEMA, LLMLogObserver


def create_voice_pipeline(api_key: str, system_prompt: str) -> Pipeline:
    llm = GeminiLiveLLMService(
        api_key=api_key,
        system_instruction=system_prompt,
        tools=ToolsSchema(standard_tools=[LOG_ITEM_SCHEMA]),
    )
    return Pipeline([llm])


def create_voice_worker(pipeline: Pipeline, observer: LLMLogObserver) -> PipelineWorker:
    # cancel_on_idle_timeout=False because a real lesson has 30+ second
    # thinking pauses — the default 300s timeout would cut the session
    # off mid-thought.
    return PipelineWorker(
        pipeline,
        observers=[observer],
        cancel_on_idle_timeout=False,
    )
