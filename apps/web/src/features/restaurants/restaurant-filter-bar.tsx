'use client';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { RestaurantFilters, RestaurantSort } from './restaurants-client';

// Hanoi districts as stored in the data (proper nouns — not translated copy).
const DISTRICTS = ['Hoàn Kiếm', 'Ba Đình', 'Tây Hồ'];
// 'nearest' only appears once a clientLocation is granted (otherwise it's a no-op).
const BASE_SORTS: RestaurantSort[] = ['recommended', 'last_checked', 'name'];
const LOCATED_SORTS: RestaurantSort[] = ['recommended', 'nearest', 'last_checked', 'name'];

const selectCls =
  'min-h-sb-tap rounded-sb-sm border border-sb-border bg-sb-surface px-3 text-sb-body-s text-sb-fg focus-visible:shadow-sb-focus focus-visible:outline-none';

export function RestaurantFilterBar({
  filters,
  onChange,
  showNearest = false,
}: {
  filters: RestaurantFilters;
  onChange: (next: RestaurantFilters) => void;
  showNearest?: boolean;
}) {
  const t = useTranslations('restaurants');
  const sorts = showNearest ? LOCATED_SORTS : BASE_SORTS;
  const set = (patch: Partial<RestaurantFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col gap-2">
      <label className="relative flex items-center">
        <Search aria-hidden className="absolute left-3 size-4 text-sb-faint" />
        <span className="sr-only">{t('searchPlaceholder')}</span>
        <input
          type="search"
          value={filters.q ?? ''}
          onChange={(e) => set({ q: e.target.value })}
          placeholder={t('searchPlaceholder')}
          className="min-h-sb-tap w-full rounded-sb-sm border border-sb-border bg-sb-surface pl-9 pr-3 text-sb-body text-sb-fg focus-visible:shadow-sb-focus focus-visible:outline-none"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-xs text-sb-muted">
          <span>{t('filterDistrict')}</span>
          <select value={filters.district ?? ''} onChange={(e) => set({ district: e.target.value || undefined })} className={selectCls}>
            <option value="">{t('allDistricts')}</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-sb-muted">
          <span>{t('filterSort')}</span>
          <select value={filters.sort} onChange={(e) => set({ sort: e.target.value as RestaurantSort })} className={selectCls}>
            {sorts.map((s) => (
              <option key={s} value={s}>
                {t(`sort.${s}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
