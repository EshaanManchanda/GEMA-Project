import mongoose, { Document, Schema } from 'mongoose';

// Participant interface for events requiring participant info
export interface IParticipant {
  name: string;
  age: number;
  gender?: 'male' | 'female' | 'other';
  allergies?: string[];
  medicalConditions?: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  specialRequirements?: string;
}

export interface IOrderItem {
  eventId: mongoose.Types.ObjectId;
  eventTitle: string;
  scheduleDate: Date;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  participants?: IParticipant[];
  _id?: mongoose.Types.ObjectId;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  orderNumber: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: 'stripe' | 'paypal' | 'razorpay';
  paymentIntentId?: string;
  transactionId?: string;
  affiliateCode?: string;
  couponCode?: string;
  couponDiscount?: number;
  billingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  
  // Enhanced features from Booking model
  specialRequests?: string;
  accessibilityNeeds?: string[];
  dietaryRestrictions?: string[];
  
  // Check-in functionality
  checkIn?: {
    checkedInAt: Date;
    checkedInBy: mongoose.Types.ObjectId;
    notes?: string;
  };
  
  // Communication logs
  communications: Array<{
    type: 'email' | 'sms' | 'push' | 'call';
    subject?: string;
    message: string;
    sentAt: Date;
    status: 'sent' | 'delivered' | 'failed' | 'bounced';
    metadata?: any;
  }>;
  
  // Source tracking
  source: 'web' | 'mobile' | 'admin' | 'vendor';
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  cancel(reason?: string): Promise<IOrder>;
  confirm(): Promise<IOrder>;
  markAsPaid(transactionId?: string, paymentMethod?: string): Promise<IOrder>;
  refund(amount: number, reason?: string): Promise<IOrder>;
  checkInOrder(checkedInBy: mongoose.Types.ObjectId, notes?: string): Promise<IOrder>;
  addCommunication(type: string, message: string, subject?: string): void;
  calculateRefundAmount(): number;
}

const orderItemSchema = new Schema<IOrderItem>({
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required'],
  },
  eventTitle: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
  },
  scheduleDate: {
    type: Date,
    required: [true, 'Schedule date is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [50, 'Quantity cannot exceed 50'],
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative'],
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative'],
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: ['AED', 'EGP', 'CAD', 'USD'],
  },
  participants: [{
    name: {
      type: String,
      required: [true, 'Participant name is required'],
      trim: true,
    },
    age: {
      type: Number,
      required: [true, 'Participant age is required'],
      min: 0,
      max: 120,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    allergies: [String],
    medicalConditions: [String],
    emergencyContact: {
      name: {
        type: String,
        required: function(this: any) {
          return this.age < 18;
        },
      },
      relationship: {
        type: String,
        required: function(this: any) {
          return this.age < 18;
        },
      },
      phone: {
        type: String,
        required: function(this: any) {
          return this.age < 18;
        },
      },
    },
    specialRequirements: String,
  }],
});

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],

      trim: true,
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'Order items are required'],
      validate: {
        validator: function (v: IOrderItem[]) {
          return v.length > 0;
        },
        message: 'Order must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: [0, 'Total cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: ['AED', 'EGP', 'CAD', 'USD'],
      default: 'AED',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'paypal', 'razorpay'],
    },
    paymentIntentId: {
      type: String,
      trim: true,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    affiliateCode: {
      type: String,
      trim: true,
    },
    couponCode: {
      type: String,
      trim: true,
    },
    couponDiscount: {
      type: Number,
      min: [0, 'Coupon discount cannot be negative'],
    },
    billingAddress: {
      firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
      },
      lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: [true, 'Phone is required'],
        trim: true,
      },
      address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
      },
      zipCode: {
        type: String,
        required: [true, 'Zip code is required'],
        trim: true,
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
      },
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative'],
    },
    refundReason: {
      type: String,
      maxlength: [200, 'Refund reason cannot exceed 200 characters'],
    },
    refundedAt: Date,
    confirmedAt: Date,
    cancelledAt: Date,
    
    // Enhanced features
    specialRequests: {
      type: String,
      maxlength: [1000, 'Special requests cannot exceed 1000 characters'],
    },
    accessibilityNeeds: [String],
    dietaryRestrictions: [String],
    
    // Check-in functionality
    checkIn: {
      checkedInAt: Date,
      checkedInBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      notes: String,
    },
    
    // Communication logs
    communications: [{
      type: {
        type: String,
        enum: ['email', 'sms', 'push', 'call'],
        required: true,
      },
      subject: String,
      message: {
        type: String,
        required: true,
      },
      sentAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ['sent', 'delivered', 'failed', 'bounced'],
        default: 'sent',
      },
      metadata: Schema.Types.Mixed,
    }],
    
    // Source tracking
    source: {
      type: String,
      enum: ['web', 'mobile', 'admin', 'vendor'],
      default: 'web',
    },
    userAgent: String,
    ipAddress: String,
    referrer: String,
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for performance
orderSchema.index({ userId: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentIntentId: 1 });
orderSchema.index({ transactionId: 1 });
orderSchema.index({ affiliateCode: 1 });
orderSchema.index({ couponCode: 1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const timestamp = new Date().getTime().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.orderNumber = `GM-${timestamp}-${random}`;
  }
  next();
});

// Pre-save middleware to calculate totals
orderSchema.pre('save', function (next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // Calculate total (subtotal + tax - discount - couponDiscount)
  this.total = this.subtotal + (this.tax || 0) - (this.discount || 0) - (this.couponDiscount || 0);
  
  // Ensure total is not negative
  if (this.total < 0) {
    this.total = 0;
  }
  
  next();
});

// Method to mark order as confirmed
orderSchema.methods.confirm = function () {
  this.status = 'confirmed';
  this.confirmedAt = new Date();
  return this.save();
};

// Method to mark order as cancelled
orderSchema.methods.cancel = function (reason?: string) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) {
    this.notes = reason;
  }
  return this.save();
};

// Method to mark payment as paid
orderSchema.methods.markAsPaid = function (transactionId?: string, paymentMethod?: string) {
  this.paymentStatus = 'paid';
  if (transactionId) {
    this.transactionId = transactionId;
  }
  if (paymentMethod) {
    this.paymentMethod = paymentMethod as any;
  }
  return this.save();
};

// Method to process refund
orderSchema.methods.refund = function (amount: number, reason?: string) {
  this.status = 'refunded';
  this.paymentStatus = 'refunded';
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  
  // Add communication log
  this.addCommunication('email', `Your order has been refunded. Amount: ${this.currency} ${amount}${reason ? '. Reason: ' + reason : ''}`, 'Order Refunded');
  
  return this.save();
};

// Method to check in order (for events)
orderSchema.methods.checkInOrder = function (checkedInBy: mongoose.Types.ObjectId, notes?: string) {
  if (this.status !== 'confirmed' || this.paymentStatus !== 'paid') {
    throw new Error('Order must be confirmed and paid to check in');
  }
  
  this.checkIn = {
    checkedInAt: new Date(),
    checkedInBy,
    notes,
  };
  
  // Add communication log
  this.addCommunication('system', 'Successfully checked in for event');
  
  return this.save();
};

// Method to add communication log
orderSchema.methods.addCommunication = function (type: string, message: string, subject?: string) {
  this.communications.push({
    type,
    subject,
    message,
    sentAt: new Date(),
    status: 'sent',
  });
};

// Method to calculate refund amount based on cancellation policy
orderSchema.methods.calculateRefundAmount = function (): number {
  if (this.paymentStatus !== 'paid') {
    return 0;
  }
  
  // Find the earliest event date in the order
  const earliestEventDate = this.items.reduce((earliest: Date, item: IOrderItem) => {
    return item.scheduleDate < earliest ? item.scheduleDate : earliest;
  }, this.items[0]?.scheduleDate || new Date());
  
  const now = new Date();
  const timeDiff = earliestEventDate.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 3600);
  
  // Refund policy based on time before event
  let refundPercentage = 0;
  
  if (hoursDiff > 168) { // More than 7 days
    refundPercentage = 100;
  } else if (hoursDiff > 72) { // 3-7 days
    refundPercentage = 75;
  } else if (hoursDiff > 24) { // 1-3 days
    refundPercentage = 50;
  }
  
  const refundAmount = (this.total * refundPercentage) / 100;
  const processingFee = Math.min(refundAmount * 0.03, 10); // 3% or $10 max
  
  return Math.max(0, refundAmount - processingFee);
};

// Static method to find orders by user
orderSchema.statics.findByUser = function (userId: string, status?: string) {
  const query: any = { userId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find orders by payment status
orderSchema.statics.findByPaymentStatus = function (paymentStatus: string) {
  return this.find({ paymentStatus }).sort({ createdAt: -1 });
};

// Virtual for total ticket count
orderSchema.virtual('totalTickets').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

const Order = mongoose.model<IOrder>('Order', orderSchema);

export default Order;