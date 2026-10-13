import { test, expect, visit, expectNoErrorScreen, expectNoHorizontalScroll, liveEvent } from '../support/fixtures';

test.describe('event discovery', () => {
  test('/events lists events and a card opens the detail page @mobile', async ({ page, request }) => {
    const ev = await liveEvent(request);
    await visit(page, '/events');
    await expect(page.locator('h1').first()).toHaveText(/all events/i);
    const card = page.getByText(ev.title, { exact: true }).first();
    await expect(card).toBeVisible();
    await expectNoHorizontalScroll(page);
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/events/${ev.slug}`));
  });

  test('event detail page shows title, price area and a booking action @mobile', async ({ page, request }) => {
    const ev = await liveEvent(request);
    await visit(page, `/events/${ev.slug}`);
    await expect(page.locator('h1').first()).toHaveText(new RegExp(ev.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    await expect(page).toHaveTitle(/kidrove/i);
    await expect(page.getByRole('button', { name: /book|time slots|register|tickets/i }).or(page.getByRole('link', { name: /book|time slots|register|tickets/i })).first()).toBeVisible();
    await expectNoErrorScreen(page);
    await expectNoHorizontalScroll(page);
  });

  test('search returns results for a known event title', async ({ page, request }) => {
    const ev = await liveEvent(request);
    const word = ev.title.split(/\s+/).find((w) => w.length > 3) ?? ev.title;
    await visit(page, `/search?q=${encodeURIComponent(word)}`);
    await expect(page.locator('h1').first()).toHaveText(/results for/i);
    await expect(page.getByText(ev.title, { exact: false }).first()).toBeVisible();
  });

  test('a non-existent event slug does not crash the page', async ({ page }) => {
    await visit(page, '/events/no-such-event-e2e-xyz');
    await expect(page.getByText(/something went wrong|unexpected error occurred/i)).toHaveCount(0);
  });
});

test.describe('booking entry point', () => {
  test('anonymous visitor is sent to login before booking', async ({ page, request }) => {
    const ev = await liveEvent(request);
    await visit(page, `/booking/${ev.slug}`);
    await expect(page).toHaveURL(/\/login/);
  });
});
