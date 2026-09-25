#!/usr/bin/env bash
# Start uvicorn in reload mode, tuned for this project.
#
# - `--reload-dir src` narrows the file watcher to source; test file saves and
#   .venv churn no longer trigger a restart mid-lesson.
# - `--reload-delay 0.3` batches rapid saves so a single `git checkout` of many
#   files causes ONE reload instead of a storm.
# - `--reload-exclude` blocks obvious noise sources (cache dirs, log files,
#   editor temp files).
# - The client (`apps/web`) has WebSocket auto-reconnect, so a reload cycle is
#   invisible to the learner — no need to click Stop/Start in the browser.
#
# Run from apps/api/ or via the wrapper Makefile at the repo root.

set -euo pipefail

cd "$(dirname "$0")/.."

exec uv run uvicorn src.main:app \
  --host 127.0.0.1 \
  --port 8000 \
  --reload \
  --reload-dir src \
  --reload-delay 0.3 \
  --reload-exclude '**/__pycache__/**' \
  --reload-exclude '**/*.pyc' \
  --reload-exclude '**/.pytest_cache/**' \
  --timeout-graceful-shutdown 3 \
  --log-level info
