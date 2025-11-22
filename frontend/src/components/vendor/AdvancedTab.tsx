import React from 'react';
import { MapPin, Globe, Shield } from 'lucide-react';

interface AdvancedTabProps {
  formData: {
    city: string;
    address: string;
    latitude: string;
    longitude: string;
    requirePhoneVerification?: boolean;
    seoMeta?: {
      title: string;
      description: string;
      keywords: string[];
    };
  };
  errors: Record<string, string>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onCheckboxChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AdvancedTab: React.FC<AdvancedTabProps> = ({
  formData,
  errors,
  onInputChange,
  onCheckboxChange,
}) => {
  return (
    <div className="space-y-8">
      {/* Location Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          <MapPin className="inline w-5 h-5 mr-2" />
          Location Details
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={onInputChange}
                className={`w-full px-3 py-2 border ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                placeholder="e.g. New York"
              />
              {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city}</p>}
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={onInputChange}
                className={`w-full px-3 py-2 border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                placeholder="Full address"
              />
              {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
                Latitude <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                id="latitude"
                name="latitude"
                value={formData.latitude}
                onChange={onInputChange}
                className={`w-full px-3 py-2 border ${errors.latitude ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                placeholder="e.g. 40.7128"
              />
              {errors.latitude && <p className="mt-1 text-sm text-red-500">{errors.latitude}</p>}
            </div>

            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
                Longitude <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                id="longitude"
                name="longitude"
                value={formData.longitude}
                onChange={onInputChange}
                className={`w-full px-3 py-2 border ${errors.longitude ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                placeholder="e.g. -74.0060"
              />
              {errors.longitude && <p className="mt-1 text-sm text-red-500">{errors.longitude}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* SEO Section */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          <Globe className="inline w-5 h-5 mr-2" />
          SEO & Meta Information
        </h3>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> SEO fields help your event rank better in search engines. If left empty, they'll be automatically generated from your event details.
            </p>
          </div>

          <div>
            <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700 mb-1">
              SEO Title <span className="text-gray-500">(optional, max 60 characters)</span>
            </label>
            <input
              type="text"
              id="seoTitle"
              name="seoTitle"
              value={formData.seoMeta?.title || ''}
              onChange={onInputChange}
              maxLength={60}
              className={`w-full px-3 py-2 border ${errors.seoTitle ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
              placeholder="Leave empty to auto-generate from event title"
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.seoMeta?.title?.length || 0}/60 characters
            </p>
            {errors.seoTitle && <p className="mt-1 text-sm text-red-500">{errors.seoTitle}</p>}
          </div>

          <div>
            <label htmlFor="seoDescription" className="block text-sm font-medium text-gray-700 mb-1">
              SEO Description <span className="text-gray-500">(optional, max 160 characters)</span>
            </label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              value={formData.seoMeta?.description || ''}
              onChange={onInputChange}
              maxLength={160}
              rows={3}
              className={`w-full px-3 py-2 border ${errors.seoDescription ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
              placeholder="Leave empty to auto-generate from event description"
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.seoMeta?.description?.length || 0}/160 characters
            </p>
            {errors.seoDescription && <p className="mt-1 text-sm text-red-500">{errors.seoDescription}</p>}
          </div>

          <div>
            <label htmlFor="seoKeywords" className="block text-sm font-medium text-gray-700 mb-1">
              SEO Keywords <span className="text-gray-500">(optional, comma separated)</span>
            </label>
            <input
              type="text"
              id="seoKeywords"
              name="seoKeywords"
              value={formData.seoMeta?.keywords?.join(', ') || ''}
              onChange={onInputChange}
              className={`w-full px-3 py-2 border ${errors.seoKeywords ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
              placeholder="e.g. kids activities, science workshop, Dubai events"
            />
            {errors.seoKeywords && <p className="mt-1 text-sm text-red-500">{errors.seoKeywords}</p>}
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          <Shield className="inline w-5 h-5 mr-2" />
          Security & Verification
        </h3>
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Phone verification adds an extra layer of security for bookings. When enabled, users must verify their phone number before they can book this event.
            </p>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="requirePhoneVerification"
                name="requirePhoneVerification"
                checked={formData.requirePhoneVerification || false}
                onChange={onCheckboxChange}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="requirePhoneVerification" className="text-sm font-medium text-gray-700">
                Require Phone Verification for Bookings
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Users will need to verify their phone number before they can book tickets for this event. This helps prevent fraud and ensures you can reach attendees if needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedTab;
