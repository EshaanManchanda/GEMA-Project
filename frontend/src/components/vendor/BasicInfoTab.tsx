import React, { Suspense, lazy } from 'react';
import TagInput from '../common/TagInput';

import MediaPickerModal from '../admin/media/MediaPickerModal';
import { MediaAsset } from '../../store/slices/mediaSlice';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

// Lazy load TipTapEditor (~200KB) - only loaded when editing description
const TipTapEditor = lazy(() => import('../common/TipTapEditor'));
const TipTapEditorFallback = () => (
  <div className="border border-gray-300 rounded-lg p-4 min-h-[300px] bg-gray-50 animate-pulse">
    <div className="h-10 bg-gray-200 rounded mb-4" />
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

interface Category {
  id: string;
  name: string;
}

const COMPETITION_TYPES = ['Olympiad', 'Championship', 'Competition'] as const;
const LEARNING_TYPES = ['Course', 'Workshop', 'Class', 'Bootcamp', 'Masterclass'] as const;

interface BasicInfoTabProps {
  formData: {
    title: string;
    description: string;
    category: string;
    type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue' | 'Workshop' | 'Class' | 'Bootcamp' | 'Masterclass';
    venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
    ageRangeMin: string;
    ageRangeMax: string;
    tags: string[];
    featured: boolean;
    imagePreviewUrls: string[];
    meetingLink?: string;
    competitionFormat?: string;
    teamSize?: string;
    skillLevel?: string;
    prerequisites?: string;
    externalBookingLink?: string;
  };
  categories: Category[];
  errors: Record<string, string>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

  onImagesChange: (assets: MediaAsset[], previewUrls: string[]) => void;
  onRemoveImage: (index: number) => void;
  onTagsChange: (tags: string[]) => void;
  showMediaPicker: boolean;
  onOpenMediaPicker: () => void;
  onCloseMediaPicker: () => void;
  bookingMethod: 'internal' | 'external';
  onBookingMethodChange: (method: 'internal' | 'external') => void;
}

const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  categories,
  errors,
  onInputChange,

  onImagesChange,
  onRemoveImage,
  onTagsChange,
  showMediaPicker,
  onOpenMediaPicker,
  onCloseMediaPicker,
  bookingMethod,
  onBookingMethodChange
}) => {
  // Handle description change from TipTapEditor
  const handleDescriptionChange = (content: string) => {
    const syntheticEvent = {
      target: {
        name: 'description',
        value: content
      }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    onInputChange(syntheticEvent);
  };

  return (
    <div className="space-y-6">
      {/* Booking Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-3">
            <label className="text-sm font-medium text-gray-700">How would you like to handle bookings?</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`relative rounded-lg border p-4 cursor-pointer flex flex-col hover:border-blue-500 transition-colors ${bookingMethod === 'internal' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200'}`}
                onClick={() => onBookingMethodChange('internal')}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">Kidrove Internal Booking</span>
                  {bookingMethod === 'internal' && (
                    <div className="h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                  {bookingMethod !== 'internal' && (
                    <div className="h-4 w-4 rounded-full border border-gray-300" />
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Use Kidrove's secure payment system and attendance tracking.
                </p>
              </div>

              <div
                className={`relative rounded-lg border p-4 cursor-pointer flex flex-col hover:border-blue-500 transition-colors ${bookingMethod === 'external' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200'}`}
                onClick={() => onBookingMethodChange('external')}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">External Booking Link</span>
                  {bookingMethod === 'external' && (
                    <div className="h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                  {bookingMethod !== 'external' && (
                    <div className="h-4 w-4 rounded-full border border-gray-300" />
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Redirect users to an external website or ticketing platform.
                </p>
              </div>
            </div>

            {bookingMethod === 'external' && (
              <div className="mt-4 space-y-4 pl-1 border-l-4 border-blue-300 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label htmlFor="externalBookingLink" className="block text-sm font-medium text-gray-700 mb-1">
                    External Booking Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    id="externalBookingLink"
                    name="externalBookingLink"
                    value={formData.externalBookingLink || ''}
                    onChange={onInputChange}
                    className={`w-full px-3 py-2 border ${errors.externalBookingLink ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    placeholder="https://your-website.com/booking/event-123"
                  />
                  {errors.externalBookingLink && <p className="mt-1 text-sm text-red-500">{errors.externalBookingLink}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Note: When using an external link, registrations and payments will be handled outside of Kidrove.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Basic Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={onInputChange}
              className={`w-full px-3 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
              placeholder="Enter event title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Description - Rich Text Editor */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>

            <Suspense fallback={<TipTapEditorFallback />}>
              <TipTapEditor
                content={formData.description || ''}
                onChange={handleDescriptionChange}
                placeholder="Describe your event in detail... Use the toolbar to format text, add images, videos, and links. You can also insert custom HTML for Google Drive embeds."
              />
            </Suspense>

            {errors.description && <p className="mt-2 text-sm text-red-500">{errors.description}</p>}

            {/* Helper text for Google Drive embeds */}
            <p className="mt-2 text-xs text-gray-500">
              💡 <strong>Tip:</strong> To embed Google Drive files, use the "Insert Custom HTML" button (📄 icon) in the toolbar.
              Get the embed code from Google Drive by clicking Share → Get embed code.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={onInputChange}
                className={`w-full px-3 py-2 border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
            </div>

            {/* Event Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Event Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={onInputChange}
                className={`w-full px-3 py-2 border ${errors.type ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
              >
                <option value="Olympiad">Olympiad</option>
                <option value="Championship">Championship</option>
                <option value="Competition">Competition</option>
                <option value="Event">Event</option>
                <option value="Course">Course</option>
                <option value="Workshop">Workshop</option>
                <option value="Class">Class</option>
                <option value="Bootcamp">Bootcamp</option>
                <option value="Masterclass">Masterclass</option>
                <option value="Venue">Venue</option>
              </select>
              {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
            </div>
          </div>

          {/* Venue Type */}
          <div>
            <label htmlFor="venueType" className="block text-sm font-medium text-gray-700 mb-1">
              Venue Type <span className="text-red-500">*</span>
            </label>
            <select
              id="venueType"
              name="venueType"
              value={formData.venueType}
              onChange={onInputChange}
              className={`w-full px-3 py-2 border ${errors.venueType ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            >
              <option value="Indoor">Indoor</option>
              <option value="Outdoor">Outdoor</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
            {errors.venueType && <p className="mt-1 text-sm text-red-500">{errors.venueType}</p>}
          </div>

          {/* Meeting Link — shown only for Online events (not for Venue type, which is always physical) */}
          {formData.venueType === 'Online' && formData.type !== 'Venue' && (
            <div>
              <label htmlFor="meetingLink" className="block text-sm font-medium text-gray-700 mb-1">
                Meeting Link <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="url"
                id="meetingLink"
                name="meetingLink"
                value={formData.meetingLink || ''}
                onChange={onInputChange}
                className={`w-full px-3 py-2 border ${errors.meetingLink ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                placeholder="https://zoom.us/j/..."
              />
              {errors.meetingLink && <p className="mt-1 text-sm text-red-500">{errors.meetingLink}</p>}
            </div>
          )}

          {/* Age Range — hidden for Venue type (venues don't have age requirements) */}
          {formData.type !== 'Venue' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="ageRangeMin" className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="ageRangeMin"
                  name="ageRangeMin"
                  value={formData.ageRangeMin}
                  onChange={onInputChange}
                  min="0"
                  max="100"
                  className={`w-full px-3 py-2 border ${errors.ageRangeMin ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                  placeholder="e.g. 5"
                />
                {errors.ageRangeMin && <p className="mt-1 text-sm text-red-500">{errors.ageRangeMin}</p>}
              </div>

              <div>
                <label htmlFor="ageRangeMax" className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="ageRangeMax"
                  name="ageRangeMax"
                  value={formData.ageRangeMax}
                  onChange={onInputChange}
                  min="0"
                  max="100"
                  className={`w-full px-3 py-2 border ${errors.ageRangeMax ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                  placeholder="e.g. 12"
                />
                {errors.ageRangeMax && <p className="mt-1 text-sm text-red-500">{errors.ageRangeMax}</p>}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <TagInput
              tags={formData.tags}
              onChange={onTagsChange}
              maxTags={20}
              allowBulkAdd={true}
              placeholder="Add tag"
              showCount={true}
              label="Tags"
              error={errors.tags}
            />
          </div>
        </CardContent>
      </Card>

      {/* Competition Details — Olympiad, Championship, Competition */}
      {(COMPETITION_TYPES as readonly string[]).includes(formData.type) && (
        <Card>
          <CardHeader>
            <CardTitle>Competition Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="competitionFormat" className="block text-sm font-medium text-gray-700 mb-1">
                  Competition Format <span className="text-red-500">*</span>
                </label>
                <select
                  id="competitionFormat"
                  name="competitionFormat"
                  value={formData.competitionFormat || ''}
                  onChange={onInputChange}
                  className={`w-full px-3 py-2 border ${errors.competitionFormat ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                >
                  <option value="">Select format</option>
                  <option value="Individual">Individual</option>
                  <option value="Team">Team</option>
                </select>
                {errors.competitionFormat && <p className="mt-1 text-sm text-red-500">{errors.competitionFormat}</p>}
              </div>

              {formData.competitionFormat === 'Team' && (
                <div>
                  <label htmlFor="teamSize" className="block text-sm font-medium text-gray-700 mb-1">
                    Team Size <span className="text-gray-500">(members per team)</span>
                  </label>
                  <input
                    type="number"
                    id="teamSize"
                    name="teamSize"
                    value={formData.teamSize || ''}
                    onChange={onInputChange}
                    min="1"
                    className={`w-full px-3 py-2 border ${errors.teamSize ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    placeholder="e.g. 4"
                  />
                  {errors.teamSize && <p className="mt-1 text-sm text-red-500">{errors.teamSize}</p>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Details — Course, Workshop */}
      {(LEARNING_TYPES as readonly string[]).includes(formData.type) && (
        <Card>
          <CardHeader>
            <CardTitle>{formData.type} Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="skillLevel" className="block text-sm font-medium text-gray-700 mb-1">
                Skill Level
              </label>
              <select
                id="skillLevel"
                name="skillLevel"
                value={formData.skillLevel || ''}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="">Select level</option>
                <option value="All Levels">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label htmlFor="prerequisites" className="block text-sm font-medium text-gray-700 mb-1">
                Prerequisites <span className="text-gray-500">(optional)</span>
              </label>
              <textarea
                id="prerequisites"
                name="prerequisites"
                value={formData.prerequisites || ''}
                onChange={onInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Any prior knowledge, skills, or materials participants should bring..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Images Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ImageIcon className="w-5 h-5 mr-2" />
            Event Images ({formData.imagePreviewUrls.length}/20)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            {/* Image Preview Grid */}
            {formData.imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-6">
                {formData.imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
                      <img
                        src={url}
                        alt={`Event image ${index + 1}`}
                        className="h-40 w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                      <div
                        className="h-40 w-full bg-gray-100 items-center justify-center text-gray-400 text-xs text-center p-2"
                        style={{ display: 'none' }}
                      >
                        Image unavailable
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-2 font-medium">
                        Image {index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onOpenMediaPicker}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-800 hover:shadow-xl transition-all duration-200"
            >
              <ImageIcon className="w-5 h-5 mr-2" />
              {formData.imagePreviewUrls.length > 0 ? 'Add More Images' : 'Select Images'}
            </button>

            {errors.images && (
              <p className="mt-2 text-sm text-red-500">{errors.images}</p>
            )}
            <p className="mt-3 text-xs text-gray-500">
              Upload high-quality images to showcase your event. First image will be the featured image.
            </p>
          </div>
        </CardContent>
      </Card>

      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={onCloseMediaPicker}
        onSelect={(assets) => {
          onImagesChange(assets, assets.map(a => a.url));
          onCloseMediaPicker();
        }}
        category="event"
        folder="events"
        multiple={true}
        title="Select Event Images"
      />
    </div >
  );
};

export default BasicInfoTab;
