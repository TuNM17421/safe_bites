import { Hammer } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

// Temporary placeholder for v2 routes scaffolded in Phase 01 and filled in later phases.
// `titleKey` is a full message path (e.g. 'nav.agent', 'scaffold.dish').
export async function ScaffoldScreen({ titleKey }: { titleKey: string }) {
  const t = await getTranslations();
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Hammer aria-hidden className="size-10 text-sb-brand" />
      <h1 className="text-sb-title text-sb-fg">{t(titleKey)}</h1>
      <p className="text-sb-body-s text-sb-muted">{t('scaffold.comingSoon')}</p>
    </div>
  );
}
