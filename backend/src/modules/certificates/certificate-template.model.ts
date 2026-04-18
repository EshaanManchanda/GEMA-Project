import mongoose, { Schema, model, Document } from "mongoose";

export enum CertificateType {
  ATTENDANCE = "attendance",
  COMPLETION = "completion",
  ACHIEVEMENT = "achievement",
  PARTICIPATION = "participation",
  EXCELLENCE = "excellence",
}

export interface ICertificateTemplate extends Document {
  schoolId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: CertificateType;
  design: {
    layout: string;
    backgroundColor?: string;
    borderColor?: string;
    logoUrl?: string;
    sealUrl?: string;
    signatureFields: Array<{
      label: string;
      title: string;
      imageUrl?: string;
    }>;
  };
  variables: Array<{
    key: string;
    label: string;
    type: "text" | "date" | "number" | "image";
    required: boolean;
  }>;
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateTemplateSchema = new Schema<ICertificateTemplate>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: Object.values(CertificateType), required: true },
    design: {
      layout: { type: String, required: true },
      backgroundColor: String,
      borderColor: String,
      logoUrl: String,
      sealUrl: String,
      signatureFields: [
        {
          label: { type: String, required: true },
          title: { type: String, required: true },
          imageUrl: String,
        },
      ],
    },
    variables: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        type: { type: String, enum: ["text", "date", "number", "image"], required: true },
        required: { type: Boolean, default: false },
      },
    ],
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

CertificateTemplateSchema.index({ schoolId: 1, isActive: 1 });
CertificateTemplateSchema.index({ vendorId: 1, isActive: 1 });
CertificateTemplateSchema.index({ type: 1, isActive: 1 });

const CertificateTemplate = model<ICertificateTemplate>("CertificateTemplate", CertificateTemplateSchema);
export default CertificateTemplate;
