import React from 'react';
import ImageUpload from '../common/ImageUpload';

interface Category {
  id: string;
  name: string;
}

interface Vendor {
  _id: string;
  businessName: string;
  email: string;
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
    images: File[];
    imagePreviewUrls: string[];
    // Admin-specific fields
    isApproved: boolean;
    isFeatured: boolean;
    requirePhoneVerification: boolean;
    status: 'draft' | 'published' | 'archived' | 'pending' | 'rejected';
    isActive: boolean;
    vendorId: string;
    // Affiliate Event fields
    isAffiliateEvent: boolean;
    externalBookingLink: string;
    claimStatus: 'unclaimed' | 'claimed' | 'not_claimable';
  };
  categories: Category[];
  vendors: Vendor[];
  errors: Record<string, string>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImagesChange: (images: File[], previewUrls: string[]) => void;
  onRemoveImage: (index: number) => void;
}

const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  categories,
  vendors,
  errors,
  onInputChange,
  onCheckboxChange,
  onImagesChange,
  onRemoveImage,
}) => {
  // Find the Platform Affiliate vendor
  const affiliateVendor = vendors.find(v => v.businessName === 'Platform Affiliate');

  // Handle affiliate event checkbox change
  const handleAffiliateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckboxChange(e);

    // Auto-select Platform Affiliate vendor when affiliate event is enabled
    if (e.target.checked && affiliateVendor) {
      const syntheticEvent = {
        target: {
          name: 'vendorId',
          value: affiliateVendor._id
        }
      } as React.ChangeEvent<HTMLSelectElement>;
      onInputChange(syntheticEvent);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Controls Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Admin Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vendor Assignment */}
          <div className="md:col-span-2">
            <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Vendor <span className="text-red-500">*</span>
            </label>
            <select
              id="vendorId"
              name="vendorId"
              value={formData.vendorId}
              onChange={onInputChange}
              disabled={formData.isAffiliateEvent}
              className={`w-full px-3 py-2 border ${errors.vendorId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary ${formData.isAffiliateEvent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">Select a vendor</option>
              {(vendors || []).map(vendor => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.businessName} ({vendor.email})
                </option>
              ))}
            </select>
            {errors.vendorId && <p className="mt-1 text-sm text-red-500">{errors.vendorId}</p>}
            {formData.isAffiliateEvent ? (
              <p className="mt-1 text-xs text-blue-600 font-medium">
                Auto-assigned to "Platform Affiliate" for affiliate events
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">Assign this event to a vendor</p>
            )}
          </div>

          {/* Affiliate Event Section */}
          <div className="md:col-span-2 border-t pt-4">
            <label className="flex items-center mb-3">
              <input
                type="checkbox"
                name="isAffiliateEvent"
                checked={formData.isAffiliateEvent}
                onChange={handleAffiliateChange}
                className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                This is an Affiliate Event (External Booking Link)
              </span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Enable this if the event redirects to an external website for booking. Users will be redirected to the external link when they click "Book Now".
            </p>

            {formData.isAffiliateEvent && (
              <div className="space-y-3 pl-6 border-l-4 border-blue-300">
                <div>
                  <label htmlFor="externalBookingLink" className="block text-sm font-medium text-gray-700 mb-1">
                    External Booking Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    id="externalBookingLink"
                    name="externalBookingLink"
                    value={formData.externalBookingLink}
                    onChange={onInputChange}
                    className={`w-full px-3 py-2 border ${errors.externalBookingLink ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
                    placeholder="https://example.com/book-event"
                  />
                  {errors.externalBookingLink && (
                    <p className="mt-1 text-sm text-red-500">{errors.externalBookingLink}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Full URL where users will be redirected to complete their booking
                  </p>
                </div>

                <div>
                  <label htmlFor="claimStatus" className="block text-sm font-medium text-gray-700 mb-1">
                    Claim Status
                  </label>
                  <select
                    id="claimStatus"
                    name="claimStatus"
                    value={formData.claimStatus}
                    onChange={onInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="not_claimable">Not Claimable</option>
                    <option value="unclaimed">Unclaimed (Vendors Can Claim)</option>
                    <option value="claimed">Claimed</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    "Unclaimed" allows vendors to claim this event and manage it. "Not Claimable" keeps it as a pure affiliate event.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Event Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={onInputChange}
              className={`w-full px-3 py-2 border ${errors.status ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary`}
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending Review</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>
            {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
          </div>

          {/* Approval Toggle Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isApproved"
                checked={formData.isApproved}
                onChange={onCheckboxChange}
                className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Approved for Public Display
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={onCheckboxChange}
                className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Active (Visible to Users)
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={onCheckboxChange}
                className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Featured Event
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="requirePhoneVerification"
                checked={formData.requirePhoneVerification}
                onChange={onCheckboxChange}
                className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Require Phone Verification
              </span>
            </label>
          </div>
        </div>
      </div>

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
