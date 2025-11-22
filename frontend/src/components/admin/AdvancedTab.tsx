import React from 'react';
import { MapPin, Globe, HelpCircle, Plus, Trash2 } from 'lucide-react';
import SEOEditor from '../seo/SEOEditor';

interface FAQ {
  id?: string;
  _id?: string;
  question: string;
  answer: string;
}

interface AdvancedTabProps {
  formData: {
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
  onFaqChange: (index: number, field: 'question' | 'answer', value: string) => void;
  onAddFaq: () => void;
  onRemoveFaq: (index: number) => void;
  onSeoChange: (seoData: {title: string; description: string; keywords: string[]}) => void;
  imagePreviewUrl?: string;
}

const AdvancedTab: React.FC<AdvancedTabProps> = ({
  formData,
  eventData,
  errors,
  onInputChange,
  onFaqChange,
  onAddFaq,
  onRemoveFaq,
  onSeoChange,
  imagePreviewUrl,
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Admin Note:</strong> SEO fields help the event rank better in search engines. These can be auto-generated from event details if left empty.
          </p>
        </div>

        <SEOEditor
          initialData={{
            title: formData.seoMeta.title,
            description: formData.seoMeta.description,
            keywords: formData.seoMeta.keywords
          }}
          contentData={{
            title: eventData?.title || '',
            description: eventData?.description || '',
            category: eventData?.category || '',
            location: formData.city,
            tags: eventData?.tags ? eventData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : [],
            type: 'event'
          }}
          onChange={onSeoChange}
          baseUrl={import.meta.env.VITE_APP_URL || 'https://gema-events.com'}
          path={`/events/${eventData?._id || 'new-event'}`}
          ogImage={imagePreviewUrl}
        />
      </div>

      {/* FAQs Section */}
      <div className="border-t pt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            <HelpCircle className="inline w-5 h-5 mr-2" />
            Frequently Asked Questions (FAQs)
          </h3>
          <button
            type="button"
            onClick={onAddFaq}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add FAQ
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700">
            Add common questions and answers about your event to help potential attendees make informed decisions.
          </p>
        </div>

        {formData.faqs.length === 0 ? (
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
          <div className="space-y-4">
            {formData.faqs.map((faq, index) => (
              <div
                key={faq.id || faq._id || index}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">FAQ #{index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => onRemoveFaq(index)}
                    className="text-red-600 hover:text-red-700 focus:outline-none"
                    title="Remove FAQ"
                  >
                    <Trash2 className="w-4 h-4" />
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
      </div>
    </div>
  );
};

export default AdvancedTab;
