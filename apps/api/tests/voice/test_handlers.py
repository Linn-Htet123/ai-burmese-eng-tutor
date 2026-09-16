from unittest.mock import Mock

import pytest
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.frames.frames import FunctionCallResultFrame
from pipecat.observers.base_observer import FramePushed
from pipecat.processors.frame_processor import FrameDirection

from src.voice.handlers import LOG_ITEM_SCHEMA, LLMLogObserver


def test_observer_starts_with_no_entries() -> None:
    observer = LLMLogObserver()
    assert observer.entries == []


def test_observer_captures_item_log_frame_as_entry() -> None:
    observer = LLMLogObserver()
    frame = Mock(
        function_name="log_item",
        arguments={
            "practiced_phrase": "I did the project",
            "offered_upgrade": "I ran the project",
            "grade": "hesitant",
        },
    )

    observer.capture(frame)

    assert len(observer.entries) == 1
    entry = observer.entries[0]
    assert entry.practiced_phrase == "I did the project"
    assert entry.offered_upgrade == "I ran the project"
    assert entry.grade == "hesitant"


def test_observer_ignores_non_log_item_frames() -> None:
    observer = LLMLogObserver()
    frame = Mock(function_name="some_other_tool", arguments={"foo": "bar"})

    observer.capture(frame)

    assert observer.entries == []


def _wrap_frame(frame: FunctionCallResultFrame) -> FramePushed:
    return FramePushed(
        source=Mock(),
        destination=Mock(),
        frame=frame,
        direction=FrameDirection.DOWNSTREAM,
        timestamp=0,
    )


@pytest.mark.asyncio
async def test_on_push_frame_captures_log_item_from_real_pipecat_frame() -> None:
    observer = LLMLogObserver()
    frame = FunctionCallResultFrame(
        function_name="log_item",
        tool_call_id="call-1",
        arguments={
            "practiced_phrase": "I did the project",
            "offered_upgrade": "I ran the project",
            "grade": "hesitant",
        },
        result=None,
    )

    await observer.on_push_frame(_wrap_frame(frame))

    assert len(observer.entries) == 1
    entry = observer.entries[0]
    assert entry.practiced_phrase == "I did the project"
    assert entry.offered_upgrade == "I ran the project"
    assert entry.grade == "hesitant"


@pytest.mark.asyncio
async def test_on_push_frame_ignores_non_function_call_frames() -> None:
    observer = LLMLogObserver()
    other_frame = Mock(spec=[])

    await observer.on_push_frame(_wrap_frame(other_frame))

    assert observer.entries == []


def test_log_item_schema_is_a_pipecat_function_schema() -> None:
    assert isinstance(LOG_ITEM_SCHEMA, FunctionSchema)
    assert LOG_ITEM_SCHEMA.name == "log_item"


def test_log_item_schema_declares_the_three_entry_fields() -> None:
    props = LOG_ITEM_SCHEMA.properties
    assert set(props.keys()) == {"practiced_phrase", "offered_upgrade", "grade"}
    assert set(LOG_ITEM_SCHEMA.required) == {"practiced_phrase", "offered_upgrade", "grade"}
    for field in ("practiced_phrase", "offered_upgrade", "grade"):
        assert props[field]["type"] == "string"
