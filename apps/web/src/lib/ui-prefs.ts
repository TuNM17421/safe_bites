// Small localStorage-backed UI preferences (§10.1 permits UI prefs — never secrets or
// profile data). All access is try/catch-guarded so private mode / SSR is safe.
const KEY = 'sbt_ui_prefs';

interface UiPrefs {
  sessionCount: number;
  installDismissed: boolean;
  onboardingDone: boolean;
  questionCardMade: boolean;
}

const DEFAULTS: UiPrefs = { sessionCount: 0, installDismissed: false, onboardingDone: false, questionCardMade: false };

function read(): UiPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<UiPrefs>) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(prefs: UiPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // ignore (private mode / storage disabled)
  }
}

export function bumpSession(): number {
  const prefs = read();
  prefs.sessionCount += 1;
  write(prefs);
  return prefs.sessionCount;
}

export function getSessionCount(): number {
  return read().sessionCount;
}

export function isInstallCardDismissed(): boolean {
  return read().installDismissed;
}

export function dismissInstallCard(): void {
  const prefs = read();
  prefs.installDismissed = true;
  write(prefs);
}

export function getInstallTriggers(): { onboardingDone: boolean; questionCardMade: boolean } {
  const prefs = read();
  return { onboardingDone: prefs.onboardingDone, questionCardMade: prefs.questionCardMade };
}

export function setInstallTrigger(key: 'onboardingDone' | 'questionCardMade'): void {
  const prefs = read();
  prefs[key] = true;
  write(prefs);
}
