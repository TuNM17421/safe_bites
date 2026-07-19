import { expect, test } from '@playwright/test';

// §17.3 restaurant happy path, against a built app seeded with the demo menu (CI runs
// `pnpm seed:restaurant-demo-menu`). The profile is injected straight into IndexedDB — the
// same store the app hydrates from — so this stays decoupled from the onboarding UI and never
// puts allergy data in the URL. Peanut / anaphylaxis / cross-contact profile.
const PROFILE = {
  id: 'local',
  selectedProfileIds: [] as string[],
  allergies: [{ allergenId: 'peanut', severity: 'anaphylaxis_risk', crossContactSensitive: true }],
  language: 'en',
  destinationCity: 'hanoi',
  safetyAcceptedAt: '2026-07-01T00:00:00.000Z',
  offlineEnabled: false,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

test('restaurants: profile → list → detail → menu recommendations → question card', async ({ page }) => {
  // Seed the active profile into IndexedDB (the DB is created on first app load). Wait for the
  // no-profile state to settle first so the page isn't mid-navigation when we write to IndexedDB.
  await page.goto('/en/restaurants', { waitUntil: 'networkidle' });
  await page.getByText('Create a profile to see restaurant readiness').first().waitFor({ timeout: 20000 });
  // Inject a legacy plaintext profile (the app reads it via the defensive legacy path) and mark the
  // session unlocked — injecting a profile simulates a returning user, who views app content in an
  // unlocked session (Phase 14 lock gate). A row without `blob` is treated as legacy plaintext.
  await page.evaluate(async (profile) => {
    window.sessionStorage.setItem('sb_unlocked', '1');
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('safebite_pwa_v1');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['profiles', 'metadata'], 'readwrite');
        tx.objectStore('profiles').put(profile);
        tx.objectStore('metadata').put({ key: 'activeProfileId', value: profile.id, updatedAt: new Date().toISOString() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, PROFILE);

  // List: personalized cards with a readiness class + source label.
  await page.goto('/en/restaurants');
  await expect(page.getByRole('heading', { name: 'Nearby' })).toBeVisible();
  await expect(page.getByText('Demo Bun Cha (Hoan Kiem)')).toBeVisible();
  await expect(page.getByText('Curated').first()).toBeVisible();

  // Detail: menu items grouped by status with a risk classification.
  await page.goto('/en/restaurant/demo-bun-cha-hoan-kiem');
  await expect(page.getByRole('heading', { name: 'Menu items' })).toBeVisible();
  // Menu-item title (a heading) — specific so it doesn't also match the "Matched dish:" line.
  await expect(page.getByRole('heading', { name: 'Grilled pork with rice noodles' })).toBeVisible();
  await expect(page.getByText(/Avoid|Risky|Ask First|Unknown/).first()).toBeVisible();

  // v2: the menu-item card links to the dish-at-restaurant page; the owner-question action lives
  // there. Menu context travels in the URL (menuItemId), never in the profile.
  await page.getByRole('heading', { name: 'Grilled pork with rice noodles' }).click();
  await expect(page).toHaveURL(/\/en\/restaurant\/.+\/dish\?menuItemId=/);
  await page.getByRole('link', { name: 'Create question for owner' }).click();
  await expect(page).toHaveURL(/\/en\/question-card\?menuItemId=/);
  await expect(page.getByRole('heading', { name: 'Ask the restaurant' })).toBeVisible();
});
