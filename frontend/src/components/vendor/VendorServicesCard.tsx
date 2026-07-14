import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface ServicePackageItem {
  type: 'featured_event' | 'blog_post' | 'priority_listing' | 'social_post' | 'other';
  label?: string;
  unit: 'count' | 'days';
  quantity: number;
  durationDays?: number;
  used: number;
}

interface FeaturedEventRef {
  _id: string;
  title: string;
  slug?: string;
  isFeatured?: boolean;
  featuredUntil?: string;
}

interface ServicePackage {
  _id: string;
  name: string;
  vendorNotes?: string;
  items: ServicePackageItem[];
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'completed' | 'cancelled';
  computedStatus?: 'active' | 'expired' | 'completed' | 'cancelled';
  featuredEvents?: FeaturedEventRef[];
}

interface BlogRef {
  _id: string;
  title: string;
  slug?: string;
  status?: string;
  publishedAt?: string;
}

interface VendorServicesData {
  packages: ServicePackage[];
  blogs: BlogRef[];
}

interface VendorServicesCardProps {
  data: VendorServicesData | null;
  onLoadPast?: () => void;
  isLoadingPast?: boolean;
}

const ITEM_LABELS: Record<ServicePackageItem['type'], string> = {
  featured_event: 'Featured events',
  blog_post: 'Blog posts',
  priority_listing: 'Priority listing',
  social_post: 'Social posts',
  other: 'Other',
};

const daysLeft = (endDate: string): number => {
  const ms = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

const ItemProgress: React.FC<{ item: ServicePackageItem }> = ({ item }) => {
  const label = item.label || ITEM_LABELS[item.type];

  if (item.unit === 'days') {
    // Time-based deliverable (e.g. priority listing) — show days remaining, not a count.
    return (
      <li className="flex items-center justify-between text-sm py-1">
        <span className="text-gray-700">⏳ {label}</span>
        <span className="font-medium text-gray-900">{item.durationDays ?? 0} days</span>
      </li>
    );
  }

  const remaining = Math.max(0, item.quantity - item.used);
  const done = remaining === 0;
  return (
    <li className="flex items-center justify-between text-sm py-1">
      <span className="text-gray-700">{done ? '✔' : '○'} {label}</span>
      <span className="font-medium text-gray-900">{item.used}/{item.quantity} used</span>
    </li>
  );
};

const VendorServicesCard: React.FC<VendorServicesCardProps> = ({ data, onLoadPast, isLoadingPast }) => {
  const [showPast, setShowPast] = useState(false);

  if (!data || !Array.isArray(data.packages) || data.packages.length === 0) {
    return null;
  }

  const activePackages = data.packages.filter(
    (p) => (p.computedStatus || p.status) === 'active' || (p.computedStatus || p.status) === 'completed',
  );

  if (activePackages.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 border border-white/20 backdrop-blur-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">My Services</h2>
        {onLoadPast && (
          <button
            onClick={() => {
              setShowPast((prev) => !prev);
              if (!showPast) onLoadPast();
            }}
            className="text-sm text-primary hover:underline"
          >
            {isLoadingPast ? 'Loading…' : showPast ? 'Hide past packages' : 'View past packages'}
          </button>
        )}
      </div>

      <div className="space-y-5">
        {activePackages.map((pkg) => {
          const remainingDays = daysLeft(pkg.endDate);
          return (
            <div key={pkg._id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    remainingDays <= 7 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {remainingDays > 0 ? `Expires in ${remainingDays}d` : 'Expired'}
                </span>
              </div>

              {pkg.vendorNotes && <p className="text-sm text-gray-500 mb-2">{pkg.vendorNotes}</p>}

              <ul className="divide-y divide-gray-100">
                {pkg.items.map((item, idx) => (
                  <ItemProgress key={`${pkg._id}-${item.type}-${idx}`} item={item} />
                ))}
              </ul>

              {(pkg.featuredEvents?.length ?? 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Featured events</p>
                  <div className="flex flex-wrap gap-2">
                    {pkg.featuredEvents!.map((event) => (
                      <Link
                        key={event._id}
                        to={`/vendor/events/${event._id}`}
                        className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                      >
                        {event.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {data.blogs.length > 0 && (
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Blogs posted for you</p>
            <div className="flex flex-wrap gap-2">
              {data.blogs.map((blog) => (
                <Link
                  key={blog._id}
                  to={`/blog/${blog.slug || blog._id}`}
                  className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  {blog.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorServicesCard;
