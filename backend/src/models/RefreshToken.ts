import mongoose, { Document, Schema } from "mongoose";

// RefreshToken Document Interface
export interface IRefreshToken extends Document {
  /** SHA-256 hash of the raw token — never store the raw JWT. */
  token: string;
  user: mongoose.Types.ObjectId;
  expiresAt: Date;
  isRevoked: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

// RefreshToken Schema
const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    // Stores SHA-256(rawToken) — raw token is only ever held in the httpOnly cookie
    token: {
      type: String,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
RefreshTokenSchema.index({ token: 1 }, { unique: true });
RefreshTokenSchema.index({ user: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create and export the RefreshToken model
const RefreshToken = mongoose.model<IRefreshToken>(
  "RefreshToken",
  RefreshTokenSchema,
);
export default RefreshToken;
