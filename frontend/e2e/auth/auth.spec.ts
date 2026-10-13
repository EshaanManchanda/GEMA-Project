import { test, expect, visit, submitLogin } from '../support/fixtures';
import { ACCOUNTS, Role } from '../support/env';

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await visit(page, '/login');
  return submitLogin(page, email, password);
}

test.describe('login', () => {
  for (const role of Object.keys(ACCOUNTS) as Role[]) {
    test(`${role} lands on their dashboard`, async ({ page }) => {
      await login(page, ACCOUNTS[role].email, ACCOUNTS[role].password);
      await page.waitForURL((u) => u.pathname.startsWith(ACCOUNTS[role].home), { timeout: 30_000, waitUntil: 'commit' });
    });
  }

  test('wrong password shows an error and stays on /login', async ({ page }) => {
    await login(page, ACCOUNTS.customer.email, 'definitely-wrong-password');
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('empty form shows validation, makes no login request', async ({ page }) => {
    await visit(page, '/login');
    let called = false;
    page.on('request', (r) => r.url().includes('/auth/login') && (called = true));
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/login/);
    expect(called).toBe(false);
  });
});

test.describe('access control in the browser', () => {
  for (const path of ['/dashboard', '/bookings', '/tickets', '/admin', '/vendor']) {
    test(`anonymous visit to ${path} redirects to login`, async ({ page }) => {
      await visit(page, path);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test('a customer cannot open the admin area', async ({ page }) => {
    await login(page, ACCOUNTS.customer.email, ACCOUNTS.customer.password);
    await page.waitForURL((u) => u.pathname.startsWith('/dashboard'), { waitUntil: 'commit' });
    await visit(page, '/admin');
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test('a vendor cannot open the admin area', async ({ page }) => {
    await login(page, ACCOUNTS.vendor.email, ACCOUNTS.vendor.password);
    await page.waitForURL((u) => u.pathname.startsWith('/vendor'), { waitUntil: 'commit' });
    await visit(page, '/admin/users');
    await expect(page).not.toHaveURL(/\/admin/);
  });
});

test.describe('registration', () => {
  test('register page renders and blocks an empty submit', async ({ page }) => {
    await visit(page, '/register');
    await expect(page).toHaveTitle(/register/i);
    await page.locator('form:has(input[type="email"]) button[type="submit"]').first().click();
    await expect(page).toHaveURL(/\/register/);
  });
});
