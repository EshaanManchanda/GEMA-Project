import React from 'react';
import { MapPin, Globe, HelpCircle, Plus, Trash2 } from 'lucide-react';
import SEOEditor from '../seo/SEOEditor';
import CountrySelect from '../forms/CountrySelect';
import CityAutocomplete from '../forms/CityAutocomplete';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import EventGalleryEditor from '../common/EventGalleryEditor';

interface FAQ {
  id?: string;
  _id?: string;
  question: string;
  answer: string;
}

interface AdvancedTabProps {
  venueType: string;  // To determine conditional fields
  formData: {
    country: string;
    city: string;
    address: string;
    latitude: string;
    longitude: string;
    seoMeta: {
      title: string;
      description: string;
      keywords: string[];
    };
    faqs: FAQ[];
  };
  eventData?: {
    title?: string;
    description?: string;
    category?: string;
    tags?: string;
    _id?: string;
  };
  errors: Record<string, string>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onCountryChange: (country: string) => void;
  onFaqChange: (index: number, field: 'question' | 'answer', value: string) => void;
  onAddFaq: () => void;
  onRemoveFaq: (index: number) => void;
  onSeoChange: (seoData: {title: string; description: string; keywords: string[]}) => void;
  imagePreviewUrl?: string;
}

const AdvancedTab: React.FC<AdvancedTabProps> = ({
  venueType,
  formData,
  eventData,
  errors,
  onInputChange,
  onCountryChange,
  onFaqChange,
  onAddFaq,
  onRemoveFaq,
  onSeoChange,
  imagePreviewUrl,
}) => {
  return (
    <div className="space-y-8">
      {/* Location Section */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <MapPin className="w-6 h-6 mr-3 text-primary-600" />
            Location Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Country {venueType !== 'Online' && <span className="text-red-500">*</span>}
              </label>
              <CountrySelect
                value={formData.country}
                onChange={onCountryChange}
                required={venueType !== 'Online'}
                error={errors.country}
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <CityAutocomplete
                value={formData.city}
                country={formData.country}
                onChange={(city) => onInputChange({ target: { name: 'city', value: city } } as any)}
                required={true}
                error={errors.city}
              />
            </div>
          </div>

          {/* Address and Coordinates - Only for non-Online events */}
          {venueType !== 'Online' && (
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

          {/* Info note for Online events */}
          {venueType === 'Online' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Globe className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Physical location not required for online events. City and country help with event discoverability and filtering.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Section */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <Globe className="w-6 h-6 mr-3 text-primary-600" />
            SEO & Meta Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Admin Note:</strong> SEO fields help the event rank better in search engines. These can be auto-generated from event details if left empty.
            </p>
          </div>

          <SEOEditor
          initialData={{
            title: formData.seoMeta?.title ?? '',
            description: formData.seoMeta?.description ?? '',
            keywords: formData.seoMeta?.keywords ?? []
          }}
          contentData={{
            title: eventData?.title || '',
            description: eventData?.description || '',
            category: eventData?.category || '',
            location: formData.city,
            tags: Array.isArray(eventData?.tags) ? eventData.tags : [],
            type: 'event'
          }}
          onChange={onSeoChange}
          baseUrl={import.meta.env.VITE_APP_URL || 'https://gema-events.com'}
          path={`/events/${eventData?._id || 'new-event'}`}
          ogImage={imagePreviewUrl}
        />
        </CardContent>
      </Card>

      {/* FAQs Section */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center text-gray-900">
              <HelpCircle className="w-6 h-6 mr-3 text-primary-600" />
              Frequently Asked Questions
            </CardTitle>
            <button
              type="button"
              onClick={onAddFaq}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-800 hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add FAQ
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Add common questions and answers about your event to help potential attendees make informed decisions.
          </p>
        </CardHeader>
        <CardContent>

        {(formData.faqs || []).length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-1">No FAQs added yet</h4>
            <p className="text-sm text-gray-500 mb-4">
              Add frequently asked questions to help attendees understand your event better
            </p>
            <button
              type="button"
              onClick={onAddFaq}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First FAQ
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {(formData.faqs || []).map((faq, index) => (
              <div
                key={faq.id || faq._id || index}
                className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">FAQ #{index + 1}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFaq(index)}
                    className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200"
                    title="Remove FAQ"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => onFaqChange(index, 'question', e.target.value)}
                      className={`w-full px-3 py-2 border ${
                        errors[`faq_${index}_question`] ? 'border-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                      placeholder="e.g. What should I bring to the event?"
                    />
                    {errors[`faq_${index}_question`] && (
                      <p className="mt-1 text-sm text-red-500">{errors[`faq_${index}_question`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Answer <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) => onFaqChange(index, 'answer', e.target.value)}
                      rows={3}
                      className={`w-full px-3 py-2 border ${
                        errors[`faq_${index}_answer`] ? 'border-red-500' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                      placeholder="Provide a clear and helpful answer..."
                    />
                    {errors[`faq_${index}_answer`] && (
                      <p className="mt-1 text-sm text-red-500">{errors[`faq_${index}_answer`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </CardContent>
      </Card>

      {/* Past Event Memories Section */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <Globe className="w-6 h-6 mr-3 text-primary-600" />
            Event Gallery
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Showcase photos from the event to build trust.
          </p>
        </CardHeader>
        <CardContent>
          <EventGalleryEditor eventId={eventData?._id} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedTab;
