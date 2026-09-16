import os

import pytest


@pytest.fixture(autouse=True)
def stub_gemini_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-not-real")
