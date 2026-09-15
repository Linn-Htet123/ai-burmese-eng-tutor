---
paths: ["apps/web/**/*.tsx", "apps/web/**/*.ts", "src/**/*.tsx", "src/**/*.ts", "app/**/*.tsx", "app/**/*.ts", "components/**"]
---
# Frontend (Next.js / React / TypeScript) — loads only when touching these files

Reads on top of `coding.md`. This file only holds Next.js + React + TS specifics.

## Project layout — route colocation

```
apps/web/
├── src/
│   ├── app/                          # Next.js App Router — routes only
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── _components/      # private, not routable
│   │   │   │   └── _hooks/
│   │   ├── (session)/
│   │   │   └── session/[id]/
│   │   │       ├── page.tsx
│   │   │       ├── _components/      # VoicePlayer, TranscriptPanel
│   │   │       └── _hooks/           # useVoiceSession, useUpgradeLoop
│   │   ├── api/
│   │   │   └── sessions/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/                          # shared across 2+ routes
│   │   ├── api/                      # typed fetch wrappers + Zod parsing
│   │   ├── schemas/                  # Zod schemas (boundary definitions)
│   │   ├── utils/                    # pure, side-effect-free helpers
│   │   └── auth.ts                   # auth helpers (server-side)
│   ├── components/
│   │   └── ui/                       # shadcn/ui primitives
│   ├── hooks/                        # hooks shared across 2+ routes
│   └── types/                        # shared TS types (not Zod schemas)
├── public/
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

**Rules for this layout:**
- **Route-specific components and hooks stay next to the route** in a `_components/` or `_hooks/` private folder (the `_` prefix opts them out of routing).
- **`lib/` only gets code used by 2+ routes.** Resist moving things there early. If a helper is used by one route, keep it colocated.
- **`components/ui/` is for shadcn/ui primitives only.** Feature components live near their route.
- **`lib/schemas/` = Zod schemas** (runtime validation). **`types/` = plain TS types** for things that don't cross a network boundary.

## Zod at the boundary — once

- **Parse at the network boundary:** API responses, form data, environment variables.
- **After `.parse()` returns, the value is typed and trusted.** No re-validation inside hooks, service layers, or components.
- **Use `.safeParse()` when errors are expected** (form UX). Use `.parse()` in `try/catch` when success is the norm.
- **No layered validation.** If you catch yourself writing Zod in three places for the same data, delete two of them.

## Hooks composition

- **Custom hooks are named `useX`, always.** Not `getX`, not `fetchX`.
- **Return a stable shape.** Prefer `{ data, isLoading, error }` over positional tuples for anything with 3+ values.
- **Extract a hook when 2+ components need the same state logic**, not before.
- **Hooks stay under ~80 lines.** If a hook grows past that, split its concerns (data fetching + derived state + side effects into separate hooks).

## Server vs client components (Next.js App Router)

- **Default to server components.** Client component (`"use client"`) only when you need: hooks, browser APIs, event handlers, or interactive state.
- **Pass server data down as props.** Don't `fetch()` in a client component if the parent server component could have done it.
- **The `"use client"` boundary is a wall.** Everything below it is client-side; move it as low in the tree as possible.

## Component patterns

- **Plain function components.** No class components (React has moved on).
- **Props typed with `interface Props` or `type Props`** — pick one style per file and stick with it.
- **No default exports** except for pages (`page.tsx`) and layouts (`layout.tsx`) where Next.js requires them. Named exports everywhere else.
- **Feature components live near their route.** shadcn/ui primitives live in `components/ui/`. The line is: is this reusable in multiple different features? If yes, `components/ui/`. If no, keep it colocated.

## JSDoc — only on public surface

- **Write JSDoc on exported hooks and utilities** so the hover tooltip is useful to callers in other files.
- **Do NOT include type annotations inside JSDoc** — the TS compiler ignores them, and they rot.
- **No JSDoc on internal (single-file) functions.** Types + a clear name are enough.

```typescript
/**
 * Opens a WebSocket to the voice backend and returns a controller
 * that the caller uses to send audio and receive transcripts.
 */
export function openVoiceSocket(sessionId: string): VoiceSocketController { ... }
```

## Testing

- **Every user-facing state gets a `data-testid`** so @qa can find it in Playwright.
- **Test titles for spec scenarios:** `S1 happy: ...`, `S2 edge: ...` — the exact string helps `/qa` map results back to the spec.
- **Prefer Testing Library queries** over `data-testid` when a semantic query works (`getByRole`, `getByLabelText`). Use `data-testid` when semantics don't fit or the QA agent needs a stable hook.

## Style / design

- **Prefer the design source** (Figma or a design doc) over guessing a layout.
- **Tailwind classes go in the JSX**, not in separate CSS files.
- **shadcn/ui first.** If a primitive exists in shadcn's registry, install it — don't hand-roll.
- **No prop drilling past 3 levels.** If you're passing something through 3+ components, use React Context or restructure.

## State — small footprint

- **`useState` for local state.** No Redux, no Zustand, no MobX at MVP. React 19 + Context handles what we need.
- **URL is state.** If a piece of state should survive a refresh or be shareable, put it in the URL (search params) via Next.js's `useSearchParams`.
- **Server state (fetched data) uses TanStack Query** when we need cache/refetch/invalidate. Not before.

## Not making things up

- **Never invent a field on a type** because your logic needs it. Read the actual API response schema. If the field doesn't exist, either add it to the API (with a real reason) or restructure the client logic.
- **Never mock an API response with fake shape.** Use the real Zod schema; use its `.parse()` on a fixture that matches production.
