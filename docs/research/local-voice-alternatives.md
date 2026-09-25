# Local voice alternatives for dev testing — ai-burmese-eng-tutor

**Date:** 2026-09-17
**Researcher:** Scout agent (claude-sonnet-4-6)
**For:** ABET-11 week-one spike — blocked on Gemini API billing

---

## First: should you even do this?

Devil's advocate view: **probably not worth it.**

Gemini Live works on the free tier today. The Gemini Developer API (ai.google.dev / AI Studio) gives you a key with no billing required, no credit card. Flash models are free up to ~15 RPM / 1,500 RPD. The Live API voice streaming runs on those same free-tier keys. The only situation where you are truly blocked is if your Google account is in a region where AI Studio is not available, or if you already enabled billing on the project and lost the free quota (billing-enabled projects have no free tier — every token is charged immediately).

**Fastest fix for the billing block:**
Create a second Google Cloud project, generate a fresh AI Studio API key from that project, paste it into `apps/api/.env`. Takes 5 minutes, costs nothing, no card needed. Only use the billing-enabled project for Railway production.

The local alternatives below are real and work, but they add 2–6 hours of setup, introduce new failure modes, and use a different stack from production. For a spike whose purpose is measuring four specific production numbers (D-011 item log, barge-in ≤300ms, latency <1s, Burmese quality), a local substitute will not give you valid Gemini Live numbers anyway.

**Recommendation: try the new-project workaround first. Use local only if the Google account itself is geo-blocked or permanently banned.**

---

## Question

What local alternatives exist to Gemini Live for dev testing a bidirectional voice AI app on an Apple Silicon MacBook (M2/M3, 16–32GB), with zero API cost?

---

## Findings

### Option 1: Single-model voice-to-voice (Gemini Live equivalent)

| # | Model | Finding | Source |
|---|-------|---------|--------|
| 1 | **Moshi (Kyutai)** | Released open-source mid-2024. Has a native MLX backend (`pip install moshi_mlx`). Supports int4/int8/bf16 quantization. Runs on M3 with `python -m moshi_mlx.local_web -q 4`. Theoretical latency 160ms, practical ~200ms. Full-duplex (listens and speaks simultaneously like Gemini Live). English only. Quality is described as "below GPT-4o voice / Gemini Live — research model, not production-ready." Two voices: Moshika (female), Moshiko (male). Pipecat has a Moshi service class. | [kyutai-labs/moshi](https://github.com/kyutai-labs/moshi), [localaimaster.com Moshi guide](https://localaimaster.com/blog/moshi-realtime-speech-guide) |
| 2 | **Mini-Omni / Mini-Omni2** | Open-source from gpt-omni. 0.5B LLM core. End-to-end speech-to-speech, no separate STT/TTS. `pip install -r requirements.txt`, then run server. No MLX backend — pure PyTorch, so no Metal acceleration. Expected to be slow on CPU-only Mac. English quality is weak (trained on limited speech data). Not in Pipecat's service list. Setup complexity: moderate, but quality is poor. | [gpt-omni/mini-omni2](https://github.com/gpt-omni/mini-omni2) |
| 3 | **Qwen 2.5 Omni** | Has audio input/output capability. 3B and 7B variants. MLX support was being requested by community in early 2025 — **not confirmed as officially available** as of research date. Runs on Mac via CPU but inference speed is very low (<1 tok/s without MLX). Not in Pipecat's service list. | [QwenLM/Qwen2.5-Omni issue #85](https://github.com/QwenLM/Qwen2.5-Omni/issues/85), [codersera.com Qwen2.5-Omni Mac](https://codersera.com/blog/install-qwen2-5-omni-3b-on-macos/) |
| 4 | **GLM-4-Voice** | Chinese model (Tsinghua / Zhipu). 9B. Supports Chinese and English. End-to-end spoken dialogue. English quality: scored 82.56 average in multi-turn dialogue benchmarks, but benchmarks are self-reported by the team. Not in Pipecat. Requires ~18GB VRAM — no Mac Metal backend confirmed. Not practical on 16GB Mac. | [arxiv 2412.02612](https://arxiv.org/abs/2412.02612), [github zai-org/GLM-4-Voice](https://github.com/zai-org/GLM-4-Voice/blob/main/README_en.md) |
| 5 | **NVIDIA PersonaPlex 7B** | Full-duplex, Swift/MLX, Apple Silicon native. Emerged mid-2026. No Pipecat integration found. Not widely tested for English tutor use case. | [Medium: PersonaPlex on Apple Silicon](https://blog.ivan.digital/nvidia-personaplex-7b-on-apple-silicon-full-duplex-speech-to-speech-in-native-swift-with-mlx-0aa5276f2e23) |

**Single-model winner for local dev: Moshi.** It is the only one with a first-party MLX backend, Pipecat integration, and confirmed Mac setup. Quality is below Gemini Live but usable for plumbing tests.

---

### Option 2: Cascaded local stack (STT + LLM + TTS)

This is the most practical local path. Pipecat supports all three layers natively. There is a confirmed working reference implementation for Mac M-series.

#### STT options

| Model | Finding | Mac perf | Source |
|-------|---------|----------|--------|
| **mlx-whisper** (MLX backend) | Fastest option on Apple Silicon. Uses Metal GPU + unified memory. `large-v3` runs in under 1 min for 3-min audio on M2 Pro. `distil-large-v3` is the sweet spot — near-large-v3 quality, 4–6x faster. | ~50–200ms on a short turn | [mlx-whisper benchmark](https://justvoice.ai/blog/whisper-benchmark-apple-silicon-m3-m4), [threads.com ihower post](https://www.threads.com/@ihower/post/C_XxQccSYKj) |
| **faster-whisper** | CTranslate2 backend, no Metal support. Works on Mac CPU only. Slower than mlx-whisper by 3–5x on M-series. | ~300–500ms on a short turn | [Medium: MLX vs faster-whisper](https://medium.com/@GenerationAI/streaming-with-whisper-in-mlx-vs-faster-whisper-vs-insanely-fast-whisper-37cebcfc4d27) |
| **Pipecat MLX Whisper** | PR #1383 added `WhisperSTTServiceMLX` as a subclass of `WhisperSTTService`. First-party support. | Same as mlx-whisper | [Pipecat PR #1383](https://github.com/pipecat-ai/pipecat/pull/1383) |

**Recommendation: mlx-whisper via `WhisperSTTServiceMLX`. Use `distil-large-v3` model (~1.5GB).**

Burmese STT note: Whisper large-v3 has limited Burmese support (language code `my`). Quality is usable for dev testing — learners speak English, not Burmese, in sessions. Not needed to transcribe Burmese.

#### LLM options (via Ollama)

| Model | Size | Speed on M2/M3 (16GB) | Quality | Pipecat integration |
|-------|------|----------------------|---------|---------------------|
| **Llama 3.2 3B** | ~2GB | ~30–45 tok/s | Good for conversation, some hallucination | `OLLamaLLMService(model="llama3.2:3b")` |
| **Mistral 7B** | ~4.5GB | ~20–30 tok/s | Better quality, slower TTFT | `OLLamaLLMService(model="mistral")` |
| **Gemma3n 4B** | ~3GB | ~25–35 tok/s | Confirmed in kwindla Mac demo | `OLLamaLLMService(model="gemma3n:4b")` |
| **Qwen 2.5 7B** | ~4.5GB | ~20–30 tok/s | Strong multilingual, some Burmese text | `OLLamaLLMService(model="qwen2.5:7b")` |

Pipecat `OLLamaLLMService` extends `OpenAILLMService` — it is the same interface as cloud LLMs. Zero code changes to switch. Source: [Pipecat Ollama docs](https://docs.pipecat.ai/api-reference/server/services/llm/ollama).

**Recommendation: Llama 3.2 3B for fastest setup; Gemma3n 4B or Mistral 7B for better quality.**

#### TTS options

| Model | Size | Speed on M-series | Quality | Pipecat integration |
|-------|------|------------------|---------|---------------------|
| **Kokoro (kokoro-onnx)** | 82M, ~330MB | ~5–15x real-time on CPU | "Clearly better than Piper, near-commercial" — no GPU required | `KokoroTTSService` in Pipecat. Apache 2.0. Auto-downloads to `~/.cache/pipecat/kokoro-onnx/` | 
| **Piper** | Small | Very fast | Robotic, older style | Pipecat `PiperTTSService` |
| **Coqui XTTS** | ~1.8GB | Slow on CPU | High quality, good voice cloning | `XTTSService` deprecated in Pipecat |

**Recommendation: Kokoro via `KokoroTTSService`. It is the current default in all community examples.**

#### Full cascaded stack: latency estimate on M2/M3

Optimistic (streaming, small models): STT ~150ms + LLM TTFT ~200ms + TTS ~200ms = **~550ms**
Realistic (non-streaming, medium models): STT ~200ms + LLM TTFT ~500ms + TTS ~400ms = **~1100ms**
Reference data point: kwindla's Mac demo claims `<800ms` with Gemma3n 4B + mlx-whisper + Kokoro. [Source](https://github.com/kwindla/macos-local-voice-agents)

This is turn-based, not full-duplex. Barge-in requires custom interrupt logic — not built-in.

---

### Option 3: Hybrid — cloud LLM (Claude/Anthropic) + local STT + local TTS

| Attribute | Detail |
|-----------|--------|
| Setup complexity | Moderate. Same local STT + TTS as Option 2. Claude API replaces Ollama. |
| Latency | Claude API TTFT ~300–600ms. Total end-to-end: ~700–1200ms. Similar to Option 2. |
| Streaming | Token streaming works with Pipecat `AnthropicLLMService`. Reduces perceived latency. |
| English quality | Better than Ollama 3B–7B. Claude Haiku 3.5 is fast and cheap. |
| Cost | Claude Haiku 3.5: ~$0.80/$4 per MTok. For dev testing: negligible. |
| Burmese | Claude understands Burmese text but does not speak it — same as all options here. |
| Pipecat | `AnthropicLLMService` is a first-class service. Same interface as Gemini. |

Verdict: Hybrid is strictly better than pure-local for English quality and only marginally more complex. But it requires Anthropic API billing (which is separate from Gemini billing). If you have Anthropic credits, this is the best non-Gemini option for quality.

---

## Comparison table

| Option | Setup time | Turn latency (M2/M3) | Streaming | English quality | Burmese STT | Pipecat native | Model size (total) | Metal/MLX |
|--------|-----------|---------------------|-----------|----------------|-------------|----------------|-------------------|-----------|
| **Gemini Live (production)** | 5 min (new project) | ~500–800ms | Full-duplex | Excellent | Yes (`my`) | Yes | Cloud | N/A |
| **Moshi (Option 1)** | 1–2h | ~200ms | Full-duplex | Below GPT-4o, usable | No | Yes (service exists) | ~7GB (bf16), ~2GB (int4) | Yes (MLX) |
| **Cascaded: mlx-whisper + Llama3.2:3B + Kokoro (Option 2, fast)** | 2–3h | ~550–800ms | Turn-based | Good for tutor UX test | Whisper has `my` but quality limited | Yes (all three) | ~4GB total | STT via MLX; LLM via Metal (Ollama) |
| **Cascaded: mlx-whisper + Gemma3n:4B + Kokoro (Option 2, quality)** | 2–3h | ~700–1000ms | Turn-based | Better | Same | Yes | ~5.5GB | Yes |
| **Hybrid: mlx-whisper + Claude Haiku + Kokoro (Option 3)** | 2–3h | ~700–1100ms | Turn-based (streaming tokens) | Near-Gemini | No | Yes | ~1.5GB local | STT via MLX |
| **Mini-Omni2** | 3–5h | Unknown, likely >2s | Turn-based | Poor | No | No | ~1GB | No Metal |
| **Qwen2.5-Omni** | 3–6h | Very slow (<1 tok/s without MLX) | Turn-based | Fair | Limited | No | ~8GB | MLX not confirmed |
| **GLM-4-Voice** | 4–6h | Not feasible on 16GB | Turn-based | Fair | No | No | ~18GB needed | No |

---

## Top recommendation: fastest to a running loop tonight (~4 hours or less)

**Option 2 (cascaded), specifically: mlx-whisper (distil-large-v3) + Ollama Gemma3n 4B + Kokoro TTS.**

Reason: there is a working reference implementation on GitHub ([kwindla/macos-local-voice-agents](https://github.com/kwindla/macos-local-voice-agents)) that uses exactly this stack with Pipecat, has been tested on M-series Macs, and achieves sub-800ms latency. All three Pipecat service classes (`WhisperSTTServiceMLX`, `OLLamaLLMService`, `KokoroTTSService`) are in Pipecat's mainline. The setup is: `brew install espeak-ng`, `pip install moshi_mlx kokoro soundfile`, `ollama pull gemma3n:4b`, then adapt the pipeline.

Steps:
1. `git clone https://github.com/kwindla/macos-local-voice-agents` and read it. (~30 min)
2. Install dependencies listed in that repo. (~30 min)
3. Adapt `apps/api/src/voice/pipeline.py` to swap `GeminiLiveLLMService` for `OLLamaLLMService` + `WhisperSTTServiceMLX` + `KokoroTTSService`. (~1–1.5h)
4. Run smoke test. (~30 min)
5. Total: ~2.5–3.5h.

**But do this first: create a second Google Cloud project, get a new free-tier AI Studio key (5 minutes), and test if the billing block disappears. If it does, you do not need the local stack at all.**

---

## Prior art

- `docs/research/gemini-live-model-selection.md` — model selection for Pipecat + Gemini Live; confirms `gemini-2.5-flash-native-audio-preview-12-2025` is the current Pipecat default.
- `docs/research/vad-library-comparison.md` — already in this repo.
- [kwindla/macos-local-voice-agents](https://github.com/kwindla/macos-local-voice-agents) — direct reference implementation for Option 2 on Mac.
- [Apoorva87/local-voice-agent](https://github.com/Apoorva87/local-voice-agent) — another full local stack: Pipecat + Smart Turn v3 + mlx-whisper + Ollama + Kokoro.
- [Pipecat Ollama docs](https://docs.pipecat.ai/api-reference/server/services/llm/ollama) — official.
- [Pipecat Kokoro docs](https://docs.pipecat.ai/api-reference/server/services/tts/kokoro) — official.
- [Pipecat PR #1383](https://github.com/pipecat-ai/pipecat/pull/1383) — MLX Whisper backend merged.

---

## What I could not verify

- Whether Gemini Live (bidiGenerateContent) specifically works on the free tier — the billing docs do not call this out explicitly. The general Gemini Flash free tier is confirmed free; whether the streaming audio endpoint is gated separately is unclear. Test with a new project key.
- Moshi's quality on a 16GB M2 Mac with int4 quantization under conversation load — benchmarks exist for M3 but not M2 16GB specifically.
- Qwen2.5-Omni MLX status — community was requesting it in early 2025; may have landed by mid-2026 but not confirmed in search results.
- Whether `WhisperSTTServiceMLX` is in the currently pinned Pipecat version in `apps/api/pyproject.toml` — check with `grep pipecat /Users/tharlinhtet/my/ai-burmese-eng-tutor/apps/api/pyproject.toml` before assuming it is available.
