import { expect, test } from '@playwright/test';

// §17.2 public happy path (P1-09), against a built + seeded (+approved) app on the /en locale.
// Selectors prefer accessible role/name using the EN chrome strings; the profile lives only in
// IndexedDB (never the URL), so navigation between screens reuses the same browser context.
test('onboard → browse dishes → question card → offline allergy card', async ({ page }) => {
  // 1-2. Landing → start onboarding
  await page.goto('/en');
  await page.getByRole('link', { name: 'Start allergy profile' }).first().click();
  await expect(page).toHaveURL(/\/en\/onboarding/);

  // 3. Select the Peanut allergen, continue
  await page.getByRole('button', { name: /peanut/i }).first().click();
  await page.getByRole('button', { name: 'Next' }).click();

  // 4-5. Severity: Anaphylaxis risk
  await page.getByRole('button', { name: /anaphylaxis/i }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  // 6. Cross-contact: Yes
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  // 7. Destination city: Hanoi
  await page.getByRole('button', { name: /hanoi/i }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  // 8. Language step: keep English
  await page.getByRole('button', { name: 'Next' }).click();

  // 9. Accept the safety disclaimer and finish
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Finish' }).click();

  // 10. Landed on /home with no profile data in the URL
  await expect(page).toHaveURL(/\/en\/home$/);

  // 11. Dish guide: a severe peanut allergy yields at least one flagged (non-Suitable) card
  await page.goto('/en/dishes');
  await expect(page.getByText(/Avoid|Risky|Ask First/).first()).toBeVisible();

  // 12-13. Open a dish → generate a question card → copy
  await page.locator('a[href*="/dishes/"]').first().click();
  await expect(page).toHaveURL(/\/en\/dishes\/.+/);
  await page.getByRole('link', { name: 'Generate question card' }).click();
  await expect(page).toHaveURL(/\/en\/question-card/);
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByText('Copied')).toBeVisible();

  // 14. Allergy card is available offline
  await page.goto('/en/allergy-card');
  await expect(page.getByText('Available offline')).toBeVisible();
});
