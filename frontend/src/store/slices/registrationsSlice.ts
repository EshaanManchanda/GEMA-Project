import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import registrationAPI from '@services/api/registrationAPI';
import { toast } from 'react-hot-toast';
import {
  Registration,
  RegistrationStatus,
  PaymentStatus,
  GetRegistrationsParams,
  RegistrationFormValues,
  FormField,
  RegistrationConfig,
  RegistrationData,
} from '@/types/registration';

interface RegistrationsState {
  // Registrations data
  registrations: Registration[];
  currentRegistration: Registration | null;

  // Loading states
  isLoading: boolean;
  isSubmitting: boolean;
  isUpdating: boolean;
  isWithdrawing: boolean;
  isReviewing: boolean;

  // Error states
  error: string | null;
  submitError: string | null;
  updateError: string | null;

  // Pagination
  pagination: {
    currentPage: number;
    totalPages: number;
    total: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };

  // Stats (for vendor dashboard)
  stats: {
    byStatus: Record<string, number>;
  } | null;

  // Filters
  filters: {
    status?: RegistrationStatus;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  };

  // Registration form state
  registrationForm: {
    eventId: string | null;
    formData: RegistrationFormValues;
    files: Record<string, File>;
    isDraft: boolean;
    config: RegistrationConfig | null;
  };

  // Payment state
  payment: {
    isProcessing: boolean;
    paymentIntentId: string | null;
    clientSecret: string | null;
    registrationId: string | null;
  };

  // Form builder state (for vendors)
  formBuilder: {
    isLoading: boolean;
    isSaving: boolean;
    config: RegistrationConfig | null;
    selectedFieldId: string | null;
    isDirty: boolean;
  };
}

const initialState: RegistrationsState = {
  registrations: [],
  currentRegistration: null,

  isLoading: false,
  isSubmitting: false,
  isUpdating: false,
  isWithdrawing: false,
  isReviewing: false,

  error: null,
  submitError: null,
  updateError: null,

  pagination: {
    currentPage: 1,
    totalPages: 0,
    total: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },

  stats: null,

  filters: {},

  registrationForm: {
    eventId: null,
    formData: {},
    files: {},
    isDraft: false,
    config: null,
  },

  payment: {
    isProcessing: false,
    paymentIntentId: null,
    clientSecret: null,
    registrationId: null,
  },

  formBuilder: {
    isLoading: false,
    isSaving: false,
    config: null,
    selectedFieldId: null,
    isDirty: false,
  },
};

// Async thunks

export const submitRegistration = createAsyncThunk(
  'registrations/submit',
  async (params: {
    eventId: string;
    registrationData: RegistrationData[];
    files?: File[];
    saveAsDraft?: boolean;
  }, { rejectWithValue }) => {
    try {
      const response = await registrationAPI.submitRegistration({
        eventId: params.eventId,
        registrationData: params.registrationData,
        files: params.files,
        saveAsDraft: params.saveAsDraft,
      });

      if (params.saveAsDraft) {
        toast.success('Registration saved as draft');
      } else {
        toast.success('Registration submitted successfully!');
      }

      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit registration';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const confirmRegistrationPayment = createAsyncThunk(
  'registrations/confirmPayment',
  async (params: { registrationId: string; paymentIntentId: string }, { rejectWithValue }) => {
    try {
      const response = await registrationAPI.confirmPayment({
        registrationId: params.registrationId,
        paymentIntentId: params.paymentIntentId,
      });
      toast.success('Payment confirmed successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to confirm payment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchUserRegistrations = createAsyncThunk(
  'registrations/fetchUserRegistrations',
  async (params: GetRegistrationsParams = {}, { rejectWithValue }) => {
    try {
      const response = await registrationAPI.getUserRegistrations(params);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch registrations';
      return rejectWithValue(message);
    }
  }
);

export const fetchEventRegistrations = createAsyncThunk(
  'registrations/fetchEventRegistrations',
  async (params: { eventId: string; queryParams?: GetRegistrationsParams }, { rejectWithValue }) => {
    try {
      const response = await registrationAPI.getEventRegistrations(params.eventId, params.queryParams);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch event registrations';
      return rejectWithValue(message);
    }
  }
);

export const fetchRegistrationById = createAsyncThunk(
  'registrations/fetchById',
  async (registrationId: string, { rejectWithValue }) => {
    try {
      const response = await registrationAPI.getRegistrationById(registrationId);
      return response.data.registration;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch registration';
      return rejectWithValue(message);
    }
  }
);

export const updateRegistration = createAsyncThunk(
  'registrations/update',
  async (params: {
    registrationId: string;
    registrationData: RegistrationData[];
    files?: File[];
  }, { rejectWithValue }) => {
    try {
      const response = await registrationAPI.updateRegistration({
        registrationId: params.registrationId,
        registrationData: params.registrationData,
        files: params.files,
      });
      toast.success('Registration updated successfully!');
      return response.data.registration;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update registration';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const withdrawRegistration = createAsyncThunk(
  'registrations/withdraw',
  async (params: { registrationId: string; reason?: string }, { rejectWithValue }) => {
    try {
      await registrationAPI.withdrawRegistration({
        registrationId: params.registrationId,
        reason: params.reason,
      });
      toast.success('Registration withdrawn successfully');
      return params.registrationId;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to withdraw registration';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const reviewRegistration = createAsyncThunk(
  'registrations/review',
  async (params: {
    registrationId: string;
    status: 'approved' | 'rejected';
    remarks?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await registrationAPI.reviewRegistration({
        registrationId: params.registrationId,
        status: params.status,
        remarks: params.remarks,
      });
      toast.success(`Registration ${params.status} successfully`);
      return response.data.registration;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to review registration';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const downloadRegistrationFile = createAsyncThunk(
  'registrations/downloadFile',
  async (params: { registrationId: string; fileId: string }, { rejectWithValue }) => {
    try {
      const url = await registrationAPI.downloadFile(params.registrationId, params.fileId);
      // Return URL for download
      const response = await fetch(url);
      const blob = await response.blob();
      return blob;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to download file';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchRegistrationConfig = createAsyncThunk(
  'registrations/fetchConfig',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const response = await registrationAPI.getConfig(eventId);
      return response.registrationConfig;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch registration config';
      return rejectWithValue(message);
    }
  }
);

export const saveRegistrationConfig = createAsyncThunk(
  'registrations/saveConfig',
  async (params: {
    eventId: string;
    config: Partial<RegistrationConfig>;
  }, { rejectWithValue }) => {
    try {
      const response = await registrationAPI.createOrUpdateConfig({
        eventId: params.eventId,
        ...params.config,
      });
      // Note: Don't show toast here - let component handle user notifications
      return response.registrationConfig;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save configuration';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const disableEventRegistration = createAsyncThunk(
  'registrations/disable',
  async (eventId: string, { rejectWithValue }) => {
    try {
      await registrationAPI.disableRegistration(eventId);
      toast.success('Registration disabled successfully');
      return eventId;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to disable registration';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const duplicateRegistrationConfig = createAsyncThunk(
  'registrations/duplicateConfig',
  async (params: { eventId: string; sourceEventId: string }, { rejectWithValue }) => {
    try {
      const response = await registrationAPI.duplicateConfig({
        eventId: params.eventId,
        sourceEventId: params.sourceEventId,
      });
      toast.success('Configuration duplicated successfully');
      return response.data.registrationConfig;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to duplicate configuration';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Registrations slice
const registrationsSlice = createSlice({
  name: 'registrations',
  initialState,
  reducers: {
    // Registration form management
    setRegistrationEventId: (state, action: PayloadAction<string>) => {
      state.registrationForm.eventId = action.payload;
      state.registrationForm.formData = {};
      state.registrationForm.files = {};
    },

    updateRegistrationFormField: (state, action: PayloadAction<{ fieldId: string; value: any }>) => {
      const { fieldId, value } = action.payload;
      state.registrationForm.formData[fieldId] = value;
    },

    updateRegistrationFormFile: (state, action: PayloadAction<{ fieldId: string; file: File | null }>) => {
      const { fieldId, file } = action.payload;
      if (file) {
        state.registrationForm.files[fieldId] = file;
      } else {
        delete state.registrationForm.files[fieldId];
      }
    },

    setRegistrationAsDraft: (state, action: PayloadAction<boolean>) => {
      state.registrationForm.isDraft = action.payload;
    },

    setRegistrationConfig: (state, action: PayloadAction<RegistrationConfig>) => {
      state.registrationForm.config = action.payload;
    },

    resetRegistrationForm: (state) => {
      state.registrationForm = {
        eventId: null,
        formData: {},
        files: {},
        isDraft: false,
        config: null,
      };
      state.payment = {
        isProcessing: false,
        paymentIntentId: null,
        clientSecret: null,
        registrationId: null,
      };
    },

    // Form builder management
    setFormBuilderConfig: (state, action: PayloadAction<RegistrationConfig>) => {
      state.formBuilder.config = action.payload;
      state.formBuilder.isDirty = false;
    },

    updateFormBuilderField: (state, action: PayloadAction<{ index: number; field: Partial<FormField> }>) => {
      if (state.formBuilder.config) {
        const { index, field } = action.payload;
        state.formBuilder.config.fields[index] = {
          ...state.formBuilder.config.fields[index],
          ...field,
        };
        state.formBuilder.isDirty = true;
      }
    },

    addFormBuilderField: (state, action: PayloadAction<FormField>) => {
      if (state.formBuilder.config) {
        state.formBuilder.config.fields.push(action.payload);
        state.formBuilder.isDirty = true;
      } else {
        state.formBuilder.config = {
          enabled: true,
          fields: [action.payload],
          requiresApproval: false,
          emailNotifications: {
            toVendor: true,
            toParticipant: true,
          },
        };
        state.formBuilder.isDirty = true;
      }
    },

    removeFormBuilderField: (state, action: PayloadAction<number>) => {
      if (state.formBuilder.config) {
        state.formBuilder.config.fields.splice(action.payload, 1);
        state.formBuilder.isDirty = true;
      }
    },

    reorderFormBuilderFields: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      if (state.formBuilder.config) {
        const { fromIndex, toIndex } = action.payload;
        const [removed] = state.formBuilder.config.fields.splice(fromIndex, 1);
        state.formBuilder.config.fields.splice(toIndex, 0, removed);

        // Update order property
        state.formBuilder.config.fields.forEach((field, index) => {
          field.order = index;
        });

        state.formBuilder.isDirty = true;
      }
    },

    setSelectedField: (state, action: PayloadAction<string | null>) => {
      state.formBuilder.selectedFieldId = action.payload;
    },

    updateFormBuilderSettings: (state, action: PayloadAction<Partial<RegistrationConfig>>) => {
      if (state.formBuilder.config) {
        state.formBuilder.config = {
          ...state.formBuilder.config,
          ...action.payload,
        };
        state.formBuilder.isDirty = true;
      }
    },

    resetFormBuilder: (state) => {
      state.formBuilder = {
        isLoading: false,
        isSaving: false,
        config: null,
        selectedFieldId: null,
        isDirty: false,
      };
    },

    // Filters and pagination
    setFilters: (state, action: PayloadAction<Partial<RegistrationsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.currentPage = 1; // Reset to first page when filters change
    },

    clearFilters: (state) => {
      state.filters = {};
      state.pagination.currentPage = 1;
    },

    // Current registration
    setCurrentRegistration: (state, action: PayloadAction<Registration | null>) => {
      state.currentRegistration = action.payload;
    },

    // Local updates
    updateRegistrationInList: (state, action: PayloadAction<Registration>) => {
      const index = state.registrations.findIndex(reg => reg._id === action.payload._id);
      if (index !== -1) {
        state.registrations[index] = action.payload;
      }

      if (state.currentRegistration?._id === action.payload._id) {
        state.currentRegistration = action.payload;
      }
    },

    removeRegistrationFromList: (state, action: PayloadAction<string>) => {
      state.registrations = state.registrations.filter(reg => reg._id !== action.payload);

      if (state.currentRegistration?._id === action.payload) {
        state.currentRegistration = null;
      }
    },

    // Error handling
    clearErrors: (state) => {
      state.error = null;
      state.submitError = null;
      state.updateError = null;
    },

    clearSubmitError: (state) => {
      state.submitError = null;
    },

    clearUpdateError: (state) => {
      state.updateError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Submit Registration
      .addCase(submitRegistration.pending, (state) => {
        state.isSubmitting = true;
        state.submitError = null;
      })
      .addCase(submitRegistration.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.submitError = null;

        // Set payment info if payment is required
        if (action.payload.data.payment) {
          state.payment = {
            isProcessing: false,
            paymentIntentId: action.payload.data.payment.paymentIntentId,
            clientSecret: action.payload.data.payment.clientSecret,
            registrationId: action.payload.data.registration.id,
          };
        } else {
          // Reset form if no payment required
          registrationsSlice.caseReducers.resetRegistrationForm(state);
        }
      })
      .addCase(submitRegistration.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload as string;
      })

      // Confirm Payment
      .addCase(confirmRegistrationPayment.pending, (state) => {
        state.payment.isProcessing = true;
      })
      .addCase(confirmRegistrationPayment.fulfilled, (state) => {
        state.payment.isProcessing = false;
        registrationsSlice.caseReducers.resetRegistrationForm(state);
      })
      .addCase(confirmRegistrationPayment.rejected, (state, action) => {
        state.payment.isProcessing = false;
        state.submitError = action.payload as string;
      })

      // Fetch User Registrations
      .addCase(fetchUserRegistrations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserRegistrations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.registrations = action.payload.registrations;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchUserRegistrations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Event Registrations
      .addCase(fetchEventRegistrations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEventRegistrations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.registrations = action.payload.registrations;
        state.pagination = action.payload.pagination;
        state.stats = action.payload.stats || null;
        state.error = null;
      })
      .addCase(fetchEventRegistrations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Registration by ID
      .addCase(fetchRegistrationById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRegistrationById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRegistration = action.payload;
        state.error = null;
      })
      .addCase(fetchRegistrationById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Update Registration
      .addCase(updateRegistration.pending, (state) => {
        state.isUpdating = true;
        state.updateError = null;
      })
      .addCase(updateRegistration.fulfilled, (state, action) => {
        state.isUpdating = false;
        registrationsSlice.caseReducers.updateRegistrationInList(state, action);
        state.updateError = null;
      })
      .addCase(updateRegistration.rejected, (state, action) => {
        state.isUpdating = false;
        state.updateError = action.payload as string;
      })

      // Withdraw Registration
      .addCase(withdrawRegistration.pending, (state) => {
        state.isWithdrawing = true;
      })
      .addCase(withdrawRegistration.fulfilled, (state, action) => {
        state.isWithdrawing = false;
        registrationsSlice.caseReducers.removeRegistrationFromList(state, { ...action, payload: action.payload });
      })
      .addCase(withdrawRegistration.rejected, (state, action) => {
        state.isWithdrawing = false;
        state.error = action.payload as string;
      })

      // Review Registration
      .addCase(reviewRegistration.pending, (state) => {
        state.isReviewing = true;
      })
      .addCase(reviewRegistration.fulfilled, (state, action) => {
        state.isReviewing = false;
        registrationsSlice.caseReducers.updateRegistrationInList(state, action);
      })
      .addCase(reviewRegistration.rejected, (state, action) => {
        state.isReviewing = false;
        state.error = action.payload as string;
      })

      // Fetch Registration Config
      .addCase(fetchRegistrationConfig.pending, (state) => {
        state.formBuilder.isLoading = true;
      })
      .addCase(fetchRegistrationConfig.fulfilled, (state, action) => {
        state.formBuilder.isLoading = false;
        state.formBuilder.config = action.payload;
        state.registrationForm.config = action.payload;
        state.formBuilder.isDirty = false;
      })
      .addCase(fetchRegistrationConfig.rejected, (state, action) => {
        state.formBuilder.isLoading = false;
        state.error = action.payload as string;
      })

      // Save Registration Config
      .addCase(saveRegistrationConfig.pending, (state) => {
        state.formBuilder.isSaving = true;
      })
      .addCase(saveRegistrationConfig.fulfilled, (state, action) => {
        state.formBuilder.isSaving = false;
        state.formBuilder.config = action.payload;
        state.formBuilder.isDirty = false;
      })
      .addCase(saveRegistrationConfig.rejected, (state, action) => {
        state.formBuilder.isSaving = false;
        state.error = action.payload as string;
      })

      // Disable Registration
      .addCase(disableEventRegistration.fulfilled, (state) => {
        if (state.formBuilder.config) {
          state.formBuilder.config.enabled = false;
        }
      })

      // Duplicate Config
      .addCase(duplicateRegistrationConfig.fulfilled, (state, action) => {
        state.formBuilder.config = action.payload;
        state.formBuilder.isDirty = true;
      });
  },
});

export const {
  setRegistrationEventId,
  updateRegistrationFormField,
  updateRegistrationFormFile,
  setRegistrationAsDraft,
  setRegistrationConfig,
  resetRegistrationForm,
  setFormBuilderConfig,
  updateFormBuilderField,
  addFormBuilderField,
  removeFormBuilderField,
  reorderFormBuilderFields,
  setSelectedField,
  updateFormBuilderSettings,
  resetFormBuilder,
  setFilters,
  clearFilters,
  setCurrentRegistration,
  updateRegistrationInList,
  removeRegistrationFromList,
  clearErrors,
  clearSubmitError,
  clearUpdateError,
} = registrationsSlice.actions;

export default registrationsSlice.reducer;

// Selectors
export const selectRegistrations = (state: { registrations: RegistrationsState }) =>
  state.registrations?.registrations || [];

export const selectCurrentRegistration = (state: { registrations: RegistrationsState }) =>
  state.registrations?.currentRegistration || null;

export const selectRegistrationStats = (state: { registrations: RegistrationsState }) =>
  state.registrations?.stats || null;

export const selectRegistrationForm = (state: { registrations: RegistrationsState }) =>
  state.registrations?.registrationForm || initialState.registrationForm;

export const selectRegistrationPayment = (state: { registrations: RegistrationsState }) =>
  state.registrations?.payment || initialState.payment;

export const selectFormBuilder = (state: { registrations: RegistrationsState }) =>
  state.registrations?.formBuilder || initialState.formBuilder;

export const selectRegistrationFilters = (state: { registrations: RegistrationsState }) =>
  state.registrations?.filters || {};

export const selectRegistrationPagination = (state: { registrations: RegistrationsState }) =>
  state.registrations?.pagination || initialState.pagination;

export const selectIsRegistrationLoading = (state: { registrations: RegistrationsState }) =>
  state.registrations?.isLoading || false;

export const selectIsSubmittingRegistration = (state: { registrations: RegistrationsState }) =>
  state.registrations?.isSubmitting || false;

export const selectIsUpdatingRegistration = (state: { registrations: RegistrationsState }) =>
  state.registrations?.isUpdating || false;

export const selectIsWithdrawingRegistration = (state: { registrations: RegistrationsState }) =>
  state.registrations?.isWithdrawing || false;

export const selectIsReviewingRegistration = (state: { registrations: RegistrationsState }) =>
  state.registrations?.isReviewing || false;

export const selectRegistrationError = (state: { registrations: RegistrationsState }) =>
  state.registrations?.error || null;

export const selectRegistrationSubmitError = (state: { registrations: RegistrationsState }) =>
  state.registrations?.submitError || null;

export const selectRegistrationUpdateError = (state: { registrations: RegistrationsState }) =>
  state.registrations?.updateError || null;

// Helper selectors
export const selectRegistrationById = (id: string) => (state: { registrations: RegistrationsState }) => {
  return state.registrations?.registrations?.find(reg => reg._id === id) || null;
};

export const selectRegistrationsByStatus = (status: RegistrationStatus) => (state: { registrations: RegistrationsState }) => {
  const registrations = state.registrations?.registrations || [];
  return registrations.filter(reg => reg.status === status);
};

export const selectPendingRegistrations = (state: { registrations: RegistrationsState }) => {
  const registrations = state.registrations?.registrations || [];
  return registrations.filter(reg =>
    reg.status === RegistrationStatus.SUBMITTED ||
    reg.status === RegistrationStatus.UNDER_REVIEW
  );
};

export const selectIsFormBuilderDirty = (state: { registrations: RegistrationsState }) =>
  state.registrations?.formBuilder?.isDirty || false;
