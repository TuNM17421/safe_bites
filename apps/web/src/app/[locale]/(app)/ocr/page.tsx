import { setRequestLocale } from 'next-intl/server';
import { OcrScanner } from '@/features/ocr/ocr-scanner';

// v2 /ocr — dish OCR scanner (Phase 12). RSC shell; the camera + prediction UI is a client island.
export default async function OcrPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OcrScanner />;
}
