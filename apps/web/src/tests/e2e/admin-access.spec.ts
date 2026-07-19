import { expect, test } from '@playwright/test';

// Guards the admin root layout (the /admin tree is its own root layout and must render <html>/<body>
// — a missing-root-layout-tags regression) AND the token login flow. Uses the committed dev token.
test('admin login page renders and the token grants access', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/admin/login');
  const password = page.locator('input[type="password"]');
  await expect(password).toBeVisible();
  expect(errors).toEqual([]); // no "Missing <html>/<body>" runtime crash

  await password.fill('change-me-in-dev'); // ADMIN_TOKEN default (.env.example)
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('a[href="/admin/restaurants"]')).toBeVisible();
});
