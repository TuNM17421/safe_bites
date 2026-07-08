'use client';
import { useTranslations } from 'next-intl';
import type { LanguageCode } from '@safebite/domain';
import { GROUP_KEY, STATUS_DISPLAY_ORDER } from '@/components/status/status-visuals';
import { DishCard } from './dish-card';
import type { Recommendations } from './dishes-client';
import type { Filter } from './dish-filter-bar';

// Renders groups in visual priority order (Avoid > Risky > Ask First > Unknown > Suitable).
export function DishGroupList({
  groups,
  filter,
  lang,
}: {
  groups: Recommendations['groups'];
  filter: Filter;
  lang: LanguageCode;
}) {
  const tStatus = useTranslations('statuses');
  const visible = STATUS_DISPLAY_ORDER.filter((s) => filter === 'all' || filter === s);
  return (
    <div className="flex flex-col gap-6">
      {visible.map((s) => {
        const cards = groups[GROUP_KEY[s]];
        if (cards.length === 0) return null;
        return (
          <section key={s} className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-sb-muted">
              {tStatus(s)} · {cards.length}
            </h2>
            {cards.map((card) => (
              <DishCard key={card.dishId} card={card} lang={lang} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
