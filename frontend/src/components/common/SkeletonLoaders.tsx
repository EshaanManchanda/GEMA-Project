import React from 'react';

/**
 * Route-specific skeleton components for better perceived performance
 * Replaces generic LoadingSpinner with layout-aware skeletons
 * Reduces Cumulative Layout Shift (CLS) by reserving space
 */

// Base skeleton utility component
export const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-gray-200 animate-pulse rounded ${className}`} />
);

// Hero banner skeleton
const HeroBannerSkeleton = () => (
  <div className="w-full h-96 md:h-[600px] bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse relative">
    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 px-4">
      <SkeletonBox className="w-32 h-8 rounded-full" />
      <SkeletonBox className="w-full max-w-2xl h-16" />
      <SkeletonBox className="w-full max-w-md h-6" />
      <SkeletonBox className="w-full max-w-2xl h-14 rounded-2xl" />
    </div>
  </div>
);

// Event card skeleton
const EventCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
    <SkeletonBox className="w-full h-64" />
    <div className="p-5 space-y-3">
      <SkeletonBox className="w-3/4 h-6" />
      <SkeletonBox className="w-full h-4" />
      <SkeletonBox className="w-1/2 h-4" />
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
        <SkeletonBox className="w-24 h-8" />
        <SkeletonBox className="w-32 h-10 rounded-xl" />
      </div>
    </div>
  </div>
);

// HomePage skeleton
export const HomePageSkeleton = () => (
  <div className="w-full bg-gray-50">
    {/* Hero Banner */}
    <HeroBannerSkeleton />

    {/* Featured Events Section */}
    <div className="max-w-screen-xl mx-auto px-6 py-16">
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-3">
          <SkeletonBox className="w-48 h-8" />
          <SkeletonBox className="w-96 h-5" />
        </div>
        <SkeletonBox className="w-32 h-6" />
      </div>

      {/* Event Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>

    {/* Stats Section */}
    <div className="w-full py-16 bg-gray-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 space-y-3">
          <SkeletonBox className="w-32 h-6 rounded-full mx-auto" />
          <SkeletonBox className="w-64 h-8 mx-auto" />
          <SkeletonBox className="w-96 h-5 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-md p-6 text-center">
              <SkeletonBox className="w-12 h-12 rounded-full mx-auto mb-4" />
              <SkeletonBox className="w-16 h-8 mx-auto mb-2" />
              <SkeletonBox className="w-20 h-4 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// EventsPage skeleton
export const EventsPageSkeleton = () => (
  <div className="max-w-screen-xl mx-auto px-6 py-8">
    {/* Breadcrumbs */}
    <div className="flex items-center gap-2 mb-6">
      <SkeletonBox className="w-16 h-4" />
      <SkeletonBox className="w-4 h-4" />
      <SkeletonBox className="w-20 h-4" />
    </div>

    {/* Page Title */}
    <SkeletonBox className="w-64 h-10 mb-4" />

    {/* Search Bar */}
    <SkeletonBox className="w-full h-14 rounded-lg mb-8" />

    <div className="flex flex-col md:flex-row gap-6">
      {/* Filters Sidebar */}
      <div className="w-full md:w-1/4 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <SkeletonBox className="w-32 h-5" />
              <SkeletonBox className="w-full h-10 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      <div className="w-full md:w-3/4">
        <div className="flex justify-between items-center mb-6">
          <SkeletonBox className="w-32 h-6" />
          <SkeletonBox className="w-48 h-10 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// EventDetailPage skeleton
export const EventDetailSkeleton = () => (
  <div className="max-w-screen-xl mx-auto px-6 py-8">
    {/* Breadcrumbs */}
    <div className="flex items-center gap-2 mb-6">
      <SkeletonBox className="w-16 h-4" />
      <SkeletonBox className="w-4 h-4" />
      <SkeletonBox className="w-20 h-4" />
      <SkeletonBox className="w-4 h-4" />
      <SkeletonBox className="w-32 h-4" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Hero Image */}
        <SkeletonBox className="w-full h-96 rounded-2xl" />

        {/* Title & Info */}
        <div className="space-y-4">
          <SkeletonBox className="w-3/4 h-10" />
          <div className="flex items-center gap-4">
            <SkeletonBox className="w-32 h-6" />
            <SkeletonBox className="w-24 h-6" />
            <SkeletonBox className="w-28 h-6" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <SkeletonBox className="w-full h-4" />
          <SkeletonBox className="w-full h-4" />
          <SkeletonBox className="w-full h-4" />
          <SkeletonBox className="w-3/4 h-4" />
        </div>

        {/* Details Section */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBox className="w-5 h-5" />
              <SkeletonBox className="w-48 h-4" />
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Booking Card */}
        <div className="bg-white p-6 rounded-lg shadow-lg space-y-4 sticky top-6">
          <SkeletonBox className="w-full h-12" />
          <SkeletonBox className="w-full h-10 rounded" />
          <SkeletonBox className="w-full h-10 rounded" />
          <SkeletonBox className="w-full h-12 rounded-xl" />
        </div>

        {/* Vendor Info */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-3">
          <SkeletonBox className="w-32 h-6" />
          <div className="flex items-center gap-3">
            <SkeletonBox className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBox className="w-32 h-5" />
              <SkeletonBox className="w-24 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// CheckoutPage skeleton
export const CheckoutSkeleton = () => (
  <div className="max-w-screen-xl mx-auto px-6 py-8">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Checkout Form */}
      <div className="lg:col-span-2 space-y-6">
        <SkeletonBox className="w-48 h-10 mb-6" />

        {/* Customer Info Section */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <SkeletonBox className="w-40 h-6 mb-4" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <SkeletonBox className="w-32 h-4" />
              <SkeletonBox className="w-full h-12 rounded" />
            </div>
          ))}
        </div>

        {/* Payment Section */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <SkeletonBox className="w-48 h-6 mb-4" />
          <SkeletonBox className="w-full h-48 rounded" />
        </div>
      </div>

      {/* Order Summary */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-lg sticky top-6 space-y-4">
          <SkeletonBox className="w-40 h-6 mb-4" />

          {/* Cart Items */}
          {[1, 2].map(i => (
            <div key={i} className="flex gap-4 pb-4 border-b">
              <SkeletonBox className="w-20 h-20 rounded" />
              <div className="flex-1 space-y-2">
                <SkeletonBox className="w-full h-5" />
                <SkeletonBox className="w-24 h-4" />
              </div>
            </div>
          ))}

          {/* Price Summary */}
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between">
                <SkeletonBox className="w-24 h-4" />
                <SkeletonBox className="w-16 h-4" />
              </div>
            ))}
            <div className="flex justify-between pt-3 border-t">
              <SkeletonBox className="w-32 h-6" />
              <SkeletonBox className="w-24 h-6" />
            </div>
          </div>

          <SkeletonBox className="w-full h-12 rounded-xl mt-4" />
        </div>
      </div>
    </div>
  </div>
);

// AdminDashboard skeleton
export const AdminDashboardSkeleton = () => (
  <div className="p-6 space-y-6">
    <SkeletonBox className="w-64 h-10 mb-8" />

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white p-6 rounded-lg shadow space-y-3">
          <SkeletonBox className="w-32 h-5" />
          <SkeletonBox className="w-24 h-8" />
          <SkeletonBox className="w-20 h-4" />
        </div>
      ))}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2].map(i => (
        <div key={i} className="bg-white p-6 rounded-lg shadow space-y-4">
          <SkeletonBox className="w-48 h-6" />
          <SkeletonBox className="w-full h-64 rounded" />
        </div>
      ))}
    </div>

    {/* Recent Activity Table */}
    <div className="bg-white p-6 rounded-lg shadow space-y-4">
      <SkeletonBox className="w-40 h-6 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 py-3 border-b">
            <SkeletonBox className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBox className="w-48 h-4" />
              <SkeletonBox className="w-32 h-3" />
            </div>
            <SkeletonBox className="w-24 h-8 rounded" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Generic skeleton for other pages
export const GenericPageSkeleton = () => (
  <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
    <SkeletonBox className="w-64 h-10" />
    <div className="space-y-4">
      <SkeletonBox className="w-full h-4" />
      <SkeletonBox className="w-full h-4" />
      <SkeletonBox className="w-3/4 h-4" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white p-6 rounded-lg shadow space-y-3">
          <SkeletonBox className="w-full h-48" />
          <SkeletonBox className="w-3/4 h-6" />
          <SkeletonBox className="w-full h-4" />
        </div>
      ))}
    </div>
  </div>
);

export default {
  HomePageSkeleton,
  EventsPageSkeleton,
  EventDetailSkeleton,
  CheckoutSkeleton,
  AdminDashboardSkeleton,
  GenericPageSkeleton,
};
