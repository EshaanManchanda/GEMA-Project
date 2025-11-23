import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import Button from './Button';
import Input from './Input';
import LoadingSpinner from '../common/LoadingSpinner';

export interface TableColumn<T = any> {
  key: string;
  label: string | React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface TablePagination {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
}

export interface TableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string;
  pagination?: TablePagination;
  sort?: TableSort;
  searchQuery?: string;
  selectedRows?: string[];
  rowKey?: string;
  
  // Event handlers
  onSort?: (sort: TableSort) => void;
  onSearch?: (query: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onRowSelect?: (selectedRows: string[]) => void;
  onRowClick?: (row: T, index: number) => void;
  
  // Customization
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  emptyMessage?: string;
  className?: string;
  tableClassName?: string;
  showSearch?: boolean;
  showPagination?: boolean;
  showExport?: boolean;
  showRefresh?: boolean;
  selectable?: boolean;
  stickyHeader?: boolean;
  responsive?: boolean;
  compact?: boolean;
}

const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  error,
  pagination,
  sort,
  searchQuery = '',
  selectedRows = [],
  rowKey = 'id',
  
  onSort,
  onSearch,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  onExport,
  onRowSelect,
  onRowClick,
  
  title,
  subtitle,
  actions,
  emptyMessage = 'No data available',
  className,
  tableClassName,
  showSearch = true,
  showPagination = true,
  showExport = false,
  showRefresh = false,
  selectable = false,
  stickyHeader = false,
  responsive = true,
  compact = false,
}: DataTableProps<T>) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Memoized filtered and sorted data for local operations
  const processedData = useMemo(() => {
    let result = [...data];

    // Local search if no server-side search
    if (localSearchQuery && !onSearch) {
      const searchableColumns = columns.filter(col => col.searchable !== false);
      result = result.filter(row =>
        searchableColumns.some(col =>
          String(row[col.key]).toLowerCase().includes(localSearchQuery.toLowerCase())
        )
      );
    }

    // Local sorting if no server-side sort
    if (sort && !onSort) {
      result.sort((a, b) => {
        const aValue = a[sort.key];
        const bValue = b[sort.key];
        
        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, localSearchQuery, sort, columns, onSearch, onSort]);

  // Handle search
  const handleSearch = (query: string) => {
    setLocalSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  // Handle column sort
  const handleSort = (columnKey: string) => {
    if (!onSort) return;

    const direction = sort?.key === columnKey && sort.direction === 'asc' ? 'desc' : 'asc';
    onSort({ key: columnKey, direction });
  };

  // Handle row selection
  const handleRowSelect = (rowId: string, selected: boolean) => {
    if (!onRowSelect) return;

    const newSelection = selected
      ? [...selectedRows, rowId]
      : selectedRows.filter(id => id !== rowId);

    onRowSelect(newSelection);
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (!onRowSelect) return;

    const allRowIds = processedData.map(row => String(row[rowKey]));
    onRowSelect(selected ? allRowIds : []);
  };

  // Get sort icon for column
  const getSortIcon = (columnKey: string) => {
    if (sort?.key !== columnKey) return <ChevronsUpDown className="h-4 w-4" />;
    return sort.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
  };

  // Check if all visible rows are selected
  const allRowsSelected = selectable && selectedRows.length > 0 && 
    processedData.every(row => selectedRows.includes(String(row[rowKey])));

  const someRowsSelected = selectable && selectedRows.length > 0 && selectedRows.length < processedData.length;

  return (
    <div className={clsx('bg-white rounded-lg shadow', className)}>
      {/* Header */}
      {(title || subtitle || actions || showSearch || showExport || showRefresh) && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              {showSearch && (
                <div className="relative">
                  <Input
                    placeholder="Search..."
                    value={localSearchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    leftIcon={<Search className="h-4 w-4" />}
                    size="sm"
                    className="w-64"
                  />
                </div>
              )}
              
              {/* Refresh */}
              {showRefresh && onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Refresh
                </Button>
              )}
              
              {/* Export */}
              {showExport && onExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExport}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Export
                </Button>
              )}
              
              {/* Custom Actions */}
              {actions}
            </div>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className={clsx(
        'overflow-hidden',
        responsive && 'overflow-x-auto'
      )}>
        <table className={clsx(
          'min-w-full divide-y divide-gray-200',
          tableClassName
        )}>
          {/* Table Head */}
          <thead className={clsx(
            'bg-gray-50',
            stickyHeader && 'sticky top-0 z-10'
          )}>
            <tr>
              {/* Select All Checkbox */}
              {selectable && (
                <th className="px-6 py-3 w-12">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={allRowsSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someRowsSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              
              {/* Column Headers */}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:bg-gray-100',
                    column.headerClassName
                  )}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                  }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center">
                  <LoadingSpinner size="large" />
                  <p className="mt-2 text-gray-500">Loading...</p>
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="text-red-500">
                    <p className="font-medium">Error loading data</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </td>
              </tr>
            )}

            {!loading && !error && processedData.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center">
                  <p className="text-gray-500">{emptyMessage}</p>
                </td>
              </tr>
            )}

            {!loading && !error && processedData.map((row, index) => {
              const rowId = String(row[rowKey]);
              const isSelected = selectedRows.includes(rowId);

              return (
                <tr
                  key={rowId}
                  className={clsx(
                    'hover:bg-gray-50 transition-colors',
                    isSelected && 'bg-blue-50',
                    onRowClick && 'cursor-pointer',
                    compact ? 'h-12' : 'h-16'
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {/* Row Selection Checkbox */}
                  {selectable && (
                    <td className="px-6 py-4 w-12">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRowSelect(rowId, e.target.checked);
                        }}
                      />
                    </td>
                  )}

                  {/* Row Data */}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={clsx(
                        'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(row[column.key], row, index)
                        : String(row[column.key] || '')
                      }
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && pagination && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>Showing</span>
              <select
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={pagination.pageSize}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              >
                {(pagination.pageSizeOptions || [10, 25, 50, 100]).map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span>of {pagination.total} results</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page <= 1}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Previous
              </Button>
              
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;