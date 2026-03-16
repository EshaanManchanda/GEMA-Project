import mongoose, { Document, Schema } from "mongoose";

export interface IUserPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
  updatedAt: Date;
}

const userPushSubscriptionSchema = new Schema<IUserPushSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    p256dh: {
      type: String,
      required: true,
    },
    auth: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

userPushSubscriptionSchema.index({ userId: 1 });
userPushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

export default mongoose.model<IUserPushSubscription>(
  "UserPushSubscription",
  userPushSubscriptionSchema,
);
