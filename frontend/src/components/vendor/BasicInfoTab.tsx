import React, { useState } from 'react';
import ImageUpload from '../common/ImageUpload';
import TipTapEditor from '../common/TipTapEditor';
import DOMPurify from 'isomorphic-dompurify';

interface Category {
  id: string;
  name: string;
}

interface BasicInfoTabProps {
  formData: {
    title: string;
    description: string;
    category: string;
    type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue';
    venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
    ageRangeMin: string;
    ageRangeMax: string;
    tags: string;
    featured: boolean;
    images: File[];
    imagePreviewUrls: string[];
  };
  categories: Category[];
  errors: Record<string, string>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImagesChange: (images: File[], previewUrls: string[]) => void;
  onRemoveImage: (index: number) => void;
}

const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  categories,
  errors,
  onInputChange,
  onCheckboxChange,
  onImagesChange,
  onRemoveImage,
}) => {
  const [descriptionTab, setDescriptionTab] = useState<'edit' | 'preview'>('edit');

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

        {/* Tabs for Edit/Preview */}
        <div className="flex border-b border-gray-200 mb-2">
          <button
            type="button"
            onClick={() => setDescriptionTab('edit')}
            className={`px-4 py-2 font-medium text-sm ${
              descriptionTab === 'edit'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDescriptionTab('preview')}
            className={`px-4 py-2 font-medium text-sm ${
              descriptionTab === 'preview'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Editor or Preview */}
        {descriptionTab === 'edit' ? (
          <TipTapEditor
            content={formData.description || ''}
            onChange={handleDescriptionChange}
            placeholder="Describe your event in detail... Use the toolbar to format text, add images, videos, and links. You can also insert custom HTML for Google Drive embeds."
          />
        ) : (
          <div
            className="min-h-[300px] p-4 border border-gray-300 rounded-md bg-gray-50 prose max-w-none"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(formData.description || '<p class="text-gray-400 italic">Event description preview will appear here...</p>', {
                ADD_ATTR: ['style', 'class'],
                ADD_TAGS: ['iframe'],
                ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height', 'id', 'frameborder', 'allow', 'allowfullscreen']
              })
            }}
          />
        )}

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
            <option value="Venue">Venue</option>
            <option value="Workshop">Workshop</option>
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

      {/* Age Range */}
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

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
          Tags <span className="text-gray-500">(comma separated)</span>
        </label>
        <input
          type="text"
          id="tags"
          name="tags"
          value={formData.tags}
          onChange={onInputChange}
          className={`w-full px-3 py-2 border ${errors.tags ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
          placeholder="e.g. kids, science, fun, educational"
        />
        {errors.tags && <p className="mt-1 text-sm text-red-500">{errors.tags}</p>}
      </div>

      {/* Event Images */}
      <ImageUpload
        images={formData.images}
        imagePreviewUrls={formData.imagePreviewUrls}
        onImagesChange={onImagesChange}
        onRemoveImage={onRemoveImage}
        error={errors.images}
        required={true}
      />
    </div>
  );
};

export default BasicInfoTab;
