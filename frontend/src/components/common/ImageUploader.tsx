import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { UploadAPI, validateFileType, validateFileSize, formatFileSize, isImageFile } from '../../services/api/uploadAPI';
import LoadingSpinner from './LoadingSpinner';

interface UploadedFile {
  originalName: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  provider?: 'local' | 'cloudinary';
  publicId?: string;
  variations?: { [key: string]: string };
}

interface ImageUploaderProps {
  category?: string;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  onUploadSuccess?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  multiple?: boolean;
  showPreview?: boolean;
  existingFiles?: UploadedFile[];
  disabled?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  category = 'misc',
  maxFiles = 5,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  onUploadSuccess,
  onUploadError,
  className = '',
  multiple = true,
  showPreview = true,
  existingFiles = [],
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(existingFiles);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load provider info on component mount
  React.useEffect(() => {
    const loadProviderInfo = async () => {
      try {
        const info = await UploadAPI.getProviderInfo();
        setProviderInfo(info.data);
      } catch (error) {
        console.error('Failed to load provider info:', error);
      }
    };
    loadProviderInfo();
  }, []);

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (disabled) return;

    setUploading(true);
    const uploadPromises: Promise<any>[] = [];
    const fileNames = files.map(f => f.name);

    // Initialize progress tracking
    const initialProgress: { [key: string]: number } = {};
    fileNames.forEach(name => {
      initialProgress[name] = 0;
    });
    setUploadProgress(initialProgress);

    try {
      for (const file of files) {
        // Validate file type
        if (!validateFileType(file, acceptedFileTypes)) {
          toast.error(`Invalid file type: ${file.name}`);
          continue;
        }

        // Validate file size
        if (!validateFileSize(file, maxFileSize)) {
          toast.error(`File too large: ${file.name} (max ${formatFileSize(maxFileSize)})`);
          continue;
        }

        // Simulate progress for individual files
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: Math.min(prev[file.name] + 10, 90)
          }));
        }, 200);

        const uploadPromise = UploadAPI.uploadSingle(file, category)
          .then(response => {
            clearInterval(progressInterval);
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: 100
            }));
            return response.data;
          })
          .catch(error => {
            clearInterval(progressInterval);
            throw error;
          });

        uploadPromises.push(uploadPromise);
      }

      const results = await Promise.allSettled(uploadPromises);
      const successfulUploads: UploadedFile[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulUploads.push(result.value);
        } else {
          errors.push(`Failed to upload ${files[index].name}: ${result.reason.message}`);
        }
      });

      if (successfulUploads.length > 0) {
        const newFiles = [...uploadedFiles, ...successfulUploads];
        setUploadedFiles(newFiles);
        onUploadSuccess?.(successfulUploads);
        toast.success(`Successfully uploaded ${successfulUploads.length} file(s)`);
      }

      if (errors.length > 0) {
        errors.forEach(error => {
          toast.error(error);
          onUploadError?.(error);
        });
      }

    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
      onUploadError?.(error.message);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [category, acceptedFileTypes, maxFileSize, uploadedFiles, onUploadSuccess, onUploadError, disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as { [key: string]: string[] }),
    maxFiles: multiple ? maxFiles : 1,
    multiple,
    disabled: disabled || uploading
  });

  const removeFile = (index: number) => {
    if (disabled) return;
    
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onUploadSuccess?.(newFiles);
  };

  const getImageVariations = async (publicId: string) => {
    if (!providerInfo?.cloudinaryEnabled || !publicId) return null;
    
    try {
      const response = await UploadAPI.getImageVariations(publicId);
      return response.data.variations;
    } catch (error) {
      console.error('Failed to get image variations:', error);
      return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        {uploading ? (
          <div className="space-y-2">
            <LoadingSpinner size="medium" />
            <p className="text-sm text-gray-600">Uploading files...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📤</div>
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-sm text-gray-500">
                or click to select files
              </p>
            </div>
            <div className="text-xs text-gray-400">
              <p>Max {maxFiles} files • {formatFileSize(maxFileSize)} each</p>
              <p>Supported: {acceptedFileTypes.map(type => type.split('/')[1]).join(', ')}</p>
              {providerInfo && (
                <p className="mt-1">
                  Provider: {providerInfo.provider} 
                  {providerInfo.cloudinaryEnabled && ' (with Cloudinary optimization)'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Upload Progress</h4>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="truncate">{fileName}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Preview */}
      {showPreview && uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Uploaded Files ({uploadedFiles.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="relative group border rounded-lg overflow-hidden">
                {isImageFile({ type: file.mimetype } as File) ? (
                  <div className="aspect-square">
                    <img
                      src={file.variations?.thumbnail || file.url}
                      alt={file.originalName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📄</div>
                      <p className="text-xs text-gray-600 truncate px-2">
                        {file.originalName}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="p-2">
                  <p className="text-xs text-gray-600 truncate" title={file.originalName}>
                    {file.originalName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                  {file.provider === 'cloudinary' && (
                    <p className="text-xs text-green-600">✓ Optimized</p>
                  )}
                </div>

                {!disabled && (
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove file"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;