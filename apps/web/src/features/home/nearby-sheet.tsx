'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import type { RestaurantListItem } from '@/features/restaurants/restaurants-client';
import { NearbyList } from './nearby-list';

// Bottom sheet over the map (v2 mockup .sheet). Two snap heights toggled by the grip — simple
// and thumb-reachable; full drag physics are intentionally out of scope for the MVP.
export function NearbySheet({ items, lang }: { items: RestaurantListItem[]; lang: LanguageCode }) {
  const t = useTranslations('home');
  const [expanded, setExpanded] = useState(false);
  return (
    <section
      className={`absolute inset-x-0 bottom-0 z-[1000] flex flex-col rounded-t-[20px] border-t border-sb-border bg-sb-surface shadow-sb-e3 transition-[max-height] duration-200 ${
        expanded ? 'max-h-[78%]' : 'max-h-[42%]'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={t('toggleSheet')}
        className="flex flex-col items-center gap-1 px-4 pb-1 pt-2 focus-visible:shadow-sb-focus focus-visible:outline-none"
      >
        <span aria-hidden className="h-1.5 w-10 rounded-full bg-sb-border" />
        <span className="text-sb-body-s font-bold text-sb-fg">{t('nearbyCount', { count: items.length })}</span>
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <NearbyList items={items} lang={lang} />
      </div>
    </section>
  );
}
