import { ApiService } from '../api';
import type {
  VendorHealthResult,
  SnapshotHistoryEntry,
  VendorBusinessSnapshot,
  OverviewResponse,
  OverviewFilters,
  VendorPromotionInput,
  SavePromotionInputResult,
  BusinessReportFormat,
  BusinessReportType,
  BulkGenerateJob,
} from '@/types/businessReport';

const businessReportAPI = {
  // ── Vendor-accessible (admin or vendor-self) ──────────────────────────────

  getHealth: async (vendorId: string, period?: string): Promise<VendorHealthResult> => {
    const response = await ApiService.get(`/insights/vendors/${vendorId}/health`, {
      params: period ? { period } : undefined,
    });
    return response.data;
  },

  getHealthHistory: async (vendorId: string, limit?: number): Promise<SnapshotHistoryEntry[]> => {
    const response = await ApiService.get(`/insights/vendors/${vendorId}/health/history`, {
      params: limit ? { limit } : undefined,
    });
    return response.data;
  },

  toggleTask: async (
    vendorId: string,
    taskCode: string,
    done: boolean,
    period?: string
  ) => {
    const response = await ApiService.patch(
      `/insights/vendors/${vendorId}/tasks/${taskCode}`,
      { done },
      { params: period ? { period } : undefined }
    );
    return response.data;
  },

  downloadReport: async (
    vendorId: string,
    period: string,
    type: BusinessReportType,
    format: BusinessReportFormat
  ): Promise<void> => {
    const ext = format === 'pdf' ? 'pdf' : 'csv';
    const filename = `business-report-${vendorId}-${period}-${type}.${ext}`;
    await ApiService.download(
      `/insights/vendors/${vendorId}/report?period=${period}&type=${type}&format=${format}`,
      filename
    );
  },

  // ── Admin-only ─────────────────────────────────────────────────────────────

  getOverview: async (filters: OverviewFilters = {}): Promise<OverviewResponse> => {
    const response = await ApiService.get('/admin/business-reports/overview', {
      params: filters,
    });
    return response.data;
  },

  /** Read-only fetch of the persisted snapshot (or null) — does not generate/regenerate. */
  getSnapshot: async (
    vendorId: string,
    period?: string
  ): Promise<VendorBusinessSnapshot | null> => {
    const response = await ApiService.get(`/admin/business-reports/vendors/${vendorId}/snapshot`, {
      params: period ? { period } : undefined,
    });
    return response.data;
  },

  getPromotionInput: async (vendorId: string, period?: string): Promise<VendorPromotionInput> => {
    const response = await ApiService.get(
      `/admin/business-reports/vendors/${vendorId}/promotion-input`,
      { params: period ? { period } : undefined }
    );
    return response.data;
  },

  savePromotionInput: async (
    vendorId: string,
    period: string,
    input: Partial<VendorPromotionInput>
  ): Promise<SavePromotionInputResult> => {
    const response = (await ApiService.put(
      `/admin/business-reports/vendors/${vendorId}/promotion-input`,
      input,
      { params: { period } }
    )) as { data: VendorPromotionInput; warnings?: SavePromotionInputResult['warnings'] };
    return { input: response.data, warnings: response.warnings ?? [] };
  },

  generateSnapshot: async (
    vendorId: string,
    period: string
  ): Promise<VendorBusinessSnapshot> => {
    const response = await ApiService.post(
      `/admin/business-reports/vendors/${vendorId}/snapshot`,
      { period }
    );
    return response.data;
  },

  updateSnapshotStatus: async (
    snapshotId: string,
    status: 'locked' | 'reopened' | 'archived'
  ): Promise<VendorBusinessSnapshot> => {
    const response = await ApiService.patch(
      `/admin/business-reports/snapshots/${snapshotId}/status`,
      { status }
    );
    return response.data;
  },

  updateSnapshotNotes: async (
    snapshotId: string,
    notes: { vendorVisible?: string; internal?: string }
  ): Promise<VendorBusinessSnapshot> => {
    const response = await ApiService.put(
      `/admin/business-reports/snapshots/${snapshotId}/notes`,
      notes
    );
    return response.data;
  },

  bulkGenerate: async (
    vendorIds: string[],
    period: string
  ): Promise<{ jobId: string; vendorCount: number; period: string }> => {
    const response = await ApiService.post('/admin/business-reports/bulk-generate', {
      vendorIds,
      period,
    });
    return response.data;
  },

  getBulkGenerateProgress: async (jobId: string): Promise<BulkGenerateJob> => {
    const response = await ApiService.get(`/admin/business-reports/bulk-generate/${jobId}`);
    return response.data;
  },
};

export default businessReportAPI;
