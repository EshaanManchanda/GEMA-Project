import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from '@components/layout/Layout';
import AdminLayout from '@components/layout/AdminLayout';
import ScrollToTop from '@components/common/ScrollToTop';
import GlobalUploadProgress from '@components/common/GlobalUploadProgress';
import { ThemeController } from '@components/ThemeController';
import NotFoundPage from '@pages/error/NotFoundPage';
import ServerErrorPage from '@pages/error/ServerErrorPage';
import { publicRoutes } from './public.routes';
import { authRoutes, customerRoutes } from './auth.routes';
import { vendorRoutes } from './vendor.routes';
import { teacherRoutes } from './teacher.routes';
import { employeeRoutes } from './employee.routes';
import { adminRoutes } from './admin.routes';
import { studentRoutes, parentRoutes, schoolRoutes } from './student.routes';

export default function AppRoutes() {
  return (
    <>
      <ThemeController />
      <GlobalUploadProgress />
      <Toaster position="top-right" />
      <ScrollToTop />
      <Routes>
        {/* Public + Auth routes wrapped in Layout */}
        <Route element={<Layout />}>
          {publicRoutes}
          {authRoutes}
          {customerRoutes}
          {vendorRoutes}
          {teacherRoutes}
          {employeeRoutes}
          {studentRoutes}
          {parentRoutes}
          {schoolRoutes}
        </Route>

        {/* Admin routes wrapped in AdminLayout */}
        <Route element={<AdminLayout />}>
          {adminRoutes}
        </Route>

        {/* Error routes */}
        <Route path="/unauthorized" element={<ServerErrorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
