# Phase 01 — Repo Bootstrap & Tooling

## Context Links

- Spec: `docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md`
  - §1 Scope Lock (Phase 0/1 in/out) — lines 39-96
  - §2 Fixed Product Decisions — lines 99-117
  - §3 Repository Structure — lines 120-233
  - §4 Environment and Commands (`.env.example`, `docker-compose.yml`, root scripts) — lines 236-297
  - §16 Copy Safety Guard (`copy:check` script name only, impl deferred) — lines 1570-1599
  - §17 Tests (Vitest unit targets, Playwright e2e) — lines 1603-1650
  - §18 P0-01 acceptance — lines 1655-1665
- Sibling phases (planned; filenames may vary): `phase-02-nextjs-app-foundation.md`, `phase-03-database-and-prisma.md`, `phase-04-seed-kit-importer.md`, `phase-05-domain-package.md`, `phase-06-api-skeleton.md`
- Seed kit (NOT a workspace package — Python, consumed later): `osm_overpass_seed_kit/` (`outputs/*.csv`, `schemas/*.csv`, `scripts/`)

## Overview

- **Priority:** P0 — first, blocking. Every other phase depends on this.
- **Current status:** ✅ Done — verified 2026-07-08 (`pnpm install/typecheck/lint/test` + `docker compose config` all green). Notes: added a root `eslint.config.mjs` (spreads base) so root-cwd ESLint resolves a flat config; approved the `esbuild` build script (vitest dep) via `allowBuilds`/`onlyBuiltDependencies` in `pnpm-workspace.yaml`; replaced a stale root `README.md` (old "OpenMap Seed Starter").
- **Brief description:** Stand up the pnpm monorepo **in place** at repo root `safe_bites/`, alongside the existing `osm_overpass_seed_kit/` and `docs/`. Create workspace config, shared TypeScript base config, root scripts (§4.3), `.env.example` (§4.1), `docker-compose.yml` (§4.2), `.gitignore`, package skeletons for `apps/web` and `packages/domain`, and shared ESLint/Prettier + typecheck/lint/test wiring. **No app logic, no Next config, no domain business rules** — those belong to later phases. Definition of done = `pnpm install`, `pnpm typecheck`, `pnpm lint` all succeed (§18 P0-01).

## Key Insights

- **In-place monorepo.** Root of the git repo IS the workspace root (`safe_bites/`). The spec §3 draws the tree under a `safe-bite-travel/` name, but per the locked decision we build in place. `osm_overpass_seed_kit/` and `docs/` sit beside `apps/` and `packages/` and are NOT workspace members (workspace globs are `apps/*` and `packages/*` only).
- **Bootstrap must go green with almost no source.** P0-01 acceptance runs `pnpm typecheck` and `pnpm lint`. `tsc --noEmit` errors on "no inputs found", so `packages/domain` gets one intentional placeholder entry (`src/index.ts` → `export {}`) to be replaced in the domain phase. `apps/web` has **no** `lint`/`typecheck`/`test` scripts yet — `pnpm -r <script>` silently skips packages that don't define the script, so the web app's tooling is wired in Phase 02 when it actually has source. This keeps the acceptance surface honest (no fake/no-op scripts).
- **Honor the exact script strings in §4.3.** They are the acceptance/CI surface. `lint`, `test`, `typecheck` use `pnpm -r`, so tooling config is **per-package extending a shared base** (ESLint flat config does not walk up past a package's own `eslint.config.mjs`). One shared `eslint.config.base.mjs` at root keeps it DRY.
- **i18n = next-intl (CONFIRMED override of §2 line 111).** Do **NOT** scaffold the spec's "simple dictionary" `src/lib/i18n.ts`. next-intl wiring (`@/i18n/navigation`, `/en` `/vi` routing, `messages/{en,vi}.json`) is owned by the app-foundation phase. Bootstrap only ensures the workspace can host it later.
- **Semantic color tokens / Tailwind** are a Phase 02 concern (`apps/web/tailwind.config.ts`). Nothing in bootstrap should introduce raw hex/rgb.
- **`copy:check` (§16) name is wired now, implementation is later.** Root `package.json` references `copy:check` per §4.3, delegating to `@safebite/web`. The actual `scripts/assert-no-unsafe-copy.ts` denylist gate is created in the safety-guard/tests phase. Do not run `pnpm copy:check` as part of this phase's acceptance.
- **Downstream integration hooks (not built here, but the workspace must be ready to host them):** the CSV importer needs a **BOM-aware** parser (kit CSVs are UTF-8-sig; Phase 04), enum reconciliation at import (Phase 03/04), and Prisma `Decimal → number` response mapping (Phase 06). Bootstrap adds none of these deps — it just doesn't preclude them.
- **PostGIS image is intentional.** `postgis/postgis:16-3.4` (§4.2) gives Phase 2 geo-readiness even though Phase 1 shows no restaurant UX. OSM data stays discovery-only downstream.

## Requirements

### Functional

1. `pnpm install` from repo root resolves the two-package workspace (`apps/web`, `packages/domain`) with zero errors.
2. `pnpm typecheck` runs `tsc --noEmit` across packages that define it (domain) and succeeds.
3. `pnpm lint` runs ESLint across packages that define it (domain) and succeeds.
4. `pnpm test` runs Vitest across packages that define it (domain) and succeeds (green with `--passWithNoTests`).
5. Root scripts exist verbatim per §4.3: `dev`, `build`, `lint`, `test`, `typecheck`, `db:migrate`, `db:seed`, `seed:kit`, `copy:check` (later scripts may be non-runnable until their owning phase, but must be present).
6. `.env.example`, `docker-compose.yml`, `.gitignore`, `pnpm-workspace.yaml`, `tsconfig.base.json` exist with the content in §4.
7. `docker compose config` validates (compose file is well-formed; DB not required to run in this phase).

### Non-functional

- **KISS/YAGNI/DRY:** shared base configs (ts/eslint/prettier), no per-package duplication; no husky/lint-staged/turbo/CI-yaml in this phase (add only if a later phase needs it).
- **File size:** every config/skeleton file well under ~200 lines.
- **Determinism:** pin `packageManager` (pnpm) and Node `engines` (`>=20`; local env runs Node 24 / pnpm 11) so installs are reproducible.
- **No secrets committed:** only `.env.example` (placeholders); real `.env` is git-ignored. `ADMIN_TOKEN` stays `change-me-in-dev`.
- **No forbidden safety copy** anywhere (trivially satisfied — no product copy in this phase).

## Architecture

**System design.** A pnpm-workspaces monorepo with a shared TS/lint/format toolchain at the root and two members:

```
safe_bites/                      # git root = workspace root (in place)
  package.json                   # private root: §4.3 scripts + shared devDeps
  pnpm-workspace.yaml            # packages: apps/*, packages/*
  tsconfig.base.json             # strict base; paths: @safebite/domain -> packages/domain/src
  eslint.config.base.mjs         # shared flat config (js + typescript-eslint)
  .prettierrc.json .prettierignore
  .env.example  docker-compose.yml  .gitignore  .nvmrc  README.md
  apps/web/                      # @safebite/web — package.json + tsconfig only (skeleton)
  packages/domain/               # @safebite/domain — package.json, tsconfig, eslint, vitest, src/index.ts (export {})
  osm_overpass_seed_kit/         # existing, NOT a workspace member
  docs/                          # existing spec
```

**Component interactions.** Root scripts fan out with `pnpm -r` (lint/test/typecheck) or `pnpm --filter @safebite/web` (dev/build/db/seed/copy). `tsconfig.base.json` `paths` let any package import `@safebite/domain` by alias; each package's `tsconfig.json` `extends` the base. Each package's `eslint.config.mjs` spreads `eslint.config.base.mjs` (DRY). pnpm hoists shared devDependencies (typescript, eslint, prettier, vitest, typescript-eslint) to the root `node_modules` so member packages resolve them.

**Data flow.** None yet — no runtime code. Only build/tooling graph is established.

## Related Code Files

### To create

- `package.json` (root, private, `packageManager`, `engines`, §4.3 scripts, shared devDeps)
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `eslint.config.base.mjs`
- `.prettierrc.json`
- `.prettierignore`
- `.env.example` (§4.1 verbatim)
- `docker-compose.yml` (§4.2 verbatim)
- `.gitignore`
- `.nvmrc` (`20`)
- `README.md` (root — minimal: dev bootstrap steps from §4.3)
- `apps/web/package.json` (name `@safebite/web`, `private`, version — scripts filled in Phase 02)
- `apps/web/tsconfig.json` (extends base; Phase 02 adds next plugin/jsx)
- `packages/domain/package.json` (name `@safebite/domain`, `type: module`, exports, scripts `typecheck`/`lint`/`test`)
- `packages/domain/tsconfig.json` (extends base, `include: ["src"]`)
- `packages/domain/eslint.config.mjs` (spreads base)
- `packages/domain/vitest.config.ts` (node env, `passWithNoTests`)
- `packages/domain/src/index.ts` (placeholder `export {}` — replaced in Phase 05)

### To modify

- None (fresh scaffold; repo currently has only `docs/`, `osm_overpass_seed_kit/`, `.idea/`).

### To delete

- None.

## Implementation Steps

1. **Workspace manifest.** Create `pnpm-workspace.yaml` with `packages: ["apps/*", "packages/*"]`.
2. **Root `package.json`.** `private: true`; `packageManager: "pnpm@<team-pinned>"` (local env: pnpm 11.3.0); `engines.node: ">=20"`; scripts copied verbatim from §4.3; shared `devDependencies`: `typescript`, `eslint`, `@eslint/js`, `typescript-eslint`, `prettier`, `vitest`, `@types/node`. Optionally add `format`/`format:check` (Prettier convenience — additive, harmless).
3. **`tsconfig.base.json`.** `strict: true`, `moduleResolution: "Bundler"`, `module: "ESNext"`, `target: "ES2022"`, `lib: ["ES2022","DOM","DOM.Iterable"]`, `esModuleInterop`, `skipLibCheck`, `resolveJsonModule`, `isolatedModules`, `noUncheckedIndexedAccess`, `forceConsistentCasingInFileNames`, `baseUrl: "."`, `paths: { "@safebite/domain": ["packages/domain/src/index.ts"], "@safebite/domain/*": ["packages/domain/src/*"] }`.
4. **Shared lint/format.** Create `eslint.config.base.mjs` (flat config array: `@eslint/js` recommended + `typescript-eslint` recommended, plus `ignores` for `**/node_modules`, `**/.next`, `**/dist`, `**/coverage`, `**/*.d.ts`, `**/prisma/migrations`). Create `.prettierrc.json` (2-space, single quotes, semi, trailing comma `all`, print width 100) and `.prettierignore` (build/gen dirs, lockfile).
5. **Env & infra files.** Create `.env.example` (§4.1 verbatim, incl. `ADMIN_TOKEN="change-me-in-dev"`), `docker-compose.yml` (§4.2 verbatim, `postgis/postgis:16-3.4`), `.nvmrc` (`20`).
6. **`.gitignore`.** Ignore `node_modules/`, `.next/`, `dist/`, `build/`, `coverage/`, `*.tsbuildinfo`, `.env`, `.env.*` (but `!.env.example`), `playwright-report/`, `test-results/`, `.turbo/`, `.DS_Store`, `*.log`, `__pycache__/`, Prisma generated client.
7. **`packages/domain` skeleton.** `package.json` (`@safebite/domain`, `type: "module"`, `main`/`exports` → `src/index.ts`, scripts: `typecheck: "tsc --noEmit"`, `lint: "eslint ."`, `test: "vitest run --passWithNoTests"`). `tsconfig.json` extends base, `include: ["src"]`. `eslint.config.mjs` spreads base. `vitest.config.ts` (`environment: "node"`, `passWithNoTests: true`). `src/index.ts` = `export {}` (documented placeholder; real types/engine land in Phase 05).
8. **`apps/web` skeleton.** `package.json` (`@safebite/web`, `private`, version). **Do not** add `lint`/`typecheck`/`test` scripts yet (Phase 02 adds them with the Next app so `pnpm -r` has real source to run against). `tsconfig.json` extends base (minimal; Phase 02 augments with `next` plugin, `jsx`, `@/*` paths).
9. **Root `README.md`.** Minimal quick-start mirroring §4.3 dev sequence (`pnpm install` → `docker compose up -d db` → `pnpm db:migrate` → `pnpm db:seed` → `pnpm seed:kit -- --kit ./osm_overpass_seed_kit` → `pnpm dev`), with a note that DB/app steps activate in later phases.
10. **Install & verify.** Run `pnpm install`; then `pnpm typecheck`, `pnpm lint`, `pnpm test`; then `docker compose config` to validate the compose file. All must exit 0.

## Todo List

- [x] `pnpm-workspace.yaml` with `apps/*`, `packages/*`
- [x] Root `package.json` — §4.3 scripts, `packageManager`, `engines`, shared devDeps
- [x] `tsconfig.base.json` — strict + `@safebite/domain` path alias
- [x] `eslint.config.base.mjs` shared flat config
- [x] `.prettierrc.json` + `.prettierignore`
- [x] `.env.example` (§4.1 verbatim)
- [x] `docker-compose.yml` (§4.2 verbatim)
- [x] `.gitignore` (+ `!.env.example`)
- [x] `.nvmrc` = `20`
- [x] Root `README.md` quick-start
- [x] `packages/domain` skeleton (pkg, tsconfig, eslint, vitest, `src/index.ts` placeholder)
- [x] `apps/web` skeleton (pkg + tsconfig only)
- [x] `pnpm install` succeeds
- [x] `pnpm typecheck` succeeds
- [x] `pnpm lint` succeeds
- [x] `pnpm test` succeeds
- [x] `docker compose config` validates

## Success Criteria

**Definition of done (mirrors §18 P0-01, lines 1661-1665):**

```text
pnpm install succeeds
pnpm typecheck succeeds
pnpm lint succeeds
```

**How to validate:**

- `pnpm install` → lockfile written, both workspace members linked, no peer/resolution errors.
- `pnpm typecheck` → exits 0 (domain `tsc --noEmit` clean; web skipped, no script yet).
- `pnpm lint` → exits 0 (domain ESLint clean; web skipped).
- `pnpm test` → exits 0 (Vitest `passWithNoTests`).
- `docker compose config` → prints a valid resolved config (image `postgis/postgis:16-3.4`, db/user/pass `safebite`).
- Grep check: no `apps/web/src`, no `next.config.*`, no domain business logic, no `lib/i18n.ts` dictionary created (scope discipline).
- All required files from §3/§4 present with §4 verbatim content for `.env.example` and `docker-compose.yml`.

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| `tsc --noEmit` fails with "no inputs" when a package has no source | typecheck red | Ship `packages/domain/src/index.ts` (`export {}`) placeholder; `apps/web` defines no typecheck script until it has source (Phase 02). |
| ESLint flat config not discovered because it doesn't walk up | `pnpm -r lint` errors | Per-package `eslint.config.mjs` that spreads root `eslint.config.base.mjs` (DRY, discoverable in each package cwd). |
| `packageManager` pin mismatches team/corepack env | install friction | Pin to the team's installed pnpm (local: 11.3.0); document in README; `engines.node >=20`. |
| Scope creep — pulling Next/Tailwind/next-intl/Prisma deps into bootstrap | violates "no app logic", bloats install | Keep member `package.json` deps empty except what tooling needs; app/db deps added in their phases. |
| Accidentally scaffolding the spec's simple-dictionary i18n | conflicts with confirmed next-intl override | Explicitly do NOT create `src/lib/i18n.ts`; note ownership in Phase 02. |
| `.env` accidentally committed | secret leak | `.gitignore` `.env`/`.env.*` with `!.env.example`; only placeholders in the example. |
| Windows/POSIX path or line-ending drift (dev env is win32) | noisy diffs / script breakage | `forceConsistentCasingInFileNames`; keep scripts shell-neutral (pnpm/tsc/eslint); optional `.gitattributes` if churn appears (defer, YAGNI). |

## Security Considerations

- **Auth:** No user accounts (§2). Admin is `ADMIN_TOKEN` via httpOnly cookie `sbt_admin` — not implemented here, but `.env.example` seeds the token placeholder (`change-me-in-dev`) so later phases have the contract.
- **Secrets hygiene:** Real `.env` is git-ignored; only `.env.example` is committed. No credentials, keys, or `DATABASE_URL` with real passwords enter version control (local compose creds `safebite/safebite` are dev-only, matching §4.1/§4.2).
- **Safety copy:** The forbidden phrases (§0/§16) cannot appear because this phase ships no product copy; the `copy:check` script name is wired for the future CI gate (`scripts/assert-no-unsafe-copy.ts`, implemented in a later phase).
- **OSM discovery-only:** `osm_overpass_seed_kit/` stays outside the workspace; nothing in bootstrap surfaces restaurant data. PostGIS image is provisioned for Phase 2 readiness only — no geo/restaurant UX is enabled.
- **Supply chain:** Pinned `packageManager` + committed lockfile give reproducible, auditable installs; shared devDeps are minimal.

## Next Steps

- **Unblocks Phase 02 (Next.js app foundation):** `apps/web` gains `next`, React 19, Tailwind (semantic tokens), next-intl (`@/i18n/navigation`, `/en` `/vi`, `messages/{en,vi}.json`), `next.config.ts`, `middleware.ts`, base layout + health route, and its own `lint`/`typecheck`/`test` scripts.
- **Unblocks Phase 03 (DB & Prisma):** `docker compose up -d db`, Prisma schema + PostGIS migration, `db.ts`; enum reconciliation (§6.5) design begins.
- **Unblocks Phase 04 (Seed importer):** adds a BOM-aware CSV parser (kit outputs are UTF-8-sig) and Zod; tolerates the seed's own enum violations (e.g., `dish_category='seafood'`, `meal_type` incl. `dessert`).
- **Unblocks Phase 05 (Domain package):** replaces the `src/index.ts` placeholder with `types.ts`/`schemas.ts`/`risk-engine.ts`/`question-card.ts`/`constants.ts`/`copy.ts` + Vitest suites.
- **Unblocks Phase 06 (API skeleton):** `/api/v1/*` routes with Zod at every boundary and Prisma `Decimal → number` response mapping.
- **Dependencies:** none upstream. This phase is the root of the plan DAG.
