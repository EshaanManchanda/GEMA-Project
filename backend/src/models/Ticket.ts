import { Schema, model, Document, Types } from 'mongoose';

// Ticket status enum
export enum TicketStatus {
  ACTIVE = 'active',
  USED = 'used',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  TRANSFERRED = 'transferred'
}

// Transfer history interface
export interface ITransferHistory {
  fromUserId: Types.ObjectId;
  toUserId: Types.ObjectId;
  transferredAt: Date;
  reason?: string;
}

// Check-in details interface
export interface ICheckInDetails {
  isCheckedIn: boolean;
  checkInTime?: Date;
  checkInBy?: Types.ObjectId;
  checkInLocation?: string;
  scanCount: number;
}

export interface ITicket extends Document {
  ticketNumber: string;
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  vendorId: Types.ObjectId;
  qrCode: string;
  qrCodeImage: string;
  ticketType: string;
  seatNumber?: string;
  seatsAllocated?: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  price: number;
  currency: string;
  status: 'active' | 'used' | 'cancelled' | 'refunded' | 'expired' | 'transferred';
  checkInDetails?: ICheckInDetails;
  validFrom?: Date;
  validUntil?: Date;
  transferHistory?: ITransferHistory[];
  metadata?: {
    ipAddress?: string;
    deviceInfo?: string;
    browserInfo?: string;
    generatedBy?: Types.ObjectId;
    lastValidatedBy?: Types.ObjectId;
    lastValidatedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  isExpired: boolean;
  isValid: boolean;
  canBeTransferred: boolean;
  
  // Methods
  markAsUsed(checkedInBy?: Types.ObjectId, notes?: string): Promise<ITicket>;
  cancel(reason?: string): Promise<ITicket>;
  transfer(toUserId: Types.ObjectId, reason?: string): Promise<ITicket>;
}

const TicketSchema = new Schema<ITicket>({
  ticketNumber: { type: String, required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  qrCode: { type: String, required: true },
  qrCodeImage: { type: String, required: true },
  ticketType: { type: String, required: true },
  seatNumber: { type: String },
  seatsAllocated: { type: Number, default: 1 },
  attendeeName: { type: String, required: true },
  attendeeEmail: { type: String, required: true },
  attendeePhone: { type: String },
  price: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, enum: ['active', 'used', 'cancelled', 'refunded', 'expired', 'transferred'], default: 'active' },
  checkInDetails: {
    isCheckedIn: { type: Boolean, default: false },
    checkInTime: { type: Date },
    checkInBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
    checkInLocation: { type: String },
    scanCount: { type: Number, default: 0 },
  },
  validFrom: { type: Date },
  validUntil: { type: Date },
  transferHistory: [{
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    transferredAt: { type: Date, default: Date.now },
    reason: { type: String },
  }],
  metadata: {
    ipAddress: { type: String },
    deviceInfo: { type: String },
    browserInfo: { type: String },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastValidatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastValidatedAt: { type: Date },
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
TicketSchema.index({ ticketNumber: 1 }, { unique: true });
TicketSchema.index({ orderId: 1 });
TicketSchema.index({ eventId: 1 });
TicketSchema.index({ userId: 1 });
TicketSchema.index({ vendorId: 1 });
TicketSchema.index({ attendeeEmail: 1 });
TicketSchema.index({ status: 1 });
TicketSchema.index({ validFrom: 1, validUntil: 1 });
TicketSchema.index({ vendorId: 1, status: 1 }); // Composite index for vendor validation

// Virtual fields
TicketSchema.virtual('isExpired').get(function() {
  return this.validUntil ? new Date() > this.validUntil : false;
});

TicketSchema.virtual('isValid').get(function() {
  if (!this.validFrom || !this.validUntil) return this.status === 'active';
  const now = new Date();
  return now >= this.validFrom && 
         now <= this.validUntil && 
         this.status === 'active';
});

TicketSchema.virtual('canBeTransferred').get(function() {
  return this.status === 'active' && 
         (!this.checkInDetails?.isCheckedIn) &&
         !this.isExpired;
});

// Pre-save middleware
TicketSchema.pre('save', function(next) {
  // Auto-expire tickets if past validity date
  if (this.validUntil && new Date() > this.validUntil && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

// Instance methods
TicketSchema.methods.markAsUsed = function(checkedInBy?: Types.ObjectId, notes?: string) {
  if (this.status !== 'active') {
    throw new Error('Only active tickets can be marked as used');
  }
  
  if (this.isExpired) {
    throw new Error('Cannot mark expired ticket as used');
  }
  
  this.status = 'used';
  if (!this.checkInDetails) {
    this.checkInDetails = { isCheckedIn: false, scanCount: 0 };
  }
  this.checkInDetails.isCheckedIn = true;
  this.checkInDetails.checkInTime = new Date();
  this.checkInDetails.scanCount += 1;
  
  if (checkedInBy) {
    this.checkInDetails.checkInBy = checkedInBy;
  }
  
  return this.save();
};

TicketSchema.methods.cancel = function(reason?: string) {
  if (this.checkInDetails?.isCheckedIn) {
    throw new Error('Cannot cancel a ticket that has been used');
  }
  
  this.status = 'cancelled';
  
  if (reason) {
    if (!this.transferHistory) {
      this.transferHistory = [];
    }
    this.transferHistory.push({
      fromUserId: this.userId,
      toUserId: this.userId,
      transferredAt: new Date(),
      reason: `Cancelled: ${reason}`
    });
  }
  
  return this.save();
};

TicketSchema.methods.transfer = function(toUserId: Types.ObjectId, reason?: string) {
  if (!this.canBeTransferred) {
    throw new Error('This ticket cannot be transferred');
  }
  
  const fromUserId = this.userId;
  
  // Update ownership
  this.userId = toUserId;
  this.status = 'transferred';
  
  // Add to transfer history
  if (!this.transferHistory) {
    this.transferHistory = [];
  }
  
  this.transferHistory.push({
    fromUserId,
    toUserId,
    transferredAt: new Date(),
    reason
  });
  
  return this.save();
};

// Static methods
TicketSchema.statics.findByEvent = function(eventId: Types.ObjectId) {
  return this.find({ eventId })
    .populate('userId', 'firstName lastName email')
    .populate('eventId', 'title dateSchedule location')
    .sort({ createdAt: -1 });
};

TicketSchema.statics.findByUser = function(userId: Types.ObjectId) {
  return this.find({ userId })
    .populate('eventId', 'title dateSchedule location images')
    .sort({ createdAt: -1 });
};

const Ticket = model<ITicket>('Ticket', TicketSchema);

export default Ticket;