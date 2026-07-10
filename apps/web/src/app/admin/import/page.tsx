'use client';
import { useTranslations } from 'next-intl';

// Admin Excel/CSV import (Phase 11). Scaffold only.
export default function AdminImportPage() {
  const t = useTranslations('admin');
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-lg font-extrabold text-sb-fg">{t('nav.import')}</h1>
      <p className="text-sm text-sb-muted">{t('scaffold.comingSoon')}</p>
    </div>
  );
}
