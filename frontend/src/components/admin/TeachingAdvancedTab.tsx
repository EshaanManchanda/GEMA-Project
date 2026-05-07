import React from 'react';
import { MapPin, Globe, HelpCircle, Plus, Trash2, BookOpen } from 'lucide-react';
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

interface TeachingAdvancedTabProps {
  teachingMode: string;  // To determine conditional fields
  formData: {
    country: string;
    city: string;
    address: string;
    latitude: string;
    longitude: string;
    meetingLink: string;
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

const TeachingAdvancedTab: React.FC<TeachingAdvancedTabProps> = ({
  teachingMode,
  formData,
  eventData,
  errors,
  onInputChange,
  onCountryChange,
  onFaqChange,
  onAddFaq,
  onRemoveFaq,
  onSeoChange,
//   imagePreviewUrl,
}) => {
  return (
    <div className="space-y-8">
      {/* Location Section - For Offline */}
      {teachingMode === 'Offline' && (
        <Card variant="elevated" className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center text-gray-900">
              <MapPin className="w-6 h-6 mr-3 text-primary-600" />
              Physical Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <CountrySelect
                  value={formData.country}
                  onChange={onCountryChange}
                  required={true}
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
                placeholder="Full address of the teaching location"
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
          </CardContent>
        </Card>
      )}

      {/* Online Meeting Link - For Online/Hybrid */}
      {(teachingMode === 'Online' || teachingMode === 'Hybrid') && (
        <Card variant="elevated" className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center text-gray-900">
              <Globe className="w-6 h-6 mr-3 text-primary-600" />
              Online Meeting Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label htmlFor="meetingLink" className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Link <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                id="meetingLink"
                name="meetingLink"
                value={formData.meetingLink}
                onChange={onInputChange}
                className={`w-full px-4 py-2 border ${errors.meetingLink ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                placeholder="https://zoom.us/... or https://meet.google.com/..."
              />
              {errors.meetingLink && <p className="mt-1 text-sm text-red-500">{errors.meetingLink}</p>}
              <p className="mt-2 text-xs text-gray-500">
                Provide the Zoom, Google Meet, or other video conferencing link for online sessions
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location for SEO - For Online/Hybrid */}
      {(teachingMode === 'Online' || teachingMode === 'Hybrid') && (
        <Card variant="elevated" className="shadow-xl border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center text-blue-900">
              <MapPin className="w-6 h-6 mr-3 text-blue-600" />
              Service Location (for SEO)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-blue-800">
              For online teaching events, specify the country and city you're primarily serving. This information will be used for SEO optimization and location-based discovery.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Country <span className="text-red-500">*</span>
                </label>
                <CountrySelect
                  value={formData.country}
                  onChange={onCountryChange}
                  required={true}
                  error={errors.country}
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  Service City <span className="text-red-500">*</span>
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
          </CardContent>
        </Card>
      )}
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
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-semibold rounded-lg hover:from-primary-600 hover:to-primary-800 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add FAQ
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.faqs.length > 0 ? (
            <div className="space-y-4">
              {formData.faqs.map((faq, index) => (
                <div
                  key={faq.id || index}
                  className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Question #{index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => onRemoveFaq(index)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label htmlFor={`faq_${index}_question`} className="block text-sm font-medium text-gray-700 mb-1">
                        Question <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id={`faq_${index}_question`}
                        value={faq.question}
                        onChange={(e) => onFaqChange(index, 'question', e.target.value)}
                        className={`w-full px-3 py-2 border ${
                          errors[`faq_${index}_question`]
                            ? 'border-red-500'
                            : 'border-gray-300'
                        } rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                        placeholder="e.g., What are the prerequisites?"
                      />
                      {errors[`faq_${index}_question`] && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors[`faq_${index}_question`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`faq_${index}_answer`} className="block text-sm font-medium text-gray-700 mb-1">
                        Answer <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id={`faq_${index}_answer`}
                        value={faq.answer}
                        onChange={(e) => onFaqChange(index, 'answer', e.target.value)}
                        rows={4}
                        className={`w-full px-3 py-2 border ${
                          errors[`faq_${index}_answer`]
                            ? 'border-red-500'
                            : 'border-gray-300'
                        } rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                        placeholder="Provide a detailed answer..."
                      />
                      {errors[`faq_${index}_answer`] && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors[`faq_${index}_answer`]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <HelpCircle className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 mb-3">No FAQs added yet</p>
              <button
                type="button"
                onClick={onAddFaq}
                className="text-primary-600 font-semibold hover:text-primary-700"
              >
                Add your first FAQ
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Section */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <BookOpen className="w-6 h-6 mr-3 text-primary-600" />
            SEO & Meta Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SEOEditor
            initialData={formData.seoMeta}
              onChange={onSeoChange}
              contentData={{
                title: eventData?.title || '',
                description: eventData?.description || '',
                category: eventData?.category,
                tags: eventData?.tags ? eventData.tags.split(',').map((t: string) => t.trim()) : [],
                type: 'teaching-event' as any
              }}
          />
        </CardContent>
      </Card>

      {/* Past Event Memories Section */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <Globe className="w-6 h-6 mr-3 text-primary-600" />
            Past Event Memories
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Showcase photos and feedback from previous events to build trust.
          </p>
        </CardHeader>
        <CardContent>
          <EventGalleryEditor eventId={eventData?._id} />
        </CardContent>
      </Card>
    </div>
  );
};

export default TeachingAdvancedTab;
