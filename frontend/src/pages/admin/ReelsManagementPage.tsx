import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Eye, EyeOff, Star, ExternalLink, Play, X, Film, Search } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import ReelForm from '../../components/admin/ReelForm';
import reelsAPI, { Reel } from '../../services/api/reelsAPI';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';

function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/]+)/,
    /youtube\.com\/embed\/([^?/]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractInstagramId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/instagram\.com\/(?:reel|reels|p)\/([^/?]+)/);
  return match ? match[1] : null;
}

function getInstagramEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const id = extractInstagramId(url);
  if (!id) return null;
  return `https://www.instagram.com/reel/${id}/embed/`;
}

function getReelThumbnail(reel: Reel): string {
  if (reel.thumbnailAsset?.url) return reel.thumbnailAsset.url;
  if (reel.videoAsset?.thumbnailUrl) return reel.videoAsset.thumbnailUrl;
  if (reel.videoSourceType === 'youtube') {
    const ytId = extractYouTubeId(reel.externalVideoUrl);
    if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
  }
  return '';
}

function getYouTubeEmbedUrl(url?: string): string | null {
  const ytId = extractYouTubeId(url);
  if (!ytId) return null;
  return `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
}

const ReelsManagementPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [previewReel, setPreviewReel] = useState<Reel | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'public' | 'draft' | 'archived' | ''>('');

  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-reels', page, search, visibilityFilter],
    queryFn: () =>
      reelsAPI.getAllReels({
        page,
        limit: 20,
        search: search || undefined,
        visibility: visibilityFilter || undefined
      }),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false
  });
  logger.debug("reels:", data);

  const reels = data?.data?.reels || [];
  const pagination = data?.data?.pagination;

  const createMutation = useMutation({
    mutationFn: reelsAPI.createReel,
    onSuccess: () => {
      toast.success('Reel created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-reels'] });
      setShowForm(false);
      setSelectedReel(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create reel');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      reelsAPI.updateReel(id, data),
    onSuccess: () => {
      toast.success('Reel updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-reels'] });
      setShowForm(false);
      setSelectedReel(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update reel');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: reelsAPI.deleteReel,
    onSuccess: () => {
      toast.success('Reel deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-reels'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete reel');
    }
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: 'public' | 'draft' | 'archived' }) =>
      reelsAPI.updateVisibility(id, visibility),
    onSuccess: () => {
      toast.success('Visibility updated');
      queryClient.invalidateQueries({ queryKey: ['admin-reels'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update visibility');
    }
  });

  const handleCreate = () => {
    setSelectedReel(null);
    setShowForm(true);
  };

  const handleEdit = (reel: Reel) => {
    setSelectedReel(reel);
    setShowForm(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleVisibility = (reel: Reel) => {
    const newVisibility = reel.visibility === 'public' ? 'draft' : 'public';
    toggleVisibilityMutation.mutate({ id: reel._id, visibility: newVisibility });
  };

  const handleSubmit = async (data: Partial<Reel>) => {
    if (selectedReel) {
      updateMutation.mutate({ id: selectedReel._id, data });
    } else {
      createMutation.mutate(data as any);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVisibilityBadge = useCallback((visibility: string) => {
    const styles: Record<string, string> = {
      public: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[visibility] || styles.draft}`}>
        {visibility}
      </span>
    );
  }, []);

  const getSourceBadge = useCallback((sourceType: string) => {
    const styles: Record<string, string> = {
      uploaded: 'bg-blue-100 text-blue-800',
      youtube: 'bg-red-100 text-red-800',
      instagram: 'bg-purple-100 text-purple-800'
    };
    const labels: Record<string, string> = {
      uploaded: 'Uploaded',
      youtube: 'YouTube',
      instagram: 'Instagram'
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${styles[sourceType] || styles.uploaded}`}>
        {labels[sourceType] || sourceType}
      </span>
    );
  }, []);

  return (
    <>
      <PrivatePageSEO title="Admin - Reels | Kidrove" description="Manage video reels" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reels Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              {pagination ? `${pagination.total} reel${pagination.total !== 1 ? 's' : ''} total` : 'Manage your video reels'}
            </p>
          </div>
          <Button onClick={handleCreate} className="shrink-0">
            <Plus className="mr-2" size={18} />
            Create Reel
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search reels by title..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value as any)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">All Visibility</option>
                <option value="public">Public</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
            <p className="mt-3 text-gray-500">Loading reels...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card>
            <CardContent className="text-center py-16">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="text-red-500" size={32} />
              </div>
              <p className="text-red-600 font-medium">Failed to load reels</p>
              <p className="text-gray-500 text-sm mt-1">Check your connection and try again</p>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-reels'] })} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Reels Grid/Table */}
        {!isLoading && !error && data && (
          <>
            {reels.length === 0 ? (
              <Card>
                <CardContent className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Film className="text-gray-400" size={32} />
                  </div>
                  <p className="text-gray-900 font-medium">No reels found</p>
                  <p className="text-gray-500 text-sm mt-1">Create your first reel to get started</p>
                  <Button onClick={handleCreate} className="mt-4">
                    <Plus className="mr-2" size={18} />
                    Create Reel
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/80">
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reel</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                          <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                          <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                          <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reels.map((reel) => {
                          const thumbnail = getReelThumbnail(reel);
                          return (
                            <tr key={reel._id} className="hover:bg-blue-50/30 transition-colors">
                              {/* Reel Info (thumbnail + title) */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-4">
                                  <div
                                    className="relative w-20 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0 cursor-pointer group"
                                    onClick={() => setPreviewReel(reel)}
                                  >
                                    {thumbnail ? (
                                      <img
                                        src={thumbnail}
                                        alt={reel.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : reel.videoSourceType === 'instagram' ? (
                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
                                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                                      </div>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Film className="text-gray-300" size={24} />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Play className="text-white" size={20} fill="white" />
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-gray-900 truncate max-w-[200px]">{reel.title}</div>
                                    {reel.description && (
                                      <div className="text-sm text-gray-500 truncate max-w-[200px] mt-0.5">
                                        {reel.description}
                                      </div>
                                    )}
                                    {reel.isFeatured && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <Star className="text-yellow-500" size={12} fill="currentColor" />
                                        <span className="text-xs text-yellow-600 font-medium">Featured</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Source */}
                              <td className="px-5 py-4">
                                <div className="flex flex-col gap-1.5">
                                  {getSourceBadge(reel.videoSourceType)}
                                  {reel.externalVideoUrl && (
                                    <a
                                      href={reel.externalVideoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                      <ExternalLink size={10} />
                                      Open
                                    </a>
                                  )}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-5 py-4">{getVisibilityBadge(reel.visibility)}</td>

                              {/* Stats */}
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                                  <div className="text-center" title="Views">
                                    <div className="font-semibold text-gray-900">{reel.viewsCount.toLocaleString()}</div>
                                    <div className="text-xs text-gray-400">views</div>
                                  </div>
                                  <div className="text-center" title="Likes">
                                    <div className="font-semibold text-gray-900">{reel.likes.toLocaleString()}</div>
                                    <div className="text-xs text-gray-400">likes</div>
                                  </div>
                                </div>
                              </td>

                              {/* Order */}
                              <td className="px-5 py-4 text-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-sm font-medium text-gray-700">
                                  {reel.displayOrder}
                                </span>
                              </td>

                              {/* Date */}
                              <td className="px-5 py-4 text-sm text-gray-600">{formatDate(reel.createdAt)}</td>

                              {/* Actions */}
                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => setPreviewReel(reel)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Preview"
                                  >
                                    <Play size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleToggleVisibility(reel)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title={reel.visibility === 'public' ? 'Set to Draft' : 'Publish'}
                                  >
                                    {reel.visibility === 'public' ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                  <button
                                    onClick={() => handleEdit(reel)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(reel._id, reel.title)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {(pagination?.pages || 0) > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-gray-600">
                  Page {pagination?.page || 1} of {pagination?.pages || 1} ({pagination?.total || 0} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(pagination!.pages, p + 1))}
                    disabled={page === pagination!.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Video Preview Modal */}
        {previewReel && (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewReel(null)}
          >
            <div
              className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 truncate">{previewReel.title}</h3>
                <button
                  onClick={() => setPreviewReel(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className={`bg-black ${previewReel.videoSourceType === 'instagram' ? 'aspect-[9/16] max-h-[70vh]' : 'aspect-video'}`}>
                {previewReel.videoSourceType === 'youtube' && previewReel.externalVideoUrl ? (
                  <iframe
                    src={getYouTubeEmbedUrl(previewReel.externalVideoUrl) || ''}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={previewReel.title}
                  />
                ) : previewReel.videoSourceType === 'instagram' && previewReel.externalVideoUrl ? (
                  <iframe
                    src={getInstagramEmbedUrl(previewReel.externalVideoUrl) || ''}
                    className="w-full h-full border-0"
                    allowFullScreen
                    title={previewReel.title}
                  />
                ) : previewReel.videoAsset?.url ? (
                  <video
                    src={previewReel.videoAsset.url}
                    controls
                    autoPlay
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Film size={48} className="mx-auto mb-2" />
                      <p>No video available</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-5 py-3 flex items-center justify-between text-sm text-gray-500 border-t border-gray-100">
                <div className="flex gap-4">
                  <span>{previewReel.viewsCount.toLocaleString()} views</span>
                  <span>{previewReel.likes.toLocaleString()} likes</span>
                </div>
                <div className="flex items-center gap-2">
                  {getVisibilityBadge(previewReel.visibility)}
                  {getSourceBadge(previewReel.videoSourceType)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <ReelForm
            reel={selectedReel}
            onClose={() => {
              setShowForm(false);
              setSelectedReel(null);
            }}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </>
  );
};

export default ReelsManagementPage;
