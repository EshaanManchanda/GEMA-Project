import { ApiService } from '../api';

export interface ReelRegisterPayload {
  registrationType?: 'individual' | 'school_bulk';
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentFullName: string;
  studentAge: number;
  grade: string;
  category?: string;
  gender?: string;
  country: string;
  city?: string;
  schoolName: string;
  schoolBulkRef?: string;
  reelTitle?: string;
  reelDescription?: string;
  momentTheme?: string;
  durationSeconds?: number;
  videoDriveLink?: string;
  deviceUsed?: string;

  // Declarations & Consents
  agreeTerms: boolean;
  originalityDeclaration: boolean;
  parentGuardianConsent: boolean;
  reelDisplayPermission: 'yes' | 'no';
  nameDisplayPermission: boolean;
  competitionUpdatesConsent: boolean;
  marketingConsent?: boolean;
}

export interface ReelSchoolBulkInquiryPayload {
  schoolName: string;
  contactPerson: string;
  email: string;
  phone: string;
  country: string;
  estimatedStudents?: number;
  notes?: string;
}

export const reelCompetitionAPI = {
  /**
   * Register a student for GCC Through My Lens - Reel Challenge
   */
  register: async (payload: ReelRegisterPayload) => {
    return ApiService.post<any>('/reel-competition/register', payload);
  },

  /**
   * Phase 2: Lookup registration by reference number
   */
  lookupByRef: async (refNo: string, email?: string) => {
    return ApiService.get<any>(`/reel-competition/lookup/${encodeURIComponent(refNo)}`, {
      params: email ? { email } : undefined,
    });
  },

  /**
   * Phase 2: Submit Video Reel
   */
  submitReel: async (formData: FormData) => {
    return ApiService.post<any>('/reel-competition/submit-reel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Phase 1 Step 3: Create Stripe Checkout Session
   */
  createCheckoutSession: async (submissionId: string) => {
    const response = await ApiService.post<any>(
      '/reel-competition/create-checkout-session',
      { submissionId }
    );
    return response as { success: boolean; data: { sessionUrl: string; sessionId: string } };
  },

  /**
   * Phase 1 Finalize: Finalize submission after payment
   */
  finalizeSubmission: async (submissionId: string, sessionId: string) => {
    const response = await ApiService.post<any>(
      '/reel-competition/finalize',
      { submissionId, sessionId }
    );
    return response as {
      success: boolean;
      message?: string;
      data: {
        submissionId: string;
        submissionRef: string;
        studentName: string;
        grade: string;
        category: string;
        country: string;
        reelTitle?: string;
      };
    };
  },

  /**
   * Send school bulk inquiry
   */
  sendSchoolInquiry: async (payload: ReelSchoolBulkInquiryPayload) => {
    return ApiService.post<any>('/reel-competition/school-inquiry', payload);
  },

  /**
   * Admin: get submissions
   */
  getSubmissions: async (options: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    country?: string;
    paymentStatus?: string;
    search?: string;
    medal?: string;
  }) => {
    return ApiService.get<any>('/reel-competition/submissions', { params: options });
  },

  /**
   * Admin: update submission status
   */
  updateSubmissionStatus: async (
    id: string,
    status: string,
    notes?: string,
    medal?: string,
    certificateTemplateId?: string
  ) => {
    return ApiService.patch<any>(`/reel-competition/submissions/${id}/status`, {
      status,
      notes,
      medal,
      certificateTemplateId,
    });
  },

  /**
   * Admin: delete submission
   */
  deleteSubmission: async (id: string) => {
    return ApiService.delete<any>(`/reel-competition/submissions/${id}`);
  },

  /**
   * Admin: generate certificate
   */
  generateCertificate: async (id: string, templateId: string, medal?: string) => {
    return ApiService.post<any>(`/reel-competition/submissions/${id}/certificate`, {
      templateId,
      medal,
    });
  },
};

export default reelCompetitionAPI;

