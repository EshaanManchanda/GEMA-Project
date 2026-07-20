import { ApiService } from '../api';

export interface NotificationTemplate {
  _id: string;
  key: string;
  channel: 'whatsapp' | 'email' | 'email_marketing' | 'sms';
  provider: string;
  purpose: 'otp' | 'transactional' | 'marketing' | 'admin_alert';
  /** Cunnekt's `templateid` for this template — not a symbolic name. */
  providerTemplateName: string;
  bodyText: string;
  languageCode: string;
  requiredVariables: string[];
  isEnabled: boolean;
  isApprovedOnProvider: boolean;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export type NotificationTemplateUpdate = Partial<
  Pick<
    NotificationTemplate,
    | 'provider'
    | 'purpose'
    | 'providerTemplateName'
    | 'bodyText'
    | 'requiredVariables'
    | 'isEnabled'
    | 'isApprovedOnProvider'
  >
>;

export type NotificationTemplateCreate = Pick<
  NotificationTemplate,
  'key' | 'channel' | 'provider' | 'purpose' | 'providerTemplateName'
> &
  Partial<
    Pick<
      NotificationTemplate,
      'bodyText' | 'languageCode' | 'requiredVariables' | 'isEnabled' | 'isApprovedOnProvider'
    >
  >;

const notificationTemplateAPI = {
  list: async (params?: { channel?: string; purpose?: string }): Promise<NotificationTemplate[]> => {
    const response = await ApiService.get<NotificationTemplate[]>(
      '/admin/notification-templates',
      { params }
    );
    return response.data;
  },

  get: async (id: string): Promise<NotificationTemplate> => {
    const response = await ApiService.get<NotificationTemplate>(
      `/admin/notification-templates/${id}`
    );
    return response.data;
  },

  create: async (payload: NotificationTemplateCreate): Promise<NotificationTemplate> => {
    const response = await ApiService.post<NotificationTemplate>(
      '/admin/notification-templates',
      payload
    );
    return response.data;
  },

  update: async (id: string, payload: NotificationTemplateUpdate): Promise<NotificationTemplate> => {
    const response = await ApiService.patch<NotificationTemplate>(
      `/admin/notification-templates/${id}`,
      payload
    );
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await ApiService.delete(`/admin/notification-templates/${id}`);
  },
};

export default notificationTemplateAPI;
