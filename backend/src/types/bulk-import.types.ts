import { Document } from 'mongoose';

// Model names supported for bulk import/export
export type ModelName =
  | 'Category'
  | 'User'
  | 'Event'
  | 'Blog'
  | 'Collection'
  | 'Coupon'
  | 'Order'
  | 'Payment'
  | 'Payout'
  | 'CommissionTransaction';

// Import options
export interface ImportOptions {
  model: ModelName;
  mode: 'create' | 'upsert';
  matchBy: 'id' | 'slug' | 'email' | 'code' | 'orderNumber' | 'transactionId';
  allowPartialSuccess?: boolean; // Default: false (all-or-nothing)
}

// Validation report
export interface ValidationReport {
  valid: boolean;
  validationId: string;
  summary: ValidationSummary;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  expiresAt: Date;
}

export interface ValidationSummary {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  warnings: number;
}

export interface ValidationError {
  row: number;
  field?: string;
  message: string;
  severity: 'error';
  value?: any;
}

export interface ValidationWarning {
  row: number;
  field?: string;
  message: string;
  severity: 'warning';
  value?: any;
}

// Import result
export interface ImportResult {
  success: boolean;
  summary: ImportSummary;
  errors: ImportError[];
  duration: string;
}

export interface ImportSummary {
  totalProcessed: number;
  created: number;
  updated: number;
  failed: number;
  skipped: number;
}

export interface ImportError {
  row: number;
  action: 'create' | 'update' | 'skip';
  message: string;
  data?: any;
}

// Export filters
export interface ExportFilters {
  // Common filters
  dateRange?: {
    field: 'createdAt' | 'updatedAt' | 'publishedAt' | 'validFrom' | 'validUntil';
    start?: string;
    end?: string;
  };
  status?: string | string[];
  isActive?: boolean;
  limit?: number;

  // Model-specific filters
  vendorId?: string;
  vendorEmail?: string;
  categoryId?: string;
  categorySlug?: string;
  role?: string;
  type?: string;
  paymentStatus?: string;
}

// Export options
export interface ExportOptions {
  model: ModelName;
  format: 'json'; // CSV in phase 2
  filters?: ExportFilters;
  includeRelationships?: boolean;
  fields?: string[]; // Specific fields to export (default: all)
}

// Export result
export interface ExportResult {
  success: boolean;
  metadata: ExportMetadata;
  data: any[];
  relationships?: Record<string, any[]>;
}

export interface ExportMetadata {
  exportedAt: Date;
  exportedBy: string; // Admin email
  model: ModelName;
  totalRecords: number;
  filters?: ExportFilters;
  fields?: string[];
}

// Validation context stored in Redis
export interface ValidationContext {
  validationId: string;
  userId: string; // Admin who initiated
  options: ImportOptions;
  data: any[];
  resolvedData: ResolvedRecord[]; // Data with relationships resolved
  report: ValidationReport;
  createdAt: Date;
  expiresAt: Date;
}

// Record with resolved relationships
export interface ResolvedRecord {
  original: any;
  resolved: any; // With IDs populated from readable names
  index: number; // Row number in import file
}

// Relationship resolution result
export interface RelationshipResolution {
  field: string;
  inputValue: any;
  resolvedId?: string;
  resolvedName?: string;
  error?: string;
}

// Audit log entry
export interface BulkOperationAudit {
  action: 'bulk_import' | 'bulk_export';
  model: ModelName;
  userId: string; // Admin email
  timestamp: Date;
  recordCount: number;
  filters?: ExportFilters;
  options?: ImportOptions;
  duration?: string;
  success: boolean;
  errorMessage?: string;
}

// Dependency graph for import ordering
export interface DependencyGraph {
  [key: string]: string[]; // model → dependencies
}

// Field sanitization config
export interface SanitizationConfig {
  model: ModelName;
  excludeFields: string[]; // Never export
  maskFields: string[]; // Mask sensitive data (last 4 chars)
}
