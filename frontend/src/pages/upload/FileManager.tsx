import React, { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ImageUploader from '@/components/common/ImageUploader';
import MediaGallery from '@/components/common/MediaGallery';
import { UploadAPI } from '@/services/api/uploadAPI';
import { toast } from 'react-hot-toast';

const FileManager: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('events');
  const [uploading, setUploading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [refreshGallery, setRefreshGallery] = useState(0);

  const categories = [
    { id: 'events', label: 'Events', icon: '📅', description: 'Event images and media' },
    { id: 'venues', label: 'Venues', icon: '🏢', description: 'Venue photos and floor plans' },
    { id: 'users', label: 'Users', icon: '👤', description: 'User avatars and profiles' },
    { id: 'documents', label: 'Documents', icon: '📄', description: 'PDFs and documents' },
    { id: 'tickets', label: 'Tickets', icon: '🎫', description: 'Ticket images and QR codes' },
    { id: 'misc', label: 'Miscellaneous', icon: '📁', description: 'Other files' },
  ];

  // Load provider information
  useEffect(() => {
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

  const handleUploadSuccess = (files: any[]) => {
    setRefreshGallery(prev => prev + 1);
    setShowUploader(false);
    toast.success(`Successfully uploaded ${files.length} file(s) to ${activeCategory}`);
  };

  const handleUploadError = (error: string) => {
    toast.error('Upload failed: ' + error);
  };

  const handleFileDelete = (filename: string) => {
    setRefreshGallery(prev => prev + 1);
    toast.success('File deleted successfully');
  };

  const getAcceptedFileTypes = (category: string) => {
    switch (category) {
      case 'events':
      case 'venues':
      case 'users':
        return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      case 'documents':
        return ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      case 'tickets':
        return ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      default:
        return ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">File Manager</h1>
          <p className="text-gray-600">
            Manage uploaded files and media
            {providerInfo && (
              <span className="ml-2 text-sm">
                • Provider: <span className="font-medium">{providerInfo.provider}</span>
                {providerInfo.cloudinaryEnabled && (
                  <span className="text-green-600 ml-1">✓ Optimized</span>
                )}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowUploader(!showUploader)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            📤 {showUploader ? 'Hide Uploader' : 'Upload Files'}
          </button>
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                  activeCategory === category.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                title={category.description}
              >
                <span>{category.icon}</span>
                {category.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Category Info */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{categories.find(c => c.id === activeCategory)?.icon}</span>
              <div>
                <h3 className="text-lg font-medium">
                  {categories.find(c => c.id === activeCategory)?.label} Files
                </h3>
                <p className="text-sm text-gray-500">
                  {categories.find(c => c.id === activeCategory)?.description}
                </p>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          {showUploader && (
            <div className="mb-6">
              <ImageUploader
                category={activeCategory}
                acceptedFileTypes={getAcceptedFileTypes(activeCategory)}
                maxFileSize={providerInfo?.maxFileSize || 5 * 1024 * 1024}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg"
              />
            </div>
          )}

          {/* Media Gallery */}
          <MediaGallery
            key={refreshGallery} // Force re-render when files change
            category={activeCategory}
            onFileDelete={handleFileDelete}
            cloudinaryConfig={
              providerInfo?.cloudinaryEnabled ? { cloudName: 'ditxik56f' } : undefined
            }
          />
        </div>
      </div>

      {/* Provider Info */}
      {providerInfo && (
        <div className={`border rounded-lg p-4 ${
          providerInfo.cloudinaryEnabled 
            ? 'bg-green-50 border-green-200' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <h4 className={`font-medium mb-2 ${
            providerInfo.cloudinaryEnabled ? 'text-green-900' : 'text-blue-900'
          }`}>
            {providerInfo.cloudinaryEnabled ? '☁️ Cloudinary Integration' : '📋 Upload Information'}
          </h4>
          <ul className={`text-sm space-y-1 ${
            providerInfo.cloudinaryEnabled ? 'text-green-800' : 'text-blue-800'
          }`}>
            <li>• Provider: <strong>{providerInfo.provider}</strong></li>
            <li>• Maximum file size: <strong>{Math.round(providerInfo.maxFileSize / (1024 * 1024))}MB</strong></li>
            <li>• Supported formats: <strong>{providerInfo.allowedFileTypes.map((type: string) => type.split('/')[1]).join(', ')}</strong></li>
            {providerInfo.cloudinaryEnabled && (
              <>
                <li>• ✓ Automatic image optimization and compression</li>
                <li>• ✓ Multiple image sizes generated on-demand</li>
                <li>• ✓ Global CDN delivery for fast loading</li>
                <li>• ✓ Automatic format conversion (WebP, AVIF)</li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileManager;