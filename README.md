# SafeBite Travel

Allergy-aware travel food assistant (mobile-first PWA) for the **Hanoi** pilot. Travelers build a
private allergy profile, browse local dishes graded by risk for that profile, keep an offline
bilingual allergy card, and generate an EN/VI "show-to-staff" question card.

> **Risk reduction, not risk elimination** — the app never claims a dish is safe. An unknown risk is
> shown honestly and is *never* upgraded to "Suitable".

## What it does

- **Local-first onboarding** — pick allergens (severity + cross-contact), dietary profiles, city, and
  language. No account; the profile lives only in the browser (IndexedDB), never in the URL or on a server.
- **Dish guide** (`/dishes`) — per-profile recommendations grouped by status in priority order
  **Avoid → Risky → Ask First → Unknown → Suitable**; every card shows source, confidence, reason,
  action, and last-checked. EN/VI data toggle independent of the UI locale.
- **Question card** (`/question-card`) — a deterministic bilingual card for restaurant staff, with a
  target-language toggle, large-text + fullscreen presentation modes, copy-to-clipboard, and offline
  regeneration.
- **Offline allergy card** (`/allergy-card`) — a self-contained EN+VI summary that works with no network.
- **Admin console** (`/admin`) — cookie-authenticated CRUD for dishes, ingredients, and dish-allergen
  risks, with a review workflow (`needs_review` → `approved`).
- **PWA** — installable; a service worker + IndexedDB keep the allergy card and last question card
  reachable offline.

## Architecture

```
safe_bites/
├─ apps/web/               # Next.js 15 PWA — routes, /api, Prisma schema, components, features
├─ packages/domain/        # framework-free risk engine, question-card templates, Zod schemas
├─ osm_overpass_seed_kit/  # Hanoi seed CSVs (dishes, ingredients, restaurants, profiles)
├─ docs/                   # spec, deployment runbook, standards
└─ plans/                  # phased implementation plan
```

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, RSC-first) + React 19 |
| i18n | next-intl — locale-prefixed routing (`/en`, `/vi`); links via `@/i18n/navigation` |
| UI | Tailwind CSS v3 + the `sb-*` design-system tokens (light/dark) + `lucide-react` icons |
| Database | Prisma 6 + PostgreSQL 16 + PostGIS |
| Validation | Zod at every API boundary |
| Client state | Zustand (profile store) + TanStack Query (server cache) |
| Offline | Dexie (IndexedDB) + Serwist (service worker) |
| Domain | `@safebite/domain` — pure `evaluateDishes` risk engine + `buildQuestionCard`, no framework, no LLM |

**Core principles**

- **Safety invariant** — five status labels only (Suitable · Ask First · Risky · Avoid · Unknown);
  unknown never becomes Suitable; every Suitable card carries the confirm-with-staff caveat. A CI copy
  guard (`copy:check`) blocks forbidden "safe" wording across code, i18n messages, prisma, and the offline shell.
- **Deterministic** — recommendations and question cards are template logic (§15), identical online and offline.
- **Discovery-only OSM/OpenMap** — restaurant rows import as `unverified` and are hidden from Phase-1 UX.

### Routes

- **Public** (locale-prefixed `/en`, `/vi`): `/` landing · `/onboarding` · `/home` · `/dishes` +
  `/dishes/[dishId]` · `/allergy-card` · `/question-card` · `/profile` · `/offline`.
- **Admin** (cookie auth, not locale-prefixed): `/admin` · `/admin/login` · `/admin/dishes` ·
  `/admin/ingredients` · `/admin/dish-risks`.

### API (`/api`)

- `GET /api/health` → `{ status, db }`.
- **Public `/api/v1`**: `allergens`, `client-config`, `profile-templates`, `dishes` (+ `/[dishId]`),
  `recommendations/dishes` (POST — the profile is sent in the body, never the URL), `question-cards` (POST).
- **Admin `/api/v1/admin`** (`ADMIN_TOKEN` httpOnly cookie): `login`, and CRUD for `dishes`,
  `ingredients`, `dish-risks`.

## Requirements

- Node `>=20` (pinned via `.nvmrc`)
- pnpm `11.3.0` (`corepack enable` recommended)
- Docker (local PostgreSQL + PostGIS)

## Quick start

```bash
pnpm install
docker compose up -d db                          # PostgreSQL + PostGIS on :5432
pnpm db:migrate                                  # apply the schema + PostGIS init migration
pnpm db:seed                                     # 14 allergens + 6 profile templates
pnpm seed:kit -- --kit ./osm_overpass_seed_kit   # Hanoi dishes + generated DishAllergenRisk
pnpm dev                                          # http://localhost:3000 → /en
```

Seeded dishes import as `needs_review`; the dish guide serves `approved` rows only. Approve them in
`/admin`, or for a local demo run
`pnpm --filter @safebite/web exec tsx scripts/approve-seed-content.ts`.

## Workspace scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build (`prisma generate` + `next build`) |
| `pnpm typecheck` | `tsc --noEmit` across packages |
| `pnpm lint` | ESLint across packages |
| `pnpm test` | Vitest unit suites (domain + web) — DB-free |
| `pnpm test:e2e` | Playwright happy path (needs a built + seeded app) |
| `pnpm copy:check` | Forbidden-safety-copy guard (`assert-no-unsafe-copy.ts`) |
| `pnpm db:migrate` | Apply migrations locally (`prisma migrate dev`) |
| `pnpm db:deploy` | `prisma migrate deploy` (prod/CI) |
| `pnpm db:seed` | Seed allergens + profile templates |
| `pnpm seed:kit` | Import Hanoi dishes + generated risks from the seed kit |
| `pnpm seed:openmap` | Opt-in OpenMap.vn restaurant import (discovery-only, off the critical path) |
| `pnpm format` / `format:check` | Prettier write / check |

## Quality gates

The merge gate (mirrors §21 DoD): `pnpm typecheck && pnpm lint && pnpm test && pnpm copy:check` all
green, plus `pnpm test:e2e` against a seeded DB. CI (`.github/workflows/ci.yml`) runs the four
unit/quality gates in a **quality** job and the Playwright happy path in an **e2e** job
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

## Deployment

Production runs on **Vercel** (Next.js app) + **Neon** (serverless Postgres + PostGIS), co-located in
Singapore. See **[`docs/deployment.md`](docs/deployment.md)** for the full runbook — Neon setup,
Vercel root directory + env vars, migrate-on-deploy (pooled vs direct URL), the one-time production
seed, preview branches, rollback, and troubleshooting.

## Documentation

- Spec: [`docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`](docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md)
- Deployment runbook: [`docs/deployment.md`](docs/deployment.md)
- Design tokens: [`apps/web/DESIGN_TOKENS.md`](apps/web/DESIGN_TOKENS.md)
- Implementation plan (phases 01–16): [`plans/`](plans/)

## Status

Phase 0/1 implemented (phases 01–13): bootstrap, web foundation, database, seed importer, domain risk
engine, public API, PWA shell, IndexedDB, onboarding/profile/allergy card, dish guide, question card,
and the test/copy-guard/CI quality layer — plus the additive admin CRUD (12), OpenMap discovery
importer (14), the deployment runbook (15), and the design-system re-skin (16). Live cloud
provisioning is a manual operator task (see the deployment runbook).
