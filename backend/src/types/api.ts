// Base API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

// Pagination metadata interface
export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

// Paginated response interface
export interface PaginatedResponse<T> extends ApiResponse<T> {
  meta: PaginationMeta;
}

// Error response interface
export interface ErrorResponse extends ApiResponse {
  errors: any;
  stack?: string; // Only included in development
}

// Query parameters for pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Query parameters for search
export interface SearchParams {
  search?: string;
  searchFields?: string[];
}

// Combined query parameters
export interface QueryParams extends PaginationParams, SearchParams {
  [key: string]: any;
}
