import mongoose, { Schema, model, Document } from "mongoose";

export interface IApiKey extends Document {
  name: string;
  key: string;
  owner: mongoose.Types.ObjectId;
  scopes: string[];
  isActive: boolean;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    scopes: [{ type: String }],
    isActive: { type: Boolean, default: true },
    lastUsedAt: Date,
    expiresAt: Date,
  },
  { timestamps: true },
);

ApiKeySchema.index({ owner: 1, isActive: 1 });
ApiKeySchema.index({ key: 1 }, { unique: true });

const ApiKey = model<IApiKey>("ApiKey", ApiKeySchema);
export default ApiKey;
