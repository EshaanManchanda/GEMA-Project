import { ApiService } from '../api';

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
};

export default communicationAPI;
