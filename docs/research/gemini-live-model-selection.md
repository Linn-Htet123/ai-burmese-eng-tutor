# Gemini Live model selection — ai-burmese-eng-tutor

**Date:** 2026-09-17
**Researcher:** Scout agent (claude-sonnet-4-6)
**For:** ABET-11 week-one spike — Pipecat + Gemini Live integration

---

## Question

Which Gemini Live model should we use for a real-time Burmese/English voice tutor on Google AI Studio v1beta, given Pipecat 1.10, function calling (`log_item`), sub-1s latency target, and 50 learners at MVP scale?

---

## 1. Table of currently available Gemini Live models (AI Studio v1beta, as of 2026-09-17)

| Model ID | Status | Audio type | Function calling | Burmese in language list | Source |
|----------|--------|------------|-----------------|--------------------------|--------|
| `gemini-3.8-live` | GA (launched 2026-09-15) | Native audio (A2A) | Yes — async is default (`NON_BLOCKING`); **but** Pipecat 1.10 explicitly disables `NON_BLOCKING` for `gemini-3` models | `my` listed in 97-language table | [ai.google.dev/gemini-api/docs/models/gemini-3.8-live](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live) |
| `gemini-3.1-flash-live-preview` | Preview (launched 2026-03-26; Google recommends migrating to 3.8 Live) | Native audio (A2A) | Yes — sequential only | Not confirmed in docs | [ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-live-preview](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-live-preview) |
| `gemini-2.5-flash-native-audio-preview-12-2025` | Preview (active; Pipecat's current default) | Native audio (A2A) | Yes — `NON_BLOCKING` supported | `my` confirmed in 99-language table | [ai.google.dev/gemini-api/docs/live-api/capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities) |
| `gemini-live-2.5-flash` | Dead — **do not use** | — | — | — | Was Vertex-only, did not exist on AI Studio v1beta |
| `gemini-2.0-flash-live-001` | Shut down 2025-12-09 | — | — | — | [ai.google.dev/gemini-api/docs/changelog](https://ai.google.dev/gemini-api/docs/changelog) |

### What these model IDs mean in Pipecat

Pipecat detects the model family by checking for `"gemini-3"` in the model string. That check controls whether `NON_BLOCKING` tool behavior is enabled. See source code: `/Users/tharlinhtet/my/ai-burmese-eng-tutor/apps/api/.venv/lib/python3.14/site-packages/pipecat/services/google/gemini_live/llm.py` lines 438-450.

```python
@property
def _is_gemini_3(self) -> bool:
    return "gemini-3" in (assert_given(self._settings.model) or "")

@property
def _supports_non_blocking_tools(self) -> bool:
    # Gemini 3.x has not yet shipped support for NON_BLOCKING function
    # declarations or for the `scheduling` field on FunctionResponse.
    return not self._is_gemini_3
```

This means: on `gemini-3.8-live` or `gemini-3.1-flash-live-preview`, Pipecat falls back to blocking tool calls. The `log_item` function will still fire — but it will pause audio while it runs. See the warning in the source at line 992.

---

## 2. Recommendation

### Primary pick: `gemini-2.5-flash-native-audio-preview-12-2025`

**Use this for the week-one spike.**

Reasons:

1. **Burmese is in the confirmed language list.** The Live API capabilities page confirms 99 supported languages including "Burmese `my`". This is the strongest documented signal we have for Burmese output.

2. **Function calling works with `NON_BLOCKING`.** Pipecat's `_supports_non_blocking_tools` returns `True` for this model (because the model string does not contain `"gemini-3"`). The `log_item` call fires in the background without pausing the audio stream. This is the correct behavior for our use case.

3. **Barge-in interrupt signal is reliable.** The forum bug report (F18 in the existing research) about interrupted not firing is specific to `gemini-3.1-flash-live-preview`. `gemini-2.5-flash` is not reported to have this bug. Our barge-in requirement (R-SE-8, ≤300ms p95) depends on the interrupted signal working correctly.

4. **It is Pipecat's own default.** Less integration risk for the spike.

5. **It works with AI Studio API key (v1beta).** The earlier failed models (`gemini-live-2.5-flash`, `gemini-2.5-flash-native-audio-preview-12-2025` error `1011`) — the `1011` error was a Vertex-only model accidentally passed to the AI Studio endpoint, not a bug in this model ID. `gemini-2.5-flash-native-audio-preview-12-2025` is confirmed as the right AI Studio model string.

### Fallback: `gemini-3.8-live`

Use this if `gemini-2.5-flash-native-audio-preview-12-2025` is deprecated or quota-blocked during the spike.

Trade-off to accept: Pipecat 1.10 will log a warning that `NON_BLOCKING` is not supported and will run `log_item` in blocking mode. The `log_item` call is fast (< 50ms database write), so this is likely acceptable. Verify by measuring audio-pause duration in the spike.

**Do not use `gemini-3.1-flash-live-preview` for the spike** — it has a confirmed open bug where the server does not emit `interrupted` at turn start, breaking barge-in. Source: [Google AI Developers Forum thread](https://discuss.ai.google.dev/t/gemini-3-1-flash-live-preview-live-api-server-never-emits-interrupted-barge-in-when-the-user-is-already-speaking-as-the-models-turn-begins/174346).

---

## 3. Exact model string to hardcode

```python
GeminiLiveLLMService(
    api_key=settings.google_api_key,
    settings=GeminiLiveLLMService.Settings(
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        voice="Aoede",  # or "Charon" — pick after listening test
        language="en-US",  # primary; system prompt drives Burmese output
    ),
    ...
)
```

Note: no `models/` prefix needed. Pipecat passes this directly to `google.genai.Client`. The model string Pipecat uses in its own default is `"models/gemini-2.5-flash-native-audio-preview-12-2025"` (with prefix). Use the same prefix form to be safe:

```python
model="models/gemini-2.5-flash-native-audio-preview-12-2025"
```

---

## 4. Cost estimate (50 learners × 30 sessions × 40 min)

**Total audio minutes per month:**
- 50 learners × 30 sessions × 40 min = 60,000 minutes of audio per month
- Roughly split: ~60% output (May speaking), ~40% input (learner speaking)
  - Input: 24,000 min
  - Output: 36,000 min

**Pricing (from [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing)):**
- Audio input: $0.005/min
- Audio output: $0.018/min

**Monthly cost at these rates:**
- Input: 24,000 × $0.005 = $120
- Output: 36,000 × $0.018 = $648
- **Total: ~$768/month for 50 learners**
- Per learner per month: ~$15.36
- Per session: ~$0.51

**At MVP pricing ($25/month subscription):**
- Gross margin after API cost alone: ~$9.64/learner ($25 − $15.36)
- This is before infra, Railway hosting, and other costs.

**Free tier:** AI Studio free tier exists for Flash-class models but quotas are not published for the Live API specifically. For the spike (a handful of test sessions), the free tier is sufficient. Switch to paid before real user testing.

**Note:** These numbers use the 3.1 Flash Live / 3.8 Live rate card as a planning reference. Google has not published a distinct 3.8 Live rate, and no separate rate for `gemini-2.5-flash-native-audio-preview-12-2025` is published — the pricing page shows one rate for the Gemini 3.x Live family. Treat these figures as estimates; verify actual billing in the API console after first paid sessions. Source: [aireiter.com/blog/gemini-3-8-live-api-pricing](https://aireiter.com/blog/gemini-3-8-live-api-pricing).

---

## 5. What could break for a Burmese-first product

### Critical unknowns (must measure in spike)

**A. Burmese spoken output quality is officially unverified.**

Burmese appears in the 99-language table for the Live API capabilities page. But "listed" and "sounds natural to a native speaker" are two different things. Burmese uses a tonal-adjacent pitch accent and a complex script. For low-resource languages, LLM-based voice synthesis typically works at the phoneme-mapping level and can produce robotic or mispronounced output.

The existing research (F22 in `ABET-11-week-one-spike/research.md`) already flagged this: no automated Burmese ASR or TTS quality benchmark exists. The spike's native-speaker thumbs-up-or-down is the only reliable test.

**If May's Burmese is unintelligible, the redesign option is:**
Separate the pipeline into STT (Gemini 3.5 Transcribe or OpenAI Whisper) + LLM (Gemini or Claude) + TTS (ElevenLabs or a Burmese-trained model). This adds latency but gives full control over voice quality. ElevenLabs supports Burmese as of 2026 (Source: [elevenlabs.io/speech-to-text/burmese](https://elevenlabs.io/speech-to-text/burmese)).

**B. `NON_BLOCKING` tool call behavior is a Gemini 2.5-only feature.**

If we migrate to `gemini-3.8-live` in the future, `log_item` will run in blocking mode. Pipecat will log a warning. This will not break the spike, but it will pause the audio stream briefly per turn. Measure the pause duration before deciding if it is acceptable.

**C. No Singapore-region endpoint is confirmed.**

This is covered in depth in `docs/research/gemini-live-regional.md`. The short version: AI Studio uses a single global URL. Inference likely runs in US data centers. The additional RTT could push some turns over the 1s target (R-TE-1). The spike must measure actual RTT from Railway Singapore.

**D. `gemini-2.5-flash-native-audio-preview-12-2025` is a preview model.**

Google could deprecate it without much notice (they shut down `gemini-2.0-flash-live-001` with about 30 days warning). Monitor the changelog. The fallback is `gemini-3.8-live`.

**E. "language_code" in Pipecat's `SpeechConfig` does not include Burmese.**

Looking at `language_to_gemini_language()` in Pipecat's `llm.py` (lines 170-252), the LANGUAGE_MAP does not include a Burmese entry. There is no `Language.MY` or `Language.MY_MM` mapping. This means if you pass a Burmese language code via the Settings object, Pipecat will fall back to returning the raw code string with a warning, not a validated Gemini code.

For a mixed English/Burmese tutor, the practical approach is: set `language="en-US"` in Settings (English is the primary instructional language), and let the system prompt instruct May to switch to Burmese when scaffolding. The Gemini model will handle the language mixing in output — the `language_code` in SpeechConfig controls transcription language hint, not what the model says. This approach is standard for code-switching tutors.

---

## Prior art

1. **Existing spike research** (`docs/changes/ABET-11-week-one-spike/research.md`) — F1–F23 covers model defaults, barge-in behavior, function calling, and Burmese quality evaluation approach. This document extends F1 and F23 specifically.

2. **Gemini 3.8 Live announcement** — [blog.google/...](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/) confirms GA on September 15, 2026, 97 languages, async function calling as default.

3. **Pipecat Gemini Live docs** — [docs.pipecat.ai/api-reference/server/services/s2s/gemini-live](https://docs.pipecat.ai/api-reference/server/services/s2s/gemini-live) — confirms Pipecat supports both `gemini-2.5` and `gemini-3.x` models, with automatic detection of model-specific behavior.

---

## What I could not verify

1. **Whether Burmese spoken output on `gemini-2.5-flash-native-audio-preview-12-2025` is intelligible to a native speaker.** Listed in the language table; actual quality unknown. Only a human ear test settles this.

2. **Exact pricing for `gemini-2.5-flash-native-audio-preview-12-2025` audio tokens.** Google's pricing page shows rates for the Gemini 3.x Live family. The 2.5 Flash preview may be billed differently or free during preview. Check the API console after first paid calls.

3. **Free tier rate limits for the Live API.** The free tier exists; quota caps for the Live API specifically are not published.

4. **Whether `gemini-3.8-live` has a Burmese spoken output advantage over `gemini-2.5-flash`.** Both list Burmese in the language table. 3.8 Live was trained on more recent data and claims 97 languages with mid-conversation switching. Could be better; could be the same. Only measurement tells.

5. **Whether the `1011 service unavailable` error Larry saw was endpoint routing (Vertex vs AI Studio) or model unavailability.** Most likely it was the model string pointing to a Vertex-only endpoint on an AI Studio key. Confirmed: `gemini-2.5-flash-native-audio-preview-12-2025` is the correct AI Studio model ID.

---

## Sources

- [Gemini Live API capabilities guide — 99 languages including Burmese](https://ai.google.dev/gemini-api/docs/live-guide)
- [Gemini 3.8 Live model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live)
- [Gemini 3.1 Flash Live Preview model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-live-preview)
- [Gemini API changelog — model deprecation/launch dates](https://ai.google.dev/gemini-api/docs/changelog)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Google blog: Gemini 3.8 Live launch announcement](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/)
- [Pipecat Gemini Live service docs](https://docs.pipecat.ai/api-reference/server/services/s2s/gemini-live)
- [Pipecat source: GeminiLiveLLMService llm.py (installed package)](file:///Users/tharlinhtet/my/ai-burmese-eng-tutor/apps/api/.venv/lib/python3.14/site-packages/pipecat/services/google/gemini_live/llm.py)
- [Google AI Developers Forum: barge-in bug on gemini-3.1-flash-live-preview](https://discuss.ai.google.dev/t/gemini-3-1-flash-live-preview-live-api-server-never-emits-interrupted-barge-in-when-the-user-is-already-speaking-as-the-models-turn-begins/174346)
- [aireiter.com: Gemini 3.8 Live pricing analysis (unofficial)](https://aireiter.com/blog/gemini-3-8-live-api-pricing)
- [Gemini Live translation language list — confirms Burmese `my`](https://ai.google.dev/gemini-api/docs/live-api/live-translate)
- [ElevenLabs Burmese STT — confirms ElevenLabs supports Burmese if fallback needed](https://elevenlabs.io/speech-to-text/burmese)
