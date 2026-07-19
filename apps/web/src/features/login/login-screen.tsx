'use client';
import { Fingerprint, Leaf, ScanFace } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { getAuthenticator } from '@/lib/biometric/authenticator';
import { useProfileStore } from '@/lib/profile-store';

type Busy = 'faceid' | 'fingerprint' | 'skip' | null;

// Simulated biometric unlock. Every path (Face ID, fingerprint, and the mandatory non-biometric
// fallback) unlocks through the SAME device-key path — the fallback only skips the ceremony, it
// never weakens encryption. After unlock we route by whether a profile actually exists on disk.
export function LoginScreen() {
  const t = useTranslations('login');
  const router = useRouter();
  const unlock = useProfileStore((s) => s.unlock);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState(false);

  async function proceed() {
    await unlock();
    router.replace(useProfileStore.getState().profile ? '/home' : '/onboarding');
  }

  async function runBiometric(method: 'faceid' | 'fingerprint') {
    setBusy(method);
    setError(false);
    try {
      const ok = await getAuthenticator().authenticate();
      if (!ok) {
        setError(true);
        setBusy(null);
        return;
      }
      await proceed();
    } catch {
      setError(true);
      setBusy(null);
    }
  }

  async function skip() {
    setBusy('skip');
    setError(false);
    await proceed();
  }

  const scanning = busy === 'faceid' || busy === 'fingerprint';

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center px-6 pb-8">
      <div className="mt-16 grid place-items-center">
        <Leaf aria-hidden className="size-12 text-sb-brand" />
      </div>
      <h1 className="mt-4 text-sb-h1 font-extrabold text-sb-fg">SafeBite</h1>
      <p className="mt-1 text-sb-body text-sb-muted">{t('subtitle')}</p>

      <div
        className={`mt-10 grid size-28 place-items-center rounded-full border-2 border-sb-brand/40 bg-sb-brand/5 ${scanning ? 'animate-pulse' : ''}`}
        role="img"
        aria-label={t('faceIdAffordance')}
      >
        <ScanFace aria-hidden className="size-14 text-sb-brand" />
      </div>
      <p className="mt-4 min-h-6 text-center text-sb-body-s text-sb-muted">
        {scanning ? t('scanning') : t('lookAtCamera')}
      </p>

      {error ? (
        <p role="alert" className="mt-2 text-sb-body-s text-sb-status-avoid-fg">
          {t('failed')}
        </p>
      ) : null}

      <div className="mt-auto flex w-full flex-col gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => runBiometric('faceid')}
          className="inline-flex min-h-sb-tap items-center justify-center gap-2 rounded-sb-md bg-sb-primary px-4 text-sb-body font-bold text-sb-primary-foreground disabled:opacity-50 focus-visible:shadow-sb-focus"
        >
          <ScanFace aria-hidden className="size-5" />
          {busy === 'faceid' ? t('signingIn') : t('signInFaceId')}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => runBiometric('fingerprint')}
          className="inline-flex min-h-sb-tap items-center justify-center gap-2 rounded-sb-md border border-sb-border bg-sb-surface px-4 text-sb-body font-bold text-sb-fg disabled:opacity-50 focus-visible:shadow-sb-focus"
        >
          <Fingerprint aria-hidden className="size-5" />
          {busy === 'fingerprint' ? t('signingIn') : t('useFingerprint')}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={skip}
          className="min-h-sb-tap text-sb-body-s font-bold text-sb-muted underline underline-offset-4 disabled:opacity-50"
        >
          {busy === 'skip' ? t('signingIn') : t('continueWithout')}
        </button>
        <p className="text-center text-sb-caption text-sb-faint">{t('encryptionNote')}</p>
      </div>
    </main>
  );
}
