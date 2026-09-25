# Gemini Live Multi-Turn Silence & High Latency — Research Report

**Date:** 2026-09-18
**Scope:** Problem A (multi-turn silence after turn 1) and Problem B (2.5 s first-turn latency) in the ABET-11 spike using `gemini-2.5-flash-native-audio-preview-12-2025` + Pipecat 1.10.

---

## Question

Are the two bugs (second turn silence, first-turn >2 s latency) known to the community, and is the consensus "wait for Google" or "here is a workaround"?

---

## Findings

| # | Finding | Supports / refutes | Source |
|---|---------|-------------------|--------|
| 1 | **`FunctionCallResultFrame` arriving while user is still speaking is silently dropped.** `LLMAssistantAggregator._handle_function_call_result` skips the LLM re-invoke when `_user_speaking=True`, and has no retry path. Bot goes silent until new user input arrives. Confirmed with a minimal reproducer. | **Strongly supports Problem A root cause.** Our `log_item` tool fires at the end of every practice turn; if any audio bleeds through echo-cancellation during May's response, `_user_speaking` can be True when the tool result lands. | [pipecat issue #5823](https://github.com/pipecat-ai/pipecat/issues/5823) — opened 2026-09-17, OPEN |
| 2 | **`GeminiLiveLLMService` silently drops audio, text, and tool results when `_ready_for_realtime_input` is False** (during reconnects or before session ready). No log line, no retry. Tool result drop is the worst case — model waits for the result forever and produces no speech. | **Supports Problem A.** If session readiness lags (e.g., first cold-start or a brief reconnect), the second turn's audio is eaten. | [pipecat issue #5465](https://github.com/pipecat-ai/pipecat/issues/5465) — opened 2026-08-27, OPEN |
| 3 | **Gemini server-side VAD "swallows" utterances at a 24–42% rate on `gemini-3.1-flash-live-preview`.** The turn is never closed; the user's *next* utterance is consumed to close the stale turn with zero output tokens. Two utterances produce zero replies. `audioStreamEnd` has no effect in automatic-VAD mode. Rate measured across hundreds of calls. `gemini-2.5` behavior not directly measured but same architecture. | **Strongly supports Problem A.** Our frontend streams audio continuously (worklet never stops); this is exactly the configuration that hits the stale-turn bug. The 5–8 s idle + 2.5 s reply pattern matches the "stale turn consumed by next utterance" shape. | [google-gemini/gemini-live-api-examples issue #38](https://github.com/google-gemini/gemini-live-api-examples/issues/38) — OPEN 2026; [related python-genai #2580](https://github.com/googleapis/python-genai/issues/2580) |
| 4 | **`gemini-live-2.5-flash-native-audio` produces silent audio on ~5.9% of Vertex calls** (Mode 1: full-length audio at near-zero amplitude; Mode 2: `turnCompleteReason: "RESPONSE_REJECTED"` — up to 27 consecutive rejections). Not fixed. `proactive_audio: true` is a suspected contributor and was disabled by one production team as a mitigation. | **Supports Problem A** as a separate failure mode that is unrelated to our echo/VAD path. When it hits, logs look healthy. | [google-gemini/gemini-live-api-examples issue #40](https://github.com/google-gemini/gemini-live-api-examples/issues/40) — OPEN 2026-09-13 |
| 5 | **`gemini-2.5-flash-native-audio` uses `TURN_INCLUDES_ONLY_ACTIVITY` by default; `gemini-3.1-flash-live-preview` defaults to `TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO`.** This is a billing difference, but the models handle turn scoping differently and the server VAD logic tied to these modes differs. No workaround for the ONLY_ACTIVITY behavior was found. | **Partial context** for why our model might handle continuous-streaming audio differently than the reference implementation. | [pipecat search results](https://github.com/pipecat-ai/pipecat/blob/main/src/pipecat/services/google/gemini_live/llm.py) |
| 6 | **Progressive latency degradation confirmed for `gemini-2.5-flash-native-audio`.** Google acknowledged and escalated on 2026-01-09 — no fix published. Latency "starts normal, increases sharply after 1–2 min." Separately, `thinkingBudget` must be set to 0 (and `thinkingConfig: {thinkingBudget: 0}` in setup) or the model incurs reasoning overhead on every turn. Pipecat does NOT set `thinkingBudget: 0` automatically for the `...-native-audio-preview-12-2025` model string (it only does so for `gemini-2.5-flash*`). | **Directly causes Problem B.** The 2.5-second first-turn latency is most likely thinking overhead + cold-start. | [Google forum: latency issues](https://discuss.ai.google.dev/t/gemini-2-5-flash-native-audio-api-has-latency-issues/109064); [Pipecat issue #3993](https://github.com/pipecat-ai/pipecat/issues/3993) |
| 7 | **Reference implementation (`server.mjs`) sends `contextWindowCompression: { slidingWindow: {} }` and `speechConfig: { languageCode: "my-MM" }` in the setup message. Our Pipecat setup sends neither.** `languageCode: my-MM` explicitly tells the STT side to expect Burmese. Missing `contextWindowCompression` means the session can hit the context limit mid-lesson. | **Supports both problems** — missing language code means the server might default to another language's acoustic model. Missing compression is a future session-killer. | Reference implementation: `/Users/tharlinhtet/Downloads/burmese-tutor/server.mjs` lines 316–326 |
| 8 | **Community consensus on "pause mic during bot speech":** this IS the standard workaround for echo → false VAD. Pipecat exposes `start_audio_paused` and a `_audio_input_paused` flag in `GeminiLiveLLMService`, plus a `set_audio_input_state()` method. The reference implementation does NOT pause the mic — it relies on browser `echoCancellation: true` + the proxy-server never forwarding audio during bot turns. Our setup has `echoCancellation: true` on both sides but Pipecat keeps streaming all audio to Gemini including bot-playback echo. | **Supports Problem A.** Playback echo triggers server VAD → "user started speaking" → `_user_speaking = True` → tool result dropped (see #1). | [Gemini forum: AEC for telephony](https://discuss.ai.google.dev/t/gemini-live-api-acoustic-echo-cancellation-needed-for-sip-telephony-deployments/144332); Pipecat source `_audio_input_paused` |
| 9 | **`gemini-3.8-live` released 2026-09-15, GA.** Supports NON_BLOCKING function calls natively, no barge-in self-interrupt bug, 97+ languages (Burmese expected in range but not explicitly listed), ultra-low latency audio-to-audio. Pipecat 1.10 added support via PR #5781. Pipecat correctly treats 3.8 as NON_BLOCKING (unlike 3.1). No known multi-turn swallow rate published yet. | **Strongest alternative to our current model.** If 2.5-native-audio issues are Google-side bugs (likely), 3.8 may have fixed them. | [Gemini 3.8 Live docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live); [pipecat PR #5781](https://github.com/pipecat-ai/pipecat/pull/5781) |

---

## Comparison table: our config vs reference vs Pipecat defaults

| Setting | Our Pipecat setup | Reference (`server.mjs`) | Pipecat default |
|---------|-------------------|--------------------------|-----------------|
| Model | `gemini-2.5-flash-native-audio-preview-12-2025` | `gemini-3.1-flash-live-preview` | none |
| `languageCode` / `language` | not set (defaults to `en-US`) | `my-MM` | `en-US` |
| `contextWindowCompression` | not set | `slidingWindow: {}` | disabled |
| `thinkingBudget` | not set (thinking ON, unknown budget) | n/a (3.1 doesn't have thinking) | not auto-disabled for this model string |
| `turn_coverage` | not set (model default: `TURN_INCLUDES_ONLY_ACTIVITY`) | not set | not set |
| VAD mode | server default (automatic) | server default | server default |
| `start_audio_paused` | False (mic always streaming) | always streaming but via proxy that stops forwarding during bot audio | False |
| Session resumption | not set | `sessionResumption: {}` | not set |
| Continuous audio streaming | yes (worklet never stops, sends zeros in silence) | yes (same shape) | n/a |
| Tool response acknowledged | `params.result_callback({"status": "logged"})` | `{ result: "ok" }` | n/a |

---

## Prior art

- [pipecat issue #3381](https://github.com/pipecat-ai/pipecat/issues/3381) — `server_content.interrupted` ignored, causes delayed barge-in on 2.5 (confirmed by ABET-11 prior research)
- [pipecat issue #5683](https://github.com/pipecat-ai/pipecat/issues/5683) — `TranscriptionFrame` queued behind a turn-start frame is dropped by that turn's interruption (adjacent bug, same class)
- [pipecat issue #5779](https://github.com/pipecat-ai/pipecat/issues/5779) — interrupting bot while it calls a tool leaves the call stuck in-progress
- [google-gemini/gemini-live-api-examples issue #37](https://github.com/google-gemini/gemini-live-api-examples/issues/37) — companion report on the same stale-turn pattern
- [python-genai issue #2580](https://github.com/googleapis/python-genai/issues/2580) — `silence_duration_ms` ignored on 3.1
- [pydantic-ai PR #8394](https://github.com/pydantic/pydantic-ai/pull/8394) — `proactive_audio` never worked because the `v1alpha` API version was not set; same issue may affect Pipecat setups using proactive audio

---

## Top 3 most likely root causes for multi-turn silence (ranked by evidence)

### Rank 1 — Server VAD swallows the second-turn utterance (Issue #38 evidence)

**Mechanism:** May's first response triggers audio output. The frontend plays it back. Even with `echoCancellation: true`, some residual energy from the speaker reaches the mic. The continuous PCM stream from our worklet carries this echo to Gemini. Gemini's server VAD fires `inputTranscription` for the echo, opens a turn, but produces no response (the echo looks like noise or a sub-threshold utterance). When the user actually speaks for turn 2, their speech is consumed to close the stale echo-turn with zero output tokens. Turn 2 gets no reply. This matches our symptom exactly: no new `inputTranscription` visible in backend logs, idle timeout after ~5 min.

**Confidence: HIGH.** The reference implementation avoids this by using a Node.js proxy that stops forwarding browser audio to Gemini while the bot is speaking (the `upstream.send()` path is conditional on `msg.type === "audio"` from the client, and the client is muted via the proxy gap). Our Pipecat setup has no such gate — audio flows continuously.

### Rank 2 — `log_item` tool result dropped while `_user_speaking = True` (Issue #5823 evidence)

**Mechanism:** May calls `log_item` at the end of a practice turn. The tool result comes back quickly (our handler is async + `result_callback` is immediate). If any VAD event (echo from playback, real speech onset, or a false trigger) sets `_user_speaking = True` at the moment the result lands, pipecat silently skips the LLM re-invoke. No retry. May goes silent until the user speaks again.

**Confidence: MEDIUM-HIGH.** The race is documented, reproduced in a unit test, and filed as an open bug (filed same day as our debugging, 2026-09-17). Our tool is called every single practice turn — we hit this race more than most bots. The fix exists but is not yet in a pipecat release.

### Rank 3 — `_ready_for_realtime_input` flag False on cold start / brief reconnect (Issue #5465 evidence)

**Mechanism:** On connection setup, pipecat's `GeminiLiveLLMService` drops all audio until `_ready_for_realtime_input` becomes True (set after `setupComplete`). If the user speaks during the session setup handshake (which can take 0.5–1 s on cold start), that audio is silently discarded — including any audio from May's echo during turn 1. If this also triggers a VAD false start, the session can enter an unresponsive state.

**Confidence: MEDIUM.** This is a diagnostics gap rather than a confirmed multi-turn bug, but it explains our idle log pattern on some runs.

---

## Concrete config changes to try tonight

### Fix 1 — Pause mic input during bot output (highest priority)

Add `start_audio_paused=False` in `GeminiLiveLLMService` constructor (it already defaults to False), but wire up the `on_bot_started_speaking` / `on_bot_stopped_speaking` events from the transport to call `llm.set_audio_input_state(paused=True)` / `(paused=False)`. This is the Pipecat-native equivalent of the reference proxy's audio gate.

```python
# In router.py, after building llm and transport:
@transport.event_handler("on_bot_started_speaking")
async def _mute_mic(_transport) -> None:
    await llm.set_audio_input_state(paused=True)

@transport.event_handler("on_bot_stopped_speaking")
async def _unmute_mic(_transport) -> None:
    await llm.set_audio_input_state(paused=False)
```

This removes the echo → false VAD → stale turn chain entirely.

### Fix 2 — Disable thinking budget (highest priority for latency)

Add `thinkingConfig` to the setup. Pipecat exposes this via `InputParams`:

```python
from pipecat.services.google.gemini_live.llm import InputParams

llm = GeminiLiveLLMService(
    api_key=api_key,
    model=GEMINI_LIVE_MODEL,
    system_instruction=system_prompt,
    tools=ToolsSchema(standard_tools=[LOG_ITEM_SCHEMA]),
    params=InputParams(
        thinking_budget=0,  # disable reasoning overhead entirely
    ),
)
```

This alone may cut first-turn latency from ~2.5 s to ~0.5 s. The reference model (3.1) has no thinking layer; 2.5-native-audio does and it's on by default.

### Fix 3 — Add Burmese language code

In `build_gemini_llm`, set `language` to Burmese:

```python
from pipecat.services.google.gemini_live.llm import Language

llm = GeminiLiveLLMService(
    ...
    language=Language.MY_MM,  # if not present, use custom string "my-MM"
)
```

Without this, the acoustic model defaults to `en-US` and Burmese speech gets mis-transcribed.

### Fix 4 — Add context window compression

```python
from pipecat.services.google.gemini_live.llm import ContextWindowCompressionParams

llm = GeminiLiveLLMService(
    ...
    context_window_compression=ContextWindowCompressionParams(enabled=True),
)
```

Without this, a 40-minute lesson will hit the context limit mid-session.

### Fix 5 — Try `gemini-3.8-live` as a drop-in replacement

Change `GEMINI_LIVE_MODEL` in `pipeline.py` to `"models/gemini-3.8-live"`. It released GA on 2026-09-15, Pipecat 1.10 supports it, NON_BLOCKING tools work natively, and the stale-turn VAD swallow rate on 3.1 (which share architecture) is high enough that the newer model may be worth a test even without a public bug-rate comparison. The barge-in self-interrupt bug that disqualified 3.1 is not reported for 3.8.

---

## Community consensus

**Not "wait for Google."** Two of the three root causes have Pipecat-side workarounds:
- The mic-pause pattern (Fix 1) eliminates the echo→VAD chain without any Google change.
- Disabling thinking budget (Fix 2) eliminates the reasoning latency without any Google change.

**The server VAD swallow bug (Issue #38) IS a Google-side bug** with no confirmed client fix beyond switching to manual `activityStart`/`activityEnd` (which added ~2.3 s latency for the reporter). However, if Fix 1 (mic pause) stops echo from reaching Gemini's VAD, the stale-turn trigger is removed, which may be sufficient to unblock the spike.

**`RESPONSE_REJECTED` silent audio (Issue #40) is an unresolved Google bug** at 5.9% call rate. No workaround found. If we hit it reproducibly, it would be a reason to file with Google or switch models.

---

## What I could not verify

- Whether `Language.MY_MM` exists as a named constant in Pipecat 1.10's `Language` enum, or if we need to pass it as a raw string via `language="my-MM"`. Needs a quick `python -c "from pipecat.services.google.gemini_live.llm import Language; print([x for x in Language])"`.
- Whether `set_audio_input_state` is the correct method name in Pipecat 1.10 vs earlier versions (the source confirms the flag `_audio_input_paused` exists; the public API method name needs confirming from the installed source).
- Whether `InputParams(thinking_budget=0)` is the correct Pipecat param name for the `...-native-audio-preview-12-2025` model vs just passing `thinkingConfig` in `extra_kwargs`. The Pipecat docs show `thinking_budget` for `GeminiLiveLLMService`; needs confirming.
- The exact server VAD swallow rate for `gemini-2.5-flash-native-audio-preview-12-2025` specifically — Issue #38 was measured on `gemini-3.1-flash-live-preview`. The 2.5 model may behave differently.
- Whether `gemini-3.8-live` supports Burmese (`my-MM`) — the model card says "97+ languages" but does not enumerate them. Testing is required.
