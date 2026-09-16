from dataclasses import dataclass
from typing import Any

from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.frames.frames import FunctionCallResultFrame
from pipecat.observers.base_observer import BaseObserver, FramePushed

LOG_ITEM_TOOL = "log_item"

# What Gemini sees as a callable function. When it decides to call it,
# we grab the arguments as one recorded practice moment.
LOG_ITEM_SCHEMA = FunctionSchema(
    name=LOG_ITEM_TOOL,
    description=(
        "Record one practice moment from the learner's turn. Call this once "
        "per practiced phrase, right after the learner attempts it."
    ),
    properties={
        "practiced_phrase": {
            "type": "string",
            "description": "The phrase the learner tried to say.",
        },
        "offered_upgrade": {
            "type": "string",
            "description": "The stronger phrase May offered as a replacement.",
        },
        "grade": {
            "type": "string",
            "enum": ["fluent", "hesitant", "failed"],
            "description": "How the learner delivered the phrase.",
        },
    },
    required=["practiced_phrase", "offered_upgrade", "grade"],
)


@dataclass(frozen=True)
class ItemLogEntry:
    practiced_phrase: str
    offered_upgrade: str
    grade: str


class LLMLogObserver(BaseObserver):
    def __init__(self) -> None:
        super().__init__()
        self.entries: list[ItemLogEntry] = []

    async def on_push_frame(self, data: FramePushed) -> None:
        if isinstance(data.frame, FunctionCallResultFrame):
            self.capture(data.frame)

    def capture(self, frame: Any) -> None:
        if getattr(frame, "function_name", None) != LOG_ITEM_TOOL:
            return

        args = getattr(frame, "arguments", {}) or {}
        entry = ItemLogEntry(
            practiced_phrase=args.get("practiced_phrase", ""),
            offered_upgrade=args.get("offered_upgrade", ""),
            grade=args.get("grade", ""),
        )
        self.entries.append(entry)
