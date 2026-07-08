# SafeBite Travel

Allergy-aware travel food assistant (mobile-first PWA). Helps travelers understand local
dish risk, keep an offline allergy card, and generate bilingual (EN/VI) restaurant question
cards. **Risk reduction, not risk elimination** — the app never guarantees food safety.

> Monorepo built in place with pnpm workspaces: `apps/web` (Next.js PWA) and
> `packages/domain` (shared, framework-free risk engine + question-card logic).
> The Hanoi seed data lives in `osm_overpass_seed_kit/` (not a workspace package).

## Requirements

- Node `>=20` (repo pinned to Node 20 via `.nvmrc`)
- pnpm `11.3.0` (`corepack enable` recommended)
- Docker (for the local PostgreSQL + PostGIS database)

## Quick start

```bash
pnpm install
docker compose up -d db                          # PostgreSQL + PostGIS on :5433
pnpm db:migrate                                  # apply the schema
pnpm db:seed                                     # allergens, profile templates
pnpm seed:kit -- --kit ./osm_overpass_seed_kit   # Hanoi dishes + generated risks
pnpm dev                                          # http://localhost:3000 → /en
```

Seeded dishes import as `needs_review`; approve them in `/admin` (or, for a local demo, run
`pnpm --filter @safebite/web exec tsx scripts/approve-seed-content.ts`) before they appear in
the dish guide.

## Workspace scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Run the web app (Next.js dev server) |
| `pnpm build` | Production build (Prisma generate + Next build) |
| `pnpm typecheck` | `tsc --noEmit` across packages |
| `pnpm lint` | ESLint across packages (`pnpm -r lint`) |
| `pnpm test` | Vitest unit suites (domain + web) — DB-free |
| `pnpm test:e2e` | Playwright happy path (needs a built + seeded app) |
| `pnpm copy:check` | Forbidden-safety-copy guard (`assert-no-unsafe-copy.ts`) |
| `pnpm format` / `format:check` | Prettier write / check |

The merge gate (mirrors §21 DoD): `pnpm typecheck && pnpm lint && pnpm test && pnpm copy:check`
all green, plus `pnpm test:e2e` against a seeded DB. CI (`.github/workflows/ci.yml`) runs the
four unit/quality gates in a **quality** job and the Playwright happy path in an **e2e** job
(PostGIS service → migrate → seed → seed:kit → approve → build → Playwright).

## Manual PWA QA (§17.3)

Run against a production build (`pnpm build && pnpm --filter @safebite/web start`) on a phone or
mobile emulation:

- [ ] Onboarding completes without an account; `/home` shows no profile data in the URL.
- [ ] "Add to home screen" install works; the installed app opens standalone.
- [ ] Go offline, reload `/allergy-card` → the saved card renders with the "Available offline" label and the offline banner.
- [ ] Offline, open the question card → the last saved card is shown (never a blank screen).
- [ ] Offline `/dishes` → previously saved dishes appear, or the allergy-card CTA when none are saved.
- [ ] Every status shows icon + label + colour (not colour alone); Suitable cards show the confirm-with-staff caveat.
- [ ] Light and dark both legible; `prefers-reduced-motion` disables shimmer/slide.

## Status

Phases 01–13 (Phase 0 + 1) implemented: bootstrap, web foundation, database, seed importer,
domain risk engine, public API, PWA shell, IndexedDB, onboarding/profile/allergy card, dish
guide, question card, admin CRUD, and the test/copy-guard/CI quality layer. See `plans/` for the
full implementation plan and `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md` for the spec.
