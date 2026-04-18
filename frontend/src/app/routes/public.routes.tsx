import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { LoadingSpinner } from '@shared/components/common/LoadingSpinner';

const HomePage = lazy(() => import('@pages/HomePage'));
const EventsPage = lazy(() => import('@pages/EventsPage'));
const EventDetailPage = lazy(() => import('@pages/EventDetailPage'));
const CategoriesPage = lazy(() => import('@pages/CategoriesPage'));
const CategoryPage = lazy(() => import('@pages/CategoryPage'));
const CollectionsPage = lazy(() => import('@pages/CollectionsPage'));
const CollectionDetailPage = lazy(() => import('@pages/CollectionDetailPage'));
const SearchPage = lazy(() => import('@pages/SearchPage'));
const BlogPage = lazy(() => import('@pages/static/BlogPage'));
const BlogDetailPage = lazy(() => import('@pages/static/BlogDetailPage'));
const ContactPage = lazy(() => import('@pages/static/ContactPage'));
const AboutPage = lazy(() => import('@pages/static/AboutPage'));
const FAQPage = lazy(() => import('@pages/static/FAQPage'));
const HelpPage = lazy(() => import('@pages/static/HelpPage'));
const PrivacyPage = lazy(() => import('@pages/static/PrivacyPage'));
const TermsPage = lazy(() => import('@pages/static/TermsPage'));
const PartnerWithUsPage = lazy(() => import('@pages/static/PartnerWithUsPage'));
const PaymentSuccessPage = lazy(() => import('@pages/PaymentSuccessPage'));
const PaymentCancelPage = lazy(() => import('@pages/PaymentCancelPage'));
const RegistrationDetailPage = lazy(() => import('@pages/RegistrationDetailPage'));
const TeachingEventDetailPage = lazy(() => import('@pages/TeachingEventDetailPage'));
const TeachersListingPage = lazy(() => import('@pages/TeachersListingPage'));
const TeacherPublicProfilePage = lazy(() => import('@pages/TeacherPublicProfilePage'));
const InstructorDetailPage = lazy(() => import('@pages/InstructorDetailPage'));
const VendorPage = lazy(() => import('@pages/VendorPage'));
const VendorsPage = lazy(() => import('@pages/VendorsPage'));
const BookingPage = lazy(() => import('@pages/BookingPage'));

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner size="lg" />}>{children}</Suspense>
);

export const publicRoutes = (
  <>
    <Route index element={<S><HomePage /></S>} />
    <Route path="events" element={<S><EventsPage /></S>} />
    <Route path="events/:id" element={<S><EventDetailPage /></S>} />
    <Route path="events/:id/book" element={<S><BookingPage /></S>} />
    <Route path="teaching-events/:id" element={<S><TeachingEventDetailPage /></S>} />
    <Route path="teachers" element={<S><TeachersListingPage /></S>} />
    <Route path="teachers/:id" element={<S><TeacherPublicProfilePage /></S>} />
    <Route path="instructors/:id" element={<S><InstructorDetailPage /></S>} />
    <Route path="vendors" element={<S><VendorsPage /></S>} />
    <Route path="vendors/:id" element={<S><VendorPage /></S>} />
    <Route path="categories" element={<S><CategoriesPage /></S>} />
    <Route path="categories/:slug" element={<S><CategoryPage /></S>} />
    <Route path="collections" element={<S><CollectionsPage /></S>} />
    <Route path="collections/:id" element={<S><CollectionDetailPage /></S>} />
    <Route path="search" element={<S><SearchPage /></S>} />
    <Route path="blog" element={<S><BlogPage /></S>} />
    <Route path="blog/:slug" element={<S><BlogDetailPage /></S>} />
    <Route path="contact" element={<S><ContactPage /></S>} />
    <Route path="about" element={<S><AboutPage /></S>} />
    <Route path="faq" element={<S><FAQPage /></S>} />
    <Route path="help" element={<S><HelpPage /></S>} />
    <Route path="privacy" element={<S><PrivacyPage /></S>} />
    <Route path="terms" element={<S><TermsPage /></S>} />
    <Route path="partner-with-us" element={<S><PartnerWithUsPage /></S>} />
    <Route path="payment-success" element={<S><PaymentSuccessPage /></S>} />
    <Route path="payment-cancel" element={<S><PaymentCancelPage /></S>} />
    <Route path="registrations/:id" element={<S><RegistrationDetailPage /></S>} />
  </>
);
