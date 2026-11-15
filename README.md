# ai-burmese-eng-tutor

AI voice English tutor for Burmese adults. The tutor is **May**. Product name TBD.

## Layout
| Path | What |
|---|---|
| `apps/web` | Next.js + shadcn/ui: Today screen, call screen, three-state voice orb, mic, VAD, playback |
| `apps/voice` | Node WebSocket gateway to Gemini Live: conductor, tool gate, item log |
| `packages/brain` | LangGraph.js planner, processor and level judge; the guard; memory and prompts |
| `packages/shared` | zod schemas and the browser ↔ gateway protocol |
| `docs/` | Requirements, decisions (D-001…D-057) and designs. Start at `docs/technical-designs/10-agentic-patterns-map.md` |

## Run it
Needs Node 22 and pnpm 10.

```bash
pnpm install
```

Without a Gemini key, the gateway runs a scripted May, so the whole UI works:

```bash
FAKE_GEMINI=1 pnpm --filter @may/voice dev
```

```bash
pnpm --filter @may/web dev
```

Open http://localhost:3000. Add `&debug=1` to the call URL to see response and barge-in times.

With a real key, copy `apps/voice/.env.example` to `apps/voice/.env`, set `GEMINI_API_KEY`, and start the gateway with:

```bash
pnpm --filter @may/voice exec tsx --env-file=.env src/server.ts
```

On a phone, the mic needs HTTPS. Tunnel both ports, for example with `npx cloudflared tunnel --url http://localhost:3000`, and set `NEXT_PUBLIC_VOICE_URL` to the gateway's `wss://` tunnel URL.

## Check
```bash
pnpm typecheck
```

```bash
pnpm test
```
