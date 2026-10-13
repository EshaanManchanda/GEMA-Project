import { test, expect, visit, expectNoErrorScreen, liveEvent } from '../support/fixtures';

const PAGES: { path: string; h1: RegExp }[] = [
  { path: '/dashboard', h1: /welcome back/i },
  { path: '/profile', h1: /.+/ },
  { path: '/bookings', h1: /my bookings/i },
  { path: '/tickets', h1: /my tickets/i },
  { path: '/favorites', h1: /favorite/i },
  { path: '/reviews', h1: /my reviews/i },
  { path: '/registrations', h1: /my registrations/i },
];

for (const p of PAGES) {
  test(`customer ${p.path} renders`, async ({ page }) => {
    await visit(page, p.path);
    await expect(page).toHaveURL(new RegExp(p.path));
    await expect(page.locator('h1').first()).toHaveText(p.h1);
    await expectNoErrorScreen(page);
  });
}

test('customer can open the booking page for a live event', async ({ page, request }) => {
  const ev = await liveEvent(request);
  await visit(page, `/booking/${ev.slug}`);
  await expect(page).not.toHaveURL(/\/login/);
  await expectNoErrorScreen(page);
});

test('customer can favourite and un-favourite an event (API)', async ({ page, request }) => {
  const ev = await liveEvent(request);
  // Uses the logged-in browser session's cookies + CSRF token.
  const api = page.request;
  await visit(page, '/favorites');
  const csrf = (await page.context().cookies()).find((c) => c.name === 'XSRF-TOKEN')?.value ?? '';
  const headers = { 'X-CSRF-Token': csrf };
  const add = await api.post(`/api/favorites/${ev._id}`, { headers });
  expect([200, 201, 409]).toContain(add.status());
  const check = await api.get(`/api/favorites/check/${ev._id}`);
  expect(check.ok()).toBeTruthy();
  const remove = await api.delete(`/api/favorites/${ev._id}`, { headers });
  expect(remove.ok()).toBeTruthy();
});
