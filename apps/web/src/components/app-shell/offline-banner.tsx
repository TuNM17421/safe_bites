'use client';
import { WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOnlineStatus } from './use-online-status';

export function OfflineBanner() {
  const online = useOnlineStatus();
  const t = useTranslations('offline');
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-sb-status-ask-first-bg px-4 py-2 text-sm text-sb-status-ask-first-fg"
    >
      <WifiOff aria-hidden className="size-4 shrink-0" />
      {t('notice')}
    </div>
  );
}
