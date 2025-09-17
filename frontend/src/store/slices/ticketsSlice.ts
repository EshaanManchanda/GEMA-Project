import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ticketAPI, Ticket } from '@/services/api/ticketAPI';

interface TicketsState {
  tickets: Ticket[];
  currentTicket: Ticket | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: TicketsState = {
  tickets: [],
  currentTicket: null,
  isLoading: false,
  error: null,
};

export const fetchUserTickets = createAsyncThunk(
  'tickets/fetchUserTickets',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ticketAPI.getTicketsByUser();
      return response.tickets;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTicketsByOrder = createAsyncThunk(
  'tickets/fetchTicketsByOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const response = await ticketAPI.getTicketsByOrder(orderId);
      return response.tickets;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTicketById = createAsyncThunk(
  'tickets/fetchTicketById',
  async (ticketId: string, { rejectWithValue }) => {
    try {
      const response = await ticketAPI.getTicketById(ticketId);
      return response.ticket;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const downloadTicket = createAsyncThunk(
  'tickets/downloadTicket',
  async (ticketId: string, { rejectWithValue }) => {
    try {
      const blob = await ticketAPI.downloadTicket(ticketId);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ticket-${ticketId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return ticketId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateTicketStatus = createAsyncThunk(
  'tickets/updateTicketStatus',
  async ({ ticketId, status }: { ticketId: string; status: 'active' | 'used' | 'cancelled' | 'expired' }, { rejectWithValue }) => {
    try {
      const response = await ticketAPI.updateTicketStatus(ticketId, status);
      return response.ticket;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const generateMissingTickets = createAsyncThunk(
  'tickets/generateMissingTickets',
  async (orderId: string, { rejectWithValue }) => {
    try {
      console.log('🔧 Redux generateMissingTickets - Order ID:', orderId);
      const response = await ticketAPI.generateMissingTickets(orderId);
      console.log('🔧 Redux generateMissingTickets - API Response:', response);
      return response.data.tickets;
    } catch (error: any) {
      console.log('🔧 Redux generateMissingTickets - Error:', error);
      return rejectWithValue(error.message);
    }
  }
);

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    clearTickets: (state) => {
      state.tickets = [];
      state.currentTicket = null;
      state.error = null;
    },
    clearCurrentTicket: (state) => {
      state.currentTicket = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserTickets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserTickets.fulfilled, (state, action: PayloadAction<Ticket[]>) => {
        state.isLoading = false;
        state.tickets = action.payload;
        state.error = null;
      })
      .addCase(fetchUserTickets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchTicketsByOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTicketsByOrder.fulfilled, (state, action: PayloadAction<Ticket[]>) => {
        state.isLoading = false;
        state.tickets = action.payload;
        state.error = null;
      })
      .addCase(fetchTicketsByOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchTicketById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTicketById.fulfilled, (state, action: PayloadAction<Ticket>) => {
        state.isLoading = false;
        state.currentTicket = action.payload;
        state.error = null;
      })
      .addCase(fetchTicketById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(downloadTicket.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(downloadTicket.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(downloadTicket.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(updateTicketStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateTicketStatus.fulfilled, (state, action: PayloadAction<Ticket>) => {
        state.isLoading = false;
        const updatedTicket = action.payload;

        state.tickets = state.tickets.map(ticket =>
          ticket._id === updatedTicket._id ? updatedTicket : ticket
        );

        if (state.currentTicket && state.currentTicket._id === updatedTicket._id) {
          state.currentTicket = updatedTicket;
        }

        state.error = null;
      })
      .addCase(updateTicketStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(generateMissingTickets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generateMissingTickets.fulfilled, (state, action: PayloadAction<Ticket[]>) => {
        state.isLoading = false;
        state.tickets = action.payload;
        state.error = null;
      })
      .addCase(generateMissingTickets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearTickets, clearCurrentTicket, clearError } = ticketsSlice.actions;
export default ticketsSlice.reducer;