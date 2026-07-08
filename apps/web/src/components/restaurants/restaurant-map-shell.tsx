'use client';
import { MapPinned } from 'lucide-react';
import { useTranslations } from 'next-intl';

// P0 map/list shell (§4.6): list-first. The interactive map is P1 — this honest placeholder
// keeps the toggle real without a heavy map library; per-restaurant location + an OpenStreetMap
// link live on each detail page. TODO(phase-P1): render coordinates on an OSM/Leaflet tile map.
export function RestaurantMapShell({ attribution }: { attribution: string | null }) {
  const t = useTranslations('restaurants');
  return (
    <div className="rounded-sb-md border border-sb-border bg-sb-surface-2 p-6 text-center">
      <MapPinned aria-hidden className="mx-auto size-8 text-sb-brand" />
      <p className="mt-2 text-sb-title font-bold text-sb-fg">{t('mapComingSoon')}</p>
      <p className="mt-1 text-sb-body-s text-sb-muted">{t('mapNote')}</p>
      {attribution ? <p className="mt-3 text-xs text-sb-faint">{attribution}</p> : null}
    </div>
  );
}
