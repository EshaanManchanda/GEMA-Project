import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { Save, X, Video, Image as ImageIcon, Tag, Search } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import MediaPickerModal from './media/MediaPickerModal';
import { MediaAsset } from '../../store/slices/mediaSlice';
import { Reel } from '../../services/api/reelsAPI';
import adminAPI from '../../services/api/adminAPI';
import logger from '../../utils/logger';

const reelSchema = yup.object().shape({
  title: yup.string().required('Title is required').max(200, 'Title cannot exceed 200 characters'),
  description: yup.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  videoSourceType: yup.string().oneOf(['uploaded', 'youtube', 'instagram']).required('Video source type is required'),
  videoAsset: yup.string().when('videoSourceType', {
    is: 'uploaded',
    then: (schema) => schema.required('Video is required for uploaded videos'),
    otherwise: (schema) => schema.optional()
  }),
  externalVideoUrl: yup.string().when('videoSourceType', {
    is: (val: string) => val === 'youtube' || val === 'instagram',
    then: (schema) => schema.required('Video URL is required').url('Invalid URL format'),
    otherwise: (schema) => schema.optional()
  }),
  embedCode: yup.string().optional(),
  thumbnailAsset: yup.string().optional(),
  visibility: yup.string().oneOf(['public', 'draft', 'archived']).required('Visibility is required'),
  isFeatured: yup.boolean().optional(),
  displayOrder: yup.number().min(0, 'Display order must be 0 or greater').required('Display order is required'),
  tags: yup.array().of(yup.string().max(50, 'Each tag cannot exceed 50 characters')).max(20, 'Maximum 20 tags allowed').optional(),
  showLikeButton: yup.boolean().optional(),
  showShareButton: yup.boolean().optional(),
  showTitle: yup.boolean().optional(),
  linkedEvent: yup.string().optional()
});

interface ReelFormProps {
  reel?: Reel | null;
  onClose: () => void;
  onSubmit: (data: Partial<Reel>) => Promise<void>;
}

const ReelForm: React.FC<ReelFormProps> = ({ reel, onClose, onSubmit }) => {
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  const [showThumbnailPicker, setShowThumbnailPicker] = useState(false);
  const [selectedVideoAsset, setSelectedVideoAsset] = useState<MediaAsset | null>(null);
  const [selectedThumbnailAsset, setSelectedThumbnailAsset] = useState<MediaAsset | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(reelSchema),
    defaultValues: {
      title: '',
      description: '',
      videoSourceType: 'uploaded' as 'uploaded' | 'youtube' | 'instagram',
      videoAsset: '',
      externalVideoUrl: '',
      embedCode: '',
      thumbnailAsset: '',
      visibility: 'draft' as 'public' | 'draft' | 'archived',
      isFeatured: false,
      displayOrder: 0,
      tags: [],
      showLikeButton: true,
      showShareButton: true,
      showTitle: true,
      linkedEvent: ''
    }
  });

  const watchedTags = watch('tags');
  const watchedVideoSourceType = watch('videoSourceType');

  const filteredEvents = useMemo(() => {
    if (!eventSearch.trim()) return events;
    return events.filter(event =>
      event.title?.toLowerCase().includes(eventSearch.toLowerCase())
    );
  }, [events, eventSearch]);

  const selectedEvent = useMemo(() => {
    return events.find(e => e._id === watch('linkedEvent'));
  }, [events, watch('linkedEvent')]);

  useEffect(() => {
    if (reel) {
      reset({
        title: reel.title,
        description: reel.description || '',
        videoSourceType: reel.videoSourceType || 'uploaded',
        videoAsset: reel.videoAsset?._id || '',
        externalVideoUrl: reel.externalVideoUrl || '',
        embedCode: reel.embedCode || '',
        thumbnailAsset: reel.thumbnailAsset?._id || '',
        visibility: reel.visibility,
        isFeatured: reel.isFeatured,
        displayOrder: reel.displayOrder,
        tags: reel.tags || [],
        showLikeButton: reel.showLikeButton !== undefined ? reel.showLikeButton : true,
        showShareButton: reel.showShareButton !== undefined ? reel.showShareButton : true,
        showTitle: reel.showTitle !== undefined ? reel.showTitle : true,
        linkedEvent: reel.linkedEvent?._id || ''
      });

      if (reel.videoAsset) {
        setSelectedVideoAsset(reel.videoAsset as any);
      }
      if (reel.thumbnailAsset) {
        setSelectedThumbnailAsset(reel.thumbnailAsset as any);
      }
    } else {
      reset({
        title: '',
        description: '',
        videoSourceType: 'uploaded',
        videoAsset: '',
        externalVideoUrl: '',
        embedCode: '',
        thumbnailAsset: '',
        visibility: 'draft',
        isFeatured: false,
        displayOrder: 0,
        tags: [],
        showLikeButton: true,
        showShareButton: true,
        showTitle: true,
        linkedEvent: ''
      });
      setSelectedVideoAsset(null);
      setSelectedThumbnailAsset(null);
    }
  }, [reel, reset]);

  // Fetch events when modal opens
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        const response = await adminAPI.getEvents({ limit: 100 });
        setEvents(response.data?.events || []);
      } catch (error) {
        logger.error('Failed to fetch events:', error);
        toast.error('Failed to load events');
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleVideoSelect = (assets: MediaAsset[]) => {
    if (assets.length > 0) {
      setSelectedVideoAsset(assets[0]);
      setValue('videoAsset', assets[0]._id);
      setShowVideoPicker(false);
    }
  };

  const handleThumbnailSelect = (assets: MediaAsset[]) => {
    if (assets.length > 0) {
      setSelectedThumbnailAsset(assets[0]);
      setValue('thumbnailAsset', assets[0]._id);
      setShowThumbnailPicker(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && watchedTags && watchedTags.length < 20) {
      const newTags = [...(watchedTags as string[]), tagInput.trim()];
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    if (watchedTags) {
      const newTags = (watchedTags as string[]).filter((_, i) => i !== index);
      setValue('tags', newTags);
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save reel');
    }
  };

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title={reel ? 'Edit Reel' : 'Create Reel'} size="lg">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reel Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Title"
                    placeholder="Enter reel title"
                    error={errors.title?.message}
                    required
                  />
                )}
              />

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      placeholder="Enter reel description (optional)"
                      rows={3}
                      className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:outline-none transition-all duration-200 placeholder-gray-400 text-gray-900"
                    />
                  )}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Video Source Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Source <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="videoSourceType"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          value="uploaded"
                          checked={field.value === 'uploaded'}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="mr-2 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Upload Video</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          value="youtube"
                          checked={field.value === 'youtube'}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="mr-2 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">YouTube</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          value="instagram"
                          checked={field.value === 'instagram'}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="mr-2 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Instagram</span>
                      </label>
                    </div>
                  )}
                />
                {errors.videoSourceType && (
                  <p className="mt-1 text-sm text-red-500">{errors.videoSourceType.message}</p>
                )}
              </div>

              {/* Video Input - Conditional based on source type */}
              {watchedVideoSourceType === 'uploaded' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video <span className="text-red-500">*</span>
                  </label>
                  {selectedVideoAsset ? (
                    <div className="border border-gray-300 rounded-lg p-4 space-y-3">
                      <video
                        src={selectedVideoAsset.url}
                        className="w-full h-64 object-cover rounded"
                        controls
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{selectedVideoAsset.filename}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowVideoPicker(true)}
                        >
                          Change Video
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowVideoPicker(true)}
                      className="w-full"
                    >
                      <Video className="mr-2" size={18} />
                      Select Video
                    </Button>
                  )}
                  {errors.videoAsset && (
                    <p className="mt-1 text-sm text-red-500">{errors.videoAsset.message}</p>
                  )}
                </div>
              )}

              {/* YouTube URL Input */}
              {watchedVideoSourceType === 'youtube' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube URL <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="externalVideoUrl"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="url"
                        placeholder="https://www.youtube.com/shorts/..."
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:outline-none transition-all"
                      />
                    )}
                  />
                  {errors.externalVideoUrl && (
                    <p className="mt-1 text-sm text-red-500">{errors.externalVideoUrl.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Paste the YouTube video URL (Shorts, regular videos, or embed links supported)
                  </p>
                </div>
              )}

              {/* Instagram URL Input */}
              {watchedVideoSourceType === 'instagram' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram Reel URL <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="externalVideoUrl"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="url"
                        placeholder="https://www.instagram.com/reel/..."
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:outline-none transition-all"
                      />
                    )}
                  />
                  {errors.externalVideoUrl && (
                    <p className="mt-1 text-sm text-red-500">{errors.externalVideoUrl.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Paste the Instagram reel URL (e.g., https://www.instagram.com/reel/ABC123/)
                  </p>
                </div>
              )}

              {/* Thumbnail Asset (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thumbnail (optional)
                </label>
                {selectedThumbnailAsset ? (
                  <div className="border border-gray-300 rounded-lg p-4 space-y-3">
                    <img
                      src={selectedThumbnailAsset.url}
                      alt="Thumbnail"
                      className="w-full h-48 object-cover rounded"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{selectedThumbnailAsset.filename}</span>
                      <div className="space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowThumbnailPicker(true)}
                        >
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedThumbnailAsset(null);
                            setValue('thumbnailAsset', '');
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowThumbnailPicker(true)}
                    className="w-full"
                  >
                    <ImageIcon className="mr-2" size={18} />
                    Select Thumbnail
                  </Button>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (max 20)
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Enter tag and press Enter"
                    maxLength={50}
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim() || (watchedTags && watchedTags.length >= 20)}
                  >
                    <Tag size={18} />
                  </Button>
                </div>
                {watchedTags && watchedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(watchedTags as string[]).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {errors.tags && (
                  <p className="mt-1 text-sm text-red-500">{errors.tags.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Visibility */}
              <Controller
                name="visibility"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visibility
                    </label>
                    <select
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="public">Public</option>
                      <option value="archived">Archived</option>
                    </select>
                    {errors.visibility && (
                      <p className="mt-1 text-sm text-red-500">{errors.visibility.message}</p>
                    )}
                  </div>
                )}
              />

              {/* Featured */}
              <Controller
                name="isFeatured"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured Reel</span>
                  </label>
                )}
              />

              {/* Display Order */}
              <Controller
                name="displayOrder"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    label="Display Order"
                    placeholder="0"
                    min={0}
                    error={errors.displayOrder?.message}
                    required
                  />
                )}
              />
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Controller
                name="showTitle"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Show Title & Description</span>
                  </label>
                )}
              />
              <Controller
                name="showLikeButton"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Show Like Button</span>
                  </label>
                )}
              />
              <Controller
                name="showShareButton"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Show Share Button</span>
                  </label>
                )}
              />
            </CardContent>
          </Card>

          {/* Event Linking */}
          <Card>
            <CardHeader>
              <CardTitle>Event Linking</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="linkedEvent"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link to Event (Optional)
                    </label>

                    <div className="relative">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={isEventDropdownOpen ? eventSearch : (selectedEvent?.title || '')}
                          onChange={(e) => {
                            setEventSearch(e.target.value);
                            if (!isEventDropdownOpen) setIsEventDropdownOpen(true);
                          }}
                          onFocus={() => setIsEventDropdownOpen(true)}
                          placeholder={eventsLoading ? 'Loading events...' : 'Search events...'}
                          disabled={eventsLoading}
                          className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        {/* Clear button */}
                        {field.value && (
                          <button
                            type="button"
                            onClick={() => {
                              field.onChange('');
                              setEventSearch('');
                              setIsEventDropdownOpen(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown */}
                      {isEventDropdownOpen && (
                        <>
                          {/* Backdrop */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => {
                              setIsEventDropdownOpen(false);
                              setEventSearch('');
                            }}
                          />

                          {/* Options List */}
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {eventsLoading ? (
                              <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                                Loading events...
                              </div>
                            ) : filteredEvents.length === 0 ? (
                              <div className="p-4 text-center text-gray-500">
                                {eventSearch ? 'No events found' : 'No events available'}
                              </div>
                            ) : (
                              <>
                                {/* "No event linked" option */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    field.onChange('');
                                    setIsEventDropdownOpen(false);
                                    setEventSearch('');
                                  }}
                                  className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${!field.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                                    }`}
                                >
                                  No event linked
                                </button>

                                {/* Event options */}
                                {filteredEvents.map((event) => (
                                  <button
                                    key={event._id}
                                    type="button"
                                    onClick={() => {
                                      field.onChange(event._id);
                                      setIsEventDropdownOpen(false);
                                      setEventSearch('');
                                    }}
                                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-t border-gray-100 ${field.value === event._id
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'text-gray-700'
                                      }`}
                                  >
                                    <div className="font-medium">{event.title}</div>
                                    {event.category && (
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {event.category.name || event.category}
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      Link this reel to an event to show a "Book Event" button
                    </p>
                  </div>
                )}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2" size={18} />
              {isSubmitting ? 'Saving...' : reel ? 'Update Reel' : 'Create Reel'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Video Picker Modal */}
      {showVideoPicker && (
        <MediaPickerModal
          {...({
            isOpen: showVideoPicker,
            onClose: () => setShowVideoPicker(false),
            onSelect: handleVideoSelect,
            multiple: false,
            title: 'Select Video',
            allowedTypes: ['video/mp4', 'video/webm', 'video/mov'],
          } as any)}
        />
      )}

      {/* Thumbnail Picker Modal */}
      {showThumbnailPicker && (
        <MediaPickerModal
          {...({
            isOpen: showThumbnailPicker,
            onClose: () => setShowThumbnailPicker(false),
            onSelect: handleThumbnailSelect,
            multiple: false,
            title: 'Select Thumbnail',
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
          } as any)}
        />
      )}
    </>
  );
};

export default ReelForm;
