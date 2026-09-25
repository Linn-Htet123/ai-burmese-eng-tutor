# One-command helpers for the ai-burmese-eng-tutor monorepo.
#
# Usage from anywhere in the repo:
#   make api        # start FastAPI backend on :8000 with tuned hot reload
#   make web        # start Next.js frontend on :3000
#   make test-api   # run backend tests
#   make help       # list targets
#
# Works from any subdir because apps/api/Makefile and apps/web/Makefile
# just include this one and delegate every target here.

.DEFAULT_GOAL := help

.PHONY: help api web test-api

# Absolute path to THIS Makefile's directory (= repo root).
#
# `lastword $(MAKEFILE_LIST)` — at the moment this line is parsed, the most
# recently loaded Makefile IS this one, whether we were invoked directly or
# included via a proxy Makefile in apps/api/ or apps/web/. `firstword` would
# give the proxy's path when included, producing a doubled `apps/api/apps/api`.
REPO_ROOT := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))

help:
	@echo "make api       — start the FastAPI backend (http://localhost:8000)"
	@echo "make web       — start the Next.js frontend (http://localhost:3000)"
	@echo "make test-api  — run backend tests"

api:
	@bash $(REPO_ROOT)apps/api/scripts/dev.sh

web:
	@cd $(REPO_ROOT)apps/web && npm run dev

test-api:
	@cd $(REPO_ROOT)apps/api && uv run pytest -q
