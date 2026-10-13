import { test as setup, expect, submitLogin } from './support/fixtures';
import { ACCOUNTS, Role } from './support/env';

/** Log in once per role through the real login form and save the session. */
for (const role of Object.keys(ACCOUNTS) as Role[]) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const { email, password, home } = ACCOUNTS[role];
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await submitLogin(page, email, password);
    await page.waitForURL((u) => u.pathname.startsWith(home), { timeout: 30_000, waitUntil: 'commit' });
    await expect(page).toHaveURL(new RegExp(`^[^?]*${home}`));
    await page.context().storageState({ path: `e2e/.auth/${role}.json` });
  });
}
