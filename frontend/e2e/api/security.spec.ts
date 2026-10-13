import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';
import { API_URL, ACCOUNTS, Role } from '../support/env';

/**
 * HTTP-level access-control checks against the running backend — the E2E
 * counterpart of backend/src/tests/integration/security/ownership.test.ts.
 */

type Session = { api: APIRequestContext; csrf: string; userId: string };

async function session(email: string, password: string): Promise<Session> {
  const api = await pwRequest.newContext({ baseURL: API_URL + '/' });
  const res = await api.post('auth/login', { data: { email, password } });
  expect(res.ok(), `login ${email}`).toBeTruthy();
  const csrf = (await api.storageState()).cookies.find((c) => c.name === 'XSRF-TOKEN')?.value ?? '';
  return { api, csrf, userId: (await res.json()).data.user.id };
}
const as = (role: Role) => session(ACCOUNTS[role].email, ACCOUNTS[role].password);

async function freshVendor(): Promise<Session> {
  const anon = await pwRequest.newContext({ baseURL: API_URL + '/' });
  const email = `e2e.vendor.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.com`;
  const password = 'E2e@Pass1234!';
  const reg = await anon.post('auth/register', { data: { firstName: 'E2E', lastName: 'Vendor', email, password, role: 'vendor' } });
  expect(reg.ok(), `register vendor: ${reg.status()}`).toBeTruthy();
  return session(email, password);
}

/** A brand-new vendor creates an event, so the test owns real vendor data. */
async function vendorWithEvent(): Promise<{ owner: Session; eventId: string }> {
  const owner = await freshVendor();
  const cats = await (await owner.api.get('categories')).json();
  const category = cats?.data?.[0]?.name;
  expect(category, 'seed categories first: npm run db:seed-categories').toBeTruthy();
  const day = new Date(Date.now() + 10 * 86_400_000).toISOString();
  const res = await owner.api.post('vendors/events', {
    headers: { 'X-CSRF-Token': owner.csrf },
    data: {
      title: `E2E Owned Event ${Date.now()}`,
      description: 'Event created by the E2E security suite to test ownership checks.',
      shortDescription: 'E2E ownership fixture.',
      category,
      type: 'Workshop',
      venueType: 'Indoor',
      ageRange: [6, 12],
      location: { city: 'Dubai', address: '1 Test Street' },
      price: 50,
      currency: 'AED',
      dateSchedule: [{ startDate: day, endDate: day, startTime: '10:00', endTime: '12:00', availableSeats: 10, price: 50 }],
    },
  });
  expect(res.status(), `create event: ${await res.text()}`).toBe(201);
  const body = await res.json();
  return { owner, eventId: body?.data?.event?._id ?? body?.data?._id };
}

test.describe('authentication required', () => {
  for (const path of ['orders', 'tickets/user/my-tickets', 'students/me/children', 'insights/platform/highlights-report?range=30d']) {
    test(`GET /${path} → 401 when anonymous`, async () => {
      const anon = await pwRequest.newContext({ baseURL: API_URL + '/' });
      expect((await anon.get(path)).status()).toBe(401);
    });
  }
});

test.describe('role checks', () => {
  test('customer cannot generate the admin PDF report', async () => {
    const c = await as('customer');
    expect((await c.api.get('insights/platform/highlights-report?range=30d')).status()).toBe(403);
  });

  test('vendor cannot list all users', async () => {
    const v = await as('vendor');
    expect([401, 403]).toContain((await v.api.get('admin/users')).status());
  });
});

test.describe('cross-tenant access (IDOR)', () => {
  test("a different vendor cannot read another vendor's ticket list", async () => {
    const { owner, eventId } = await vendorWithEvent();
    const intruder = await freshVendor();
    expect((await intruder.api.get(`tickets/event/${eventId}`)).status()).toBe(403);
    expect((await owner.api.get(`tickets/event/${eventId}`)).status()).toBe(200);
  });

  test("a different vendor cannot read another vendor's cancellation contact list", async () => {
    const { owner, eventId } = await vendorWithEvent();
    const intruder = await freshVendor();
    expect((await intruder.api.get(`events/${eventId}/affected-orders`)).status()).toBe(403);
    expect((await owner.api.get(`events/${eventId}/affected-orders`)).status()).toBe(200);
  });

  test("a vendor cannot claim another vendor's event", async () => {
    const { eventId } = await vendorWithEvent();
    const intruder = await freshVendor();
    const res = await intruder.api.post(`events/${eventId}/claim`, { headers: { 'X-CSRF-Token': intruder.csrf } });
    expect(res.status()).toBe(400);
  });

  test("a customer cannot read a child record that isn't theirs", async () => {
    const admin = await as('admin');
    const list = await admin.api.get('students?limit=1');
    const student = (await list.json())?.data?.students?.[0];
    test.skip(!student, 'no students in the seed DB');
    const customer = await as('customer');
    test.skip(String(student.parentUserId?._id ?? student.parentUserId) === customer.userId, 'student belongs to the test customer');
    expect((await customer.api.get(`students/${student._id}`)).status()).toBe(404);
  });
});

test.describe('CSRF protection', () => {
  test('state-changing request without the CSRF header is rejected', async () => {
    const c = await as('customer');
    const res = await c.api.post('favorites/000000000000000000000000');
    expect(res.status()).toBe(403);
  });
});
