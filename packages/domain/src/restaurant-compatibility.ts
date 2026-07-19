// v2 restaurant "compatibility %" — a single conservative number derived from the SAME
// suit/ask/avoid/unknown counts the readiness class uses (no stored column, no new source of
// truth). Shown as the mockup's ring on the map + restaurant detail. Also a pure helper to
// roll per-restaurant ingredient rows into a provenance summary for the dish-at-restaurant view.

import type { RestaurantRecommendationCounts } from './restaurant-types';

// Weight suitable fully and ask-first half; risky/avoid contribute nothing. `unknown` items are
// excluded from the denominator (no data ≠ a bad signal). Returns 0..100, or null when there is
// nothing rated to judge — callers show "not enough data" rather than a misleading 0%.
export function compatibilityPercent(counts: RestaurantRecommendationCounts): number | null {
  const rated = counts.suitable + counts.askFirst + counts.risky + counts.avoid;
  if (rated <= 0) return null;
  const score = counts.suitable * 1 + counts.askFirst * 0.5;
  return Math.round((score / rated) * 100);
}

export type IngredientContributorType = 'restaurant' | 'user' | 'admin' | 'ocr';

export interface IngredientProvenanceRow {
  contributorType: string;
}

export interface IngredientProvenanceSummary {
  selfDeclared: boolean; // at least one row from the restaurant itself
  userContributionCount: number;
  adminCount: number;
  ocrCount: number;
}

// Pure roll-up used by the dish-at-restaurant view ("restaurant self-declared + N user
// contributions"). Unknown contributor types are ignored rather than trusted.
export function summarizeIngredientProvenance(rows: IngredientProvenanceRow[]): IngredientProvenanceSummary {
  const summary: IngredientProvenanceSummary = {
    selfDeclared: false,
    userContributionCount: 0,
    adminCount: 0,
    ocrCount: 0,
  };
  for (const row of rows) {
    if (row.contributorType === 'restaurant') summary.selfDeclared = true;
    else if (row.contributorType === 'user') summary.userContributionCount += 1;
    else if (row.contributorType === 'admin') summary.adminCount += 1;
    else if (row.contributorType === 'ocr') summary.ocrCount += 1;
  }
  return summary;
}
