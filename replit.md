# AION Orchestra

A music creation workspace that turns prompts and lyrics into playable tracks, with a generation queue and an AION CORE-ready workflow.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/aion-orchestra/src/App.tsx` — composer workspace, generation progress, archive, and playback UI
- `artifacts/aion-orchestra/src/pages/voice-to-instrument.tsx` — voice-to-instrument studio and saved performance library
- `artifacts/aion-orchestra/src/pages/voice-to-instrument.css` — dark voice performance workspace styling
- `artifacts/api-server/src/routes/songs.ts` — generation, workspace summary, favorites, and demo audio endpoints
- `lib/api-spec/openapi.yaml` — source of truth for the music workspace API
- `lib/db/src/schema/songs.ts` — Drizzle schema for generated song sessions
- `artifacts/aion-orchestra/src/index.css` — AION Orchestra visual tokens and motion

## Architecture decisions

- The first release uses an in-process MelodyCraft Engine that produces a deterministic playable WAV while keeping the model selection contract ready for ACE-Step and YuE adapters.
- Song metadata is persisted in PostgreSQL; audio is rendered on demand from the completed session so the demo does not depend on a separate storage bucket.
- The frontend uses generated React Query hooks from the OpenAPI contract and polls active sessions until they complete.

## Product

- Compose tracks from a natural-language prompt, style, length, energy, optional lyrics, and model choice.
- Watch queued generations progress through motif, arrangement, and finalization stages.
- Play completed tracks, browse recent sessions, and favorite tracks.
- See workspace totals for tracks, playable cuts, minutes created, favorites, and active generations.
- Open `/perform` for the voice-to-instrument workspace; saved performances are available at `/perform/library`.

## User preferences

No standing preferences recorded.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` before checking app packages.
- The current workspace validation package does not support generated `zod.int()` helpers; use numeric OpenAPI fields unless the Zod dependency is upgraded in a coordinated change.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
