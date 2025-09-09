import React, { useState, useMemo } from 'react';
import { FaSort, FaSortUp, FaSortDown, FaSearch, FaFilter, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import LoadingSpinner from '../common/LoadingSpinner';

export interface Column<T = any> {
  key: string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface ActionButton<T = any> {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (record: T, index: number) => void;
  className?: string;
  show?: (record: T) => boolean;
}

interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
  };
  actions?: ActionButton<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  filterable?: boolean;
  onFilter?: (filters: Record<string, any>) => void;
  rowKey?: keyof T | ((record: T) => string);
  className?: string;
  emptyText?: string;
  rowClassName?: (record: T, index: number) => string;
  onRowClick?: (record: T, index: number) => void;
  selectable?: boolean;
  selectedRowKeys?: string[];
  onSelectionChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
}

function DataTable<T = any>({
  data,
  columns,
  loading = false,
  pagination,
  actions,
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch,
  filterable = false,
  onFilter,
  rowKey = '_id' as keyof T,
  className = '',
  emptyText = 'No data available',
  rowClassName,
  onRowClick,
  selectable = false,
  selectedRowKeys = [],
  onSelectionChange
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return String(record[rowKey] || index);
  };

  // Handle sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  // Handle filter
  const handleFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter?.(newFilters);
  };

  // Sort data locally if no external sorting
  const sortedData = useMemo(() => {
    if (!sortKey || onSearch) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortKey as keyof T];
      const bValue = b[sortKey as keyof T];

      if (aValue === bValue) return 0;

      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection, onSearch]);

  // Filter data locally if no external filtering
  const filteredData = useMemo(() => {
    if (!searchValue || onSearch) return sortedData;

    return sortedData.filter(record =>
      columns.some(column => {
        const value = record[column.key as keyof T];
        return String(value).toLowerCase().includes(searchValue.toLowerCase());
      })
    );
  }, [sortedData, searchValue, columns, onSearch]);

  // Handle row selection
  const handleRowSelect = (record: T, selected: boolean) => {
    if (!selectable || !onSelectionChange) return;

    const recordKey = getRowKey(record, 0);
    let newSelectedKeys;
    
    if (selected) {
      newSelectedKeys = [...selectedRowKeys, recordKey];
    } else {
      newSelectedKeys = selectedRowKeys.filter(key => key !== recordKey);
    }

    const selectedRows = data.filter(row => 
      newSelectedKeys.includes(getRowKey(row, 0))
    );

    onSelectionChange(newSelectedKeys, selectedRows);
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (!selectable || !onSelectionChange) return;

    if (selected) {
      const allKeys = filteredData.map((record, index) => getRowKey(record, index));
      onSelectionChange(allKeys, filteredData);
    } else {
      onSelectionChange([], []);
    }
  };

  const isAllSelected = selectable && filteredData.length > 0 && 
    filteredData.every((record, index) => selectedRowKeys.includes(getRowKey(record, index)));

  const isSomeSelected = selectable && selectedRowKeys.length > 0 && !isAllSelected;

  // Render sort icon
  const renderSortIcon = (columnKey: string) => {
    if (!sortKey || sortKey !== columnKey) {
      return <FaSort className="text-gray-400" size={12} />;
    }
    return sortDirection === 'asc' ? 
      <FaSortUp className="text-blue-500" size={12} /> : 
      <FaSortDown className="text-blue-500" size={12} />;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header Controls */}
      {(searchable || filterable) && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {searchable && (
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            
            {filterable && (
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <FaFilter className="mr-2" size={14} />
                Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isSomeSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${column.className || ''}`}
                  style={{ width: column.width, textAlign: column.align }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
              
              {actions && actions.length > 0 && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-4 py-8 text-center">
                  <LoadingSpinner size="medium" />
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-4 py-8 text-center text-gray-500">
                  {emptyText}
                </td>
              </tr>
            ) : (
              filteredData.map((record, index) => {
                const recordKey = getRowKey(record, index);
                const isSelected = selectedRowKeys.includes(recordKey);
                
                return (
                  <tr
                    key={recordKey}
                    className={`
                      hover:bg-gray-50 transition-colors
                      ${isSelected ? 'bg-blue-50' : ''}
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${rowClassName ? rowClassName(record, index) : ''}
                    `}
                    onClick={() => onRowClick?.(record, index)}
                  >
                    {selectable && (
                      <td className="px-4 py-3 whitespace-nowrap w-12">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleRowSelect(record, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-3 whitespace-nowrap ${column.className || ''}`}
                        style={{ textAlign: column.align }}
                      >
                        {column.render 
                          ? column.render(record[column.key as keyof T], record, index)
                          : String(record[column.key as keyof T] || '')
                        }
                      </td>
                    ))}
                    
                    {actions && actions.length > 0 && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          {actions.map((action) => {
                            if (action.show && !action.show(record)) return null;
                            
                            return (
                              <button
                                key={action.key}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.onClick(record, index);
                                }}
                                className={`p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${action.className || ''}`}
                                title={action.label}
                              >
                                {action.icon}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => pagination.current > 1 && pagination.onChange(pagination.current - 1, pagination.pageSize)}
                disabled={pagination.current <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
                  if (pagination.current < totalPages) {
                    pagination.onChange(pagination.current + 1, pagination.pageSize);
                  }
                }}
                disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {Math.min((pagination.current - 1) * pagination.pageSize + 1, pagination.total)}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.current * pagination.pageSize, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.total}</span>{' '}
                  results
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {pagination.showSizeChanger && pagination.pageSizeOptions && (
                  <select
                    value={pagination.pageSize}
                    onChange={(e) => pagination.onChange(1, Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    {pagination.pageSizeOptions.map(size => (
                      <option key={size} value={size}>{size} / page</option>
                    ))}
                  </select>
                )}
                
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => pagination.current > 1 && pagination.onChange(pagination.current - 1, pagination.pageSize)}
                    disabled={pagination.current <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.ceil(pagination.total / pagination.pageSize) }, (_, i) => i + 1)
                    .filter(page => {
                      const current = pagination.current;
                      return page === 1 || page === Math.ceil(pagination.total / pagination.pageSize) || 
                             (page >= current - 1 && page <= current + 1);
                    })
                    .map((page, index, array) => {
                      if (index > 0 && array[index - 1] !== page - 1) {
                        return (
                          <React.Fragment key={`ellipsis-${page}`}>
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                            <button
                              onClick={() => pagination.onChange(page, pagination.pageSize)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === pagination.current
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      }
                      
                      return (
                        <button
                          key={page}
                          onClick={() => pagination.onChange(page, pagination.pageSize)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.current
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })
                  }
                  
                  <button
                    onClick={() => {
                      const totalPages = Math.ceil(pagination.total / pagination.pageSize);
                      if (pagination.current < totalPages) {
                        pagination.onChange(pagination.current + 1, pagination.pageSize);
                      }
                    }}
                    disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;