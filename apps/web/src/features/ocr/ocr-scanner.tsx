'use client';
import { Camera, ScanLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useProfileStore } from '@/lib/profile-store';
import type { OcrPredictResponse } from '@/lib/ocr-schemas';
import { OcrPredictionPanel } from './ocr-prediction-panel';

type CamState = 'idle' | 'live' | 'denied' | 'unsupported';

// Downscale the current video frame to a small JPEG data URL for the review queue (bounded).
function captureFrame(video: HTMLVideoElement): string | null {
  try {
    const w = 640;
    const scale = w / (video.videoWidth || w);
    const h = Math.round((video.videoHeight || 480) * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.6);
  } catch {
    return null;
  }
}

export function OcrScanner() {
  const t = useTranslations('ocr');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camState, setCamState] = useState<CamState>('idle');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OcrPredictResponse | null>(null);
  const profile = useProfileStore((s) => s.profile);
  const allergenIds = profile?.allergies.map((a) => a.allergenId) ?? [];

  useEffect(() => {
    let active = true;
    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCamState('unsupported');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!active) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamState('live');
      } catch {
        setCamState('denied');
      }
    }
    void start();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  async function scan() {
    setBusy(true);
    const photo = camState === 'live' && videoRef.current ? captureFrame(videoRef.current) : null;
    try {
      const res = await fetch('/api/v1/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergenIds, submitForReview: true, photo }),
      });
      if (res.ok) setResult((await res.json()).data);
    } finally {
      setBusy(false);
    }
  }

  if (result) return <OcrPredictionPanel result={result} onRescan={() => setResult(null)} />;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-sb-title font-bold text-sb-fg">{t('title')}</h1>
      <div className="relative h-56 overflow-hidden rounded-sb-md bg-black">
        {camState === 'live' ? (
          <>
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <span aria-hidden className="pointer-events-none absolute inset-x-[8%] top-1/2 h-0.5 animate-pulse bg-sb-brand shadow-[0_0_12px_1px_hsl(var(--sb-brand))]" />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sb-primary-foreground">
            <Camera aria-hidden className="size-8 opacity-80" />
            <p className="text-sb-body-s">
              {camState === 'denied' ? t('permissionDenied') : camState === 'unsupported' ? t('cameraUnsupported') : t('starting')}
            </p>
          </div>
        )}
      </div>

      <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-sb-brand-soft px-3 py-1 text-xs font-bold text-sb-brand-ink">
        <ScanLine aria-hidden className="size-3.5" />
        {t('aiTag')}
      </span>

      <button
        type="button"
        disabled={busy}
        onClick={scan}
        className="inline-flex min-h-sb-tap items-center justify-center gap-2 rounded-sb-md bg-sb-primary px-4 font-bold text-sb-primary-foreground disabled:opacity-50 focus-visible:shadow-sb-focus"
      >
        <Camera aria-hidden className="size-5" />
        {busy ? t('scanning') : t('capture')}
      </button>
      {camState === 'denied' || camState === 'unsupported' ? (
        <p className="text-center text-sb-caption text-sb-muted">{t('fallbackHint')}</p>
      ) : null}
    </div>
  );
}
