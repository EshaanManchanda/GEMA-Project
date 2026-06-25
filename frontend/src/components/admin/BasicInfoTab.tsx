import React, { Suspense, lazy } from 'react';
import TagInput from '../common/TagInput';

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
import MediaPickerModal from '@/components/admin/media/MediaPickerModal';
import { MediaAsset } from '@/store/slices/mediaSlice';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Shield, FileText, Hash, Image as ImageIcon, X, ExternalLink, Library, Trash2, Plus, ListChecks } from 'lucide-react';
import { getAbsoluteUploadUrl } from '@/utils/uploadHelpers';

interface BookingAttachment {
  originalName: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  provider?: 'local' | 'cloudinary';
  publicId?: string;
  cloudinaryUrl?: string;
  uploadedAt?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
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
    shortDescription: string;
    customCSS: string;
    category: string;
    type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue' | 'Workshop' | 'Class' | 'Bootcamp' | 'Masterclass';
    venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
    meetingLink?: string;
    meetingPassword?: string;
    ageRangeMin: string;
    ageRangeMax: string;
    tags: string[];
    images: string[];  // MediaAsset IDs
    imagePreviewUrls: string[];
    bookingAttachments: BookingAttachment[];
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
    // Educational Fields
    syllabus: Array<{ title: string; description: string; duration?: string }>;
    subject: string;
    topic: string;
    introVideo: string;
    teacherId: string;
  };
  categories: Category[];
  vendors: Vendor[];
  teachers: Array<{ id: string; firstName: string; lastName: string; email: string }>;
  errors: Record<string, string>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImagesChange: (assets: MediaAsset[]) => void;
  onRemoveImage: (index: number) => void;
  onBookingAttachmentUpload: (files: File | File[] | null) => void;
  onBookingAttachmentsChange: (attachments: BookingAttachment[]) => void;
  onTagsChange: (tags: string[]) => void;
  onCustomCSSChange: (css: string) => void;
  onSyllabusChange: (syllabus: any[]) => void;
  showMediaPicker: boolean;
  onOpenMediaPicker: () => void;
  onCloseMediaPicker: () => void;
  bookingMethod: 'internal' | 'external';
  onBookingMethodChange: (method: 'internal' | 'external') => void;
}

const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  categories,
  vendors,
  teachers,
  errors,
  onInputChange,
  onCheckboxChange,
  onImagesChange,
  onRemoveImage,
  onBookingAttachmentUpload,
  onBookingAttachmentsChange,
  onTagsChange,
  onCustomCSSChange,
  onSyllabusChange,
  showMediaPicker,
  onOpenMediaPicker,
  onCloseMediaPicker,
}) => {
  const [attachmentError, setAttachmentError] = React.useState('');
  const [isAttachmentUploading, setIsAttachmentUploading] = React.useState(false);
  const [showAttachmentMediaPicker, setShowAttachmentMediaPicker] = React.useState(false);

  // Educational types check
  const isEducational = ['Class', 'Bootcamp', 'Masterclass', 'Course', 'Workshop'].includes(formData.type);

  // Helper for syllabus
  const handleAddSyllabusItem = () => {
    onSyllabusChange([...(formData.syllabus || []), { title: '', description: '' }]);
  };

  const handleRemoveSyllabusItem = (index: number) => {
    const newSyllabus = [...(formData.syllabus || [])];
    newSyllabus.splice(index, 1);
    onSyllabusChange(newSyllabus);
  };

  const handleSyllabusItemChange = (index: number, field: string, value: string) => {
    const newSyllabus = [...(formData.syllabus || [])];
    newSyllabus[index] = { ...newSyllabus[index], [field]: value };
    onSyllabusChange(newSyllabus);
  };

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

  const handleBookingAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setAttachmentError('');
    setIsAttachmentUploading(true);

    try {
      await onBookingAttachmentUpload(files);
    } catch {
      setAttachmentError('Failed to upload booking attachment.');
    } finally {
      setIsAttachmentUploading(false);
      e.target.value = '';
    }
  };

  const removeBookingAttachmentAt = (index: number) => {
    setAttachmentError('');
    const nextAttachments = (formData.bookingAttachments || []).filter((_, attachmentIndex) => attachmentIndex !== index);
    onBookingAttachmentsChange(nextAttachments);
  };

  const handleAttachmentMediaLibrarySelect = (assets: MediaAsset[]) => {
    const newAttachments = assets.map((asset) => ({
      originalName: asset.originalName,
      filename: asset.filename,
      url: asset.directUrl || asset.url,
      size: asset.size,
      mimetype: asset.mimeType,
      provider: 'cloudinary' as const,
      publicId: asset.publicId,
      cloudinaryUrl: asset.directUrl || asset.url,
      uploadedAt: asset.createdAt,
    }));
    onBookingAttachmentsChange([...(formData.bookingAttachments || []), ...newAttachments]);
    setShowAttachmentMediaPicker(false);
  };

  return (
    <div className="space-y-8">
      {/* Admin Controls Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-blue-900 flex items-center">
            <Shield className="w-6 h-6 mr-3 text-blue-600" />
            Admin Controls
            <span className="ml-auto text-xs bg-blue-100 px-3 py-1 rounded-full">
              Admin Only
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vendor Assignment */}
            <div className="md:col-span-2">
              <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Vendor
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
                <p className="mt-1 text-xs text-gray-500">Optional if an instructor is assigned</p>
              )}
            </div>

            {/* Teacher / Instructor Assignment — only for teaching events */}
            {(['Class', 'Course', 'Workshop', 'Bootcamp', 'Masterclass'] as const).includes(
              formData.type as any,
            ) && (
              <div className="md:col-span-2">
                <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 mb-1">
                  Instructor / Teacher{' '}
                  <span className="text-xs text-purple-600 font-normal">(Teaching Events)</span>
                </label>
                <select
                  id="teacherId"
                  name="teacherId"
                  value={formData.teacherId}
                  onChange={onInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="">Select Instructor</option>
                  {(teachers || []).map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName} ({teacher.email})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Assign an instructor to this teaching event</p>
              </div>
            )}

            {/* Booking Configuration Section */}
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
        </CardContent>
      </Card>

      {/* Basic Event Information */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <FileText className="w-6 h-6 mr-3 text-primary-600" />
            Event Information
          </CardTitle>
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

          {/* Short Description */}
          <div>
            <label htmlFor="shortDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Short Description <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(max 500 chars)</span>
            </label>
            <textarea
              id="shortDescription"
              name="shortDescription"
              value={formData.shortDescription || ''}
              onChange={onInputChange}
              required
              placeholder="Brief summary shown on event cards and above the full description…"
              rows={2}
              maxLength={500}
              className={`w-full px-3 py-2 border ${errors.shortDescription ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary resize-none text-sm`}
            />
            {errors.shortDescription && <p className="mt-1 text-sm text-red-500">{errors.shortDescription}</p>}
            <p className="mt-1 text-xs text-gray-400 text-right">{(formData.shortDescription || '').length}/500</p>
          </div>

          {/* Description - Rich Text Editor */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>

            <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <strong>💡 Editor Features:</strong> Tables • Colors • Highlights • 40+ layout classes •
              <a href="/admin/blog-style-guide" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900 ml-1">
                View Style Guide →
              </a>
            </div>
            <Suspense fallback={<TipTapEditorFallback />}>
              <TipTapEditor
                content={formData.description || ''}
                onChange={handleDescriptionChange}
                placeholder="Describe your event in detail... Use the toolbar to format text, add images, videos, and links. You can also insert custom HTML for Google Drive embeds."
                mediaCategory="event"
                mediaFolder="events"
                characterLimit={10000}
              />
            </Suspense>

            <div className="mt-3 flex items-center justify-between text-sm border-t border-gray-200 pt-3">
              <p className="text-gray-600">Need help using the editor?</p>
              <a href="/admin/blog-style-guide" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                📚 View Editor Tutorial & Style Guide
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {errors.description && <p className="mt-2 text-sm text-red-500">{errors.description}</p>}

            {/* Helper text for Google Drive embeds */}
            <p className="mt-2 text-xs text-gray-500">
              💡 <strong>Tip:</strong> To embed Google Drive files, use the "Insert Custom HTML" button (📄 icon) in the toolbar.
              Get the embed code from Google Drive by clicking Share → Get embed code.
            </p>
          </div>

          {/* Custom CSS Section */}
          <div className="mt-6">
            <Card variant="elevated" className="shadow-sm border-2 border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-600" />
                  <CardTitle className="text-lg text-gray-900">
                    Custom Styling (Optional)
                  </CardTitle>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Add custom CSS for advanced event page layouts. Works with HTML inserted via editor above.
                </p>
              </CardHeader>
              <CardContent>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom CSS
                  <span className="text-xs text-gray-500 ml-2">- WordPress-like styling control</span>
                </label>

                <textarea
                  value={formData.customCSS}
                  onChange={(e) => onCustomCSSChange(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm bg-gray-50"
                  placeholder="/* Add custom CSS for this event page only */
.my-custom-class {
  color: #ff6b00;
  font-size: 1.2rem;
}

/* Works with utility classes from Style Guide */
/* See: /admin/blog-style-guide */"
                  spellCheck={false}
                />

                {errors.customCSS && <p className="mt-1 text-sm text-red-500">{errors.customCSS}</p>}

                <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
                  <p className="text-xs text-gray-500">
                    Dangerous properties (@import, external URLs) will be sanitized. Max 50,000 characters.
                  </p>
                  <a
                    href="/admin/blog-style-guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
                  >
                    📖 View Style Guide
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
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
                  <option key={category.id} value={category.slug}>
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
                <option value="Class">Class</option>
                <option value="Bootcamp">Bootcamp</option>
                <option value="Masterclass">Masterclass</option>
              </select>
              {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
            </div>
          </div>



          {/* Educational Fields Section */}
          {isEducational && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                Educational Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={onInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g. Mathematics, Music, Coding"
                  />
                </div>
                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    id="topic"
                    name="topic"
                    value={formData.topic}
                    onChange={onInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="e.g. Algebra II, Piano Basics"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="introVideo" className="block text-sm font-medium text-gray-700 mb-1">
                    Intro Video URL
                  </label>
                  <input
                    type="url"
                    id="introVideo"
                    name="introVideo"
                    value={formData.introVideo}
                    onChange={onInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </div>

            </div>
          )}

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

          {/* Meeting Details - Only for Online Events */}
          {formData.venueType === 'Online' && (
            <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <div>
                <label htmlFor="meetingLink" className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Link <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  id="meetingLink"
                  name="meetingLink"
                  value={formData.meetingLink || ''}
                  onChange={onInputChange}
                  className={`w-full px-3 py-2 border ${errors.meetingLink ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white`}
                  placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij"
                />
                {errors.meetingLink && <p className="mt-1 text-sm text-red-500">{errors.meetingLink}</p>}
                <p className="mt-1 text-xs text-gray-600">Zoom, Google Meet, Teams, etc.</p>
              </div>
              <div>
                <label htmlFor="meetingPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Password <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  id="meetingPassword"
                  name="meetingPassword"
                  value={formData.meetingPassword || ''}
                  onChange={onInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white"
                  placeholder="e.g. meet2024"
                />
                <p className="mt-1 text-xs text-gray-600">If set, this password will be included in ticket and confirmation emails.</p>
              </div>
            </div>
          )}

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
        </CardContent>
      </Card>

      {/* Syllabus / Lessons Section */}
      {isEducational && (
        <Card variant="elevated" className="shadow-xl">
          <CardHeader>
            <div className="flex justify-between items-center w-full">
              <CardTitle className="text-2xl flex items-center text-gray-900">
                <ListChecks className="w-6 h-6 mr-3 text-primary-600" />
                Course Syllabus
              </CardTitle>
              <button
                type="button"
                onClick={handleAddSyllabusItem}
                className="flex items-center text-sm font-semibold text-primary-600 hover:text-primary-800 transition-colors bg-primary-50 px-3 py-1.5 rounded-lg"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Lesson
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">Optional: Add a lesson-by-lesson breakdown of this course.</p>
          </CardHeader>
          <CardContent>
            {formData.syllabus && formData.syllabus.length > 0 ? (
              <div className="space-y-4">
                {formData.syllabus.map((lesson, idx) => (
                  <div key={idx} className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4 relative group shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleRemoveSyllabusItem(idx)}
                      className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
                      title="Remove Lesson"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Lesson Title</label>
                        <input
                          type="text"
                          placeholder="e.g., Week 1: Introduction"
                          value={lesson.title || ''}
                          onChange={(e) => handleSyllabusItemChange(idx, 'title', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Duration <span className="font-normal text-gray-400">(optional)</span></label>
                        <input
                          type="text"
                          placeholder="e.g., 55 mins"
                          value={lesson.duration || ''}
                          onChange={(e) => handleSyllabusItemChange(idx, 'duration', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
                      <textarea
                        placeholder="Brief description of the lesson..."
                        value={lesson.description || ''}
                        rows={2}
                        onChange={(e) => handleSyllabusItemChange(idx, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm text-sm resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <ListChecks className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No syllabus added</h3>
                <p className="text-xs text-gray-500 mb-4">You can add an optional syllabus to show what learners will learn each week.</p>
                <button
                  type="button"
                  onClick={handleAddSyllabusItem}
                  className="inline-flex items-center text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors px-4 py-2 rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-1" /> Create First Lesson
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tags Section */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <Hash className="w-6 h-6 mr-3 text-primary-600" />
            Tags & Keywords
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TagInput
            tags={formData.tags}
            onChange={onTagsChange}
            maxTags={20}
            allowBulkAdd={true}
            placeholder="Add tag"
            showCount={true}
            label=""
            error={errors.tags}
          />
          <p className="mt-2 text-xs text-gray-500">
            Add relevant tags to help users find your event. Maximum 20 tags.
          </p>
        </CardContent>
      </Card>

      {/* Event Images Section */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <ImageIcon className="w-6 h-6 mr-3 text-primary-600" />
            Event Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Images <span className="text-red-500">*</span>
            </label>

            {/* Image Preview Grid */}
            {formData.imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-6">
                {formData.imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
                      <img
                        src={url}
                        alt={`Event ${index + 1}`}
                        className="h-40 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110"
                      >
                        <X className="w-5 h-5" />
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
              {formData.images.length > 0 ? 'Add More Images' : 'Select Images from Library'}
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

      {/* Booking Attachment Section */}
      <Card variant="elevated" className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-gray-900">
            <FileText className="w-6 h-6 mr-3 text-primary-600" />
            Booking Attachment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="bookingAttachment" className="block text-sm font-medium text-gray-700 mb-2">
                Upload a file to send with booking confirmation emails
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  id="bookingAttachment"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/heic,image/heif,image/svg+xml,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.heic,.heif,.svg,.xls,.xlsx"
                  onChange={handleBookingAttachmentChange}
                  disabled={isAttachmentUploading}
                  className="block text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-700 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowAttachmentMediaPicker(true)}
                  disabled={isAttachmentUploading}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <Library className="h-4 w-4" />
                  Media Library
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Supported file types: <strong>Images</strong> (JPG, PNG, GIF, WebP), <strong>PDF</strong>, and <strong>Excel</strong> (XLS, XLSX). All uploaded files will be emailed to users when they register for this event.
              </p>
            </div>

            {(formData.bookingAttachments || []).length > 0 ? (
              <div className="space-y-3">
                {formData.bookingAttachments.map((attachment, index) => (
                  <div key={`${attachment.filename}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900">{attachment.originalName}</p>
                        <p className="text-sm text-gray-500">{attachment.mimetype}</p>
                        <a
                          href={getAbsoluteUploadUrl(attachment.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                        >
                          View uploaded file
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBookingAttachmentAt(index)}
                        className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                No booking attachment uploaded yet.
              </div>
            )}

            {isAttachmentUploading && (
              <p className="text-sm text-primary-600">Uploading attachment...</p>
            )}

            {attachmentError && <p className="text-sm text-red-500">{attachmentError}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Media Picker Modal — event images */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={onCloseMediaPicker}
        onSelect={(assets) => {
          onImagesChange(assets);
          onCloseMediaPicker();
        }}
        category="event"
        folder="events"
        multiple={true}
        title="Select Event Images"
      />

      {/* Media Picker Modal — booking attachments */}
      <MediaPickerModal
        isOpen={showAttachmentMediaPicker}
        onClose={() => setShowAttachmentMediaPicker(false)}
        onSelect={handleAttachmentMediaLibrarySelect}
        category="document"
        multiple={true}
        title="Select Booking Attachments"
      />
    </div >
  );
};

export default BasicInfoTab;
