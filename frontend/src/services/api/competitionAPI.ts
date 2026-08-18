import { ApiService } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompetitionSubmitPayload {
  // Section 1
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentFullName: string;
  studentAge: number;
  grade: string;
  cohort?: string;
  gender?: string;
  schoolName: string;
  schoolEmirate: string;
  // Section 2
  artworkTitle: string;
  artworkDescription: string;
  // Section 4 – AI creation
  aiTools: string[];
  otherToolName?: string;
  creationType: string;
  mainPrompt: string;
  additionalPrompts?: string[];
  changesAfterGeneration: string;
  changesDescription?: string;
  // Section 4b – Artwork file
  artwork: File;
  // Declarations
  agreeTerms: boolean;
  responsibleAiDeclaration: boolean;
  originalityDeclaration: boolean;
  // Consent
  parentGuardianConsent: boolean;
  artworkDisplayPermission: 'yes' | 'no';
  nameDisplayPermission: boolean;
  competitionUpdatesConsent: boolean;
  marketingConsent?: boolean;
}

export interface CompetitionSubmitResponse {
  success: boolean;
  message: string;
  data: {
    submissionId: string;
    submissionRef: string;
    studentName: string;
    artworkTitle: string;
  };
}

export interface CompetitionSubmission {
  _id: string;
  participant: {
    parentName: string;
    parentEmail: string;
    parentPhone: string;
    studentFullName: string;
    studentAge: number;
    grade: string;
    cohort?: string;
    gender?: string;
    schoolName: string;
    schoolEmirate: string;
  };
  artwork: {
    title: string;
    description: string;
  };
  aiCreation: {
    tools: string[];
    otherToolName?: string;
    creationType: string;
    mainPrompt: string;
    additionalPrompts?: string[];
    changesAfterGeneration: string;
    changesDescription?: string;
  };
  artworkUpload: {
    artworkUrl: string;
    artworkOriginalName: string;
    artworkSize: number;
    artworkMimetype: string;
  };
  declarations: {
    agreeTerms: boolean;
    responsibleAiDeclaration: boolean;
    originalityDeclaration: boolean;
  };
  consent: {
    parentGuardianConsent: boolean;
    artworkDisplayPermission: string;
    nameDisplayPermission: boolean;
    competitionUpdatesConsent: boolean;
    marketingConsent: boolean;
  };
  status: string;
  medal?: string;
  certificateTemplateId?: string;
  metadata: { submittedAt: string };
  createdAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const competitionAPI = {
  /**
   * Submit an AI Art Competition entry.
   * Sends multipart/form-data so the artwork file is included.
   */
  submitCompetition: async (
    payload: CompetitionSubmitPayload,
  ): Promise<CompetitionSubmitResponse> => {
    const formData = new FormData();

    // Section 1 – Participant
    formData.append('parentName', payload.parentName);
    formData.append('parentEmail', payload.parentEmail);
    formData.append('parentPhone', payload.parentPhone);
    formData.append('studentFullName', payload.studentFullName);
    formData.append('studentAge', String(payload.studentAge));
    formData.append('grade', payload.grade);
    if (payload.gender) formData.append('gender', payload.gender);
    formData.append('schoolName', payload.schoolName);
    formData.append('schoolEmirate', payload.schoolEmirate);

    // Section 2 – Artwork metadata
    formData.append('artworkTitle', payload.artworkTitle);
    formData.append('artworkDescription', payload.artworkDescription);

    // Section 4 – AI Creation
    payload.aiTools.forEach((tool) => formData.append('aiTools', tool));
    if (payload.otherToolName) formData.append('otherToolName', payload.otherToolName);
    formData.append('creationType', payload.creationType);
    formData.append('mainPrompt', payload.mainPrompt);
    if (payload.additionalPrompts?.length) {
      formData.append('additionalPrompts', JSON.stringify(payload.additionalPrompts.filter(Boolean)));
    }
    formData.append('changesAfterGeneration', payload.changesAfterGeneration);
    if (payload.changesDescription) {
      formData.append('changesDescription', payload.changesDescription);
    }

    // Section 4b – Artwork file
    formData.append('artwork', payload.artwork);

    // Declarations
    formData.append('agreeTerms', String(payload.agreeTerms));
    formData.append('responsibleAiDeclaration', String(payload.responsibleAiDeclaration));
    formData.append('originalityDeclaration', String(payload.originalityDeclaration));

    // Consent
    formData.append('parentGuardianConsent', String(payload.parentGuardianConsent));
    formData.append('artworkDisplayPermission', payload.artworkDisplayPermission);
    formData.append('nameDisplayPermission', String(payload.nameDisplayPermission));
    formData.append('competitionUpdatesConsent', String(payload.competitionUpdatesConsent));
    formData.append('marketingConsent', String(payload.marketingConsent ?? false));

    const response = await ApiService.post('/competition/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response as unknown as CompetitionSubmitResponse;
  },

  /**
   * Admin: get all competition submissions.
   */
  getSubmissions: async (options: {
    page?: number;
    limit?: number;
    status?: string;
    medal?: string;
    search?: string;
    emirate?: string;
    grade?: string;
  }) => {
    const response = await ApiService.get('/competition/submissions', { params: options });
    return response as {
      success: boolean;
      data: {
        submissions: CompetitionSubmission[];
        pagination: { page: number; limit: number; total: number; pages: number };
      };
    };
  },

  /**
   * Admin: get single submission by ID.
   */
  getSubmissionById: async (id: string) => {
    const response = await ApiService.get(`/competition/submissions/${id}`);
    return response as { success: boolean; data: { submission: CompetitionSubmission } };
  },

  /**
   * Admin: update submission status.
   */
  updateSubmissionStatus: async (
    id: string,
    status: string,
    adminNotes?: string,
    medal?: string,
    certificateTemplateId?: string
  ) => {
    const response = await ApiService.patch(`/competition/submissions/${id}/status`, {
      status,
      adminNotes,
      medal,
      certificateTemplateId,
    });
    return response as { success: boolean; message: string; data: any };
  },

  /**
   * Admin: delete submission.
   */
  deleteSubmission: async (id: string) => {
    const response = await ApiService.delete(`/competition/submissions/${id}`);
    return response as { success: boolean };
  },

  /**
   * Admin: generate certificate for submission.
   */
  generateCertificate: async (id: string, templateId: string, medal?: string) => {
    const response = await ApiService.post(`/competition/submissions/${id}/certificate`, {
      templateId,
      medal,
    });
    return response as { success: boolean };
  },
};

export default competitionAPI;
