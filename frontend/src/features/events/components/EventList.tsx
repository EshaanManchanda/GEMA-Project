import { useMemo, useState } from 'react';
import { EventCard } from './EventCard';
import { Input } from '@shared/components/ui/Input';
import { EmptyState } from '@shared/components/common/EmptyState';
import { Pagination } from '@shared/components/ui/Pagination';
import { useDebounce } from '@shared/hooks/useDebounce';

interface Event {
  _id: string;
  title: string;
  description?: string;
  image?: string;
  startDate?: string;
  location?: { city?: string; address?: string };
  price?: number;
  currency?: string;
  averageRating?: number;
  reviewCount?: number;
  attendeeCount?: number;
  category?: string;
  isFeatured?: boolean;
}

interface EventListProps {
  events: Event[];
  isLoading: boolean;
  error: Error | null;
  pagination?: { currentPage: number; totalPages: number; total: number };
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  emptyMessage?: string;
}

export function EventList({
  events,
  isLoading,
  error,
  pagination,
  onPageChange,
  onSearch,
  emptyMessage = 'No events found',
}: EventListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredEvents = useMemo(() => {
    if (!debouncedSearch) return events;
    const q = debouncedSearch.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.city?.toLowerCase().includes(q),
    );
  }, [events, debouncedSearch]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg overflow-hidden border border-gray-200">
            <div className="aspect-video bg-gray-100 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-5 bg-gray-100 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Failed to load events"
        description={error.message}
        actionLabel="Try Again"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div>
      {/* Search */}
      {onSearch && (
        <div className="mb-6">
          <Input
            placeholder="Search events by name, location, or description..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearch(e.target.value);
            }}
            className="max-w-md"
          />
        </div>
      )}

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <EmptyState title={emptyMessage} description="Try adjusting your search or filters." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard
                key={event._id}
                id={event._id}
                title={event.title}
                description={event.description}
                image={event.image}
                startDate={event.startDate}
                location={event.location}
                price={event.price}
                currency={event.currency}
                rating={event.averageRating}
                reviewCount={event.reviewCount}
                attendeeCount={event.attendeeCount}
                category={event.category}
                isFeatured={event.isFeatured}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && onPageChange && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
