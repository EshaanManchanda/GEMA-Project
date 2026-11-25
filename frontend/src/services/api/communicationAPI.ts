import { ApiService } from '../api';

export interface EmailDigestSettingsData {
  _id?: string;
  campaignRecordId?: string;
  status: 'active' | 'draft' | 'inactive';
  campaignType: 'blog_digest' | 'event_spotlight' | 'competition_announcement' | 'custom_broadcast';
  targetAudience: 'newsletter_all' | 'customers_parents' | 'teachers' | 'vendors' | 'all_consented';
  autoSend: boolean;
  scheduleDay: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  scheduleTime: string;
  subject: string;
  preheader?: string;

  // Blog Digest Config
  blogMode: 'auto' | 'manual';
  autoBlogCount: number;
  selectedBlogIds: string[];

  // Event Spotlight Config
  featuredEventId?: string;
  secondaryEventIds?: string[];
  eventCustomMessage?: string;

  // Competition Config
  selectedCompetitionSlugs: string[];
  competitionCustomMessage?: string;

  // Free-form Broadcast Config
  customBroadcast?: {
    heroTitle: string;
    heroSubtitle: string;
    bodyHtml: string;
    ctaText: string;
    ctaUrl: string;
  };

  lastSentAt?: string;
  lastSentStatus?: 'success' | 'failed';
  lastSentRecipientCount?: number;
  lastSentCampaignType?: string;
}

export interface DigestPreviewResult {
  subject: string;
  html: string;
  blogs: Array<{
    _id: string;
    title: string;
    slug: string;
    excerpt: string;
    image: string;
    publishedAt?: string;
  }>;
  competitions: Array<{
    _id: string;
    title: string;
    slug: string;
    description: string;
    image: string;
    price?: number;
    currency?: string;
  }>;
  banner?: { title: string; text: string };
}

export interface CommunicationSettings {
  whatsapp: { provider: string; configured: boolean };
  emailMarketing: { provider: string; configured: boolean };
  communication: {
    testMode: boolean;
    queueEnabled: boolean;
    logRawProviderResponse: boolean;
  };
}

export interface CommunicationLog {
  _id: string;
  channel: 'whatsapp' | 'email' | 'email_marketing' | 'sms';
  provider: string;
  category: 'otp' | 'transactional' | 'marketing' | 'admin_alert';
  userId?: string;
  eventId?: string;
  bookingId?: string;
  orderId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  templateKey?: string;
  status:
    | 'queued'
    | 'sent'
    | 'delivered'
    | 'read'
    | 'failed'
    | 'bounced'
    | 'unsubscribed'
    | 'expired';
  providerMessageId?: string;
  safeProviderSummary?: {
    providerMessageId?: string;
    status?: string;
    errorCode?: string;
    errorMessage?: string;
  };
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  queuedAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationLogsQuery {
  channel?: string;
  status?: string;
  category?: string;
  templateKey?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface CommunicationLogsResponse {
  logs: CommunicationLog[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface CommunicationLogsSummary {
  sinceDays: number;
  byChannelAndStatus: Record<string, Record<string, number>>;
}

export interface WhatsAppPreviewResult {
  providerTemplateName: string;
  purpose: string;
  requiredVariables: string[];
  isEnabled: boolean;
  isApprovedOnProvider: boolean;
  rendered: string;
}

export type EmailMarketingSecretField =
  | 'senderApiKey'
  | 'senderWebhookSecret'
  | 'mailchimpApiKey'
  | 'mailchimpWebhookSecret';

export interface EmailMarketingSettingsView {
  provider: 'dev' | 'sender' | 'mailchimp';
  providerSource: 'database' | 'environment' | 'default';
  plain: {
    senderListId: string;
    mailchimpServerPrefix: string;
    mailchimpAudienceId: string;
  };
  secrets: Record<
    EmailMarketingSecretField,
    { isSet: boolean; source: 'database' | 'environment' | 'none' }
  >;
}

/** Secrets: omit/'' keeps current, a string replaces, null clears (back to env). */
export interface EmailMarketingSettingsPatch {
  provider?: string;
  senderListId?: string;
  mailchimpServerPrefix?: string;
  mailchimpAudienceId?: string;
  senderApiKey?: string | null;
  senderWebhookSecret?: string | null;
  mailchimpApiKey?: string | null;
  mailchimpWebhookSecret?: string | null;
}

const communicationAPI = {
  getSettings: async (): Promise<CommunicationSettings> => {
    const response = await ApiService.get<CommunicationSettings>(
      '/admin/communication/settings'
    );
    return response.data;
  },

  getRetryPolicy: async (): Promise<{ nonRetryableErrorCodes: string[] }> => {
    const response = await ApiService.get<{ nonRetryableErrorCodes: string[] }>(
      '/admin/communication/retry-policy'
    );
    return response.data;
  },

  getLogsSummary: async (days = 7): Promise<CommunicationLogsSummary> => {
    const response = await ApiService.get<CommunicationLogsSummary>(
      '/admin/communication/logs/summary',
      { params: { days } }
    );
    return response.data;
  },

  getLogs: async (
    params: CommunicationLogsQuery = {}
  ): Promise<CommunicationLogsResponse> => {
    const response = await ApiService.get<CommunicationLogsResponse>(
      '/admin/communication/logs',
      { params }
    );
    return response.data;
  },

  getLog: async (id: string): Promise<CommunicationLog> => {
    const response = await ApiService.get<CommunicationLog>(
      `/admin/communication/logs/${id}`
    );
    return response.data;
  },

  retryLog: async (id: string): Promise<CommunicationLog> => {
    const response = await ApiService.post<CommunicationLog>(
      `/admin/communication/logs/${id}/retry`
    );
    return response.data;
  },

  previewWhatsAppTemplate: async (payload: {
    templateKey: string;
    vars?: Record<string, string | number>;
    languageCode?: string;
  }): Promise<WhatsAppPreviewResult> => {
    const response = await ApiService.post<WhatsAppPreviewResult>(
      '/admin/communication/whatsapp/preview',
      payload
    );
    return response.data;
  },

  testWhatsAppSend: async (payload: {
    to: string;
    templateKey: string;
    vars?: Record<string, string | number>;
    languageCode?: string;
  }): Promise<CommunicationLog> => {
    const response = await ApiService.post<CommunicationLog>(
      '/admin/communication/whatsapp/test',
      payload
    );
    return response.data;
  },

  testWhatsAppConnection: async (): Promise<{
    provider: string;
    connected: boolean;
  }> => {
    const response = await ApiService.get<{ provider: string; connected: boolean }>(
      '/admin/communication/whatsapp/test-connection'
    );
    return response.data;
  },

  getEmailMarketingSettings: async (): Promise<EmailMarketingSettingsView> => {
    const response = await ApiService.get<EmailMarketingSettingsView>(
      '/admin/communication/email-marketing/settings'
    );
    return response.data;
  },

  updateEmailMarketingSettings: async (
    payload: EmailMarketingSettingsPatch
  ): Promise<EmailMarketingSettingsView> => {
    const response = await ApiService.put<EmailMarketingSettingsView>(
      '/admin/communication/email-marketing/settings',
      payload
    );
    return response.data;
  },

  backfillEmailMarketing: async (): Promise<{ started: boolean; message: string }> => {
    const response = await ApiService.post<{ started: boolean; message: string }>(
      '/admin/communication/email-marketing/backfill'
    );
    return response.data;
  },

  testEmailMarketingConnection: async (): Promise<{
    provider: string;
    connected: boolean;
    simulated: boolean;
  }> => {
    const response = await ApiService.get<{
      provider: string;
      connected: boolean;
      simulated: boolean;
    }>('/admin/communication/email-marketing/test-connection');
    return response.data;
  },

  getEmailDigestSettings: async (): Promise<EmailDigestSettingsData> => {
    const response = await ApiService.get<any>(
      '/admin/communication/email-marketing/digest-settings'
    );
    return response.data?.data || response.data || response;
  },

  updateEmailDigestSettings: async (
    payload: Partial<EmailDigestSettingsData>
  ): Promise<any> => {
    const response = await ApiService.put<any>(
      '/admin/communication/email-marketing/digest-settings',
      payload
    );
    return response.data || response;
  },

  previewEmailDigest: async (
    payload?: Partial<EmailDigestSettingsData>
  ): Promise<DigestPreviewResult> => {
    const response = await ApiService.post<any>(
      '/admin/communication/email-marketing/digest-preview',
      payload || {}
    );
    return response.data?.data || response.data || response;
  },

  dispatchEmailDigest: async (payload: {
    testEmail?: string;
    testMode?: boolean;
    overrideSettings?: Partial<EmailDigestSettingsData>;
    campaignRecordId?: string;
  }): Promise<{ success: boolean; recipientCount?: number; message: string }> => {
    const response = await ApiService.post<any>(
      '/admin/communication/email-marketing/digest-dispatch',
      payload
    );
    return response.data || response;
  },

  listEmailCampaigns: async (): Promise<EmailDigestSettingsData[]> => {
    const response = await ApiService.get<any>(
      '/admin/communication/email-marketing/campaigns'
    );
    const data = response.data?.data || response.data || response;
    return Array.isArray(data) ? data : [];
  },

  updateCampaignRecord: async (
    id: string,
    payload: Partial<EmailDigestSettingsData>
  ): Promise<EmailDigestSettingsData> => {
    const response = await ApiService.patch<any>(
      `/admin/communication/email-marketing/campaigns/${id}`,
      payload
    );
    return response.data?.data || response.data || response;
  },

  deleteCampaignRecord: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await ApiService.delete<any>(
      `/admin/communication/email-marketing/campaigns/${id}`
    );
    return response.data || response;
  },
};

export default communicationAPI;
