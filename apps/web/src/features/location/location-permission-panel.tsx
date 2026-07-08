'use client';
import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GeoStatus } from './use-geolocation';

// Pre-permission explanation + trigger (§4.3/§11.2). The browser prompt only fires when the
// user taps "Use my location" — never on load.
export function LocationPermissionPanel({
  status,
  onRequest,
  onClear,
}: {
  status: GeoStatus;
  onRequest: () => void;
  onClear: () => void;
}) {
  const t = useTranslations('locationPermission');

  if (status === 'granted') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-sb-md border border-sb-border bg-sb-surface-2 p-3 text-sb-body-s">
        <span className="inline-flex items-center gap-2 font-semibold text-sb-fg">
          <MapPin aria-hidden className="size-4 text-sb-brand" />
          {t('sortingByDistance')}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-sb-tap items-center rounded-sb-sm px-3 font-bold text-sb-brand underline focus-visible:shadow-sb-focus focus-visible:outline-none"
        >
          {t('clear')}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-sb-md border border-sb-border bg-sb-surface-2 p-3">
      <p className="text-sb-body-s text-sb-muted">{t('explanation')}</p>
      {status === 'denied' ? <p role="alert" className="mt-1 text-xs text-sb-status-ask-first-fg">{t('denied')}</p> : null}
      {status === 'unsupported' ? <p role="alert" className="mt-1 text-xs text-sb-muted">{t('unsupported')}</p> : null}
      <button
        type="button"
        onClick={onRequest}
        disabled={status === 'prompting'}
        className="mt-2 inline-flex min-h-sb-tap items-center gap-2 rounded-sb-sm bg-sb-primary px-4 text-sb-body-s font-bold text-sb-primary-foreground disabled:opacity-50 focus-visible:shadow-sb-focus focus-visible:outline-none"
      >
        <MapPin aria-hidden className="size-4" />
        {status === 'prompting' ? t('prompting') : t('useMyLocation')}
      </button>
    </div>
  );
}
