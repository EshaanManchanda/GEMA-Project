/** Test accounts and endpoints. Defaults match `npm run db:seed` on a LOCAL database. */
export const API_URL = process.env.E2E_API_URL || 'http://localhost:5001/api';

export type Role = 'admin' | 'vendor' | 'customer';

export const ACCOUNTS: Record<Role, { email: string; password: string; home: string }> = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@gema.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
    home: '/admin',
  },
  vendor: {
    email: process.env.E2E_VENDOR_EMAIL || 'vendor@gema.com',
    password: process.env.E2E_VENDOR_PASSWORD || 'vendor123',
    home: '/vendor',
  },
  customer: {
    email: process.env.E2E_CUSTOMER_EMAIL || 'customer@gema.com',
    password: process.env.E2E_CUSTOMER_PASSWORD || 'customer123',
    home: '/dashboard',
  },
};
