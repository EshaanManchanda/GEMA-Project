import { ApiService } from '../api';

export interface GCCRegisterPayload {
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
  storyTitle?: string;
  storyDescription?: string;

  // Declarations & Consents
  agreeTerms: boolean;
  originalityDeclaration: boolean;
  parentGuardianConsent: boolean;
  storyDisplayPermission: 'yes' | 'no';
  nameDisplayPermission: boolean;
  competitionUpdatesConsent: boolean;
  marketingConsent?: boolean;
}

export interface GCCSchoolBulkInquiryPayload {
  schoolName: string;
  contactPerson: string;
  email: string;
  phone: string;
  country: string;
  estimatedStudents?: number;
  notes?: string;
}

export const gccCompetitionAPI = {
  /**
   * Register a student for Young Voices of the GCC
   */
  register: async (payload: GCCRegisterPayload) => {
    return ApiService.post<any>('/gcc-competition/register', payload);
  },

  /**
   * Phase 2: Lookup registration by reference number
   */
  lookupByRef: async (refNo: string, email?: string) => {
    return ApiService.get<any>(`/gcc-competition/lookup/${encodeURIComponent(refNo)}`, {
      params: email ? { email } : undefined,
    });
  },

  /**
   * Phase 2: Submit Short Story Manuscript
   */
  submitStory: async (formData: FormData) => {
    return ApiService.post<any>('/gcc-competition/submit-story', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Phase 1 Step 3: Create Stripe Checkout Session
   */
  createCheckoutSession: async (submissionId: string) => {
    const response = await ApiService.post<any>(
      '/gcc-competition/create-checkout-session',
      { submissionId }
    );
    return response as { success: boolean; data: { sessionUrl: string; sessionId: string } };
  },

  /**
   * Phase 1 Finalize: Finalize submission after payment
   */
  finalizeSubmission: async (submissionId: string, sessionId: string) => {
    const response = await ApiService.post<any>(
      '/gcc-competition/finalize',
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
        storyTitle?: string;
      };
    };
  },

  /**
   * Send school bulk inquiry
   */
  sendSchoolInquiry: async (payload: GCCSchoolBulkInquiryPayload) => {
    return ApiService.post<any>('/gcc-competition/school-inquiry', payload);
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
    return ApiService.get<any>('/gcc-competition/submissions', { params: options });
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
    return ApiService.patch<any>(`/gcc-competition/submissions/${id}/status`, {
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
    return ApiService.delete<any>(`/gcc-competition/submissions/${id}`);
  },

  /**
   * Admin: generate certificate
   */
  generateCertificate: async (id: string, templateId: string, medal?: string) => {
    return ApiService.post<any>(`/gcc-competition/submissions/${id}/certificate`, {
      templateId,
      medal,
    });
  },
};

export default gccCompetitionAPI;

