'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

// Admin reports queue (v2). Lists feedback reports; ingredient-correction reports can be Approved
// (applies the change to the dish, stays unverified) or Rejected (dismiss_report — no data change).
interface ReportItem {
  id: string;
  status: string;
  restaurant: { id: string; name: { en: string; vi: string } };
  menuItem: { id: string; name: { en: string; vi: string } } | null;
  notes: string | null;
  reporterRef: string | null;
  correctionIngredientId: string | null;
  correctionPresent: boolean | null;
}

async function fetchReports(): Promise<ReportItem[]> {
  const res = await fetch('/api/v1/admin/feedback?limit=100');
  if (!res.ok) throw new Error(`reports_failed_${res.status}`);
  const json = (await res.json()) as { data: { items: ReportItem[] } };
  return json.data.items;
}

async function postAction(reportId: string, actionType: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/feedback/${reportId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionType }),
  });
  if (!res.ok) throw new Error(`action_failed_${res.status}`);
}

const OPEN = new Set(['needs_review', 'in_review']);

export function ReportsTable() {
  const t = useTranslations('admin');
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-reports'], queryFn: fetchReports });
  const act = useMutation({
    mutationFn: ({ reportId, actionType }: { reportId: string; actionType: string }) => postAction(reportId, actionType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  if (query.isLoading) return <p className="text-sm text-sb-muted">{t('reports.loading')}</p>;
  if (query.isError) return <p className="text-sm text-sb-status-avoid-fg">{t('reports.error')}</p>;
  const items = query.data ?? [];
  if (items.length === 0) return <p className="text-sm text-sb-muted">{t('reports.empty')}</p>;

  return (
    <div className="overflow-x-auto rounded-sb-md border border-sb-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-sb-surface-2 text-xs uppercase text-sb-faint">
          <tr>
            <th className="p-3">{t('reports.colDish')}</th>
            <th className="p-3">{t('reports.colReport')}</th>
            <th className="p-3">{t('reports.colReporter')}</th>
            <th className="p-3">{t('reports.colCorrection')}</th>
            <th className="p-3">{t('reports.colActions')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => {
            const open = OPEN.has(r.status);
            const canApprove = open && Boolean(r.correctionIngredientId);
            return (
              <tr key={r.id} className="border-t border-sb-border align-top">
                <td className="p-3">
                  <div className="font-bold text-sb-fg">{r.menuItem?.name.en ?? '—'}</div>
                  <div className="text-xs text-sb-muted">{r.restaurant.name.en}</div>
                </td>
                <td className="max-w-[22rem] p-3 text-sb-muted">{r.notes ?? t('reports.none')}</td>
                <td className="p-3 text-sb-muted">{r.reporterRef ?? t('reports.anonymous')}</td>
                <td className="p-3 text-sb-muted">
                  {r.correctionIngredientId
                    ? `${r.correctionIngredientId} · ${r.correctionPresent === false ? t('reports.notContains') : t('reports.contains')}`
                    : t('reports.none')}
                </td>
                <td className="p-3">
                  {open ? (
                    <div className="flex gap-2">
                      {canApprove ? (
                        <button
                          type="button"
                          disabled={act.isPending}
                          onClick={() => act.mutate({ reportId: r.id, actionType: 'approve_ingredient_correction' })}
                          className="rounded-sb-sm bg-sb-primary px-3 py-1 text-xs font-bold text-sb-primary-foreground disabled:opacity-50"
                        >
                          {t('reports.approve')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ reportId: r.id, actionType: 'dismiss_report' })}
                        className="rounded-sb-sm border border-sb-status-avoid-border px-3 py-1 text-xs font-bold text-sb-status-avoid-fg disabled:opacity-50"
                      >
                        {t('reports.reject')}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-sb-faint">
                      {r.status === 'dismissed' || r.status === 'spam' ? t('reports.dismissed') : t('reports.resolved')}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
