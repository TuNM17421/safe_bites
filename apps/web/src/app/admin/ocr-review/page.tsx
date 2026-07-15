'use client';
import { useTranslations } from 'next-intl';
import { OcrReviewList } from '@/features/admin-ocr-review/ocr-review-list';

export default function AdminOcrReviewPage() {
  const t = useTranslations('admin');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-extrabold text-sb-fg">{t('ocrReview.heading')}</h1>
        <p className="text-sm text-sb-muted">{t('ocrReview.subheading')}</p>
      </div>
      <OcrReviewList />
    </div>
  );
}
