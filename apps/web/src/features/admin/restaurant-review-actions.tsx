import { Check, Flag, X } from 'lucide-react';

// Compact per-row review quick-actions. Icon-only keeps rows short (3 stacked text buttons made rows
// tall), but each button carries an aria-label + title tooltip (§1: icon-only buttons must be
// labelled) and a semantic colour matching its intent: approve = suitable, reject = neutral, flag =
// avoid. Matches the Edit/Delete icon buttons already in AdminDataTable.
export function RestaurantReviewActions({
  onApprove,
  onReject,
  onFlag,
  approveLabel,
  rejectLabel,
  flagLabel,
}: {
  onApprove: () => void;
  onReject: () => void;
  onFlag: () => void;
  approveLabel: string;
  rejectLabel: string;
  flagLabel: string;
}) {
  const base =
    'grid size-9 place-items-center rounded-sb-sm border focus-visible:shadow-sb-focus focus-visible:outline-none';
  return (
    <div className="inline-flex gap-1">
      <button
        type="button"
        onClick={onApprove}
        aria-label={approveLabel}
        title={approveLabel}
        className={`${base} border-sb-status-suitable-border text-sb-status-suitable-fg hover:bg-sb-status-suitable-bg`}
      >
        <Check className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onReject}
        aria-label={rejectLabel}
        title={rejectLabel}
        className={`${base} border-sb-border text-sb-muted hover:bg-sb-surface-2`}
      >
        <X className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onFlag}
        aria-label={flagLabel}
        title={flagLabel}
        className={`${base} border-sb-status-avoid-border text-sb-status-avoid-fg hover:bg-sb-status-avoid-bg`}
      >
        <Flag className="size-4" aria-hidden />
      </button>
    </div>
  );
}
