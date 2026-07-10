import { setRequestLocale } from 'next-intl/server';
import { ScaffoldScreen } from '@/components/common/scaffold-screen';

// v2 /ocr — dish OCR scanner (Phase 12). Scaffold only.
export default async function OcrPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ScaffoldScreen titleKey="nav.ocr" />;
}
