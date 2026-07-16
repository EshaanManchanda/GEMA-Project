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
  event?: mongoose.Types.ObjectId;
  isGlobal: boolean;
  isActive: boolean;
  viewCount: number;
  leads: ILead[];
  createdBy?: mongoose.Types.ObjectId;
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
  { _id: true },
);

const LeadPageSchema = new Schema<ILeadPage>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      // Optional: absent on the singleton global "Kidrove Lead Collection"
      // bucket. Presence/absence is enforced together with isGlobal by the
      // XOR validator below, not by `required`.
    },
    isGlobal: {
      type: Boolean,
      default: false,
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
      // Optional: the global bucket is auto-created by an anonymous public
      // submission, so there is no admin user to attribute it to.
    },
  },
  {
    timestamps: true,
  },
);

// A LeadPage is either the singleton global bucket (isGlobal:true, no event)
// or an event-specific page (event set, isGlobal falsy) — never both, never
// neither.
LeadPageSchema.pre("validate", function (next) {
  const hasEvent = !!this.event;
  const isGlobal = !!this.isGlobal;
  if (hasEvent === isGlobal) {
    return next(
      new Error(
        "LeadPage must be either global (isGlobal:true, no event) or event-based (event set, isGlobal:false), not both or neither.",
      ),
    );
  }
  next();
});

// One lead page per event — only applies to docs that actually have an event.
LeadPageSchema.index(
  { event: 1 },
  { unique: true, partialFilterExpression: { event: { $type: "objectId" } } },
);

// Exactly one global bucket may ever exist — DB-level singleton guarantee.
LeadPageSchema.index(
  { isGlobal: 1 },
  { unique: true, partialFilterExpression: { isGlobal: true } },
);

LeadPageSchema.index({ isActive: 1, createdAt: -1 });

export default mongoose.model<ILeadPage>("LeadPage", LeadPageSchema);
