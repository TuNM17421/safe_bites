'use client';
import { Share, SquarePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useClientConfig } from './use-client-config';
import { useInstallPrompt } from './use-install-prompt';

export function InstallEducationCard() {
  const config = useClientConfig();
  const t = useTranslations('install');
  const { shouldShowEducation, canPrompt, promptInstall, dismiss } = useInstallPrompt(
    config?.pwaInstallEnabled ?? false,
  );
  if (!shouldShowEducation) return null;
  return (
    <div className="mx-4 mb-2 rounded-sb-md border border-sb-border bg-sb-appetite-soft p-3 text-sm shadow-sb-e1">
      <p className="flex items-center gap-1.5 font-semibold text-sb-fg">
        <Share aria-hidden className="size-4" />
        {t('title')}
      </p>
      <p className="mt-1 text-sb-muted">{t('body')}</p>
      <div className="mt-2 flex gap-2">
        {canPrompt && (
          <button
            type="button"
            onClick={promptInstall}
            className="inline-flex items-center gap-1 rounded-sb-sm bg-sb-primary px-3 py-1 font-medium text-sb-primary-foreground focus-visible:shadow-sb-focus"
          >
            <SquarePlus aria-hidden className="size-4" />
            {t('install')}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-sb-sm border border-sb-border px-3 py-1 font-medium text-sb-fg focus-visible:shadow-sb-focus"
        >
          {t('dismiss')}
        </button>
      </div>
    </div>
  );
}
