export interface Booking {
  _id: string;
  bookingNumber: string;
  userId: string;
  eventId: string;
  dateScheduleId: string;
  seats: number;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  participants?: Array<{ name: string; email: string }>;
  createdAt: string;
  updatedAt: string;
}
