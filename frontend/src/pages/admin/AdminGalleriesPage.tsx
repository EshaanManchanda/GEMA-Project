import React, { useState, useEffect, useCallback } from 'react';
import { Image, Search, Trash2, Plus, FolderOpen, RefreshCw } from 'lucide-react';
import { galleryAPI, type Gallery, type GalleryImage } from '../../services/api/reviewLinkAPI';
import api from '../../services/api';
import adminAPI from '../../services/api/adminAPI';
import MediaPickerModal from '../../components/admin/media/MediaPickerModal';
import { MediaAsset } from '../../store/slices/mediaSlice';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';
import EventGalleryEditor from '../../components/common/EventGalleryEditor';

interface EventOption {
  _id: string;
  title: string;
  slug?: string;
}

const AdminGalleriesPage: React.FC = () => {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [search, setSearch] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [selected, setSelected] = useState<EventOption | null>(null);

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

  const openEditor = (event: EventOption) => {
    setSelected(event);
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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-semibold text-gray-900 text-lg">{selected.title}</h2>
                </div>
              </div>

              <EventGalleryEditor eventId={selected._id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminGalleriesPage;
