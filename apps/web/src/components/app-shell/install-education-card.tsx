'use client';
import { Share, SquarePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useClientConfig } from './use-client-config';
import { useInstallPrompt } from './use-install-prompt';

// Coral "Add to home screen" education card (decorative appetite tint is allowed here — not a
// status/allergen surface). Actions meet the 48px touch target; the real Install action stays
// primary blue (never coral).
export function InstallEducationCard() {
  const config = useClientConfig();
  const t = useTranslations('install');
  const { shouldShowEducation, canPrompt, promptInstall, dismiss } = useInstallPrompt(
    config?.pwaInstallEnabled ?? false,
  );
  if (!shouldShowEducation) return null;
  return (
    <div className="mx-4 mb-2 rounded-sb-md border border-sb-border bg-sb-appetite-soft p-4 shadow-sb-e1">
      <p className="flex items-center gap-2 text-sb-title font-semibold text-sb-fg">
        <Share aria-hidden className="size-4 text-sb-appetite-ink" />
        {t('title')}
      </p>
      <p className="mt-1 text-sb-body-s text-sb-muted">{t('body')}</p>
      <div className="mt-3 flex gap-2">
        {canPrompt && (
          <button
            type="button"
            onClick={promptInstall}
            className="inline-flex min-h-sb-tap items-center gap-1.5 rounded-full bg-sb-primary px-4 text-sb-body-s font-semibold text-sb-primary-foreground focus-visible:shadow-sb-focus"
          >
            <SquarePlus aria-hidden className="size-4" />
            {t('install')}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="min-h-sb-tap rounded-full border border-sb-border bg-sb-surface px-4 text-sb-body-s font-medium text-sb-fg focus-visible:shadow-sb-focus"
        >
          {t('dismiss')}
        </button>
      </div>
    </div>
  );
}
