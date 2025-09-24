import React from 'react';
import { Monitor, Smartphone, Twitter, Facebook } from 'lucide-react';

interface SEOPreviewProps {
  title: string;
  description: string;
  url: string;
  ogImage?: string;
  siteName?: string;
}

const SEOPreview: React.FC<SEOPreviewProps> = ({
  title,
  description,
  url,
  ogImage,
  siteName = 'Gema Events'
}) => {
  const [activePreview, setActivePreview] = React.useState<'google' | 'facebook' | 'twitter'>('google');

  // Truncate text for display
  const truncateTitle = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const truncateDescription = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return `${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return url;
    }
  };

  const GooglePreview = () => (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="text-xs text-gray-600 mb-1">{formatUrl(url)}</div>
      <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer mb-1">
        {truncateTitle(title, 60)}
      </div>
      <div className="text-gray-600 text-sm leading-relaxed">
        {truncateDescription(description, 160)}
      </div>
    </div>
  );

  const FacebookPreview = () => (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white max-w-md">
      {ogImage && (
        <div className="w-full h-40 bg-gray-200 overflow-hidden">
          <img
            src={ogImage}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="text-gray-500 text-xs uppercase mb-1">{formatUrl(url)}</div>
        <div className="text-gray-900 font-semibold text-sm mb-1 leading-tight">
          {truncateTitle(title, 88)}
        </div>
        <div className="text-gray-600 text-xs leading-relaxed">
          {truncateDescription(description, 300)}
        </div>
      </div>
    </div>
  );

  const TwitterPreview = () => (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-w-md">
      {ogImage && (
        <div className="w-full h-48 bg-gray-200 overflow-hidden">
          <img
            src={ogImage}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="text-gray-900 font-semibold text-sm mb-1 leading-tight">
          {truncateTitle(title, 70)}
        </div>
        <div className="text-gray-600 text-sm leading-relaxed mb-2">
          {truncateDescription(description, 200)}
        </div>
        <div className="text-gray-500 text-xs flex items-center">
          <Monitor className="w-3 h-3 mr-1" />
          {formatUrl(url)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Preview Type Selector */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActivePreview('google')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activePreview === 'google'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Google</span>
        </button>
        <button
          onClick={() => setActivePreview('facebook')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activePreview === 'facebook'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Facebook className="w-4 h-4" />
          <span>Facebook</span>
        </button>
        <button
          onClick={() => setActivePreview('twitter')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activePreview === 'twitter'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Twitter className="w-4 h-4" />
          <span>Twitter</span>
        </button>
      </div>

      {/* Preview Content */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-1">
            {activePreview === 'google' && 'Google Search Result Preview'}
            {activePreview === 'facebook' && 'Facebook Share Preview'}
            {activePreview === 'twitter' && 'Twitter Card Preview'}
          </h4>
          <p className="text-xs text-gray-500">
            {activePreview === 'google' && 'How your content will appear in Google search results'}
            {activePreview === 'facebook' && 'How your content will appear when shared on Facebook'}
            {activePreview === 'twitter' && 'How your content will appear as a Twitter card'}
          </p>
        </div>

        <div className="flex justify-center">
          {activePreview === 'google' && <GooglePreview />}
          {activePreview === 'facebook' && <FacebookPreview />}
          {activePreview === 'twitter' && <TwitterPreview />}
        </div>
      </div>

      {/* Character Limits Info */}
      <div className="bg-blue-50 rounded-lg p-3">
        <h5 className="text-sm font-medium text-blue-900 mb-2">Character Limits</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div>
            <div className="font-medium text-blue-800">Title</div>
            <div className="text-blue-600">
              Google: 60 chars • Facebook: 88 chars • Twitter: 70 chars
            </div>
          </div>
          <div>
            <div className="font-medium text-blue-800">Description</div>
            <div className="text-blue-600">
              Google: 160 chars • Facebook: 300 chars • Twitter: 200 chars
            </div>
          </div>
          <div>
            <div className="font-medium text-blue-800">Current</div>
            <div className="text-blue-600">
              Title: {title.length} • Description: {description.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SEOPreview;