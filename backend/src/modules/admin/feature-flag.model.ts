import mongoose, { Schema, model, Document } from "mongoose";

export interface IFeatureFlag extends Document {
  key: string;
  value: boolean;
  description: string;
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const FeatureFlagSchema = new Schema<IFeatureFlag>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Boolean, default: false },
    description: { type: String, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

FeatureFlagSchema.index({ key: 1 });

const FeatureFlag = model<IFeatureFlag>("FeatureFlag", FeatureFlagSchema);
export default FeatureFlag;
