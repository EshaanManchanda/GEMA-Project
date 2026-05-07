import api from '../api';

export interface OrganizationApplicationPayload {
  organizationName: string;
  anticipatedTeachersNextMonth: number;
  countryOfOperation: string;
  organizationWebsite: string;
  primaryContactName: string;
  primaryContactTitle: string;
  organizationPhone: string;
  foundedYear: string;
  teacherBackground: string;
  learnerAudience: string;
  classTypes: string;
  firstClassDescription: string;
  referralSource: string;
  publicReviewsLinks?: string;
  additionalNotes?: string;
}

export interface OrganizationAgreementPayload {
  legalName: string;
  legalEntityType: string;
  incorporationLocation: string;
  principalBusinessAddress: string;
  backgroundChecksRequired: boolean;
  authorizedSignerName: string;
  authorizedSignerTitle: string;
  acceptedTerms: boolean;
}

export interface OrganizationOnboardingResponse {
  onboarding: {
    application?: Partial<OrganizationApplicationPayload>;
    agreement?: Partial<OrganizationAgreementPayload> & {
      signedAt?: string;
    };
    reviewStatus?: 'pending' | 'approved' | 'rejected';
    reviewNotes?: string;
    reviewedAt?: string;
    applicationCompletedAt?: string;
    agreementSignedAt?: string;
  } | null;
}

const organizationAPI = {
  getOnboarding: async (): Promise<OrganizationOnboardingResponse> => {
    const response = await api.get('/organizations/onboarding');
    return response.data.data;
  },

  saveApplication: async (application: OrganizationApplicationPayload) => {
    const response = await api.put('/organizations/application', { application });
    return response.data;
  },

  signAgreement: async (agreement: OrganizationAgreementPayload) => {
    const response = await api.put('/organizations/agreement', { agreement });
    return response.data;
  },
};

export default organizationAPI;
