import React, { useState, useRef } from 'react';
import { Upload, X, Image, Loader2 } from 'lucide-react';
import Button from './Button';
import toast from 'react-hot-toast';
import { UploadAPI } from '../../services/api/uploadAPI';

interface ImageUploadProps {
  onImageUpload: (imageUrl: string) => void;
  currentImage?: string;
  placeholder?: string;
  maxFileSize?: number; // in MB
  acceptedFormats?: string[];
  category?: string; // Upload category (e.g., 'blogs', 'events', 'users')
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  currentImage,
  placeholder = "Upload an image",
  maxFileSize = 5,
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  category = 'misc'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      toast.error(`Please upload a valid image file (${acceptedFormats.join(', ')})`);
      return;
    }

    // Validate file size
    if (file.size > maxFileSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxFileSize}MB`);
      return;
    }

    setIsUploading(true);

    try {
      // Upload to backend using UploadAPI (supports both Cloudinary and local storage)
      const response = await UploadAPI.uploadSingle(file, category);

      console.log('Upload response:', response);

      if (response.success && response.data) {
        // Get URL from response (Cloudinary or local)
        const imageUrl = response.data.url || response.data.cloudinaryUrl;

        if (!imageUrl) {
          throw new Error('No URL returned from upload');
        }

        onImageUpload(imageUrl);
        toast.success('Image uploaded successfully!');
      } else {
        throw new Error('Upload failed: Invalid response');
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    onImageUpload('');
  };

  return (
    <div className="space-y-4">
      {currentImage ? (
        <div className="relative group">
          <img
            src={currentImage}
            alt="Uploaded"
            className="w-full h-48 object-cover rounded-lg border border-gray-300"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={openFileDialog}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-1" />
                Change
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={removeImage}
                disabled={isUploading}
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Uploading image...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <Image className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">{placeholder}</p>
                <p className="text-xs text-gray-500">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports: JPG, PNG, WebP (max {maxFileSize}MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={acceptedFormats.join(',')}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUpload;