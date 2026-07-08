'use client';
import { useTranslations } from 'next-intl';
import { useOnlineStatus } from './use-online-status';

export function OfflineBanner() {
  const online = useOnlineStatus();
  const t = useTranslations('offline');
  if (online) return null;
  return (
    <div role="status" className="bg-safety px-4 py-2 text-sm text-safety-foreground">
      {t('notice')}
    </div>
  );
}
