import { expect, test } from '@playwright/test';

// Phase 14: encryption at rest + simulated biometric lock/unlock gate. Verifies the full loop in a
// real browser — onboard, confirm the IndexedDB profile row is ciphertext (no plaintext PII), then
// simulate a cold app open (clear the session-unlock flag) and prove the lock redirects to /login
// and the fallback unlock restores access to /home.

async function readFirstProfileRow(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown> | null>((resolve, reject) => {
        const open = indexedDB.open('safebite_pwa_v1');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('profiles', 'readonly');
          const req = tx.objectStore('profiles').getAll();
          req.onsuccess = () => resolve((req.result[0] as Record<string, unknown>) ?? null);
          req.onerror = () => reject(req.error);
        };
      }),
  );
}

test('onboard → profile encrypted at rest → cold open locks → unlock restores /home', async ({ page }) => {
  // Onboard a peanut profile (2-step v2 wizard).
  await page.goto('/en');
  await page.getByRole('link', { name: 'Start allergy profile' }).first().click();
  await expect(page).toHaveURL(/\/en\/onboarding/);
  await page.getByRole('button', { name: /^Peanut$/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /save my card|I understand|Finish/i }).click();
  await expect(page).toHaveURL(/\/en\/home$/);

  // Encryption at rest: the stored row is an envelope (blob.v===1), carries no plaintext PII, and
  // the ciphertext does not leak the destination city.
  const row = await readFirstProfileRow(page);
  expect(row).toBeTruthy();
  expect(row).toHaveProperty('blob');
  const blob = row!.blob as { v: number; iv: string; ct: string };
  expect(blob.v).toBe(1);
  expect(row).not.toHaveProperty('allergies');
  expect(row).not.toHaveProperty('destinationCity');
  expect(JSON.stringify(row)).not.toContain('hanoi');

  // Simulate a cold app open: keep IndexedDB but drop the session-unlock flag, then reload an app
  // route. The lock gate must bounce to /login.
  await page.evaluate(() => window.sessionStorage.clear());
  await page.goto('/en/home');
  await expect(page).toHaveURL(/\/en\/login/);
  await expect(page.getByRole('button', { name: 'Sign in with Face ID' })).toBeVisible();

  // The mandatory non-biometric fallback still unlocks (same key path) and restores /home.
  await page.getByRole('button', { name: 'Continue without biometrics' }).click();
  await expect(page).toHaveURL(/\/en\/home$/);
});
