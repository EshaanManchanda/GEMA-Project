import mongoose, { Document, Schema } from 'mongoose';

// Enums for registration status
export enum RegistrationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum ReviewStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// Interface for file data
export interface IFileData {
  fieldId: string;
  fieldLabel: string;
  originalName: string;
  url: string; // Cloudinary URL
  publicId: string; // For deletion
  size: number;
  mimetype: string;
  uploadedAt: Date;
  _id?: mongoose.Types.ObjectId;
}

// Interface for registration data
export interface IRegistrationData {
  fieldId: string;
  fieldLabel: string;
  fieldType: string;
  value: any; // string | number | string[] | boolean
  _id?: mongoose.Types.ObjectId;
}

// Interface for vendor review
export interface IVendorReview {
  reviewedBy: mongoose.Types.ObjectId; // Admin/Vendor userId
  reviewedAt: Date;
  status: ReviewStatus;
  remarks?: string;
}

// Interface for payment information
export interface IPaymentInfo {
  status: PaymentStatus;
  amount: number;
  currency: string;
  stripePaymentIntentId?: string;
  paidAt?: Date;
}

// Interface for metadata
export interface IMetadata {
  ipAddress?: string;
  userAgent?: string;
  submittedAt?: Date;
  lastModifiedAt: Date;
}

// Main Registration interface
export interface IRegistration extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  registrationData: IRegistrationData[];
  files: IFileData[];
  payment: IPaymentInfo;
  status: RegistrationStatus;
  vendorReview?: IVendorReview;
  metadata: IMetadata;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  canBeModified(): boolean;
  canBeWithdrawn(): boolean;
  isPaymentCompleted(): boolean;
}

// Registration model interface with static methods
export interface IRegistrationModel extends mongoose.Model<IRegistration> {
  findByEvent(eventId: string, filters?: any): Promise<IRegistration[]>;
  findByUser(userId: string, filters?: any): Promise<IRegistration[]>;
  findPendingReviews(eventId?: string): Promise<IRegistration[]>;
  countByEvent(eventId: string, status?: RegistrationStatus): Promise<number>;
}

// Registration Schema
const registrationSchema = new Schema<IRegistration>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    registrationData: [
      {
        fieldId: {
          type: String,
          required: true,
        },
        fieldLabel: {
          type: String,
          required: true,
        },
        fieldType: {
          type: String,
          required: true,
        },
        value: {
          type: Schema.Types.Mixed,
          required: true,
        },
      },
    ],
    files: [
      {
        fieldId: {
          type: String,
          required: true,
        },
        fieldLabel: {
          type: String,
          required: true,
        },
        originalName: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        mimetype: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    payment: {
      status: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.PENDING,
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: [0, 'Payment amount cannot be negative'],
      },
      currency: {
        type: String,
        required: true,
        enum: ['AED', 'EGP', 'CAD', 'USD'],
        default: 'AED',
      },
      stripePaymentIntentId: {
        type: String,
      },
      paidAt: {
        type: Date,
      },
    },
    status: {
      type: String,
      enum: Object.values(RegistrationStatus),
      default: RegistrationStatus.DRAFT,
      required: true,
      index: true,
    },
    vendorReview: {
      reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedAt: {
        type: Date,
      },
      status: {
        type: String,
        enum: Object.values(ReviewStatus),
      },
      remarks: {
        type: String,
        trim: true,
        maxlength: [1000, 'Review remarks cannot exceed 1000 characters'],
      },
    },
    metadata: {
      ipAddress: {
        type: String,
      },
      userAgent: {
        type: String,
      },
      submittedAt: {
        type: Date,
      },
      lastModifiedAt: {
        type: Date,
        default: Date.now,
      },
    },
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
registrationSchema.index({ eventId: 1, userId: 1 });
registrationSchema.index({ eventId: 1, status: 1 });
registrationSchema.index({ userId: 1, status: 1 });
registrationSchema.index({ 'payment.status': 1 });
registrationSchema.index({ 'payment.stripePaymentIntentId': 1 }, { sparse: true });
registrationSchema.index({ createdAt: -1 });
registrationSchema.index({ updatedAt: -1 });

// Compound index for vendor dashboard queries
registrationSchema.index({ eventId: 1, status: 1, createdAt: -1 });

// Text search index for participant search
registrationSchema.index({
  'registrationData.value': 'text',
});

// Pre-save middleware to update lastModifiedAt
registrationSchema.pre('save', function (next) {
  this.metadata.lastModifiedAt = new Date();

  // Set submittedAt when status changes to SUBMITTED
  if (this.isModified('status') && this.status === RegistrationStatus.SUBMITTED && !this.metadata.submittedAt) {
    this.metadata.submittedAt = new Date();
  }

  // Set paidAt when payment status changes to PAID
  if (this.isModified('payment.status') && this.payment.status === PaymentStatus.PAID && !this.payment.paidAt) {
    this.payment.paidAt = new Date();
  }

  next();
});

// Method to check if registration can be modified
registrationSchema.methods.canBeModified = function (): boolean {
  // Only DRAFT registrations can be modified
  return this.status === RegistrationStatus.DRAFT;
};

// Method to check if registration can be withdrawn
registrationSchema.methods.canBeWithdrawn = function (): boolean {
  // Can withdraw if not already withdrawn and not yet approved/rejected
  return this.status !== RegistrationStatus.WITHDRAWN &&
         this.status !== RegistrationStatus.APPROVED &&
         this.status !== RegistrationStatus.REJECTED;
};

// Method to check if payment is completed
registrationSchema.methods.isPaymentCompleted = function (): boolean {
  return this.payment.status === PaymentStatus.PAID;
};

// Static method to find registrations by event
registrationSchema.statics.findByEvent = function (eventId: string, filters: any = {}) {
  return this.find({ eventId, ...filters }).populate('userId', 'firstName lastName email phone');
};

// Static method to find registrations by user
registrationSchema.statics.findByUser = function (userId: string, filters: any = {}) {
  return this.find({ userId, ...filters }).populate('eventId', 'title description price currency dateSchedule');
};

// Static method to find pending reviews
registrationSchema.statics.findPendingReviews = function (eventId?: string) {
  const query: any = {
    status: RegistrationStatus.UNDER_REVIEW,
    'payment.status': PaymentStatus.PAID
  };

  if (eventId) {
    query.eventId = eventId;
  }

  return this.find(query).populate('userId', 'firstName lastName email phone').populate('eventId', 'title');
};

// Static method to count registrations by event
registrationSchema.statics.countByEvent = function (eventId: string, status?: RegistrationStatus) {
  const query: any = { eventId };
  if (status) {
    query.status = status;
  }
  return this.countDocuments(query);
};

// Virtual for registration confirmation number
registrationSchema.virtual('confirmationNumber').get(function () {
  return `REG-${this._id.toString().slice(-8).toUpperCase()}`;
});

const Registration = mongoose.model<IRegistration, IRegistrationModel>('Registration', registrationSchema);

export default Registration;
