'use client';
import { useEffect, useState } from 'react';
import { dismissInstallCard, getInstallTriggers, getSessionCount, isInstallCardDismissed } from '@/lib/ui-prefs';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

// §11.3 — install education is an OR-gate and never blocks first paint. The self-contained
// trigger here is "second session"; onboarding/question-card flows flip the other flags.
export function useInstallPrompt(pwaEnabled: boolean) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true); // hidden until client-side prefs load
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDismissed(isInstallCardDismissed());
    setReady(true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const triggers = ready ? getInstallTriggers() : { onboardingDone: false, questionCardMade: false };
  const qualifies = ready && (getSessionCount() >= 2 || triggers.onboardingDone || triggers.questionCardMade);
  const shouldShowEducation = pwaEnabled && ready && !dismissed && qualifies;

  return {
    shouldShowEducation,
    canPrompt: deferred !== null,
    async promptInstall(): Promise<void> {
      if (deferred) {
        await deferred.prompt();
        setDeferred(null);
      }
    },
    dismiss(): void {
      dismissInstallCard();
      setDismissed(true);
    },
  };
}
