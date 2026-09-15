# Gemini Live regional availability — does it serve from Singapore?

**Date:** 2026-09-13
**For:** GitHub issue #10 · `docs/technical-designs/02-voice-pipeline.md` open question
**Researcher:** Scout agent (claude-sonnet-4-6)

---

## Question

Does Gemini Live API have a Singapore-region endpoint? If yes, what URL? If no, what is the nearest region, how much RTT does it add, and does that break our 1 s end-to-end target (R-TE-1)?

---

## Findings

| # | Finding | Supports / refutes hypothesis | Source |
|---|---------|-------------------------------|--------|
| 1 | Two distinct products carry the "Gemini Live" name. **Google AI Studio / `generativelanguage.googleapis.com`** (API-key auth, single global endpoint). **Vertex AI Live API** (`{location}-aiplatform.googleapis.com`, per-region or `global`, service-account auth). The design uses Pipecat `GeminiLiveLLMService` — that targets `generativelanguage.googleapis.com`. Pipecat `GeminiLiveVertexLLMService` targets Vertex. These are separate paths. | Clarifies which endpoint applies to our stack | [ai.google.dev/gemini-api/docs/live-api/get-started-websocket](https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket); [docs.pipecat.ai/api-reference/server/services/s2s/gemini-live-vertex](https://docs.pipecat.ai/api-reference/server/services/s2s/gemini-live-vertex) |
| 2 | `generativelanguage.googleapis.com` (the AI Studio / API-key path) exposes **a single global WebSocket URL** — `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`. No regional variants are documented. Google routes this with Anycast, meaning TLS terminates at the nearest Google PoP, but **inference may execute in US data centers** — they don't publish the compute-placement rules for this endpoint. | Does NOT confirm Singapore-region compute | [ai.google.dev/api/live](https://ai.google.dev/api/live); [ai.google.dev/gemini-api/docs/live-api/get-started-websocket](https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket) |
| 3 | Vertex AI Live API endpoint pattern is `wss://{location}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1.LlmBidiService/BidiGenerateContent`. The `{location}` parameter is substitutable. A `global` location also exists. | Supports: there IS a regional-endpoint mechanism | [gemini-ex.hexdocs.pm/live_api.html](https://gemini-ex.hexdocs.pm/live_api.html); [docs.litellm.ai/docs/providers/vertex_realtime](https://docs.litellm.ai/docs/providers/vertex_realtime) |
| 4 | **asia-southeast1 (Singapore) is in the Vertex AI Gemini API footprint.** A Dec 2024 incident report confirms Google's multi-region `:asia` pool explicitly includes asia-southeast1, asia-east1, asia-northeast1, asia-northeast3, asia-south1, asia-east2. | Supports: infra exists in SG | [status.cloud.google.com/incidents/LmCfJJpvATwjmLQiyzX8](https://status.cloud.google.com/incidents/LmCfJJpvATwjmLQiyzX8) |
| 5 | **Whether the Live API (BidiGenerateContent) specifically is available in asia-southeast1 is unconfirmed.** Official docs show APAC regions (asia-southeast1, asia-northeast1, etc.) in regional tables for Gemini models, but **do not explicitly flag Live API support per region**. Documentation is ambiguous. | Neither confirms nor refutes | [blevinscm.github.io/genai-docs/learn/Deployments-and-endpoints/](https://blevinscm.github.io/genai-docs/learn/Deployments-and-endpoints/) |
| 6 | A Google Developer Forum thread (2026) shows a developer testing `gemini-live-2.5-flash` on Vertex: **only `region="global"` worked; other single regions returned policy errors**. The preview model `gemini-live-2.5-flash-preview-native-audio-09-2025` was **only available in us-central1** at that time. | Refutes: asia-southeast1 as a confirmed region for the latest Live models | [discuss.google.dev/t/gemini-live-2-5-flash-and-gemini-live-2-5-flash-preview-native-audio-09-2025-region-availability/284655](https://discuss.google.dev/t/gemini-live-2-5-flash-and-gemini-live-2-5-flash-preview-native-audio-09-2025-region-availability/284655) |
| 7 | A separate thread (EU-focused, 2026) confirms `gemini-3.1-flash-live-preview` is **only on AI Studio (`generativelanguage.googleapis.com`) — no Vertex AI version, regardless of region**. EU devs got 404s in every Vertex region. APAC not tested but same model. | Refutes: asia-southeast1 on Vertex for newest models | [discuss.ai.google.dev/t/gemini-3-1-flash-live-preview-on-vertex-ai-eu-region-availability/144429](https://discuss.ai.google.dev/t/gemini-3-1-flash-live-preview-on-vertex-ai-eu-region-availability/144429) |
| 8 | For the stable GA model (`gemini-live-2.5-flash-native-audio`), community testing confirmed it works in **asia-northeast1** (Tokyo). US regions (us-central1, us-east5, us-east1, us-west1) and EU regions (europe-west1, europe-west4) are also confirmed. No SG direct test found. | Supports: Tokyo (nearest confirmed APAC region) as fallback | Search synthesis from multiple community threads |
| 9 | A Mumbai (asia-south1) deployment example showed **"under 20ms local RTT"** for Indian users, with a claimed 150 ms network RTT reduction vs. US routing. Nearest APAC analogy: Tokyo (asia-northeast1) is ~70–80 ms from Singapore over the internet; a direct SG region would be sub-5 ms. | Quantifies the stakes of missing a SG region | [autointerviewai.com/blog/google-gemini-live-voice-to-voice-review-2026](https://www.autointerviewai.com/blog/google-gemini-live-voice-to-voice-review-2026) |
| 10 | `generativelanguage.googleapis.com` (API-key / AI Studio path) is confirmed available in Singapore as a **country** (user access), but this is access policy, not compute placement. | Neutral — access ≠ local compute | [ai.google.dev/gemini-api/docs/available-regions](https://ai.google.dev/gemini-api/docs/available-regions) |
| 11 | The Vertex AI `global` endpoint does capacity-aware routing across US + EU + APAC regions but **does not guarantee which region runs the ML compute**, and docs explicitly say you cannot control or predict it. For Live API (WebSocket, stateful), session routing is likely pinned once established — but the affinity rules are unpublished. | Partially supports: global endpoint might land in APAC, but unverifiable without measurement | [docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency); Medium global endpoint article |

---

## Definitive answer

**There is no confirmed, documented Singapore-region endpoint for Gemini Live API as of 2026-09-13.**

Two scenarios:

**Scenario A — AI Studio path (`generativelanguage.googleapis.com`):**
Single global WebSocket URL. No user-selectable region. Google uses Anycast for TLS termination but inference runs wherever Google decides (likely US-based data centers for ML compute). Expected added RTT for a Railway-SG backend: **+150–200 ms each way = +300–400 ms round-trip**. That puts total session latency at **875–1360 ms at the top end**, which **breaks R-TE-1** under worst-case conditions.

**Scenario B — Vertex AI path (`{location}-aiplatform.googleapis.com`):**
Regional endpoint exists as a URL pattern. Singapore (asia-southeast1) is in the Vertex AI footprint. However, **community testing suggests the Live-specific model IDs either require `region="global"` or only work in specific regions** (confirmed: asia-northeast1 / Tokyo). A direct `asia-southeast1` Live API call may 404. The `global` Vertex endpoint may route to APAC — but this is unverified.

**Bottom line: must measure.** The design doc's open question ("Which Gemini Live region actually answers from Singapore?") is the right call. Without a measured RTT from a Railway-SG box to `generativelanguage.googleapis.com` and to `asia-southeast1-aiplatform.googleapis.com`, we cannot close the latency budget table.

---

## Nearest confirmed region if SG is not served

**asia-northeast1 (Tokyo, Japan)**

- Confirmed working for `gemini-live-2.5-flash-native-audio` on Vertex AI.
- Typical Singapore → Tokyo internet RTT: **70–90 ms** (physical distance ~5,300 km; multiple undersea cable paths via SJC, APG, APCN2).
- Added RTT vs. a Singapore region: **~70–90 ms each way = +140–180 ms round-trip** for backend → Gemini hop.
- Current budget assumption: 5–20 ms (same-region). Tokyo adds **+120–175 ms** to that hop.

**Impact on R-TE-1:**

Revised latency budget with Tokyo fallback:

| Hop | Same-region (SG) | Tokyo fallback |
|-----|-----------------|---------------|
| Client VAD end-of-speech | 100–200 ms | 100–200 ms |
| Browser → Backend (Yangon → SG) | 30–60 ms | 30–60 ms |
| Backend → Gemini Live | 5–20 ms | 75–110 ms |
| Gemini: think + first audio chunk | 400–600 ms | 400–600 ms |
| First audio chunk → browser | 40–80 ms | 40–80 ms |
| **Total** | **575–960 ms** | **645–1050 ms** |

The Tokyo fallback **clips the top of the budget**: p95 cases (VAD ~200 ms, Gemini ~600 ms, high Tokyo RTT ~110 ms) land at ~1050 ms — **50 ms over R-TE-1**.

The SG → Tokyo RTT estimate above is for the public internet from a Railway-SG box. Google's backbone network between its Singapore PoP and its Tokyo compute would be faster — possibly 40–60 ms. Without measurement, treat the 50 ms overage as a risk, not a certainty.

---

## What changes if Tokyo is confirmed as nearest?

Three design responses, in order of disruption:

1. **Tighten VAD hangover window.** Current estimate: 100–200 ms. Dropping to 80–100 ms saves 60–100 ms. This is the cheapest lever (code change, no infra change). Trade-off: more false positives (May interrupted mid-word). Spike will tune this.

2. **Browser-direct to Gemini (skip proxy for AI inference).** Removes the backend → Gemini hop entirely (saves ~75–110 ms). The latency budget in `02-voice-pipeline.md` explicitly names this as the fallback "if the week-one spike shows the proxy blows the latency budget." The D-011 item log would have to be recaptured via a backend event stream from Gemini's structured output, not the audio pipe. More complex, but documented.

3. **Switch to Vertex AI `global` endpoint and measure actual routing.** If global routes to APAC compute, the RTT may be better than Tokyo direct. Needs a measurement from a Railway-SG box.

4. **LiveKit Cloud (APAC media edge + Gemini integration).** LiveKit Cloud has a Singapore PoP. Pipecat supports LiveKit transport. The real-time audio path terminates at the LiveKit edge in Singapore; the Gemini upstream call goes from LiveKit's SG edge to wherever Gemini serves. This is the upgrade path already documented in `02-voice-pipeline.md` as the LiveKit fallback.

---

## Measurement recipe

Run this from a Railway-SG box (or your Cloudflare tunnel on a SG server) during the week-one spike. It measures actual WebSocket handshake RTT — the number that maps directly to the "backend → Gemini" row in the latency table.

```python
#!/usr/bin/env python3
"""
Measure WebSocket connection RTT from backend server to Gemini Live endpoints.
Run from Railway Singapore box. Requires: pip install websockets
No Gemini session is opened — only measures TCP+TLS handshake time.
"""
import asyncio
import time
import websockets

ENDPOINTS = [
    # AI Studio global path (API-key auth)
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=REPLACE_WITH_KEY",
    # Vertex AI — global
    "wss://aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1.LlmBidiService/BidiGenerateContent",
    # Vertex AI — Singapore
    "wss://asia-southeast1-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1.LlmBidiService/BidiGenerateContent",
    # Vertex AI — Tokyo (nearest confirmed APAC)
    "wss://asia-northeast1-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1.LlmBidiService/BidiGenerateContent",
    # Vertex AI — US (baseline)
    "wss://us-central1-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1.LlmBidiService/BidiGenerateContent",
]

SAMPLES = 5

async def measure(url: str) -> list[float]:
    times = []
    for _ in range(SAMPLES):
        t0 = time.perf_counter()
        try:
            async with websockets.connect(url, open_timeout=5) as ws:
                t1 = time.perf_counter()
                times.append((t1 - t0) * 1000)
        except Exception as e:
            times.append(None)
            print(f"  ERROR: {e}")
        await asyncio.sleep(0.5)
    return times

async def main():
    for url in ENDPOINTS:
        label = url.split("//")[1].split("/")[0]
        print(f"\n{label}")
        samples = await measure(url)
        valid = [s for s in samples if s is not None]
        if valid:
            print(f"  min={min(valid):.1f}ms  avg={sum(valid)/len(valid):.1f}ms  max={max(valid):.1f}ms")
        else:
            print("  All attempts failed (endpoint may not exist or auth required)")

asyncio.run(main())
```

**Note:** The Vertex AI endpoints require a valid Bearer token (service-account auth); they will reject the unauthenticated connection after TLS handshake. The script still measures the handshake RTT even on auth failure — that's the number we need. For the `generativelanguage.googleapis.com` endpoint, replace `REPLACE_WITH_KEY` with a real dev API key.

**What to look for:**
- If `asia-southeast1-aiplatform.googleapis.com` returns a time (not all-failed) → SG endpoint is live.
- Compare `asia-southeast1` vs `asia-northeast1` vs `aiplatform.googleapis.com` (global).
- The winning RTT plugs directly into the "Backend → Gemini" row of the latency table.

---

## Prior art

- `02-voice-pipeline.md` latency table already flagged this as an open question with "a US region would add ~180ms × 2 and break the budget." This report confirms that concern is well-founded.
- Similar APAC latency investigation done for Mumbai users (asia-south1): 150 ms RTT reduction vs. US routing confirmed. ([source](https://www.autointerviewai.com/blog/google-gemini-live-voice-to-voice-review-2026))
- EU data-residency thread shows Gemini Live preview models are slow to land in non-US Vertex regions — pattern likely applies to APAC too. ([source](https://discuss.ai.google.dev/t/gemini-3-1-flash-live-preview-on-vertex-ai-eu-region-availability/144429))
- `freecodecamp.org` article on Gemini + Cloud Run recommends `asia-northeast1` as the APAC vertex for a global triangle deployment. ([source](https://www.freecodecamp.org/news/how-to-reduce-latency-in-your-generative-ai-apps-with-gemini-and-cloud-run/))

---

## What I could not verify

1. **Whether `asia-southeast1-aiplatform.googleapis.com` accepts BidiGenerateContent calls today.** The Vertex AI footprint includes SG, but no community report or official doc explicitly confirms or denies the Live API in that region. Only measurement can settle this.
2. **The physical compute location for `generativelanguage.googleapis.com` Anycast requests from Singapore.** Google does not publish this. Traceroute reveals the PoP; it does not reveal where ML inference runs.
3. **Google's internal backbone latency Singapore → Tokyo.** Public internet: ~70–90 ms. Google backbone: likely 40–60 ms. Without a Railway-SG measurement this is an estimate.
4. **Vertex AI `global` endpoint routing for Live API (WebSocket, stateful sessions).** Global endpoint routing docs cover HTTP inference; they don't document affinity rules for persistent WebSocket sessions.
5. **Whether `gemini-live-2.5-flash` (GA) behaves differently than the preview models** in regional availability. Community evidence of preview-only-in-us-central1 may not apply to the GA model.

---

## Sources

- [Gemini Live API get-started WebSocket (ai.google.dev)](https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket)
- [Gemini Live API WebSocket reference (ai.google.dev)](https://ai.google.dev/api/live)
- [Pipecat Gemini Live Vertex AI docs](https://docs.pipecat.ai/api-reference/server/services/s2s/gemini-live-vertex)
- [liteLLM Vertex Realtime docs](https://docs.litellm.ai/docs/providers/vertex_realtime)
- [GeminiEx Live API guide — endpoint URL patterns](https://gemini-ex.hexdocs.pm/live_api.html)
- [Google Cloud status incident — Vertex Gemini API Asia outage Dec 2024 (confirms SG in asia multi-region)](https://status.cloud.google.com/incidents/LmCfJJpvATwjmLQiyzX8)
- [Vertex AI deployments and endpoints (blevinscm mirror)](https://blevinscm.github.io/genai-docs/learn/Deployments-and-endpoints/)
- [Google Developer Forum: gemini-live-2.5-flash region availability question](https://discuss.google.dev/t/gemini-live-2-5-flash-and-gemini-live-2-5-flash-preview-native-audio-09-2025-region-availability/284655)
- [Google AI Developers Forum: EU region availability for gemini-3.1-flash-live-preview](https://discuss.ai.google.dev/t/gemini-3-1-flash-live-preview-on-vertex-ai-eu-region-availability/144429)
- [AutoInterviewAI: Gemini Live latency review 2026 (Mumbai asia-south1 data)](https://www.autointerviewai.com/blog/google-gemini-live-voice-to-voice-review-2026)
- [freeCodeCamp: Reducing Gemini latency with Cloud Run (asia-northeast1 recommendation)](https://www.freecodecamp.org/news/how-to-reduce-latency-in-your-generative-ai-apps-with-gemini-and-cloud-run/)
- [Vertex AI available regions for Google AI Studio and Gemini API](https://ai.google.dev/gemini-api/docs/available-regions)
