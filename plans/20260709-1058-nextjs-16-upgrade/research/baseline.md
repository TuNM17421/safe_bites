# Baseline — Next.js 15.5.20 (pre-upgrade, branch chore/nextjs-16-upgrade @ 61a1a20)

All green on 2026-07-09 before the Next 16 upgrade:

| Gate | Result |
|------|--------|
| `typecheck` | exit 0, 0 TS errors |
| `lint` | exit 0 |
| `test` (vitest) | **64 passed** |
| `copy:check` | OK (156 files scanned) |
| `next build` (prod) | exit 0; Serwist SW bundled → `public/sw.js` (41.4K); 28/28 static pages |

Note: `Error: ENVIRONMENT_FALLBACK` prints during static generation but is **non-fatal** (build
exits 0, 28/28 pages). Pre-existing on 15.5 — post-upgrade must match (build green + SW emitted).
