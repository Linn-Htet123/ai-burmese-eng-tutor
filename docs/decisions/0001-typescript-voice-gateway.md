# 0001 — TypeScript voice gateway instead of FastAPI + Pipecat

**Date:** 2026-11-15 · **Decision log:** D-054

## Context
The approved designs (D-038, D-045) put the voice hot path in Python: FastAPI holding the WebSocket and Pipecat moving audio to Gemini Live. The founder wants one language across the product (TypeScript, Next.js, LangChain/LangGraph, shadcn). This choice is hard to undo once the spike numbers and the conductor are built on it.

## Options
1. **Keep Python for voice** — Pipecat's interruption handling for free; two languages and two deploys.
2. **Next.js custom server** — one process; UI deploys would drop live calls, and Vercel-style hosting cannot hold the socket (D-037).
3. **Separate Node gateway on `ws` + `@google/genai` Live** — one language, small surface we own, separate deploy from the UI.

## Decision
Option 3. The gateway owns one Gemini Live session per stage (D-046), gates two tools (D-056), and talks to the browser with the zod-typed protocol in `packages/shared/src/wire.ts`. Stage sessions sit behind an interface, so the conductor is fully tested with fakes, and `FAKE_GEMINI=1` runs the whole app without a key.

## Consequences
- We now own VAD tuning (client, `apps/web/src/lib/audio/vad.ts`) and interruption plumbing. The spike must prove barge-in ≤300ms without Pipecat.
- Python is gone from the repo. LangGraph runs as LangGraph.js inside the same Node process for now; split it out only if post-session work starves live calls of CPU.
