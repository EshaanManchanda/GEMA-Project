import { ApiService } from '../api';

export interface NationalDaySubmitPayload {
  // Participant
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

  // Artwork
  artworkTitle: string;
  artworkDescription: string;
  medium: string;
  themePillar: string;
  artwork: File;

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
   * Step 1: Save draft & upload artwork
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

    formData.append('artworkTitle', payload.artworkTitle);
    formData.append('artworkDescription', payload.artworkDescription);
    formData.append('medium', payload.medium);
    formData.append('themePillar', payload.themePillar);
    formData.append('artwork', payload.artwork);

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
    return response as { success: boolean; message?: string; data: { submissionId: string; submissionRef?: string; amount: number; currency: string } };
  },

  /**
   * Step 2: Create Stripe Checkout Session
   */
  createCheckoutSession: async (submissionId: string) => {
    const response = await ApiService.post<any>(
      '/national-day-competition/create-checkout-session',
      { submissionId }
    );
    return response as { success: boolean; data: { sessionUrl: string; sessionId: string } };
  },

  /**
   * Step 3: Finalize submission after payment
   */
  finalizeSubmission: async (submissionId: string, sessionId: string) => {
    const response = await ApiService.post<any>(
      '/national-day-competition/finalize',
      { submissionId, sessionId }
    );
    return response as { success: boolean; message?: string; data: { submissionId: string; submissionRef: string; studentName: string; artworkTitle: string } };
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
