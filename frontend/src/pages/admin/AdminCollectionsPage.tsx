import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  BarChart,
  RefreshCw,
  Grid,
  List
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CollectionForm from '../../components/admin/CollectionForm';
import collectionsAPI, { Collection, CollectionStats } from '../../services/api/collectionsAPI';

const AdminCollectionsPage: React.FC = () => {
  // State for collections data
  const [collections, setCollections] = useState<Collection[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCollections, setTotalCollections] = useState(0);
  const [limit] = useState(10);

  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'sortOrder' | 'title' | 'createdAt' | 'category'>('sortOrder');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // State for selection
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  // State for modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingCollectionId, setDeletingCollectionId] = useState<string | null>(null);
  const [bulkActionConfirmOpen, setBulkActionConfirmOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);

  // Fetch collections
  const fetchCollections = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const params: any = {
        page: currentPage,
        limit,
        sortBy,
        sortOrder,
      };

      if (searchQuery) params.search = searchQuery;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active' ? 'true' : 'false';
      }

      const response = await collectionsAPI.getAdminCollections(params);

      setCollections(response.collections || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalCollections(response.pagination?.totalCollections || 0);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, limit, searchQuery, categoryFilter, statusFilter, sortBy, sortOrder]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const statsData = await collectionsAPI.getCollectionStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCollections();
    fetchStats();
  }, [fetchCollections, fetchStats]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchCollections();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Refetch when filters change
  useEffect(() => {
    if (currentPage === 1) {
      fetchCollections();
    } else {
      setCurrentPage(1);
    }
  }, [categoryFilter, statusFilter, sortBy, sortOrder]);

  // Handle create
  const handleCreate = () => {
    setEditingCollection(null);
    setIsFormOpen(true);
  };

  // Handle edit
  const handleEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setIsFormOpen(true);
  };

  // Handle form submit
  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingCollection) {
        await collectionsAPI.updateCollection(editingCollection._id, formData);
        toast.success('Collection updated successfully');
      } else {
        await collectionsAPI.createCollection(formData);
        toast.success('Collection created successfully');
      }

      fetchCollections(true);
      fetchStats();
      setIsFormOpen(false);
      setEditingCollection(null);
    } catch (error: any) {
      console.error('Error saving collection:', error);
      toast.error(error.message || 'Failed to save collection');
      throw error; // Re-throw to keep modal open
    }
  };

  // Handle delete click
  const handleDeleteClick = (collectionId: string) => {
    setDeletingCollectionId(collectionId);
    setDeleteConfirmOpen(true);
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!deletingCollectionId) return;

    try {
      await collectionsAPI.deleteCollection(deletingCollectionId);
      toast.success('Collection deleted successfully');
      fetchCollections(true);
      fetchStats();
      setDeleteConfirmOpen(false);
      setDeletingCollectionId(null);
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Failed to delete collection');
    }
  };

  // Handle selection
  const handleSelectAll = () => {
    if (selectedCollections.length === collections.length) {
      setSelectedCollections([]);
    } else {
      setSelectedCollections(collections.map(c => c._id));
    }
  };

  const handleSelectOne = (collectionId: string) => {
    setSelectedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  // Handle bulk action click
  const handleBulkActionClick = (action: 'activate' | 'deactivate' | 'delete') => {
    setBulkAction(action);
    setBulkActionConfirmOpen(true);
  };

  // Handle bulk action confirm
  const handleBulkActionConfirm = async () => {
    if (!bulkAction || selectedCollections.length === 0) return;

    try {
      if (bulkAction === 'delete') {
        // Delete selected collections
        await Promise.all(selectedCollections.map(id => collectionsAPI.deleteCollection(id)));
        toast.success(`${selectedCollections.length} collection(s) deleted successfully`);
      } else {
        // Update isActive status
        await collectionsAPI.bulkUpdateCollections(selectedCollections, {
          isActive: bulkAction === 'activate'
        });
        toast.success(`${selectedCollections.length} collection(s) ${bulkAction}d successfully`);
      }

      fetchCollections(true);
      fetchStats();
      setSelectedCollections([]);
      setBulkActionConfirmOpen(false);
      setBulkAction(null);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  // Get unique categories
  const uniqueCategories = [...new Set(collections.map(c => c.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Collections Management</h1>
            <p className="text-gray-600 mt-1">Manage curated collections of events and activities</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus size={16} className="mr-1" />
            Create Collection
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Collections</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCollections}</p>
                  </div>
                  <Grid className="text-blue-500" size={32} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-green-600">{stats.activeCollections}</p>
                  </div>
                  <CheckCircle className="text-green-500" size={32} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Inactive</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.inactiveCollections}</p>
                  </div>
                  <XCircle className="text-gray-500" size={32} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Categories</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.categoriesCount}</p>
                  </div>
                  <List className="text-purple-500" size={32} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search collections..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex gap-2 mt-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md"
              >
                <option value="sortOrder">Sort Order</option>
                <option value="title">Title</option>
                <option value="category">Category</option>
                <option value="createdAt">Created Date</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchCollections(true)}
                disabled={isRefreshing}
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedCollections.length > 0 && (
          <Card className="mb-4 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-900">
                  {selectedCollections.length} collection(s) selected
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleBulkActionClick('activate')}
                  >
                    <CheckCircle size={14} className="mr-1" />
                    Activate
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleBulkActionClick('deactivate')}
                  >
                    <XCircle size={14} className="mr-1" />
                    Deactivate
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleBulkActionClick('delete')}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collections Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading collections...</div>
            ) : collections.length === 0 ? (
              <div className="p-8 text-center">
                <Grid className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No collections found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery || categoryFilter || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Get started by creating your first collection'}
                </p>
                {(!searchQuery && !categoryFilter && statusFilter === 'all') && (
                  <Button onClick={handleCreate}>
                    <Plus size={16} className="mr-1" />
                    Create Collection
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedCollections.length === collections.length}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Icon
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Events
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sort Order
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {collections.map((collection) => (
                        <tr key={collection._id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedCollections.includes(collection._id)}
                              onChange={() => handleSelectOne(collection._id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                              <img
                                src={collection.icon}
                                alt={collection.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(collection.title)}&size=40&background=6DB0E1&color=fff`;
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{collection.title}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{collection.description}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {collection.category ? (
                              <Badge variant="secondary">{collection.category}</Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-900">
                              {collection.eventsCount || collection.events?.length || 0}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-900">{collection.sortOrder}</span>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant={collection.isActive ? 'success' : 'secondary'}>
                              {collection.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/collections/${collection._id}`}
                                target="_blank"
                                className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                title="View"
                              >
                                <Eye size={16} />
                              </Link>
                              <button
                                onClick={() => handleEdit(collection)}
                                className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(collection._id)}
                                className="p-1 text-red-600 hover:text-red-800 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalCollections)} of {totalCollections} collections
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            if (totalPages <= 7) return true;
                            if (page === 1 || page === totalPages) return true;
                            if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                            return false;
                          })
                          .map((page, index, array) => (
                            <React.Fragment key={page}>
                              {index > 0 && array[index - 1] !== page - 1 && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1 rounded text-sm ${
                                  currentPage === page
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          ))}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
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
      </div>

      {/* Collection Form Modal */}
      <CollectionForm
        collection={editingCollection}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCollection(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingCollectionId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Collection"
        message="Are you sure you want to delete this collection? This action will deactivate the collection."
        type="danger"
      />

      {/* Bulk Action Confirmation Dialog */}
      <ConfirmDialog
        isOpen={bulkActionConfirmOpen}
        onClose={() => {
          setBulkActionConfirmOpen(false);
          setBulkAction(null);
        }}
        onConfirm={handleBulkActionConfirm}
        title={`${bulkAction === 'delete' ? 'Delete' : bulkAction === 'activate' ? 'Activate' : 'Deactivate'} Collections`}
        message={`Are you sure you want to ${bulkAction} ${selectedCollections.length} collection(s)?`}
        type={bulkAction === 'delete' ? 'danger' : 'warning'}
      />
    </div>
  );
};

export default AdminCollectionsPage;
