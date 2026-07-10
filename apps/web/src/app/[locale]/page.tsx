import { Globe, Leaf, Lock, Plus, Shield, WifiOff } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SafetyNotice } from '@/components/safety/safety-notice';
import { StatusLadderLegend } from '@/components/status/status-ladder-legend';
import { Link } from '@/i18n/navigation';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  const tCommon = await getTranslations('common');

  const chips = [
    { Icon: Shield, label: t('chips.honest') },
    { Icon: Globe, label: t('chips.bilingual') },
    { Icon: WifiOff, label: t('chips.offline') },
    { Icon: Lock, label: t('chips.private') },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 bg-gradient-to-b from-sb-brand-soft via-sb-surface to-sb-surface px-6 pb-8 pt-10">
      <div className="flex items-center gap-2">
        <Leaf aria-hidden className="size-7 text-sb-brand" />
        <span className="text-sb-title text-sb-fg">{tCommon('appName')}</span>
      </div>

      <header className="flex flex-col gap-3">
        <p className="text-sb-label uppercase tracking-[0.12em] text-sb-brand-ink">{t('kicker')}</p>
        <h1 className="text-balance text-sb-display text-sb-fg">{t('tagline')}</h1>
        <p className="text-sb-body text-sb-muted">{t('positioning')}</p>
      </header>

      <ul className="flex flex-wrap gap-2">
        {chips.map(({ Icon, label }) => (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-sb-border bg-sb-surface-2 px-3 py-1.5 text-sb-body-s font-semibold text-sb-muted"
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </li>
        ))}
      </ul>

      <StatusLadderLegend />
      <SafetyNotice />

      <div className="mt-auto flex flex-col gap-3 pt-2">
        <p className="text-sb-caption text-sb-faint">{t('noInstall')}</p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-sb-tap w-full items-center justify-center gap-2 rounded-sb-sm bg-sb-primary px-4 text-sb-body font-bold text-sb-primary-foreground focus-visible:shadow-sb-focus"
        >
          <Plus aria-hidden className="size-5" />
          {t('startProfile')}
        </Link>
      </div>
    </main>
  );
}
