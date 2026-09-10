# Audio recording and storage — capture, store, play back every session

**Status:** Approved (2026-09-07)
**Author:** Larry (Thar Linn Htet)
**Last updated:** 2026-09-10 (updated storage math for D-042 session shape)

## Requirements this implements
- `R-ON-7` — placement session audio is recorded and retained. Non-negotiable: without it there is no before-and-after clip
- `R-SE-9` — session audio recorded in full, consent captured at signup; learner can play back any past session
- `R-PR-2` — before-and-after playback: placement clip beside the most recent session clip, available from session 6
- `R-TE-10` — audio stored with per-learner access control; only the learner and the founder can access it
- `R-PR-4` — two separate consents: recording for the learner's own use (signup), public marketing use (session 12)

## Related decisions
- `D-035` — voice traffic is proxied through our backend. This is what makes server-side capture free: the audio already flows through us.
- `D-037` — hosting on Railway; audio storage is Cloudflare R2 (this doc details that consequence). Earlier Vercel Blob pick died with the Vercel hosting plan.
- `D-039` — this doc's capture/storage architecture, as logged.
- `D-040` — recordings kept indefinitely, deletion only on learner request. Governs retention.
- `D-042` — 40-minute sessions, up to one per day (subscription model). Sets storage math baseline.

## Context

The before-and-after clip — a learner's week-one voice next to their week-four voice — is the product's proof, retention tool, and marketing asset in one (vision doc). That makes recording a hard dependency from the very first placement session: retroactive capture is impossible. Learners play back sessions on mid-range Android phones and older iPhones, so playback must be boringly universal.

## Decision

**Capture server-side in the FastAPI proxy, two tracks per session, buffered to local disk, uploaded to Cloudflare R2 at session end, background-transcoded to M4A for playback, served via short-lived signed URLs.**

```
During session (in the FastAPI proxy — audio flows through it anyway, per D-035)
   learner Opus frames  ──► append to /tmp/{session}/learner.ogg
   May's audio (PCM→Opus) ─► append to /tmp/{session}/may.ogg

Session end (background job, not in the hot path)
   1. upload both .ogg tracks to R2                    (originals, keep forever)
   2. ffmpeg: mix both tracks → session.m4a → R2       (the playback file)
   3. write recordings row in DB (session, learner, duration, R2 keys)
   4. delete /tmp/{session}/

Playback
   learner presses play → backend checks: is this YOUR recording (or founder)?
   → issues R2 presigned URL, 15-minute expiry → <audio src="..."> plays M4A
```

### The pieces, and why

- **Server-side capture (not browser-side).** The proxy already handles every audio frame. Capturing there costs almost nothing, and a flaky phone can never lose a recording. A browser-side recorder would have to survive tab closes, crashes, and Myanmar mobile drops, then upload 10+ MB over the same bad connection.
- **Two tracks, learner and May separate.** Before/after marketing clips (R-PR-2) want the *learner's* voice. With separate tracks that is a clean cut; from a mixed file, un-mixing is impossible. The mixed M4A for playback is derived, not the source of truth.
- **Buffer on disk, upload at end.** One upload per track per session, with retry. A mid-session server crash loses that one recording — rare and acceptable at MVP scale. (Streaming multipart upload is the documented upgrade if recordings become revenue-critical.)
- **Opus capture → M4A playback.** Opus is what the live pipeline already speaks (tiny, fast). But Opus playback is unreliable on older Safari/iOS — exactly our audience — so a background ffmpeg step produces a universally playable M4A. Seconds of CPU per session, fully async.
- **Cloudflare R2.** S3-compatible object storage, ~$0.015/GB-month, **zero egress fees** — learners replaying sessions costs us nothing. All access goes through a thin storage module (`storage.py`) so the vendor can be swapped by rewriting one file.
- **Presigned URLs for access control (R-TE-10).** R2 objects are private. The backend authorises (recording owner or founder only), then signs a URL valid for 15 minutes. No audio bytes ever stream through our backend at playback time.

### Consent gating (R-PR-4)

- **Consent 1 (signup):** recording for the learner's own use. Captured before the placement session; without it there is no session (R-ON-7 makes recording non-negotiable, so consent is part of signup, not optional fine print).
- **Consent 2 (session 12):** public marketing use. A boolean + timestamp on the learner row. It changes *permission*, not storage — nothing is stored differently. Marketing may only touch recordings where this flag is true.

### Before/after clips (R-PR-2)

From session 6, the progress page shows the placement recording beside the latest session recording. MVP implementation: play the two full learner tracks side by side with seek — **no automated clip extraction**. Cutting the best 20 seconds is editorial work the founder does by hand for marketing (with consent 2), not a pipeline feature. Automated highlight extraction is deliberately out of scope.

### Storage layout and cost

```
r2://recordings/{learner_id}/{session_id}/learner.ogg   (source of truth)
r2://recordings/{learner_id}/{session_id}/may.ogg       (source of truth)
r2://recordings/{learner_id}/{session_id}/session.m4a   (derived, playback)
```

Per D-042: 40-minute sessions × up to one per day. Roughly 21 sessions/learner/month at realistic usage (~70% of days), ~30 at whale usage. At ~24 MB per session (all three files, scaled from 30-min baseline):

- **Realistic:** 50 learners × 21 sessions × ~24 MB ≈ **25 GB ≈ $0.38/month**
- **Whale case:** 50 learners × 30 sessions × ~24 MB ≈ **36 GB ≈ $0.54/month**

Cost is a non-issue at any MVP multiple.

### Retention

Keep indefinitely (D-040). Under D-042 there is no course expiry — the subscription runs monthly and recordings are retained regardless of subscription state. Recordings are the before/after marketing asset and the learner's own record. Deletion only on learner request (and then actually delete, all three files plus the DB row).

## Alternatives considered

- **Vercel Blob** — original pick while hosting was Vercel. Dropped with D-037: its advantage was platform bundling we no longer have, and R2's zero egress is strictly better for replay-heavy audio.
- **Browser-side recording (MediaRecorder) + upload** — no server capture code. Rejected: the recording then depends on the least reliable machine in the system (a mid-range phone on Myanmar mobile data) for the product's single most irreplaceable artefact (R-ON-7 "retroactive capture is impossible").
- **One mixed file only** — simplest storage. Rejected: permanently locks us out of learner-only marketing clips.
- **Streaming multipart upload during the session** — crash-proof. Rejected for MVP: meaningfully more code for a failure mode (mid-session server crash) we accept at this scale. Documented upgrade path.
- **Serve raw Opus, no transcode** — zero processing. Rejected: playback reliability on older iPhones is exactly where the retention tool must not fail.
- **Postgres BYTEA / storing audio in the database** — wrong tool: databases are for rows, object storage is for files. Never seriously considered, recorded so it stays that way.

## Trade-offs

- **A crashed server loses that session's recording** (disk buffer, upload at end). Accepted at MVP; upgrade is multipart streaming.
- **ffmpeg becomes a runtime dependency** of the backend image (adds ~50 MB). Accepted; it also serves any future clip tooling.
- **Signed URLs can be shared for their 15-minute lifetime.** Accepted: audio of your own English practice is low-sensitivity relative to the UX cost of tighter schemes.
- **Keeping recordings forever** grows storage linearly. At ~$0.015/GB-month this stays trivial for years; revisit only if per-learner audio exceeds ~1 GB.

## Open questions
- [ ] R2 region/jurisdiction check: R2 location hints — is `apac` close enough for upload from Railway Singapore? (Upload is async, so latency matters little; verify anyway.) (Owner: Larry)
- [ ] Exact Opus container details from the pipeline (ogg pages vs raw frames) — decides whether capture is pure file-append or needs a light muxing step. Resolve during the week-one spike. (Owner: Larry)
- [ ] Where does the ffmpeg job run — in-process background task (simplest) or a small worker queue? Start in-process; revisit if session-end CPU spikes hurt live sessions. (Owner: Larry)
- [ ] Learner-requested deletion flow (UI + actual object deletion) — MVP feature or post-MVP? (Owner: Larry)

## Rollout / next steps
- [ ] Week-one spike already exercises the proxy (02-voice-pipeline); add naive two-track disk capture to it — even before R2 exists — so placement recordings are never lost (R-ON-7).
- [ ] Create R2 bucket + `storage.py` wrapper (put, presign, delete).
- [ ] Session-end job: upload, transcode, DB row, cleanup.
- [ ] Playback endpoint with owner/founder authorisation → presigned URL.
- [ ] Consent 1 wired into signup flow; consent 2 flag + session-12 prompt (with onboarding/auth design doc).
