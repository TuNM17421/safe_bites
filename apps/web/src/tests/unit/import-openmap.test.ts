import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseCsvContent } from '../../../scripts/seed/csv';
import { mapOpenmapRow } from '../../../scripts/seed/import-openmap-restaurants';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, '../../../../../openmap_seed_kit/restaurants.csv');
const rows = parseCsvContent(readFileSync(FIXTURE, 'utf8'));

describe('mapOpenmapRow (Phase 14 — OpenMap discovery)', () => {
  it('loads the committed fixture', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('forces the discovery-only rails regardless of CSV content', () => {
    const m = mapOpenmapRow(rows[0]!);
    expect(m.externalSource).toBe('openmapvn');
    expect(m.externalId).toBe(rows[0]!.sid);
    expect(m.verificationStatus).toBe('unverified');
    expect(m.reviewStatus).toBe('needs_review');
    expect(m.menuStatus).toBe('not_observed');
    expect(m.dataLicense).toBe('openmapvn-terms');
    expect(m.attributionRequired).toBe(true);
  });

  it('coerces lat/lon to numbers', () => {
    const m = mapOpenmapRow(rows[0]!);
    expect(typeof m.lat).toBe('number');
    expect(typeof m.lon).toBe('number');
  });

  it('splits cuisine_normalized into a string[]', () => {
    const withCuisine = rows.find((r) => (r.cuisine_normalized ?? '').length > 0);
    expect(withCuisine).toBeDefined();
    const cuisine = mapOpenmapRow(withCuisine!).cuisineNormalized as string[];
    expect(Array.isArray(cuisine)).toBe(true);
    expect(cuisine.length).toBeGreaterThan(0);
  });

  it('stashes audit ids in rawTagsJson', () => {
    const raw = mapOpenmapRow(rows[0]!).rawTagsJson as Record<string, unknown>;
    expect(raw.sid).toBe(rows[0]!.sid);
    expect(raw.external_id).toBe(rows[0]!.external_id);
  });

  it('strips Vietnamese admin prefixes defensively', () => {
    const m = mapOpenmapRow({ ...rows[0]!, area: 'quận Hoàn Kiếm', ward: 'phường Tràng Tiền', city: 'thành phố Hà Nội' });
    expect(m.district).toBe('Hoàn Kiếm');
    expect(m.ward).toBe('Tràng Tiền');
    expect(m.city).toBe('Hà Nội');
  });

  it('rejects a non-openmap source (fail fast)', () => {
    expect(() => mapOpenmapRow({ ...rows[0]!, external_source: 'osm' })).toThrow();
  });
});
