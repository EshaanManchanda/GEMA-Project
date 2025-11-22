import React, { useState } from 'react';
import { UploadAPI } from '../../services/api/uploadAPI';

interface ImageUploadProps {
  images: File[];
  imagePreviewUrls: string[];
  onImagesChange: (images: File[], previewUrls: string[]) => void;
  onRemoveImage: (index: number) => void;
  error?: string;
  maxSize?: number; // in MB
  maxFiles?: number;
  acceptedTypes?: string[];
  label?: string;
  required?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  imagePreviewUrls,
  onImagesChange,
  onRemoveImage,
  error,
  maxSize = 5,
  maxFiles = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
  label = 'Event Images',
  required = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);

      // Check if adding these files would exceed max files limit
      if (images.length + filesArray.length > maxFiles) {
        alert(`You can only upload a maximum of ${maxFiles} images.`);
        e.target.value = '';
        return;
      }

      const validFiles = filesArray.filter(file => {
        const isValidType = acceptedTypes.includes(file.type);
        const isValidSize = file.size <= maxSize * 1024 * 1024;

        if (!isValidType) {
          alert(`File ${file.name} is not a valid image type. Only JPG, JPEG, and PNG files are allowed.`);
        } else if (!isValidSize) {
          alert(`File ${file.name} exceeds the ${maxSize}MB size limit.`);
        }

        return isValidType && isValidSize;
      });

      if (validFiles.length > 0) {
        try {
          setIsUploading(true);
          setUploadError(null);

          // Upload files to backend (will use Cloudinary or local storage)
          const response = await UploadAPI.uploadMultiple(validFiles, 'events');

          console.log('Upload response:', response);

          if (response.success && response.data) {
            // Backend returns data as array directly for /multiple endpoint
            const filesData = Array.isArray(response.data) ? response.data : response.data.files || [];

            if (filesData.length === 0) {
              throw new Error('Upload failed: No URLs returned');
            }

            // Extract URLs from upload response
            const uploadedUrls = filesData.map((file: any) => file.url || file.cloudinaryUrl);

            console.log('Uploaded URLs:', uploadedUrls);

            // Combine existing and new images
            const updatedImages = [...images, ...validFiles];
            const updatedPreviewUrls = [...imagePreviewUrls, ...uploadedUrls];

            onImagesChange(updatedImages, updatedPreviewUrls);
          } else {
            throw new Error('Upload failed: No URLs returned');
          }
        } catch (error: any) {
          console.error('Error uploading images:', error);
          setUploadError(error.response?.data?.message || error.message || 'Failed to upload images. Please try again.');
          alert(`Upload failed: ${error.response?.data?.message || error.message || 'Please try again.'}`);
        } finally {
          setIsUploading(false);
        }
      }
    }

    // Reset input value to allow uploading the same file again
    e.target.value = '';
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
        <div className="space-y-1 text-center">
          {isUploading ? (
            <>
              <svg className="animate-spin mx-auto h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-600">Uploading images...</p>
            </>
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="images"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                >
                  <span>Upload images</span>
                  <input
                    id="images"
                    name="images"
                    type="file"
                    className="sr-only"
                    accept={acceptedTypes.join(', ')}
                    multiple
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                PNG, JPG, JPEG up to {maxSize}MB (max {maxFiles} images)
              </p>
            </>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      {uploadError && <p className="mt-1 text-sm text-red-500">{uploadError}</p>}

      {imagePreviewUrls.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Images:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {imagePreviewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="h-24 w-full object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
