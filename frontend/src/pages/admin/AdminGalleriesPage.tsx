import React, { useState, useEffect, useCallback } from 'react';
import { Image, Search, Trash2, Plus, FolderOpen, RefreshCw } from 'lucide-react';
import { galleryAPI, type Gallery, type GalleryImage } from '../../services/api/reviewLinkAPI';
import api from '../../services/api';
import adminAPI from '../../services/api/adminAPI';
import MediaPickerModal from '../../components/admin/media/MediaPickerModal';
import { MediaAsset } from '../../store/slices/mediaSlice';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';

interface EventOption {
  _id: string;
  title: string;
  slug?: string;
}

const AdminGalleriesPage: React.FC = () => {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [search, setSearch] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Gallery editor state
  const [selected, setSelected] = useState<EventOption | null>(null);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [layout, setLayout] = useState<'grid' | 'messy'>('grid');
  const [images, setImage] = useState<GalleryImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const handleMediaSelect = (assets: MediaAsset[]) => {
    const newImage: GalleryImage[] = assets.map((a, i) => ({
      url: a.url,
      caption: a.originalName,
      order: images.length + i,
      size: 'medium' as const,
    }));
    setImage(prev => [...prev, ...newImage]);
    setShowMediaPicker(false);
  };

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await adminAPI.getEvents({ limit: 200, status: 'published' });
      const list: EventOption[] = (res?.events || res?.data?.events || []).map((e: any) => ({
        _id: e._id || e.id,
        title: e.title,
        slug: e.slug,
      }));
      setEvents(list);
    } catch (err) {
      logger.error('Failed to fetch events', err);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const openEditor = async (event: EventOption) => {
    setSelected(event);
    setGallery(null);
    setImage([]);
    try {
      const res = await galleryAPI.getByEvent(event._id);
      const g = res.data?.data?.gallery;
      if (g) {
        setGallery(g);
        setLayout(g.type);
        setImage(g.images || []);
      } else {
        setLayout('grid');
        setImage([]);
      }
    } catch {
      setLayout('grid');
      setImage([]);
    }
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

    setImage(prev => [...prev, { url, order: prev.length, size: 'medium' }]);
    setUrlInput('');
  };

  const removeImage = (idx: number) => setImage(prev => prev.filter((_, i) => i !== idx));

  const updateImage = (idx: number, patch: Partial<GalleryImage>) => {
    setImage(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      if (gallery) {
        await galleryAPI.update(gallery._id, { type: layout, images });
      } else {
        const res = await galleryAPI.create({ eventId: selected._id, type: layout, images });
        setGallery(res.data?.data);
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
      const fresh = await galleryAPI.getByEvent(selected!._id);
      setGallery(fresh.data?.data?.gallery);
      setImage(fresh.data?.data?.gallery?.images || []);
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
      setImage([]);
      toast.success('Gallery cleared');
    } catch {
      toast.error('Failed to delete gallery');
    }
  };

  const filtered = events.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Image className="text-indigo-600 w-7 h-7" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Galleries</h1>
          <p className="text-sm text-gray-500">Manage photo galleries for events</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event list */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search events…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {loadingEvents ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading events…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No events found</p>
            ) : (
              filtered.map(event => (
                <button
                  key={event._id}
                  onClick={() => openEditor(event)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-indigo-50 transition-colors ${selected?._id === event._id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{event._id}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Gallery editor */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Image className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Select an event to manage its gallery</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{selected.title}</h2>
                  <p className="text-xs text-gray-400">{gallery ? `Gallery ID: ${gallery._id}` : 'No gallery yet'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Layout:</label>
                  <select
                    value={layout}
                    onChange={e => setLayout(e.target.value as 'grid' | 'messy')}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg"
                  >
                    <option value="grid">Grid</option>
                    <option value="messy">Masonry</option>
                  </select>
                </div>
              </div>

              {/* Image list */}
              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative border rounded-lg overflow-hidden group">
                      <img
                        src={img.url}
                        alt={img.caption || `Image ${idx + 1}`}
                        className="w-full h-24 object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x150?text=Image'; }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      >
                        ×
                      </button>
                      <div className="p-1.5 space-y-1">
                        <input
                          type="text"
                          value={img.caption || ''}
                          onChange={e => updateImage(idx, { caption: e.target.value })}
                          placeholder="Caption"
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded"
                        />
                        <select
                          value={img.size}
                          onChange={e => updateImage(idx, { size: e.target.value as GalleryImage['size'] })}
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded"
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
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <p className="text-sm text-gray-400">No images yet. Add image URLs below.</p>
                </div>
              )}

              {/* Add images */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Add Image</p>
                {/* Media Library button */}
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-medium"
                >
                  <FolderOpen className="w-4 h-4" /> Pick from Media Library
                </button>
                {/* Or paste URL */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addImage()}
                    placeholder="Or paste image URL…"
                    className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addImage}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-2 border-t border-gray-100">
                {gallery && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRepair}
                      disabled={saving}
                      className="px-4 py-2 text-sm text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-50 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Repair
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Gallery
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="ml-auto px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? 'Saving…' : gallery ? 'Update Gallery' : 'Create Gallery'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        category="event"
        folder="events"
        multiple={true}
        title="Select Gallery Image"
      />
    </div>
  );
};

export default AdminGalleriesPage;
