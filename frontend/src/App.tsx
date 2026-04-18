import AppRoutes from './app/routes';

/**
 * GEMA Frontend — Thin App Component
 * 
 * Route configuration is split across:
 * - app/routes/public.routes.tsx    — Public pages + auth
 * - app/routes/auth.routes.tsx      — Customer dashboard
 * - app/routes/vendor.routes.tsx    — Vendor portal
 * - app/routes/teacher.routes.tsx   — Teacher portal
 * - app/routes/employee.routes.tsx  — Employee portal
 * - app/routes/admin.routes.tsx     — Admin panel
 * - app/routes/student.routes.tsx   — Student + Parent + School portals
 * 
 * All routes are lazy-loaded for code splitting.
 * See app/routes/index.tsx for the full route tree.
 */
export default function App() {
  return <AppRoutes />;
}
