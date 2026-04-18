import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface AdminFilterBarProps {
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  onReset?: () => void;
  filters?: Array<{ key: string; label: string; options: Array<{ label: string; value: string }> }>;
  className?: string;
}

export function AdminFilterBar({ onSearch, onFilterChange, onReset, filters, className }: AdminFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = searchQuery || Object.values(filterValues).some(Boolean);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filterValues, [key]: value };
    setFilterValues(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleReset = () => {
    setSearchQuery('');
    setFilterValues({});
    onSearch?.('');
    onFilterChange?.({});
    onReset?.();
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {filters && filters.length > 0 && (
          <>
            <button onClick={() => setIsOpen(!isOpen)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2">
              Filters {hasActiveFilters && <span className="w-2 h-2 bg-primary rounded-full" />}
            </button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </>
        )}
      </div>

      {isOpen && filters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
          {filters.map((filter) => (
            <div key={filter.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{filter.label}</label>
              <select
                value={filterValues[filter.key] || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
