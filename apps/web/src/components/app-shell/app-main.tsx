'use client';
import type { ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';

// Full-bleed opt-out for the in-app shell. The v2 map-first /home fills the column
// edge-to-edge (no padding) so the map can reach the frame edges; the /agent chat fills
// it so the transcript scrolls and the composer pins. Others keep the padded column.
// Matching is exact or `${p}/…`.
const FULL_BLEED = ['/home', '/agent'];

export function AppMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fullBleed = FULL_BLEED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  // Full-bleed routes (the map home) become a flex column so their child can `flex-1` and fill
  // the space between header and bottom nav; padded routes keep the standard column.
  return <main className={fullBleed ? 'flex flex-1 flex-col' : 'flex-1 px-4 py-4'}>{children}</main>;
}
