import mongoose, { Schema, Document } from 'mongoose';

export interface ISEOContent extends Document {
  page: 'homepage' | 'about' | 'contact';
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  faqItems: Array<{
    question: string;
    answer: string;
    category: string;
  }>;
  features: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  trustSignals: {
    yearsInBusiness: number;
    certifications: string[];
    awards: string[];
  };
  isActive: boolean;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SEOContentSchema = new Schema<ISEOContent>({
  page: {
    type: String,
    enum: ['homepage', 'about', 'contact'],
    required: true,
    unique: true,
    index: true
  },
  metaTitle: {
    type: String,
    required: true,
    minlength: 30,
    maxlength: 60,
    trim: true
  },
  metaDescription: {
    type: String,
    required: true,
    minlength: 120,
    maxlength: 160,
    trim: true
  },
  keywords: {
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) => v.length >= 3 && v.length <= 10,
      message: 'Keywords should have between 3 and 10 items'
    }
  },
  faqItems: [{
    question: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true
    },
    answer: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    }
  }],
  features: [{
    title: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true
    },
    icon: {
      type: String,
      required: true,
      trim: true
    }
  }],
  trustSignals: {
    yearsInBusiness: {
      type: Number,
      required: true,
      min: 0
    },
    certifications: {
      type: [String],
      default: []
    },
    awards: {
      type: [String],
      default: []
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
SEOContentSchema.index({ page: 1, isActive: 1 });

export default mongoose.model<ISEOContent>('SEOContent', SEOContentSchema);
