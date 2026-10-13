import { test, expect, visit, expectNoErrorScreen, expectNoHorizontalScroll, liveEvent } from '../support/fixtures';

/** Every public page renders its heading, has a real <title>, and fits a phone screen. */
const PAGES: { path: string; h1: RegExp; title: RegExp }[] = [
  { path: '/search', h1: /all events|results/i, title: /events/i },
  { path: '/categories', h1: /categories/i, title: /categor/i },
  { path: '/blog', h1: /blog/i, title: /blog/i },
  { path: '/about', h1: /about kidrove/i, title: /about/i },
  { path: '/contact', h1: /contact/i, title: /contact/i },
  { path: '/privacy', h1: /privacy policy/i, title: /privacy/i },
  { path: '/terms', h1: /terms/i, title: /terms/i },
  { path: '/faq', h1: /frequently asked questions/i, title: /faq/i },
  { path: '/help', h1: /help/i, title: /help/i },
  { path: '/teachers', h1: /teachers/i, title: /kidrove/i },
  { path: '/vendors', h1: /events for kids/i, title: /vendors/i },
  { path: '/collections', h1: /collections/i, title: /collections/i },
];

for (const p of PAGES) {
  test(`${p.path} renders @mobile`, async ({ page }) => {
    const res = await visit(page, p.path);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('h1').first()).toHaveText(p.h1);
    await expect(page).toHaveTitle(p.title);
    await expectNoErrorScreen(page);
    await expectNoHorizontalScroll(page);
  });
}

test('home page loads with events and navigation @mobile', async ({ page, request }) => {
  const ev = await liveEvent(request);
  await visit(page, '/');
  await expect(page).toHaveTitle(/kidrove/i);
  await expect(page.getByText(ev.title).first()).toBeVisible();
  await expectNoErrorScreen(page);
  await expectNoHorizontalScroll(page);
});

// Known gap: the home page has no <h1> (SEO + screen readers). This test passes
// while the bug exists and will flag itself once an <h1> is added — then drop .fail.
test.fail('home page has exactly one <h1>', async ({ page }) => {
  await visit(page, '/');
  await expect(page.locator('h1')).toHaveCount(1);
});

test('unknown URL shows the 404 page', async ({ page }) => {
  await visit(page, '/this-page-does-not-exist-e2e');
  await expect(page).toHaveTitle(/not found|404/i);
  await expect(page.locator('h1').first()).toHaveText(/404/);
});

test('core SEO tags are present on the home page', async ({ page }) => {
  await visit(page, '/');
  await expect(page.locator('meta[name="description"]').last()).toHaveAttribute('content', /.{50,}/);
  await expect(page.locator('meta[property="og:title"]').first()).toHaveAttribute('content', /.+/);
  await expect(page.locator('link[rel="canonical"]').first()).toHaveAttribute('href', /^https?:\/\//);
});

