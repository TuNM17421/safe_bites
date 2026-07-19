import { expect, test } from '@playwright/test';

// §17.2 public happy path (P1-09), against a built + seeded (+approved) app on the /en locale.
// Selectors prefer accessible role/name using the EN chrome strings; the profile lives only in
// IndexedDB (never the URL), so navigation between screens reuses the same browser context.
test('onboard → browse dishes → question card → offline allergy card', async ({ page }) => {
  // 1-2. Landing → start onboarding
  await page.goto('/en');
  await page.getByRole('link', { name: 'Start allergy profile' }).first().click();
  await expect(page).toHaveURL(/\/en\/onboarding/);

  // v2: onboarding is a 2-step wizard advanced by "Continue" — (1) pick allergens, (2) accept.
  // 3. Select the Peanut allergen, then Continue
  await page.getByRole('button', { name: /^Peanut$/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // 4. Accept the safety disclaimer and finish
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /save my card|I understand|Finish/i }).click();

  // 10. Landed on /home with no profile data in the URL
  await expect(page).toHaveURL(/\/en\/home$/);

  // 11. Dish guide: a peanut allergy (moderate default in v2) yields at least one flagged card
  await page.goto('/en/dishes');
  await expect(page.getByText(/Avoid|Risky|Ask First/).first()).toBeVisible();

  // 12-13. Open a dish → generate a question card → copy
  await page.locator('a[href*="/dishes/"]').first().click();
  await expect(page).toHaveURL(/\/en\/dishes\/.+/);
  await page.getByRole('link', { name: 'Generate question card' }).click();
  await expect(page).toHaveURL(/\/en\/question-card/);
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByText('Copied')).toBeVisible();

  // 14. Allergy card is available offline (v2: folded into /profile)
  await page.goto('/en/profile');
  await expect(page.getByText('Available offline')).toBeVisible();
});
