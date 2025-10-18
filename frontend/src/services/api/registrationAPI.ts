import { ApiService } from '../api';
import { extractApiData, logApiResponse } from '../../utils/apiResponseHandler';
import {
  SubmitRegistrationRequest,
  SubmitRegistrationResponse,
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  GetRegistrationsParams,
  GetRegistrationsResponse,
  UpdateRegistrationRequest,
  WithdrawRegistrationRequest,
  ReviewRegistrationRequest,
  CreateOrUpdateConfigRequest,
  GetConfigResponse,
  DuplicateConfigRequest,
  Registration,
} from '@/types/registration';

const registrationAPI = {
  /**
   * Submit a new registration for an event
   */
  submitRegistration: async (data: SubmitRegistrationRequest): Promise<SubmitRegistrationResponse> => {
    try {
      const formData = new FormData();

      // Add registration data as JSON string
      formData.append('registrationData', JSON.stringify(data.registrationData));
      formData.append('saveAsDraft', String(data.saveAsDraft || false));

      // Add files if present
      if (data.files && data.files.length > 0) {
        data.files.forEach((file) => {
          // Use the field ID from registrationData as the fieldname
          const fieldData = data.registrationData.find(d => d.fieldType === 'file');
          const fieldName = fieldData?.fieldId || 'file';
          formData.append(fieldName, file);
        });
      }

      const response = await ApiService.post(
        `/registrations/submit/${data.eventId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      logApiResponse(`POST /registrations/submit/${data.eventId}`, response);
      return response.data;
    } catch (error) {
      logApiResponse(`POST /registrations/submit/${data.eventId}`, null, error);
      throw error;
    }
  },

  /**
   * Confirm payment for a registration
   */
  confirmPayment: async (data: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse> => {
    try {
      const response = await ApiService.post(
        `/registrations/${data.registrationId}/confirm-payment`,
        { paymentIntentId: data.paymentIntentId }
      );

      logApiResponse(`POST /registrations/${data.registrationId}/confirm-payment`, response);
      return response.data;
    } catch (error) {
      logApiResponse(`POST /registrations/${data.registrationId}/confirm-payment`, null, error);
      throw error;
    }
  },

  /**
   * Get current user's registrations
   */
  getUserRegistrations: async (params?: GetRegistrationsParams): Promise<GetRegistrationsResponse> => {
    try {
      const response = await ApiService.get('/registrations/user/me', { params });
      logApiResponse('GET /registrations/user/me', response);
      return response.data;
    } catch (error) {
      logApiResponse('GET /registrations/user/me', null, error);
      throw error;
    }
  },

  /**
   * Get all registrations for an event (vendor/admin only)
   */
  getEventRegistrations: async (eventId: string, params?: GetRegistrationsParams): Promise<GetRegistrationsResponse> => {
    try {
      const response = await ApiService.get(`/registrations/event/${eventId}`, { params });
      logApiResponse(`GET /registrations/event/${eventId}`, response);
      return response.data;
    } catch (error) {
      logApiResponse(`GET /registrations/event/${eventId}`, null, error);
      throw error;
    }
  },

  /**
   * Get a single registration by ID
   */
  getRegistrationById: async (registrationId: string): Promise<{ success: boolean; data: { registration: Registration } }> => {
    try {
      const response = await ApiService.get(`/registrations/${registrationId}`);
      logApiResponse(`GET /registrations/${registrationId}`, response);
      return response.data;
    } catch (error) {
      logApiResponse(`GET /registrations/${registrationId}`, null, error);
      throw error;
    }
  },

  /**
   * Update a draft registration
   */
  updateRegistration: async (data: UpdateRegistrationRequest): Promise<{ success: boolean; message: string; data: { registration: Registration } }> => {
    try {
      const formData = new FormData();

      // Add registration data
      formData.append('registrationData', JSON.stringify(data.registrationData));

      // Add new files if present
      if (data.files && data.files.length > 0) {
        data.files.forEach((file) => {
          const fieldData = data.registrationData.find(d => d.fieldType === 'file');
          const fieldName = fieldData?.fieldId || 'file';
          formData.append(fieldName, file);
        });
      }

      const response = await ApiService.patch(
        `/registrations/${data.registrationId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      logApiResponse(`PATCH /registrations/${data.registrationId}`, response);
      return response.data;
    } catch (error) {
      logApiResponse(`PATCH /registrations/${data.registrationId}`, null, error);
      throw error;
    }
  },

  /**
   * Withdraw a registration
   */
  withdrawRegistration: async (data: WithdrawRegistrationRequest): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await ApiService.delete(`/registrations/${data.registrationId}`, {
        data: { reason: data.reason },
      });

      logApiResponse(`DELETE /registrations/${data.registrationId}`, response);
      return response.data;
    } catch (error) {
      logApiResponse(`DELETE /registrations/${data.registrationId}`, null, error);
      throw error;
    }
  },

  /**
   * Review a registration (approve/reject) - vendor/admin only
   */
  reviewRegistration: async (data: ReviewRegistrationRequest): Promise<{ success: boolean; message: string; data: { registration: Registration } }> => {
    try {
      const response = await ApiService.post(`/registrations/${data.registrationId}/review`, {
        status: data.status,
        remarks: data.remarks,
      });

      logApiResponse(`POST /registrations/${data.registrationId}/review`, response);
      return response.data;
    } catch (error) {
      logApiResponse(`POST /registrations/${data.registrationId}/review`, null, error);
      throw error;
    }
  },

  /**
   * Download a registration file
   */
  downloadFile: async (registrationId: string, fileId: string): Promise<string> => {
    try {
      // This endpoint redirects to the file URL
      return `/api/registrations/${registrationId}/files/${fileId}`;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create or update registration configuration for an event
   */
  createOrUpdateConfig: async (data: CreateOrUpdateConfigRequest): Promise<{ success: boolean; message: string; data: any }> => {
    try {
      const response = await ApiService.post(`/registrations/config/${data.eventId}`, {
        enabled: data.enabled,
        fields: data.fields,
        maxRegistrations: data.maxRegistrations,
        registrationDeadline: data.registrationDeadline,
        requiresApproval: data.requiresApproval,
        emailNotifications: data.emailNotifications,
      });

      logApiResponse(`POST /registrations/config/${data.eventId}`, response);
      return response.data;
    } catch (error) {
      logApiResponse(`POST /registrations/config/${data.eventId}`, null, error);
      throw error;
    }
  },

  /**
   * Get registration configuration for an event
   */
  getConfig: async (eventId: string): Promise<GetConfigResponse> => {
    try {
      const response = await ApiService.get(`/registrations/config/${eventId}`);
      logApiResponse(`GET /registrations/config/${eventId}`, response);
      return response.data;
    } catch (error) {
      logApiResponse(`GET /registrations/config/${eventId}`, null, error);
      throw error;
    }
  },

  /**
   * Disable registration for an event
   */
  disableRegistration: async (eventId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await ApiService.delete(`/registrations/config/${eventId}`);
      logApiResponse(`DELETE /registrations/config/${eventId}`, response);
      return response.data;
    } catch (error) {
      logApiResponse(`DELETE /registrations/config/${eventId}`, null, error);
      throw error;
    }
  },

  /**
   * Duplicate registration configuration from another event
   */
  duplicateConfig: async (data: DuplicateConfigRequest): Promise<{ success: boolean; message: string; data: any }> => {
    try {
      const response = await ApiService.post(`/registrations/config/${data.eventId}/duplicate`, {
        sourceEventId: data.sourceEventId,
      });

      logApiResponse(`POST /registrations/config/${data.eventId}/duplicate`, response);
      return response.data;
    } catch (error) {
      logApiResponse(`POST /registrations/config/${data.eventId}/duplicate`, null, error);
      throw error;
    }
  },
};

export default registrationAPI;
