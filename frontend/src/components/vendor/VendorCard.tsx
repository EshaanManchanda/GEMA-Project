import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaCheckCircle, FaStar, FaUsers, FaCalendarAlt } from 'react-icons/fa';
import { API_BASE_URL } from '@/config/api';

export interface Vendor {
  id: string;
  name: string;
  description?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  eventCount?: number;
  logo?: string;
  coverImage?: string;
  categories?: string[];
}

const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return '';
  }
})();

export const normalizeImageUrl = (url?: string) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (API_ORIGIN && url.startsWith('/')) {
    return `${API_ORIGIN}${url}`;
  }
  return url;
};

export const defaultVendorCovers = [
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515169067868-5387ec356754?q=80&w=800&auto=format&fit=crop'
];

interface VendorCardProps {
  vendor: Vendor;
  idx: number;
}

const VendorCard: React.FC<VendorCardProps> = ({ vendor, idx }) => {
  // Use logo as the main profile picture/background, fallback to cover, then default
  const cardImage = vendor.logo ? normalizeImageUrl(vendor.logo) :
    vendor.coverImage ? normalizeImageUrl(vendor.coverImage) :
      defaultVendorCovers[idx % defaultVendorCovers.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.04, 0.4) }}
    >
      <Link
        to={`/vendors/${vendor.id}`}
        className="block relative group rounded-2xl overflow-hidden aspect-[4/5] shadow-sm hover:shadow-xl transition-all duration-300"
      >
        {/* Background Image */}
        <div className="absolute inset-0 bg-gray-200">
          <img
            src={cardImage}
            alt={vendor.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/70 via-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80" />
        </div>

        {/* Verification Badge */}
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-white/90 backdrop-blur-md rounded-full p-1 shadow-sm">
            <FaCheckCircle className="w-5 h-5 text-emerald-500" title="Verified vendor" />
          </div>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white transform transition-transform duration-300">
          <div className="mb-2">
            <h3 className="text-lg sm:text-xl font-bold leading-tight mb-1 group-hover:text-emerald-300 transition-colors line-clamp-1">
              {vendor.name}
            </h3>
            {vendor.location && (
              <p className="text-xs font-medium opacity-90 flex items-center gap-1.5">
                <FaMapMarkerAlt className="w-3 h-3 text-emerald-400" />
                {vendor.location}
              </p>
            )}
          </div>

          {/* Categories */}
          {vendor.categories && vendor.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {vendor.categories.slice(0, 2).map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-medium"
                >
                  {cat}
                </span>
              ))}
              {vendor.categories.length > 2 && (
                <span className="px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded-full text-[10px]">
                  +{vendor.categories.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs opacity-90 pt-3 border-t border-white/20">
            {vendor.rating != null && vendor.rating > 0 && (
              <span className="flex items-center gap-1 font-medium">
                <FaStar className="text-yellow-400 w-3 h-3" />
                {vendor.rating.toFixed(1)}
              </span>
            )}
            {vendor.reviewCount != null && vendor.reviewCount > 0 && (
              <span className="flex items-center gap-1" title="Reviews">
                <FaUsers className="w-3 h-3 text-emerald-300" />
                {vendor.reviewCount}
              </span>
            )}
            {vendor.eventCount != null && vendor.eventCount > 0 && (
              <span className="flex items-center gap-1 ml-auto" title="Events">
                <FaCalendarAlt className="w-3 h-3 text-emerald-300" />
                {vendor.eventCount}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default VendorCard;
