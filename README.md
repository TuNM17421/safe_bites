# SafeBite Travel

Allergy-aware travel food assistant (mobile-first PWA). Helps travelers understand local
dish risk, keep an offline allergy card, and generate bilingual (EN/VI) restaurant question
cards. **Risk reduction, not risk elimination** — the app never guarantees food safety.

> Monorepo built in place with pnpm workspaces: `apps/web` (Next.js PWA) and
> `packages/domain` (shared, framework-free risk engine + question-card logic).
> The Hanoi seed data lives in `osm_overpass_seed_kit/` (not a workspace package).

## Requirements

- Node `>=20` (repo pinned to Node 24 via `.nvmrc`)
- pnpm `11.3.0` (`corepack enable` recommended)
- Docker (for the local PostgreSQL + PostGIS database)

## Quick start

```bash
pnpm install
docker compose up -d db
pnpm db:migrate                                  # activates in Phase 03
pnpm db:seed                                     # activates in Phase 03
pnpm seed:kit -- --kit ./osm_overpass_seed_kit   # activates in Phase 04
pnpm dev                                         # activates in Phase 02
```

## Workspace scripts

| Script | Purpose |
|---|---|
| `pnpm lint` | ESLint across packages (`pnpm -r lint`) |
| `pnpm typecheck` | `tsc --noEmit` across packages |
| `pnpm test` | Vitest across packages |
| `pnpm format` / `format:check` | Prettier write / check |
| `pnpm copy:check` | Forbidden-safety-copy guard (implemented in the tests phase) |

## Status

Phase 01 (bootstrap) is the current foundation. App, database, importer, domain engine,
API, PWA, and admin land in Phases 02–13. See `plans/` for the full implementation plan and
`docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md` for the spec.
