import mongoose, { Schema, Document } from 'mongoose';

// Enums
export enum ConfigStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export enum CommissionRuleType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  TIERED = 'tiered'
}

export enum RecipientType {
  VENDOR = 'vendor',
  AFFILIATE = 'affiliate',
  REFERRER = 'referrer',
  PLATFORM = 'platform'
}

export enum RuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

// Interfaces
export interface ITier {
  minAmount: number;
  maxAmount?: number;
  percentage: number;
}

export interface IRuleConditions {
  categories?: string[];
  minOrderAmount?: number;
  maxOrderAmount?: number;
  vendorTiers?: string[];
}

export interface ICommissionRule {
  id: string;
  name: string;
  type: CommissionRuleType;
  recipient: RecipientType;
  percentage?: number;
  fixedAmount?: number;
  tiers?: ITier[];
  conditions?: IRuleConditions;
  status: RuleStatus;
  priority: number;
}

export interface IPlatformCommission {
  defaultPercentage: number;
  minAmount: number;
  maxAmount?: number;
  currency: string;
}

export interface ILevelDistribution {
  level: number;
  percentage: number;
}

export interface ICommissionConfig extends Document {
  name: string;
  description?: string;
  version: string;
  status: ConfigStatus;
  isDefault: boolean;
  platformCommission: IPlatformCommission;
  rules: ICommissionRule[];
  multiLevelEnabled: boolean;
  maxLevels: number;
  levelDistribution?: ILevelDistribution[];
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Commission Config Schema
const CommissionConfigSchema = new Schema<ICommissionConfig>(
  {
    name: {
      type: String,
      required: [true, 'Commission config name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    version: {
      type: String,
      default: '1.0'
    },
    status: {
      type: String,
      enum: Object.values(ConfigStatus),
      default: ConfigStatus.ACTIVE
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    platformCommission: {
      defaultPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 5
      },
      minAmount: {
        type: Number,
        default: 0
      },
      maxAmount: {
        type: Number
      },
      currency: {
        type: String,
        default: 'AED'
      }
    },
    rules: [
      {
        id: {
          type: String,
          required: true
        },
        name: {
          type: String,
          required: true
        },
        type: {
          type: String,
          enum: Object.values(CommissionRuleType),
          required: true
        },
        recipient: {
          type: String,
          enum: Object.values(RecipientType),
          required: true
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100
        },
        fixedAmount: {
          type: Number,
          min: 0
        },
        tiers: [
          {
            minAmount: { type: Number, required: true },
            maxAmount: { type: Number },
            percentage: { type: Number, required: true, min: 0, max: 100 }
          }
        ],
        conditions: {
          categories: [String],
          minOrderAmount: Number,
          maxOrderAmount: Number,
          vendorTiers: [String]
        },
        status: {
          type: String,
          enum: Object.values(RuleStatus),
          default: RuleStatus.ACTIVE
        },
        priority: {
          type: Number,
          required: true,
          default: 1
        }
      }
    ],
    multiLevelEnabled: {
      type: Boolean,
      default: false
    },
    maxLevels: {
      type: Number,
      default: 3,
      min: 2,
      max: 10
    },
    levelDistribution: [
      {
        level: { type: Number, required: true },
        percentage: { type: Number, required: true, min: 0, max: 100 }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
CommissionConfigSchema.index({ status: 1 });
CommissionConfigSchema.index({ isDefault: 1 });
CommissionConfigSchema.index({ createdAt: -1 });

// Middleware: Ensure only one default config
CommissionConfigSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Set all other configs to non-default
    await mongoose.model('CommissionConfig').updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

const CommissionConfig = mongoose.model<ICommissionConfig>('CommissionConfig', CommissionConfigSchema);
export default CommissionConfig;
