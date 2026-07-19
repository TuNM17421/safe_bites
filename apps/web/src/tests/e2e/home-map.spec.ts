import { expect, test } from '@playwright/test';

// Regression guard for the map-first /home. Onboarding soft-navigates to /home (client nav, profile
// already in memory) — the path that previously left the store un-hydrated (skeleton forever) and
// the Leaflet container collapsed to 0px. Assert the map actually mounts with real height + tiles.
test('onboard → /home renders the Leaflet map (not a stuck skeleton)', async ({ page }) => {
  await page.goto('/en');
  await page.getByRole('link', { name: 'Start allergy profile' }).first().click();
  await page.getByRole('button', { name: /^Peanut$/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /save my card|I understand|Finish/i }).click();
  await expect(page).toHaveURL(/\/en\/home$/);

  // The map island mounts (not the loading skeleton) and has a real, non-zero box.
  const map = page.locator('.leaflet-container');
  await expect(map).toBeVisible({ timeout: 15000 });
  const box = await map.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(200);

  // At least one OSM tile actually loads.
  await expect(page.locator('img.leaflet-tile-loaded').first()).toBeVisible({ timeout: 15000 });
});
