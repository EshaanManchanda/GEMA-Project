import React from 'react';
import ImageUpload from '../common/ImageUpload';

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

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={onInputChange}
          rows={5}
          className={`w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
          placeholder="Describe your event in detail"
        ></textarea>
        {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
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
