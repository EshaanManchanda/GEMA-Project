import React, { useCallback, useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store';
import { uploadMedia, uploadMultipleMedia } from '../../../store/slices/mediaSlice';
import Button from '../../ui/Button';
import toast from 'react-hot-toast';

interface MediaUploadZoneProps {
  category: 'blog' | 'profile' | 'event' | 'document' | 'misc';
  folder: string;
  onUploadComplete?: () => void;
  multiple?: boolean;
  maxFiles?: number;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

/**
 * MediaUploadZone - Drag & Drop Upload Component
 *
 * Features:
 * - Drag and drop file upload
 * - Multiple file support
 * - Upload progress tracking
 * - File validation
 * - Preview before upload
 */
const MediaUploadZone: React.FC<MediaUploadZoneProps> = ({
  category,
  folder,
  onUploadComplete,
  multiple = true,
  maxFiles = 10
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Handle file selection
  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const fileArray = Array.from(selectedFiles);

    // Validate file count
    if (fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf'];
    const invalidFiles = fileArray.filter(file => !validTypes.includes(file.type));

    if (invalidFiles.length > 0) {
      toast.error('Some files have invalid types. Only images, videos, and PDFs are allowed.');
      return;
    }

    // Validate file sizes (per-type limits)
    const getMaxSizeForFile = (file: File): number => {
      if (file.type.startsWith('image/')) return 10 * 1024 * 1024; // 10MB
      if (file.type.startsWith('video/')) return 500 * 1024 * 1024; // 500MB
      if (file.type.includes('pdf') || file.type.includes('document')) return 20 * 1024 * 1024; // 20MB
      return 10 * 1024 * 1024; // Default 10MB
    };

    const oversizedFiles = fileArray.filter(file => {
      const maxSize = getMaxSizeForFile(file);
      return file.size > maxSize;
    });

    if (oversizedFiles.length > 0) {
      const fileTypes = oversizedFiles.map(f => {
        if (f.type.startsWith('image/')) return 'Images: 10MB max';
        if (f.type.startsWith('video/')) return 'Videos: 500MB max';
        return 'Documents: 20MB max';
      });
      toast.error(`File size limit exceeded. ${fileTypes[0]}`);
      return;
    }

    // Add files to state
    const uploadFiles: UploadFile[] = fileArray.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: 'pending',
      progress: 0
    }));

    setFiles(multiple ? [...files, ...uploadFiles] : uploadFiles);
  };

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    handleFiles(droppedFiles);
  }, []);

  // Handle click to browse
  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    input.accept = 'image/*,video/*,application/pdf';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      handleFiles(target.files);
    };
    input.click();
  };

  // Remove file
  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  // Upload files
  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);

    try {
      if (files.length === 1) {
        // Single upload
        setFiles(files.map(f => ({ ...f, status: 'uploading' as const })));

        await dispatch(uploadMedia({
          file: files[0].file,
          category,
          folder
        })).unwrap();

        setFiles([{ ...files[0], status: 'success', progress: 100 }]);
        toast.success('File uploaded successfully!');
      } else {
        // Multiple upload with per-file tracking
        setFiles(files.map(f => ({ ...f, status: 'uploading' as const })));

        const result = await dispatch(uploadMultipleMedia({
          files: files.map(f => f.file),
          category,
          folder
        })).unwrap();

        // Map results back to files
        const updatedFiles = files.map(uploadFile => {
          const success = result.successful.find(
            (s: any) => s.file === uploadFile.file.name
          );
          const failure = result.failed.find(
            (f: any) => f.file === uploadFile.file.name
          );

          if (success) {
            return { ...uploadFile, status: 'success' as const, progress: 100 };
          } else if (failure) {
            return {
              ...uploadFile,
              status: 'error' as const,
              error: failure.error
            };
          }
          return uploadFile;
        });

        setFiles(updatedFiles);

        // Show appropriate message
        if (result.summary.failed > 0) {
          toast.error(
            `${result.summary.succeeded} succeeded, ${result.summary.failed} failed`,
            { duration: 4000 }
          );

          // Show individual error messages for each failed file
          result.failed.forEach((failure: any) => {
            toast.error(
              `Failed: ${failure.file} - ${failure.error}`,
              {
                duration: 6000,
                icon: '❌'
              }
            );
          });
        } else {
          toast.success(`${result.summary.succeeded} files uploaded successfully!`);
        }
      }

      // Only clear successful files after delay
      setTimeout(() => {
        setFiles(prev => prev.filter(f => f.status === 'error'));
        if (files.every(f => f.status === 'success')) {
          onUploadComplete?.();
        }
      }, 2000);

    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
      setFiles(files.map(f => ({
        ...f,
        status: 'error',
        error: error.message || 'Upload failed'
      })));
    } finally {
      setUploading(false);
    }
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <Upload className={`mx-auto h-12 w-12 mb-4 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />

        <p className="text-base font-medium text-gray-700 mb-1">
          {isDragging ? 'Drop files here...' : 'Drag and drop files here'}
        </p>
        <p className="text-sm text-gray-500">
          or click to browse
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Images: 10MB | Videos: 500MB | Documents: 20MB
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              {files.length} file(s) selected
            </h4>
            {!uploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiles([])}
              >
                Clear All
              </Button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                {/* Status Icon */}
                {uploadFile.status === 'pending' && (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <Upload className="h-4 w-4 text-gray-600" />
                  </div>
                )}
                {uploadFile.status === 'uploading' && (
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                )}
                {uploadFile.status === 'success' && (
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                )}
                {uploadFile.status === 'error' && (
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatSize(uploadFile.file.size)}
                  </p>
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                  )}
                </div>

                {/* Remove Button */}
                {uploadFile.status === 'pending' && !uploading && (
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-600" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload Button */}
          {files.some(f => f.status === 'pending') && (
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={uploading}
                loading={uploading}
              >
                Upload {files.length} file(s)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaUploadZone;
