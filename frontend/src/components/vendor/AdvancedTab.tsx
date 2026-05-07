import React from 'react';
import { MapPin, Globe, Shield, HelpCircle, Trash2, Plus, Building2, Image } from 'lucide-react';
import EventGalleryEditor from '../common/EventGalleryEditor';
import { PastEventMemory } from '@/types/event';
import TagInput from '../common/TagInput';
import CountrySelect from '../forms/CountrySelect';
import CityAutocomplete from '../forms/CityAutocomplete';

interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

interface AdvancedTabProps {
  formData: {
    type?: string;
    city: string;
    address: string;
    latitude: string;
    longitude: string;
    country?: string;
    state?: string;
    zipCode?: string;
    facilities?: string[];
    amenities?: string[];
    requirePhoneVerification?: boolean;
    seoMeta?: {
      title: string;
      description: string;
      keywords: string[];
    };
  };
  venueType?: string;
  faqs: FaqEntry[];
  onFaqAdd: () => void;
  onFaqChange: (index: number, field: 'question' | 'answer', value: string) => void;
  onFaqRemove: (index: number) => void;
  onFacilitiesChange?: (facilities: string[]) => void;
  onAmenitiesChange?: (amenities: string[]) => void;
  onCountryChange?: (country: string) => void;
  errors: Record<string, string>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  eventId?: string;
}

const AdvancedTab: React.FC<AdvancedTabProps> = ({
  formData,
  venueType,
  faqs,
  onFaqAdd,
  onFaqChange,
  onFaqRemove,
  onFacilitiesChange,
  onAmenitiesChange,
  onCountryChange,
  errors,
  onInputChange,
  onCheckboxChange,
  eventId,
}) => {
  const isOnline = venueType === 'Online';
  return (
    <div className="space-y-8">
      {/* Location Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          <MapPin className="inline w-5 h-5 mr-2" />
          Location Details
        </h3>

        {isOnline && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              This is an online event. Physical location details are not required.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country <span className="text-gray-500">(optional)</span>
              </label>
              {onCountryChange ? (
                <CountrySelect
                  value={formData.country || ''}
                  onChange={onCountryChange}
                  error={errors.country}
                />
              ) : (
                <input
                  type="text"
                  name="country"
                  value={formData.country || ''}
                  onChange={onInputChange}
                  className={`w-full px-3 py-2 border ${errors.country ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                  placeholder="e.g. US"
                />
              )}
              {errors.country && !onCountryChange && (
                <p className="mt-1 text-sm text-red-500">{errors.country}</p>
              )}
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City {!isOnline && <span className="text-red-500">*</span>}
              </label>
              <CityAutocomplete
                value={formData.city}
                country={formData.country}
                onChange={(city) =>
                  onInputChange({
                    target: { name: 'city', value: city },
                  } as React.ChangeEvent<HTMLInputElement>)
                }
                required={!isOnline}
                error={errors.city}
              />
            </div>
          </div>

          {!isOnline && (
            <>
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
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State / Region <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state || ''}
                onChange={onInputChange}
                className={`w-full px-3 py-2 border ${errors.state ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                placeholder="e.g. New York"
              />
              {errors.state && <p className="mt-1 text-sm text-red-500">{errors.state}</p>}
            </div>

            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                Zip / Postal Code <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode || ''}
                onChange={onInputChange}
                className={`w-full px-3 py-2 border ${errors.zipCode ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                placeholder="e.g. 10001"
              />
              {errors.zipCode && <p className="mt-1 text-sm text-red-500">{errors.zipCode}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Venue Details — shown only for Venue type */}
      {formData.type === 'Venue' && (
        <div className="border-t pt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <Building2 className="inline w-5 h-5 mr-2" />
            Venue Details
          </h3>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                List the facilities and amenities available at your venue. These help visitors know what to expect.
              </p>
            </div>

            {onFacilitiesChange && (
              <TagInput
                tags={formData.facilities || []}
                onChange={onFacilitiesChange}
                maxTags={50}
                allowBulkAdd={true}
                placeholder="Add facility (e.g. Parking)"
                showCount={true}
                label="Facilities"
              />
            )}

            {onAmenitiesChange && (
              <TagInput
                tags={formData.amenities || []}
                onChange={onAmenitiesChange}
                maxTags={50}
                allowBulkAdd={true}
                placeholder="Add amenity (e.g. WiFi)"
                showCount={true}
                label="Amenities"
              />
            )}
          </div>
        </div>
      )}

      {/* FAQs Section */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          <HelpCircle className="inline w-5 h-5 mr-2" />
          Frequently Asked Questions
        </h3>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={faq.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">FAQ {index + 1}</span>
                <button
                  type="button"
                  onClick={() => onFaqRemove(index)}
                  className="text-red-500 hover:text-red-700 p-1 rounded"
                  aria-label="Remove FAQ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <input
                  type="text"
                  value={faq.question}
                  onChange={e => onFaqChange(index, 'question', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="What is the question?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                <textarea
                  value={faq.answer}
                  onChange={e => onFaqChange(index, 'answer', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Provide the answer..."
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={onFaqAdd}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add FAQ
          </button>
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

      {/* Past Event Memories Section */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          <Image className="inline w-5 h-5 mr-2" />
          Event Gallery
        </h3>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <EventGalleryEditor eventId={eventId} />
        </div>
      </div>
    </div>
  );
};

export default AdvancedTab;
