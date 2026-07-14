import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import vendorAPI from '../../services/api/vendorAPI';

import { Event as EventType } from '../../types/event';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import ChartSkeleton from '@/components/charts/ChartSkeleton';
import VendorServicesCard from '@/components/vendor/VendorServicesCard';

const VendorRevenueTrendChart = lazy(() => import('@/components/charts/VendorRevenueTrendChart'));

interface Booking {
  id: string;
  eventId: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  ticketCount: number;
  totalAmount: number;
  bookingDate: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface Stats {
  totalEvents: number;
  activeEvents: number;
  totalBookings: number;
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueTrend?: Array<{ month: string; revenue: number }>;
}

interface VendorProfileSummary {
  verificationStatus?: 'verified' | 'pending' | 'unverified' | 'rejected';
  paymentMode?: 'platform_stripe' | 'custom_stripe';
  stripeConnectAccountId?: string;
  stripePublishableKey?: string;
  stripeKeysValidationError?: string;
}

interface DashboardEvent extends Omit<EventType, 'imageAssets'> {
  imageAssets?: Array<{ _id: string; url: string; secureUrl?: string } | string>;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getEventThumbnail = (event: DashboardEvent): string => {
  if (Array.isArray(event.imageAssets) && event.imageAssets.length > 0) {
    const first = event.imageAssets[0];
    const url = typeof first === 'object' ? (first.url || first.secureUrl) : null;
    if (typeof url === 'string' && url.startsWith('http')) return url;
  }
  if (Array.isArray(event.images) && event.images.length > 0) {
    const url = event.images[0];
    if (typeof url === 'string' && url.startsWith('http')) return url;
  }
  return 'https://placehold.co/400x300/e5e7eb/9ca3af?text=No+Image';
};

const VendorDashboardPage: React.FC = () => {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfileSummary | null>(null);
  const [servicePackages, setServicePackages] = useState<{ packages: any[]; blogs: any[] } | null>(null);
  const [isLoadingPastPackages, setIsLoadingPastPackages] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitForReview = async (eventId: string) => {
    try {
      await vendorAPI.updateVendorEvent(eventId, { status: 'pending_review' });
      setEvents((prev) =>
        prev.map((e: any) =>
          e._id === eventId ? { ...e, status: 'pending_review' } : e,
        ),
      );
      toast.success('Event submitted for review');
    } catch (err: any) {
      console.error('Error submitting event for review:', err);
      toast.error(err?.response?.data?.message || 'Failed to submit event for review');
    }
  };

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Fetch independently — one failing source shouldn't blank out the others
    const [eventsResult, bookingsResult, statsResult, profileResult, servicePackagesResult] = await Promise.allSettled([
      vendorAPI.getVendorEvents(),
      vendorAPI.getVendorBookings({ limit: 5 }),
      vendorAPI.getVendorStats(),
      vendorAPI.getVendorProfile(),
      vendorAPI.getServicePackages(),
    ]);

    if (eventsResult.status === 'fulfilled') {
      setEvents(Array.isArray(eventsResult.value) ? eventsResult.value : []);
    } else {
      console.error('Error fetching vendor events:', eventsResult.reason);
      setEvents([]);
    }

    if (bookingsResult.status === 'fulfilled') {
      const bookingsData = bookingsResult.value;
      setRecentBookings(Array.isArray(bookingsData) ? bookingsData : bookingsData?.bookings || []);
    } else {
      console.error('Error fetching vendor bookings:', bookingsResult.reason);
      setRecentBookings([]);
    }

    if (statsResult.status === 'fulfilled') {
      const statsData = statsResult.value;
      setStats(statsData?.data || statsData);
    } else {
      console.error('Error fetching vendor stats:', statsResult.reason);
      setStats(null);
    }

    if (profileResult.status === 'fulfilled') {
      const profileData: any = profileResult.value;
      const vendor = profileData?.vendor || profileData;
      setVendorProfile({
        verificationStatus: vendor?.verificationStatus,
        paymentMode: vendor?.paymentSettings?.paymentMode,
        stripeConnectAccountId: vendor?.paymentSettings?.stripeSettings?.stripeConnectAccountId,
        stripePublishableKey: vendor?.paymentSettings?.stripeSettings?.stripePublishableKey,
        stripeKeysValidationError: vendor?.paymentSettings?.stripeSettings?.stripeKeysValidationError,
      });
    } else {
      console.error('Error fetching vendor profile:', profileResult.reason);
      setVendorProfile(null);
    }

    if (servicePackagesResult.status === 'fulfilled') {
      const data: any = servicePackagesResult.value;
      setServicePackages({ packages: data?.packages || [], blogs: data?.blogs || [] });
    } else {
      console.error('Error fetching vendor service packages:', servicePackagesResult.reason);
      setServicePackages(null);
    }

    // Profile and service packages are supplementary — don't surface their failure as a page-level error
    if (eventsResult.status === 'rejected' || bookingsResult.status === 'rejected' || statsResult.status === 'rejected') {
      setError('Some dashboard data failed to load. Please try again.');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLoadPastPackages = useCallback(async () => {
    setIsLoadingPastPackages(true);
    try {
      const data: any = await vendorAPI.getServicePackages(true);
      setServicePackages({ packages: data?.packages || [], blogs: data?.blogs || [] });
    } catch (err) {
      console.error('Error fetching past service packages:', err);
    } finally {
      setIsLoadingPastPackages(false);
    }
  }, []);

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'published':
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'draft':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (sold: number, total: number): number => {
    return Math.round((sold / total) * 100);
  };

  const { lowInventoryEvents, startingSoonEvents } = useMemo(() => {
    const now = Date.now();
    const lowInventory: DashboardEvent[] = [];
    const startingSoon: DashboardEvent[] = [];

    events.forEach((event) => {
      if (event.status !== 'published') return;
      const schedule = event.dateSchedule?.[0];
      if (!schedule) return;

      const total = schedule.totalSeats || 0;
      const sold = schedule.soldSeats || 0;
      if (total > 0 && sold / total >= 0.9) {
        lowInventory.push(event);
      }

      const dateStr = schedule.date || schedule.startDateTime || schedule.startDate;
      if (dateStr) {
        const daysUntil = (new Date(dateStr).getTime() - now) / MS_PER_DAY;
        if (daysUntil >= 0 && daysUntil <= 3) {
          startingSoon.push(event);
        }
      }
    });

    return { lowInventoryEvents: lowInventory, startingSoonEvents: startingSoon };
  }, [events]);

  const showVerificationBanner = !!vendorProfile?.verificationStatus && vendorProfile.verificationStatus !== 'verified';
  const showStripeBanner =
    vendorProfile?.paymentMode === 'custom_stripe' &&
    (!!vendorProfile.stripeKeysValidationError ||
      (!vendorProfile.stripeConnectAccountId && !vendorProfile.stripePublishableKey));

  if (isLoading) {
    return (
      <>
        <PrivatePageSEO title="Vendor - Dashboard | Kidrove" description="Vendor dashboard" />

        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-[50vh]">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-600 absolute top-0 left-0"></div>
              </div>
              <p className="mt-4 text-xl font-semibold text-gray-700 animate-pulse">Loading Vendor Dashboard...</p>
              <div className="mt-6 space-y-3">
                <div className="h-4 bg-gradient-to-r from-green-200 to-transparent rounded w-64 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-emerald-200 to-transparent rounded w-48 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-green-200 to-transparent rounded w-56 mx-auto animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PrivatePageSEO title="Vendor - Dashboard | Kidrove" description="Vendor dashboard" />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your events and bookings</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link
              to="/vendor/events/create"
              className="inline-flex items-center px-6 py-3 rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-xl hover:shadow-green-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create New Event
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 flex items-center justify-between gap-4" role="alert">
            <p>{error}</p>
            <button
              onClick={() => fetchDashboardData()}
              className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {showVerificationBanner && (
          <div
            className={`border-l-4 p-4 mb-4 rounded-r-lg ${
              vendorProfile?.verificationStatus === 'rejected'
                ? 'bg-red-50 border-red-500 text-red-800'
                : 'bg-yellow-50 border-yellow-500 text-yellow-800'
            }`}
            role="alert"
          >
            <p className="font-semibold">
              {vendorProfile?.verificationStatus === 'rejected'
                ? 'Your vendor verification was rejected'
                : 'Your vendor account is not yet verified'}
            </p>
            <p className="text-sm mt-1">
              {vendorProfile?.verificationStatus === 'rejected'
                ? 'Review the feedback on your profile and resubmit your documents.'
                : 'Some features may be limited until an admin reviews and verifies your account.'}{' '}
              <Link to="/vendor/profile" className="underline font-medium">
                Go to Profile
              </Link>
            </p>
          </div>
        )}

        {showStripeBanner && (
          <div className="border-l-4 border-red-500 bg-red-50 text-red-800 p-4 mb-6 rounded-r-lg" role="alert">
            <p className="font-semibold">Payments are not set up correctly</p>
            <p className="text-sm mt-1">
              {vendorProfile?.stripeKeysValidationError
                ? `Your Stripe keys failed validation: ${vendorProfile.stripeKeysValidationError}`
                : 'You are on the custom Stripe payment mode but have not connected or added Stripe API keys yet.'}{' '}
              Customers may not be able to pay for your events until this is fixed.{' '}
              <Link to="/vendor/profile" className="underline font-medium">
                Fix Payment Settings
              </Link>
            </p>
          </div>
        )}

        {(lowInventoryEvents.length > 0 || startingSoonEvents.length > 0) && (
          <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-900 p-4 mb-6 rounded-r-lg" role="status">
            <p className="font-semibold mb-1">Heads up</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              {startingSoonEvents.map((e) => (
                <li key={`soon-${e._id}`}>
                  <Link to={`/vendor/events/${e._id}`} className="underline">{e.title}</Link> starts within 3 days
                </li>
              ))}
              {lowInventoryEvents.map((e) => (
                <li key={`low-${e._id}`}>
                  <Link to={`/vendor/events/${e._id}`} className="underline">{e.title}</Link> is 90%+ sold out
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-8">
          <Link to="/vendor/payouts" className="px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:border-gray-300 hover:shadow transition-all">
            Payouts
          </Link>
          <Link to="/vendor/employees" className="px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:border-gray-300 hover:shadow transition-all">
            Employees
          </Link>
          <Link to="/vendor/analytics" className="px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:border-gray-300 hover:shadow transition-all">
            Analytics
          </Link>
          <Link to="/vendor/profile" className="px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:border-gray-300 hover:shadow transition-all">
            Payment Settings
          </Link>
        </div>

        <VendorServicesCard
          data={servicePackages}
          onLoadPast={handleLoadPastPackages}
          isLoadingPast={isLoadingPastPackages}
        />

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div key="stats-events" className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl shadow-blue-200/50 p-6 border border-blue-100 backdrop-blur-sm hover:shadow-2xl hover:shadow-blue-300/30 transition-all duration-300 transform hover:scale-105 group">
              <div className="flex items-center">
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white mr-4 shadow-lg transition-all duration-300 group-hover:scale-110">
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-800 transition-colors duration-300">Total Events</p>
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">{stats.totalEvents}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  <span className="text-green-600 font-bold px-2 py-1 rounded-full bg-green-100">{stats.activeEvents} active</span>
                  <span className="ml-2">events</span>
                </p>
              </div>
            </div>

            <div key="stats-bookings" className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl shadow-green-200/50 p-6 border border-green-100 backdrop-blur-sm hover:shadow-2xl hover:shadow-green-300/30 transition-all duration-300 transform hover:scale-105 group">
              <div className="flex items-center">
                <div className="p-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white mr-4 shadow-lg transition-all duration-300 group-hover:scale-110">
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-800 transition-colors duration-300">Total Bookings</p>
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-green-700 transition-colors duration-300">{stats.totalBookings}</p>
                </div>
              </div>
              <div className="mt-4">
                <Link to="/vendor/bookings" className="text-sm font-semibold px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 hover:text-green-800 transition-all duration-300">
                  View all bookings
                </Link>
              </div>
            </div>

            <div key="stats-revenue" className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl shadow-purple-200/50 p-6 border border-purple-100 backdrop-blur-sm hover:shadow-2xl hover:shadow-purple-300/30 transition-all duration-300 transform hover:scale-105 group">
              <div className="flex items-center">
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white mr-4 shadow-lg transition-all duration-300 group-hover:scale-110">
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-800 transition-colors duration-300">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors duration-300">AED {stats.totalRevenue}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  <span className="text-purple-600 font-bold px-2 py-1 rounded-full bg-purple-100">AED {stats.revenueThisMonth}</span>
                  <span className="ml-2">this month</span>
                </p>
              </div>
            </div>

            <div key="stats-growth" className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl shadow-xl shadow-orange-200/50 p-6 border border-orange-100 backdrop-blur-sm hover:shadow-2xl hover:shadow-orange-300/30 transition-all duration-300 transform hover:scale-105 group">
              <div className="flex items-center">
                <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-600 text-white mr-4 shadow-lg transition-all duration-300 group-hover:scale-110">
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-800 transition-colors duration-300">Monthly Growth</p>
                  <p className="text-2xl font-bold text-gray-900 group-hover:text-orange-700 transition-colors duration-300">
                    {stats.revenueLastMonth === 0 ? (
                      <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded-full font-bold text-lg">— N/A</span>
                    ) : stats.revenueThisMonth >= stats.revenueLastMonth ? (
                      <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full font-bold text-lg">↗ +{Math.round((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth * 100)}%</span>
                    ) : (
                      <span className="text-red-600 bg-red-100 px-2 py-1 rounded-full font-bold text-lg">↘ -{Math.round((stats.revenueLastMonth - stats.revenueThisMonth) / stats.revenueLastMonth * 100)}%</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">vs AED {stats.revenueLastMonth}</span> last month
                </p>
              </div>
            </div>
          </div>
        )}

        {stats?.revenueTrend && stats.revenueTrend.some((m) => m.revenue > 0) && (
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 border border-white/20 backdrop-blur-sm p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue — Last 6 Months</h2>
            <Suspense fallback={<ChartSkeleton height={240} />}>
              <VendorRevenueTrendChart data={stats.revenueTrend} />
            </Suspense>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-white/20 backdrop-blur-sm">
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full mr-3"></div>
                  Your Events
                </h2>
                <Link to="/vendor/events" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105">
                  View All
                </Link>
              </div>
              <div className="p-6">
                {!Array.isArray(events) || events.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">You don't have any events yet.</p>
                    <Link to="/vendor/events/create" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                      Create Your First Event
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {events.slice(0, 5).map((event) => (
                      <div key={event._id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex flex-col sm:flex-row">
                          <div className="sm:w-1/3 md:w-1/4">
                            <img
                              className="h-48 w-full object-cover sm:h-full"
                              src={getEventThumbnail(event)}
                              alt={event.title}
                            />
                          </div>
                          <div className="p-4 sm:p-6 sm:w-2/3 md:w-3/4">
                            <div className="flex flex-col sm:flex-row justify-between">
                              <div>
                                <div className="flex items-center mb-2">
                                  <h3 className="text-lg font-semibold text-gray-900 mr-2">
                                    <Link to={`/vendor/events/${event._id}`} className="hover:text-primary">
                                      {event.title}
                                    </Link>
                                  </h3>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(event.status)}`}>
                                    {event.status === 'draft' ? 'Pending Approval' : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-500 mb-4">
                                  <p><span className="font-medium">Date:</span> {event.dateSchedule?.[0]?.date ? formatDate(event.dateSchedule[0].date) : 'TBD'}</p>
                                  <p><span className="font-medium">Location:</span> {event.location.city}, {event.location.address}</p>
                                  <p><span className="font-medium">Price:</span> {event.currency || 'AED'} {event.price.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="mt-4 sm:mt-0">
                                <div className="text-sm text-gray-500 mb-2">
                                  <span className="font-medium">Tickets sold:</span> {event.dateSchedule?.[0]?.soldSeats || 0} / {event.dateSchedule?.[0]?.totalSeats || 0}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                  <div
                                    className="bg-primary h-2.5 rounded-full"
                                    style={{ width: `${calculateProgress(event.dateSchedule?.[0]?.soldSeats || 0, event.dateSchedule?.[0]?.totalSeats || 0)}%` }}
                                  ></div>
                                </div>
                                <div className="flex space-x-2">
                                  <Link
                                    to={`/vendor/events/${event._id}/edit`}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                  >
                                    Edit
                                  </Link>
                                  <Link
                                    to={`/events/${event.slug || event._id}`}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                  >
                                    Preview
                                  </Link>
                                  {event.status === 'draft' && (
                                    <button
                                      onClick={() => handleSubmitForReview(event._id)}
                                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                      Submit for Review
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {events.length > 5 && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    +{events.length - 5} more —{' '}
                    <Link to="/vendor/events" className="text-primary font-medium hover:underline">
                      view all events
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-white/20 backdrop-blur-sm">
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full mr-3"></div>
                  Recent Bookings
                </h2>
                <Link to="/vendor/bookings" className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105">
                  View All
                </Link>
              </div>
              <div className="p-6">
                {!Array.isArray(recentBookings) || recentBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No bookings yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.isArray(recentBookings) && recentBookings.map((booking: any) => (
                      <div key={booking._id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow duration-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {booking.userId?.firstName || ''} {booking.userId?.lastName || ''}
                            </h4>
                            <p className="text-sm text-gray-500">{booking.userId?.email || 'N/A'}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                            {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          <p><span className="font-medium">Order:</span> {booking.orderNumber || 'N/A'}</p>
                          <p><span className="font-medium">Tickets:</span> {booking.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0}</p>
                          <p><span className="font-medium">Total:</span> {booking.displayCurrency || '$'} {(booking.total ?? 0).toFixed(2)}</p>
                          <p><span className="font-medium">Booked on:</span> {formatDate(booking.createdAt)}</p>
                        </div>
                        <div className="mt-3">
                          <Link
                            to={`/vendor/bookings/${booking._id}`}
                            className="text-xs text-primary hover:text-primary-dark font-medium"
                          >
                            View details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VendorDashboardPage;