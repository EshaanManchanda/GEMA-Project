import { test, expect, visit, expectNoErrorScreen } from '../support/fixtures';

const PAGES: { path: string; h1: RegExp }[] = [
  { path: '/vendor', h1: /vendor dashboard/i },
  { path: '/vendor/events', h1: /events management/i },
  { path: '/vendor/events/create', h1: /create new event/i },
  { path: '/vendor/bookings', h1: /bookings management/i },
  { path: '/vendor/analytics', h1: /analytics/i },
  { path: '/vendor/employees', h1: /employee management/i },
  { path: '/vendor/payouts', h1: /payouts/i },
  { path: '/vendor/profile', h1: /.+/ },
];

for (const p of PAGES) {
  test(`vendor ${p.path} renders`, async ({ page }) => {
    await visit(page, p.path);
    await expect(page).toHaveURL(new RegExp(`${p.path}$`));
    await expect(page.locator('h1').first()).toHaveText(p.h1);
    await expectNoErrorScreen(page);
  });
}

test('vendor events list shows the vendor’s own events', async ({ page }) => {
  await visit(page, '/vendor/events');
  const api = await page.request.get('/api/vendors/events?limit=50');
  expect(api.ok()).toBeTruthy();
  const events = (await api.json())?.data?.events ?? [];
  if (events.length) await expect(page.getByText(events[0].title).first()).toBeVisible();
});

test('create-event form blocks an empty submit', async ({ page }) => {
  await visit(page, '/vendor/events/create');
  let created = false;
  page.on('request', (r) => r.method() === 'POST' && /\/api\/vendors\/events$/.test(r.url()) && (created = true));
  const submit = page.getByRole('button', { name: /create|publish|save/i }).last();
  await submit.click();
  await page.waitForTimeout(1000);
  expect(created).toBe(false);
  await expect(page).toHaveURL(/\/vendor\/events\/create/);
});
