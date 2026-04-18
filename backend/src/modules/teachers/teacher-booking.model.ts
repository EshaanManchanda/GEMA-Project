import mongoose, { Document, Schema } from "mongoose";

/**
 * Participant / Student info
 */
export interface IStudentParticipant {
  name: string;
  age?: number;
  gender?: "male" | "female" | "other";
  notes?: string;

  bookingData?: Array<{
    fieldId: string;
    fieldLabel: string;
    fieldType: string;
    value: any;
  }>;
}

/**
 * Teaching session item
 */
export interface ITeachingBookingItem {
  teachingEventId: mongoose.Types.ObjectId;
  teachingEventTitle: string;
  scheduleDate: Date;
  quantity: number; // number of sessions / seats
  unitPrice: number;
  totalPrice: number;
  currency: string;
  students?: IStudentParticipant[];
  _id?: mongoose.Types.ObjectId;
}

export interface ITeacherBooking extends Document {
  studentId: mongoose.Types.ObjectId; // User (student)
  bookingNumber: string;

  sessions: ITeachingBookingItem[];

  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  currency: string;

  status: "pending" | "confirmed" | "cancelled" | "refunded";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod?: "stripe" | "paypal" | "razorpay" | "test";
  transactionId?: string;

  // Teacher-side management
  teacherNotes?: string;
  teacherStatus?: "scheduled" | "ongoing" | "completed" | "issue";
  attendanceMarked?: boolean;
  lastModifiedBy?: mongoose.Types.ObjectId;
  lastModifiedAt?: Date;

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

  adminCommission: {
    rate: number;
    amount: number;
    calculatedAt: Date;
    revenueTransactionId?: mongoose.Types.ObjectId;
  };

  source: "web" | "mobile" | "admin" | "teacher";

  createdAt: Date;
  updatedAt: Date;

  confirm(): Promise<ITeacherBooking>;
  cancel(reason?: string): Promise<ITeacherBooking>;
  markAsPaid(transactionId?: string): Promise<ITeacherBooking>;
}

const teachingBookingItemSchema = new Schema<ITeachingBookingItem>({
  teachingEventId: {
    type: Schema.Types.ObjectId,
    ref: "TeachingEvent",
    required: true,
  },
  teachingEventTitle: {
    type: String,
    required: true,
  },
  scheduleDate: {
    type: Date,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    enum: ["INR", "AED", "USD"], //TAKE FROM ENV
    required: true,
  },
  students: [
    {
      name: { type: String, required: true },
      age: Number,
      gender: { type: String, enum: ["male", "female", "other"] },
      notes: String,
      bookingData: [
        {
          fieldId: String,
          fieldLabel: String,
          fieldType: String,
          value: Schema.Types.Mixed,
        },
      ],
    },
  ],
});

const teacherBookingSchema = new Schema<ITeacherBooking>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    bookingNumber: {
      type: String,
      unique: true,
    },

    sessions: {
      type: [teachingBookingItemSchema],
      required: true,
    },

    subtotal: Number,
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: Number,
    currency: { type: String, default: "AED" },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "refunded"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: String,
    transactionId: String,

    teacherNotes: String,
    teacherStatus: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "issue"],
      default: "scheduled",
    },
    attendanceMarked: { type: Boolean, default: false },

    lastModifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    lastModifiedAt: Date,

    billingAddress: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },

    adminCommission: {
      rate: { type: Number, default: 10 },
      amount: { type: Number, default: 0 },
      calculatedAt: { type: Date, default: Date.now },
      revenueTransactionId: {
        type: Schema.Types.ObjectId,
        ref: "RevenueTransaction",
      },
    },

    source: {
      type: String,
      enum: ["web", "mobile", "admin", "teacher"],
      default: "web",
    },
  },
  { timestamps: true },
);

teacherBookingSchema.pre("save", function (next) {
  if (!this.bookingNumber) {
    const ts = Date.now().toString(36).toUpperCase();
    this.bookingNumber = `TR-${ts}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
  }

  this.subtotal = this.sessions.reduce((sum, s) => sum + s.totalPrice, 0);

  this.totalAmount = this.subtotal + (this.tax || 0) - (this.discount || 0);

  next();
});

teacherBookingSchema.methods.confirm = function () {
  this.status = "confirmed";
  return this.save();
};

teacherBookingSchema.methods.cancel = function (reason?: string) {
  this.status = "cancelled";
  if (reason) this.teacherNotes = reason;
  return this.save();
};

teacherBookingSchema.methods.markAsPaid = function (transactionId?: string) {
  this.paymentStatus = "paid";
  if (transactionId) this.transactionId = transactionId;
  return this.save();
};

const TeacherBooking = mongoose.model<ITeacherBooking>(
  "TeacherBooking",
  teacherBookingSchema,
);

export default TeacherBooking;
