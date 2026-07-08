import { describe, expect, it } from 'vitest';
import { parseCsvContent, splitList } from '../../../scripts/seed/csv';
import { buildReasonAction, normalizeRiskLevel, RISK_COLUMN_MAP } from '../../../scripts/seed/risk-templates';
import { deriveAllergenRows } from '../../../scripts/seed/allergens';

const FORBIDDEN = /guaranteed safe|100% safe|allergy.?proof|this dish is safe|verified_safe|suitable/i;
const BOM = String.fromCharCode(0xfeff);

describe('seed csv helpers', () => {
  it('strips a UTF-8 BOM from the first header', () => {
    const rows = parseCsvContent(`${BOM}id,name\n1,pho`);
    expect(Object.keys(rows[0] ?? {})[0]).toBe('id');
  });

  it('splitList trims and drops empties', () => {
    expect(splitList('a, b ,,c')).toEqual(['a', 'b', 'c']);
    expect(splitList('')).toEqual([]);
  });
});

describe('risk templates', () => {
  it('normalizeRiskLevel maps likely -> likely_contains and blank/off-vocab -> unknown', () => {
    expect(normalizeRiskLevel('likely')).toBe('likely_contains');
    expect(normalizeRiskLevel('')).toBe('unknown');
    expect(normalizeRiskLevel('banana')).toBe('unknown');
    expect(normalizeRiskLevel('contains')).toBe('contains');
  });

  it('RISK_COLUMN_MAP has 10 entries incl gluten->wheat and dairy->milk', () => {
    expect(RISK_COLUMN_MAP).toHaveLength(10);
    const byCol = Object.fromEntries(RISK_COLUMN_MAP.map((m) => [m.col, m.allergenId]));
    expect(byCol['default_gluten_risk']).toBe('wheat');
    expect(byCol['default_dairy_risk']).toBe('milk');
  });

  it('buildReasonAction emits non-empty bilingual copy with no forbidden phrase', () => {
    const levels = ['contains', 'likely_contains', 'possible', 'unlikely', 'unknown'] as const;
    for (const level of levels) {
      const ra = buildReasonAction('Peanut', 'Đậu phộng', level);
      for (const s of [ra.reasonEn, ra.reasonVi, ra.recommendedActionEn, ra.recommendedActionVi]) {
        expect(s.length).toBeGreaterThan(0);
        expect(s).not.toMatch(FORBIDDEN);
      }
    }
  });
});

describe('allergen derivation', () => {
  it('always includes the canonical allergens + pseudo constraints (incl soy/sesame/treenut)', () => {
    const ids = deriveAllergenRows([]).map((a) => a.id);
    for (const need of [
      'peanut', 'shellfish', 'fish', 'wheat', 'milk', 'egg', 'soy', 'sesame', 'treenut',
      'pork', 'beef', 'alcohol', 'high_calorie', 'strong_smell',
    ]) {
      expect(ids).toContain(need);
    }
  });

  it('unions extra ingredient tags not in the catalog', () => {
    expect(deriveAllergenRows(['mustard']).map((a) => a.id)).toContain('mustard');
  });
});
