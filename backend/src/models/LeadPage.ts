import mongoose, { Schema, Document } from "mongoose";

export interface ILead {
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  submittedAt: Date;
  ipAddress?: string;
}

export interface ILeadPage extends Document {
  event: mongoose.Types.ObjectId;
  isActive: boolean;
  viewCount: number;
  leads: ILead[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    message: { type: String, trim: true, maxlength: 500 },
    submittedAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
  },
  { _id: true }
);

const LeadPageSchema = new Schema<ILeadPage>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    leads: {
      type: [LeadSchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

LeadPageSchema.index({ event: 1 }, { unique: true });
LeadPageSchema.index({ isActive: 1, createdAt: -1 });

export default mongoose.model<ILeadPage>("LeadPage", LeadPageSchema);
