import { ApiService } from '../api';

export interface NationalDayRegisterPayload {
  registrationType?: 'individual' | 'school_bulk';
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentFullName: string;
  studentAge: number;
  grade: string;
  category: string;
  gender?: string;
  schoolName: string;
  schoolEmirate: string;
  schoolBulkRef?: string;

  // Declarations
  agreeTerms: boolean;
  traditionalOnlyDeclaration: boolean;
  originalityDeclaration: boolean;

  // Consent
  parentGuardianConsent: boolean;
  artworkDisplayPermission: 'yes' | 'no';
  nameDisplayPermission: boolean;
  competitionUpdatesConsent: boolean;
  marketingConsent?: boolean;
}

export interface NationalDaySubmitPayload extends NationalDayRegisterPayload {
  artworkTitle?: string;
  artworkDescription?: string;
  medium?: string;
  themePillar?: string;
  artwork?: File;
}

export interface NationalDayArtworkSubmitPayload {
  refNo?: string;
  submissionId?: string;
  artworkTitle: string;
  artworkDescription?: string;
  medium?: string;
  themePillar?: string;
  artwork: File;
}

export interface SchoolBulkInquiryPayload {
  schoolName: string;
  contactPerson: string;
  email: string;
  phone: string;
  emirate: string;
  estimatedStudents?: number;
  notes?: string;
}

const nationalDayAPI = {
  /**
   * Phase 1: Register Student & Parent Details (JSON payload, no artwork required)
   */
  register: async (payload: NationalDayRegisterPayload) => {
    const response = await ApiService.post<any>(
      '/national-day-competition/register',
      payload
    );
    return response as {
      success: boolean;
      message?: string;
      data: {
        submissionId: string;
        submissionRef: string;
        amount: number;
        currency: string;
      };
    };
  },

  /**
   * Phase 1 (Legacy Draft): Save draft & upload artwork
   */
  saveDraft: async (payload: NationalDaySubmitPayload) => {
    const formData = new FormData();
    formData.append('registrationType', payload.registrationType || 'individual');
    formData.append('parentName', payload.parentName);
    formData.append('parentEmail', payload.parentEmail);
    formData.append('parentPhone', payload.parentPhone);
    formData.append('studentFullName', payload.studentFullName);
    formData.append('studentAge', String(payload.studentAge));
    formData.append('grade', payload.grade);
    formData.append('category', payload.category);
    if (payload.gender) formData.append('gender', payload.gender);
    formData.append('schoolName', payload.schoolName);
    formData.append('schoolEmirate', payload.schoolEmirate);
    if (payload.schoolBulkRef) formData.append('schoolBulkRef', payload.schoolBulkRef);

    if (payload.artworkTitle) formData.append('artworkTitle', payload.artworkTitle);
    if (payload.artworkDescription) formData.append('artworkDescription', payload.artworkDescription);
    if (payload.medium) formData.append('medium', payload.medium);
    if (payload.themePillar) formData.append('themePillar', payload.themePillar);
    if (payload.artwork) formData.append('artwork', payload.artwork);

    formData.append('agreeTerms', String(payload.agreeTerms));
    formData.append('traditionalOnlyDeclaration', String(payload.traditionalOnlyDeclaration));
    formData.append('originalityDeclaration', String(payload.originalityDeclaration));

    formData.append('parentGuardianConsent', String(payload.parentGuardianConsent));
    formData.append('artworkDisplayPermission', payload.artworkDisplayPermission);
    formData.append('nameDisplayPermission', String(payload.nameDisplayPermission));
    formData.append('competitionUpdatesConsent', String(payload.competitionUpdatesConsent));
    if (payload.marketingConsent !== undefined) {
      formData.append('marketingConsent', String(payload.marketingConsent));
    }

    const response = await ApiService.post<any>(
      '/national-day-competition/save-draft',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response as {
      success: boolean;
      message?: string;
      data: { submissionId: string; submissionRef?: string; amount: number; currency: string };
    };
  },

  /**
   * Phase 1 Step 3: Create Stripe Checkout Session
   */
  createCheckoutSession: async (submissionId: string) => {
    const response = await ApiService.post<any>(
      '/national-day-competition/create-checkout-session',
      { submissionId }
    );
    return response as { success: boolean; data: { sessionUrl: string; sessionId: string } };
  },

  /**
   * Phase 1 Finalize: Finalize submission after payment
   */
  finalizeSubmission: async (submissionId: string, sessionId: string) => {
    const response = await ApiService.post<any>(
      '/national-day-competition/finalize',
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
        isLittleArtist: boolean;
        artworkTitle?: string;
        hasArtwork?: boolean;
      };
    };
  },

  /**
   * Phase 2: Lookup registration by Reference Number (UAE2026-XXXXXXXX)
   */
  lookupByRef: async (refNo: string, email?: string) => {
    const response = await ApiService.get<any>(
      `/national-day-competition/lookup/${encodeURIComponent(refNo.trim())}`,
      { params: email ? { email: email.trim() } : {} }
    );
    return response as {
      success: boolean;
      data: {
        submissionId: string;
        submissionRef: string;
        participant: {
          studentFullName: string;
          studentAge: number;
          grade: string;
          category: string;
          schoolName: string;
          schoolEmirate: string;
          parentName: string;
          parentEmail: string;
        };
        hasArtwork: boolean;
        artwork?: {
          title: string;
          description: string;
          medium: string;
          themePillar: string;
        };
        artworkUpload?: {
          artworkUrl: string;
          artworkOriginalName: string;
          artworkMimetype: string;
        };
        status: string;
      };
    };
  },

  /**
   * Phase 2: Submit Completed Artwork (File < 1 MB)
   */
  submitArtwork: async (payload: NationalDayArtworkSubmitPayload) => {
    const formData = new FormData();
    if (payload.refNo) formData.append('refNo', payload.refNo);
    if (payload.submissionId) formData.append('submissionId', payload.submissionId);
    formData.append('artworkTitle', payload.artworkTitle);
    if (payload.artworkDescription) formData.append('artworkDescription', payload.artworkDescription);
    if (payload.medium) formData.append('medium', payload.medium);
    if (payload.themePillar) formData.append('themePillar', payload.themePillar);
    formData.append('artwork', payload.artwork);

    const response = await ApiService.post<any>(
      '/national-day-competition/submit-artwork',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response as {
      success: boolean;
      message?: string;
      data: {
        submissionId: string;
        submissionRef: string;
        studentName: string;
        artworkTitle: string;
        artworkUrl: string;
        submittedAt: string;
      };
    };
  },

  /**
   * Send school bulk inquiry
   */
  sendSchoolInquiry: async (payload: SchoolBulkInquiryPayload) => {
    const response = await ApiService.post<any>(
      '/national-day-competition/school-inquiry',
      payload
    );
    return response as { success: boolean; message?: string; data?: any };
  },

  /**
   * Admin: Get all National Day submissions with pagination & filters
   */
  getSubmissions: async (options: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    category?: string;
    emirate?: string;
    medal?: string;
    search?: string;
  }) => {
    const response = await ApiService.get<any>('/national-day-competition/submissions', {
      params: options,
    });
    return response as { success: boolean; data: any };
  },

  /**
   * Admin: Update submission status, notes, medal, or certificate template
   */
  updateSubmissionStatus: async (
    id: string,
    status: string,
    adminNotes?: string,
    medal?: string,
    certificateTemplateId?: string
  ) => {
    const response = await ApiService.patch<any>(
      `/national-day-competition/submissions/${id}/status`,
      { status, adminNotes, medal, certificateTemplateId }
    );
    return response as { success: boolean; data?: any };
  },

  /**
   * Admin: Delete submission
   */
  deleteSubmission: async (id: string) => {
    const response = await ApiService.delete(`/national-day-competition/submissions/${id}`);
    return response as { success: boolean };
  },

  /**
   * Admin: Generate certificate for National Day submission
   */
  generateCertificate: async (id: string, templateId: string, medal?: string) => {
    const response = await ApiService.post(`/national-day-competition/submissions/${id}/certificate`, {
      templateId,
      medal,
    });
    return response as { success: boolean; message?: string; data?: any };
  },
};

export default nationalDayAPI;
