import { test as base, expect, Page, APIRequestContext } from '@playwright/test';
import { API_URL } from './env';

/**
 * Shared fixture:
 *  - stubs the marketing popup + announcement bar (they cover buttons and make
 *    every test flaky; they have their own admin specs),
 *  - collects uncaught page errors — any JS crash fails the test.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: async ({}, use) => {
    await use([]);
  },
  page: async ({ page, pageErrors }, use) => {
    await page.route('**/api/popups/active**', (r) => r.fulfill({ json: { success: true, data: { popups: [] } } }));
    await page.route('**/api/announcements/active**', (r) =>
      r.fulfill({ json: { success: true, data: { announcements: [] } } }),
    );
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await use(page);
    expect(pageErrors, 'uncaught JS errors on the page').toEqual([]);
  },
});

export { expect };

/** Open a route and wait until the SPA has settled. */
export async function visit(page: Page, path: string) {
  // 'load' can stall on the dev server's long-lived module requests; DOM-ready + network idle is enough.
  const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  return res;
}

/**
 * Fill the login form. The page resets its fields once its own startup checks
 * finish, so keep filling until both values stick.
 */
export async function fillLogin(page: Page, email: string, password: string) {
  await expect(async () => {
    await page.fill('#email', email);
    await page.fill('#password', password);
    await expect(page.locator('#email')).toHaveValue(email, { timeout: 1000 });
    await page.waitForTimeout(300);
    await expect(page.locator('#email')).toHaveValue(email, { timeout: 500 });
  }).toPass({ timeout: 30_000 });
}

/**
 * Fill the login form and submit until the app really sends POST /auth/login.
 * A click before React hydrates the prerendered page does a native form reload
 * instead, so retry. Returns the login response.
 */
export async function submitLogin(page: Page, email: string, password: string) {
  let res: import('@playwright/test').Response | undefined;
  await expect(async () => {
    await fillLogin(page, email, password);
    [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/auth/login') && r.request().method() === 'POST', { timeout: 30_000 }),
      page.getByRole('button', { name: /^sign in$/i }).click(),
    ]);
  }).toPass({ timeout: 70_000 });
  return res!;
}

/** The SPA's own crash / not-found screens. */
export async function expectNoErrorScreen(page: Page) {
  await expect(page.getByText(/something went wrong|unexpected error occurred/i)).toHaveCount(0);
  await expect(page).not.toHaveTitle(/not found|404/i);
}

/** Page must not scroll sideways (mobile layout check). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1);
}

/** A currently bookable public event, picked at runtime (seed dates expire). */
export async function liveEvent(request: APIRequestContext): Promise<{ _id: string; slug: string; title: string }> {
  const res = await request.get(`${API_URL}/events?limit=1`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const ev = body?.data?.events?.[0];
  expect(ev, 'the seed DB needs at least one live event').toBeTruthy();
  return ev;
}
