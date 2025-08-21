import React, { useState, useEffect } from 'react';
import { AdvancedImage } from '@cloudinary/react';
import { Cloudinary } from '@cloudinary/url-gen';
import { auto } from '@cloudinary/url-gen/actions/resize';
import { format, quality } from '@cloudinary/url-gen/actions/delivery';
import { toast } from 'react-hot-toast';
import { UploadAPI } from '../../services/api/uploadAPI';
import LoadingSpinner from './LoadingSpinner';

interface MediaFile {
  filename: string;
  url: string;
  size: number;
  created: string;
  modified: string;
  extension: string;
  publicId?: string;
  provider?: 'local' | 'cloudinary';
  variations?: { [key: string]: string };
}

interface MediaGalleryProps {
  category: string;
  onFileSelect?: (file: MediaFile) => void;
  onFileDelete?: (filename: string) => void;
  showUpload?: boolean;
  selectable?: boolean;
  cloudinaryConfig?: {
    cloudName: string;
  };
  className?: string;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({
  category,
  onFileSelect,
  onFileDelete,
  showUpload = false,
  selectable = false,
  cloudinaryConfig,
  className = ''
}) => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize Cloudinary instance if config is provided
  const cld = cloudinaryConfig ? new Cloudinary({
    cloud: {
      cloudName: cloudinaryConfig.cloudName
    }
  }) : null;

  const loadFiles = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await UploadAPI.getFileList(category, page, 20);
      setFiles(response.data.files);
      setCurrentPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.pages);
    } catch (error: any) {
      toast.error('Failed to load files: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(currentPage);
  }, [category, currentPage]);

  const handleFileSelect = (file: MediaFile) => {
    if (selectable) {
      setSelectedFile(file.filename);
      onFileSelect?.(file);
    }
  };

  const handleFileDelete = async (filename: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await UploadAPI.deleteFileLegacy(filename, category);
        setFiles(files.filter(f => f.filename !== filename));
        onFileDelete?.(filename);
        toast.success('File deleted successfully');
      } catch (error: any) {
        toast.error('Failed to delete file: ' + error.message);
      }
    }
  };

  const getOptimizedImageUrl = (file: MediaFile, size: 'thumbnail' | 'medium' | 'large' = 'medium') => {
    if (file.variations && file.variations[size]) {
      return file.variations[size];
    }

    if (cld && file.publicId) {
      const img = cld.image(file.publicId);
      
      switch (size) {
        case 'thumbnail':
          img.resize(auto().width(200).height(200));
          break;
        case 'medium':
          img.resize(auto().width(400));
          break;
        case 'large':
          img.resize(auto().width(800));
          break;
      }
      
      img.delivery(quality('auto')).delivery(format('auto'));
      return img.toURL();
    }

    return file.url;
  };

  const isImageFile = (extension: string) => {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension.toLowerCase());
  };

  const getFileIcon = (extension: string) => {
    const ext = extension.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['mp4', 'avi', 'mov'].includes(ext)) return '🎥';
    if (['mp3', 'wav'].includes(ext)) return '🎵';
    return '📁';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="medium" text="Loading files..." />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium capitalize">{category} Files</h3>
          <p className="text-sm text-gray-500">{files.length} files found</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* File Display */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📁</div>
          <p className="text-lg mb-2">No files found</p>
          <p className="text-sm">
            {searchTerm ? 'Try adjusting your search' : 'Upload some files to get started'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredFiles.map((file, index) => (
            <div
              key={index}
              className={`
                relative group border rounded-lg overflow-hidden cursor-pointer transition-all duration-200
                ${selectable && selectedFile === file.filename 
                  ? 'ring-2 ring-blue-500 border-blue-500' 
                  : 'hover:shadow-md hover:border-gray-300'
                }
              `}
              onClick={() => handleFileSelect(file)}
            >
              <div className="aspect-square">
                {isImageFile(file.extension) ? (
                  cld && file.publicId ? (
                    <AdvancedImage
                      cldImg={cld.image(file.publicId).resize(auto().width(200).height(200)).delivery(quality('auto')).delivery(format('auto'))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={getOptimizedImageUrl(file, 'thumbnail')}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="text-3xl mb-2">{getFileIcon(file.extension)}</div>
                      <p className="text-xs text-gray-600 px-2 truncate">
                        {file.filename}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-2">
                <p className="text-xs text-gray-600 truncate" title={file.filename}>
                  {file.filename}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(file.size)}
                </p>
                {file.provider === 'cloudinary' && (
                  <p className="text-xs text-green-600">✓ Optimized</p>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileDelete(file.filename);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modified</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFiles.map((file, index) => (
                  <tr
                    key={index}
                    className={`
                      hover:bg-gray-50 cursor-pointer
                      ${selectable && selectedFile === file.filename ? 'bg-blue-50' : ''}
                    `}
                    onClick={() => handleFileSelect(file)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <span className="mr-3 text-lg">{getFileIcon(file.extension)}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.filename}
                          </p>
                          <p className="text-xs text-gray-500">.{file.extension}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(file.modified)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        file.provider === 'cloudinary' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {file.provider || 'local'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileDelete(file.filename);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;