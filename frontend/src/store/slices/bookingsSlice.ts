import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import bookingAPI from '@services/api/bookingAPI';
import { Event } from '../../types/event';
import { toast } from 'react-hot-toast';
import { generateBookingQRWithEventData, generateOrderQRWithEventData } from '@/utils/qrcode.utils';

export interface BookingParticipant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  specialRequirements?: string;
  dietaryRestrictions?: string[];
  // Dynamic registration form data
  registrationData?: { fieldId: string; fieldLabel: string; fieldType: string; value: any; }[];
}

export interface BookingPayment {
  method: 'card' | 'wallet' | 'bank_transfer' | 'cash';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  transactionId?: string;
  paymentDate?: string;
  refundAmount?: number;
  refundDate?: string;
  refundReason?: string;
}

export interface Booking {
  id: string;
  userId: string;
  eventId: string;
  event: Event;
  
  // Booking details
  bookingNumber: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  bookingDate: string;
  
  // Participants
  participants: BookingParticipant[];
  totalParticipants: number;
  
  // Pricing
  unitPrice: number;
  totalAmount: number;
  currency: string;
  discountAmount?: number;
  couponCode?: string;
  taxAmount?: number;
  serviceFee?: number;
  
  // Payment
  payment: BookingPayment;
  
  // Additional info
  specialRequests?: string;

  // QR Code data

  qrCodeData?: {
    bookingQR: string;
    orderQR: string;
    generatedAt: string;
  };
  notes?: string;
  source: 'web' | 'mobile' | 'admin';
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Cancellation
  cancellationReason?: string;
  cancellationDate?: string;
  refundEligible?: boolean;
  
  // Check-in
  checkInStatus?: 'not_checked_in' | 'checked_in' | 'no_show';
  checkInDate?: string;
  qrCode?: string;
}

export interface BookingStats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  completed: number;
  totalSpent: number;
  currency: string;
  upcomingEvents: number;
  pastEvents: number;
}

interface BookingsState {
  // Bookings data
  bookings: Booking[];
  currentBooking: Booking | null;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isCancelling: boolean;
  isRefunding: boolean;
  
  // Error states
  error: string | null;
  createError: string | null;
  updateError: string | null;
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Filters
  filters: {
    status?: string;
    dateRange?: {
      start: string;
      end: string;
    };
    eventCategory?: string;
    sortBy: 'date' | 'amount' | 'status';
    sortOrder: 'asc' | 'desc';
  };
  
  // Stats
  stats: BookingStats | null;
  
  // Current booking flow
  bookingFlow: {
    step: 'details' | 'participants' | 'payment' | 'confirmation';
    eventId: string | null;
    scheduleId: string | null;
    participants: BookingParticipant[];
    paymentMethod: string | null;
    specialRequests: string;
    couponCode: string;
    agreedToTerms: boolean;
  };
  
  // Checkout state
  checkout: {
    isProcessing: boolean;
    paymentIntent: string | null;
    clientSecret: string | null;
    orderId: string | null;
  };
}

const initialState: BookingsState = {
  bookings: [],
  currentBooking: null,
  
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isCancelling: false,
  isRefunding: false,
  
  error: null,
  createError: null,
  updateError: null,
  
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  
  filters: {
    sortBy: 'date',
    sortOrder: 'desc',
  },
  
  stats: null,
  
  bookingFlow: {
    step: 'details',
    eventId: null,
    scheduleId: null,
    participants: [],
    paymentMethod: null,
    specialRequests: '',
    couponCode: '',
    agreedToTerms: false,
  },
  
  checkout: {
    isProcessing: false,
    paymentIntent: null,
    clientSecret: null,
    orderId: null,
  },
};

// Async thunks
export const fetchBookings = createAsyncThunk(
  'bookings/fetchBookings',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    dateRange?: { start: string; end: string };
    sortBy?: string;
    sortOrder?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.getUserBookings(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch bookings';
      return rejectWithValue(message);
    }
  }
);

export const fetchBookingById = createAsyncThunk(
  'bookings/fetchBookingById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.getBookingById(id);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch booking';
      return rejectWithValue(message);
    }
  }
);

export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async (bookingData: {
    eventId: string;
    participants: BookingParticipant[];
    paymentMethod: string;
    specialRequests?: string;
    couponCode?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.createBooking(bookingData);
      toast.success('Booking created successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create booking';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateBooking = createAsyncThunk(
  'bookings/updateBooking',
  async (params: {
    id: string;
    updates: Partial<Booking>;
  }, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.updateBooking(params.id, params.updates);
      toast.success('Booking updated successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update booking';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async (params: {
    id: string;
    reason: string;
  }, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.cancelBooking(params.id, params.reason);
      toast.success('Booking cancelled successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to cancel booking';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const requestRefund = createAsyncThunk(
  'bookings/requestRefund',
  async (params: {
    id: string;
    reason: string;
    amount?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.requestRefund(params.id, params.reason);
      toast.success('Refund request submitted successfully');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to request refund';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const checkInBooking = createAsyncThunk(
  'bookings/checkInBooking',
  async (params: {
    id: string;
    qrCode?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.checkIn(params.id, params.qrCode);
      toast.success('Checked in successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to check in';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchBookingStats = createAsyncThunk(
  'bookings/fetchBookingStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.getBookingStats();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch booking stats';
      return rejectWithValue(message);
    }
  }
);

export const createPaymentIntent = createAsyncThunk(
  'bookings/createPaymentIntent',
  async (
    params: {
      eventId: string;
      participants: number;
      dateScheduleId?: string;
      couponCode?: string;
      currency?: string; // Add currency parameter
    },
    { rejectWithValue }
  ) => {
    try {
      // Pass parameters directly to API - participants should be a number (count)
      // The actual participant data will be sent during booking confirmation
      const response = await bookingAPI.createPaymentIntent({
        eventId: params.eventId,
        participants: params.participants, // Keep as number (participant count)
        dateScheduleId: params.dateScheduleId,
        couponCode: params.couponCode,
        currency: params.currency, // Pass currency to the API
      });
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create payment intent';
      return rejectWithValue(message);
    }
  }
);

export const confirmPayment = createAsyncThunk(
  'bookings/confirmPayment',
  async (params: {
    paymentIntentId: string;
    bookingData: any;
  }, { rejectWithValue }) => {
    try {
      const response = await bookingAPI.confirmPayment(params.paymentIntentId, params.bookingData);
      toast.success('Payment confirmed! Booking created successfully.');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Payment confirmation failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Helper function to generate QR codes for confirmed bookings with smart event date expiration
const generateBookingQRCodes = (booking: Booking): Booking => {
  if (booking.status === 'confirmed' || booking.status === 'completed') {
    try {
      console.log('🔄 Generating QR codes with event-based expiration for booking:', booking.bookingNumber);

      // Use smart QR generation with event dates (2 hour grace period)
      const bookingQR = generateBookingQRWithEventData(
        booking.bookingNumber,
        booking,
        2 // 2 hour grace period after event ends
      );

      const orderQR = generateOrderQRWithEventData(
        booking.bookingNumber, // Using booking number as order ID
        booking,
        2 // 2 hour grace period after event ends
      );

      console.log('✅ QR codes generated successfully with event-based expiration');

      return {
        ...booking,
        qrCodeData: {
          bookingQR,
          orderQR,
          generatedAt: new Date().toISOString()
        },
        qrCode: bookingQR // Legacy field for backward compatibility
      };
    } catch (error) {
      console.error('❌ Failed to generate QR codes for booking:', booking.id, error);
      return booking;
    }
  }
  return booking;
};

// Bookings slice
const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    // Booking flow management
    setBookingStep: (state, action: PayloadAction<BookingsState['bookingFlow']['step']>) => {
      state.bookingFlow.step = action.payload;
    },
    
    setBookingEvent: (state, action: PayloadAction<string>) => {
      state.bookingFlow.eventId = action.payload;
      state.bookingFlow.step = 'details';
    },

    setBookingSchedule: (state, action: PayloadAction<string>) => {
      state.bookingFlow.scheduleId = action.payload;
    },

    setBookingParticipants: (state, action: PayloadAction<BookingParticipant[]>) => {
      state.bookingFlow.participants = action.payload;
    },
    
    addParticipant: (state, action: PayloadAction<BookingParticipant>) => {
      state.bookingFlow.participants.push(action.payload);
    },
    
    updateParticipant: (state, action: PayloadAction<{
      index: number;
      participant: Partial<BookingParticipant>;
    }>) => {
      const { index, participant } = action.payload;
      if (state.bookingFlow.participants[index]) {
        state.bookingFlow.participants[index] = {
          ...state.bookingFlow.participants[index],
          ...participant,
        };
      }
    },

    // Update registration data for a participant
    updateParticipantRegistrationData: (state, action: PayloadAction<{
      index: number;
      registrationData: { fieldId: string; fieldLabel: string; fieldType: string; value: any; }[];
    }>) => {
      const { index, registrationData } = action.payload;
      if (state.bookingFlow.participants[index]) {
        state.bookingFlow.participants[index].registrationData = registrationData;
      }
    },
    
    removeParticipant: (state, action: PayloadAction<number>) => {
      state.bookingFlow.participants.splice(action.payload, 1);
    },
    
    setPaymentMethod: (state, action: PayloadAction<string>) => {
      state.bookingFlow.paymentMethod = action.payload;
    },
    
    setSpecialRequests: (state, action: PayloadAction<string>) => {
      state.bookingFlow.specialRequests = action.payload;
    },
    
    setCouponCode: (state, action: PayloadAction<string>) => {
      state.bookingFlow.couponCode = action.payload;
    },
    
    setAgreedToTerms: (state, action: PayloadAction<boolean>) => {
      state.bookingFlow.agreedToTerms = action.payload;
    },
    
    resetBookingFlow: (state) => {
      state.bookingFlow = {
        step: 'details',
        eventId: null,
        scheduleId: null,
        participants: [],
        paymentMethod: null,
        specialRequests: '',
        couponCode: '',
        agreedToTerms: false,
      };
      state.checkout = {
        isProcessing: false,
        paymentIntent: null,
        clientSecret: null,
        orderId: null,
      };
    },
    
    // Filters and pagination
    setFilters: (state, action: PayloadAction<Partial<BookingsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page when filters change
    },
    
    setPagination: (state, action: PayloadAction<Partial<BookingsState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    
    // Current booking
    setCurrentBooking: (state, action: PayloadAction<Booking | null>) => {
      state.currentBooking = action.payload;
    },
    
    // Local booking updates
    updateBookingInList: (state, action: PayloadAction<Booking>) => {
      const index = state.bookings.findIndex(booking => booking.id === action.payload.id);
      if (index !== -1) {
        state.bookings[index] = action.payload;
      }
      
      if (state.currentBooking?.id === action.payload.id) {
        state.currentBooking = action.payload;
      }
    },
    
    removeBookingFromList: (state, action: PayloadAction<string>) => {
      state.bookings = state.bookings.filter(booking => booking.id !== action.payload);

      if (state.currentBooking?.id === action.payload) {
        state.currentBooking = null;
      }
    },

    // Generate QR codes for confirmed bookings
    generateQRCodesForBooking: (state, action: PayloadAction<string>) => {
      const bookingIndex = state.bookings.findIndex(booking => booking.id === action.payload);
      if (bookingIndex !== -1) {
        const booking = state.bookings[bookingIndex];
        const bookingWithQR = generateBookingQRCodes(booking);
        state.bookings[bookingIndex] = bookingWithQR;

        if (state.currentBooking?.id === action.payload) {
          state.currentBooking = bookingWithQR;
        }
      }
    },
    
    // Error handling
    clearErrors: (state) => {
      state.error = null;
      state.createError = null;
      state.updateError = null;
    },
    
    clearCreateError: (state) => {
      state.createError = null;
    },
    
    clearUpdateError: (state) => {
      state.updateError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Bookings
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings = action.payload.bookings;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
        state.error = null;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch Booking by ID
      .addCase(fetchBookingById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookingById.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.isLoading = false;
        state.currentBooking = action.payload;
        state.error = null;
      })
      .addCase(fetchBookingById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create Booking
      .addCase(createBooking.pending, (state) => {
        state.isCreating = true;
        state.createError = null;
      })
      .addCase(createBooking.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.isCreating = false;

        // Generate QR codes for confirmed booking
        const bookingWithQR = generateBookingQRCodes(action.payload);

        state.bookings.unshift(bookingWithQR);
        state.currentBooking = bookingWithQR;
        state.createError = null;

        // Reset booking flow
        bookingsSlice.caseReducers.resetBookingFlow(state);
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.isCreating = false;
        state.createError = action.payload as string;
      })
      
      // Update Booking
      .addCase(updateBooking.pending, (state) => {
        state.isUpdating = true;
        state.updateError = null;
      })
      .addCase(updateBooking.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.isUpdating = false;

        // Generate QR codes if booking is confirmed and doesn't have them yet
        const bookingWithQR = generateBookingQRCodes(action.payload);
        bookingsSlice.caseReducers.updateBookingInList(state, { ...action, payload: bookingWithQR });

        state.updateError = null;
      })
      .addCase(updateBooking.rejected, (state, action) => {
        state.isUpdating = false;
        state.updateError = action.payload as string;
      })
      
      // Cancel Booking
      .addCase(cancelBooking.pending, (state) => {
        state.isCancelling = true;
      })
      .addCase(cancelBooking.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.isCancelling = false;
        bookingsSlice.caseReducers.updateBookingInList(state, action);
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.isCancelling = false;
        state.error = action.payload as string;
      })
      
      // Request Refund
      .addCase(requestRefund.pending, (state) => {
        state.isRefunding = true;
      })
      .addCase(requestRefund.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.isRefunding = false;
        bookingsSlice.caseReducers.updateBookingInList(state, action);
      })
      .addCase(requestRefund.rejected, (state, action) => {
        state.isRefunding = false;
        state.error = action.payload as string;
      })
      
      // Check In
      .addCase(checkInBooking.fulfilled, (state, action: PayloadAction<Booking>) => {
        bookingsSlice.caseReducers.updateBookingInList(state, action);
      })
      
      // Fetch Stats
      .addCase(fetchBookingStats.fulfilled, (state, action: PayloadAction<BookingStats>) => {
        state.stats = action.payload;
      })
      
      // Create Payment Intent
      .addCase(createPaymentIntent.pending, (state) => {
        state.checkout.isProcessing = true;
      })
      .addCase(createPaymentIntent.fulfilled, (state, action) => {
        state.checkout.isProcessing = false;
        state.checkout.paymentIntent = action.payload.paymentIntentId;
        state.checkout.clientSecret = action.payload.clientSecret;
        state.checkout.orderId = action.payload.orderId;
      })
      .addCase(createPaymentIntent.rejected, (state, action) => {
        state.checkout.isProcessing = false;
        state.createError = action.payload as string;
      })
      
      // Confirm Payment
      .addCase(confirmPayment.pending, (state) => {
        state.checkout.isProcessing = true;
      })
      .addCase(confirmPayment.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.checkout.isProcessing = false;

        // Generate QR codes for confirmed booking
        const bookingWithQR = generateBookingQRCodes(action.payload);

        state.bookings.unshift(bookingWithQR);
        state.currentBooking = bookingWithQR;

        // Reset booking flow and checkout
        bookingsSlice.caseReducers.resetBookingFlow(state);
      })
      .addCase(confirmPayment.rejected, (state, action) => {
        state.checkout.isProcessing = false;
        state.createError = action.payload as string;
      });
  },
});

export const {
  setBookingStep,
  setBookingEvent,
  setBookingSchedule,
  setBookingParticipants,
  addParticipant,
  updateParticipant,
  updateParticipantRegistrationData,
  removeParticipant,
  setPaymentMethod,
  setSpecialRequests,
  setCouponCode,
  setAgreedToTerms,
  resetBookingFlow,
  setFilters,
  setPagination,
  setCurrentBooking,
  updateBookingInList,
  removeBookingFromList,
  generateQRCodesForBooking,
  clearErrors,
  clearCreateError,
  clearUpdateError,
} = bookingsSlice.actions;

export default bookingsSlice.reducer;

// Selectors - Updated to use correct RootState interface pattern
export const selectBookings = (state: { bookings: BookingsState }) => state.bookings?.bookings || [];
export const selectCurrentBooking = (state: { bookings: BookingsState }) => state.bookings?.currentBooking || null;
export const selectBookingStats = (state: { bookings: BookingsState }) => state.bookings?.stats || null;

export const selectBookingFlow = (state: { bookings: BookingsState }) => state.bookings?.bookingFlow || {
  step: 'details' as const,
  eventId: null,
  scheduleId: null,
  participants: [],
  paymentMethod: null,
  specialRequests: '',
  couponCode: '',
  agreedToTerms: false,
};
export const selectBookingStep = (state: { bookings: BookingsState }) => state.bookings?.bookingFlow?.step || 'details';
export const selectBookingParticipants = (state: { bookings: BookingsState }) => state.bookings?.bookingFlow?.participants || [];
export const selectCheckout = (state: { bookings: BookingsState }) => state.bookings?.checkout || {
  isProcessing: false,
  paymentIntent: null,
  clientSecret: null,
  orderId: null,
};

export const selectBookingFilters = (state: { bookings: BookingsState }) => state.bookings?.filters || {
  sortBy: 'date' as const,
  sortOrder: 'desc' as const,
};
export const selectBookingPagination = (state: { bookings: BookingsState }) => state.bookings?.pagination || {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export const selectIsBookingLoading = (state: { bookings: BookingsState }) => state.bookings?.isLoading || false;
export const selectIsCreatingBooking = (state: { bookings: BookingsState }) => state.bookings?.isCreating || false;
export const selectIsUpdatingBooking = (state: { bookings: BookingsState }) => state.bookings?.isUpdating || false;
export const selectIsCancellingBooking = (state: { bookings: BookingsState }) => state.bookings?.isCancelling || false;
export const selectIsRefundingBooking = (state: { bookings: BookingsState }) => state.bookings?.isRefunding || false;

export const selectBookingError = (state: { bookings: BookingsState }) => state.bookings?.error || null;
export const selectBookingCreateError = (state: { bookings: BookingsState }) => state.bookings?.createError || null;
export const selectBookingUpdateError = (state: { bookings: BookingsState }) => state.bookings?.updateError || null;

// Helper selectors - Updated to use correct RootState interface pattern
export const selectBookingById = (id: string) => (state: { bookings: BookingsState }) => {
  return state.bookings?.bookings?.find(booking => booking.id === id) || null;
};

export const selectUpcomingBookings = (state: { bookings: BookingsState }) => {
  const now = new Date();
  const bookings = state.bookings?.bookings || [];
  return bookings.filter(booking => {
    try {
      const eventDate = new Date(booking.event?.dateSchedule?.[0]?.startDateTime || '');
      return eventDate > now && booking.status === 'confirmed';
    } catch {
      return false;
    }
  });
};

export const selectPastBookings = (state: { bookings: BookingsState }) => {
  const now = new Date();
  const bookings = state.bookings?.bookings || [];
  return bookings.filter(booking => {
    try {
      const eventDate = new Date(booking.event?.dateSchedule?.[0]?.endDateTime || '');
      return eventDate < now;
    } catch {
      return false;
    }
  });
};

export const selectBookingsByStatus = (status: string) => (state: { bookings: BookingsState }) => {
  const bookings = state.bookings?.bookings || [];
  return bookings.filter(booking => booking.status === status);
};

export const selectCanProceedToNextStep = (state: { bookings: BookingsState }) => {
  const bookingFlow = state.bookings?.bookingFlow;
  if (!bookingFlow) return false;

  const { step, eventId, scheduleId, participants, paymentMethod, agreedToTerms } = bookingFlow;

  switch (step) {
    case 'details':
      return !!eventId && !!scheduleId; // Must have both event and schedule selected
    case 'participants':
      return participants.length > 0 && participants.every(p => p.name && p.email);
    case 'payment':
      return !!paymentMethod && agreedToTerms;
    case 'confirmation':
      return true;
    default:
      return false;
  }
};

export const selectBookingFlowProgress = (state: { bookings: BookingsState }) => {
  const bookingFlow = state.bookings?.bookingFlow;
  if (!bookingFlow) return 0;
  
  const steps = ['details', 'participants', 'payment', 'confirmation'];
  const currentStepIndex = steps.indexOf(bookingFlow.step);
  return ((currentStepIndex + 1) / steps.length) * 100;
};

export const selectTotalBookingAmount = (state: { bookings: BookingsState }) => {
  const bookings = state.bookings?.bookings || [];
  return bookings.reduce((total, booking) => total + (booking.totalAmount || 0), 0);
};

export const selectBookingParticipantsCount = (state: { bookings: BookingsState }) => {
  return state.bookings?.bookingFlow?.participants?.length || 0;
};

export const selectIsBookingFlowComplete = (state: { bookings: BookingsState }) => {
  const bookingFlow = state.bookings?.bookingFlow;
  if (!bookingFlow) return false;

  const { eventId, scheduleId, participants, paymentMethod, agreedToTerms } = bookingFlow;
  return !!eventId && !!scheduleId && participants.length > 0 && !!paymentMethod && agreedToTerms;
};