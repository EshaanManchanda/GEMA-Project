import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Eye, EyeOff, Star } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import ReelForm from '../../components/admin/ReelForm';
import reelsAPI, { Reel } from '../../services/api/reelsAPI';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';

const ReelsManagementPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'public' | 'draft' | 'archived' | ''>('');

  const queryClient = useQueryClient();

  // Debounce search to avoid excessive queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch reels
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-reels', page, search, visibilityFilter],
    queryFn: () =>
      reelsAPI.getAllReels({
        page,
        limit: 20,
        search: search || undefined,
        visibility: visibilityFilter || undefined
      }),
    staleTime: 60000,           // Data fresh for 1 minute
    gcTime: 300000,             // Cache persists for 5 minutes (renamed from cacheTime in v5)
    refetchOnWindowFocus: false // Don't refetch on window focus
  });
  logger.debug("reels:", data);

  // Create reel mutation
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

  // Update reel mutation
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

  // Delete reel mutation
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

  // Toggle visibility mutation
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
    const colors = {
      public: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      archived: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[visibility as keyof typeof colors]}`}>
        {visibility}
      </span>
    );
  }, []);

  return (
    <>
      <PrivatePageSEO title="Admin - Reels | Kidrove" description="Manage video reels" />
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Reels Management</CardTitle>
              <Button onClick={handleCreate}>
                <Plus className="mr-2" size={18} />
                Create Reel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-6 flex gap-4">
              <input
                type="text"
                placeholder="Search reels..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Visibility</option>
                <option value="public">Public</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading reels...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-red-600">Failed to load reels</p>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-reels'] })} className="mt-4">
                  Retry
                </Button>
              </div>
            )}

            {/* Table */}
            {!isLoading && !error && data && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thumbnail</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visibility</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Featured</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Views</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Likes</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Order</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(!data?.data?.reels || data.data.reels.length === 0) ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                            No reels found. Create your first reel to get started.
                          </td>
                        </tr>
                      ) : (
                        data.data.reels.map((reel) => (
                          <tr key={reel._id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <img
                                src={reel.thumbnailAsset?.url || reel.videoAsset?.thumbnailUrl || '/placeholder.jpg'}
                                alt={reel.title}
                                className="w-16 h-28 object-cover rounded"
                                loading="lazy"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-medium text-gray-900">{reel.title}</div>
                              {reel.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {reel.description}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${reel.videoSourceType === 'uploaded' ? 'bg-blue-100 text-blue-800' :
                                  reel.videoSourceType === 'youtube' ? 'bg-red-100 text-red-800' :
                                    'bg-purple-100 text-purple-800'
                                }`}>
                                {reel.videoSourceType === 'uploaded' ? 'Uploaded' :
                                  reel.videoSourceType === 'youtube' ? 'YouTube' :
                                    'Instagram'}
                              </span>
                            </td>
                            <td className="px-4 py-4">{getVisibilityBadge(reel.visibility)}</td>
                            <td className="px-4 py-4 text-center">
                              {reel.isFeatured ? (
                                <Star className="inline-block text-yellow-500" size={18} fill="currentColor" />
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-4 text-center text-gray-700">{reel.viewsCount.toLocaleString()}</td>
                            <td className="px-4 py-4 text-center text-gray-700">{reel.likes.toLocaleString()}</td>
                            <td className="px-4 py-4 text-center text-gray-700">{reel.displayOrder}</td>
                            <td className="px-4 py-4 text-gray-700">{formatDate(reel.createdAt)}</td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleToggleVisibility(reel)}
                                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title={reel.visibility === 'public' ? 'Set to Draft' : 'Publish'}
                                >
                                  {reel.visibility === 'public' ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                                <button
                                  onClick={() => handleEdit(reel)}
                                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleDelete(reel._id, reel.title)}
                                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {(data?.data?.pagination?.pages || 0) > 1 && (
                  <div className="mt-6 flex justify-between items-center">
                    <p className="text-sm text-gray-700">
                      Showing page {data?.data?.pagination?.page || 1} of {data?.data?.pagination?.pages || 1} ({data?.data?.pagination?.total || 0} total)
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
                        onClick={() => setPage((p) => Math.min(data.data.pagination.pages, p + 1))}
                        disabled={page === data.data.pagination.pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

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
