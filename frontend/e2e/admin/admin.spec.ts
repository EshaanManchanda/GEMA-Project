import { test, expect, visit, expectNoErrorScreen } from '../support/fixtures';

const PAGES: { path: string; h1: RegExp }[] = [
  { path: '/admin', h1: /dashboard/i },
  { path: '/admin/users', h1: /users/i },
  { path: '/admin/events', h1: /events/i },
  { path: '/admin/orders', h1: /orders/i },
  { path: '/admin/analytics', h1: /analytics/i },
  { path: '/admin/vendors', h1: /vendors/i },
  { path: '/admin/students', h1: /students/i },
  { path: '/admin/blogs', h1: /blogs/i },
  { path: '/admin/settings', h1: /settings/i },
  { path: '/admin/coupons', h1: /coupons/i },
];

for (const p of PAGES) {
  test(`admin ${p.path} renders`, async ({ page }) => {
    await visit(page, p.path);
    await expect(page).toHaveURL(new RegExp(`${p.path}$`));
    await expect(page.locator('h1').first()).toHaveText(p.h1);
    await expectNoErrorScreen(page);
  });
}

test.describe('Platform Highlights PDF', () => {
  test('downloads a valid PDF from the analytics page', async ({ page }) => {
    test.setTimeout(120_000);
    await visit(page, '/admin/analytics');
    const button = page.getByRole('button', { name: /platform highlights/i });
    await expect(button).toBeEnabled();
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), button.click()]);
    expect(download.suggestedFilename()).toMatch(/^kidrove-platform-highlights-(30d|90d|1y)-\d{4}-\d{2}-\d{2}\.pdf$/);
    const path = await download.path();
    const fs = await import('fs');
    expect(fs.readFileSync(path!).subarray(0, 5).toString()).toBe('%PDF-');
    await expect(page.getByText(/downloaded/i).first()).toBeVisible();
  });

  test('the report API rejects an unsupported range', async ({ page }) => {
    await visit(page, '/admin/analytics');
    const res = await page.request.get('/api/insights/platform/highlights-report?range=7d');
    expect(res.status()).toBe(400);
  });
});
