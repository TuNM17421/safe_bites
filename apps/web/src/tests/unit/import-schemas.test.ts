import { describe, expect, it } from 'vitest';
import { importRestaurantRowSchema } from '../../lib/import-schemas';

const valid = { restaurant_id: 'r1', canonical_name: 'Quán A', city: 'hanoi', lat: '21.0', lon: '105.8', extra: 'x' };

describe('importRestaurantRowSchema', () => {
  it('accepts a valid row and passes through extra columns', () => {
    const p = importRestaurantRowSchema.safeParse(valid);
    expect(p.success).toBe(true);
    if (p.success) expect(p.data.extra).toBe('x');
  });

  it('rejects rows missing required columns', () => {
    expect(importRestaurantRowSchema.safeParse({ canonical_name: 'A', city: 'hanoi' }).success).toBe(false);
    expect(importRestaurantRowSchema.safeParse({ restaurant_id: 'r1', canonical_name: '', city: 'hanoi' }).success).toBe(false);
  });

  it('rejects a non-numeric lat but allows blank or absent', () => {
    expect(importRestaurantRowSchema.safeParse({ ...valid, lat: 'abc' }).success).toBe(false);
    expect(importRestaurantRowSchema.safeParse({ ...valid, lat: '' }).success).toBe(true);
    expect(importRestaurantRowSchema.safeParse({ restaurant_id: 'r1', canonical_name: 'A', city: 'hanoi' }).success).toBe(true);
  });
});
