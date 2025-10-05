import { Schema, model, Document, Types } from 'mongoose';

export interface IBooking extends Document {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  bookingDate: Date;
  numberOfTickets: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  bookingDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  numberOfTickets: {
    type: Number,
    required: true,
    min: 1,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  },
  paymentIntentId: {
    type: String,
  },
},
{
  timestamps: true,
});

// Indexes for performance optimization
BookingSchema.index({ userId: 1 }); // User's bookings
BookingSchema.index({ eventId: 1 }); // Event's bookings
BookingSchema.index({ status: 1 }); // Filter by status
BookingSchema.index({ createdAt: -1 }); // Sort by creation date
BookingSchema.index({ userId: 1, status: 1 }); // User's bookings by status
BookingSchema.index({ eventId: 1, status: 1 }); // Event's bookings by status
BookingSchema.index({ userId: 1, createdAt: -1 }); // User's recent bookings
BookingSchema.index({ paymentIntentId: 1 }, { sparse: true }); // Stripe payment lookup

const Booking = model<IBooking>('Booking', BookingSchema);

export default Booking;