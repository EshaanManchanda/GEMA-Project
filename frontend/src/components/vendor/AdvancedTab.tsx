import React from 'react';
import { MapPin, Globe, Shield, HelpCircle, Trash2, Plus, Building2, Image } from 'lucide-react';
import EventGalleryEditor from '../common/EventGalleryEditor';
import TagInput from '../common/TagInput';
import CountrySelect from '../forms/CountrySelect';
import CityAutocomplete from '../forms/CityAutocomplete';
import SEOEditor from '../seo/SEOEditor';

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${className}`}>
    {children}
  </div>
);

const FieldGroup: React.FC<{ label: string; hint?: React.ReactNode; required?: boolean; children: React.ReactNode; }> = ({ label, hint, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && <div className="text-xs text-gray-400 mt-1.5">{hint}</div>}
  </div>
);

const inputCls = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400';

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
  onCheckboxChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  eventId?: string;
  onSeoChange?: (seoData: { title: string; description: string; keywords: string[] }) => void;
  eventData?: any;
  imagePreviewUrl?: string;
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
  onSeoChange,
  eventData,
  imagePreviewUrl,
}) => {
  const isOnline = venueType === 'Online';
  return (
    <div className="space-y-6">
      {/* Location Section */}
      <SectionCard>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-blue-500" />
          Location Details
        </h3>

        {isOnline ? (
          <div className="mb-6 bg-blue-50/50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              This is an online event. Physical location details are not required.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FieldGroup label="Country" hint="(optional)">
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
                    className={`${inputCls} ${errors.country ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="e.g. US"
                  />
                )}
                {errors.country && !onCountryChange && (
                  <p className="mt-1 text-sm text-red-500">{errors.country}</p>
                )}
              </FieldGroup>

              <FieldGroup label="City" required>
                <CityAutocomplete
                  value={formData.city}
                  country={formData.country}
                  onChange={(city) =>
                    onInputChange({
                      target: { name: 'city', value: city },
                    } as React.ChangeEvent<HTMLInputElement>)
                  }
                  required
                  error={errors.city}
                />
              </FieldGroup>
          </div>

          <FieldGroup label="Address" required>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={onInputChange}
              className={`${inputCls} ${errors.address ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Full address"
            />
            {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
          </FieldGroup>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FieldGroup label="Latitude" hint="(optional)">
              <input
                type="text"
                id="latitude"
                name="latitude"
                value={formData.latitude}
                onChange={onInputChange}
                className={`${inputCls} ${errors.latitude ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="e.g. 40.7128"
              />
              {errors.latitude && <p className="mt-1 text-sm text-red-500">{errors.latitude}</p>}
            </FieldGroup>

            <FieldGroup label="Longitude" hint="(optional)">
              <input
                type="text"
                id="longitude"
                name="longitude"
                value={formData.longitude}
                onChange={onInputChange}
                className={`${inputCls} ${errors.longitude ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="e.g. -74.0060"
              />
              {errors.longitude && <p className="mt-1 text-sm text-red-500">{errors.longitude}</p>}
            </FieldGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FieldGroup label="State / Region" hint="(optional)">
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state || ''}
                onChange={onInputChange}
                className={`${inputCls} ${errors.state ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="e.g. New York"
              />
              {errors.state && <p className="mt-1 text-sm text-red-500">{errors.state}</p>}
            </FieldGroup>

            <FieldGroup label="Zip / Postal Code" hint="(optional)">
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode || ''}
                onChange={onInputChange}
                className={`${inputCls} ${errors.zipCode ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="e.g. 10001"
              />
              {errors.zipCode && <p className="mt-1 text-sm text-red-500">{errors.zipCode}</p>}
            </FieldGroup>
          </div>
        </div>
        )}
      </SectionCard>

      {/* Venue Details */}
      {formData.type === 'Venue' && (
        <SectionCard>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-blue-500" />
            Venue Details
          </h3>
          <div className="space-y-6">
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
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
        </SectionCard>
      )}

      {/* FAQs Section */}
      <SectionCard>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <HelpCircle className="w-5 h-5 mr-2 text-blue-500" />
          Frequently Asked Questions
        </h3>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={faq.id} className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">FAQ {index + 1}</span>
                <button
                  type="button"
                  onClick={() => onFaqRemove(index)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Remove FAQ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <FieldGroup label="Question">
                <input
                  type="text"
                  value={faq.question}
                  onChange={e => onFaqChange(index, 'question', e.target.value)}
                  className={inputCls}
                  placeholder="What is the question?"
                />
              </FieldGroup>
              <FieldGroup label="Answer">
                <textarea
                  value={faq.answer}
                  onChange={e => onFaqChange(index, 'answer', e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="Provide the answer..."
                />
              </FieldGroup>
            </div>
          ))}
          <button
            type="button"
            onClick={onFaqAdd}
            className="inline-flex items-center px-5 py-2.5 bg-white border border-gray-200 shadow-sm text-sm font-semibold rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add FAQ
          </button>
        </div>
      </SectionCard>

      {/* SEO Section */}
      <SectionCard>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-blue-500" />
          SEO & Meta Information
        </h3>
        <div className="space-y-6">
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> SEO fields help your event rank better in search engines. If left empty, they'll be automatically generated from your event details.
            </p>
          </div>

          {onSeoChange ? (
            <SEOEditor
              initialData={{
                title: formData.seoMeta?.title ?? '',
                description: formData.seoMeta?.description ?? '',
                keywords: formData.seoMeta?.keywords ?? []
              }}
              contentData={{
                title: eventData?.title || formData.seoMeta?.title || '',
                description: eventData?.description || formData.seoMeta?.description || '',
                category: eventData?.category || '',
                location: formData.city,
                tags: Array.isArray(eventData?.tags) ? eventData.tags : [],
                type: 'event'
              }}
              onChange={onSeoChange}
              baseUrl={import.meta.env.VITE_APP_URL || 'https://gema-events.com'}
              path={`/events/${eventData?._id || eventId || 'new-event'}`}
              ogImage={imagePreviewUrl}
            />
          ) : null}
        </div>
      </SectionCard>

      {/* Security Section */}
      <SectionCard>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-blue-500" />
          Security & Verification
        </h3>
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Phone verification adds an extra layer of security for bookings. When enabled, users must verify their phone number before they can book this event.
            </p>
          </div>

          <label className="flex items-start cursor-pointer group">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="requirePhoneVerification"
                name="requirePhoneVerification"
                checked={formData.requirePhoneVerification || false}
                onChange={onCheckboxChange}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer transition-colors"
              />
            </div>
            <div className="ml-3">
              <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                Require Phone Verification for Bookings
              </span>
              <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                Users will need to verify their phone number before they can book tickets for this event. This helps prevent fraud and ensures you can reach attendees if needed.
              </p>
            </div>
          </label>
        </div>
      </SectionCard>

      {/* Past Event Memories Section */}
      <SectionCard>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Image className="w-5 h-5 mr-2 text-blue-500" />
          Event Gallery
        </h3>
        <div className="bg-gray-50/50 border border-gray-200 rounded-2xl p-6">
          <EventGalleryEditor eventId={eventId} />
        </div>
      </SectionCard>
    </div>
  );
};

export default AdvancedTab;
