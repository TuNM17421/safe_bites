'use client';
import type { ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';

// Full-bleed opt-out for the in-app shell. The v2 map-first /home fills the column
// edge-to-edge (no padding) so the map can reach the frame edges; every other in-app
// route keeps the padded column. Matching is exact or `${p}/…`.
const FULL_BLEED = ['/home'];

export function AppMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fullBleed = FULL_BLEED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return <main className={fullBleed ? 'flex-1' : 'flex-1 px-4 py-4'}>{children}</main>;
}
