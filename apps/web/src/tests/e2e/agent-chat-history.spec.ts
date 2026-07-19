import { expect, test } from '@playwright/test';

// The reported bug: agent chat history vanished when switching in-app tabs (the component unmounted
// and lost React state). This proves history now survives a soft-nav round-trip (Zustand store) AND
// a full reload (encrypted Dexie transcript), and that "New chat" clears it.
test('agent chat history survives tab switch + reload, and New chat clears it', async ({ page }) => {
  await page.goto('/en');
  await page.getByRole('link', { name: 'Start allergy profile' }).first().click();
  await page.getByRole('button', { name: /^Peanut$/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /save my card|I understand|Finish/i }).click();
  await expect(page).toHaveURL(/\/en\/home$/);

  // Open the assistant and send a message.
  await page.getByRole('link', { name: 'Assistant' }).click();
  await expect(page).toHaveURL(/\/en\/agent$/);
  await page.getByRole('textbox').fill('suggest something nearby');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('suggest something nearby')).toBeVisible();
  await expect(page.getByText(/nearby place/i)).toBeVisible(); // scripted bot reply

  // Soft-nav away (the exact bug) and back — the store must keep the transcript.
  await page.getByRole('link', { name: 'Map' }).click();
  await expect(page).toHaveURL(/\/en\/home$/);
  await page.getByRole('link', { name: 'Assistant' }).click();
  await expect(page.getByText('suggest something nearby')).toBeVisible();

  // Full reload — the encrypted Dexie transcript must rehydrate it.
  await page.reload();
  await expect(page.getByText('suggest something nearby')).toBeVisible();

  // New chat clears the transcript (welcome bubble remains).
  await page.getByRole('button', { name: 'New chat' }).click();
  await expect(page.getByText('suggest something nearby')).toHaveCount(0);
});
