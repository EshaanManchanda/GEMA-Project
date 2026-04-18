import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@shared/components/ui/Button';
import { cn } from '@shared/utils/cn';

interface EventFiltersProps {
  categories: Array<{ id: string; name: string }>;
  cities: string[];
  onFilterChange: (filters: EventFilterState) => void;
  onReset: () => void;
  activeFilters: EventFilterState;
}

export interface EventFilterState {
  category?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  isFree?: boolean;
}

export function EventFilters({ categories, cities, onFilterChange, onReset, activeFilters }: EventFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<EventFilterState>(activeFilters);

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '');
  const filterCount = Object.values(filters).filter((v) => v !== undefined && v !== '').length;

  const applyFilters = () => {
    onFilterChange(filters);
    setIsOpen(false);
  };

  const resetFilters = () => {
    setFilters({});
    onReset();
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        leftIcon={<Filter className="h-4 w-4" />}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(hasActiveFilters && 'border-primary text-primary')}
      >
        Filters {filterCount > 0 && `(${filterCount})`}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <select
                value={filters.city || ''}
                onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value || undefined }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin || ''}
                  onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax || ''}
                  onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Free Only */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="free-only"
                checked={filters.isFree || false}
                onChange={(e) => setFilters((f) => ({ ...f, isFree: e.target.checked || undefined }))}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="free-only" className="text-sm text-gray-700">Free events only</label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Button variant="ghost" fullWidth onClick={resetFilters}>
                Reset
              </Button>
              <Button fullWidth onClick={applyFilters}>
                Apply
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
