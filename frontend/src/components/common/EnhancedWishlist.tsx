import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FaHeart,
  FaRegHeart,
  FaShare,
  FaTrash,
  FaCalendarPlus,
  FaMapMarkerAlt,
  FaDollarSign,
  FaStar,
  FaUsers,
  FaFilter,
  FaSort,
  FaTh,
  FaList,
  FaDownload,
  FaCalendarAlt,
  FaClock,
  FaEye,
  FaExternalLinkAlt
} from 'react-icons/fa';
import { format } from 'date-fns';
import { RootState, AppDispatch } from '../../store';
import LoadingSpinner from './LoadingSpinner';
import Modal from '../interactive/Modal';

interface WishlistItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  rating?: number;
  reviewCount?: number;
  location: {
    address: string;
    city: string;
  };
  dateSchedule: Array<{
    startDate: string;
    endDate: string;
    availableSeats: number;
    totalSeats: number;
  }>;
  images: string[];
  tags: string[];
  isFeatured: boolean;
  addedAt: string;
  reminderSet?: boolean;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
}

interface EnhancedWishlistProps {
  className?: string;
  compact?: boolean;
  showFilters?: boolean;
  maxItems?: number;
}

const EnhancedWishlist: React.FC<EnhancedWishlistProps> = ({
  className = '',
  compact = false,
  showFilters = true,
  maxItems
}) => {
  const dispatch = useDispatch<AppDispatch>();
  
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [sortBy, setSortBy] = useState<'added' | 'date' | 'price' | 'priority'>('added');
  const [filterBy, setFilterBy] = useState<'all' | 'upcoming' | 'available' | 'featured'>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [itemNotes, setItemNotes] = useState('');

  // Mock wishlist data - In real app, this would come from Redux store
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const mockItems: WishlistItem[] = [
        {
          _id: '1',
          title: 'Kids Summer Fun Day 2025',
          description: 'Amazing day of fun activities for children',
          category: 'Family & Kids',
          price: 75,
          currency: 'AED',
          rating: 4.8,
          reviewCount: 156,
          location: {
            address: 'Dubai Marina Beach',
            city: 'Dubai'
          },
          dateSchedule: [{
            startDate: '2025-09-15T10:00:00Z',
            endDate: '2025-09-15T16:00:00Z',
            availableSeats: 50,
            totalSeats: 150
          }],
          images: ['https://placehold.co/400x300?text=Summer+Fun'],
          tags: ['kids', 'outdoor', 'family'],
          isFeatured: true,
          addedAt: '2025-09-01T10:00:00Z',
          priority: 'high',
          reminderSet: true,
          notes: 'Perfect for Sarah\'s birthday!'
        },
        {
          _id: '2',
          title: 'Tech Conference Dubai 2025',
          description: 'Leading technology conference',
          category: 'Technology',
          price: 299,
          currency: 'AED',
          rating: 4.6,
          reviewCount: 89,
          location: {
            address: 'Dubai World Trade Centre',
            city: 'Dubai'
          },
          dateSchedule: [{
            startDate: '2025-10-15T09:00:00Z',
            endDate: '2025-10-17T18:00:00Z',
            availableSeats: 200,
            totalSeats: 500
          }],
          images: ['https://placehold.co/400x300?text=Tech+Conference'],
          tags: ['technology', 'networking', 'business'],
          isFeatured: false,
          addedAt: '2025-08-28T14:30:00Z',
          priority: 'medium'
        }
      ];
      
      setWishlistItems(mockItems);
      setFilteredItems(mockItems);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...wishlistItems];

    // Apply filters
    switch (filterBy) {
      case 'upcoming':
        filtered = filtered.filter(item => 
          new Date(item.dateSchedule[0].startDate) > new Date()
        );
        break;
      case 'available':
        filtered = filtered.filter(item => 
          item.dateSchedule[0].availableSeats > 0
        );
        break;
      case 'featured':
        filtered = filtered.filter(item => item.isFeatured);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'added':
        filtered.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
        break;
      case 'date':
        filtered.sort((a, b) => 
          new Date(a.dateSchedule[0].startDate).getTime() - 
          new Date(b.dateSchedule[0].startDate).getTime()
        );
        break;
      case 'price':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        break;
    }

    if (maxItems) {
      filtered = filtered.slice(0, maxItems);
    }

    setFilteredItems(filtered);
  }, [wishlistItems, filterBy, sortBy, maxItems]);

  const handleRemoveFromWishlist = (itemId: string) => {
    if (window.confirm('Remove this item from your wishlist?')) {
      setWishlistItems(prev => prev.filter(item => item._id !== itemId));
    }
  };

  const handleToggleReminder = (itemId: string) => {
    setWishlistItems(prev => prev.map(item =>
      item._id === itemId 
        ? { ...item, reminderSet: !item.reminderSet }
        : item
    ));
  };

  const handleUpdateNotes = () => {
    if (selectedItem) {
      setWishlistItems(prev => prev.map(item =>
        item._id === selectedItem._id 
          ? { ...item, notes: itemNotes }
          : item
      ));
      setShowNotesModal(false);
      setItemNotes('');
      setSelectedItem(null);
    }
  };

  const handleBulkRemove = () => {
    if (selectedItems.size > 0 && window.confirm(`Remove ${selectedItems.size} items from wishlist?`)) {
      setWishlistItems(prev => prev.filter(item => !selectedItems.has(item._id)));
      setSelectedItems(new Set());
    }
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item._id)));
    }
  };

  const handleShare = (item: WishlistItem) => {
    setSelectedItem(item);
    setShowShareModal(true);
  };

  const handleAddNotes = (item: WishlistItem) => {
    setSelectedItem(item);
    setItemNotes(item.notes || '');
    setShowNotesModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const exportWishlist = () => {
    const csvContent = [
      ['Title', 'Category', 'Price', 'Date', 'Location', 'Priority', 'Notes'].join(','),
      ...filteredItems.map(item => [
        `"${item.title}"`,
        item.category,
        `${item.price} ${item.currency}`,
        format(new Date(item.dateSchedule[0].startDate), 'yyyy-MM-dd'),
        `"${item.location.address}"`,
        item.priority,
        `"${item.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wishlist_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaHeart className="text-red-500" size={20} />
            <h3 className="text-lg font-medium text-gray-900">
              My Wishlist ({filteredItems.length})
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedItems.size > 0 && (
              <div className="flex items-center space-x-2 mr-4">
                <span className="text-sm text-gray-600">{selectedItems.size} selected</span>
                <button
                  onClick={handleBulkRemove}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            )}

            {showFilters && (
              <>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Items</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="available">Available</option>
                  <option value="featured">Featured</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="added">Date Added</option>
                  <option value="date">Event Date</option>
                  <option value="price">Price</option>
                  <option value="priority">Priority</option>
                </select>

                <div className="flex border border-gray-300 rounded">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <FaTh size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <FaList size={14} />
                  </button>
                </div>

                <button
                  onClick={exportWishlist}
                  className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
                  title="Export wishlist"
                >
                  <FaDownload size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {filteredItems.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">Select all</span>
            </label>
            
            <div className="text-sm text-gray-500">
              Showing {filteredItems.length} of {wishlistItems.length} items
            </div>
          </div>
        )}
      </div>

      {/* Wishlist Items */}
      <div className="p-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <FaRegHeart className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 mb-2">Your wishlist is empty</p>
            <p className="text-sm text-gray-400">Save your favorite events to see them here</p>
          </div>
        ) : (
          <div className={`${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
              : 'space-y-4'
          }`}>
            {filteredItems.map((item) => (
              <div
                key={item._id}
                className={`border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                {/* Selection checkbox */}
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item._id)}
                    onChange={() => handleItemSelect(item._id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                {/* Image */}
                <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'h-48'}`}>
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                  {item.reminderSet && (
                    <div className="absolute bottom-3 left-3">
                      <FaClock className="text-blue-500 bg-white rounded-full p-1" size={20} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 line-clamp-2">{item.title}</h4>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => handleShare(item)}
                        className="p-1 text-gray-400 hover:text-blue-500"
                        title="Share"
                      >
                        <FaShare size={14} />
                      </button>
                      <button
                        onClick={() => handleAddNotes(item)}
                        className="p-1 text-gray-400 hover:text-green-500"
                        title="Add notes"
                      >
                        <FaCalendarPlus size={14} />
                      </button>
                      <button
                        onClick={() => handleRemoveFromWishlist(item._id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Remove from wishlist"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{item.category}</span>
                      <div className="flex items-center space-x-1">
                        <FaStar className="text-yellow-500" size={12} />
                        <span>{item.rating?.toFixed(1)}</span>
                        <span className="text-gray-400">({item.reviewCount})</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <FaCalendarAlt size={12} />
                        <span>{format(new Date(item.dateSchedule[0].startDate), 'MMM dd')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FaMapMarkerAlt size={12} />
                        <span>{item.location.city}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <FaDollarSign size={12} />
                        <span className="font-medium">{item.price} {item.currency}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <FaUsers size={12} />
                        <span>{item.dateSchedule[0].availableSeats}/{item.dateSchedule[0].totalSeats}</span>
                      </div>
                    </div>

                    {item.notes && (
                      <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
                        {item.notes}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleReminder(item._id)}
                      className={`flex items-center px-3 py-1 text-xs rounded-full border ${
                        item.reminderSet
                          ? 'bg-blue-50 text-blue-600 border-blue-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <FaClock size={10} className="mr-1" />
                      {item.reminderSet ? 'Reminder Set' : 'Set Reminder'}
                    </button>
                    
                    <button className="flex items-center px-3 py-1 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700">
                      <FaEye size={10} className="mr-1" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share Event"
        size="sm"
      >
        {selectedItem && (
          <div className="p-6">
            <div className="mb-4">
              <h4 className="font-medium text-gray-900">{selectedItem.title}</h4>
              <p className="text-sm text-gray-600">{selectedItem.location.address}</p>
            </div>
            
            <div className="space-y-3">
              <button className="w-full flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <FaExternalLinkAlt size={14} className="mr-2" />
                Copy Link
              </button>
              <button className="w-full flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <FaShare size={14} className="mr-2" />
                Share on Social Media
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Notes Modal */}
      <Modal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        title="Add Notes"
        size="md"
      >
        {selectedItem && (
          <div className="p-6">
            <div className="mb-4">
              <h4 className="font-medium text-gray-900">{selectedItem.title}</h4>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal Notes
              </label>
              <textarea
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add your personal notes about this event..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateNotes}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Notes
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EnhancedWishlist;