import { compatBand, COMPAT_BAND_VAR } from '@/lib/compat-band';

// Compatibility % ring (v2 mockup). Colour-blind safe: the colour is always paired with the
// numeric label ("?" when unknown) and an aria-label. Reused by the map sheet + restaurant detail.
export function CompatRing({
  percent,
  size = 'sm',
  ariaLabel,
}: {
  percent: number | null;
  size?: 'sm' | 'md';
  ariaLabel: string;
}) {
  const band = compatBand(percent);
  const color = `hsl(var(${COMPAT_BAND_VAR[band]}))`;
  const dim = size === 'md' ? 66 : 44;
  const inset = size === 'md' ? 5 : 4;
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={`relative inline-grid shrink-0 place-items-center rounded-full font-extrabold ${size === 'md' ? 'text-sb-body-s' : 'text-[11px]'}`}
      style={{
        width: dim,
        height: dim,
        color,
        background: `conic-gradient(${color} ${percent ?? 0}%, hsl(var(--sb-surface-3)) 0)`,
      }}
    >
      <span className="absolute rounded-full bg-sb-surface" style={{ inset }} aria-hidden />
      <span className="relative tabular-nums">{percent === null ? '?' : `${percent}%`}</span>
    </span>
  );
}
