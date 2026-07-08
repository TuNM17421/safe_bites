// Root ESLint entry so `eslint` invoked from the repo root (e.g. tooling that runs
// from cwd=root) resolves a flat config. Per-package `eslint.config.mjs` files still
// take precedence for `pnpm -r lint` (cwd = each package). Only workspace source is
// linted; data, plans, docs, and generated dirs are ignored.
import base from './eslint.config.base.mjs';

export default [
  {
    ignores: [
      'osm_overpass_seed_kit/**',
      'plans/**',
      'docs/**',
      '.claude/**',
      '.idea/**',
    ],
  },
  ...base,
];
