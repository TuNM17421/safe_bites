import { describe, expect, it } from 'vitest';
import { compatBand, COMPAT_BAND_VAR } from '../../lib/compat-band';

describe('compatBand', () => {
  it('maps null/undefined/NaN to unknown', () => {
    expect(compatBand(null)).toBe('unknown');
    expect(compatBand(undefined)).toBe('unknown');
    expect(compatBand(Number.NaN)).toBe('unknown');
  });

  it('bands by threshold: >=80 suit, >=50 ask, else avoid', () => {
    expect(compatBand(100)).toBe('suit');
    expect(compatBand(80)).toBe('suit');
    expect(compatBand(79)).toBe('ask');
    expect(compatBand(50)).toBe('ask');
    expect(compatBand(49)).toBe('avoid');
    expect(compatBand(0)).toBe('avoid');
  });

  it('has a semantic status token for every band', () => {
    for (const band of ['suit', 'ask', 'avoid', 'unknown'] as const) {
      expect(COMPAT_BAND_VAR[band]).toMatch(/^--sb-status-/);
    }
  });
});
