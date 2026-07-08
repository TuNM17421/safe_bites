'use client';
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
    <div className="mx-4 mb-2 rounded-lg border border-border bg-muted p-3 text-sm">
      <p className="font-semibold">{t('title')}</p>
      <p className="mt-1 text-muted-foreground">{t('body')}</p>
      <div className="mt-2 flex gap-2">
        {canPrompt && (
          <button
            type="button"
            onClick={promptInstall}
            className="rounded bg-foreground px-3 py-1 font-medium text-background"
          >
            {t('install')}
          </button>
        )}
        <button type="button" onClick={dismiss} className="rounded border border-border px-3 py-1 font-medium">
          {t('dismiss')}
        </button>
      </div>
    </div>
  );
}
