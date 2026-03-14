import React from 'react';
import TipTapEditor from '../common/TipTapEditor';
import TagInput from '../common/TagInput';
import MediaPickerModal from '@/components/admin/media/MediaPickerModal';
import { MediaAsset } from '@/store/slices/mediaSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Shield, FileText, Hash, Image as ImageIcon, X } from 'lucide-react';

interface Teacher {
  _id: string;
  fullName: string;
  email: string;
}

interface Category {
  id: string;
  name: string;
}

interface TeachingBasicInfoTabProps {
  formData: {
    title: string;
    description: string;
    customCSS: string;
    category: string;
    type: 'Class' | 'Course' | 'Workshop' | 'Bootcamp' | 'Masterclass';
    teachingMode: 'Online' | 'Offline' | 'Hybrid';
    ageRangeMin: string;
    ageRangeMax: string;
    tags: string[];
    images: string[];  // MediaAsset IDs
    imagePreviewUrls: string[];
    // Teaching event specific
    teacherId: string;
    skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
    prerequisites?: string;
    duration?: string;
    // Admin-specific fields
    isApproved: boolean;
    isFeatured: boolean;
    requirePhoneVerification: boolean;
    status: 'draft' | 'published' | 'archived' | 'pending' | 'rejected';
    isActive: boolean;
    // New fields
    slug: string;
    isAffiliateTeachingEvent: boolean;
    externalBookingLink: string;
    cancellationStatus: 'active' | 'cancelled';
  };
  categories: Category[];
  teachers: Teacher[];
  errors: Record<string, string>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImagesChange: (assets: MediaAsset[]) => void;
  onRemoveImage: (index: number) => void;
  onTagsChange: (tags: string[]) => void;
  onCustomCSSChange: (css: string) => void;
  showMediaPicker: boolean;
  onOpenMediaPicker: () => void;
  onCloseMediaPicker: () => void;
  selectedImageAssets: MediaAsset[];
}

const TeachingBasicInfoTab: React.FC<TeachingBasicInfoTabProps> = ({
  formData,
  categories,
  teachers,
  errors,
  onInputChange,
  onCheckboxChange,
  onImagesChange,
  onRemoveImage,
  onTagsChange,
  //   onCustomCSSChange,
  showMediaPicker,
  onOpenMediaPicker,
  onCloseMediaPicker,
  selectedImageAssets: _selectedImageAssets,
}) => {

  return (
    <div className="space-y-8">
      {/* Admin Controls Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-blue-900 flex items-center">
            <Shield className="w-6 h-6 mr-3 text-blue-600" />
            Admin Controls
            <span className="ml-auto text-xs bg-blue-100 px-3 py-1 rounded-full">Admin Only</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isApproved"
                checked={formData.isApproved}
                onChange={onCheckboxChange}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">Approved</span>
            </label>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={onCheckboxChange}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">Featured Course</span>
            </label>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={onCheckboxChange}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">Active</span>
            </label>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="requirePhoneVerification"
                checked={formData.requirePhoneVerification}
                onChange={onCheckboxChange}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">Require Phone Verification</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={onInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending Review</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label htmlFor="cancellationStatus" className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Status
              </label>
              <select
                id="cancellationStatus"
                name="cancellationStatus"
                value={formData.cancellationStatus}
                onChange={onInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isAffiliateTeachingEvent"
                checked={formData.isAffiliateTeachingEvent}
                onChange={onCheckboxChange}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">Affiliate Teaching Event</span>
            </label>
            <p className="mt-1 ml-8 text-xs text-gray-500">Enable if this event is managed externally and bookings happen on a third-party site.</p>
          </div>

          {formData.isAffiliateTeachingEvent && (
            <div className="mt-4">
              <label htmlFor="externalBookingLink" className="block text-sm font-medium text-gray-700 mb-2">
                External Booking Link <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                id="externalBookingLink"
                name="externalBookingLink"
                value={formData.externalBookingLink}
                onChange={onInputChange}
                className={`w-full px-4 py-2 border ${errors.externalBookingLink ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                placeholder="https://external-site.com/book"
              />
              {errors.externalBookingLink && <p className="mt-1 text-sm text-red-500">{errors.externalBookingLink}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Title and Category */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <FileText className="w-6 h-6 mr-3 text-primary-600" />
            Course Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Course Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={onInputChange}
              className={`w-full px-4 py-3 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-medium`}
              placeholder="e.g., Advanced React Mastery"
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
              URL Slug
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={onInputChange}
              className={`w-full px-4 py-3 border ${errors.slug ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              placeholder="auto-generated-from-title"
            />
            <p className="mt-1 text-xs text-gray-500">Auto-generated from title if left empty. Used in the event URL.</p>
            {errors.slug && <p className="mt-1 text-sm text-red-500">{errors.slug}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={onInputChange}
                className={`w-full px-4 py-3 border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Teaching Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={onInputChange}
                className={`w-full px-4 py-3 border ${errors.type ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              >
                <option value="Class">Class</option>
                <option value="Course">Course</option>
                <option value="Workshop">Workshop</option>
                <option value="Bootcamp">Bootcamp</option>
                <option value="Masterclass">Masterclass</option>
              </select>
              {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
            </div>

            <div>
              <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-2">
                Assign Teacher <span className="text-red-500">*</span>
              </label>
              <select
                id="teacherId"
                name="teacherId"
                value={formData.teacherId}
                onChange={onInputChange}
                className={`w-full px-4 py-3 border ${errors.teacherId ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              >
                <option value="">Select a teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.fullName} ({teacher.email})
                  </option>
                ))}
              </select>
              {errors.teacherId && <p className="mt-1 text-sm text-red-500">{errors.teacherId}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="teachingMode" className="block text-sm font-medium text-gray-700 mb-2">
                Teaching Mode <span className="text-red-500">*</span>
              </label>
              <select
                id="teachingMode"
                name="teachingMode"
                value={formData.teachingMode}
                onChange={onInputChange}
                className={`w-full px-4 py-3 border ${errors.teachingMode ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
              {errors.teachingMode && <p className="mt-1 text-sm text-red-500">{errors.teachingMode}</p>}
            </div>

            <div>
              <label htmlFor="skillLevel" className="block text-sm font-medium text-gray-700 mb-2">
                Skill Level <span className="text-red-500">*</span>
              </label>
              <select
                id="skillLevel"
                name="skillLevel"
                value={formData.skillLevel}
                onChange={onInputChange}
                className={`w-full px-4 py-3 border ${errors.skillLevel ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="All Levels">All Levels</option>
              </select>
              {errors.skillLevel && <p className="mt-1 text-sm text-red-500">{errors.skillLevel}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Duration <span className="text-gray-500">(e.g., 10 weeks)</span>
              </label>
              <input
                type="text"
                id="duration"
                name="duration"
                value={formData.duration || ''}
                onChange={onInputChange}
                className={`w-full px-4 py-3 border ${errors.duration ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                placeholder="e.g., 10 weeks"
              />
              {errors.duration && <p className="mt-1 text-sm text-red-500">{errors.duration}</p>}
            </div>

            <div>
              <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-2">
                Instructor <span className="text-red-500">*</span>
              </label>
              <select
                id="teacherId"
                name="teacherId"
                value={formData.teacherId}
                onChange={onInputChange}
                className={`w-full px-4 py-3 border ${errors.teacherId ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              >
                <option value="">Select an instructor</option>
                {teachers.map(teacher => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.fullName} ({teacher.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Admin assigns the owner for this teaching event; bookings and payouts tie to this teacher.</p>
              {errors.teacherId && <p className="mt-1 text-sm text-red-500">{errors.teacherId}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <FileText className="w-6 h-6 mr-3 text-primary-600" />
            Course Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <TipTapEditor
              content={formData.description}
              onChange={(html) =>
                onInputChange({
                  target: { name: 'description', value: html }
                } as any)
              }
              placeholder="Write a compelling course description..."
              editable={true}
              mediaCategory="event"
              mediaFolder="teaching-events"
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Prerequisites and Additional Info */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <Hash className="w-6 h-6 mr-3 text-primary-600" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label htmlFor="prerequisites" className="block text-sm font-medium text-gray-700 mb-2">
              Prerequisites <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              id="prerequisites"
              name="prerequisites"
              value={formData.prerequisites || ''}
              onChange={onInputChange}
              rows={4}
              className={`w-full px-4 py-3 border ${errors.prerequisites ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
              placeholder="List any prerequisites for this course..."
            />
            {errors.prerequisites && <p className="mt-1 text-sm text-red-500">{errors.prerequisites}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="ageRangeMin" className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="ageRangeMin"
                name="ageRangeMin"
                value={formData.ageRangeMin}
                onChange={onInputChange}
                min="0"
                max="120"
                className={`w-full px-4 py-3 border ${errors.ageRangeMin ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                placeholder="5"
              />
              {errors.ageRangeMin && <p className="mt-1 text-sm text-red-500">{errors.ageRangeMin}</p>}
            </div>

            <div>
              <label htmlFor="ageRangeMax" className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="ageRangeMax"
                name="ageRangeMax"
                value={formData.ageRangeMax}
                onChange={onInputChange}
                min="0"
                max="120"
                className={`w-full px-4 py-3 border ${errors.ageRangeMax ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                placeholder="60"
              />
              {errors.ageRangeMax && <p className="mt-1 text-sm text-red-500">{errors.ageRangeMax}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags / Skills Covered
            </label>
            <TagInput
              tags={formData.tags}
              onChange={onTagsChange}
              placeholder="e.g., React, TypeScript, Web Development"
            />
            <p className="mt-2 text-xs text-gray-500">Add relevant tags to help students find this course</p>
          </div>
        </CardContent>
      </Card>

      {/* Media Section */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center text-gray-900">
              <ImageIcon className="w-6 h-6 mr-3 text-primary-600" />
              Course Media
            </CardTitle>
            <button
              type="button"
              onClick={onOpenMediaPicker}
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-semibold rounded-lg hover:from-primary-600 hover:to-primary-800 transition-all duration-200"
            >
              Upload Media
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.imagePreviewUrls.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {formData.imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Course media ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">No media uploaded yet</p>
              <button
                type="button"
                onClick={onOpenMediaPicker}
                className="mt-4 text-primary-600 font-semibold hover:text-primary-700"
              >
                Upload your first image
              </button>
            </div>
          )}
          {errors.images && <p className="mt-2 text-sm text-red-500">{errors.images}</p>}
        </CardContent>
      </Card>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={onCloseMediaPicker}
          onSelect={onImagesChange}
          category="event"
          multiple={true}
        />
      )}
    </div>
  );
};

export default TeachingBasicInfoTab;
