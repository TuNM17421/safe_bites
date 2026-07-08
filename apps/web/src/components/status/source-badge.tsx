'use client';
import { Clock, Link2, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sb-border bg-sb-surface-2 px-2.5 py-1 text-xs text-sb-muted">
      {icon}
      {children}
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  return <Chip icon={<Link2 aria-hidden className="size-3" />}>{source}</Chip>;
}

export function LastCheckedBadge({ label }: { label: string }) {
  return <Chip icon={<Clock aria-hidden className="size-3" />}>{label}</Chip>;
}

export function SavedBadge({ label }: { label: string }) {
  return <Chip icon={<WifiOff aria-hidden className="size-3" />}>{label}</Chip>;
}
