import { expect, test } from '@playwright/test';

// §17.2 public happy path (P1-09), against a built + seeded (+approved) app on the /en locale.
// Selectors prefer accessible role/name using the EN chrome strings; the profile lives only in
// IndexedDB (never the URL), so navigation between screens reuses the same browser context.
test('onboard → browse dishes → question card → offline allergy card', async ({ page }) => {
  // 1-2. Landing → start onboarding
  await page.goto('/en');
  await page.getByRole('link', { name: 'Start allergy profile' }).first().click();
  await expect(page).toHaveURL(/\/en\/onboarding/);

  // The design-system reskin turned onboarding into a stepped wizard advanced by "Continue",
  // with severity as a radio group. Each step: make a choice, then Continue.
  // 3. Select the Peanut allergen
  await page.getByRole('button', { name: /^Peanut$/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // 4-5. Severity: Anaphylaxis risk (role="radio")
  await page.getByRole('radio', { name: /anaphylaxis/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // 6. Cross-contact: Yes
  await page.getByRole('button', { name: 'Yes', exact: true }).first().click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // 7. Destination city: Hanoi
  await page.getByRole('button', { name: /hanoi/i }).first().click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // 8. Language step: keep English
  await page.getByRole('button', { name: 'Continue' }).click();

  // 9. Accept the safety disclaimer and finish
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /save my card|I understand|Finish/i }).click();

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
