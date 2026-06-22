import React, { Suspense, lazy } from 'react';
import TagInput from '../common/TagInput';

import MediaPickerModal from '../admin/media/MediaPickerModal';
import { MediaAsset } from '../../store/slices/mediaSlice';
import { Image as ImageIcon, Trash2 } from 'lucide-react';

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
    shortDescription?: string;
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
  isUploadingImage: boolean;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  imageFileRef: React.RefObject<HTMLInputElement>;
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
  isUploadingImage,
  onImageUpload,
  imageFileRef,
  bookingMethod,
  onBookingMethodChange
}) => {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState(false);

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
      <SectionCard>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Configuration</h3>
        <div className="flex flex-col space-y-4">
          <label className="text-sm font-medium text-gray-700">How would you like to handle bookings?</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`relative rounded-xl border p-5 cursor-pointer flex flex-col transition-all duration-200 ${bookingMethod === 'internal' ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
              onClick={() => onBookingMethodChange('internal')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">Kidrove Internal Booking</span>
                {bookingMethod === 'internal' ? (
                  <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <p className="text-sm text-gray-500">
                Use Kidrove's secure payment system and attendance tracking.
              </p>
            </div>

            <div
              className={`relative rounded-xl border p-5 cursor-pointer flex flex-col transition-all duration-200 ${bookingMethod === 'external' ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
              onClick={() => onBookingMethodChange('external')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">External Booking Link</span>
                {bookingMethod === 'external' ? (
                  <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <p className="text-sm text-gray-500">
                Redirect users to an external website or ticketing platform.
              </p>
            </div>
          </div>

          {bookingMethod === 'external' && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
              <FieldGroup label="External Booking Link" required hint="Note: When using an external link, registrations and payments will be handled outside of Kidrove.">
                <input
                  type="url"
                  id="externalBookingLink"
                  name="externalBookingLink"
                  value={formData.externalBookingLink || ''}
                  onChange={onInputChange}
                  className={`${inputCls} ${errors.externalBookingLink ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="https://your-website.com/booking/event-123"
                />
                {errors.externalBookingLink && <p className="mt-1 text-sm text-red-500">{errors.externalBookingLink}</p>}
              </FieldGroup>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Basic Information Card */}
      <SectionCard>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h3>
        <div className="space-y-6">
          {/* Event Title */}
          <FieldGroup label="Event Title" required>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={onInputChange}
              className={`${inputCls} ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter event title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </FieldGroup>

          {/* Description - Rich Text Editor */}
          <FieldGroup
            label="Description"
            required
            hint={
              <>
                💡 <strong>Tip:</strong> To embed Google Drive files, use the "Insert Custom HTML" button (📄 icon) in the toolbar.
                Get the embed code from Google Drive by clicking Share → Get embed code.
              </>
            }
          >
            <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
              <Suspense fallback={<TipTapEditorFallback />}>
                <TipTapEditor
                  content={formData.description || ''}
                  onChange={handleDescriptionChange}
                  placeholder="Describe your event in detail... Use the toolbar to format text, add images, videos, and links. You can also insert custom HTML for Google Drive embeds."
                />
              </Suspense>
            </div>
            {errors.description && <p className="mt-2 text-sm text-red-500">{errors.description}</p>}
          </FieldGroup>

          {/* Short Description */}
          <FieldGroup label="Short Description" required hint={`(shown in event cards) ${(formData.shortDescription || '').length}/500`}>
            <textarea
              id="shortDescription"
              name="shortDescription"
              rows={3}
              maxLength={500}
              value={formData.shortDescription || ''}
              onChange={onInputChange}
              placeholder="A brief summary of the event (max 500 characters)..."
              className={`${inputCls} resize-none ${errors.shortDescription ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.shortDescription && <p className="mt-1 text-sm text-red-500">{errors.shortDescription}</p>}
          </FieldGroup>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Category */}
            <FieldGroup label="Category" required>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={onInputChange}
                className={`${inputCls} ${errors.category ? 'border-red-500 focus:ring-red-500' : ''}`}
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
            </FieldGroup>

            {/* Event Type */}
            <FieldGroup label="Event Type" required>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={onInputChange}
                className={`${inputCls} ${errors.type ? 'border-red-500 focus:ring-red-500' : ''}`}
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
            </FieldGroup>
          </div>

          {/* Venue Type */}
          <FieldGroup label="Venue Type" required>
            <select
              id="venueType"
              name="venueType"
              value={formData.venueType}
              onChange={onInputChange}
              className={`${inputCls} ${errors.venueType ? 'border-red-500 focus:ring-red-500' : ''}`}
            >
              <option value="Indoor">Indoor</option>
              <option value="Outdoor">Outdoor</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
            {errors.venueType && <p className="mt-1 text-sm text-red-500">{errors.venueType}</p>}
          </FieldGroup>

          {/* Meeting Link & Password — shown only for Online events */}
          {formData.venueType === 'Online' && formData.type !== 'Venue' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FieldGroup label="Meeting Link" hint="(optional)">
                <input
                  type="url"
                  id="meetingLink"
                  name="meetingLink"
                  value={formData.meetingLink || ''}
                  onChange={onInputChange}
                  className={`${inputCls} ${errors.meetingLink ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="https://zoom.us/j/..."
                />
                {errors.meetingLink && <p className="mt-1 text-sm text-red-500">{errors.meetingLink}</p>}
              </FieldGroup>
              
              <FieldGroup label="Meeting Password" hint="(optional)">
                <input
                  type="text"
                  id="meetingPassword"
                  name="meetingPassword"
                  value={formData.meetingPassword || ''}
                  onChange={onInputChange}
                  className={inputCls}
                  placeholder="Enter meeting password if required"
                />
              </FieldGroup>
            </div>
          )}

          {/* Age Range */}
          {formData.type !== 'Venue' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FieldGroup label="Minimum Age" required>
                <input
                  type="number"
                  id="ageRangeMin"
                  name="ageRangeMin"
                  value={formData.ageRangeMin}
                  onChange={onInputChange}
                  min="0"
                  max="100"
                  className={`${inputCls} ${errors.ageRangeMin ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="e.g. 5"
                />
                {errors.ageRangeMin && <p className="mt-1 text-sm text-red-500">{errors.ageRangeMin}</p>}
              </FieldGroup>

              <FieldGroup label="Maximum Age" required>
                <input
                  type="number"
                  id="ageRangeMax"
                  name="ageRangeMax"
                  value={formData.ageRangeMax}
                  onChange={onInputChange}
                  min="0"
                  max="100"
                  className={`${inputCls} ${errors.ageRangeMax ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="e.g. 12"
                />
                {errors.ageRangeMax && <p className="mt-1 text-sm text-red-500">{errors.ageRangeMax}</p>}
              </FieldGroup>
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
        </div>
      </SectionCard>

      {/* Competition Details */}
      {(COMPETITION_TYPES as readonly string[]).includes(formData.type) && (
        <SectionCard>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Competition Details</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FieldGroup label="Competition Format" required>
                <select
                  id="competitionFormat"
                  name="competitionFormat"
                  value={formData.competitionFormat || ''}
                  onChange={onInputChange}
                  className={`${inputCls} ${errors.competitionFormat ? 'border-red-500 focus:ring-red-500' : ''}`}
                >
                  <option value="">Select format</option>
                  <option value="Individual">Individual</option>
                  <option value="Team">Team</option>
                </select>
                {errors.competitionFormat && <p className="mt-1 text-sm text-red-500">{errors.competitionFormat}</p>}
              </FieldGroup>

              {formData.competitionFormat === 'Team' && (
                <FieldGroup label="Team Size" hint="(members per team)">
                  <input
                    type="number"
                    id="teamSize"
                    name="teamSize"
                    value={formData.teamSize || ''}
                    onChange={onInputChange}
                    min="1"
                    className={`${inputCls} ${errors.teamSize ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="e.g. 4"
                  />
                  {errors.teamSize && <p className="mt-1 text-sm text-red-500">{errors.teamSize}</p>}
                </FieldGroup>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Learning Details */}
      {(LEARNING_TYPES as readonly string[]).includes(formData.type) && (
        <SectionCard>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{formData.type} Details</h3>
          <div className="space-y-4">
            <FieldGroup label="Skill Level">
              <select
                id="skillLevel"
                name="skillLevel"
                value={formData.skillLevel || ''}
                onChange={onInputChange}
                className={inputCls}
              >
                <option value="">Select level</option>
                <option value="All Levels">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </FieldGroup>

            <FieldGroup label="Prerequisites" hint="(optional)">
              <textarea
                id="prerequisites"
                name="prerequisites"
                value={formData.prerequisites || ''}
                onChange={onInputChange}
                rows={3}
                className={inputCls}
                placeholder="Any prior knowledge, skills, or materials participants should bring..."
              />
            </FieldGroup>
          </div>
        </SectionCard>
      )}

      {/* Event Images Section */}
      <SectionCard>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          <ImageIcon className="w-5 h-5 mr-2 text-green-600" />
          Event Images ({formData.imagePreviewUrls.length}/20)
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Select from media library or upload new images. First image is the cover.
        </p>
        <div>
          {/* Image Preview Grid */}
          {formData.imagePreviewUrls.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {formData.imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative w-24 h-24 rounded-xl overflow-hidden shadow-sm border border-gray-200 group">
                  <img
                    src={url}
                    alt={`Event image ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                  <div
                    className="h-full w-full bg-gray-50 items-center justify-center text-gray-400 text-[10px] text-center p-1"
                    style={{ display: 'none' }}
                  >
                    Unavailable
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  {index === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-1 text-center font-medium">
                      Cover
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-xl transition-colors text-sm font-medium shadow-sm"
              >
                <ImageIcon className="w-4 h-4" />
                Media Library
              </button>

              <input
                type="file"
                ref={imageFileRef}
                onChange={onImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => imageFileRef.current?.click()}
                disabled={isUploadingImage}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {isUploadingImage ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          </div>

          {errors.images && (
            <p className="mt-3 text-sm text-red-500">{errors.images}</p>
          )}
        </div>

        {/* Media Picker Modal */}
        <MediaPickerModal
          isOpen={isMediaPickerOpen}
          onClose={() => setIsMediaPickerOpen(false)}
          onSelect={(assets: MediaAsset[]) => {
            onImagesChange(assets, assets.map(a => a.url));
            setIsMediaPickerOpen(false);
          }}
          category="event"
          multiple={true}
          title="Select Event Images"
        />
      </SectionCard>

    </div>
  );
};

export default BasicInfoTab;
