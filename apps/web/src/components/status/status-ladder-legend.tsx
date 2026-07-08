import { getTranslations } from 'next-intl/server';
import { GROUP_KEY, STATUS_DISPLAY_ORDER } from '@/components/status/status-visuals';
import { StatusBadge } from '@/components/status/status-badge';

// Landing status-ladder preview (mock Foundations · Status ladder). Server component that
// renders the canonical StatusBadge (icon + label + colour) per status in visual priority
// order, with a plain-language descriptor. Reuses the status trio — never colour alone.
export async function StatusLadderLegend() {
  const t = await getTranslations('landing');
  return (
    <section className="rounded-sb-lg border border-sb-border bg-sb-surface p-4 shadow-sb-e1">
      <h2 className="mb-3 text-sb-label uppercase tracking-wide text-sb-faint">{t('legendTitle')}</h2>
      <ul className="flex flex-col gap-2.5">
        {STATUS_DISPLAY_ORDER.map((s) => (
          <li key={s} className="flex items-center gap-3">
            <span className="flex w-28 shrink-0">
              <StatusBadge status={s} />
            </span>
            <span className="text-sb-body-s text-sb-muted">{t(`legend.${GROUP_KEY[s]}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
