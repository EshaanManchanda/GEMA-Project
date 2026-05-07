import React, { useState, useEffect, useCallback } from 'react';
import { Image, Plus, Trash2, FolderOpen, RefreshCw } from 'lucide-react';
import { galleryAPI, type Gallery, type GalleryImage } from '../../services/api/reviewLinkAPI';
import api from '../../services/api';
import MediaPickerModal from '../admin/media/MediaPickerModal';
import { MediaAsset } from '../../store/slices/mediaSlice';
import toast from 'react-hot-toast';

interface EventGalleryEditorProps {
  eventId?: string;
}

const EventGalleryEditor: React.FC<EventGalleryEditorProps> = ({ eventId }) => {
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [layout, setLayout] = useState<'grid' | 'messy'>('grid');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const fetchGallery = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await galleryAPI.getByEvent(eventId);
      const g = res.data?.data?.gallery;
      if (g) {
        setGallery(g);
        setLayout(g.type);
        setImages(g.images || []);
      } else {
        setLayout('grid');
        setImages([]);
      }
    } catch {
      setLayout('grid');
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const handleMediaSelect = (assets: MediaAsset[]) => {
    const newImage: GalleryImage[] = assets.map((a, i) => ({
      url: a.url,
      caption: a.originalName,
      order: images.length + i,
      size: 'medium' as const,
    }));
    setImages(prev => [...prev, ...newImage]);
    setShowMediaPicker(false);
  };

  const addImage = async () => {
    const url = urlInput.trim();
    if (!url) return;

    // Extract UUID from URL if it's a media file URL
    const match = url.match(/\/media\/file\/([a-f0-9-]+)$/i);
    const uuid = match ? match[1] : null;

    // Validate if it's a media file URL
    if (uuid) {
      try {
        const res = await api.get(`/media/validate/${uuid}`);
        if (!res.data?.exists) {
          toast.error('Image not found in media library. Please upload through Media tab first.');
          return;
        }
      } catch (err) {
        toast.error('Invalid image URL. Please upload through Media tab first.');
        return;
      }
    }

    setImages(prev => [...prev, { url, order: prev.length, size: 'medium' }]);
    setUrlInput('');
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const updateImage = (idx: number, patch: Partial<GalleryImage>) => {
    setImages(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const handleSave = async () => {
    if (!eventId) {
      toast.error('Please save the event first before creating a gallery.');
      return;
    }
    
    setSaving(true);
    try {
      if (gallery) {
        await galleryAPI.update(gallery._id, { type: layout, images });
      } else {
        const res = await galleryAPI.create({ eventId, type: layout, images });
        setGallery(res.data?.data?.gallery);
      }
      toast.success('Gallery saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save gallery');
    } finally {
      setSaving(false);
    }
  };

  const handleRepair = async () => {
    if (!gallery) return;
    setSaving(true);
    try {
      const res = await api.post(`/galleries/repair/${gallery._id}`);
      toast.success(res.data?.message || 'Gallery repaired');
      // Refresh gallery
      const fresh = await galleryAPI.getByEvent(eventId!);
      setGallery(fresh.data?.data?.gallery);
      setImages(fresh.data?.data?.gallery?.images || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to repair gallery');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!gallery) return;
    if (!confirm('Delete this gallery? This cannot be undone.')) return;
    try {
      await galleryAPI.update(gallery._id, { images: [] });
      setGallery(null);
      setImages([]);
      toast.success('Gallery cleared');
    } catch {
      toast.error('Failed to delete gallery');
    }
  };

  if (!eventId) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <Image className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">Event not saved yet</p>
        <p className="text-xs text-gray-400 mt-1">Please save the event basic details first before adding a gallery.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {gallery ? `Gallery ID: ${gallery._id}` : 'No gallery created yet'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Layout Style:</label>
          <select
            value={layout}
            onChange={e => setLayout(e.target.value as 'grid' | 'messy')}
            className="text-sm px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="grid">Grid Layout</option>
            <option value="messy">Masonry Layout</option>
          </select>
        </div>
      </div>

      {/* Image list */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative border border-gray-200 rounded-xl overflow-hidden group shadow-sm bg-white">
              <img
                src={img.url}
                alt={img.caption || `Image ${idx + 1}`}
                className="w-full h-32 object-cover"
                onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x200?text=Image+Not+Found'; }}
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-2 right-2 bg-red-500/90 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-600 transition-all shadow-sm"
              >
                ×
              </button>
              <div className="p-2 space-y-2 bg-gray-50 border-t border-gray-100">
                <input
                  type="text"
                  value={img.caption || ''}
                  onChange={e => updateImage(idx, { caption: e.target.value })}
                  placeholder="Caption (optional)"
                  className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                />
                <select
                  value={img.size}
                  onChange={e => updateImage(idx, { size: e.target.value as GalleryImage['size'] })}
                  className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                >
                  <option value="small">Small (1:1)</option>
                  <option value="medium">Medium (4:3)</option>
                  <option value="large">Large (16:9)</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Image className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No images added to this gallery yet.</p>
        </div>
      )}

      {/* Add images */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Add Images</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setShowMediaPicker(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-primary-300 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors text-sm font-medium bg-white"
          >
            <FolderOpen className="w-4 h-4" /> Browse Media Library
          </button>
          <div className="flex-1 flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImage())}
              placeholder="Or paste external image URL..."
              className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
            <button
              type="button"
              onClick={addImage}
              className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-6">
        <div className="flex gap-2">
          {gallery && (
            <>
              <button
                type="button"
                onClick={handleRepair}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-orange-600 border border-orange-200 bg-orange-50 rounded-lg hover:bg-orange-100 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Repair Sync
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 text-sm font-bold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-70 flex items-center gap-2 transition-all shadow-sm"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : gallery ? 'Update Gallery' : 'Create Gallery'}
        </button>
      </div>

      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        category="event"
        folder="events"
        multiple={true}
        title="Select Gallery Images"
      />
    </div>
  );
};

export default EventGalleryEditor;
