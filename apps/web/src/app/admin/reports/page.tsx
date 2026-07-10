'use client';
import { useTranslations } from 'next-intl';
import { ReportsTable } from '@/features/admin/reports/reports-table';

export default function AdminReportsPage() {
  const t = useTranslations('admin');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-extrabold text-sb-fg">{t('reports.heading')}</h1>
        <p className="text-sm text-sb-muted">{t('reports.subheading')}</p>
      </div>
      <ReportsTable />
    </div>
  );
}
