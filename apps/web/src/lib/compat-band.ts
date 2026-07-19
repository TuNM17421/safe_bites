// v2 compatibility bands. The percent itself is computed server-side (domain
// compatibilityPercent from suit/ask/avoid counts); this maps it to a colour-blind-safe band
// and the matching semantic status token. Thresholds mirror the v2 mockup: >=80 high (green),
// 50-79 ask-first (yellow), <50 low (red), null "unknown" (grey).
export type CompatBand = 'suit' | 'ask' | 'avoid' | 'unknown';

export function compatBand(percent: number | null | undefined): CompatBand {
  if (percent === null || percent === undefined || Number.isNaN(percent)) return 'unknown';
  if (percent >= 80) return 'suit';
  if (percent >= 50) return 'ask';
  return 'avoid';
}

// CSS custom property (semantic status token) for each band — used for the ring arc + map pin
// fill so colours stay theme-aware and are never hardcoded.
export const COMPAT_BAND_VAR: Record<CompatBand, string> = {
  suit: '--sb-status-suitable-fg',
  ask: '--sb-status-ask-first-fg',
  avoid: '--sb-status-avoid-fg',
  unknown: '--sb-status-unknown-fg',
};
