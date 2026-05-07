import mongoose, { Schema, Document, Model } from "mongoose";

interface IOrganizationApplication {
  organizationName: string;
  anticipatedTeachersNextMonth: number;
  countryOfOperation: string;
  organizationWebsite: string;
  primaryContactName: string;
  primaryContactTitle: string;
  organizationPhone: string;
  foundedYear: string;
  teacherBackground: string;
  learnerAudience: string;
  classTypes: string;
  firstClassDescription: string;
  referralSource: string;
  publicReviewsLinks?: string;
  additionalNotes?: string;
}

interface IOrganizationAgreement {
  legalName: string;
  legalEntityType: string;
  incorporationLocation: string;
  principalBusinessAddress: string;
  backgroundChecksRequired: boolean;
  authorizedSignerName: string;
  authorizedSignerTitle: string;
  acceptedTerms: boolean;
  signedAt?: Date;
}

export interface IOrganizationOnboarding extends Document {
  user: mongoose.Types.ObjectId;
  accountCreated: boolean;
  application: IOrganizationApplication;
  agreement: IOrganizationAgreement;
  reviewStatus: "pending" | "approved" | "rejected";
  reviewNotes?: string;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  applicationCompletedAt?: Date;
  agreementSignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrganizationOnboardingModel
  extends Model<IOrganizationOnboarding> {}

const organizationApplicationSchema = new Schema<IOrganizationApplication>(
  {
    organizationName: { type: String, trim: true, default: "" },
    anticipatedTeachersNextMonth: { type: Number, default: 0 },
    countryOfOperation: { type: String, trim: true, default: "" },
    organizationWebsite: { type: String, trim: true, default: "" },
    primaryContactName: { type: String, trim: true, default: "" },
    primaryContactTitle: { type: String, trim: true, default: "" },
    organizationPhone: { type: String, trim: true, default: "" },
    foundedYear: { type: String, trim: true, default: "" },
    teacherBackground: { type: String, trim: true, default: "" },
    learnerAudience: { type: String, trim: true, default: "" },
    classTypes: { type: String, trim: true, default: "" },
    firstClassDescription: { type: String, trim: true, default: "" },
    referralSource: { type: String, trim: true, default: "" },
    publicReviewsLinks: { type: String, trim: true, default: "" },
    additionalNotes: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const organizationAgreementSchema = new Schema<IOrganizationAgreement>(
  {
    legalName: { type: String, trim: true, default: "" },
    legalEntityType: { type: String, trim: true, default: "" },
    incorporationLocation: { type: String, trim: true, default: "" },
    principalBusinessAddress: { type: String, trim: true, default: "" },
    backgroundChecksRequired: { type: Boolean, default: true },
    authorizedSignerName: { type: String, trim: true, default: "" },
    authorizedSignerTitle: { type: String, trim: true, default: "" },
    acceptedTerms: { type: Boolean, default: false },
    signedAt: { type: Date },
  },
  { _id: false },
);

const organizationOnboardingSchema = new Schema<IOrganizationOnboarding>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    accountCreated: { type: Boolean, default: true },
    application: {
      type: organizationApplicationSchema,
      default: () => ({}),
    },
    agreement: {
      type: organizationAgreementSchema,
      default: () => ({}),
    },
    reviewStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewNotes: { type: String, trim: true, default: "" },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    applicationCompletedAt: { type: Date },
    agreementSignedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const OrganizationOnboarding = mongoose.model<
  IOrganizationOnboarding,
  IOrganizationOnboardingModel
>("OrganizationOnboarding", organizationOnboardingSchema);

export default OrganizationOnboarding;
