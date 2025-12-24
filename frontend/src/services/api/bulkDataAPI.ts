import { ApiService } from '../api';

/**
 * Bulk Import/Export API Client
 * Handles communication with backend bulk data endpoints
 */

export interface ImportOptions {
  model: string;
  mode: 'create' | 'upsert';
  matchBy: 'id' | 'slug' | 'email' | 'code' | 'orderNumber';
  allowPartialSuccess?: boolean;
}

export interface ValidationReport {
  valid: boolean;
  validationId: string;
  summary: {
    totalRecords: number;
    validRecords: number;
    errorCount: number;
    warningCount: number;
  };
  errors: Array<{
    row: number;
    field: string;
    message: string;
    severity: 'error';
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
    severity: 'warning';
    value?: any;
  }>;
  expiresAt: string;
}

export interface ImportResult {
  success: boolean;
  summary: {
    totalProcessed: number;
    created: number;
    updated: number;
    failed: number;
    skipped: number;
  };
  errors: Array<{
    row: number;
    field: string;
    message: string;
    record?: any;
  }>;
  duration: number;
}

export interface ExportOptions {
  model: string;
  format?: 'json';
  filters?: any;
  includeRelationships?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ModelInfo {
  name: string;
  label: string;
  description: string;
  matchByOptions: Array<{ value: string; label: string }>;
  relationships: string[];
  requiredFields: string[];
}

const bulkDataAPI = {
  /**
   * Get list of supported models for bulk operations
   */
  getSupportedModels: async (): Promise<ModelInfo[]> => {
    try {
      const response = await ApiService.get('/admin/bulk-import/models');
      return response.data.models || [];
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get bulk import/export statistics
   */
  getBulkImportStats: async () => {
    try {
      const response = await ApiService.get('/admin/bulk-import/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Step 1: Validate import data
   * Returns validation report with errors/warnings
   */
  validateImport: async (
    data: any[],
    options: ImportOptions
  ): Promise<{ validationId: string; report: ValidationReport }> => {
    try {
      const response = await ApiService.post('/admin/bulk-import/validate', {
        model: options.model,
        mode: options.mode,
        matchBy: options.matchBy,
        data,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Step 2: Execute import after validation
   * Requires validationId from validate step
   */
  executeImport: async (
    validationId: string,
    confirmedAt?: string
  ): Promise<ImportResult> => {
    try {
      const response = await ApiService.post('/admin/bulk-import/execute', {
        validationId,
        confirmedAt: confirmedAt || new Date().toISOString(),
      });
      return response.data.result;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Export data for a model
   * Returns JSON data
   */
  exportData: async (options: ExportOptions): Promise<any> => {
    try {
      const response = await ApiService.post(
        `/admin/bulk-import/export/${options.model}`,
        {
          format: options.format || 'json',
          filters: options.filters || {},
          includeRelationships: options.includeRelationships ?? true,
          limit: options.limit,
          offset: options.offset,
          sortBy: options.sortBy,
          sortOrder: options.sortOrder,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Download export as file
   * Triggers browser download
   */
  downloadExport: async (
    options: ExportOptions,
    filename?: string
  ): Promise<void> => {
    try {
      const data = await bulkDataAPI.exportData(options);

      // Create blob and download
      const blob = new Blob([JSON.stringify(data.data, null, 2)], {
        type: 'application/json',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        filename ||
        `${options.model}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Parse uploaded JSON file
   */
  parseJSONFile: (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);

          // Handle both array and object with data property
          if (Array.isArray(parsed)) {
            resolve(parsed);
          } else if (parsed.data && Array.isArray(parsed.data)) {
            resolve(parsed.data);
          } else {
            reject(new Error('Invalid JSON format. Expected array or object with data property.'));
          }
        } catch (error) {
          reject(new Error('Failed to parse JSON file. Please check the file format.'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file.'));
      };

      reader.readAsText(file);
    });
  },

  /**
   * Validate file size and format
   */
  validateFile: (file: File): { valid: boolean; error?: string } => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    if (!file.name.endsWith('.json')) {
      return {
        valid: false,
        error: 'Invalid file format. Only JSON files are supported.',
      };
    }

    if (file.size > MAX_SIZE) {
      return {
        valid: false,
        error: 'File size exceeds 10MB limit.',
      };
    }

    return { valid: true };
  },
};

export default bulkDataAPI;
